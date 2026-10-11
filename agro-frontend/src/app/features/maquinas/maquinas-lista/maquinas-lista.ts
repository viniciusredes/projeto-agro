import { Component, computed, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaquinaService } from '../../../core/services/maquina.service';
import { OrdemServicoService } from '../../../core/services/ordem-servico.service';
import { Maquina, StatusMaquina } from '../../../core/models/maquina';
import { etiquetaStatusMaquina } from '../../../core/ui/tons';
import { NovaMaquinaDialog } from '../nova-maquina-dialog/nova-maquina-dialog';
import { AcoesMaquina } from '../acoes-maquina';

// Os filtros rápidos: um por situação, na ordem em que aparecem
const SITUACOES: StatusMaquina[] = ['Disponível', 'Em Operação', 'Em Manutenção'];

// Texto do botão de filtro (o status "Em Operação" aparece como "Em campo", como no dia a dia)
const ROTULO_FILTRO: Record<StatusMaquina, string> = {
  'Disponível': 'Disponíveis',
  'Em Operação': 'Em campo',
  'Em Manutenção': 'Em manutenção',
};

// ?situacao=... da URL: só aceita os status conhecidos; qualquer outro valor = todas
function paraSituacao(valor: string | undefined): StatusMaquina | undefined {
  return SITUACOES.includes(valor as StatusMaquina) ? (valor as StatusMaquina) : undefined;
}

// Uma máquina já pronta para a tela: o dado + o contexto de onde ela está
interface LinhaMaquina {
  maquina: Maquina;
  contexto: string;       // "No pátio", "Carlos · Talhão 8" ou "O.S. nº 3 · Corretiva"
  osAbertaId?: number;    // para o botão "Ver O.S."
}

@Component({
  selector: 'app-maquinas-lista',
  imports: [DecimalPipe, RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule],
  templateUrl: './maquinas-lista.html',
  styleUrl: './maquinas-lista.scss',
})
export class MaquinasLista {
  private readonly maquinaService = inject(MaquinaService);
  private readonly osService = inject(OrdemServicoService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly acoes = inject(AcoesMaquina);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);

  // Filtro de situação vindo da URL (?situacao=Em Operação), como na lista de O.S. (Passo 12)
  readonly situacao = input<StatusMaquina | undefined, string | undefined>(undefined, { transform: paraSituacao });

  // Busca por tag ou modelo: estado só desta tela (não vai para a URL)
  protected readonly busca = signal('');

  // Máquinas + o contexto de cada uma: movimentações (quem está com ela) e O.S. (qual manutenção)
  protected readonly maquinas = rxResource({ stream: () => this.maquinaService.listar() });
  private readonly movimentacoes = rxResource({ stream: () => this.maquinaService.listarMovimentacoes() });
  private readonly osAbertas = rxResource({ stream: () => this.osService.listar({ status: 'Aberta' }) });

  protected readonly carregando = computed(
    () => this.maquinas.isLoading() || this.movimentacoes.isLoading() || this.osAbertas.isLoading(),
  );

  protected readonly etiquetaStatus = etiquetaStatusMaquina;

  // Todas as máquinas com o contexto já montado
  private readonly linhas = computed<LinhaMaquina[]>(() => {
    const lista = this.maquinas.hasValue() ? this.maquinas.value() : [];
    const saidas = (this.movimentacoes.hasValue() ? this.movimentacoes.value() : []).filter(m => !m.dataRetorno);
    const ordens = this.osAbertas.hasValue() ? this.osAbertas.value() : [];

    return lista.map(maquina => {
      if (maquina.status === 'Em Operação') {
        const saida = saidas.find(m => m.maquinaId === maquina.id);
        return { maquina, contexto: saida ? `${saida.operador} · ${saida.frenteTrabalho}` : 'Em campo' };
      }
      if (maquina.status === 'Em Manutenção') {
        const os = ordens.find(o => o.maquinaId === maquina.id);
        return { maquina, contexto: os ? `O.S. nº ${os.id} · ${os.tipo}` : 'Em manutenção', osAbertaId: os?.id };
      }
      return { maquina, contexto: 'No pátio' };
    });
  });

  // Botões de filtro com a contagem de cada situação ("Em campo · 1")
  protected readonly filtros = computed(() => {
    const linhas = this.linhas();
    return [
      { valor: undefined, rotulo: 'Todas', total: linhas.length },
      ...SITUACOES.map(situacao => ({
        valor: situacao,
        rotulo: ROTULO_FILTRO[situacao],
        total: linhas.filter(l => l.maquina.status === situacao).length,
      })),
    ];
  });

  // O que aparece na tela: filtro de situação (URL) + busca por texto
  protected readonly visiveis = computed(() => {
    const situacao = this.situacao();
    const termo = this.busca().trim().toLowerCase();
    return this.linhas().filter(({ maquina }) =>
      (!situacao || maquina.status === situacao) &&
      (!termo || maquina.tag.toLowerCase().includes(termo) || maquina.modelo.toLowerCase().includes(termo)),
    );
  });

  // O filtro não busca dados: só muda a URL (null remove o parâmetro)
  protected filtrar(situacao: StatusMaquina | undefined): void {
    this.router.navigate([], {
      relativeTo: this.rota,
      queryParams: { situacao: situacao ?? null },
      queryParamsHandling: 'merge',
    });
  }

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
  }

  protected carregar(): void {
    this.maquinas.reload();
    this.movimentacoes.reload();
    this.osAbertas.reload();
  }

  // Abre o diálogo de cadastro; se a máquina for criada, avisa e recarrega a lista
  protected abrirCadastro(): void {
    this.dialog
      .open<NovaMaquinaDialog, void, Maquina>(NovaMaquinaDialog, { width: '440px' })
      .afterClosed()
      .subscribe(maquina => {
        if (maquina) {
          this.snackBar.open(`Máquina ${maquina.tag} cadastrada!`, 'OK', { duration: 4000 });
          this.carregar();
        }
      });
  }

  // Saída, retorno e abertura de O.S.: o diálogo e o aviso ficam no AcoesMaquina (também usado
  // pelo detalhe da máquina); aqui só recarregamos a lista quando a ação deu certo
  protected abrirOs(maquina: Maquina): void {
    this.acoes.abrirOs(maquina).subscribe(() => this.carregar()); // a máquina foi para "Em Manutenção"
  }

  protected abrirSaida(maquina: Maquina): void {
    this.acoes.registrarSaida(maquina).subscribe(() => this.carregar());
  }

  protected abrirRetorno(maquina: Maquina): void {
    this.acoes.registrarRetorno(maquina).subscribe(() => this.carregar());
  }
}
