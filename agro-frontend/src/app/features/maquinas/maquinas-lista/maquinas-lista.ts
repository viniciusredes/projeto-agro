import { Component, inject, signal } from '@angular/core';
import { MaquinaService } from '../../../core/services/maquina.service';

@Component({
  selector: 'app-maquinas-lista',
  imports: [],
  templateUrl: './maquinas-lista.html',
  styleUrl: './maquinas-lista.scss',
})
export class MaquinasLista {
  private readonly maquinaService = inject(MaquinaService);

  // null = ainda carregando; número = quantidade recebida
  protected readonly quantidade = signal<number | null>(null);

  constructor() {
    // A requisição só acontece no subscribe
    this.maquinaService.listar().subscribe({
      next: maquinas => {
        console.log('Máquinas recebidas da API:', maquinas);
        this.quantidade.set(maquinas.length);
      },
      error: erro => console.error('Falha ao chamar a API:', erro),
    });
  }
}
