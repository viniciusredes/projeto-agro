import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OsLista } from './os-lista';

describe('OsLista', () => {
  let component: OsLista;
  let fixture: ComponentFixture<OsLista>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OsLista],
    }).compileComponents();

    fixture = TestBed.createComponent(OsLista);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
