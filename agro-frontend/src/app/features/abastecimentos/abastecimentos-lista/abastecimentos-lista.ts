import { Component, computed, inject, input } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AbastecimentoService } from '../../../core/services/abastecimento.service';
import { MaquinaService } from '../../../core/services/maquina.service';
import {
  Abastecimento, ORIGENS_ABASTECIMENTO, OrigemAbastecimento, STATUS_ABASTECIMENTO, StatusAbastecimento,
} from '../../../core/models/abastecimento';
import { etiquetaOrigemAbastecimento, etiquetaStatusAbastecimento, rotuloStatusAbastecimento } from '../../../core/ui/tons';

// Converte o texto da URL (?maquinaId=2) em número; valor ausente ou inválido = sem filtro
function paraMaquinaId(valor: string | undefined): number | undefined {
  const numero = Number(valor);
  return valor !== undefined && Number.isInteger(numero) ? numero : undefined;
}

// Só aceita os valores conhecidos; ?status=xyz digitado à mão é ignorado
function paraStatus(valor: string | undefined): StatusAbastecimento | undefined {
  return STATUS_ABASTECIMENTO.includes(valor as StatusAbastecimento) ? (valor as StatusAbastecimento) : undefined;
}

function paraOrigem(valor: string | undefined): OrigemAbastecimento | undefined {
  return ORIGENS_ABASTECIMENTO.includes(valor as OrigemAbastecimento) ? (valor as OrigemAbastecimento) : undefined;
}

@Component({
  selector: 'app-abastecimentos-lista',
  imports: [
    CurrencyPipe, DatePipe, DecimalPipe, RouterLink,
    MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule,
  ],
  templateUrl: './abastecimentos-lista.html',
  styleUrl: './abastecimentos-lista.scss',
})
export class AbastecimentosLista {
  private readonly abastecimentoService = inject(AbastecimentoService);
  private readonly maquinaService = inject(MaquinaService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);

  // Filtros vindos da URL (query params viram input() graças ao withComponentInputBinding)
  readonly maquinaId = input<number | undefined, string | undefined>(undefined, { transform: paraMaquinaId });
  readonly origem = input<OrigemAbastecimento | undefined, string | undefined>(undefined, { transform: paraOrigem });
  readonly status = input<StatusAbastecimento | undefined, string | undefined>(undefined, { transform: paraStatus });

  // Máquina e origem vão para a API. O STATUS fica na tela (como na lista de O.S.): com tudo
  // em mãos, os botões de filtro mostram as contagens ("Pendentes · 2") sem chamada a mais.
  protected readonly abastecimentos = rxResource({
    params: () => ({ maquinaId: this.maquinaId(), origem: this.origem() }),
    stream: ({ params }) => this.abastecimentoService.listar(params),
  });

  protected readonly maquinas = rxResource({ stream: () => this.maquinaService.listar() });

  protected readonly origens = ORIGENS_ABASTECIMENTO;

  // Mais recentes primeiro. hasValue() evita ler value() quando o recurso está em erro
  private readonly ordenados = computed(() =>
    this.abastecimentos.hasValue() ? [...this.abastecimentos.value()].sort((a, b) => b.id - a.id) : [],
  );

  protected readonly totais = computed(() => {
    const todos = this.ordenados();
    const contar = (status: StatusAbastecimento) => todos.filter(ab => ab.status === status).length;
    const aprovados = todos.filter(ab => ab.status === 'Aprovado');
    return {
      todos: todos.length,
      pendentes: contar('Pendente'),
      emCorrecao: contar('Em correção'),
      aprovados: aprovados.length,
      recusados: contar('Recusado'),
      // Só os aprovados contam no custo (a regra da API para os indicadores)
      custoAprovado: aprovados.reduce((soma, ab) => soma + ab.valorTotal, 0),
      litrosAprovados: aprovados.reduce((soma, ab) => soma + ab.litros, 0),
    };
  });

  // As três seções da tela, já respeitando o filtro de status da URL
  private daSecao(...status: StatusAbastecimento[]): Abastecimento[] {
    const filtro = this.status();
    return this.ordenados().filter(ab => status.includes(ab.status) && (!filtro || ab.status === filtro));
  }
  protected readonly pendentes = computed(() => this.daSecao('Pendente'));
  // Devolvidos: a vez é do operador (o gestor só acompanha o que foi pedido)
  protected readonly emCorrecao = computed(() => this.daSecao('Em correção'));
  protected readonly conferidos = computed(() => this.daSecao('Aprovado', 'Recusado'));

  // O pedido de correção em aberto (a última devolução)
  protected oQueCorrigir(abastecimento: Abastecimento): string {
    return abastecimento.devolucoes[abastecimento.devolucoes.length - 1]?.motivo ?? '';
  }

  // "Join" no front: id da máquina -> "TR-01 · Trator"
  private readonly nomePorId = computed(
    () => new Map((this.maquinas.hasValue() ? this.maquinas.value() : []).map(m => [m.id, `${m.tag} · ${m.modelo}`])),
  );

  protected readonly temFiltro = computed(
    () => this.maquinaId() !== undefined || this.origem() !== undefined || this.status() !== undefined,
  );

  protected readonly etiquetaStatus = etiquetaStatusAbastecimento;
  protected readonly rotuloStatus = rotuloStatusAbastecimento;
  protected readonly etiquetaOrigem = etiquetaOrigemAbastecimento;

  protected nomeDaMaquina(maquinaId: number): string {
    return this.nomePorId().get(maquinaId) ?? `Máquina #${maquinaId}`;
  }

  protected comprovante(abastecimento: Abastecimento): string | null {
    return this.abastecimentoService.enderecoDoComprovante(abastecimento);
  }

  // Os filtros NÃO buscam dados: só atualizam a URL. A URL muda o input, que recarrega o recurso.
  protected filtrarMaquina(maquinaId: number | null): void {
    this.atualizarUrl({ maquinaId });
  }

  protected filtrarOrigem(origem: OrigemAbastecimento | null): void {
    this.atualizarUrl({ origem });
  }

  protected filtrarStatus(status: StatusAbastecimento | null): void {
    this.atualizarUrl({ status });
  }

  protected limparFiltros(): void {
    this.atualizarUrl({ maquinaId: null, origem: null, status: null });
  }

  // null remove o parâmetro da URL; 'merge' preserva os demais filtros
  private atualizarUrl(queryParams: Record<string, number | string | null>): void {
    this.router.navigate([], { relativeTo: this.rota, queryParams, queryParamsHandling: 'merge' });
  }
}
