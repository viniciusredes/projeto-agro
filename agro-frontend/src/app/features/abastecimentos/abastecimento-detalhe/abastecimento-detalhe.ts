import { Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { filter, finalize } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AbastecimentoService } from '../../../core/services/abastecimento.service';
import { RespostaConferencia } from '../../../core/models/abastecimento';
import { etiquetaOrigemAbastecimento, etiquetaStatusAbastecimento } from '../../../core/ui/tons';
import { ConfirmacaoDialog, DadosConfirmacao } from '../../../shared/confirmacao-dialog/confirmacao-dialog';
import { AcaoComMotivo, DadosRecusa, RecusaDialog } from '../recusa-dialog/recusa-dialog';

// Conferência de um abastecimento (/abastecimentos/1): o recibo, os dados e a decisão do gestor
@Component({
  selector: 'app-abastecimento-detalhe',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './abastecimento-detalhe.html',
  styleUrl: './abastecimento-detalhe.scss',
})
export class AbastecimentoDetalhe {
  private readonly abastecimentoService = inject(AbastecimentoService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  // /abastecimentos/:id -> o :id chega como input (withComponentInputBinding), já convertido em número
  readonly id = input.required({ transform: numberAttribute });

  protected readonly abastecimento = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.abastecimentoService.buscar(params),
  });

  // Os abastecimentos da MESMA máquina: dão o contexto para conferir (o anterior a este)
  protected readonly daMaquina = rxResource({
    params: () => (this.abastecimento.hasValue() ? this.abastecimento.value().maquinaId : undefined),
    stream: ({ params }) => this.abastecimentoService.listar({ maquinaId: params }),
  });

  // Os pendentes de todas as máquinas: para oferecer "o próximo a conferir" depois da decisão
  protected readonly pendentes = rxResource({
    stream: () => this.abastecimentoService.listar({ status: 'Pendente' }),
  });

  // O abastecimento anterior desta máquina (não recusado), pelo horímetro
  protected readonly anterior = computed(() => {
    if (!this.abastecimento.hasValue() || !this.daMaquina.hasValue()) {
      return null;
    }
    const atual = this.abastecimento.value();
    const candidatos = this.daMaquina
      .value()
      .filter(ab => ab.id !== atual.id && ab.status !== 'Recusado' && ab.horimetro < atual.horimetro)
      .sort((a, b) => b.horimetro - a.horimetro);
    return candidatos[0] ?? null;
  });

  // Horas desde o anterior e o consumo que ESTE abastecimento sugere (litros de agora / horas trabalhadas).
  // Um número fora do normal (ex.: 90 L/h num trator) é sinal de litros ou horímetro errados.
  protected readonly comparacao = computed(() => {
    const anterior = this.anterior();
    if (!anterior || !this.abastecimento.hasValue()) {
      return null;
    }
    const atual = this.abastecimento.value();
    const horas = atual.horimetro - anterior.horimetro;
    return { horas, consumo: horas > 0 ? atual.litros / horas : null };
  });

  protected readonly proximoPendente = computed(() => {
    const lista = this.pendentes.hasValue() ? this.pendentes.value() : [];
    return lista.filter(ab => ab.id !== this.id()).sort((a, b) => a.id - b.id)[0] ?? null;
  });

  protected readonly decidindo = signal(false);

  protected readonly etiquetaStatus = etiquetaStatusAbastecimento;
  protected readonly etiquetaOrigem = etiquetaOrigemAbastecimento;

  protected comprovante(): string | null {
    return this.abastecimento.hasValue() ? this.abastecimentoService.enderecoDoComprovante(this.abastecimento.value()) : null;
  }

  // Aprovar: decisão final. Antes, a confirmação diz o que muda
  protected aprovar(): void {
    if (!this.abastecimento.hasValue()) {
      return;
    }
    const ab = this.abastecimento.value();
    const dados: DadosConfirmacao = {
      titulo: `Aprovar o abastecimento nº ${ab.id}?`,
      mensagem: `Ele passa a contar no custo e no consumo de combustível da ${ab.maquina?.tag ?? 'máquina'}.`,
      detalhes: [
        `${ab.litros.toLocaleString('pt-BR')} L · ${ab.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
        `${ab.origem === 'Tanque' ? 'Tanque da fazenda' : ab.posto} · registrado por ${ab.operador}`,
      ],
      confirmar: 'Aprovar',
      irreversivel: true,
    };
    this.dialog
      .open<ConfirmacaoDialog, DadosConfirmacao, boolean>(ConfirmacaoDialog, { data: dados, width: '480px' })
      .afterClosed()
      .pipe(filter(confirmou => confirmou === true)) // cancelar, Esc ou clique fora: nada acontece
      .subscribe(() => {
        this.decidindo.set(true);
        this.abastecimentoService
          .aprovar(ab.id)
          .pipe(finalize(() => this.decidindo.set(false)))
          .subscribe({ next: resposta => this.aposDecidir(resposta), error: () => {} });
      });
  }

  // Recusar ou devolver para correção: o MESMO diálogo pede o motivo e faz a chamada certa;
  // aqui só tratamos o resultado
  protected decidirComMotivo(acao: AcaoComMotivo): void {
    if (!this.abastecimento.hasValue()) {
      return;
    }
    const ab = this.abastecimento.value();
    const maquina = ab.maquina ? `${ab.maquina.tag} · ${ab.maquina.modelo}` : `Máquina #${ab.maquinaId}`;
    this.dialog
      .open<RecusaDialog, DadosRecusa, RespostaConferencia>(RecusaDialog, {
        data: { acao, abastecimento: ab, maquina },
        width: '520px',
      })
      .afterClosed()
      .subscribe(resposta => {
        if (resposta) {
          this.aposDecidir(resposta);
        }
      });
  }

  // Depois da decisão: a mensagem da API, e tudo é buscado de novo (status, contexto, pendentes)
  private aposDecidir(resposta: RespostaConferencia): void {
    this.snackBar.open(resposta.mensagem, 'OK', { duration: 6000 });
    this.abastecimento.reload();
    this.daMaquina.reload();
    this.pendentes.reload();
  }
}
