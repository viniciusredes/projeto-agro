import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MaquinaService } from '../../../core/services/maquina.service';
import { Maquina, RespostaRetorno } from '../../../core/models/maquina';

@Component({
  selector: 'app-retorno-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule,
  ],
  templateUrl: './retorno-dialog.html',
  styleUrl: './retorno-dialog.scss',
})
export class RetornoDialog {
  private readonly maquinaService = inject(MaquinaService);
  private readonly dialogRef = inject<MatDialogRef<RetornoDialog, RespostaRetorno>>(MatDialogRef);

  protected readonly maquina = inject<Maquina>(MAT_DIALOG_DATA);

  // O horímetro começa preenchido com o valor atual; o mínimo aceito é esse mesmo valor
  protected readonly form = inject(FormBuilder).nonNullable.group({
    horimetro: [this.maquina.horimetro, [Validators.required, Validators.min(this.maquina.horimetro)]],
    avarias: [''], // opcional: sem validadores
  });

  // Converte as mudanças do campo (Observable) num signal...
  private readonly horimetroDigitado = toSignal(this.form.controls.horimetro.valueChanges, {
    initialValue: this.form.controls.horimetro.value,
  });

  // ...para calcular as horas trabalhadas enquanto o usuário digita
  protected readonly horasPrevistas = computed(() => {
    const valor = this.horimetroDigitado();
    if (typeof valor !== 'number' || valor < this.maquina.horimetro) {
      return null; // campo vazio ou menor que o atual: não há o que mostrar
    }
    return Math.round((valor - this.maquina.horimetro) * 10) / 10;
  });

  protected readonly salvando = signal(false);

  protected confirmar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { horimetro, avarias } = this.form.getRawValue();

    this.salvando.set(true);

    this.maquinaService
      .registrarRetorno(this.maquina.id, {
        horimetro,
        // Campo opcional: só envia se houver texto (undefined some do JSON)
        avarias: avarias.trim() || undefined,
      })
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: resposta => this.dialogRef.close(resposta),
        // Erro: a mensagem já foi exibida pelo interceptor; o diálogo só continua aberto
        error: () => {},
      });
  }
}
