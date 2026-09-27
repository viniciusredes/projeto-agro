import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { PecaService } from '../../../core/services/peca.service';
import { Peca, RespostaEntrada } from '../../../core/models/peca';
import { inteiro } from '../../../core/validacao';

@Component({
  selector: 'app-entrada-dialog',
  imports: [
    CurrencyPipe, DecimalPipe, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule,
  ],
  templateUrl: './entrada-dialog.html',
  styleUrl: './entrada-dialog.scss',
})
export class EntradaDialog {
  private readonly pecaService = inject(PecaService);
  private readonly dialogRef = inject<MatDialogRef<EntradaDialog, RespostaEntrada>>(MatDialogRef);

  protected readonly peca = inject<Peca>(MAT_DIALOG_DATA);

  // Peça contada em unidades não aceita fração (a API também recusa, com 400)
  protected readonly exigeInteiro = this.peca.unidade === 'un';

  // Validador CONDICIONAL ESTÁTICO: a lista de regras é montada uma vez, a partir do dado recebido.
  // A unidade da peça não muda dentro do diálogo, então não é preciso trocar os validadores depois.
  // min(0.01): "maior que zero" (a API arredonda saldo e custo para 2 casas decimais)
  protected readonly form = inject(FormBuilder).nonNullable.group({
    quantidade: [1, [
      Validators.required,
      Validators.min(0.01),
      ...(this.exigeInteiro ? [inteiro()] : []),
    ]],
    // Começa com o custo atual: numa compra repetida, o usuário só confere o valor
    custoUnitario: [this.peca.custoUnitario, [Validators.required, Validators.min(0.01)]],
  });

  // Converte as mudanças do formulário (Observable) num signal...
  private readonly valores = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  // ...para calcular a prévia da compra enquanto o usuário digita
  protected readonly previa = computed(() => {
    const { quantidade, custoUnitario } = this.valores();
    if (typeof quantidade !== 'number' || typeof custoUnitario !== 'number'
      || quantidade <= 0 || custoUnitario <= 0
      || (this.exigeInteiro && !Number.isInteger(quantidade))) {
      return null; // valores inválidos: não há prévia para mostrar
    }
    // Mesma conta da API: o custo é arredondado para centavos antes de calcular o total
    const custo = this.arredondar(custoUnitario);
    return {
      saldoApos: this.arredondar(this.peca.saldo + quantidade),
      valorTotal: this.arredondar(quantidade * custo),
    };
  });

  protected readonly salvando = signal(false);

  private arredondar(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  protected confirmar(): void {
    // Formulário inválido (ex.: 1,5 un): nada é enviado à API
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando.set(true);

    this.pecaService
      .registrarEntrada(this.peca.id, this.form.getRawValue())
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: resposta => this.dialogRef.close(resposta),
        // Erro: o interceptor já mostrou a mensagem; o diálogo só continua aberto
        error: () => {},
      });
  }
}
