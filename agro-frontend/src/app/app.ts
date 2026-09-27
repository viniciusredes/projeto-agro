import { Component, inject } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { Shell } from './layout/shell/shell';

@Component({
  selector: 'app-root',
  imports: [Shell],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    // O ng add carregou a fonte "Material Symbols Outlined" no index.html.
    // Isto faz o <mat-icon> usar essa fonte por padrão.
    inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');
  }
}
