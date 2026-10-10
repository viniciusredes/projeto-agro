import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';

// Preferência de tema do operador: seguir o celular (padrão) ou fixar claro/escuro.
// Fica salva no aparelho, como o nome do operador (contextos/operador.tsx).

export type PreferenciaTema = 'sistema' | 'claro' | 'escuro';

const CHAVE = 'agro-frota:tema';

// Appearance.setColorScheme troca o tema do APP INTEIRO: o useColorScheme() passa a devolver a
// escolha, e por isso o useTema() de todas as telas obedece sem mudar nada nelas.
// 'unspecified' = desfaz a escolha e volta a seguir o tema do celular.
const ESQUEMA = { sistema: 'unspecified', claro: 'light', escuro: 'dark' } as const;

function ehPreferencia(valor: string | null): valor is PreferenciaTema {
  return valor === 'sistema' || valor === 'claro' || valor === 'escuro';
}

interface ContextoTema {
  preferencia: PreferenciaTema;
  escolher: (preferencia: PreferenciaTema) => void;
}

const Contexto = createContext<ContextoTema | null>(null);

export function ProvedorPreferenciaTema({ children }: { children: ReactNode }) {
  const [preferencia, setPreferencia] = useState<PreferenciaTema>('sistema');

  // Ao abrir o app, aplica a escolha salva (se houver). Até lá, vale o tema do celular.
  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then(salva => {
        if (ehPreferencia(salva)) {
          Appearance.setColorScheme(ESQUEMA[salva]);
          setPreferencia(salva);
        }
      })
      .catch(() => {}); // sem armazenamento: segue o tema do celular
  }, []);

  function escolher(nova: PreferenciaTema) {
    Appearance.setColorScheme(ESQUEMA[nova]);
    setPreferencia(nova);
    AsyncStorage.setItem(CHAVE, nova).catch(() => {}); // se não salvar, só vale até fechar o app
  }

  return <Contexto.Provider value={{ preferencia, escolher }}>{children}</Contexto.Provider>;
}

// Hook para as telas: const { preferencia, escolher } = usePreferenciaTema();
export function usePreferenciaTema(): ContextoTema {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error('usePreferenciaTema precisa estar dentro do <ProvedorPreferenciaTema> (veja o _layout.tsx)');
  }
  return contexto;
}
