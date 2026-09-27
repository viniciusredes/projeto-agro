import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AbrirOsDialog } from './abrir-os-dialog';

describe('AbrirOsDialog', () => {
  let component: AbrirOsDialog;
  let fixture: ComponentFixture<AbrirOsDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbrirOsDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(AbrirOsDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
