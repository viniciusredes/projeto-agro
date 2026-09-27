import { Component, OnInit, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PecaService } from '../../../core/services/peca.service';
import { MovimentoEstoque, Peca, TipoMovimentoEstoque } from '../../../core/models/peca';

// Como cada tipo de movimento aparece na tabela
interface ApresentacaoTipo {
  rotulo: string;
  icone: string;
  classe: string;
  sinal: string;   // + soma ao saldo, − subtrai
}

@Component({
  selector: 'app-peca-kardex',
  imports: [
    CurrencyPipe, DatePipe, DecimalPipe, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule, MatProgressBarModule,
  ],
  templateUrl: './peca-kardex.html',
  styleUrl: './peca-kardex.scss',
})
export class PecaKardex implements OnInit {
  private readonly pecaService = inject(PecaService);

  // Vem do parâmetro :id da rota (graças ao withComponentInputBinding no app.config.ts).
  // Na URL tudo é texto: numberAttribute converte '1' em 1 (e 'abc' em NaN).
  readonly id = input.required({ transform: numberAttribute });

  // Estado da tela
  protected readonly peca = signal<Peca | null>(null);
  protected readonly movimentos = signal<MovimentoEstoque[]>([]);
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly naoEncontrada = signal(false);

  // A API devolve do mais antigo ao mais recente; na tela, o mais recente fica no topo.
  // Copia a lista antes de ordenar: o signal original não deve ser alterado.
  protected readonly movimentosRecentes = computed(() =>
    [...this.movimentos()].sort((a, b) => b.id - a.id),
  );

  protected readonly colunas = ['data', 'tipo', 'quantidade', 'custo', 'total', 'saldoApos', 'origem'];

  // Record obriga a ter a apresentação de TODOS os tipos de movimento
  private readonly tipos: Record<TipoMovimentoEstoque, ApresentacaoTipo> = {
    implantacao: { rotulo: 'Implantação', icone: 'inventory_2', classe: 'tipo--implantacao', sinal: '+' },
    entrada: { rotulo: 'Entrada', icone: 'south_west', classe: 'tipo--entrada', sinal: '+' },
    saida: { rotulo: 'Saída', icone: 'north_east', classe: 'tipo--saida', sinal: '−' },
  };

  // Método tipado: no template, a variável do *matCellDef é "any" e não pode indexar o Record
  protected tipo(tipo: TipoMovimentoEstoque): ApresentacaoTipo {
    return this.tipos[tipo];
  }

  // ngOnInit (e não o constructor): os inputs só são preenchidos depois que o componente é criado.
  // Escolhemos ngOnInit em vez de effect() porque o Router cria um PecaKardex novo a cada
  // entrada vinda da lista. Se um dia houver navegação direta /estoque/1 → /estoque/2
  // (aí o Router reaproveita o componente), trocar por um effect() que reage ao id().
  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.naoEncontrada.set(false);

    // forkJoin: dispara as duas requisições em paralelo e só responde quando AMBAS terminam
    forkJoin({
      peca: this.pecaService.buscar(this.id()),
      movimentos: this.pecaService.listarMovimentos(this.id()),
    })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: ({ peca, movimentos }) => {
          this.peca.set(peca);
          this.movimentos.set(movimentos);
        },
        error: (erro: unknown) => {
          // 404 (id inexistente) ou 400 (id não numérico, ex.: /estoque/abc): a peça não existe
          if (erro instanceof HttpErrorResponse && (erro.status === 404 || erro.status === 400)) {
            this.naoEncontrada.set(true);
          } else {
            this.erro.set('Não foi possível carregar o kardex da peça.');
          }
        },
      });
  }
}
