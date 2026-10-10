import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PreferenciaTema, usePreferenciaTema } from '@/contextos/preferencia-tema';
import { useTema } from '@/tema';

// Botões de escolha única (segmentados): Sistema | Claro | Escuro
const OPCOES: { valor: PreferenciaTema; rotulo: string }[] = [
  { valor: 'sistema', rotulo: 'Sistema' },
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
];

export function SeletorTema() {
  const tema = useTema();
  const { preferencia, escolher } = usePreferenciaTema();

  return (
    <View style={[estilos.grupo, { borderColor: tema.borda }]} accessibilityRole="radiogroup" accessibilityLabel="Tema do app">
      {OPCOES.map(opcao => {
        const ativa = opcao.valor === preferencia;
        return (
          <Pressable
            key={opcao.valor}
            onPress={() => escolher(opcao.valor)}
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
