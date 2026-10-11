import { ValidatorFn, Validators } from '@angular/forms';
import { LimitesHorimetro } from './models/maquina';

// Horímetro (Etapa 5, J6): a API manda a faixa válida (GET /maquinas/:id/horimetro) e a tela
// aplica a MESMA faixa no formulário, para avisar antes de enviar. A API continua a autoridade.

// Os validadores do campo: obrigatório, mínimo e, quando existe, máximo
export function validadoresDoHorimetro(limites: LimitesHorimetro): ValidatorFn[] {
  const validadores = [Validators.required, Validators.min(limites.minimo)];
  if (limites.maximo !== null) {
    validadores.push(Validators.max(limites.maximo));
  }
  return validadores;
}

// Botões rápidos: quase sempre o operador sabe quantas horas trabalhou ("umas 8 h").
// Cada botão soma ao mínimo; os que passariam do máximo não aparecem.
export const HORAS_RAPIDAS = [1, 4, 8];

export interface AtalhoHorimetro {
  rotulo: string; // "+4 h"
  valor: number;  // o horímetro que o botão preenche
}

export function atalhosDoHorimetro(limites: LimitesHorimetro): AtalhoHorimetro[] {
  return HORAS_RAPIDAS.map(horas => ({ rotulo: `+${horas} h`, valor: limites.minimo + horas })).filter(
    atalho => limites.maximo === null || atalho.valor <= limites.maximo,
  );
}
