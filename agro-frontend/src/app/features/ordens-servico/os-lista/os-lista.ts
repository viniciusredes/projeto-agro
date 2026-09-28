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
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrdemServicoService } from '../../../core/services/ordem-servico.service';
import { MaquinaService } from '../../../core/services/maquina.service';
import { RespostaAberturaOS, STATUS_OS, StatusOS } from '../../../core/models/ordem-servico';
import { etiquetaStatusOS, etiquetaTipoOS } from '../../../core/ui/tons';
import { AbrirOsDialog } from '../abrir-os-dialog/abrir-os-dialog';
import { mensagemAberturaOS } from '../mensagens';

// Converte o texto da URL (?maquinaId=2) em número; valor ausente ou inválido = sem filtro
function paraMaquinaId(valor: string | undefined): number | undefined {
  const numero = Number(valor);
  return valor !== undefined && Number.isInteger(numero) ? numero : undefined;
}

// Só aceita os status conhecidos; ?status=xyz digitado à mão é ignorado
function paraStatus(valor: string | undefined): StatusOS | undefined {
  return STATUS_OS.includes(valor as StatusOS) ? (valor as StatusOS) : undefined;
}

@Component({
  selector: 'app-os-lista',
  imports: [
    CurrencyPipe, DatePipe, DecimalPipe, RouterLink,
    MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule,
  ],
  templateUrl: './os-lista.html',
  styleUrl: './os-lista.scss',
})
export class OsLista {
  private readonly osService = inject(OrdemServicoService);
  private readonly maquinaService = inject(MaquinaService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  // Filtros vindos da URL (query params viram input() graças ao withComponentInputBinding)
  readonly maquinaId = input<number | undefined, string | undefined>(undefined, { transform: paraMaquinaId });
  readonly status = input<StatusOS | undefined, string | undefined>(undefined, { transform: paraStatus });

  // Recurso reativo: sempre que a máquina do filtro muda, a lista é buscada de novo.
  // O STATUS não vai para a API (R6.3): com todas as O.S. da máquina em mãos, a tela conta
  // abertas e fechadas para os botões de filtro ("Abertas · 2") sem uma chamada a mais.
  protected readonly ordens = rxResource({
    params: () => ({ maquinaId: this.maquinaId() }),
    stream: ({ params }) => this.osService.listar(params),
  });

  // Máquinas: usadas no filtro e para mostrar tag e modelo em cada O.S. (carrega uma vez)
  protected readonly maquinas = rxResource({
    stream: () => this.maquinaService.listar(),
  });

  // Mais recentes primeiro. hasValue() evita ler value() quando o recurso está em erro
  private readonly ordensOrdenadas = computed(() =>
    this.ordens.hasValue() ? [...this.ordens.value()].sort((a, b) => b.id - a.id) : [],
  );

  // Contagens para os botões de filtro
  protected readonly totais = computed(() => {
    const todas = this.ordensOrdenadas();
    const abertas = todas.filter(os => os.status === 'Aberta').length;
    return { todas: todas.length, abertas, fechadas: todas.length - abertas };
  });

  // As duas seções da tela, já respeitando o filtro de status da URL
  protected readonly abertas = computed(() =>
    this.status() === 'Fechada' ? [] : this.ordensOrdenadas().filter(os => os.status === 'Aberta'),
  );
  protected readonly fechadas = computed(() =>
    this.status() === 'Aberta' ? [] : this.ordensOrdenadas().filter(os => os.status === 'Fechada'),
  );

  // "Join" no front: id da máquina -> "TR-01 · Trator"
  private readonly nomePorId = computed(
    () => new Map((this.maquinas.hasValue() ? this.maquinas.value() : []).map(m => [m.id, `${m.tag} · ${m.modelo}`])),
  );

  protected readonly temFiltro = computed(
    () => this.maquinaId() !== undefined || this.status() !== undefined,
  );

  // Tons das etiquetas: regra compartilhada com o detalhe da O.S. e o detalhe da máquina
  protected readonly etiquetaStatus = etiquetaStatusOS;
  protected readonly etiquetaTipo = etiquetaTipoOS;

  protected nomeDaMaquina(maquinaId: number): string {
    return this.nomePorId().get(maquinaId) ?? `Máquina #${maquinaId}`;
  }

  // Abre o diálogo sem máquina escolhida (o usuário escolhe no select do diálogo)
  protected abrirOs(): void {
    this.dialog
      .open<AbrirOsDialog, null, RespostaAberturaOS>(AbrirOsDialog, { data: null, width: '520px' })
      .afterClosed()
      .subscribe(resposta => {
        if (resposta) {
          this.snackBar.open(mensagemAberturaOS(resposta), 'OK', { duration: 6000 });
          this.ordens.reload();   // a lista ganhou uma O.S.
          this.maquinas.reload(); // e a máquina mudou de status
        }
      });
  }

  // Os selects NÃO buscam dados: só atualizam a URL. A URL muda o input, que recarrega o recurso.
  protected filtrarMaquina(maquinaId: number | null): void {
    this.atualizarUrl({ maquinaId });
  }

  protected filtrarStatus(status: StatusOS | null): void {
    this.atualizarUrl({ status });
  }

  protected limparFiltros(): void {
    this.atualizarUrl({ maquinaId: null, status: null });
  }

  // null remove o parâmetro da URL; 'merge' preserva os demais filtros
  private atualizarUrl(queryParams: Record<string, number | string | null>): void {
    this.router.navigate([], { relativeTo: this.rota, queryParams, queryParamsHandling: 'merge' });
  }
}
