import { TestBed } from '@angular/core/testing';
import { Shell } from './shell';
import { provedoresBase } from '../../../testing/provedores-de-teste';

describe('Shell', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ imports: [Shell], providers: provedoresBase() });
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
