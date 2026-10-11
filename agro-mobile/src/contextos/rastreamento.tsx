import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ErroApi } from '@/api';
import { useOperador } from '@/contextos/operador';
import {
  comNovoPonto, deveGuardar, INTERVALO_LEITURA_MS, PontoNaFila, proximoLote, semAMaquina, semOsPontos,
} from '@/fila-posicoes';
import { PontoGps } from '@/models/posicao';
import { buscarSaidasDoOperador } from '@/servicos/painel';
import { enviarPosicoes } from '@/servicos/posicoes';

// Localização em campo (Etapa 6, Fase 1): enquanto o operador tem uma saída aberta E o app está
// ABERTO, o celular lê o GPS e manda a posição para a API. Fechou o app ou bloqueou a tela: pausa
// (o segundo plano exige um development build e ficou para depois).

const CHAVE_FILA = 'agro-frota:fila-posicoes'; // pontos que ainda não chegaram à API
const INTERVALO_ENVIO_MS = 30_000;

// O que o indicador mostra para o operador
export type EstadoLocalizacao =
  | 'sem-saida'       // nenhuma máquina com ele: nada a rastrear (o indicador some)
  | 'sem-permissao'   // ainda não permitiu: o indicador oferece "Ativar"
  | 'negada'          // negou de vez: só nas configurações do celular
  | 'gps-desligado'   // a localização do celular está desligada
  | 'ativa';

interface Rastreamento {
  estado: EstadoLocalizacao;
  maquinas: { id: number; tag: string }[]; // as máquinas com o operador agora
  permitida: boolean;                      // a permissão "durante o uso" já foi dada
  ultimoEnvio: number | null;              // quando a API recebeu o último lote (Date.now())
  pendentes: number;                       // pontos guardados esperando sinal
  semConexao: boolean;                     // o último envio falhou por rede
  ativar: () => Promise<void>;             // pede a permissão "durante o uso"
  atualizar: () => void;                   // relê as saídas (depois de saída, retorno ou avaria)
}

const ContextoRastreamento = createContext<Rastreamento | null>(null);

export function ProvedorRastreamento({ children }: { children: ReactNode }) {
  const { nome } = useOperador();
  const [maquinas, setMaquinas] = useState<{ id: number; tag: string }[]>([]);
  const [permissao, setPermissao] = useState<'concedida' | 'perguntar' | 'negada' | null>(null);
  const [gpsLigado, setGpsLigado] = useState(true);
  const [aberto, setAberto] = useState(AppState.currentState === 'active');
  const [versao, setVersao] = useState(0); // muda no atualizar(): os efeitos rodam de novo
  const [ultimoEnvio, setUltimoEnvio] = useState<number | null>(null);
  const [pendentes, setPendentes] = useState(0);
  const [semConexao, setSemConexao] = useState(false);

  // useRef: a fila muda a cada leitura do GPS, mas a tela só precisa do TAMANHO dela (pendentes)
  const fila = useRef<PontoNaFila[]>([]);
  const ultimoGuardado = useRef<PontoGps | null>(null);
  const enviando = useRef(false);

  const guardarFila = useCallback(() => {
    setPendentes(fila.current.length);
    AsyncStorage.setItem(CHAVE_FILA, JSON.stringify(fila.current)).catch(() => {}); // falhou: só vale até fechar
  }, []);

  // 1. Pontos que ficaram na fila da última vez (o app foi fechado sem sinal)
  useEffect(() => {
    AsyncStorage.getItem(CHAVE_FILA)
      .then(texto => {
        if (texto) {
          fila.current = [...JSON.parse(texto), ...fila.current];
          setPendentes(fila.current.length);
        }
      })
      .catch(() => {});
  }, []);

  // 2. O app está aberto? (AppState: 'active' na tela; 'background' com a tela bloqueada ou outro app)
  useEffect(() => {
    const assinatura = AppState.addEventListener('change', situacao => setAberto(situacao === 'active'));
    return () => assinatura.remove();
  }, []);

  // 3. Quais máquinas estão com o operador. Relê ao abrir o app e a cada atualizar().
  useEffect(() => {
    if (!nome || !aberto) {
      return;
    }
    let cancelado = false;
    buscarSaidasDoOperador(nome)
      .then(saidas => {
        if (!cancelado) {
          setMaquinas(saidas.map(({ maquina }) => ({ id: maquina.id, tag: maquina.tag })));
        }
      })
      .catch(() => {}); // sem rede: fica com a lista que já tinha
    return () => {
      cancelado = true;
    };
  }, [nome, aberto, versao]);

  // 4. A permissão (só LÊ; quem pede é o ativar(), com o operador sabendo por quê)
  useEffect(() => {
    if (!aberto) {
      return;
    }
    Location.getForegroundPermissionsAsync()
      .then(r => setPermissao(r.granted ? 'concedida' : r.canAskAgain ? 'perguntar' : 'negada'))
      .catch(() => setPermissao('perguntar'));
  }, [aberto, versao]);

  // 5. Envia a fila: um lote por máquina, até esvaziar ou a rede falhar
  const enviarFila = useCallback(async () => {
    if (enviando.current) {
      return; // um envio por vez (o relógio pode disparar com outro em andamento)
    }
    enviando.current = true;
    try {
      let lote = proximoLote(fila.current);
      while (lote) {
        try {
          await enviarPosicoes(lote.maquinaId, lote.pontos.map(({ maquinaId: _, ...ponto }) => ponto));
          fila.current = semOsPontos(fila.current, lote.pontos);
          setUltimoEnvio(Date.now());
          setSemConexao(false);
        } catch (e) {
          if (!(e instanceof ErroApi) || e.status === 0 || e.status >= 500) {
            setSemConexao(true); // sem rede ou API fora: os pontos esperam o próximo ciclo
            break;
          }
          if (e.status === 409) {
            // A saída acabou (retorno ou O.S.): a API não aceita mais nada dessa máquina
            fila.current = semAMaquina(fila.current, lote.maquinaId);
            setVersao(v => v + 1);
          } else {
            fila.current = semOsPontos(fila.current, lote.pontos); // 400: recusados de vez
          }
        }
        lote = proximoLote(fila.current);
      }
    } finally {
      guardarFila();
      enviando.current = false;
    }
  }, [guardarFila]);

  // 6. Com o app aberto: envia a cada 30 s (e logo ao abrir, o que ficou guardado)
  useEffect(() => {
    if (!aberto) {
      return;
    }
    enviarFila();
    const relogio = setInterval(enviarFila, INTERVALO_ENVIO_MS);
    return () => clearInterval(relogio);
  }, [aberto, enviarFila]);

  // 7. O GPS: só com máquina, permissão e o app aberto
  const rastrear = maquinas.length > 0 && permissao === 'concedida' && aberto;
  const ids = maquinas.map(m => m.id).join(','); // texto: dependência estável para o efeito
  useEffect(() => {
    if (!rastrear) {
      return;
    }
    let assinatura: Location.LocationSubscription | null = null;
    let cancelado = false;
    const maquinaIds = ids.split(',').map(Number);
    ultimoGuardado.current = null; // começou (ou recomeçou): a primeira leitura sempre vale

    (async () => {
      const ligado = await Location.hasServicesEnabledAsync().catch(() => true);
      setGpsLigado(ligado);
      if (!ligado || cancelado) {
        return;
      }
      try {
        // A cada 30 s (Android); a decisão do que guardar fica com deveGuardar (fila-posicoes.ts)
        const s = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: INTERVALO_LEITURA_MS, distanceInterval: 0 },
          leitura => {
            const ponto: PontoGps = {
              latitude: leitura.coords.latitude,
              longitude: leitura.coords.longitude,
              precisao: leitura.coords.accuracy ?? 0,
              data: new Date(leitura.timestamp).toISOString(),
            };
            if (deveGuardar(ultimoGuardado.current, ponto)) {
              ultimoGuardado.current = ponto;
              fila.current = comNovoPonto(fila.current, maquinaIds, ponto);
              guardarFila();
            }
          },
        );
        if (cancelado) {
          s.remove(); // o efeito acabou enquanto o GPS ligava
        } else {
          assinatura = s;
        }
      } catch {
        setGpsLigado(false);
      }
    })();

    return () => {
      cancelado = true;
      assinatura?.remove();
    };
  }, [rastrear, ids, versao, guardarFila]);

  const ativar = useCallback(async () => {
    const r = await Location.requestForegroundPermissionsAsync();
    setPermissao(r.granted ? 'concedida' : r.canAskAgain ? 'perguntar' : 'negada');
  }, []);

  const atualizar = useCallback(() => setVersao(v => v + 1), []);

  const estado: EstadoLocalizacao =
    maquinas.length === 0
      ? 'sem-saida'
      : permissao === 'negada'
        ? 'negada'
        : permissao !== 'concedida'
          ? 'sem-permissao'
          : !gpsLigado
            ? 'gps-desligado'
            : 'ativa';

  return (
    <ContextoRastreamento.Provider
      value={{ estado, maquinas, permitida: permissao === 'concedida', ultimoEnvio, pendentes, semConexao, ativar, atualizar }}
    >
      {children}
    </ContextoRastreamento.Provider>
  );
}

// Hook para as telas: const { estado, ativar } = useRastreamento();
export function useRastreamento(): Rastreamento {
  const rastreamento = useContext(ContextoRastreamento);
  if (!rastreamento) {
    throw new Error('useRastreamento precisa estar dentro do <ProvedorRastreamento> (veja o _layout.tsx)');
  }
  return rastreamento;
}
