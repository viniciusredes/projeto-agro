import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MovimentacoesLista } from './movimentacoes-lista';

describe('MovimentacoesLista', () => {
  let component: MovimentacoesLista;
  let fixture: ComponentFixture<MovimentacoesLista>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovimentacoesLista],
    }).compileComponents();

    fixture = TestBed.createComponent(MovimentacoesLista);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
