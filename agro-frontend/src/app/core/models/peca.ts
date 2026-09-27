// Espelho dos tipos do agro-backend/server.ts (módulo de estoque)

export type UnidadeMedida = 'un' | 'L';

// Opções de unidade para os formulários (valor enviado à API + texto exibido)
export const UNIDADES_MEDIDA: { valor: UnidadeMedida; rotulo: string }[] = [
  { valor: 'un', rotulo: 'Unidade (un)' },
  { valor: 'L', rotulo: 'Litro (L)' },
];

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

// Corpo enviado em POST /pecas (cadastro).
// Não tem saldo nem custo: a peça nasce zerada e só é abastecida por entrada de estoque.
export interface DadosNovaPeca {
  codigo: string;
  descricao: string;
  unidade: UnidadeMedida;
  estoqueMinimo: number;
}
