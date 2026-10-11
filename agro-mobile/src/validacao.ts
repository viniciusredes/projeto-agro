// Regras de formulário do app, em FUNÇÕES PURAS: entra um valor, sai um resultado, sem tela
// nem estado. Fáceis de testar e de reaproveitar (o mesmo papel do core/validacao.ts da web).

import { LimitesHorimetro } from '@/models/maquina';

export type ResultadoHorimetro =
  | { valido: true; valor: number; horas: number } // horas: quanto a máquina trabalhou
  | { valido: false; erro: string | null };         // erro null = campo vazio (sem mensagem ainda)

// Lê o horímetro digitado e confere a regra da API: maior ou igual ao atual.
// O teclado numérico brasileiro usa VÍRGULA ("1012,5"); o JavaScript entende ponto ("1012.5").
export function validarHorimetro(texto: string, atual: number): ResultadoHorimetro {
  const limpo = texto.trim().replace(',', '.');
  if (limpo === '') {
    return { valido: false, erro: null };
  }

  const valor = Number(limpo);
  if (!Number.isFinite(valor)) {
    return { valido: false, erro: 'Digite só números (ex.: 1012,5).' };
  }
  if (valor < atual) {
    return { valido: false, erro: `Não pode ser menor que o atual (${formatarHoras(atual)} h).` };
  }

  // Arredonda para 1 casa, como a API (evita 12.299999999 por causa do ponto flutuante)
  return { valido: true, valor, horas: Math.round((valor - atual) * 10) / 10 };
}

// Horímetro com limite de cima também (correção de abastecimento: entre o anterior e o seguinte).
// Reaproveita a regra do mínimo e só acrescenta a do máximo (null = sem limite de cima).
export function validarHorimetroEntre(texto: string, minimo: number, maximo: number | null): ResultadoHorimetro {
  const resultado = validarHorimetro(texto, minimo);
  if (resultado.valido && maximo !== null && resultado.valor > maximo) {
    return { valido: false, erro: `Não pode passar o do abastecimento seguinte (${formatarHoras(maximo)} h).` };
  }
  return resultado;
}

// A faixa que a API manda (GET /maquinas/:id/horimetro, Etapa 5): a regra do retorno, da avaria
// e do abastecimento. Mínimo: a maior leitura (máquina ou abastecimento); máximo: o tempo que passou.
export function validarHorimetroNaFaixa(texto: string, limites: LimitesHorimetro): ResultadoHorimetro {
  const resultado = validarHorimetro(texto, limites.minimo);
  const digitado = Number(texto.trim().replace(',', '.'));
  // resultado.erro null = campo vazio: sem mensagem ainda (Number('') vale 0, que é "menor")
  if (!resultado.valido && resultado.erro !== null && limites.origemMinimo && digitado < limites.minimo) {
    // Abaixo do mínimo que veio de um abastecimento: diz qual, para o operador entender
    return { valido: false, erro: `Não pode ser menor que ${formatarHoras(limites.minimo)} h (${limites.origemMinimo}).` };
  }
  if (resultado.valido && limites.maximo !== null && resultado.valor > limites.maximo) {
    return { valido: false, erro: `Passa do máximo possível (${formatarHoras(limites.maximo)} h). Confira o painel da máquina.` };
  }
  return resultado;
}

// Botões rápidos: somam ao mínimo (+1 h, +4 h, +8 h); os que passariam do máximo não aparecem.
// O texto vai para o campo com VÍRGULA, como se o operador tivesse digitado ("1008,5").
export function atalhosDoHorimetro(limites: LimitesHorimetro): { rotulo: string; texto: string }[] {
  return [1, 4, 8]
    .map(horas => ({ horas, valor: Math.round((limites.minimo + horas) * 10) / 10 }))
    .filter(({ valor }) => limites.maximo === null || valor <= limites.maximo)
    .map(({ horas, valor }) => ({ rotulo: `+${horas} h`, texto: String(valor).replace('.', ',') }));
}

export type ResultadoNumero =
  | { valido: true; valor: number }
  | { valido: false; erro: string | null }; // erro null = campo vazio (sem mensagem ainda)

// Número maior que zero digitado no teclado brasileiro (litros, valor pago): "120,5" vale 120.5
export function validarPositivo(texto: string): ResultadoNumero {
  const limpo = texto.trim().replace(',', '.');
  if (limpo === '') {
    return { valido: false, erro: null };
  }
  const valor = Number(limpo);
  if (!Number.isFinite(valor)) {
    return { valido: false, erro: 'Digite só números, sem ponto de milhar (ex.: 120,5).' };
  }
  if (valor <= 0) {
    return { valido: false, erro: 'Precisa ser maior que zero.' };
  }
  return { valido: true, valor };
}

// 746.3 -> "R$ 746,30"; com casas = 3 (preço do combustível): 6.193 -> "R$ 6,193"
export function formatarReais(valor: number, casas = 2): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

// 1012.5 -> "1.012,5" (formato brasileiro, até 1 casa decimal)
export function formatarHoras(valor: number): string {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

// Horas trabalhadas desde o último abastecimento. O horímetro da máquina só muda na saída e no
// retorno; se ela abasteceu DEPOIS do último retorno (em campo, por exemplo), o abastecimento
// tem horímetro maior e ainda não dá para saber: null (a tela explica, em vez de "0 h").
export function horasDesdeAbastecimento(horimetroMaquina: number, horimetroAbastecimento: number): number | null {
  return horimetroMaquina >= horimetroAbastecimento ? horimetroMaquina - horimetroAbastecimento : null;
}

// Mesmo limite da API (2 MB): conferir ANTES de enviar poupa o 3G/4G do campo
export const TAMANHO_MAXIMO_FOTO = 2 * 1024 * 1024;

// Tamanho em bytes de uma imagem em base64, SEM decodificar: cada 4 caracteres guardam 3 bytes,
// e cada "=" no fim é um byte de enchimento. (Decodificar 2 MB num celular só para medir seria lento.)
// Se é mesmo JPEG ou PNG, quem confere é a API: ela é a autoridade, o app só evita o envio inútil.
export function tamanhoDoBase64(base64: string): number {
  const enchimento = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return (base64.length / 4) * 3 - enchimento;
}

// 1536000 -> "1,5 MB"; 51200 -> "50 KB" (formato brasileiro)
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024).toLocaleString('pt-BR')} KB`;
  }
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}
