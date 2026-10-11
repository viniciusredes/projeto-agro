import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { RetornoDialog } from './retorno-dialog';
import { Maquina } from '../../../core/models/maquina';
import { provedoresDeDialogo } from '../../../../testing/provedores-de-teste';

// Teste de COMPONENTE pelo comportamento: o teste age como o usuário (digita no campo,
// envia o formulário) e confere o que ele VÊ na tela e o que vai para a API.
describe('RetornoDialog', () => {
  const maquina: Maquina = { id: 1, tag: 'TR-01', modelo: 'Trator', horimetro: 1000, status: 'Em Operação' };

  let fixture: ComponentFixture<RetornoDialog>;
  let tela: HTMLElement;
  let api: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [RetornoDialog], providers: provedoresDeDialogo(maquina) });
    fixture = TestBed.createComponent(RetornoDialog);
    tela = fixture.nativeElement;
    api = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    // Ao abrir, o diálogo busca a faixa do horímetro (Etapa 5): a API "responde" aqui
    api.expectOne('/api/maquinas/1/horimetro').flush({ minimo: 1000, origemMinimo: null, maximo: 1030 });
    fixture.detectChanges();
  });

  afterEach(() => api.verify());

  // "Digita" no campo do horímetro: muda o valor e dispara o evento input, como o navegador faria
  function digitarHorimetro(valor: string): void {
    const campo = tela.querySelector<HTMLInputElement>('input[formcontrolname="horimetro"]')!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function enviar(): void {
    tela.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('mostra as horas trabalhadas enquanto o usuário digita (formato pt-BR)', () => {
    digitarHorimetro('1011.5');
    expect(tela.textContent).toContain('Horas trabalhadas: 11,5 h');
  });

  it('barra horímetro menor que o atual SEM chamar a API', () => {
    digitarHorimetro('900');
    enviar();

    expect(tela.textContent).toContain('Não pode ser menor que 1.000 h');
    api.expectNone('/api/maquinas/1/retorno'); // nada foi enviado
  });

  it('barra horímetro acima do máximo possível SEM chamar a API (um zero a mais)', () => {
    digitarHorimetro('10000');
    enviar();

    expect(tela.textContent).toContain('Passa do máximo possível (1.030 h)');
    api.expectNone('/api/maquinas/1/retorno');
  });

  it('mostra a faixa e preenche o campo pelo botão rápido', () => {
    expect(tela.textContent).toContain('Entre 1.000 h e 1.030 h');

    const botao = [...tela.querySelectorAll('button')].find(b => b.textContent?.trim() === '+8 h')!;
    botao.click();
    fixture.detectChanges();

    expect(tela.querySelector<HTMLInputElement>('input[formcontrolname="horimetro"]')!.value).toBe('1008');
    expect(tela.textContent).toContain('Horas trabalhadas: 8 h');
  });

  it('com dados válidos, envia o retorno e fecha o diálogo devolvendo a resposta', () => {
    digitarHorimetro('1010');
    enviar();

    const req = api.expectOne('/api/maquinas/1/retorno');
    expect(req.request.method).toBe('POST');
    // avarias vazio não vai no corpo (campo opcional)
    expect(req.request.body).toEqual({ horimetro: 1010 });

    const resposta = { mensagem: 'Retorno registrado.', maquina, movimentacao: { horasTrabalhadas: 10 } };
    req.flush(resposta);

    expect(TestBed.inject(MatDialogRef).close).toHaveBeenCalledWith(resposta);
  });
});
