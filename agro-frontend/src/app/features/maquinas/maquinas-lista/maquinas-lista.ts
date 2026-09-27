import { Component, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MaquinaService } from '../../../core/services/maquina.service';
import { Maquina, StatusMaquina } from '../../../core/models/maquina';

@Component({
  selector: 'app-maquinas-lista',
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './maquinas-lista.html',
  styleUrl: './maquinas-lista.scss',
})
export class MaquinasLista {
  private readonly maquinaService = inject(MaquinaService);

  // Estado da tela (signals: a tela se atualiza quando eles mudam)
  protected readonly maquinas = signal<Maquina[]>([]);
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);

  // Colunas exibidas na tabela, na ordem
  protected readonly colunas = ['tag', 'modelo', 'horimetro', 'status'];

  // Classe CSS de cada status (Record obriga a ter TODOS os status)
  private readonly classesStatus: Record<StatusMaquina, string> = {
    'Disponível': 'status--disponivel',
    'Em Operação': 'status--operacao',
    'Em Manutenção': 'status--manutencao',
  };

  // Usado no template: devolve a classe CSS do status
  protected classeDoStatus(status: StatusMaquina): string {
    return this.classesStatus[status];
  }

  constructor() {
    this.carregar();
  }

  // Busca as máquinas na API (usado na abertura da tela e no botão "Atualizar")
  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.maquinaService
      .listar()
      .pipe(finalize(() => this.carregando.set(false))) // roda no sucesso E no erro
      .subscribe({
        next: maquinas => this.maquinas.set(maquinas),
        error: () =>
          this.erro.set('Não foi possível carregar as máquinas. Verifique se a API está rodando.'),
      });
  }
}
