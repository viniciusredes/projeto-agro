import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
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
  curto?: string; // rótulo na navegação inferior do celular; sem ele, o item fica só no menu lateral
}

// Até esta largura, o layout é o de celular (navegação inferior + menu em gaveta)
const CELULAR = '(max-width: 767.98px)';

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

  // true quando a tela é de celular. O BreakpointObserver avisa a cada mudança
  // (girar o aparelho, redimensionar a janela) e o toSignal transforma isso num signal.
  protected readonly celular = toSignal(
    inject(BreakpointObserver).observe(CELULAR).pipe(map(estado => estado.matches)),
    { initialValue: false },
  );

  // Os itens do menu ficam numa lista: para acrescentar uma tela, basta uma linha aqui
  protected readonly itensMenu: ItemMenu[] = [
    { titulo: 'Início', rota: '/', icone: 'home', curto: 'Início' },
    { titulo: 'Máquinas', rota: '/maquinas', icone: 'agriculture', curto: 'Máquinas' },
    { titulo: 'Estoque', rota: '/estoque', icone: 'inventory_2', curto: 'Estoque' },
    { titulo: 'Ordens de Serviço', rota: '/ordens-servico', icone: 'build', curto: 'O.S.' },
    { titulo: 'Movimentações', rota: '/movimentacoes', icone: 'history' },
  ];

  // Navegação inferior: só os itens com rótulo curto (4 cabem bem numa tela de celular)
  protected readonly itensInferiores = this.itensMenu.filter(item => item.curto);

  protected readonly opcoesTema: OpcaoTema[] = [
    { valor: 'claro', rotulo: 'Claro', icone: 'light_mode' },
    { valor: 'escuro', rotulo: 'Escuro', icone: 'dark_mode' },
  ];

  // Ícone do botão: mostra o tema atual
  protected iconeTemaAtual(): string {
    return this.tema.escuroAtivo() ? 'dark_mode' : 'light_mode';
  }

  // No celular o menu é uma gaveta por cima do conteúdo: fecha ao escolher uma tela
  protected aoNavegar(menu: MatSidenav): void {
    if (this.celular()) {
      menu.close();
    }
  }
}
