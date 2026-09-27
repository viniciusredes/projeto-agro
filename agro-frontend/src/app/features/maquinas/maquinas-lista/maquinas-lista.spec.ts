import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MaquinasLista } from './maquinas-lista';

describe('MaquinasLista', () => {
  let component: MaquinasLista;
  let fixture: ComponentFixture<MaquinasLista>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaquinasLista],
    }).compileComponents();

    fixture = TestBed.createComponent(MaquinasLista);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
