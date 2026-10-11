// Comparação do consumo de um abastecimento com a média APROVADA da máquina.
// Um desvio grande quase sempre é litros ou horímetro digitados errado: a conferência destaca.

// Acima de 30% para mais ou para menos, a conferência pede atenção
export const TOLERANCIA_CONSUMO = 0.3;

export interface ComparacaoConsumo {
  situacao: 'normal' | 'acima' | 'abaixo';
  diferenca: number; // fração com sinal: 0.25 = 25% acima da média; -0.4 = 40% abaixo
}

// null quando não dá para comparar (sem consumo ou sem média)
export function compararComMedia(
  consumo: number | null,
  media: number | null,
  tolerancia = TOLERANCIA_CONSUMO,
): ComparacaoConsumo | null {
  if (consumo === null || media === null || media <= 0) {
    return null;
  }
  const diferenca = (consumo - media) / media;
  const situacao = diferenca > tolerancia ? 'acima' : diferenca < -tolerancia ? 'abaixo' : 'normal';
  return { situacao, diferenca };
}
