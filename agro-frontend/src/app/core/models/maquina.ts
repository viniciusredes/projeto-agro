// Espelho dos tipos do agro-backend/server.ts (módulo de uso)

export type StatusMaquina = 'Disponível' | 'Em Operação' | 'Em Manutenção';

export interface Maquina {
  id: number;
  tag: string;
  modelo: string;
  horimetro: number;
  status: StatusMaquina;
}

export interface Movimentacao {
  id: number;
  maquinaId: number;
  operador: string;
  frenteTrabalho: string;
  horimetroSaida: number;
  dataSaida: string;          // ISO 8601
  horimetroRetorno?: number;
  dataRetorno?: string;
  horasTrabalhadas?: number;
  avarias?: string;
}

// Corpo enviado em POST /maquinas/:id/saida
export interface DadosSaida {
  operador: string;
  frenteTrabalho: string;
}

// Resposta de POST /maquinas/:id/saida (status 200)
export interface RespostaSaida {
  mensagem: string;
  maquina: Maquina;
  movimentacao: Movimentacao;
}
