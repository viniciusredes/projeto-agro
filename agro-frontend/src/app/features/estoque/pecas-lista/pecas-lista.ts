import { Component, computed, inject, input, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PecaService } from '../../../core/services/peca.service';
import { Peca, RespostaEntrada } from '../../../core/models/peca';
import { NovaPecaDialog } from '../nova-peca-dialog/nova-peca-dialog';
import { EntradaDialog } from '../entrada-dialog/entrada-dialog';

// ?filtro=repor na URL: só aceita "repor"; qualquer outro valor = todas as peças
type FiltroEstoque = 'repor';

function paraFiltro(valor: string | undefined): FiltroEstoque | undefined {
  return valor === 'repor' ? 'repor' : undefined;
}

// Uma peça pronta para a tela: o dado + o que a barra de nível precisa mostrar
interface LinhaPeca {
  peca: Peca;
  repor: boolean;         // saldo abaixo do mínimo
  falta: number;          // quanto falta para chegar ao mínimo
  nivel: number;          // largura da barra, em % (0 a 100)
}

@Component({
  selector: 'app-pecas-lista',
  imports: [CurrencyPipe, DecimalPipe, RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule],
  templateUrl: './pecas-lista.html',
  styleUrl: './pecas-lista.scss',
})
export class PecasLista {
  private readonly pecaService = inject(PecaService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);

  // Filtro vindo da URL (?filtro=repor), no mesmo padrão das Máquinas (?situacao=) e das O.S.
  readonly filtro = input<FiltroEstoque | undefined, string | undefined>(undefined, { transform: paraFiltro });

  // Busca por código ou descrição: estado só desta tela
  protected readonly busca = signal('');

  // Uma chamada só: o filtro "para repor" é feito aqui, com os mesmos dados
  protected readonly pecas = rxResource({ stream: () => this.pecaService.listar() });

  // Todas as peças com o nível calculado; as que precisam de reposição vêm primeiro
  private readonly linhas = computed<LinhaPeca[]>(() =>
    (this.pecas.hasValue() ? this.pecas.value() : [])
      .map(peca => {
        const repor = peca.saldo < peca.estoqueMinimo;
        // A barra vai até o DOBRO do mínimo, então a marca do mínimo fica sempre no meio (50%).
        // Sem mínimo definido (0), não há referência: a barra aparece cheia e sem marca.
        const nivel = peca.estoqueMinimo > 0 ? Math.min(100, (peca.saldo / (peca.estoqueMinimo * 2)) * 100) : 100;
        return { peca, repor, falta: Math.max(0, peca.estoqueMinimo - peca.saldo), nivel };
      })
      .sort((a, b) => Number(b.repor) - Number(a.repor) || a.peca.codigo.localeCompare(b.peca.codigo)),
  );

  // Botões de filtro com a contagem ("Para repor · 1")
  protected readonly totais = computed(() => ({
    todas: this.linhas().length,
    repor: this.linhas().filter(l => l.repor).length,
  }));

  // O que aparece na tela: filtro (URL) + busca por texto
  protected readonly visiveis = computed(() => {
    const soRepor = this.filtro() === 'repor';
    const termo = this.busca().trim().toLowerCase();
    return this.linhas().filter(({ peca, repor }) =>
      (!soRepor || repor) &&
      (!termo || peca.codigo.toLowerCase().includes(termo) || peca.descricao.toLowerCase().includes(termo)),
    );
  });

  // Valor do que está na prateleira (saldo x custo da última compra)
  protected readonly valorEmEstoque = computed(() =>
    this.linhas().reduce((soma, { peca }) => soma + peca.saldo * peca.custoUnitario, 0),
  );

  // O filtro não busca dados: só muda a URL (null remove o parâmetro)
  protected filtrar(filtro: FiltroEstoque | undefined): void {
    this.router.navigate([], { relativeTo: this.rota, queryParams: { filtro: filtro ?? null }, queryParamsHandling: 'merge' });
  }

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
  }

  protected carregar(): void {
    this.pecas.reload();
  }

  // Abre o diálogo de cadastro; se a peça for criada, avisa e recarrega a lista
  protected abrirCadastro(): void {
    this.dialog
      .open<NovaPecaDialog, void, Peca>(NovaPecaDialog, { width: '480px' })
      .afterClosed()
      .subscribe(peca => {
        if (peca) {
          this.snackBar.open(`Peça ${peca.codigo} cadastrada!`, 'OK', { duration: 4000 });
          this.carregar();
        }
      });
  }

  // Formata valores em reais fora do template (o pipe currency só funciona no HTML)
  private readonly reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  // Abre o diálogo de entrada (compra); se registrada, mostra a mudança de custo e recarrega a lista
  protected abrirEntrada(peca: Peca): void {
    this.dialog
      .open<EntradaDialog, Peca, RespostaEntrada>(EntradaDialog, { data: peca, width: '480px' })
      .afterClosed()
      .subscribe(resposta => {
        if (resposta) {
          const de = this.reais.format(resposta.custoAnterior);
          const para = this.reais.format(resposta.peca.custoUnitario);
          this.snackBar.open(`${resposta.mensagem} Custo: ${de} → ${para}`, 'OK', { duration: 5000 });
          this.carregar();
        }
      });
  }
}
