import { TestBed } from '@angular/core/testing';
import { MaquinaDetalhe } from './maquina-detalhe';
import { provedoresBase } from '../../../../testing/provedores-de-teste';

describe('MaquinaDetalhe', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ imports: [MaquinaDetalhe], providers: provedoresBase() });
    const fixture = TestBed.createComponent(MaquinaDetalhe);
    // No app, o :id vem da rota (withComponentInputBinding); no teste, entra direto no input
    fixture.componentRef.setInput('id', 1);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
