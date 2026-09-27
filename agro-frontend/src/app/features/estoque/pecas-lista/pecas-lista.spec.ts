import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PecasLista } from './pecas-lista';

describe('PecasLista', () => {
  let component: PecasLista;
  let fixture: ComponentFixture<PecasLista>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PecasLista],
    }).compileComponents();

    fixture = TestBed.createComponent(PecasLista);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
