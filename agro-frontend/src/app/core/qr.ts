// Conteúdo do QR code da etiqueta colada na máquina: "agrofrota:maquina:<id>".
// É um CONTRATO com o app móvel (agro-mobile/src/qr.ts), que lê a etiqueta e abre a ficha:
// se mudar aqui, precisa mudar lá também.
export function conteudoDoQrDaMaquina(id: number): string {
  return `agrofrota:maquina:${id}`;
}
