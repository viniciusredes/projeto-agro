import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Observable, finalize } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { PecaService } from '../../../core/services/peca.service';
import { Peca, PecaParaRepor } from '../../../core/models/peca';

@Component({
  selector: 'app-pecas-lista',
  imports: [
    CurrencyPipe, DecimalPipe,
    MatTableModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatSlideToggleModule,
  ],
  templateUrl: './pecas-lista.html',
  styleUrl: './pecas-lista.scss',
})
export class PecasLista {
  private readonly pecaService = inject(PecaService);

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
    'situacao',
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
