import { requisitar } from '@/api';
import { Abastecimento } from '@/models/abastecimento';
import { Maquina, Movimentacao } from '@/models/maquina';
import { listarAbastecimentos } from '@/servicos/abastecimentos';
import { listarMaquinas } from '@/servicos/maquinas';

// Tudo o que a página inicial do operador mostra, numa busca só.
// Fica num serviço PRÓPRIO: ele usa máquinas E abastecimentos. Se ficasse em maquinas.ts, os dois
// serviços importariam um ao outro (abastecimentos.ts já importa maquinas.ts), um ciclo frágil.

export interface PainelOperador {
  maquinas: Maquina[];
  // As máquinas que estão COM ELE agora (saída sem retorno no nome dele)
  comigo: { maquina: Maquina; saida: Movimentacao }[];
  // Os abastecimentos dele, do mais recente para o mais antigo (Etapa 4)
  abastecimentos: { maquina: Maquina | undefined; abastecimento: Abastecimento }[];
}

// "ana" e "Ana " são a mesma pessoa: compara sem espaços nas pontas e sem maiúsculas
function mesmoNome(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('pt-BR') === b.trim().toLocaleLowerCase('pt-BR');
}

// As máquinas COM o operador agora: saídas sem retorno no nome dele.
// Usada pela página inicial ("Com você agora") e pelo rastreamento da localização (Etapa 6).
export function saidasDoOperador(maquinas: Maquina[], movimentacoes: Movimentacao[], nome: string) {
  return movimentacoes
    .filter(mov => !mov.dataRetorno && mesmoNome(mov.operador, nome))
    .flatMap(saida => {
      const maquina = maquinas.find(m => m.id === saida.maquinaId);
      return maquina ? [{ maquina, saida }] : [];
    });
}

// Só as saídas abertas do operador (sem os abastecimentos do painel): o rastreamento usa
export async function buscarSaidasDoOperador(nome: string) {
  const [maquinas, movimentacoes] = await Promise.all([listarMaquinas(), requisitar<Movimentacao[]>('/movimentacoes')]);
  return saidasDoOperador(maquinas, movimentacoes, nome);
}

export async function buscarPainelDoOperador(nome: string): Promise<PainelOperador> {
  const [maquinas, movimentacoes, abastecimentos] = await Promise.all([
    listarMaquinas(),
    requisitar<Movimentacao[]>('/movimentacoes'), // GET /movimentacoes sem filtro: todas as saídas
    listarAbastecimentos({ operador: nome }),     // a API compara sem maiúsculas e sem espaços
  ]);
  return {
    maquinas,
    comigo: saidasDoOperador(maquinas, movimentacoes, nome),
    abastecimentos: [...abastecimentos] // cópia: não reordena a lista que veio da API
      .sort((a, b) => b.id - a.id)
      .map(abastecimento => ({ maquina: maquinas.find(m => m.id === abastecimento.maquinaId), abastecimento })),
  };
}
