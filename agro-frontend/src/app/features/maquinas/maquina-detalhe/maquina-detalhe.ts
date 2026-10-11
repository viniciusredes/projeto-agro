import { Component, computed, inject, input, numberAttribute } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaquinaService } from '../../../core/services/maquina.service';
import { OrdemServicoService } from '../../../core/services/ordem-servico.service';
import { TIPOS_OS, TipoOS } from '../../../core/models/ordem-servico';
import { Maquina } from '../../../core/models/maquina';
import { AcoesMaquina } from '../acoes-maquina';
import { AbastecimentoService } from '../../../core/services/abastecimento.service';
import {
  etiquetaStatusAbastecimento, etiquetaStatusMaquina, etiquetaTipoOS, rotuloStatusAbastecimento,
} from '../../../core/ui/tons';
import { resumoSemZeros } from '../../../core/ui/textos';
import { conteudoDoQrDaMaquina } from '../../../core/qr';
import { renderSVG } from 'uqr';

// Um pedaço da barra "custo por tipo": qual tipo, quanto custou e quanto representa do total
interface SegmentoCusto {
  tipo: TipoOS;
  valor: number;
  percentual: number;
}

@Component({
  selector: 'app-maquina-detalhe',
  imports: [
    CurrencyPipe, DatePipe, DecimalPipe, RouterLink,
    MatTableModule, MatButtonModule, MatIconModule, MatProgressBarModule,
  ],
  templateUrl: './maquina-detalhe.html',
  styleUrl: './maquina-detalhe.scss',
})
export class MaquinaDetalhe {
  private readonly maquinaService = inject(MaquinaService);
  private readonly osService = inject(OrdemServicoService);
  private readonly snackBar = inject(MatSnackBar);

  // /maquinas/:id -> o :id chega como input já convertido em número
  readonly id = input.required({ transform: numberAttribute });

  // Indicadores calculados pela API (Parte OS7 do back-end): total, abertas, fechadas, custos
  protected readonly resumo = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.osService.manutencoesDaMaquina(params),
  });

  // A API de manutenções devolve só a tag; modelo e horímetro vêm da lista de máquinas
  private readonly maquinas = rxResource({
    stream: () => this.maquinaService.listar(),
  });

  protected readonly maquina = computed(() =>
    this.maquinas.hasValue() ? this.maquinas.value().find(m => m.id === this.id()) : undefined,
  );

  // ===== Ações (as mesmas da lista): o gestor resolve a máquina daqui, sem voltar à lista =====
  private readonly acoes = inject(AcoesMaquina);

  // A O.S. aberta, para o "Ver O.S." quando a máquina está na oficina
  protected readonly osAberta = computed(() => this.ordens().find(os => os.status === 'Aberta') ?? null);

  protected registrarSaida(maquina: Maquina): void {
    this.acoes.registrarSaida(maquina).subscribe(() => this.carregar());
  }

  protected registrarRetorno(maquina: Maquina): void {
    this.acoes.registrarRetorno(maquina).subscribe(() => this.carregar());
  }

  protected abrirOs(maquina: Maquina): void {
    this.acoes.abrirOs(maquina).subscribe(() => this.carregar());
  }

  // Depois de uma ação mudam o status, o horímetro, as O.S. e o histórico
  private carregar(): void {
    this.maquinas.reload();
    this.resumo.reload();
    this.combustivel.reload();
    this.movimentacoes.reload();
  }

  // ===== Saídas e retornos da máquina (antes só na tela de Movimentações) =====
  protected readonly movimentacoes = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.maquinaService.listarMovimentacoes(params),
  });

  // As mais recentes primeiro; a tela mostra as 5 últimas
  protected readonly ultimasMovimentacoes = computed(() =>
    this.movimentacoes.hasValue() ? [...this.movimentacoes.value()].sort((a, b) => b.id - a.id).slice(0, 5) : [],
  );

  // ===== Combustível (Etapa 4): consumo, custo e abastecimentos, calculados pela API =====
  private readonly abastecimentoService = inject(AbastecimentoService);
  protected readonly combustivel = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.abastecimentoService.combustivelDaMaquina(params),
  });

  // Os abastecimentos que valem (sem os recusados), do mais recente para o mais antigo
  protected readonly abastecimentosRecentes = computed(() =>
    this.combustivel.hasValue()
      ? [...this.combustivel.value().abastecimentos].filter(ab => ab.status !== 'Recusado').sort((a, b) => b.id - a.id)
      : [],
  );

  protected readonly ultimoAbastecimento = computed(() => this.abastecimentosRecentes()[0] ?? null);

  // Quanto a máquina trabalhou desde o último abastecimento (horímetro atual - o do abastecimento).
  // O horímetro da máquina só muda na saída e no retorno: se ela abasteceu DEPOIS do último retorno,
  // o abastecimento tem horímetro maior e ainda não dá para saber (null; a tela explica).
  protected readonly horasDesdeUltimo = computed(() => {
    const ultimo = this.ultimoAbastecimento();
    const maquina = this.maquina();
    return ultimo && maquina && maquina.horimetro >= ultimo.horimetro ? maquina.horimetro - ultimo.horimetro : null;
  });

  protected readonly etiquetaStatusAbastecimento = etiquetaStatusAbastecimento;
  protected readonly rotuloStatusAbastecimento = rotuloStatusAbastecimento;

  // "1 aguardando conferência" (sem "e 0 em correção"): só o que existe
  protected readonly resumoNaoConferidos = computed(() => {
    const c = this.combustivel.hasValue() ? this.combustivel.value() : null;
    return c
      ? resumoSemZeros(
          [
            [c.pendentes, 'aguardando conferência', 'aguardando conferência'],
            [c.emCorrecao, 'em correção', 'em correção'],
          ],
          '',
        )
      : '';
  });

  // "1 aberta e 2 fechadas" no lugar de "1 aberta(s) · 2 fechada(s)"
  protected readonly resumoOrdens = computed(() => {
    const r = this.resumo.hasValue() ? this.resumo.value() : null;
    return r
      ? resumoSemZeros([[r.abertas, 'aberta', 'abertas'], [r.fechadas, 'fechada', 'fechadas']], 'nenhuma ainda')
      : '';
  });

  // Etiqueta QR para colar na máquina (o app móvel lê e abre a ficha).
  // O uqr gera o QR como TEXTO SVG; virar "data URL" permite usar numa <img> comum, sem
  // innerHTML (o Angular removeria o SVG por segurança).
  protected readonly qrDaMaquina = computed(() => {
    const svg = renderSVG(conteudoDoQrDaMaquina(this.id()));
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

  // Imprime a etiqueta numa JANELA PRÓPRIA, só com ela: não depende do layout do app
  // (esconder "tudo menos a etiqueta" com @media print falhou: o conteúdo do mat-sidenav tem
  // overflow e transform, e a etiqueta saía cortada fora da página).
  protected imprimirEtiqueta(): void {
    const janela = window.open('', '_blank', 'width=420,height=560');
    if (!janela) {
      this.snackBar.open('O navegador bloqueou a janela de impressão. Permita pop-ups para este site.', 'OK', {
        duration: 6000,
      });
      return;
    }

    const maquina = this.maquina();
    const doc = janela.document;
    doc.title = `Etiqueta ${maquina?.tag ?? ''}`;

    const estilo = doc.createElement('style');
    estilo.textContent = `
      body { margin: 0; display: grid; place-items: center; min-height: 100vh; font-family: sans-serif; }
      .etiqueta { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 16px 20px;
                  border: 2px solid #17211b; border-radius: 12px; color: #17211b; }
      strong { font-size: 22px; } small { color: #5b645e; }`;
    doc.head.append(estilo);

    // Elementos criados um a um, com textContent: a tag e o modelo vêm do CADASTRO, então nunca
    // entram como HTML em texto (evita injeção de código numa etiqueta "maliciosa")
    const etiqueta = doc.createElement('div');
    etiqueta.className = 'etiqueta';
    const qr = doc.createElement('img');
    qr.width = qr.height = 220;
    qr.alt = 'QR code da máquina';
    const tag = doc.createElement('strong');
    tag.textContent = maquina?.tag ?? '';
    const modelo = doc.createElement('span');
    modelo.textContent = maquina?.modelo ?? '';
    const rodape = doc.createElement('small');
    rodape.textContent = 'Agro Frota · aponte o app do operador';
    etiqueta.append(qr, tag, modelo, rodape);
    doc.body.append(etiqueta);

    // Só manda imprimir depois que a imagem do QR carregou (senão sai a etiqueta sem o código)
    qr.onload = () => {
      janela.focus();
      janela.print();
    };
    qr.src = this.qrDaMaquina();
  }

  // Segmentos da barra: sempre na MESMA ordem (Preventiva, Corretiva) e com a mesma cor,
  // para a cor identificar o tipo (e não a posição ou o tamanho)
  protected readonly segmentos = computed<SegmentoCusto[]>(() => {
    if (!this.resumo.hasValue()) {
      return [];
    }
    const { custoTotal, custoPorTipo } = this.resumo.value();
    return TIPOS_OS.map(tipo => ({
      tipo,
      valor: custoPorTipo[tipo],
      percentual: custoTotal > 0 ? (custoPorTipo[tipo] / custoTotal) * 100 : 0,
    }));
  });

  // Texto que descreve a barra para leitores de tela (a barra em si é só visual)
  protected readonly descricaoBarra = computed(() =>
    this.segmentos()
      .map(s => `${s.tipo}: ${s.percentual.toFixed(0)}% do custo`)
      .join('; '),
  );

  // O.S. da máquina, mais recentes primeiro
  protected readonly ordens = computed(() =>
    this.resumo.hasValue() ? [...this.resumo.value().ordens].sort((a, b) => b.id - a.id) : [],
  );

  protected readonly colunas = ['numero', 'tipo', 'status', 'abertura', 'custo'];

  // Tons das etiquetas (regra compartilhada em core/ui/tons.ts)
  protected readonly etiquetaStatusMaquina = etiquetaStatusMaquina;
  protected readonly etiquetaTipoOS = etiquetaTipoOS;
}
