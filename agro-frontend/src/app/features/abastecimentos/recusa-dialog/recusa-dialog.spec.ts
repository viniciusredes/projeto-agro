import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { AcaoComMotivo, DadosRecusa, RecusaDialog } from './recusa-dialog';
import { Abastecimento } from '../../../core/models/abastecimento';
import { provedoresDeDialogo } from '../../../../testing/provedores-de-teste';

// Teste pelo comportamento, como o do RetornoDialog: o teste age como o gestor
// (digita o motivo, escolhe uma sugestão, envia) e confere a tela e a chamada à API.
describe('RecusaDialog', () => {
  const abastecimento: Abastecimento = {
    id: 2, maquinaId: 1, operador: 'Bruno', origem: 'Tanque', litros: 200, horimetro: 505,
    pecaId: 4, valorTotal: 1210, precoLitro: 6.05, data: '2026-10-11T12:00:00.000Z', status: 'Pendente',
    devolucoes: [], comprovante: null,
  };

  let fixture: ComponentFixture<RecusaDialog>;
  let tela: HTMLElement;
  let api: HttpTestingController;

  // O mesmo diálogo serve às duas ações: cada teste abre com a sua
  function abrir(acao: AcaoComMotivo): void {
    const dados: DadosRecusa = { acao, abastecimento, maquina: 'TR-01 · Trator' };
    TestBed.configureTestingModule({ imports: [RecusaDialog], providers: provedoresDeDialogo(dados) });
    fixture = TestBed.createComponent(RecusaDialog);
    tela = fixture.nativeElement;
    api = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  afterEach(() => api.verify());

  function digitarMotivo(valor: string): void {
    const campo = tela.querySelector<HTMLTextAreaElement>('textarea[formcontrolname="motivo"]')!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function escolherSugestao(texto: string): void {
    const botao = Array.from(tela.querySelectorAll<HTMLButtonElement>('.sugestoes button')).find(
      b => b.textContent?.trim() === texto,
    )!;
    botao.click();
    fixture.detectChanges();
  }

  function enviar(): void {
    tela.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('recusar no tanque: avisa ANTES que o diesel volta ao estoque', () => {
    abrir('recusar');
    expect(tela.textContent).toContain('Os 200 L voltam ao estoque do diesel');
  });

  it('barra motivo só com espaços SEM chamar a API', () => {
    abrir('recusar');
    digitarMotivo('   ');
    enviar();

    expect(tela.textContent).toContain('Informe o motivo');
    api.expectNone('/api/abastecimentos/2/recusa');
  });

  it('recusar: a sugestão vai para o POST /recusa e o diálogo fecha com a resposta', () => {
    abrir('recusar');
    escolherSugestao('Abastecimento registrado em duplicidade');
    enviar();

    const req = api.expectOne('/api/abastecimentos/2/recusa');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ motivo: 'Abastecimento registrado em duplicidade' });

    const resposta = { mensagem: 'Abastecimento recusado.', abastecimento: { ...abastecimento, status: 'Recusado' } };
    req.flush(resposta);

    expect(TestBed.inject(MatDialogRef).close).toHaveBeenCalledWith(resposta);
  });

  it('devolver: outros textos, sem aviso de estorno, e o motivo vai para o POST /devolucao', () => {
    abrir('devolver');
    expect(tela.textContent).toContain('Devolver o abastecimento nº 2 para correção?');
    expect(tela.textContent).not.toContain('voltam ao estoque');

    escolherSugestao('Recibo ilegível: envie outra foto');
    enviar();

    const req = api.expectOne('/api/abastecimentos/2/devolucao');
    expect(req.request.body).toEqual({ motivo: 'Recibo ilegível: envie outra foto' });
    req.flush({ mensagem: 'Devolvido.', abastecimento: { ...abastecimento, status: 'Em correção' } });
  });
});
