import { TestBed } from '@angular/core/testing';
import { MovimentacoesLista } from './movimentacoes-lista';
import { provedoresBase } from '../../../../testing/provedores-de-teste';

describe('MovimentacoesLista', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ imports: [MovimentacoesLista], providers: provedoresBase() });
    const fixture = TestBed.createComponent(MovimentacoesLista);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
