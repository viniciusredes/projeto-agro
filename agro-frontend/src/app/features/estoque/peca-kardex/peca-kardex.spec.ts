import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PecaKardex } from './peca-kardex';

describe('PecaKardex', () => {
  let component: PecaKardex;
  let fixture: ComponentFixture<PecaKardex>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PecaKardex],
    }).compileComponents();

    fixture = TestBed.createComponent(PecaKardex);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
