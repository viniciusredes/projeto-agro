import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntradaDialog } from './entrada-dialog';

describe('EntradaDialog', () => {
  let component: EntradaDialog;
  let fixture: ComponentFixture<EntradaDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntradaDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(EntradaDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
