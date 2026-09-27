import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NovaMaquinaDialog } from './nova-maquina-dialog';

describe('NovaMaquinaDialog', () => {
  let component: NovaMaquinaDialog;
  let fixture: ComponentFixture<NovaMaquinaDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NovaMaquinaDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(NovaMaquinaDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
