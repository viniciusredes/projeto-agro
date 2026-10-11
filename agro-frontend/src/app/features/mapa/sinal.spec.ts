import { PosicaoAtual } from '../../core/models/posicao';
import { situacaoDoSinal, tempoDesde, textoDoSinal } from './sinal';

// Uma máquina em campo, com a última posição de "minutos" atrás (null = nenhuma ainda)
function emCampo(minutos: number | null): PosicaoAtual {
  return {
    maquinaId: 1, tag: 'TR-01', modelo: 'Trator', operador: 'Ana', frenteTrabalho: 'Talhão 7', dataSaida: '',
    minutosDesde: minutos,
    posicao: minutos === null
      ? null
      : { id: 1, maquinaId: 1, movimentacaoId: 1, operador: 'Ana', latitude: -21.1, longitude: -47.8, precisao: 10, data: '', recebidaEm: '' },
  };
}

describe('sinal das máquinas no mapa', () => {
  it('até 10 min é ao vivo; passou disso, sem sinal; sem posição, aguardando', () => {
    expect(situacaoDoSinal(emCampo(0.5))).toBe('ativo');
    expect(situacaoDoSinal(emCampo(10))).toBe('ativo');
    expect(situacaoDoSinal(emCampo(10.5))).toBe('sem-sinal');
    expect(situacaoDoSinal(emCampo(null))).toBe('sem-posicao');
  });

  it('o tempo em segundos, minutos ou horas', () => {
    expect(tempoDesde(0.5)).toBe('há 30 s');
    expect(tempoDesde(3.7)).toBe('há 3 min');
    expect(tempoDesde(80)).toBe('há 1 h 20 min');
    expect(tempoDesde(120)).toBe('há 2 h');
  });

  it('o texto da lista explica cada situação', () => {
    expect(textoDoSinal(emCampo(2))).toBe('Posição há 2 min');
    expect(textoDoSinal(emCampo(15))).toBe('Última posição há 15 min (app fechado ou sem sinal)');
    expect(textoDoSinal(emCampo(null))).toBe('Aguardando a primeira posição do app do operador');
  });
});
