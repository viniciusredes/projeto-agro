import { Component, computed, inject, input, numberAttribute } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MaquinaService } from '../../../core/services/maquina.service';
import { OrdemServicoService } from '../../../core/services/ordem-servico.service';
import { TIPOS_OS, TipoOS } from '../../../core/models/ordem-servico';
import { etiquetaStatusMaquina, etiquetaTipoOS } from '../../../core/ui/tons';

// Um pedaço da barra "custo por tipo": qual tipo, quanto custou e quanto representa do total
interface SegmentoCusto {
  tipo: TipoOS;
  valor: number;
  percentual: number;
}

@Component({
  selector: 'app-maquina-detalhe',
  imports: [
    CurrencyPipe, DatePipe, DecimalPipe, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule, MatProgressBarModule,
  ],
  templateUrl: './maquina-detalhe.html',
  styleUrl: './maquina-detalhe.scss',
})
export class MaquinaDetalhe {
  private readonly maquinaService = inject(MaquinaService);
  private readonly osService = inject(OrdemServicoService);

  // /maquinas/:id -> o :id chega como input já convertido em número
  readonly id = input.required({ transform: numberAttribute });

  // Indicadores calculados pela API (Parte OS7 do back-end): total, abertas, fechadas, custos
  protected readonly resumo = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.osService.manutencoesDaMaquina(params),
  });

  // A API de manutenções devolve só a tag; modelo e horímetro vêm da lista de máquinas
  private readonly maquinas = rxResource({
    stream: () => this.maquinaService.listar(),
  });

  protected readonly maquina = computed(() =>
    this.maquinas.hasValue() ? this.maquinas.value().find(m => m.id === this.id()) : undefined,
  );

  // Segmentos da barra: sempre na MESMA ordem (Preventiva, Corretiva) e com a mesma cor,
  // para a cor identificar o tipo (e não a posição ou o tamanho)
  protected readonly segmentos = computed<SegmentoCusto[]>(() => {
    if (!this.resumo.hasValue()) {
      return [];
    }
    const { custoTotal, custoPorTipo } = this.resumo.value();
    return TIPOS_OS.map(tipo => ({
      tipo,
      valor: custoPorTipo[tipo],
      percentual: custoTotal > 0 ? (custoPorTipo[tipo] / custoTotal) * 100 : 0,
    }));
  });

  // Texto que descreve a barra para leitores de tela (a barra em si é só visual)
  protected readonly descricaoBarra = computed(() =>
    this.segmentos()
      .map(s => `${s.tipo}: ${s.percentual.toFixed(0)}% do custo`)
      .join('; '),
  );

  // O.S. da máquina, mais recentes primeiro
  protected readonly ordens = computed(() =>
    this.resumo.hasValue() ? [...this.resumo.value().ordens].sort((a, b) => b.id - a.id) : [],
  );

  protected readonly colunas = ['numero', 'tipo', 'status', 'abertura', 'custo'];

  // Tons das etiquetas (regra compartilhada em core/ui/tons.ts)
  protected readonly etiquetaStatusMaquina = etiquetaStatusMaquina;
  protected readonly etiquetaTipoOS = etiquetaTipoOS;
}
