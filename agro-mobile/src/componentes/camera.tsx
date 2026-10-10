import { CameraType, CameraView, FlashMode, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Aviso, DadosAviso } from '@/componentes/aviso';
import { useTema } from '@/tema';

// Câmera de FOTO reutilizável: pede a permissão, fotografa e mostra a prévia para o operador
// conferir antes de usar. (A do escanear.tsx só LÊ QR codes, sem tirar foto.)

export interface FotoCapturada {
  uri: string;    // arquivo temporário no aparelho (para mostrar a prévia)
  base64: string; // os bytes da foto em texto (para enviar à API)
}

interface PropsCamera {
  aoConfirmar: (foto: FotoCapturada) => void;
  enviando?: boolean; // quem usa a câmera avisa enquanto envia a foto
}

const PROXIMO_FLASH: Record<'off' | 'on' | 'auto', 'off' | 'on' | 'auto'> = { off: 'auto', auto: 'on', on: 'off' };
const NOME_FLASH = { off: 'desligado', auto: 'automático', on: 'ligado' };

// Se a câmera não responder nesse tempo, o app avisa em vez de ficar "processando" para sempre
const TEMPO_LIMITE_MS = 15000;

// Erro da câmera no formato do aviso do app
function avisoDeErro(mensagem: string): DadosAviso {
  return {
    tom: 'erro',
    titulo: 'Não foi possível tirar a foto',
    mensagem,
    botoes: [{ texto: 'Tentar de novo', principal: true }],
  };
}

export default function Camera({ aoConfirmar, enviando = false }: PropsCamera) {
  const tema = useTema();
  const [permissao, pedirPermissao] = useCameraPermissions();
  const [lado, setLado] = useState<CameraType>('back');
  const [flash, setFlash] = useState<Exclude<FlashMode, 'screen'>>('off');
  const [fotografando, setFotografando] = useState(false);
  // A câmera leva um instante para ligar: fotografar antes disso dá erro
  const [pronta, setPronta] = useState(false);
  const [foto, setFoto] = useState<FotoCapturada | null>(null);
  const [aviso, setAviso] = useState<DadosAviso | null>(null);
  // ref: um "controle remoto" do componente da câmera, para chamar o takePictureAsync
  const camera = useRef<CameraView>(null);

  async function fotografar() {
    if (!camera.current || !pronta || fotografando) {
      return;
    }
    setFotografando(true);
    let relogio: ReturnType<typeof setTimeout> | undefined;
    try {
      // Promise.race: vale o que terminar PRIMEIRO, a foto ou o tempo limite
      const resultado = await Promise.race([
        camera.current.takePictureAsync({
          quality: 0.5, // JPEG mais comprimido: a foto de um celular passaria fácil dos 2 MB da API
          base64: true, // além do arquivo, os bytes em texto, que vão no JSON
          // NÃO usar skipProcessing: ele pula a compressão (o quality é ignorado)
        }),
        new Promise<never>((_, rejeitar) => {
          relogio = setTimeout(() => rejeitar(new Error('A câmera demorou demais para responder.')), TEMPO_LIMITE_MS);
        }),
      ]);
      if (!resultado.base64) {
        // Nunca falhar em silêncio: sem os bytes, não há o que enviar
        setAviso(avisoDeErro('A câmera não devolveu a imagem. Tente de novo.'));
        return;
      }
      setFoto({ uri: resultado.uri, base64: resultado.base64 });
    } catch (e) {
      // A mensagem do erro ajuda a descobrir o problema (ex.: câmera ainda não pronta, memória)
      setAviso(avisoDeErro(e instanceof Error ? e.message : 'Tente de novo.'));
    } finally {
      clearTimeout(relogio);
      setFotografando(false);
    }
  }

  // 1) Ainda descobrindo se há permissão
  if (!permissao) {
    return (
      <View style={[estilos.centro, { backgroundColor: tema.fundo }]}>
        <ActivityIndicator size="large" color={tema.primaria} />
      </View>
    );
  }

  // 2) Sem permissão: explica POR QUE precisa da câmera antes de pedir (o mesmo do escanear.tsx)
  if (!permissao.granted) {
    return (
      <View style={[estilos.centro, { backgroundColor: tema.fundo }]}>
        <Text style={[estilos.titulo, { color: tema.texto }]}>Permitir a câmera</Text>
        <Text style={[estilos.texto, { color: tema.textoSuave }]}>
          A foto mostra para a oficina o que aconteceu com a máquina.
        </Text>
        <Pressable
          onPress={permissao.canAskAgain ? pedirPermissao : () => Linking.openSettings()}
          accessibilityRole="button"
          style={({ pressed }) => [estilos.botao, { backgroundColor: tema.primaria, opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={[estilos.botaoTexto, { color: tema.sobrePrimaria }]}>
            {permissao.canAskAgain ? 'Permitir câmera' : 'Abrir configurações'}
          </Text>
        </Pressable>
      </View>
    );
  }

  // 3) Foto tirada: prévia para conferir (borrada? cortou a peça?) antes de enviar
  if (foto) {
    return (
      <View style={estilos.tela}>
        {/* resizeMethod="resize": a foto cheia (~3000 x 4000) é reduzida antes de aparecer (ver galeria-fotos.tsx) */}
        <Image
          source={{ uri: foto.uri }}
          style={estilos.previa}
          resizeMode="contain"
          resizeMethod="resize"
          accessibilityLabel="Prévia da foto"
        />
        <View style={estilos.botoesPrevia}>
          <Pressable
            onPress={() => setFoto(null)}
            disabled={enviando}
            accessibilityRole="button"
            style={({ pressed }) => [estilos.botao, estilos.botaoRefazer, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[estilos.botaoTexto, { color: '#ffffff' }]}>Refazer</Text>
          </Pressable>
          <Pressable
            onPress={() => aoConfirmar(foto)}
            disabled={enviando}
            accessibilityRole="button"
            accessibilityState={{ busy: enviando }}
            style={({ pressed }) => [estilos.botao, estilos.botaoMetade, { backgroundColor: tema.sinal, opacity: pressed ? 0.8 : 1 }]}
          >
            {enviando ? (
              <ActivityIndicator color="#2b1600" />
            ) : (
              <Text style={[estilos.botaoTexto, { color: '#2b1600' }]}>Usar esta foto</Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  // 4) Câmera aberta. Os controles ficam POR CIMA, como irmãos da CameraView (o mesmo do escanear.tsx)
  return (
    <View style={estilos.tela}>
      <CameraView
        ref={camera}
        style={StyleSheet.absoluteFill}
        facing={lado}
        flash={flash}
        // A animação padrão pinta a tela de BRANCO no clique; o "Processando a foto…" já dá o retorno
        animateShutter={false}
        onCameraReady={() => setPronta(true)}
      />
      <View style={estilos.controlesTopo}>
        {/* Flash só na câmera de trás; na da frente, um espaço vazio mantém o "Virar câmera" à direita */}
        {lado === 'back' ? (
          <Pressable
            onPress={() => setFlash(atual => PROXIMO_FLASH[atual])}
            accessibilityRole="button"
            accessibilityLabel={`Flash ${NOME_FLASH[flash]}. Toque para trocar`}
            style={estilos.controle}
          >
            <Text style={estilos.controleTexto}>Flash: {NOME_FLASH[flash]}</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <Pressable
          onPress={() => {
            setPronta(false); // trocar de lente religa a câmera
            setFlash('off');  // a câmera da frente não tem flash: pedir flash a ela pode travar a captura
            setLado(atual => (atual === 'back' ? 'front' : 'back'));
          }}
          accessibilityRole="button"
          style={estilos.controle}
        >
          <Text style={estilos.controleTexto}>Virar câmera</Text>
        </Pressable>
      </View>
      {/* Processar a foto e gerar o base64 leva alguns segundos: o operador precisa VER que algo acontece */}
      {fotografando && (
        <View style={estilos.processando} accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={estilos.controleTexto}>Processando a foto…</Text>
        </View>
      )}
      <View style={estilos.base}>
        <Pressable
          onPress={fotografar}
          disabled={!pronta || fotografando}
          accessibilityRole="button"
          accessibilityLabel="Tirar foto"
          accessibilityState={{ disabled: !pronta || fotografando, busy: fotografando }}
          style={({ pressed }) => [estilos.disparador, { opacity: !pronta || pressed || fotografando ? 0.5 : 1 }]}
        >
          <View style={estilos.disparadorMiolo} />
        </Pressable>
      </View>
      <Aviso dados={aviso} aoFechar={() => setAviso(null)} />
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#000000' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  titulo: { fontSize: 22, fontWeight: '800' },
  texto: { fontSize: 16, textAlign: 'center' },
  botao: { minHeight: 52, paddingHorizontal: 24, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  botaoTexto: { fontSize: 17, fontWeight: '700' },
  controlesTopo: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  controle: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.55)' },
  controleTexto: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  base: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  // O botão redondo de "tirar foto" que todo app de câmera tem (área de toque de 80 px)
  disparador: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  disparadorMiolo: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#ffffff' },
  processando: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  previa: { flex: 1, width: '100%' },
  botoesPrevia: { flexDirection: 'row', gap: 12, padding: 16, paddingBottom: 32 },
  botaoMetade: { flex: 1 },
  botaoRefazer: { flex: 1, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.6)' },
});
