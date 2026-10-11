// Contrato das posições (Etapa 6, Parte L1 da API).
// O app manda só o que o GPS leu; a API completa com a máquina, a saída e o operador.

// Um ponto lido pelo celular, como vai no corpo de POST /maquinas/:id/posicoes
export interface PontoGps {
  latitude: number;
  longitude: number;
  precisao: number; // raio de incerteza, em metros
  data: string;     // ISO 8601: quando o GPS leu
}

// Corpo de POST /maquinas/:id/posicoes (até 50 pontos por envio)
export interface DadosPosicoes {
  posicoes: PontoGps[];
}

// Resposta de POST /maquinas/:id/posicoes (201)
export interface RespostaPosicoes {
  mensagem: string;
  recebidas: number;
}
