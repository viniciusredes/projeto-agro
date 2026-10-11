// Contrato do abastecimento (Etapa 4), o MESMO da API (agro-backend/server.ts, Partes AB1 a AB3).
// O app do operador tem a mesma cópia em agro-mobile/src/models/abastecimento.ts.

import { MovimentoEstoque } from './peca';

export type OrigemAbastecimento = 'Posto' | 'Tanque';
export type StatusAbastecimento = 'Pendente' | 'Aprovado' | 'Recusado';

// Listas de valores válidos (usadas nos filtros e para validar a URL)
export const ORIGENS_ABASTECIMENTO: OrigemAbastecimento[] = ['Posto', 'Tanque'];
export const STATUS_ABASTECIMENTO: StatusAbastecimento[] = ['Pendente', 'Aprovado', 'Recusado'];

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
  comprovante: ComprovanteAbastecimento | null;
}

// Resposta de GET /abastecimentos/:id: o abastecimento com um resumo da máquina
export interface AbastecimentoDetalhe extends Abastecimento {
  maquina: { id: number; tag: string; modelo: string } | null;
}

// Filtros de GET /abastecimentos (todos opcionais e combináveis)
export interface FiltrosAbastecimento {
  maquinaId?: number;
  status?: StatusAbastecimento;
  origem?: OrigemAbastecimento;
  operador?: string;
}

// Resposta de POST /abastecimentos/:id/aprovacao e /recusa
export interface RespostaConferencia {
  mensagem: string;
  abastecimento: Abastecimento;
  estorno?: MovimentoEstoque | null; // só na recusa: a devolução do diesel, se veio do tanque
}

// Resposta de GET /maquinas/:id/combustivel (só os aprovados entram nos números)
export interface CombustivelMaquina {
  maquina: string;              // tag
  aprovados: number;
  pendentes: number;
  litros: number;
  custoTotal: number;
  horasMedidas: number;
  consumoMedio: number | null;  // L/h; null = sem dados (menos de 2 aprovados)
  custoPorHora: number | null;  // R$/h
  abastecimentos: Abastecimento[];
}
