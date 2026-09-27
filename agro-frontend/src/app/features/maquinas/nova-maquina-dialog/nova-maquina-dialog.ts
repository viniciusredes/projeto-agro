import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MaquinaService } from '../../../core/services/maquina.service';
import { Maquina } from '../../../core/models/maquina';
import { NAO_VAZIO } from '../../../core/validacao';

@Component({
  selector: 'app-nova-maquina-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './nova-maquina-dialog.html',
  styleUrl: './nova-maquina-dialog.scss',
})
export class NovaMaquinaDialog {
  private readonly maquinaService = inject(MaquinaService);
  private readonly dialogRef = inject<MatDialogRef<NovaMaquinaDialog, Maquina>>(MatDialogRef);

  // Diferente dos outros diálogos, este não recebe dados: ele CRIA uma máquina
  protected readonly form = inject(FormBuilder).nonNullable.group({
    tag: ['', [Validators.required, Validators.pattern(NAO_VAZIO)]],
    modelo: ['', [Validators.required, Validators.pattern(NAO_VAZIO)]],
    horimetro: [0, [Validators.required, Validators.min(0)]], // máquina nova ou usada (com horas)
  });

  protected readonly salvando = signal(false);

  protected confirmar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando.set(true);

    this.maquinaService
      .cadastrar(this.form.getRawValue())
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        // Sucesso: devolve a máquina criada (com id e tag já normalizada pela API)
        next: maquina => this.dialogRef.close(maquina),
        // Erro (ex.: 409 tag repetida): o interceptor já mostrou a mensagem; o diálogo continua aberto
        error: () => {},
      });
  }
}
