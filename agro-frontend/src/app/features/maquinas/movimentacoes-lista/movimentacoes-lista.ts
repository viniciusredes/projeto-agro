import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { finalize } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MaquinaService } from '../../../core/services/maquina.service';
import { mensagemDeErro } from '../../../core/api';
import { Maquina, Movimentacao } from '../../../core/models/maquina';

@Component({
  selector: 'app-movimentacoes-lista',
  imports: [
    DatePipe, DecimalPipe,
    MatTableModule, MatFormFieldModule, MatSelectModule, MatIconModule, MatProgressBarModule,
  ],
  templateUrl: './movimentacoes-lista.html',
  styleUrl: './movimentacoes-lista.scss',
})
export class MovimentacoesLista {
  private readonly maquinaService = inject(MaquinaService);

  // Máquinas: usadas no filtro e para mostrar a tag em cada linha
  protected readonly maquinas = signal<Maquina[]>([]);
  protected readonly movimentacoes = signal<Movimentacao[]>([]);
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);

  // Filtro escolhido no select (null = todas as máquinas)
  protected readonly filtroMaquinaId = signal<number | null>(null);

  protected readonly colunas = ['maquina', 'operador', 'frente', 'saida', 'retorno', 'horas', 'avarias'];

  // "Join" feito no front: id da máquina -> tag (recalculado só quando a lista de máquinas muda)
  private readonly tagPorId = computed(
    () => new Map(this.maquinas().map(maquina => [maquina.id, maquina.tag])),
  );

  // Mais recentes primeiro (a API devolve em ordem de criação)
  protected readonly movimentacoesOrdenadas = computed(() =>
    [...this.movimentacoes()].sort((a, b) => b.id - a.id),
  );

  constructor() {
    this.maquinaService.listar().subscribe({
      next: maquinas => this.maquinas.set(maquinas),
      error: erro => this.erro.set(mensagemDeErro(erro)),
    });
    this.carregar();
  }

  protected tagDaMaquina(maquinaId: number): string {
    return this.tagPorId().get(maquinaId) ?? `#${maquinaId}`;
  }

  // Chamado quando o usuário troca a máquina no filtro
  protected filtrar(maquinaId: number | null): void {
    this.filtroMaquinaId.set(maquinaId);
    this.carregar();
  }

  private carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.maquinaService
      .listarMovimentacoes(this.filtroMaquinaId())
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: movimentacoes => this.movimentacoes.set(movimentacoes),
        error: erro => this.erro.set(mensagemDeErro(erro)),
      });
  }
}
