// Espelho dos tipos do agro-backend/server.ts (módulo de estoque)

export type UnidadeMedida = 'un' | 'L';

export interface Peca {
  id: number;
  codigo: string;          // ex.: 'FLT-001'
  descricao: string;
  unidade: UnidadeMedida;
  saldo: number;
  custoUnitario: number;   // R$, custo da última compra
  estoqueMinimo: number;
}

// Resposta de GET /pecas?abaixoDoMinimo=true: a peça + um campo calculado pela API
export interface PecaParaRepor extends Peca {
  faltaParaMinimo: number;
}
