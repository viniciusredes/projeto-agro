import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// Chave do nome no armazenamento do aparelho
const CHAVE = 'agro-frota:operador';

interface Operador {
  nome: string | null;       // null = ninguém se identificou ainda
  carregado: boolean;        // false enquanto lê o armazenamento (ao abrir o app)
  definir: (nome: string) => Promise<void>; // também serve para TROCAR (outro operador no aparelho)
}

// CONTEXTO: um valor que qualquer tela consegue ler, sem passar de componente em componente.
// É o papel de um service global (@Service()) no Angular.
const ContextoOperador = createContext<Operador | null>(null);

export function ProvedorOperador({ children }: { children: ReactNode }) {
  const [nome, setNome] = useState<string | null>(null);
  const [carregado, setCarregado] = useState(false);

  // Ao abrir o app, lê o nome salvo. O AsyncStorage é ASSÍNCRONO (o localStorage da web não é):
  // por isso existe o "carregado", para a tela não decidir nada antes da leitura terminar.
  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then(salvo => setNome(salvo))
      .catch(() => setNome(null)) // armazenamento indisponível: pergunta o nome de novo
      .finally(() => setCarregado(true));
  }, []);

  async function definir(novoNome: string) {
    const limpo = novoNome.trim();
    await AsyncStorage.setItem(CHAVE, limpo);
    setNome(limpo);
  }

  return (
    <ContextoOperador.Provider value={{ nome, carregado, definir }}>{children}</ContextoOperador.Provider>
  );
}

// Hook para as telas: const { nome } = useOperador();
export function useOperador(): Operador {
  const operador = useContext(ContextoOperador);
  if (!operador) {
    throw new Error('useOperador precisa estar dentro do <ProvedorOperador> (veja o _layout.tsx)');
  }
  return operador;
}
