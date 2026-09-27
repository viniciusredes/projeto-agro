import { Component, computed, inject, input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrdemServicoService } from '../../../core/services/ordem-servico.service';
import { MaquinaService } from '../../../core/services/maquina.service';
import { RespostaAberturaOS, STATUS_OS, StatusOS, TipoOS } from '../../../core/models/ordem-servico';
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
    CurrencyPipe, DatePipe,
    MatTableModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatProgressBarModule,
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

  protected readonly opcoesStatus = STATUS_OS;
  protected readonly colunas = ['numero', 'maquina', 'tipo', 'descricao', 'abertura', 'status', 'custo'];

  // Recurso reativo: sempre que um filtro (signal) muda, a lista é buscada de novo.
  // Se chegar um filtro novo antes da resposta anterior, a requisição antiga é cancelada.
  protected readonly ordens = rxResource({
    params: () => ({ maquinaId: this.maquinaId(), status: this.status() }),
    stream: ({ params }) => this.osService.listar(params),
  });

  // Máquinas: usadas no filtro e para mostrar a tag em cada linha (sem params = carrega uma vez)
  protected readonly maquinas = rxResource({
    stream: () => this.maquinaService.listar(),
  });

  // Mais recentes primeiro. hasValue() evita ler value() quando o recurso está em erro
  protected readonly ordensOrdenadas = computed(() =>
    this.ordens.hasValue() ? [...this.ordens.value()].sort((a, b) => b.id - a.id) : [],
  );

  // "Join" no front: id da máquina -> tag
  private readonly tagPorId = computed(
    () => new Map((this.maquinas.hasValue() ? this.maquinas.value() : []).map(m => [m.id, m.tag])),
  );

  protected readonly temFiltro = computed(
    () => this.maquinaId() !== undefined || this.status() !== undefined,
  );

  private readonly classesStatus: Record<StatusOS, string> = {
    Aberta: 'etiqueta--aberta',
    Fechada: 'etiqueta--fechada',
  };

  private readonly classesTipo: Record<TipoOS, string> = {
    Preventiva: 'etiqueta--preventiva',
    Corretiva: 'etiqueta--corretiva',
  };

  protected tagDaMaquina(maquinaId: number): string {
    return this.tagPorId().get(maquinaId) ?? `#${maquinaId}`;
  }

  protected classeDoStatus(status: StatusOS): string {
    return this.classesStatus[status];
  }

  protected classeDoTipo(tipo: TipoOS): string {
    return this.classesTipo[tipo];
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
