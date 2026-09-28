import { TestBed } from '@angular/core/testing';
import { Inicio } from './inicio';
import { provedoresBase } from '../../../testing/provedores-de-teste';

describe('Inicio', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ imports: [Inicio], providers: provedoresBase() });
    const fixture = TestBed.createComponent(Inicio);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
