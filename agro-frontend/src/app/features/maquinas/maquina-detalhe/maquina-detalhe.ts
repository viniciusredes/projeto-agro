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
import { etiquetaStatusMaquina, etiquetaTipoOS } from '../../../core/ui/tons';
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
