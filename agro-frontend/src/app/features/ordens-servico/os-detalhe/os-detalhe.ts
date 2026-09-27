import { Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors,
  ValidatorFn, Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrdemServicoService } from '../../../core/services/ordem-servico.service';
import { PecaService } from '../../../core/services/peca.service';
import { Peca } from '../../../core/models/peca';
import { PecaUsada } from '../../../core/models/ordem-servico';

// Uma linha do fechamento: qual peça e quanto foi usado
type LinhaPeca = FormGroup<{
  pecaId: FormControl<number | null>;
  quantidade: FormControl<number | null>;
}>;

// Validador da LISTA (FormArray): a mesma peça não pode aparecer em duas linhas
// (a API também recusa com 400; aqui o usuário é avisado antes de enviar)
const pecasSemRepeticao: ValidatorFn = (lista: AbstractControl): ValidationErrors | null => {
  const ids = (lista as FormArray<LinhaPeca>).controls
    .map(linha => linha.controls.pecaId.value)
    .filter((id): id is number => id !== null);
  return new Set(ids).size !== ids.length ? { pecaRepetida: true } : null;
};

@Component({
  selector: 'app-os-detalhe',
  imports: [
    CurrencyPipe, DatePipe, DecimalPipe, RouterLink, ReactiveFormsModule,
    MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatProgressBarModule,
  ],
  templateUrl: './os-detalhe.html',
  styleUrl: './os-detalhe.scss',
})
export class OsDetalhe {
  private readonly osService = inject(OrdemServicoService);
  private readonly pecaService = inject(PecaService);
  private readonly snackBar = inject(MatSnackBar);

  // /ordens-servico/:id -> o :id chega como input (withComponentInputBinding), já convertido em número
  readonly id = input.required({ transform: numberAttribute });

  // A O.S. é buscada de novo sempre que o id da rota mudar
  protected readonly os = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.osService.buscar(params),
  });

  // Peças do estoque: opções das linhas e saldo disponível de cada uma
  protected readonly pecas = rxResource({
    stream: () => this.pecaService.listar(),
  });

  private readonly pecaPorId = computed(
    () => new Map((this.pecas.hasValue() ? this.pecas.value() : []).map(peca => [peca.id, peca])),
  );

  // ===== Formulário de fechamento: uma LISTA de linhas (FormArray) =====
  protected readonly linhas = new FormArray<LinhaPeca>([], pecasSemRepeticao);

  // Valores das linhas como signal, para os cálculos ao vivo
  private readonly valoresLinhas = toSignal(this.linhas.valueChanges, { initialValue: [] });

  // Custo estimado = soma de quantidade x custo atual de cada peça.
  // Estimado porque o custo "de verdade" é congelado pela API no momento do fechamento.
  protected readonly custoEstimado = computed(() =>
    this.valoresLinhas().reduce((soma, linha) => {
      const peca = linha.pecaId != null ? this.pecaPorId().get(linha.pecaId) : undefined;
      return peca && linha.quantidade ? soma + linha.quantidade * peca.custoUnitario : soma;
    }, 0),
  );

  protected readonly fechando = signal(false);

  protected adicionarLinha(): void {
    const linha: LinhaPeca = new FormGroup(
      {
        pecaId: new FormControl<number | null>(null, Validators.required),
        quantidade: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
      },
      { validators: this.quantidadeCompativelComUnidade },
    );
    this.linhas.push(linha);
  }

  protected removerLinha(indice: number): void {
    this.linhas.removeAt(indice);
  }

  // Validador da LINHA: peça contada em "un" só aceita quantidade inteira.
  // É uma arrow function para enxergar o "this" (o mapa de peças carregado da API).
  private readonly quantidadeCompativelComUnidade: ValidatorFn = (grupo: AbstractControl) => {
    const { pecaId, quantidade } = (grupo as LinhaPeca).getRawValue();
    const peca = pecaId !== null ? this.pecaPorId().get(pecaId) : undefined;
    if (peca?.unidade === 'un' && quantidade !== null && !Number.isInteger(quantidade)) {
      return { inteiro: true };
    }
    return null;
  };

  // Usado no template: a peça escolhida numa linha (para mostrar unidade e saldo)
  protected pecaDaLinha(indice: number): Peca | undefined {
    const pecaId = this.linhas.at(indice).controls.pecaId.value;
    return pecaId !== null ? this.pecaPorId().get(pecaId) : undefined;
  }

  // Aviso visual (não bloqueia): a API é quem decide e recusa o fechamento inteiro com 409
  protected acimaDoSaldo(indice: number): boolean {
    const peca = this.pecaDaLinha(indice);
    const quantidade = this.linhas.at(indice).controls.quantidade.value;
    return !!peca && quantidade !== null && quantidade > peca.saldo;
  }

  protected descricaoDaPeca(pecaId: number): string {
    return this.pecaPorId().get(pecaId)?.descricao ?? '';
  }

  protected fechar(): void {
    if (this.linhas.invalid) {
      this.linhas.markAllAsTouched();
      return;
    }

    // Com o formulário válido, pecaId e quantidade nunca são null; o filtro deixa o tipo seguro
    const pecas: PecaUsada[] = this.linhas.getRawValue().flatMap(({ pecaId, quantidade }) =>
      pecaId !== null && quantidade !== null ? [{ pecaId, quantidade }] : [],
    );

    this.fechando.set(true);

    this.osService
      .fechar(this.id(), { pecas })
      .pipe(finalize(() => this.fechando.set(false)))
      .subscribe({
        next: resposta => {
          const total = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
            .format(resposta.ordemServico.custoTotal);
          this.snackBar.open(`O.S. nº ${resposta.ordemServico.id} fechada. Custo total: ${total}.`, 'OK', {
            duration: 6000,
          });
          this.linhas.clear();
          this.os.reload();    // a O.S. agora está fechada e tem itens
          this.pecas.reload(); // os saldos das peças foram baixados
        },
        // Erro (ex.: 409 estoque insuficiente): o interceptor mostra a mensagem da API e
        // NADA foi baixado (tudo ou nada). O formulário continua preenchido para correção.
        error: () => {},
      });
  }
}
