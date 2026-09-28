import { TestBed } from '@angular/core/testing';
import { OsLista } from './os-lista';
import { provedoresBase } from '../../../../testing/provedores-de-teste';

describe('OsLista', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ imports: [OsLista], providers: provedoresBase() });
    const fixture = TestBed.createComponent(OsLista);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
