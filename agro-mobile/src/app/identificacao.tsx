import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useOperador } from '@/contextos/operador';
import { useTema } from '@/tema';

// "Quem é você?": o nome fica salvo no aparelho e preenche o campo "operador" das saídas.
export default function Identificacao() {
  const tema = useTema();
  const { nome: nomeAtual, definir } = useOperador();
  // Formulário CONTROLADO: o texto do campo vive no estado (o papel do FormControl)
  const [nome, setNome] = useState(nomeAtual ?? '');
  const [salvando, setSalvando] = useState(false);

  const valido = nome.trim().length > 0; // a mesma regra da API: não aceita só espaços

  async function continuar() {
    if (!valido || salvando) {
      return;
    }
    setSalvando(true);
    await definir(nome);
    // replace (e não push): a identificação SAI da pilha, então o Voltar não volta para ela
    router.replace('/');
  }

  return (
    // Sobe o conteúdo quando o teclado abre (senão o botão fica escondido atrás dele)
    <KeyboardAvoidingView
      style={[estilos.tela, { backgroundColor: tema.fundo }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={estilos.conteudo}>
        <Text style={[estilos.titulo, { color: tema.texto }]}>Quem é você?</Text>
        <Text style={{ color: tema.textoSuave, fontSize: 16 }}>
          Seu nome vai nas saídas de máquina que você registrar neste aparelho.
        </Text>

        <Text style={[estilos.rotulo, { color: tema.texto }]} nativeID="rotulo-nome">
          Seu nome
        </Text>
        <TextInput
          value={nome}
          onChangeText={setNome}
          placeholder="Ex.: João da Silva"
          placeholderTextColor={tema.textoSuave}
          autoFocus
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="done"
          onSubmitEditing={continuar}
          accessibilityLabelledBy="rotulo-nome"
          style={[estilos.campo, { color: tema.texto, backgroundColor: tema.cartao, borderColor: tema.borda }]}
        />

        <Pressable
          onPress={continuar}
          disabled={!valido || salvando}
          accessibilityRole="button"
          accessibilityState={{ disabled: !valido || salvando }}
          style={({ pressed }) => [
            estilos.botao,
            { backgroundColor: tema.primaria, opacity: !valido ? 0.4 : pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={[estilos.botaoTexto, { color: tema.sobrePrimaria }]}>Continuar</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { padding: 24, gap: 12 },
  titulo: { fontSize: 28, fontWeight: '800' },
  rotulo: { marginTop: 12, fontSize: 15, fontWeight: '600' },
  campo: { minHeight: 52, paddingHorizontal: 14, borderWidth: 1, borderRadius: 12, fontSize: 17 },
  botao: { minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  botaoTexto: { fontSize: 17, fontWeight: '700' },
});
