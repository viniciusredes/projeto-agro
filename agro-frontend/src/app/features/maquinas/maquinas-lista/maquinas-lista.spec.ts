import { TestBed } from '@angular/core/testing';
import { MaquinasLista } from './maquinas-lista';
import { provedoresBase } from '../../../../testing/provedores-de-teste';

describe('MaquinasLista', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ imports: [MaquinasLista], providers: provedoresBase() });
    const fixture = TestBed.createComponent(MaquinasLista);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
