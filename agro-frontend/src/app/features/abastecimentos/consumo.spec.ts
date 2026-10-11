import { compararComMedia } from './consumo';

describe('compararComMedia', () => {
  it('dentro de 30% da média é normal', () => {
    expect(compararComMedia(8, 10)?.situacao).toBe('normal');   // 20% abaixo
    expect(compararComMedia(12.5, 10)?.situacao).toBe('normal'); // 25% acima
  });

  it('acima ou abaixo da tolerância pede atenção, com a diferença em fração', () => {
    expect(compararComMedia(15, 10)).toEqual({ situacao: 'acima', diferenca: 0.5 });
    expect(compararComMedia(5, 10)).toEqual({ situacao: 'abaixo', diferenca: -0.5 });
  });

  it('sem consumo ou sem média não compara', () => {
    expect(compararComMedia(null, 10)).toBeNull();
    expect(compararComMedia(8, null)).toBeNull();
    expect(compararComMedia(8, 0)).toBeNull();
  });
});
