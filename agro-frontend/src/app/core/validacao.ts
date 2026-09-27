import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Regras de validação reaproveitadas pelos formulários do sistema

// "Tem pelo menos um caractere que não é espaço".
// Espelha a regra do back-end, que recusa textos só com espaços (trim).
export const NAO_VAZIO = /\S/;

// Validador customizado: o valor precisa ser um número inteiro (ex.: peças contadas em "un").
// Um ValidatorFn recebe o controle e devolve null (válido) ou um objeto com o erro ({ inteiro: true }).
// Campo vazio é considerado válido aqui: quem cobra o preenchimento é o Validators.required.
export function inteiro(): ValidatorFn {
  return (controle: AbstractControl): ValidationErrors | null => {
    const valor = controle.value;
    if (typeof valor !== 'number') {
      return null;
    }
    return Number.isInteger(valor) ? null : { inteiro: true };
  };
}
