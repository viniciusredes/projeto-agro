import { FormControl } from '@angular/forms';
import { NAO_VAZIO, inteiro } from './validacao';

// Teste de FUNÇÃO PURA: o tipo mais simples de teste. Não precisa de TestBed nem de Angular:
// entra um valor, sai um resultado. Um bom primeiro teste para escrever.
describe('validacao', () => {
  describe('inteiro()', () => {
    const validar = (valor: unknown) => inteiro()(new FormControl(valor));

    it('aceita números inteiros', () => {
      expect(validar(3)).toBeNull();
      expect(validar(0)).toBeNull();
    });

    it('recusa números com casas decimais', () => {
      expect(validar(2.5)).toEqual({ inteiro: true });
    });

    it('não cobra preenchimento (isso é papel do Validators.required)', () => {
      expect(validar(null)).toBeNull();
      expect(validar('')).toBeNull();
    });
  });

  describe('NAO_VAZIO', () => {
    it('aceita texto com pelo menos um caractere visível', () => {
      expect(NAO_VAZIO.test('João')).toBe(true);
      expect(NAO_VAZIO.test('  TR-01  ')).toBe(true);
    });

    it('recusa texto vazio ou só com espaços (a mesma regra do back-end)', () => {
      expect(NAO_VAZIO.test('')).toBe(false);
      expect(NAO_VAZIO.test('   ')).toBe(false);
    });
  });
});
