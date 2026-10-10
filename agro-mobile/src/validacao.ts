// Regras de formulário do app, em FUNÇÕES PURAS: entra um valor, sai um resultado, sem tela
// nem estado. Fáceis de testar e de reaproveitar (o mesmo papel do core/validacao.ts da web).

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

// 1012.5 -> "1.012,5" (formato brasileiro, até 1 casa decimal)
export function formatarHoras(valor: number): string {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
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
