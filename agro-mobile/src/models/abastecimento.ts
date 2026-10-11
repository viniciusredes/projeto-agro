// Contrato do abastecimento (Etapa 4), o MESMO da API (agro-backend/server.ts, Partes AB1 a AB3).
// O front web terá a mesma cópia em core/models/abastecimento.ts.

export type OrigemAbastecimento = 'Posto' | 'Tanque';
export type StatusAbastecimento = 'Pendente' | 'Aprovado' | 'Recusado';

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
