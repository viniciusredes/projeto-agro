import { Routes } from '@angular/router';

export const routes: Routes = [
  // Tela inicial: redireciona para a lista de máquinas
  { path: '', redirectTo: 'maquinas', pathMatch: 'full' },

  // Cada tela só é baixada quando o usuário entra nela (lazy loading)
  {
    path: 'maquinas',
    title: 'Máquinas | Agro Frota',
    loadComponent: () =>
      import('./features/maquinas/maquinas-lista/maquinas-lista').then(m => m.MaquinasLista),
  },
  {
    path: 'estoque',
    title: 'Estoque | Agro Frota',
    loadComponent: () =>
      import('./features/estoque/pecas-lista/pecas-lista').then(m => m.PecasLista),
  },
  {
    path: 'ordens-servico',
    title: 'Ordens de Serviço | Agro Frota',
    loadComponent: () =>
      import('./features/ordens-servico/os-lista/os-lista').then(m => m.OsLista),
  },

  // Qualquer URL desconhecida volta para a tela inicial (SEMPRE a última rota)
  { path: '**', redirectTo: 'maquinas' },
];
