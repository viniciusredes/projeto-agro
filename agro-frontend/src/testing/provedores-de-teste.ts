import { DEFAULT_CURRENCY_CODE, EnvironmentProviders, LOCALE_ID, Provider } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

// Por que os testes gerados pelo CLI falhavam (NG0201: No provider found):
// no app, o app.config.ts entrega HttpClient, Router etc. para todos. No teste, o TestBed
// começa VAZIO: cada teste precisa dizer quais dependências existem.

// Os testes também não passam pelo app.config.ts: o idioma pt-BR precisa ser registrado aqui,
// senão os pipes formatam no padrão americano ("1,000.5" em vez de "1.000,5")
registerLocaleData(localePt);

// O mínimo para qualquer tela ou service do projeto:
// - HttpClient de TESTE: nenhuma requisição sai de verdade (o HttpTestingController as intercepta)
// - Router sem rotas: suficiente para routerLink, ActivatedRoute e Router.navigate
// - idioma pt-BR e moeda BRL, como no app.config.ts
export function provedoresBase(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideRouter([]),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
  ];
}

// Para diálogos: o "data" do dialog.open e um MatDialogRef falso, que só registra o close()
export function provedoresDeDialogo<T>(dados: T): (Provider | EnvironmentProviders)[] {
  return [
    ...provedoresBase(),
    { provide: MAT_DIALOG_DATA, useValue: dados },
    { provide: MatDialogRef, useValue: { close: vi.fn() } },
  ];
}
