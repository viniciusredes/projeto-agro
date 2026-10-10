import { useCallback, useEffect, useState } from 'react';
import { mensagemDeErro } from '@/api';

// Hook = função que guarda ESTADO de componente e pode ser reaproveitada por várias telas.
// Este cuida dos estados de qualquer tela que busca dados (o papel do rxResource no Angular):
// - carregando: a primeira busca (mostra o indicador grande)
// - atualizando: o "puxar para atualizar" (mostra o indicador do topo da lista)
// - erro / dados: o resultado
//
// "buscar" deve ser uma função ESTÁVEL (declarada fora do componente, como as dos services),
// senão o efeito rodaria a cada renderização.
export function useRequisicao<T>(buscar: () => Promise<T>) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  // Primeira busca, quando a tela aparece.
  // O estado só muda quando a RESPOSTA chega (dentro do then/catch), nunca direto no efeito:
  // mudar estado no corpo do efeito força uma renderização extra (o lint avisa).
  useEffect(() => {
    let ativo = true; // vira false se a tela sair antes da resposta
    buscar()
      .then(resultado => {
        if (ativo) {
          setDados(resultado);
          setErro(null);
        }
      })
      .catch(e => ativo && setErro(mensagemDeErro(e)))
      .finally(() => ativo && setCarregando(false));

    // LIMPEZA: roda quando a tela sai. Sem ela, uma resposta atrasada atualizaria uma tela
    // que já fechou (o equivalente ao takeUntilDestroyed do Angular)
    return () => {
      ativo = false;
    };
  }, [buscar]);

  // "Puxar para atualizar" e "Tentar novamente": aqui é um EVENTO do usuário, não um efeito,
  // então mudar o estado logo no início é o normal.
  // useCallback: a MESMA função entre renderizações (só muda se "buscar" mudar). Quem a usa
  // como dependência de um efeito (ex.: recarregar ao voltar para a tela) não entra em ciclo.
  const recarregar = useCallback(async () => {
    setAtualizando(true);
    try {
      setDados(await buscar());
      setErro(null);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [buscar]);

  return { dados, erro, carregando, atualizando, recarregar };
}
