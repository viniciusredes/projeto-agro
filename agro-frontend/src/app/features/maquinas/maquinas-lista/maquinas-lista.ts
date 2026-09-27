import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaquinaService } from '../../../core/services/maquina.service';
import { Maquina, RespostaRetorno, RespostaSaida, StatusMaquina } from '../../../core/models/maquina';
import { SaidaDialog } from '../saida-dialog/saida-dialog';
import { RetornoDialog } from '../retorno-dialog/retorno-dialog';
import { NovaMaquinaDialog } from '../nova-maquina-dialog/nova-maquina-dialog';
import { AbrirOsDialog } from '../../ordens-servico/abrir-os-dialog/abrir-os-dialog';
import { mensagemAberturaOS } from '../../ordens-servico/mensagens';
import { RespostaAberturaOS } from '../../../core/models/ordem-servico';

@Component({
  selector: 'app-maquinas-lista',
  imports: [DecimalPipe, RouterLink, MatTableModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './maquinas-lista.html',
  styleUrl: './maquinas-lista.scss',
})
export class MaquinasLista {
  private readonly maquinaService = inject(MaquinaService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  // Estado da tela (signals: a tela se atualiza quando eles mudam)
  protected readonly maquinas = signal<Maquina[]>([]);
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);

  // Colunas exibidas na tabela, na ordem
  protected readonly colunas = ['tag', 'modelo', 'horimetro', 'status', 'acoes'];

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
   // Abre o diálogo de cadastro; se a máquina for criada, avisa e recarrega a tabela
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

 
  // Abre a O.S. com a máquina JÁ escolhida (o mesmo diálogo da tela de O.S., reaproveitado)
  protected abrirOs(maquina: Maquina): void {
    this.dialog
      .open<AbrirOsDialog, Maquina, RespostaAberturaOS>(AbrirOsDialog, { data: maquina, width: '520px' })
      .afterClosed()
      .subscribe(resposta => {
        if (resposta) {
          this.snackBar.open(mensagemAberturaOS(resposta), 'OK', { duration: 6000 });
          this.carregar(); // a máquina foi para "Em Manutenção"
        }
      });
  }

  // Abre o diálogo de saída; se a saída for registrada, avisa e recarrega a tabela
  protected abrirSaida(maquina: Maquina): void {
    this.dialog
      .open<SaidaDialog, Maquina, RespostaSaida>(SaidaDialog, { data: maquina, width: '440px' })
      .afterClosed()
      .subscribe(resposta => {
        // resposta é undefined quando o usuário cancela
        if (resposta) {
          this.snackBar.open(resposta.mensagem, 'OK', { duration: 4000 });
          this.carregar();
        }
      });
  }
    // Abre o diálogo de retorno; se o retorno for registrado, mostra as horas e recarrega a tabela
  protected abrirRetorno(maquina: Maquina): void {
    this.dialog
      .open<RetornoDialog, Maquina, RespostaRetorno>(RetornoDialog, { data: maquina, width: '440px' })
      .afterClosed()
      .subscribe(resposta => {
        if (resposta) {
          const horas = resposta.movimentacao.horasTrabalhadas;
          this.snackBar.open(`${resposta.mensagem} Horas trabalhadas: ${horas} h`, 'OK', { duration: 5000 });
          this.carregar();
        }
      });
  }

}
