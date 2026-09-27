import { ApplicationConfig, DEFAULT_CURRENCY_CODE, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app.routes';

// Carrega as regras de formatação do português (datas, números, moeda)
registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()), // habilita o HttpClient (usando a API fetch do navegador)
    { provide: LOCALE_ID, useValue: 'pt-BR' },          // pipes date/number/currency em pt-BR
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' }, // moeda padrão do pipe currency: R$
  ],
};
