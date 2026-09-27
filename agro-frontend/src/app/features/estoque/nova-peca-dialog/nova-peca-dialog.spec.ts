import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NovaPecaDialog } from './nova-peca-dialog';

describe('NovaPecaDialog', () => {
  let component: NovaPecaDialog;
  let fixture: ComponentFixture<NovaPecaDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NovaPecaDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(NovaPecaDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
