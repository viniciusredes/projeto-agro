import { Component, computed, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MaquinaService } from '../../../core/services/maquina.service';
import { OrdemServicoService } from '../../../core/services/ordem-servico.service';
import { Maquina } from '../../../core/models/maquina';
import { RespostaAberturaOS, TIPOS_OS, TipoOS } from '../../../core/models/ordem-servico';
import { NAO_VAZIO } from '../../../core/validacao';

@Component({
  selector: 'app-abrir-os-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonToggleModule,
    MatButtonModule, MatIconModule,
  ],
  templateUrl: './abrir-os-dialog.html',
  styleUrl: './abrir-os-dialog.scss',
})
export class AbrirOsDialog {
  private readonly maquinaService = inject(MaquinaService);
  private readonly osService = inject(OrdemServicoService);
  private readonly dialogRef = inject<MatDialogRef<AbrirOsDialog, RespostaAberturaOS>>(MatDialogRef);

  // Dado OPCIONAL: aberto pela tela Máquinas, já vem com a máquina escolhida;
  // aberto pela tela de O.S., vem vazio e o usuário escolhe no select
  private readonly maquinaInicial = inject<Maquina | null>(MAT_DIALOG_DATA, { optional: true });

  protected readonly tipos = TIPOS_OS;

  // Máquinas para o select (carregadas uma vez, ao abrir o diálogo)
  protected readonly maquinas = rxResource({
    stream: () => this.maquinaService.listar(),
  });

  protected readonly form = inject(FormBuilder).nonNullable.group({
    maquinaId: [this.maquinaInicial?.id ?? (null as number | null), Validators.required],
    tipo: ['Corretiva' as TipoOS, Validators.required],
    descricao: ['', [Validators.required, Validators.pattern(NAO_VAZIO)]],
    horimetro: [this.maquinaInicial?.horimetro ?? 0, Validators.required],
  });

  // O id escolhido no select, como signal (para alimentar o computed abaixo)
  private readonly maquinaIdEscolhida = toSignal(this.form.controls.maquinaId.valueChanges, {
    initialValue: this.form.controls.maquinaId.value,
  });

  // A máquina escolhida (objeto completo): usada no aviso "em campo" e no horímetro mínimo
  protected readonly maquinaSelecionada = computed(() => {
    const id = this.maquinaIdEscolhida();
    const lista = this.maquinas.hasValue() ? this.maquinas.value() : [];
    return lista.find(maquina => maquina.id === id) ?? null;
  });

  protected readonly salvando = signal(false);

  constructor() {
    // Validador dinâmico (mesmo padrão do Passo 10): o horímetro mínimo depende da máquina.
    // Ao trocar a máquina, o campo recebe o horímetro atual dela e o novo "min".
    this.form.controls.maquinaId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(id => {
        const maquina = this.maquinas.hasValue() ? this.maquinas.value().find(m => m.id === id) : undefined;
        if (maquina) {
          this.aplicarHorimetroMinimo(maquina.horimetro);
        }
      });

    // Máquina já escolhida ao abrir (vinda da tela Máquinas): aplica a regra desde o início
    if (this.maquinaInicial) {
      this.aplicarHorimetroMinimo(this.maquinaInicial.horimetro);
    }
  }

  // Uma máquina já em manutenção não pode receber outra O.S. (a API responderia 409)
  protected emManutencao(maquina: Maquina): boolean {
    return maquina.status === 'Em Manutenção';
  }

  protected confirmar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { maquinaId, tipo, descricao, horimetro } = this.form.getRawValue();
    if (maquinaId === null) {
      return; // não acontece com o formulário válido, mas deixa o TypeScript seguro do tipo
    }

    this.salvando.set(true);

    this.osService
      .abrir({ maquinaId, tipo, descricao, horimetro })
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: resposta => this.dialogRef.close(resposta),
        // Erro (ex.: 409 máquina já em manutenção): o interceptor já mostrou a mensagem
        error: () => {},
      });
  }

  private aplicarHorimetroMinimo(minimo: number): void {
    const horimetro = this.form.controls.horimetro;
    horimetro.setValidators([Validators.required, Validators.min(minimo)]);
    horimetro.setValue(minimo); // começa preenchido com o horímetro atual da máquina
    horimetro.updateValueAndValidity();
  }
}
