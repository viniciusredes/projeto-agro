import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { idDaMaquinaNoQr } from '@/qr';
import { useTema } from '@/tema';

// Lê o QR code colado na máquina e abre a ficha dela
export default function Escanear() {
  const tema = useTema();
  // [situação da permissão, função que pede a permissão ao usuário]
  const [permissao, pedirPermissao] = useCameraPermissions();
  const [aviso, setAviso] = useState<string | null>(null);
  // A câmera dispara a leitura VÁRIAS vezes por segundo enquanto o QR está na frente.
  // useRef guarda um valor que NÃO redesenha a tela ao mudar: serve de "trava" para navegar uma vez só.
  const jaLeu = useRef(false);

  function aoLer({ data }: BarcodeScanningResult) {
    if (jaLeu.current) {
      return;
    }
    const id = idDaMaquinaNoQr(data);
    if (id === null) {
      setAviso('Este QR não é de uma máquina do Agro Frota.');
      return;
    }
    jaLeu.current = true;
    // replace: a câmera SAI da pilha; o Voltar da ficha volta para a lista, não para a câmera
    router.replace({ pathname: '/maquina/[id]', params: { id } });
  }

  // 1) Ainda descobrindo se há permissão
  if (!permissao) {
    return (
      <View style={[estilos.centro, { backgroundColor: tema.fundo }]}>
        <ActivityIndicator size="large" color={tema.primaria} />
      </View>
    );
  }

  // 2) Sem permissão: explica POR QUE precisa da câmera antes de pedir
  if (!permissao.granted) {
    return (
      <View style={[estilos.centro, { backgroundColor: tema.fundo }]}>
        <Text style={[estilos.titulo, { color: tema.texto }]}>Permitir a câmera</Text>
        <Text style={[estilos.texto, { color: tema.textoSuave }]}>
          A câmera é usada só para ler o QR code colado nas máquinas.
        </Text>
        <Pressable
          // Se o usuário negou de vez, o sistema não pergunta mais: só pelas configurações do celular
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

  // 3) Com permissão: a câmera ocupa a tela, lendo só QR codes
  return (
    <View style={estilos.tela}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={aoLer}
      />
      {/* Moldura e instrução por cima da câmera */}
      <View style={estilos.sobreposicao} pointerEvents="none">
        <View style={estilos.moldura} />
        <Text style={estilos.instrucao}>Aponte para o QR code da máquina</Text>
        {aviso && <Text style={estilos.aviso}>{aviso}</Text>}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#000000' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  titulo: { fontSize: 22, fontWeight: '800' },
  texto: { fontSize: 16, textAlign: 'center' },
  botao: { minHeight: 52, paddingHorizontal: 28, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  botaoTexto: { fontSize: 17, fontWeight: '700' },
  // absoluteFill = ocupar a tela toda por cima (top/left/right/bottom 0). No React Native 0.86 ele
  // já é um objeto comum (o antigo absoluteFillObject foi removido)
  sobreposicao: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 20 },
  moldura: { width: 240, height: 240, borderWidth: 4, borderColor: '#f38302', borderRadius: 24 },
  instrucao: { color: '#ffffff', fontSize: 17, fontWeight: '700', textShadowColor: '#000000', textShadowRadius: 4 },
  aviso: {
    color: '#ffffff',
    backgroundColor: 'rgba(179, 38, 30, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    overflow: 'hidden',
    fontWeight: '600',
  },
});
