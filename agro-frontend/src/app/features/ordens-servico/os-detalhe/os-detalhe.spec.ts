import { TestBed } from '@angular/core/testing';
import { OsDetalhe } from './os-detalhe';
import { provedoresBase } from '../../../../testing/provedores-de-teste';

describe('OsDetalhe', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ imports: [OsDetalhe], providers: provedoresBase() });
    const fixture = TestBed.createComponent(OsDetalhe);
    fixture.componentRef.setInput('id', 1);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
