import { Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { LimitesHorimetro } from '../../core/models/maquina';
import { atalhosDoHorimetro } from '../../core/horimetro';

// A faixa válida do horímetro e os botões rápidos (+1 h, +4 h, +8 h), embaixo do campo.
// Usado no retorno e na abertura de O.S. O componente só AVISA o valor escolhido (output);
// quem preenche o campo é o formulário do diálogo.
@Component({
  selector: 'app-atalhos-horimetro',
  imports: [DecimalPipe, MatButtonModule],
  templateUrl: './atalhos-horimetro.html',
  styleUrl: './atalhos-horimetro.scss',
})
export class AtalhosHorimetro {
  readonly limites = input.required<LimitesHorimetro>();
  readonly escolher = output<number>();

  protected readonly atalhos = computed(() => atalhosDoHorimetro(this.limites()));
}
