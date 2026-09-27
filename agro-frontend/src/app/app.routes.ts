import { Routes } from '@angular/router';

export const routes: Routes = [
  // Página inicial: apresentação do produto + números da frota
  {
    path: '',
    pathMatch: 'full',
    title: 'Agro Frota | Gestão inteligente de máquinas agrícolas',
    loadComponent: () => import('./features/inicio/inicio').then(m => m.Inicio),
  },

  // Cada tela só é baixada quando o usuário entra nela (lazy loading)
  {
    path: 'maquinas',
    title: 'Máquinas | Agro Frota',
    loadComponent: () =>
      import('./features/maquinas/maquinas-lista/maquinas-lista').then(m => m.MaquinasLista),
  },
  {
    // Detalhe da máquina com os indicadores de manutenção: /maquinas/1
    path: 'maquinas/:id',
    title: 'Máquina | Agro Frota',
    loadComponent: () =>
      import('./features/maquinas/maquina-detalhe/maquina-detalhe').then(m => m.MaquinaDetalhe),
  },
  {
    path: 'estoque',
    title: 'Estoque | Agro Frota',
    loadComponent: () =>
      import('./features/estoque/pecas-lista/pecas-lista').then(m => m.PecasLista),
  },
  {
    // Rota com parâmetro: /estoque/1, /estoque/2... (o :id vira o input "id" do componente)
    path: 'estoque/:id',
    title: 'Kardex | Agro Frota',
    loadComponent: () =>
      import('./features/estoque/peca-kardex/peca-kardex').then(m => m.PecaKardex),
  },
  {
    path: 'ordens-servico',
    title: 'Ordens de Serviço | Agro Frota',
    loadComponent: () =>
      import('./features/ordens-servico/os-lista/os-lista').then(m => m.OsLista),
  },
  {
    // Detalhe e fechamento da O.S.: /ordens-servico/1 (o :id vira o input "id")
    path: 'ordens-servico/:id',
    title: 'Ordem de Serviço | Agro Frota',
    loadComponent: () =>
      import('./features/ordens-servico/os-detalhe/os-detalhe').then(m => m.OsDetalhe),
  },
  {
    path: 'movimentacoes',
    title: 'Movimentações | Agro Frota',
    loadComponent: () =>
      import('./features/maquinas/movimentacoes-lista/movimentacoes-lista').then(m => m.MovimentacoesLista),
  },


  // Qualquer URL desconhecida volta para a tela inicial (SEMPRE a última rota)
  { path: '**', redirectTo: '' },
];
