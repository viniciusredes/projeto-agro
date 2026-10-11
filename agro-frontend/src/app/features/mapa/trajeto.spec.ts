import { Posicao } from '../../core/models/posicao';
import { distanciaEmMetros, resumoDoTrajeto } from './trajeto';

function ponto(latitude: number, data: string): Posicao {
  return { id: 0, maquinaId: 1, movimentacaoId: 1, operador: 'Ana', latitude, longitude: -47.8, precisao: 10, data, recebidaEm: data };
}

describe('trajeto da saída', () => {
  it('0,001° de latitude são uns 111 m', () => {
    const metros = distanciaEmMetros({ latitude: -21, longitude: -47.8 }, { latitude: -21.001, longitude: -47.8 });
    expect(metros).toBeGreaterThan(110);
    expect(metros).toBeLessThan(112);
  });

  it('soma os trechos e guarda o primeiro e o último horário', () => {
    // 3 trechos de 0,005° (~556 m cada): ~1,7 km
    const resumo = resumoDoTrajeto([
      ponto(-21.000, '2026-10-11T12:00:00Z'),
      ponto(-21.005, '2026-10-11T12:10:00Z'),
      ponto(-21.010, '2026-10-11T12:20:00Z'),
      ponto(-21.015, '2026-10-11T12:30:00Z'),
    ]);
    expect(resumo).toEqual({ pontos: 4, inicio: '2026-10-11T12:00:00Z', fim: '2026-10-11T12:30:00Z', km: 1.7 });
  });

  it('sem posições não há resumo; com uma só, a distância é zero', () => {
    expect(resumoDoTrajeto([])).toBeNull();
    expect(resumoDoTrajeto([ponto(-21, '2026-10-11T12:00:00Z')])?.km).toBe(0);
  });
});
