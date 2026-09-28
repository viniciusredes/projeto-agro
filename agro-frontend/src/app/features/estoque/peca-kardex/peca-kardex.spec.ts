import { TestBed } from '@angular/core/testing';
import { PecaKardex } from './peca-kardex';
import { provedoresBase } from '../../../../testing/provedores-de-teste';

describe('PecaKardex', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ imports: [PecaKardex], providers: provedoresBase() });
    const fixture = TestBed.createComponent(PecaKardex);
    // input.required: sem o id, o ngOnInit falharia (no app, o :id vem da rota)
    fixture.componentRef.setInput('id', 1);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
