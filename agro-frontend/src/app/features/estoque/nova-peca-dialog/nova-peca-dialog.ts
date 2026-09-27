import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { PecaService } from '../../../core/services/peca.service';
import { Peca, UNIDADES_MEDIDA, UnidadeMedida } from '../../../core/models/peca';
import { NAO_VAZIO, inteiro } from '../../../core/validacao';

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
    estoqueMinimo: [0], // regras aplicadas em aplicarRegrasDoMinimo(): dependem da unidade
  });

  protected readonly salvando = signal(false);

  constructor() {
    const unidade = this.form.controls.unidade;

    // Validador CONDICIONAL DINÂMICO: a unidade pode mudar enquanto o diálogo está aberto,
    // então as regras do estoque mínimo são refeitas a cada troca do select.
    // takeUntilDestroyed() encerra a inscrição quando o diálogo fecha (evita vazamento de memória).
    this.aplicarRegrasDoMinimo(unidade.value);
    unidade.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(novaUnidade => this.aplicarRegrasDoMinimo(novaUnidade));
  }

  // Peça contada em unidades: o estoque mínimo também precisa ser inteiro (mesma regra da API)
  private aplicarRegrasDoMinimo(unidade: UnidadeMedida): void {
    const estoqueMinimo = this.form.controls.estoqueMinimo;
    estoqueMinimo.setValidators([
      Validators.required,
      Validators.min(0),
      ...(unidade === 'un' ? [inteiro()] : []),
    ]);
    // setValidators só troca as regras; é preciso revalidar o valor que já está no campo
    estoqueMinimo.updateValueAndValidity();
  }

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
