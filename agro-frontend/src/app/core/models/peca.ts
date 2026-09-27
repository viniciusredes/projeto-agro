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

// Corpo enviado em POST /pecas/:id/entradas (compra de peças)
export interface DadosEntrada {
  quantidade: number;
  custoUnitario: number;   // R$ por unidade/litro desta compra
}

// Tipos de movimento do kardex: implantação (saldo inicial), entrada (compra) e saída (consumo em O.S.)
export type TipoMovimentoEstoque = 'implantacao' | 'entrada' | 'saida';

// Uma linha do histórico de movimentos da peça (kardex)
export interface MovimentoEstoque {
  id: number;
  pecaId: number;
  tipo: TipoMovimentoEstoque;
  quantidade: number;      // sempre positiva; o tipo diz se soma ou subtrai
  custoUnitario: number;   // custo NESTE movimento (fica congelado)
  valorTotal: number;      // quantidade x custoUnitario
  saldoApos: number;       // saldo da peça logo depois deste movimento
  data: string;            // data ISO (ex.: '2026-09-27T13:15:00.000Z')
  ordemServicoId?: number; // só nas saídas: a O.S. que consumiu a peça
}

// Resposta de POST /pecas/:id/entradas
export interface RespostaEntrada {
  mensagem: string;
  peca: Peca;              // a peça já com o saldo e o custo novos
  custoAnterior: number;   // custo antes da compra (para mostrar "de → para")
  movimento: MovimentoEstoque;
}
