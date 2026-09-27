import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PecaService } from '../../../core/services/peca.service';
import { Peca, PecaParaRepor, RespostaEntrada } from '../../../core/models/peca';
import { NovaPecaDialog } from '../nova-peca-dialog/nova-peca-dialog';
import { EntradaDialog } from '../entrada-dialog/entrada-dialog';

@Component({
  selector: 'app-pecas-lista',
  imports: [
    CurrencyPipe, DecimalPipe, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatSlideToggleModule,
  ],
  templateUrl: './pecas-lista.html',
  styleUrl: './pecas-lista.scss',
})
export class PecasLista {
  private readonly pecaService = inject(PecaService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);


  // A lista pode conter peças comuns ou peças "para repor" (com faltaParaMinimo)
  protected readonly pecas = signal<(Peca | PecaParaRepor)[]>([]);
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);

  // true = mostra só as peças abaixo do estoque mínimo
  protected readonly somenteReposicao = signal(false);

  // A coluna "Falta" só existe no modo reposição: as colunas também são um dado derivado
  protected readonly colunas = computed(() => [
    'codigo', 'descricao', 'saldo', 'minimo', 'custo',
    ...(this.somenteReposicao() ? ['falta'] : []),
    'situacao', 'acoes',
  ]);

  // Valor total do que está na prateleira: soma de saldo x custo (dado derivado)
  protected readonly valorEmEstoque = computed(() =>
    this.pecas().reduce((soma, peca) => soma + peca.saldo * peca.custoUnitario, 0),
  );

  constructor() {
    this.carregar();
  }

  protected precisaRepor(peca: Peca): boolean {
    return peca.saldo < peca.estoqueMinimo;
  }
  // Abre o diálogo de cadastro; se a peça for criada, avisa e recarrega a tabela
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

  // Abre o diálogo de entrada (compra); se registrada, mostra a mudança de custo e recarrega a tabela
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

  // Chamado pelo slide-toggle
  protected alternarReposicao(ativo: boolean): void {
    this.somenteReposicao.set(ativo);
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);

    // Escolhe a chamada conforme o filtro (as duas devolvem listas de peças)
    const requisicao: Observable<(Peca | PecaParaRepor)[]> = this.somenteReposicao()
      ? this.pecaService.listarParaRepor()
      : this.pecaService.listar();

    requisicao.pipe(finalize(() => this.carregando.set(false))).subscribe({
      next: pecas => this.pecas.set(pecas),
      error: () => this.erro.set('Não foi possível carregar as peças.'),
    });
  }
}
