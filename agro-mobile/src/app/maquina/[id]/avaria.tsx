import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { mensagemDeErro } from '@/api';
import { Aviso, DadosAviso } from '@/componentes/aviso';
import { useRequisicao } from '@/hooks/use-requisicao';
import { buscarFicha } from '@/servicos/maquinas';
import { abrirOS } from '@/servicos/ordens-servico';
import { useTema } from '@/tema';
import { formatarHoras, validarHorimetro } from '@/validacao';

// Relatar avaria: abre uma O.S. CORRETIVA para a máquina (/maquina/1/avaria).
// Rota ANINHADA: o arquivo fica em maquina/[id]/, então o mesmo [id] da ficha vale aqui.
export default function RelatarAvaria() {
  const tema = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const idNumero = Number(id);
  const buscar = useCallback(() => buscarFicha(idNumero), [idNumero]);
  const { dados, erro, carregando } = useRequisicao(buscar);

  const [descricao, setDescricao] = useState('');
  const [horimetro, setHorimetro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<DadosAviso | null>(null);

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
        <Text style={{ color: tema.erro, fontSize: 16, textAlign: 'center' }}>{erro}</Text>
      </View>
    );
  }

  const { maquina, saidaAberta } = dados;

  // A mesma validação do retorno (M4): reaproveitar a função pura, não copiar a regra
  const resultado = validarHorimetro(horimetro, maquina.horimetro);
  const valido = descricao.trim().length > 0 && resultado.valido;

  // Ação que TIRA a máquina de operação: confirma antes, dizendo o que vai acontecer
  function confirmar() {
    if (!valido || !resultado.valido || enviando) {
      return;
    }
    const consequencia = saidaAberta
      ? `A saída de ${saidaAberta.operador} será encerrada e a ${maquina.tag} irá para a oficina.`
      : `A ${maquina.tag} irá para a oficina e não poderá sair até a O.S. ser fechada.`;
    const valorHorimetro = resultado.valor;
    setAviso({
      tom: 'alerta',
      titulo: 'Abrir O.S. corretiva?',
      mensagem: consequencia,
      botoes: [
        { texto: 'Abrir O.S.', principal: true, aoTocar: () => enviar(valorHorimetro) },
        { texto: 'Cancelar' },
      ],
    });
  }

  async function enviar(valorHorimetro: number) {
    setEnviando(true);
    try {
      const resposta = await abrirOS({
        maquinaId: maquina.id,
        tipo: 'Corretiva',
        descricao: descricao.trim(),
        horimetro: valorHorimetro,
      });
      const saida = resposta.movimentacaoEncerrada;
      // M7: aproveita que o operador está ao lado da máquina e já oferece a foto da avaria
      setAviso({
        tom: 'sucesso',
        titulo: `O.S. nº ${resposta.ordemServico.id} aberta`,
        mensagem: saida
          ? `Saída encerrada automaticamente (${formatarHoras(saida.horasTrabalhadas ?? 0)} h trabalhadas). Quer fotografar a avaria?`
          : 'A máquina está na oficina. Quer fotografar a avaria?',
        botoes: [
          // replace: a câmera TOMA o lugar do relato; o Voltar dela vai para a ficha
          {
            texto: 'Fotografar avaria',
            principal: true,
            aoTocar: () => router.replace({ pathname: '/maquina/[id]/foto-avaria', params: { id: maquina.id } }),
          },
          // back: volta para a ficha, que se atualiza ao ganhar o foco
          { texto: 'Agora não', aoTocar: () => router.back() },
        ],
        // A O.S. já foi aberta: fechar pelo Voltar também leva à ficha (o formulário não serve mais)
        aoDispensar: () => router.back(),
      });
    } catch (e) {
      // Ex.: 409 se outra pessoa já abriu uma O.S. para esta máquina
      setAviso({
        tom: 'erro',
        titulo: 'Não foi possível abrir a O.S.',
        mensagem: mensagemDeErro(e),
        botoes: [{ texto: 'OK', principal: true }],
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ backgroundColor: tema.fundo }}
        contentContainerStyle={estilos.tela}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[estilos.titulo, { color: tema.texto }]}>
          {maquina.tag} · {maquina.modelo}
        </Text>

        {/* Aviso do que vai acontecer, ANTES de o operador preencher (regra da API: OS3 do back-end) */}
        {saidaAberta && (
          <View style={[estilos.aviso, { backgroundColor: tema.tons.alerta.fundo }]}>
            <Text style={[estilos.avisoTexto, { color: tema.tons.alerta.texto }]}>
              A máquina está em campo com {saidaAberta.operador}. Ao abrir a O.S., a saída será encerrada com o
              horímetro informado.
            </Text>
          </View>
        )}

        <Text style={[estilos.rotulo, { color: tema.texto }]} nativeID="rotulo-descricao">
          O que aconteceu?
        </Text>
        <TextInput
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Ex.: vazamento de óleo no hidráulico"
          placeholderTextColor={tema.textoSuave}
          multiline
          autoFocus
          accessibilityLabelledBy="rotulo-descricao"
          style={[estilos.campo, estilos.campoLongo, { color: tema.texto, backgroundColor: tema.cartao, borderColor: tema.borda }]}
        />

        <Text style={[estilos.rotulo, { color: tema.texto }]} nativeID="rotulo-horimetro-avaria">
          Horímetro agora (h)
        </Text>
        <TextInput
          value={horimetro}
          onChangeText={setHorimetro}
          placeholder={`Mínimo ${formatarHoras(maquina.horimetro)}`}
          placeholderTextColor={tema.textoSuave}
          keyboardType="decimal-pad"
          accessibilityLabelledBy="rotulo-horimetro-avaria"
          style={[
            estilos.campo,
            {
              color: tema.texto,
              backgroundColor: tema.cartao,
              borderColor: !resultado.valido && resultado.erro ? tema.erro : tema.borda,
            },
          ]}
        />
        {!resultado.valido && resultado.erro && (
          <Text style={[estilos.dica, { color: tema.erro }]} accessibilityLiveRegion="polite">
            {resultado.erro}
          </Text>
        )}

        <Pressable
          onPress={confirmar}
          disabled={!valido || enviando}
          accessibilityRole="button"
          accessibilityState={{ disabled: !valido || enviando, busy: enviando }}
          style={({ pressed }) => [
            estilos.botao,
            { backgroundColor: tema.sinal, opacity: !valido ? 0.4 : pressed ? 0.8 : 1 },
          ]}
        >
          {enviando ? (
            <ActivityIndicator color="#2b1600" />
          ) : (
            <Text style={estilos.botaoTexto}>Abrir O.S. corretiva</Text>
          )}
        </Pressable>
      </ScrollView>
      <Aviso dados={aviso} aoFechar={() => setAviso(null)} />
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  tela: { padding: 16, gap: 10 },
  titulo: { fontSize: 22, fontWeight: '800' },
  aviso: { padding: 14, borderRadius: 12 },
  avisoTexto: { fontSize: 15, fontWeight: '600', lineHeight: 21 },
  rotulo: { marginTop: 6, fontSize: 15, fontWeight: '600' },
  campo: { minHeight: 52, paddingHorizontal: 14, borderWidth: 1, borderRadius: 12, fontSize: 17 },
  campoLongo: { minHeight: 100, paddingTop: 12, textAlignVertical: 'top' },
  dica: { fontSize: 14, fontWeight: '600' },
  // Laranja (o SINAL da marca) com texto escuro: ação que pede atenção, diferente do verde das ações comuns
  botao: { minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  botaoTexto: { fontSize: 17, fontWeight: '700', color: '#2b1600' },
});
