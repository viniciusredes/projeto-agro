import { ErroApi, requisitar } from '@/api';
import { DadosSaida, Maquina, Movimentacao, RespostaSaida } from '@/models/maquina';

// Uma função por rota da API (o papel do MaquinaService do front web).
// Funções declaradas FORA dos componentes são estáveis: podem ir direto para o useRequisicao.

// GET /maquinas
export function listarMaquinas(): Promise<Maquina[]> {
  return requisitar<Maquina[]>('/maquinas');
}

// A API não tem GET /maquinas/:id (é o exercício 1 do back-end!): busca a lista e filtra.
// Com poucas máquinas, é barato; numa frota grande, valeria a rota própria.
export async function buscarMaquina(id: number): Promise<Maquina> {
  const maquina = (await listarMaquinas()).find(m => m.id === id);
  if (!maquina) {
    throw new ErroApi('Máquina não encontrada.', 404);
  }
  return maquina;
}

// GET /movimentacoes?maquinaId= (histórico de saídas e retornos da máquina)
export function listarMovimentacoes(maquinaId: number): Promise<Movimentacao[]> {
  return requisitar<Movimentacao[]>(`/movimentacoes?maquinaId=${maquinaId}`);
}

// POST /maquinas/:id/saida
export function registrarSaida(id: number, dados: DadosSaida): Promise<RespostaSaida> {
  return requisitar<RespostaSaida>(`/maquinas/${id}/saida`, { method: 'POST', body: JSON.stringify(dados) });
}

// Tudo o que a FICHA mostra: a máquina e, se estiver em campo, a saída em aberto (quem e onde).
// Promise.all dispara as duas chamadas AO MESMO TEMPO e espera as duas (o forkJoin do kardex na web).
export async function buscarFicha(id: number): Promise<{ maquina: Maquina; saidaAberta: Movimentacao | null }> {
  const [maquina, movimentacoes] = await Promise.all([buscarMaquina(id), listarMovimentacoes(id)]);
  return { maquina, saidaAberta: movimentacoes.find(mov => !mov.dataRetorno) ?? null };
}
