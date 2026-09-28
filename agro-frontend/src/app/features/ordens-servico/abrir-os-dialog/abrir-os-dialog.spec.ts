import { TestBed } from '@angular/core/testing';
import { AbrirOsDialog } from './abrir-os-dialog';
import { provedoresDeDialogo } from '../../../../testing/provedores-de-teste';

describe('AbrirOsDialog', () => {
  it('should create', () => {
    // Aberto pela lista de O.S.: sem máquina escolhida (data = null)
    TestBed.configureTestingModule({ imports: [AbrirOsDialog], providers: provedoresDeDialogo(null) });
    const fixture = TestBed.createComponent(AbrirOsDialog);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
