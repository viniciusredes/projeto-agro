// Textos com contagem: "1 O.S. aberta", "2 O.S. abertas" (nunca "aberta(s)")

// Uma contagem com a palavra certa para o número
export function contagem(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

// Junta só as partes que não são zero: [1 aberta, 0 fechadas] -> "1 aberta".
// Tudo zero devolve o texto de "nada" (ex.: "nenhuma ainda").
export function resumoSemZeros(partes: [number, string, string][], nada: string): string {
  const textos = partes.filter(([quantidade]) => quantidade > 0).map(([q, s, p]) => contagem(q, s, p));
  if (textos.length === 0) {
    return nada;
  }
  return textos.length === 1 ? textos[0] : `${textos.slice(0, -1).join(', ')} e ${textos.at(-1)}`;
}
