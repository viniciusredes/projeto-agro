// Contrato do abastecimento (Etapa 4), o MESMO da API (agro-backend/server.ts, Partes AB1 a AB3).
// O front web terá a mesma cópia em core/models/abastecimento.ts.

export type OrigemAbastecimento = 'Posto' | 'Tanque';
// 'Em correção': devolvido pelo gestor ao operador (Parte AB4); corrigido, volta a 'Pendente'
export type StatusAbastecimento = 'Pendente' | 'Em correção' | 'Aprovado' | 'Recusado';

// Cada devolução para correção: o que corrigir, quando, e quando o operador corrigiu
export interface Devolucao {
  motivo: string;
  data: string;
  corrigidaEm?: string;
}

// O recibo (ou a foto da bomba, no tanque): só os dados; a imagem fica na url
export interface ComprovanteAbastecimento {
  tipo: 'image/jpeg' | 'image/png';
  tamanho: number; // em bytes
  url: string;     // ex.: /abastecimentos/1/comprovante
}

export interface Abastecimento {
  id: number;
  maquinaId: number;
  operador: string;
  origem: OrigemAbastecimento;
  litros: number;
  horimetro: number;
  posto?: string;       // só no posto
  pecaId?: number;      // só no tanque (o diesel do almoxarifado)
  valorTotal: number;   // R$
  precoLitro: number;   // R$/L
  data: string;         // ISO 8601
  status: StatusAbastecimento;
  motivoRecusa?: string;
  dataConferencia?: string;
  devolucoes: Devolucao[]; // histórico das devoluções (vazio se nunca voltou ao operador)
  comprovante: ComprovanteAbastecimento | null;
}

// Resposta de GET /maquinas/:id/combustivel (só os aprovados entram nos números)
export interface CombustivelMaquina {
  maquina: string;              // tag
  aprovados: number;
  pendentes: number;
  emCorrecao: number;
  litros: number;
  custoTotal: number;
  horasMedidas: number;
  consumoMedio: number | null;  // L/h; null = sem dados (menos de 2 aprovados)
  custoPorHora: number | null;  // R$/h
  abastecimentos: Abastecimento[];
}

// Corpo de PUT /abastecimentos/:id (a correção): os campos que o operador digita.
// Máquina e origem não mudam; a foto é opcional (sem ela, vale a anterior).
export interface DadosCorrecao {
  litros: number;
  horimetro: number;
  posto?: string;
  valorTotal?: number;
  comprovante?: string;
}

// Corpo de POST /abastecimentos. No posto: posto, valorTotal e comprovante (obrigatório).
// No tanque: sem posto e sem valorTotal (o custo vem do almoxarifado); comprovante opcional.
export interface DadosAbastecimento {
  maquinaId: number;
  operador: string;
  origem: OrigemAbastecimento;
  litros: number;
  horimetro: number;
  posto?: string;
  valorTotal?: number;
  comprovante?: string; // a foto em base64
}

// Resposta de POST /abastecimentos (201)
export interface RespostaAbastecimento {
  mensagem: string;
  abastecimento: Abastecimento;
}
