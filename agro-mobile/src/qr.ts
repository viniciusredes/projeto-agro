// Formato do QR code da etiqueta colada na máquina: "agrofrota:maquina:<id>".
// É um CONTRATO entre quem imprime (a web, no detalhe da máquina) e quem lê (este app):
// se mudar aqui, precisa mudar lá também.
// O prefixo garante que o app só reage a etiquetas da frota, e não a qualquer QR (nota fiscal, site...).
const FORMATO = /^agrofrota:maquina:(\d+)$/;

// "agrofrota:maquina:3" -> 3; qualquer outra coisa -> null
export function idDaMaquinaNoQr(texto: string): number | null {
  const encontrado = FORMATO.exec(texto.trim());
  return encontrado ? Number(encontrado[1]) : null;
}
