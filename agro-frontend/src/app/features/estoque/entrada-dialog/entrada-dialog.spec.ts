import { TestBed } from '@angular/core/testing';
import { EntradaDialog } from './entrada-dialog';
import { Peca } from '../../../core/models/peca';
import { provedoresDeDialogo } from '../../../../testing/provedores-de-teste';

describe('EntradaDialog', () => {
  const peca: Peca = {
    id: 3, codigo: 'COR-001', descricao: 'Correia do alternador', unidade: 'un', saldo: 4, custoUnitario: 120, estoqueMinimo: 5,
  };

  it('should create', () => {
    TestBed.configureTestingModule({ imports: [EntradaDialog], providers: provedoresDeDialogo(peca) });
    const fixture = TestBed.createComponent(EntradaDialog);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
