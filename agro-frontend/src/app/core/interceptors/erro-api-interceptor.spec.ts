import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { erroApiInterceptor } from './erro-api-interceptor';
import { erroTratadoNaTela } from '../api';

// Teste de INTERCEPTOR: um HttpClient de teste com o interceptor instalado, como no app.config.ts.
// O MatSnackBar é trocado por um "espião" (vi.fn) para o teste saber se o aviso foi aberto.
describe('erroApiInterceptor', () => {
  let http: HttpClient;
  let api: HttpTestingController;
  const snackBar = { open: vi.fn() };

  beforeEach(() => {
    snackBar.open.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([erroApiInterceptor])),
        provideHttpClientTesting(),
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    http = TestBed.inject(HttpClient);
    api = TestBed.inject(HttpTestingController);
  });

  afterEach(() => api.verify());

  it('mostra a mensagem { erro } da API e repassa o erro para a tela', () => {
    let erroRecebido = false;
    http.get('/api/maquinas/1/saida').subscribe({ error: () => (erroRecebido = true) });

    api.expectOne('/api/maquinas/1/saida').flush(
      { erro: "Máquina TR-01 não pode sair: status atual é 'Em Operação'" },
      { status: 409, statusText: 'Conflict' },
    );

    expect(snackBar.open).toHaveBeenCalledWith(
      "Máquina TR-01 não pode sair: status atual é 'Em Operação'",
      'Fechar',
      expect.objectContaining({ panelClass: 'snack-erro' }),
    );
    expect(erroRecebido).toBe(true); // "trata e repassa": a tela também fica sabendo
  });

  it('não mostra o aviso quando a requisição foi marcada como "erro tratado na tela"', () => {
    http.get('/api/pecas/99', { context: erroTratadoNaTela() }).subscribe({ error: () => {} });

    api.expectOne('/api/pecas/99').flush({ erro: 'Peça não encontrada' }, { status: 404, statusText: 'Not Found' });

    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('não interfere nas respostas de sucesso', () => {
    http.get('/api/maquinas').subscribe();
    api.expectOne('/api/maquinas').flush([]);
    expect(snackBar.open).not.toHaveBeenCalled();
  });
});
