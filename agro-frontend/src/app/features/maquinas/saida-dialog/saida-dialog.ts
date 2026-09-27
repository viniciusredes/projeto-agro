import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MaquinaService } from '../../../core/services/maquina.service';
import { mensagemDeErro } from '../../../core/api';
import { Maquina, RespostaSaida } from '../../../core/models/maquina';

// "Tem pelo menos um caractere que não é espaço" (o back-end recusa texto só com espaços)
const NAO_VAZIO = /\S/;

@Component({
  selector: 'app-saida-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
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
  protected readonly erro = signal<string | null>(null);

  protected confirmar(): void {
    // Formulário inválido: mostra as mensagens de todos os campos e não envia
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);

    this.maquinaService
      .registrarSaida(this.maquina.id, this.form.getRawValue())
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        // Sucesso: fecha o diálogo devolvendo a resposta para quem o abriu
        next: resposta => this.dialogRef.close(resposta),
        // Erro: o diálogo continua aberto e mostra a mensagem da API
        error: erro => this.erro.set(mensagemDeErro(erro)),
      });
  }
}
