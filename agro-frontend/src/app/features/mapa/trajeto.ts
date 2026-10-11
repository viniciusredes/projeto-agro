import { Posicao } from '../../core/models/posicao';

// O trajeto de uma saída (Etapa 6), em funções puras: a tela só desenha.

// Distância entre dois pontos em metros (fórmula de haversine: a Terra como uma esfera).
// A mesma conta do app do operador (agro-mobile/src/fila-posicoes.ts).
export function distanciaEmMetros(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const raioDaTerra = 6_371_000;
  const radianos = (graus: number) => (graus * Math.PI) / 180;
  const dLat = radianos(b.latitude - a.latitude);
  const dLon = radianos(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(radianos(a.latitude)) * Math.cos(radianos(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * raioDaTerra * Math.asin(Math.sqrt(h));
}

export interface ResumoTrajeto {
  pontos: number;
  inicio: string; // data da primeira posição (ISO)
  fim: string;    // data da última posição (ISO)
  km: number;     // a soma dos trechos entre posições seguidas
}

// null = sem posições (nada a resumir)
export function resumoDoTrajeto(posicoes: Posicao[]): ResumoTrajeto | null {
  if (posicoes.length === 0) {
    return null;
  }
  let metros = 0;
  for (let i = 1; i < posicoes.length; i++) {
    metros += distanciaEmMetros(posicoes[i - 1], posicoes[i]);
  }
  return {
    pontos: posicoes.length,
    inicio: posicoes[0].data,
    fim: posicoes[posicoes.length - 1].data,
    km: Math.round(metros / 100) / 10, // 1 casa: 1,3 km
  };
}
