import { TestBed } from '@angular/core/testing';
import { PecasLista } from './pecas-lista';
import { provedoresBase } from '../../../../testing/provedores-de-teste';

describe('PecasLista', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ imports: [PecasLista], providers: provedoresBase() });
    const fixture = TestBed.createComponent(PecasLista);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
