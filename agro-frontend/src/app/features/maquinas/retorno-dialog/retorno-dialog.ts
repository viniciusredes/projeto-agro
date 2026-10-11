import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MaquinaService } from '../../../core/services/maquina.service';
import { LimitesHorimetro, Maquina, RespostaRetorno } from '../../../core/models/maquina';
import { validadoresDoHorimetro } from '../../../core/horimetro';
import { AtalhosHorimetro } from '../../../shared/atalhos-horimetro/atalhos-horimetro';

@Component({
  selector: 'app-retorno-dialog',
  imports: [
    DecimalPipe, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, AtalhosHorimetro,
  ],
  templateUrl: './retorno-dialog.html',
  styleUrl: './retorno-dialog.scss',
})
export class RetornoDialog {
  private readonly maquinaService = inject(MaquinaService);
  private readonly dialogRef = inject<MatDialogRef<RetornoDialog, RespostaRetorno>>(MatDialogRef);

  protected readonly maquina = inject<Maquina>(MAT_DIALOG_DATA);

  // O horímetro começa VAZIO (Etapa 5): preenchido com o mínimo, era fácil confirmar sem olhar
  // o painel da máquina. Até os limites chegarem da API, vale o mínimo da saída.
  protected readonly form = inject(FormBuilder).nonNullable.group({
    horimetro: [null as number | null, [Validators.required, Validators.min(this.maquina.horimetro)]],
    avarias: [''], // opcional: sem validadores
  });

  // A faixa válida (mínimo, máximo e de onde vem o mínimo), a mesma que a API aplica
  protected readonly limites = signal<LimitesHorimetro | null>(null);

  constructor() {
    this.maquinaService
      .limitesDoHorimetro(this.maquina.id)
      .pipe(takeUntilDestroyed())
      .subscribe(limites => {
        this.limites.set(limites);
        const campo = this.form.controls.horimetro;
        campo.setValidators(validadoresDoHorimetro(limites));
        campo.updateValueAndValidity();
      });
  }

  // Botão rápido (+4 h...): preenche o campo como se o usuário tivesse digitado
  protected escolherHorimetro(valor: number): void {
    this.form.controls.horimetro.setValue(valor);
    this.form.controls.horimetro.markAsTouched();
  }

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
    if (horimetro === null) {
      return; // não acontece com o formulário válido, mas deixa o TypeScript seguro do tipo
    }

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
