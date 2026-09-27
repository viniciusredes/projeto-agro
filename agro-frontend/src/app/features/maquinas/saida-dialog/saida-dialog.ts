import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MaquinaService } from '../../../core/services/maquina.service';
import { Maquina, RespostaSaida } from '../../../core/models/maquina';
import { NAO_VAZIO } from '../../../core/validacao';                  

@Component({
  selector: 'app-saida-dialog',
  imports: [
    DecimalPipe, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule,
  ],
  templateUrl: './saida-dialog.html',
  styleUrl: './saida-dialog.scss',
})
export class SaidaDialog {
  private readonly maquinaService = inject(MaquinaService);
  private readonly dialogRef = inject<MatDialogRef<SaidaDialog, RespostaSaida>>(MatDialogRef);

  // A máquina escolhida na lista chega por aqui (o "data" do dialog.open)
  protected readonly maquina = inject<Maquina>(MAT_DIALOG_DATA);

  // Formulário reativo: cada campo com seu valor inicial e suas validações
  protected readonly form = inject(FormBuilder).nonNullable.group({
    operador: ['', [Validators.required, Validators.pattern(NAO_VAZIO)]],
    frenteTrabalho: ['', [Validators.required, Validators.pattern(NAO_VAZIO)]],
  });

  protected readonly salvando = signal(false);

  protected confirmar(): void {
    // Formulário inválido: mostra as mensagens de todos os campos e não envia
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando.set(true);

    this.maquinaService
      .registrarSaida(this.maquina.id, this.form.getRawValue())
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        // Sucesso: fecha o diálogo devolvendo a resposta para quem o abriu
        next: resposta => this.dialogRef.close(resposta),
        // Erro: a mensagem já foi exibida pelo interceptor; o diálogo só continua aberto
        error: () => {},
      });
  }
}
