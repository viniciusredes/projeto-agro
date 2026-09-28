import { TestBed } from '@angular/core/testing';
import { NovaMaquinaDialog } from './nova-maquina-dialog';
import { provedoresDeDialogo } from '../../../../testing/provedores-de-teste';

describe('NovaMaquinaDialog', () => {
  it('should create', () => {
    // Este diálogo não recebe dados (ele CRIA uma máquina)
    TestBed.configureTestingModule({ imports: [NovaMaquinaDialog], providers: provedoresDeDialogo(null) });
    const fixture = TestBed.createComponent(NovaMaquinaDialog);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
