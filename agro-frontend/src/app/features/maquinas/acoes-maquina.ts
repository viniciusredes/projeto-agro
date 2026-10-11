import { Service, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, filter, map, tap } from 'rxjs';
import { Maquina, RespostaRetorno, RespostaSaida } from '../../core/models/maquina';
import { RespostaAberturaOS } from '../../core/models/ordem-servico';
import { SaidaDialog } from './saida-dialog/saida-dialog';
import { RetornoDialog } from './retorno-dialog/retorno-dialog';
import { AbrirOsDialog } from '../ordens-servico/abrir-os-dialog/abrir-os-dialog';
import { mensagemAberturaOS } from '../ordens-servico/mensagens';

// As ações do dia a dia de uma máquina (saída, retorno, abrir O.S.), usadas pela LISTA e pelo
// DETALHE: abre o diálogo, avisa o resultado e emite uma vez quando a ação deu certo.
// Quem chama só decide o que recarregar. Se o usuário cancela, nada é emitido.
@Service()
export class AcoesMaquina {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  registrarSaida(maquina: Maquina): Observable<void> {
    return this.dialog
      .open<SaidaDialog, Maquina, RespostaSaida>(SaidaDialog, { data: maquina, width: '440px' })
      .afterClosed()
      .pipe(
        filter(resposta => !!resposta), // undefined = cancelou
        tap(resposta => this.snackBar.open(resposta!.mensagem, 'OK', { duration: 4000 })),
        map(() => undefined),
      );
  }

  registrarRetorno(maquina: Maquina): Observable<void> {
    return this.dialog
      .open<RetornoDialog, Maquina, RespostaRetorno>(RetornoDialog, { data: maquina, width: '440px' })
      .afterClosed()
      .pipe(
        filter(resposta => !!resposta),
        tap(resposta => {
          // Fora do template não há pipe: toLocaleString formata no padrão brasileiro (11,5)
          const horas = resposta!.movimentacao.horasTrabalhadas?.toLocaleString('pt-BR');
          this.snackBar.open(`${resposta!.mensagem} Horas trabalhadas: ${horas} h`, 'OK', { duration: 5000 });
        }),
        map(() => undefined),
      );
  }

  // O mesmo diálogo da tela de O.S., com a máquina JÁ escolhida
  abrirOs(maquina: Maquina): Observable<void> {
    return this.dialog
      .open<AbrirOsDialog, Maquina, RespostaAberturaOS>(AbrirOsDialog, { data: maquina, width: '520px' })
      .afterClosed()
      .pipe(
        filter(resposta => !!resposta),
        tap(resposta => this.snackBar.open(mensagemAberturaOS(resposta!), 'OK', { duration: 6000 })),
        map(() => undefined),
      );
  }
}
