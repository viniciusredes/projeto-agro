import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PreferenciaTema, TemaService } from '../../core/ui/tema.service';

// Formato de um item do menu lateral
interface ItemMenu {
  titulo: string;
  rota: string;
  icone: string; // nome do ícone do Material Symbols
}

// Opções do menu de tema
interface OpcaoTema {
  valor: PreferenciaTema;
  rotulo: string;
  icone: string;
}

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatSidenavModule, MatListModule, MatIconModule, MatButtonModule,
    MatMenuModule, MatTooltipModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  protected readonly tema = inject(TemaService);

  // Os itens do menu ficam numa lista: para acrescentar uma tela, basta uma linha aqui
  protected readonly itensMenu: ItemMenu[] = [
    { titulo: 'Início', rota: '/', icone: 'home' },
    { titulo: 'Máquinas', rota: '/maquinas', icone: 'agriculture' },
    { titulo: 'Estoque', rota: '/estoque', icone: 'inventory_2' },
    { titulo: 'Ordens de Serviço', rota: '/ordens-servico', icone: 'build' },
    { titulo: 'Movimentações', rota: '/movimentacoes', icone: 'history' },
  ];

  protected readonly opcoesTema: OpcaoTema[] = [
    { valor: 'claro', rotulo: 'Claro', icone: 'light_mode' },
    { valor: 'escuro', rotulo: 'Escuro', icone: 'dark_mode' },
  ];

  // Ícone do botão: mostra o tema atual
  protected iconeTemaAtual(): string {
    return this.tema.escuroAtivo() ? 'dark_mode' : 'light_mode';
  }
}
