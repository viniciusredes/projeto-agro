import { useColorScheme } from 'react-native';
import { StatusMaquina } from '@/models/maquina';

// As MESMAS cores do front web (src/estilos/_comuns.scss), nos dois temas.
// Na web, o CSS escolhe com light-dark(); aqui, o hook useTema() escolhe pelo tema do celular.
const claro = {
  fundo: '#f5f4ee',
  cartao: '#ffffff',
  borda: '#e2e0d6',
  texto: '#17211b',
  textoSuave: '#5b645e',
  primaria: '#1c6b45',
  sobrePrimaria: '#ffffff',
  barra: '#0f633e', // barra superior: o verde da marca
  sinal: '#f38302',
  erro: '#b3261e',
  tons: {
    sucesso: { fundo: '#e3f4e6', texto: '#1b6b2c' },
    info: { fundo: '#e0ecfb', texto: '#1a4f8f' },
    alerta: { fundo: '#fdecd8', texto: '#8a4b08' },
  },
};

type Tema = typeof claro;

const escuro: Tema = {
  fundo: '#111a15',
  cartao: '#19241e',
  borda: '#2d3b33',
  texto: '#e6ede8',
  textoSuave: '#a7b5ac',
  primaria: '#5cd69a',
  sobrePrimaria: '#062d1a',
  barra: '#0f2b1e', // verde-floresta do menu da web
  sinal: '#f5a142',
  erro: '#ffb4ab',
  tons: {
    sucesso: { fundo: '#193a28', texto: '#93e2b3' },
    info: { fundo: '#1a3150', texto: '#a6c8f4' },
    alerta: { fundo: '#3d2c14', texto: '#f5c27c' },
  },
};

// As cores do tema atual do celular (claro ou escuro). Muda sozinho se o usuário trocar o tema.
export function useTema(): Tema {
  return useColorScheme() === 'dark' ? escuro : claro;
}

// Tom de cada status (a mesma regra do core/ui/tons.ts da web)
export const TOM_STATUS: Record<StatusMaquina, keyof Tema['tons']> = {
  'Disponível': 'sucesso',
  'Em Operação': 'info',
  'Em Manutenção': 'alerta',
};
