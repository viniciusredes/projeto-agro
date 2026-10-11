import { contagem, resumoSemZeros } from './textos';

describe('textos com contagem', () => {
  it('usa o singular só para 1', () => {
    expect(contagem(1, 'aberta', 'abertas')).toBe('1 aberta');
    expect(contagem(0, 'aberta', 'abertas')).toBe('0 abertas');
    expect(contagem(3, 'aberta', 'abertas')).toBe('3 abertas');
  });

  it('omite as partes zeradas e junta com "e"', () => {
    const texto = resumoSemZeros(
      [[1, 'aberta', 'abertas'], [0, 'fechada', 'fechadas']],
      'nenhuma ainda',
    );
    expect(texto).toBe('1 aberta');
    expect(resumoSemZeros([[2, 'aberta', 'abertas'], [5, 'fechada', 'fechadas']], '')).toBe('2 abertas e 5 fechadas');
  });

  it('tudo zero vira o texto de "nada"', () => {
    expect(resumoSemZeros([[0, 'aberta', 'abertas']], 'nenhuma ainda')).toBe('nenhuma ainda');
  });
});
