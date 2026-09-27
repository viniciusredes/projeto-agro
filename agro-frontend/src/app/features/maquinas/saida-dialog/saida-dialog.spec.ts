import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SaidaDialog } from './saida-dialog';

describe('SaidaDialog', () => {
  let component: SaidaDialog;
  let fixture: ComponentFixture<SaidaDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaidaDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(SaidaDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
