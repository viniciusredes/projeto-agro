import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Mapa } from './mapa';
import { PosicaoAtual } from '../../core/models/posicao';
import { provedoresBase } from '../../../testing/provedores-de-teste';

// Teste pelo comportamento: a API "responde" as posições, e o teste confere o que o gestor VÊ
describe('Mapa', () => {
  const emCampo: PosicaoAtual[] = [
    {
      maquinaId: 1, tag: 'TR-01', modelo: 'Trator', operador: 'Ana', frenteTrabalho: 'Talhão 7', dataSaida: '',
      minutosDesde: 2,
      posicao: { id: 1, maquinaId: 1, movimentacaoId: 1, operador: 'Ana', latitude: -21.17, longitude: -47.81, precisao: 12, data: '', recebidaEm: '' },
    },
    { maquinaId: 2, tag: 'PV-03', modelo: 'Pulverizador', operador: 'Bruno', frenteTrabalho: 'Talhão 2', dataSaida: '', minutosDesde: null, posicao: null },
  ];

  let fixture: ComponentFixture<Mapa>;
  let tela: HTMLElement;
  let api: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [Mapa], providers: provedoresBase() });
    fixture = TestBed.createComponent(Mapa);
    tela = fixture.nativeElement;
    api = TestBed.inject(HttpTestingController);
    fixture.detectChanges(); // a primeira busca sai na hora

    // Responde ANTES de esperar: uma requisição em aberto conta como tarefa pendente, e o
    // whenStable() esperaria por ela para sempre
    api.expectOne('/api/posicoes/atuais').flush(emCampo);
    fixture.detectChanges();
    await fixture.whenStable(); // o mapa é criado (afterNextRender) e o effect desenha os marcadores
  });

  afterEach(() => api.verify());

  it('lista as máquinas em campo, com a situação do sinal', () => {
    expect(tela.textContent).toContain('2 máquinas em campo · 1 sem posição recente');
    expect(tela.textContent).toContain('Posição há 2 min');
    expect(tela.textContent).toContain('Aguardando a primeira posição do app do operador');
  });

  it('põe no mapa só quem tem posição, com a tag no marcador', () => {
    const marcadores = [...tela.querySelectorAll('.marcador')].map(m => m.textContent);
    expect(marcadores).toEqual(['TR-01']);
  });
});
