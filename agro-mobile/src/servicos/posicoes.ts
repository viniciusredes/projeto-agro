import { requisitar } from '@/api';
import { PontoGps, RespostaPosicoes } from '@/models/posicao';

// Posições da máquina em campo (Etapa 6). Uma função por rota, como nos outros serviços.

// O limite da API por envio: a fila manda em pedaços deste tamanho
export const MAXIMO_POR_ENVIO = 50;

// POST /maquinas/:id/posicoes (201). Só aceito com a saída aberta (409 depois do retorno).
export function enviarPosicoes(maquinaId: number, posicoes: PontoGps[]): Promise<RespostaPosicoes> {
  return requisitar<RespostaPosicoes>(`/maquinas/${maquinaId}/posicoes`, {
    method: 'POST',
    body: JSON.stringify({ posicoes }),
  });
}
