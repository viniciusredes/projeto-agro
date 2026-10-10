import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { mensagemDeErro } from '@/api';
import { EtiquetaStatus } from '@/componentes/etiqueta-status';
import { useOperador } from '@/contextos/operador';
import { useRequisicao } from '@/hooks/use-requisicao';
import { buscarFicha, registrarSaida } from '@/servicos/maquinas';
import { useTema } from '@/tema';

// Ficha da máquina: /maquina/1, /maquina/2... O nome do arquivo [id].tsx cria a rota DINÂMICA
// (o ":id" das rotas do Angular), e o valor chega por useLocalSearchParams.
export default function FichaMaquina() {
  const tema = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const idNumero = Number(id); // na URL tudo é texto (como o numberAttribute do Angular)

  // useCallback: a função de busca só muda quando o id muda, então o useRequisicao não
  // dispara a busca de novo a cada renderização (a função precisa ser "estável")
  const buscar = useCallback(() => buscarFicha(idNumero), [idNumero]);
  const { dados, erro, carregando, recarregar } = useRequisicao(buscar);

  if (carregando) {
    return (
      <View style={[estilos.centro, { backgroundColor: tema.fundo }]}>
        <ActivityIndicator size="large" color={tema.primaria} />
      </View>
    );
  }

  if (!dados) {
    return (
      <View style={[estilos.centro, { backgroundColor: tema.fundo }]}>
        <Text style={[estilos.texto, { color: tema.erro, textAlign: 'center' }]}>{erro}</Text>
      </View>
    );
  }

  const { maquina, saidaAberta } = dados;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* O título da barra vira a tag da máquina */}
      <Stack.Screen options={{ title: maquina.tag }} />
      <ScrollView
        style={{ backgroundColor: tema.fundo }}
        contentContainerStyle={estilos.tela}
        keyboardShouldPersistTaps="handled" // o toque no botão funciona com o teclado aberto
      >
        {/* Cabeçalho da ficha */}
        <View style={[estilos.cartao, { backgroundColor: tema.cartao, borderColor: tema.borda }]}>
          <Text style={[estilos.modelo, { color: tema.texto }]}>{maquina.modelo}</Text>
          <EtiquetaStatus status={maquina.status} />
          <Text style={[estilos.texto, { color: tema.textoSuave }]}>
            Horímetro: {maquina.horimetro.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h
          </Text>
        </View>

        {/* O que o operador pode fazer depende da situação da máquina */}
        {maquina.status === 'Disponível' && <FormularioSaida maquinaId={maquina.id} aoRegistrar={recarregar} />}

        {maquina.status === 'Em Operação' && saidaAberta && (
          <View style={[estilos.cartao, { backgroundColor: tema.tons.info.fundo, borderColor: tema.borda }]}>
            <Text style={[estilos.subtitulo, { color: tema.tons.info.texto }]}>Em campo</Text>
            <Text style={[estilos.texto, { color: tema.texto }]}>
              {saidaAberta.operador} · {saidaAberta.frenteTrabalho}
            </Text>
            <Text style={[estilos.texto, { color: tema.textoSuave }]}>
              Saiu em {new Date(saidaAberta.dataSaida).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}{' '}
              com {saidaAberta.horimetroSaida.toLocaleString('pt-BR')} h
            </Text>
          </View>
        )}

        {maquina.status === 'Em Manutenção' && (
          <View style={[estilos.cartao, { backgroundColor: tema.tons.alerta.fundo, borderColor: tema.borda }]}>
            <Text style={[estilos.subtitulo, { color: tema.tons.alerta.texto }]}>Em manutenção</Text>
            <Text style={[estilos.texto, { color: tema.texto }]}>
              A máquina está na oficina e não pode sair até a O.S. ser fechada.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Formulário de saída: o operador já vem do aparelho (M2); só falta a frente de trabalho
function FormularioSaida({ maquinaId, aoRegistrar }: { maquinaId: number; aoRegistrar: () => void }) {
  const tema = useTema();
  const { nome } = useOperador();
  const [frente, setFrente] = useState('');
  const [enviando, setEnviando] = useState(false);

  const valido = frente.trim().length > 0 && !!nome;

  async function registrar() {
    if (!valido || enviando) {
      return;
    }
    setEnviando(true);
    try {
      const resposta = await registrarSaida(maquinaId, { operador: nome!, frenteTrabalho: frente.trim() });
      Alert.alert('Saída registrada', resposta.mensagem); // aviso nativo do Android/iOS
      aoRegistrar(); // recarrega a ficha: agora "Em campo"
    } catch (e) {
      // A mensagem é a da API (ex.: 409 se outra pessoa tirou a máquina antes)
      Alert.alert('Não foi possível registrar', mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={[estilos.cartao, { backgroundColor: tema.cartao, borderColor: tema.borda }]}>
      <Text style={[estilos.subtitulo, { color: tema.texto }]}>Registrar saída</Text>

      <View style={estilos.linha}>
        <Text style={[estilos.texto, { color: tema.textoSuave }]}>Operador: </Text>
        <Text style={[estilos.texto, { color: tema.texto, fontWeight: '700', flex: 1 }]}>{nome}</Text>
        <Link href="/identificacao" style={[estilos.link, { color: tema.primaria }]}>
          trocar
        </Link>
      </View>

      <Text style={[estilos.rotulo, { color: tema.texto }]} nativeID="rotulo-frente">
        Frente de trabalho
      </Text>
      <TextInput
        value={frente}
        onChangeText={setFrente}
        placeholder="Ex.: Talhão 5"
        placeholderTextColor={tema.textoSuave}
        returnKeyType="done"
        onSubmitEditing={registrar}
        accessibilityLabelledBy="rotulo-frente"
        style={[estilos.campo, { color: tema.texto, backgroundColor: tema.fundo, borderColor: tema.borda }]}
      />

      <Pressable
        onPress={registrar}
        disabled={!valido || enviando}
        accessibilityRole="button"
        accessibilityState={{ disabled: !valido || enviando, busy: enviando }}
        style={({ pressed }) => [
          estilos.botao,
          { backgroundColor: tema.primaria, opacity: !valido ? 0.4 : pressed ? 0.8 : 1 },
        ]}
      >
        {enviando ? (
          <ActivityIndicator color={tema.sobrePrimaria} />
        ) : (
          <Text style={[estilos.botaoTexto, { color: tema.sobrePrimaria }]}>Registrar saída</Text>
        )}
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  tela: { padding: 16, gap: 12 },
  cartao: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 8 },
  modelo: { fontSize: 22, fontWeight: '800' },
  subtitulo: { fontSize: 18, fontWeight: '700' },
  texto: { fontSize: 16 },
  linha: { flexDirection: 'row', alignItems: 'center' },
  link: { fontSize: 15, fontWeight: '600', paddingVertical: 8, paddingLeft: 12 },
  rotulo: { marginTop: 4, fontSize: 15, fontWeight: '600' },
  campo: { minHeight: 52, paddingHorizontal: 14, borderWidth: 1, borderRadius: 12, fontSize: 17 },
  botao: { minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  botaoTexto: { fontSize: 17, fontWeight: '700' },
});
