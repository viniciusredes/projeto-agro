import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

// Formato de um item do menu lateral
interface ItemMenu {
  titulo: string;
  rota: string;
  icone: string; // nome do ícone do Material Symbols
}

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatSidenavModule, MatListModule, MatIconModule, MatButtonModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  // Os itens do menu ficam numa lista: para acrescentar uma tela, basta uma linha aqui
  protected readonly itensMenu: ItemMenu[] = [
    { titulo: 'Máquinas', rota: '/maquinas', icone: 'agriculture' },
    { titulo: 'Estoque', rota: '/estoque', icone: 'inventory_2' },
    { titulo: 'Ordens de Serviço', rota: '/ordens-servico', icone: 'build' },    
    { titulo: 'Movimentações', rota: '/movimentacoes', icone: 'history' },    

  ];
}
