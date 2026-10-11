import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AbastecimentoService } from '../../../core/services/abastecimento.service';
import { Abastecimento, RespostaConferencia } from '../../../core/models/abastecimento';
import { NAO_VAZIO } from '../../../core/validacao';

// As duas decisões COM MOTIVO da conferência. O formulário é o mesmo; mudam os textos,
// as sugestões e a rota da API:
// - recusar: registro INDEVIDO, decisão final (no tanque, o diesel volta ao estoque)
// - devolver: ERRO DE PREENCHIMENTO; o mesmo abastecimento volta ao operador para corrigir
export type AcaoComMotivo = 'recusar' | 'devolver';

// O que a tela de conferência passa para o diálogo
export interface DadosRecusa {
  acao: AcaoComMotivo;
  abastecimento: Abastecimento;
  maquina: string; // "TR-01 · Trator"
}

interface Textos {
  titulo: (id: number) => string;
  rotulo: string;
  dica: string;
  botao: string;
  enviando: string;
  sugestoes: string[];
}

// Uma tabela de textos por ação (Record: o TypeScript cobra as duas)
const TEXTOS: Record<AcaoComMotivo, Textos> = {
  recusar: {
    titulo: id => `Recusar o abastecimento nº ${id}?`,
    rotulo: 'Motivo da recusa',
    dica: 'A recusa é final: o operador vê o motivo no app. Erro de digitação? Devolva para correção.',
    botao: 'Recusar abastecimento',
    enviando: 'Recusando...',
    sugestoes: [
      'Abastecimento registrado em duplicidade',
      'Máquina errada',
      'Origem errada (posto ou tanque)',
      'Abastecimento não autorizado',
    ],
  },
  devolver: {
    titulo: id => `Devolver o abastecimento nº ${id} para correção?`,
    rotulo: 'O que o operador deve corrigir',
    dica: 'O operador corrige no app, e o abastecimento volta para a conferência.',
    botao: 'Devolver para correção',
    enviando: 'Devolvendo...',
    sugestoes: [
      'Recibo ilegível: envie outra foto',
      'Valor pago não confere com o recibo',
      'Litros não conferem com o recibo',
      'Horímetro digitado errado',
    ],
  },
};

@Component({
  selector: 'app-recusa-dialog',
  imports: [
    CurrencyPipe, DecimalPipe, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
  ],
  templateUrl: './recusa-dialog.html',
  styleUrl: './recusa-dialog.scss',
})
export class RecusaDialog {
  private readonly abastecimentoService = inject(AbastecimentoService);
  private readonly dialogRef = inject<MatDialogRef<RecusaDialog, RespostaConferencia>>(MatDialogRef);

  protected readonly dados = inject<DadosRecusa>(MAT_DIALOG_DATA);
  protected readonly textos = TEXTOS[this.dados.acao];

  // O motivo vai para o operador, no app: obrigatório e não pode ser só espaços (a regra da API)
  protected readonly form = inject(FormBuilder).nonNullable.group({
    motivo: ['', [Validators.required, Validators.pattern(NAO_VAZIO), Validators.maxLength(200)]],
  });

  protected readonly salvando = signal(false);

  protected usarSugestao(texto: string): void {
    this.form.controls.motivo.setValue(texto);
    this.form.controls.motivo.markAsTouched();
  }

  protected confirmar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { id } = this.dados.abastecimento;
    const motivo = this.form.getRawValue().motivo.trim();
    const pedido =
      this.dados.acao === 'recusar'
        ? this.abastecimentoService.recusar(id, motivo)
        : this.abastecimentoService.devolver(id, motivo);

    this.salvando.set(true);
    pedido.pipe(finalize(() => this.salvando.set(false))).subscribe({
      next: resposta => this.dialogRef.close(resposta),
      // Erro (ex.: 409, outro gestor já conferiu): o interceptor mostra a mensagem; o diálogo continua aberto
      error: () => {},
    });
  }
}
