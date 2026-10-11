import { PontoGps } from '@/models/posicao';

// Fila das posições (Etapa 6), em FUNÇÕES PURAS: entra a fila, sai a fila nova, sem estado nem
// tela. O contexto de rastreamento (contextos/rastreamento.tsx) só guarda e envia.

// Um ponto esperando envio: o que o GPS leu + a máquina a que ele pertence
export interface PontoNaFila extends PontoGps {
  maquinaId: number;
}

// Leitura: em movimento, um ponto a cada 30 s; parada (a menos de 25 m do último guardado), um a
// cada 5 min, só para o mapa saber que o sinal continua (o marcador apaga depois de 10 min).
export const INTERVALO_LEITURA_MS = 30_000;
export const DISTANCIA_MINIMA_M = 25;
export const INTERVALO_PARADA_MS = 5 * 60_000;

// Sem sinal por muito tempo, a fila não cresce sem limite: ficam os mais recentes
export const MAXIMO_NA_FILA = 1000;
const MAXIMO_POR_LOTE = 50; // o limite da API por envio

// Distância entre dois pontos em metros (fórmula de haversine: a Terra como uma esfera)
export function distanciaEmMetros(a: PontoGps, b: PontoGps): number {
  const raioDaTerra = 6_371_000;
  const radianos = (graus: number) => (graus * Math.PI) / 180;
  const dLat = radianos(b.latitude - a.latitude);
  const dLon = radianos(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(radianos(a.latitude)) * Math.cos(radianos(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * raioDaTerra * Math.asin(Math.sqrt(h));
}

// A leitura nova vale um ponto na fila?
export function deveGuardar(ultimo: PontoGps | null, novo: PontoGps): boolean {
  if (!ultimo) {
    return true; // o primeiro ponto da saída sempre vale
  }
  const passou = new Date(novo.data).getTime() - new Date(ultimo.data).getTime();
  const andou = distanciaEmMetros(ultimo, novo);
  if (andou >= DISTANCIA_MINIMA_M) {
    return passou >= INTERVALO_LEITURA_MS * 0.9; // 10% de folga: o GPS não é um relógio exato
  }
  return passou >= INTERVALO_PARADA_MS;
}

// Acrescenta o ponto para cada máquina com o operador (em geral, uma só).
// Ao religar, o GPS reentrega a última leitura: a mesma máquina com a mesma data não entra de novo.
export function comNovoPonto(fila: PontoNaFila[], maquinaIds: number[], ponto: PontoGps): PontoNaFila[] {
  const novos = maquinaIds
    .filter(maquinaId => !fila.some(p => p.maquinaId === maquinaId && p.data === ponto.data))
    .map(maquinaId => ({ ...ponto, maquinaId }));
  const nova = [...fila, ...novos];
  return nova.length > MAXIMO_NA_FILA ? nova.slice(nova.length - MAXIMO_NA_FILA) : nova;
}

// O próximo envio: os pontos mais antigos de UMA máquina, até o limite da API
export function proximoLote(fila: PontoNaFila[]): { maquinaId: number; pontos: PontoNaFila[] } | null {
  if (fila.length === 0) {
    return null;
  }
  const maquinaId = fila[0].maquinaId;
  return { maquinaId, pontos: fila.filter(p => p.maquinaId === maquinaId).slice(0, MAXIMO_POR_LOTE) };
}

// Tira da fila os pontos que já foram (ou que a API recusou de vez)
export function semOsPontos(fila: PontoNaFila[], enviados: PontoNaFila[]): PontoNaFila[] {
  const saem = new Set(enviados);
  return fila.filter(p => !saem.has(p));
}

// Tira da fila tudo de uma máquina (a saída dela acabou: a API não aceita mais)
export function semAMaquina(fila: PontoNaFila[], maquinaId: number): PontoNaFila[] {
  return fila.filter(p => p.maquinaId !== maquinaId);
}
