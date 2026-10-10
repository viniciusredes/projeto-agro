import { requisitar } from '@/api';
import { API_URL } from '@/config';
import { FotoOS, RespostaFotoOS } from '@/models/ordem-servico';

// Fotos da O.S. (M7). Uma função por rota da API, como nos outros serviços.

// Mesmo limite da API: o app avisa antes, em vez de deixar o operador fotografar à toa
export const MAXIMO_FOTOS_POR_OS = 5;

// A API devolve a url SEM o servidor ("/ordens-servico/3/fotos/1"): o <Image> precisa do endereço completo
export function enderecoDaFoto(foto: FotoOS): string {
  return `${API_URL}${foto.url}`;
}

// POST /ordens-servico/:id/fotos: a foto vai em base64 DENTRO do JSON ({ "imagem": "..." }).
// A API aceita até 3 MB nesta rota (nas outras, 100 KB) e até 2 MB de foto.
export function enviarFotoOS(ordemServicoId: number, imagemBase64: string): Promise<RespostaFotoOS> {
  return requisitar<RespostaFotoOS>(`/ordens-servico/${ordemServicoId}/fotos`, {
    method: 'POST',
    body: JSON.stringify({ imagem: imagemBase64 }),
  });
}

// GET /ordens-servico/:id/fotos (só os dados de cada foto; a imagem fica na url)
export function listarFotosOS(ordemServicoId: number): Promise<FotoOS[]> {
  return requisitar<FotoOS[]>(`/ordens-servico/${ordemServicoId}/fotos`);
}
