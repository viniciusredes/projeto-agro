import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OsDetalhe } from './os-detalhe';

describe('OsDetalhe', () => {
  let component: OsDetalhe;
  let fixture: ComponentFixture<OsDetalhe>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OsDetalhe],
    }).compileComponents();

    fixture = TestBed.createComponent(OsDetalhe);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
