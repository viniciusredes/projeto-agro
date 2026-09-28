import { TestBed } from '@angular/core/testing';
import { NovaPecaDialog } from './nova-peca-dialog';
import { provedoresDeDialogo } from '../../../../testing/provedores-de-teste';

describe('NovaPecaDialog', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ imports: [NovaPecaDialog], providers: provedoresDeDialogo(null) });
    const fixture = TestBed.createComponent(NovaPecaDialog);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
