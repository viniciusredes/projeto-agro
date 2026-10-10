import { ErroApi, requisitar } from '@/api';
import { DadosRetorno, DadosSaida, Maquina, Movimentacao, RespostaRetorno, RespostaSaida } from '@/models/maquina';
import { FotoOS, OrdemServico } from '@/models/ordem-servico';
import { listarFotosOS } from '@/servicos/fotos-os';
import { listarOrdensAbertas } from '@/servicos/ordens-servico';

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

// Página inicial do operador: a frota inteira e as máquinas que estão COM ELE agora
// (saída sem retorno no nome dele). GET /movimentacoes sem filtro traz todas as saídas.
export interface PainelOperador {
  maquinas: Maquina[];
  comigo: { maquina: Maquina; saida: Movimentacao }[];
}

export async function buscarPainelDoOperador(nome: string): Promise<PainelOperador> {
  const [maquinas, movimentacoes] = await Promise.all([
    listarMaquinas(),
    requisitar<Movimentacao[]>('/movimentacoes'),
  ]);
  // "ana" e "Ana " são a mesma pessoa: compara sem espaços nas pontas e sem maiúsculas
  const mesmoNome = (a: string, b: string) => a.trim().toLocaleLowerCase('pt-BR') === b.trim().toLocaleLowerCase('pt-BR');
  const comigo = movimentacoes
    .filter(mov => !mov.dataRetorno && mesmoNome(mov.operador, nome))
    .flatMap(saida => {
      const maquina = maquinas.find(m => m.id === saida.maquinaId);
      return maquina ? [{ maquina, saida }] : [];
    });
  return { maquinas, comigo };
}

// POST /maquinas/:id/saida
export function registrarSaida(id: number, dados: DadosSaida): Promise<RespostaSaida> {
  return requisitar<RespostaSaida>(`/maquinas/${id}/saida`, { method: 'POST', body: JSON.stringify(dados) });
}

// POST /maquinas/:id/retorno (avarias é opcional: só vai no corpo se tiver texto)
export function registrarRetorno(id: number, dados: DadosRetorno): Promise<RespostaRetorno> {
  return requisitar<RespostaRetorno>(`/maquinas/${id}/retorno`, { method: 'POST', body: JSON.stringify(dados) });
}

// Tudo o que a FICHA mostra: a máquina, a saída em aberto (quem e onde, se estiver em campo)
// e a O.S. aberta (se estiver na oficina).
// Promise.all dispara as chamadas AO MESMO TEMPO e espera todas (o forkJoin do kardex na web).
export interface Ficha {
  maquina: Maquina;
  saidaAberta: Movimentacao | null;
  osAberta: OrdemServico | null;
  fotos: FotoOS[]; // fotos da O.S. aberta (vazia sem O.S.)
}

export async function buscarFicha(id: number): Promise<Ficha> {
  const [maquina, movimentacoes, ordensAbertas] = await Promise.all([
    buscarMaquina(id),
    listarMovimentacoes(id),
    listarOrdensAbertas(id),
  ]);
  const osAberta = ordensAbertas[0] ?? null; // a API permite uma O.S. aberta por máquina
  // As fotos DEPENDEM da O.S. (precisam do id dela): por isso vêm depois, e não no Promise.all
  const fotos = osAberta ? await listarFotosOS(osAberta.id) : [];
  return {
    maquina,
    saidaAberta: movimentacoes.find(mov => !mov.dataRetorno) ?? null,
    osAberta,
    fotos,
  };
}
