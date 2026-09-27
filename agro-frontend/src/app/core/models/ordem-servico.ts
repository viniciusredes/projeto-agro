// Espelho dos tipos do agro-backend/server.ts (módulo de manutenção)
import { Maquina, Movimentacao } from './maquina';

export type TipoOS = 'Preventiva' | 'Corretiva';
export type StatusOS = 'Aberta' | 'Fechada';

// Listas de valores válidos (usadas nos filtros e formulários)
export const TIPOS_OS: TipoOS[] = ['Preventiva', 'Corretiva'];
export const STATUS_OS: StatusOS[] = ['Aberta', 'Fechada'];

// Uma linha da O.S.: uma peça usada no reparo (preenchida no fechamento)
export interface ItemOS {
  pecaId: number;
  codigo: string;          // cópia do código da peça
  quantidade: number;
  custoUnitario: number;   // custo NO MOMENTO da baixa (congelado)
  valorTotal: number;
}

// A O.S. é um documento: cabeçalho (dados gerais) + itens (peças usadas)
export interface OrdemServico {
  id: number;
  maquinaId: number;
  tipo: TipoOS;
  status: StatusOS;
  descricao: string;
  horimetroParada: number;
  dataAbertura: string;    // ISO 8601
  dataFechamento?: string; // só nas fechadas
  itens: ItemOS[];
  custoTotal: number;
}

// Resposta de GET /ordens-servico/:id: a O.S. + um resumo da máquina ("join" feito pela API)
export interface OrdemServicoDetalhe extends OrdemServico {
  maquina: Pick<Maquina, 'id' | 'tag' | 'modelo'> | null;
}

// Filtros opcionais de GET /ordens-servico
export interface FiltrosOS {
  maquinaId?: number;
  status?: StatusOS;
}

// Corpo de POST /ordens-servico (abertura)
export interface DadosAberturaOS {
  maquinaId: number;
  tipo: TipoOS;
  descricao: string;
  horimetro: number;
}

// Resposta de POST /ordens-servico (201)
export interface RespostaAberturaOS {
  mensagem: string;
  ordemServico: OrdemServico;
  maquina: Maquina;
  movimentacaoEncerrada: Movimentacao | null; // preenchida se a máquina estava em campo
}

// Uma peça informada no fechamento
export interface PecaUsada {
  pecaId: number;
  quantidade: number;
}

// Corpo de POST /ordens-servico/:id/fechamento
export interface DadosFechamentoOS {
  pecas: PecaUsada[];
}

// Resposta de POST /ordens-servico/:id/fechamento
export interface RespostaFechamentoOS {
  mensagem: string;
  ordemServico: OrdemServico;
  maquina: Maquina;
}

// Resposta de GET /maquinas/:id/manutencoes
export interface ManutencoesMaquina {
  maquina: string;         // tag
  status: Maquina['status'];
  totalOrdens: number;
  abertas: number;
  fechadas: number;
  custoTotal: number;
  custoPorTipo: Record<TipoOS, number>;
  ordens: OrdemServico[];
}
