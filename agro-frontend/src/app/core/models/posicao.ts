// Contrato das posições (Etapa 6), o MESMO da API (agro-backend/server.ts, Parte L1).
// O app do operador envia; a web só lê.

// Um ponto lido pelo celular do operador durante uma saída
export interface Posicao {
  id: number;
  maquinaId: number;
  movimentacaoId: number;
  operador: string;
  latitude: number;
  longitude: number;
  precisao: number;   // raio de incerteza, em metros
  data: string;       // ISO 8601: quando o GPS leu
  recebidaEm: string; // quando a API recebeu
}

// GET /posicoes/atuais: cada máquina em campo com a última posição (null = ainda nenhuma)
export interface PosicaoAtual {
  maquinaId: number;
  tag: string;
  modelo: string;
  operador: string | null;
  frenteTrabalho: string | null;
  dataSaida: string | null;
  posicao: Posicao | null;
  minutosDesde: number | null; // há quanto tempo foi a última leitura
}

// GET /maquinas/:id/posicoes: o trajeto de uma saída, em ordem de leitura
export interface Trajeto {
  movimentacaoId: number | null;
  emCampo: boolean;
  posicoes: Posicao[];
}
