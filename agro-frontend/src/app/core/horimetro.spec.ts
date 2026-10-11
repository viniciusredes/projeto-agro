import { FormControl } from '@angular/forms';
import { atalhosDoHorimetro, validadoresDoHorimetro } from './horimetro';

describe('horímetro', () => {
  it('os validadores barram abaixo do mínimo e acima do máximo', () => {
    const campo = new FormControl<number | null>(null, validadoresDoHorimetro({ minimo: 1000, origemMinimo: null, maximo: 1030 }));
    expect(campo.hasError('required')).toBe(true);

    campo.setValue(999);
    expect(campo.hasError('min')).toBe(true);

    campo.setValue(1031);
    expect(campo.hasError('max')).toBe(true);

    campo.setValue(1012.5);
    expect(campo.valid).toBe(true);
  });

  it('sem máximo, só o mínimo vale', () => {
    const campo = new FormControl<number | null>(99999, validadoresDoHorimetro({ minimo: 100, origemMinimo: null, maximo: null }));
    expect(campo.valid).toBe(true);
  });

  it('os botões rápidos somam ao mínimo e não passam do máximo', () => {
    expect(atalhosDoHorimetro({ minimo: 100, origemMinimo: null, maximo: null })).toEqual([
      { rotulo: '+1 h', valor: 101 },
      { rotulo: '+4 h', valor: 104 },
      { rotulo: '+8 h', valor: 108 },
    ]);
    expect(atalhosDoHorimetro({ minimo: 100, origemMinimo: null, maximo: 105 }).map(a => a.rotulo)).toEqual(['+1 h', '+4 h']);
  });
});
