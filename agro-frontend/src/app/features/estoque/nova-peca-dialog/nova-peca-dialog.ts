import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { PecaService } from '../../../core/services/peca.service';
import { Peca, UNIDADES_MEDIDA, UnidadeMedida } from '../../../core/models/peca';
import { NAO_VAZIO } from '../../../core/validacao';

@Component({
  selector: 'app-nova-peca-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
  ],
  templateUrl: './nova-peca-dialog.html',
  styleUrl: './nova-peca-dialog.scss',
})
export class NovaPecaDialog {
  private readonly pecaService = inject(PecaService);
  private readonly dialogRef = inject<MatDialogRef<NovaPecaDialog, Peca>>(MatDialogRef);

  // Opções do select de unidade (vêm do modelo, não ficam "soltas" no template)
  protected readonly unidades = UNIDADES_MEDIDA;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(NAO_VAZIO)]],
    descricao: ['', [Validators.required, Validators.pattern(NAO_VAZIO)]],
    unidade: ['un' as UnidadeMedida, Validators.required],
    estoqueMinimo: [0, [Validators.required, Validators.min(0)]],
  });

  protected readonly salvando = signal(false);

  protected confirmar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando.set(true);

    this.pecaService
      .cadastrar(this.form.getRawValue())
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: peca => this.dialogRef.close(peca),
        // Erro (ex.: 409 código repetido): o interceptor já mostrou a mensagem
        error: () => {},
      });
  }
}
