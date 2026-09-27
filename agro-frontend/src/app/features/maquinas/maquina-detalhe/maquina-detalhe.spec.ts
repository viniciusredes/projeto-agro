import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MaquinaDetalhe } from './maquina-detalhe';

describe('MaquinaDetalhe', () => {
  let component: MaquinaDetalhe;
  let fixture: ComponentFixture<MaquinaDetalhe>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaquinaDetalhe],
    }).compileComponents();

    fixture = TestBed.createComponent(MaquinaDetalhe);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
