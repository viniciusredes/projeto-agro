import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTema } from '@/tema';

// Botões de escolha única lado a lado (segmentados), ex.: Posto | Tanque, Sistema | Claro | Escuro.
// Componente GENÉRICO: <T extends string> faz o TypeScript conferir que o valor escolhido é um
// dos valores das opções (ex.: 'Posto' | 'Tanque'), sem perder o tipo de quem usa.
export interface OpcaoSegmentada<T extends string> {
  valor: T;
  rotulo: string;
}

interface Props<T extends string> {
  opcoes: OpcaoSegmentada<T>[];
  valor: T;
  aoEscolher: (valor: T) => void;
  rotulo: string; // lido pelo leitor de tela (ex.: "Tema do app")
}

export function EscolhaSegmentada<T extends string>({ opcoes, valor, aoEscolher, rotulo }: Props<T>) {
  const tema = useTema();

  return (
    <View style={[estilos.grupo, { borderColor: tema.borda }]} accessibilityRole="radiogroup" accessibilityLabel={rotulo}>
      {opcoes.map(opcao => {
        const ativa = opcao.valor === valor;
        return (
          <Pressable
            key={opcao.valor}
            onPress={() => aoEscolher(opcao.valor)}
            accessibilityRole="radio"
            accessibilityState={{ checked: ativa }}
            style={({ pressed }) => [
              estilos.opcao,
              { backgroundColor: ativa ? tema.primaria : 'transparent', opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[estilos.texto, { color: ativa ? tema.sobrePrimaria : tema.texto }]}>{opcao.rotulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { flexDirection: 'row', borderWidth: 1, borderRadius: 24, padding: 4, gap: 4 },
  opcao: { flex: 1, minHeight: 44, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  texto: { fontSize: 15, fontWeight: '700' },
});
