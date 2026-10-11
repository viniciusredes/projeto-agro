import { PosicaoAtual } from '../../core/models/posicao';
import { Tom } from '../../core/ui/tons';

// O "sinal" de cada máquina em campo no mapa (Etapa 6). O celular envia a cada 30 s em movimento
// e a cada 5 min parado; passou de 10 min sem posição, o marcador apaga ("sem sinal").
export const MINUTOS_SEM_SINAL = 10;

export type SituacaoSinal = 'ativo' | 'sem-sinal' | 'sem-posicao';

export function situacaoDoSinal(item: PosicaoAtual): SituacaoSinal {
  if (item.posicao === null || item.minutosDesde === null) {
    return 'sem-posicao'; // saiu, mas o app ainda não mandou nada (permissão, app fechado...)
  }
  return item.minutosDesde > MINUTOS_SEM_SINAL ? 'sem-sinal' : 'ativo';
}

// Tom da etiqueta (as mesmas cores do resto do sistema)
export const TOM_SINAL: Record<SituacaoSinal, Tom> = {
  ativo: 'sucesso',
  'sem-sinal': 'neutro',
  'sem-posicao': 'alerta',
};

export const ROTULO_SINAL: Record<SituacaoSinal, string> = {
  ativo: 'Ao vivo',
  'sem-sinal': 'Sem sinal',
  'sem-posicao': 'Sem posição',
};

// "há 40 s", "há 3 min", "há 1 h 20 min"
export function tempoDesde(minutos: number): string {
  if (minutos < 1) {
    return `há ${Math.max(1, Math.round(minutos * 60))} s`;
  }
  if (minutos < 60) {
    return `há ${Math.floor(minutos)} min`;
  }
  const horas = Math.floor(minutos / 60);
  const resto = Math.floor(minutos % 60);
  return resto > 0 ? `há ${horas} h ${resto} min` : `há ${horas} h`;
}

// O texto embaixo do nome da máquina, na lista ao lado do mapa
export function textoDoSinal(item: PosicaoAtual): string {
  const situacao = situacaoDoSinal(item);
  if (situacao === 'sem-posicao') {
    return 'Aguardando a primeira posição do app do operador';
  }
  const quando = tempoDesde(item.minutosDesde!);
  return situacao === 'sem-sinal' ? `Última posição ${quando} (app fechado ou sem sinal)` : `Posição ${quando}`;
}
