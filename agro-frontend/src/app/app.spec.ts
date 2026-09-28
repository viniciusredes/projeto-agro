import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provedoresBase } from '../testing/provedores-de-teste';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [App], providers: provedoresBase() });
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  // O teste gerado pelo CLI procurava o título "Hello, agro-frontend" da página de exemplo,
  // que não existe mais: o App só mostra a casca (Shell), com o menu e a barra.
  it('renderiza a casca do sistema', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-shell')).not.toBeNull();
  });
});
