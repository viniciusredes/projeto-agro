import { ApplicationConfig, DEFAULT_CURRENCY_CODE, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { erroApiInterceptor } from './core/interceptors/erro-api-interceptor';
import { routes } from './app.routes';


// Carrega as regras de formatação do português (datas, números, moeda)
registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // HttpClient (já usa a API fetch por padrão) + interceptor global de erros
    provideHttpClient(withInterceptors([erroApiInterceptor])),
    { provide: LOCALE_ID, useValue: 'pt-BR' },          // pipes date/number/currency em pt-BR
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' }, // moeda padrão do pipe currency: R$
  ],
};
