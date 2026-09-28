import { TestBed } from '@angular/core/testing';
import { SaidaDialog } from './saida-dialog';
import { Maquina } from '../../../core/models/maquina';
import { provedoresDeDialogo } from '../../../../testing/provedores-de-teste';

describe('SaidaDialog', () => {
  const maquina: Maquina = { id: 1, tag: 'TR-01', modelo: 'Trator', horimetro: 1000, status: 'Disponível' };

  it('should create', () => {
    TestBed.configureTestingModule({ imports: [SaidaDialog], providers: provedoresDeDialogo(maquina) });
    const fixture = TestBed.createComponent(SaidaDialog);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
