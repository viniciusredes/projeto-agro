import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { filter, finalize, startWith, switchMap } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MaquinaService } from '../../../core/services/maquina.service';
import { OrdemServicoService } from '../../../core/services/ordem-servico.service';
import { LimitesHorimetro, Maquina } from '../../../core/models/maquina';
import { RespostaAberturaOS, TIPOS_OS, TipoOS } from '../../../core/models/ordem-servico';
import { NAO_VAZIO } from '../../../core/validacao';
import { validadoresDoHorimetro } from '../../../core/horimetro';
import { AtalhosHorimetro } from '../../../shared/atalhos-horimetro/atalhos-horimetro';

@Component({
  selector: 'app-abrir-os-dialog',
  imports: [
    DecimalPipe, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonToggleModule,
    MatButtonModule, MatIconModule, AtalhosHorimetro,
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
    horimetro: [null as number | null, Validators.required],
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

  // A faixa válida do horímetro da máquina escolhida (a mesma que a API aplica, Etapa 5)
  protected readonly limites = signal<LimitesHorimetro | null>(null);

  constructor() {
    // Validador dinâmico (mesmo padrão do Passo 10): a faixa do horímetro depende da máquina.
    // startWith: a máquina já escolhida ao abrir (vinda da tela Máquinas) também busca os limites.
    // switchMap: trocou de máquina antes da resposta? A busca anterior é cancelada.
    this.form.controls.maquinaId.valueChanges
      .pipe(
        startWith(this.form.controls.maquinaId.value),
        filter((id): id is number => id !== null),
        switchMap(id => this.maquinaService.limitesDoHorimetro(id)),
        takeUntilDestroyed(),
      )
      .subscribe(limites => this.aplicarLimites(limites));
  }

  // Botão rápido (+4 h...): preenche o campo como se o usuário tivesse digitado
  protected escolherHorimetro(valor: number): void {
    this.form.controls.horimetro.setValue(valor);
    this.form.controls.horimetro.markAsTouched();
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
    if (maquinaId === null || horimetro === null) {
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

  private aplicarLimites(limites: LimitesHorimetro): void {
    this.limites.set(limites);
    const horimetro = this.form.controls.horimetro;
    horimetro.setValidators(validadoresDoHorimetro(limites));
    horimetro.setValue(null); // começa VAZIO: a leitura vem do painel da máquina, não do sistema
    horimetro.updateValueAndValidity();
  }
}
