import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTema } from '@/tema';

// Aviso com a cara do app (substitui o Alert.alert do sistema).
// O Alert usa o diálogo NATIVO do Android/iOS: botões azuis em maiúsculas, sem as cores da marca e
// sem tema escuro. Este componente usa as mesmas cores, fontes e botões das telas.
//
// Uso: guarde o aviso num estado e passe para o componente; null = escondido.
//   const [aviso, setAviso] = useState<DadosAviso | null>(null);
//   setAviso({ tom: 'sucesso', titulo: 'Foto enviada', mensagem: '...', botoes: [{ texto: 'OK' }] });
//   <Aviso dados={aviso} aoFechar={() => setAviso(null)} />

export type TomAviso = 'sucesso' | 'erro' | 'alerta';

export interface BotaoAviso {
  texto: string;
  principal?: boolean;   // o botão cheio (a ação recomendada); os outros são contornados
  aoTocar?: () => void;  // roda DEPOIS de fechar o aviso
}

export interface DadosAviso {
  tom: TomAviso;
  titulo: string;
  mensagem: string;
  botoes: BotaoAviso[];
  aoDispensar?: () => void; // fechado SEM escolher (Voltar do Android); padrão: só fecha
}

const SIMBOLO: Record<TomAviso, string> = { sucesso: '✓', erro: '!', alerta: '!' };

export function Aviso({ dados, aoFechar }: { dados: DadosAviso | null; aoFechar: () => void }) {
  const tema = useTema();
  // erro usa a cor de erro do tema; sucesso e alerta, os tons das etiquetas de status
  const cores =
    dados?.tom === 'erro'
      ? { fundo: tema.erro, texto: tema.cartao }
      : dados
        ? { fundo: tema.tons[dados.tom].fundo, texto: tema.tons[dados.tom].texto }
        : null;

  function tocar(botao: BotaoAviso) {
    aoFechar();
    botao.aoTocar?.();
  }

  return (
    // transparent: o fundo escurecido deixa ver a tela por trás. O Voltar do Android fecha o aviso.
    <Modal
      visible={dados !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        const aoDispensar = dados?.aoDispensar;
        aoFechar();
        aoDispensar?.();
      }}
    >
      <View style={estilos.fundo}>
        {dados && cores && (
          <View
            style={[estilos.cartao, { backgroundColor: tema.cartao, borderColor: tema.borda }]}
            accessibilityRole="alert"
          >
            <View style={[estilos.simbolo, { backgroundColor: cores.fundo }]}>
              <Text style={[estilos.simboloTexto, { color: cores.texto }]}>{SIMBOLO[dados.tom]}</Text>
            </View>
            <Text style={[estilos.titulo, { color: tema.texto }]}>{dados.titulo}</Text>
            <Text style={[estilos.mensagem, { color: tema.textoSuave }]}>{dados.mensagem}</Text>

            <View style={estilos.botoes}>
              {dados.botoes.map(botao => (
                <Pressable
                  key={botao.texto}
                  onPress={() => tocar(botao)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    estilos.botao,
                    botao.principal
                      ? { backgroundColor: tema.primaria }
                      : { borderWidth: 1, borderColor: tema.borda },
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text style={[estilos.botaoTexto, { color: botao.principal ? tema.sobrePrimaria : tema.texto }]}>
                    {botao.texto}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0, 0, 0, 0.55)' },
  cartao: { padding: 24, borderRadius: 20, borderWidth: 1, gap: 10, alignItems: 'center' },
  simbolo: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  simboloTexto: { fontSize: 28, fontWeight: '800' },
  titulo: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  mensagem: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  // Botões empilhados e largos: fáceis de acertar com o dedo (e com luva, no campo)
  botoes: { alignSelf: 'stretch', gap: 10, marginTop: 8 },
  botao: { minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  botaoTexto: { fontSize: 17, fontWeight: '700' },
});
