import { requisitar } from '@/api';
import { DadosAberturaOS, OrdemServico, RespostaAberturaOS } from '@/models/ordem-servico';

// Uma função por rota da API (o papel do OrdemServicoService do front web)

// GET /ordens-servico?maquinaId=&status=Aberta (a O.S. que segura a máquina na oficina)
export function listarOrdensAbertas(maquinaId: number): Promise<OrdemServico[]> {
  return requisitar<OrdemServico[]>(`/ordens-servico?maquinaId=${maquinaId}&status=Aberta`);
}

// POST /ordens-servico (201). Se a máquina estiver em campo, a API encerra a saída sozinha
// e devolve a movimentação encerrada em "movimentacaoEncerrada".
export function abrirOS(dados: DadosAberturaOS): Promise<RespostaAberturaOS> {
  return requisitar<RespostaAberturaOS>('/ordens-servico', { method: 'POST', body: JSON.stringify(dados) });
}
