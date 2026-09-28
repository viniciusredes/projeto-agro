import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { MaquinaService } from './maquina.service';
import { Maquina } from '../models/maquina';
import { provedoresBase } from '../../../testing/provedores-de-teste';

// Teste de SERVICE com HttpTestingController: nenhuma requisição sai de verdade.
// O teste confere QUAL requisição o service montou (método, URL, parâmetros, corpo)
// e responde com dados falsos, como se fosse a API.
describe('MaquinaService', () => {
  let service: MaquinaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provedoresBase() });
    service = TestBed.inject(MaquinaService);
    http = TestBed.inject(HttpTestingController);
  });

  // Garante que nenhum teste deixou requisição sem resposta (ou fez uma que não esperava)
  afterEach(() => http.verify());

  it('listar() faz GET em /api/maquinas e entrega a lista', () => {
    const maquinas: Maquina[] = [{ id: 1, tag: 'TR-01', modelo: 'Trator', horimetro: 1000, status: 'Disponível' }];
    let recebidas: Maquina[] | undefined;

    service.listar().subscribe(lista => (recebidas = lista));

    const req = http.expectOne('/api/maquinas');
    expect(req.request.method).toBe('GET');
    req.flush(maquinas); // "responde" como a API

    expect(recebidas).toEqual(maquinas);
  });

  it('listarMovimentacoes() só manda ?maquinaId= quando há filtro', () => {
    service.listarMovimentacoes().subscribe();
    const semFiltro = http.expectOne(r => r.url === '/api/movimentacoes');
    expect(semFiltro.request.params.has('maquinaId')).toBe(false);
    semFiltro.flush([]);

    service.listarMovimentacoes(2).subscribe();
    const comFiltro = http.expectOne(r => r.url === '/api/movimentacoes');
    expect(comFiltro.request.params.get('maquinaId')).toBe('2');
    comFiltro.flush([]);
  });

  it('registrarSaida() faz POST com operador e frente de trabalho no corpo', () => {
    service.registrarSaida(1, { operador: 'João', frenteTrabalho: 'Talhão 5' }).subscribe();

    const req = http.expectOne('/api/maquinas/1/saida');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ operador: 'João', frenteTrabalho: 'Talhão 5' });
    req.flush({});
  });
});
