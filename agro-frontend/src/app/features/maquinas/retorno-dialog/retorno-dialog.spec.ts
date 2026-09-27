import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RetornoDialog } from './retorno-dialog';

describe('RetornoDialog', () => {
  let component: RetornoDialog;
  let fixture: ComponentFixture<RetornoDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RetornoDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(RetornoDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
