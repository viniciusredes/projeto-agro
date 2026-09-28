import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, formatDate } from '@angular/common';
import { RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaquinaService } from '../../core/services/maquina.service';
import { PecaService } from '../../core/services/peca.service';
import { OrdemServicoService } from '../../core/services/ordem-servico.service';
import { Maquina, RespostaRetorno } from '../../core/models/maquina';
import { Peca, RespostaEntrada } from '../../core/models/peca';
import { OrdemServico, RespostaAberturaOS, TIPOS_OS, TipoOS } from '../../core/models/ordem-servico';
import { RetornoDialog } from '../maquinas/retorno-dialog/retorno-dialog';
import { EntradaDialog } from '../estoque/entrada-dialog/entrada-dialog';
import { AbrirOsDialog } from '../ordens-servico/abrir-os-dialog/abrir-os-dialog';
import { mensagemAberturaOS } from '../ordens-servico/mensagens';

// Um indicador do topo: quantas máquinas estão numa situação, e quais
interface Indicador {
  rotulo: string;
  valor: number;
  total?: number;         // "1 de 3"
  contexto: string;       // tags das máquinas ou códigos das peças
  classe: string;         // cor do ponto (tom semântico)
  rota: string;
}

// Um item de "Precisa de atenção": o que é, e qual ação resolve
type Pendencia =
  | { tipo: 'os'; titulo: string; detalhe: string; os: OrdemServico }
  | { tipo: 'campo'; titulo: string; detalhe: string; maquina: Maquina }
  | { tipo: 'repor'; titulo: string; detalhe: string; peca: Peca };

// Um pedaço da barra de custo por tipo de O.S.
interface SegmentoCusto {
  tipo: TipoOS;
  valor: number;
  percentual: number;
}

@Component({
  selector: 'app-inicio',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio {
  private readonly maquinaService = inject(MaquinaService);
  private readonly pecaService = inject(PecaService);
  private readonly osService = inject(OrdemServicoService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly hoje = new Date();

  // ===== 4 chamadas à API; todo o resto é dado DERIVADO (computed) =====
  protected readonly maquinas = rxResource({ stream: () => this.maquinaService.listar() });
  protected readonly pecas = rxResource({ stream: () => this.pecaService.listar() });
  protected readonly ordens = rxResource({ stream: () => this.osService.listar() });
  protected readonly movimentacoes = rxResource({ stream: () => this.maquinaService.listarMovimentacoes() });

  protected readonly carregando = computed(
    () => this.maquinas.isLoading() || this.pecas.isLoading() || this.ordens.isLoading() || this.movimentacoes.isLoading(),
  );
  protected readonly comErro = computed(
    () => !!(this.maquinas.error() || this.pecas.error() || this.ordens.error() || this.movimentacoes.error()),
  );

  // Listas "seguras": vazias enquanto carregam ou se deram erro (hasValue evita o erro do value())
  private readonly listaMaquinas = computed(() => (this.maquinas.hasValue() ? this.maquinas.value() : []));
  private readonly listaPecas = computed(() => (this.pecas.hasValue() ? this.pecas.value() : []));
  private readonly listaOrdens = computed(() => (this.ordens.hasValue() ? this.ordens.value() : []));

  private readonly pecasParaRepor = computed(() => this.listaPecas().filter(p => p.saldo < p.estoqueMinimo));

  // ===== Indicadores do topo =====
  protected readonly indicadores = computed<Indicador[]>(() => {
    const lista = this.listaMaquinas();
    const tags = (status: Maquina['status']) => lista.filter(m => m.status === status).map(m => m.tag);
    const disponiveis = tags('Disponível');
    const emCampo = tags('Em Operação');
    const emManutencao = tags('Em Manutenção');
    const repor = this.pecasParaRepor().map(p => p.codigo);
    return [
      { rotulo: 'Disponíveis no pátio', valor: disponiveis.length, total: lista.length, contexto: disponiveis.join(', ') || 'Nenhuma', classe: 'ponto--sucesso', rota: '/maquinas' },
      { rotulo: 'Em campo', valor: emCampo.length, contexto: emCampo.join(', ') || 'Nenhuma', classe: 'ponto--info', rota: '/movimentacoes' },
      { rotulo: 'Em manutenção', valor: emManutencao.length, contexto: emManutencao.join(', ') || 'Nenhuma', classe: 'ponto--alerta', rota: '/ordens-servico' },
      { rotulo: 'Peças para repor', valor: repor.length, contexto: repor.join(', ') || 'Estoque acima do mínimo', classe: 'ponto--neutro', rota: '/estoque' },
    ];
  });

  // ===== Precisa de atenção: O.S. abertas, máquinas em campo e peças abaixo do mínimo =====
  protected readonly pendencias = computed<Pendencia[]>(() => {
    const maquinaPorId = new Map(this.listaMaquinas().map(m => [m.id, m]));
    const quando = (data: string) => formatDate(data, "dd/MM 'às' HH:mm", 'pt-BR');

    const osAbertas: Pendencia[] = this.listaOrdens()
      .filter(os => os.status === 'Aberta')
      .map(os => {
        const maquina = maquinaPorId.get(os.maquinaId);
        return {
          tipo: 'os' as const,
          titulo: `O.S. nº ${os.id} aberta · ${maquina?.tag ?? '#' + os.maquinaId} ${maquina?.modelo ?? ''}`,
          detalhe: `${os.tipo} · ${os.descricao} · desde ${quando(os.dataAbertura)}`,
          os,
        };
      });

    // Máquinas em campo: a movimentação ainda sem retorno diz quem está com ela e onde
    const emCampo: Pendencia[] = (this.movimentacoes.hasValue() ? this.movimentacoes.value() : [])
      .filter(mov => !mov.dataRetorno)
      .flatMap(mov => {
        const maquina = maquinaPorId.get(mov.maquinaId);
        return maquina?.status === 'Em Operação'
          ? [{
              tipo: 'campo' as const,
              titulo: `${maquina.tag} ${maquina.modelo} em campo`,
              detalhe: `${mov.operador} · ${mov.frenteTrabalho} · saiu ${quando(mov.dataSaida)} com ${mov.horimetroSaida.toLocaleString('pt-BR')} h`,
              maquina,
            }]
          : [];
      });

    const repor: Pendencia[] = this.pecasParaRepor().map(peca => ({
      tipo: 'repor' as const,
      titulo: `${peca.codigo} abaixo do mínimo`,
      detalhe: `${peca.descricao} · saldo ${peca.saldo.toLocaleString('pt-BR')} ${peca.unidade}, mínimo ${peca.estoqueMinimo.toLocaleString('pt-BR')} ${peca.unidade}`,
      peca,
    }));

    return [...osAbertas, ...emCampo, ...repor];
  });

  // ===== Custo de manutenção (todas as O.S. fechadas) =====
  protected readonly custo = computed(() => {
    const fechadas = this.listaOrdens().filter(os => os.status === 'Fechada');
    const total = fechadas.reduce((soma, os) => soma + os.custoTotal, 0);
    const segmentos: SegmentoCusto[] = TIPOS_OS.map(tipo => {
      const valor = fechadas.filter(os => os.tipo === tipo).reduce((soma, os) => soma + os.custoTotal, 0);
      return { tipo, valor, percentual: total > 0 ? (valor / total) * 100 : 0 };
    });
    const descricao = segmentos.map(s => `${s.tipo}: ${s.percentual.toFixed(0)}% do custo`).join('; ');
    return { total, fechadas: fechadas.length, segmentos, descricao };
  });

  // Valor do que está na prateleira (saldo x custo da última compra)
  protected readonly valorEmEstoque = computed(() =>
    this.listaPecas().reduce((soma, peca) => soma + peca.saldo * peca.custoUnitario, 0),
  );

  // ===== Ações diretas (os mesmos diálogos das outras telas, reaproveitados) =====
  protected abrirOs(): void {
    this.dialog
      .open<AbrirOsDialog, null, RespostaAberturaOS>(AbrirOsDialog, { data: null, width: '520px' })
      .afterClosed()
      .subscribe(resposta => {
        if (resposta) {
          this.snackBar.open(mensagemAberturaOS(resposta), 'OK', { duration: 6000 });
          this.recarregar();
        }
      });
  }

  protected registrarRetorno(maquina: Maquina): void {
    this.dialog
      .open<RetornoDialog, Maquina, RespostaRetorno>(RetornoDialog, { data: maquina, width: '440px' })
      .afterClosed()
      .subscribe(resposta => {
        if (resposta) {
          const horas = resposta.movimentacao.horasTrabalhadas?.toLocaleString('pt-BR');
          this.snackBar.open(`${resposta.mensagem} Horas trabalhadas: ${horas} h`, 'OK', { duration: 5000 });
          this.recarregar();
        }
      });
  }

  protected registrarEntrada(peca: Peca): void {
    this.dialog
      .open<EntradaDialog, Peca, RespostaEntrada>(EntradaDialog, { data: peca, width: '480px' })
      .afterClosed()
      .subscribe(resposta => {
        if (resposta) {
          this.snackBar.open(resposta.mensagem, 'OK', { duration: 5000 });
          this.recarregar();
        }
      });
  }

  private recarregar(): void {
    this.maquinas.reload();
    this.pecas.reload();
    this.ordens.reload();
    this.movimentacoes.reload();
  }
}
