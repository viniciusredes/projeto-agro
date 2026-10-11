import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { mensagemDeErro } from '@/api';
import { Aviso, DadosAviso } from '@/componentes/aviso';
import Camera, { FotoCapturada } from '@/componentes/camera';
import { EscolhaSegmentada, OpcaoSegmentada } from '@/componentes/escolha-segmentada';
import { useOperador } from '@/contextos/operador';
import { useRequisicao } from '@/hooks/use-requisicao';
import { OrigemAbastecimento } from '@/models/abastecimento';
import { buscarDadosParaAbastecer, registrarAbastecimento } from '@/servicos/abastecimentos';
import { useTema } from '@/tema';
import {
  formatarHoras, formatarReais, formatarTamanho, TAMANHO_MAXIMO_FOTO, tamanhoDoBase64, validarHorimetro, validarPositivo,
} from '@/validacao';

const ORIGENS: OpcaoSegmentada<OrigemAbastecimento>[] = [
  { valor: 'Posto', rotulo: 'Posto' },
  { valor: 'Tanque', rotulo: 'Tanque da fazenda' },
];

// Registrar abastecimento (/maquina/1/abastecimento). Vai para a conferência do gestor, na web.
export default function RegistrarAbastecimento() {
  // Regra dos hooks: todos antes de qualquer "return" antecipado
  const tema = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const idNumero = Number(id);
  const buscar = useCallback(() => buscarDadosParaAbastecer(idNumero), [idNumero]);
  const { dados, erro, carregando } = useRequisicao(buscar);
  const { nome } = useOperador();

  const [origem, setOrigem] = useState<OrigemAbastecimento>('Posto');
  const [litros, setLitros] = useState('');
  const [horimetro, setHorimetro] = useState('');
  const [posto, setPosto] = useState('');
  const [valor, setValor] = useState('');
  const [foto, setFoto] = useState<FotoCapturada | null>(null);
  const [cameraAberta, setCameraAberta] = useState(false);
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
        <Text style={[estilos.texto, { color: tema.erro, textAlign: 'center' }]}>{erro}</Text>
      </View>
    );
  }

  const { maquina, horimetroMinimo } = dados;
  const noPosto = origem === 'Posto';

  // Cada campo validado por uma função pura (validacao.ts): a tela só mostra o resultado
  const rLitros = validarPositivo(litros);
  const rHorimetro = validarHorimetro(horimetro, horimetroMinimo);
  const rValor = validarPositivo(valor);
  // Valor DERIVADO: calculado a cada digitação, não guardado em estado
  const precoLitro = rLitros.valido && rValor.valido ? rValor.valor / rLitros.valor : null;

  // O que ainda falta, dito em palavras (um botão apagado sem explicação parece defeito)
  const faltando = [
    !rLitros.valido && 'litros',
    !rHorimetro.valido && 'horímetro',
    noPosto && posto.trim() === '' && 'nome do posto',
    noPosto && !rValor.valido && 'valor pago',
    noPosto && !foto && 'foto do recibo',
  ].filter((item): item is string => typeof item === 'string');
  const pronto = faltando.length === 0 && !!nome;

  async function enviar() {
    if (!pronto || !rLitros.valido || !rHorimetro.valido || enviando) {
      return;
    }
    // A foto passa dos 2 MB? Avisa antes de gastar a internet do campo (a API recusaria com 413)
    if (foto && tamanhoDoBase64(foto.base64) > TAMANHO_MAXIMO_FOTO) {
      setAviso({
        tom: 'alerta',
        titulo: 'Foto grande demais',
        mensagem: `A foto tem ${formatarTamanho(tamanhoDoBase64(foto.base64))}; o máximo é 2 MB. Tire outra.`,
        botoes: [{ texto: 'Tirar outra', principal: true, aoTocar: () => setCameraAberta(true) }],
      });
      return;
    }

    setEnviando(true);
    try {
      const resposta = await registrarAbastecimento({
        maquinaId: maquina.id,
        operador: nome!,
        origem,
        litros: rLitros.valor,
        horimetro: rHorimetro.valor,
        // Posto: nome e valor pago. Tanque: nada disso (o custo vem do almoxarifado)
        ...(noPosto && rValor.valido ? { posto: posto.trim(), valorTotal: rValor.valor } : {}),
        ...(foto ? { comprovante: foto.base64 } : {}),
      });
      const ab = resposta.abastecimento;
      setAviso({
        tom: 'sucesso',
        titulo: 'Abastecimento enviado',
        mensagem:
          `${formatarHoras(ab.litros)} L na ${maquina.tag} (${formatarReais(ab.valorTotal)}, ${formatarReais(ab.precoLitro, 3)}/L). ` +
          'Ele vai para a conferência do gestor; acompanhe na página inicial.',
        botoes: [{ texto: 'Concluir', principal: true, aoTocar: () => router.back() }],
        aoDispensar: () => router.back(), // já foi enviado: fechar pelo Voltar também conclui
      });
    } catch (e) {
      // Ex.: 409 diesel insuficiente no tanque; 400 horímetro menor que o último registrado
      setAviso({ tom: 'erro', titulo: 'Não foi possível enviar', mensagem: mensagemDeErro(e), botoes: [{ texto: 'OK', principal: true }] });
    } finally {
      setEnviando(false);
    }
  }

  const corDaBorda = (r: { valido: boolean; erro?: string | null }) => (!r.valido && r.erro ? tema.erro : tema.borda);
  const estiloCampo = [estilos.campo, { color: tema.texto, backgroundColor: tema.cartao }];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: `Abastecer ${maquina.tag}` }} />
      <ScrollView style={{ backgroundColor: tema.fundo }} contentContainerStyle={estilos.tela} keyboardShouldPersistTaps="handled">
        <Text style={[estilos.subtitulo, { color: tema.texto }]}>{maquina.tag} · {maquina.modelo}</Text>

        <Text style={[estilos.rotulo, { color: tema.texto }]}>De onde veio o combustível?</Text>
        <EscolhaSegmentada opcoes={ORIGENS} valor={origem} aoEscolher={setOrigem} rotulo="Origem do combustível" />

        {/* O tanque não tem recibo nem preço digitado: explica de onde vem o custo */}
        {!noPosto && (
          <View style={[estilos.info, { backgroundColor: tema.tons.info.fundo }]}>
            <Text style={[estilos.texto, { color: tema.tons.info.texto }]}>
              O diesel sai do tanque da fazenda e é baixado do estoque na hora. O custo é o da última compra do diesel.
            </Text>
          </View>
        )}

        <Text style={[estilos.rotulo, { color: tema.texto }]} nativeID="rotulo-litros">Litros abastecidos</Text>
        <TextInput
          value={litros}
          onChangeText={setLitros}
          placeholder="Ex.: 120,5"
          placeholderTextColor={tema.textoSuave}
          keyboardType="decimal-pad"
          accessibilityLabelledBy="rotulo-litros"
          style={[estiloCampo, { borderColor: corDaBorda(rLitros) }]}
        />
        {!rLitros.valido && rLitros.erro && <Text style={[estilos.dica, { color: tema.erro }]}>{rLitros.erro}</Text>}

        <Text style={[estilos.rotulo, { color: tema.texto }]} nativeID="rotulo-horimetro-abast">Horímetro agora (h)</Text>
        <TextInput
          value={horimetro}
          onChangeText={setHorimetro}
          placeholder={`Mínimo ${formatarHoras(horimetroMinimo)}`}
          placeholderTextColor={tema.textoSuave}
          keyboardType="decimal-pad"
          accessibilityLabelledBy="rotulo-horimetro-abast"
          style={[estiloCampo, { borderColor: corDaBorda(rHorimetro) }]}
        />
        {!rHorimetro.valido && rHorimetro.erro && (
          <Text style={[estilos.dica, { color: tema.erro }]}>{rHorimetro.erro}</Text>
        )}

        {noPosto && (
          <>
            <Text style={[estilos.rotulo, { color: tema.texto }]} nativeID="rotulo-posto">Posto</Text>
            <TextInput
              value={posto}
              onChangeText={setPosto}
              placeholder="Ex.: Posto Boa Vista"
              placeholderTextColor={tema.textoSuave}
              accessibilityLabelledBy="rotulo-posto"
              style={[estiloCampo, { borderColor: tema.borda }]}
            />

            <Text style={[estilos.rotulo, { color: tema.texto }]} nativeID="rotulo-valor">Valor pago (R$)</Text>
            <TextInput
              value={valor}
              onChangeText={setValor}
              placeholder="Ex.: 746,30"
              placeholderTextColor={tema.textoSuave}
              keyboardType="decimal-pad"
              accessibilityLabelledBy="rotulo-valor"
              style={[estiloCampo, { borderColor: corDaBorda(rValor) }]}
            />
            {!rValor.valido && rValor.erro && <Text style={[estilos.dica, { color: tema.erro }]}>{rValor.erro}</Text>}
            {/* Preço por litro ao vivo: ajuda a perceber um valor digitado errado */}
            {precoLitro !== null && (
              <Text style={[estilos.dica, { color: tema.textoSuave }]} accessibilityLiveRegion="polite">
                Preço por litro: {formatarReais(precoLitro, 3)}
              </Text>
            )}
          </>
        )}

        {/* Foto: obrigatória no posto (o recibo), opcional no tanque (ex.: o marcador da bomba) */}
        <Text style={[estilos.rotulo, { color: tema.texto }]}>
          {noPosto ? 'Foto do recibo (obrigatória)' : 'Foto da bomba (opcional)'}
        </Text>
        {foto ? (
          <View style={[estilos.fotoLinha, { borderColor: tema.borda, backgroundColor: tema.cartao }]}>
            <Image source={{ uri: foto.uri }} resizeMethod="resize" style={estilos.miniatura} accessibilityLabel="Foto anexada" />
            <View style={estilos.fotoAcoes}>
              <Text style={[estilos.texto, { color: tema.texto }]}>Foto anexada</Text>
              <Pressable onPress={() => setCameraAberta(true)} accessibilityRole="button">
                <Text style={[estilos.link, { color: tema.primaria }]}>Tirar outra</Text>
              </Pressable>
              <Pressable onPress={() => setFoto(null)} accessibilityRole="button">
                <Text style={[estilos.link, { color: tema.erro }]}>Remover</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setCameraAberta(true)}
            accessibilityRole="button"
            style={({ pressed }) => [estilos.botaoFoto, { borderColor: tema.primaria, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[estilos.botaoTexto, { color: tema.texto }]}>
              {noPosto ? 'Fotografar o recibo' : 'Fotografar a bomba'}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={enviar}
          disabled={!pronto || enviando}
          accessibilityRole="button"
          accessibilityState={{ disabled: !pronto || enviando, busy: enviando }}
          style={({ pressed }) => [
            estilos.botao,
            { backgroundColor: tema.primaria, opacity: !pronto ? 0.4 : pressed ? 0.8 : 1 },
          ]}
        >
          {enviando ? (
            <ActivityIndicator color={tema.sobrePrimaria} />
          ) : (
            <Text style={[estilos.botaoTexto, { color: tema.sobrePrimaria }]}>Enviar para conferência</Text>
          )}
        </Pressable>
        {faltando.length > 0 && (
          <Text style={[estilos.dica, { color: tema.textoSuave, textAlign: 'center' }]}>
            Para enviar, falta: {faltando.join(', ')}.
          </Text>
        )}
      </ScrollView>

      {/* A câmera abre por cima do formulário (Modal) e devolve a foto; nada do que foi digitado se perde */}
      <Modal visible={cameraAberta} animationType="slide" onRequestClose={() => setCameraAberta(false)}>
        <View style={estilos.cameraTela}>
          <View style={estilos.cameraBarra}>
            <Pressable onPress={() => setCameraAberta(false)} accessibilityRole="button" style={estilos.cameraCancelar}>
              <Text style={estilos.cameraTexto}>Cancelar</Text>
            </Pressable>
            <Text style={estilos.cameraTexto}>{noPosto ? 'Foto do recibo' : 'Foto da bomba'}</Text>
          </View>
          <Camera
            aoConfirmar={capturada => {
              setFoto(capturada);
              setCameraAberta(false);
            }}
          />
        </View>
      </Modal>

      <Aviso dados={aviso} aoFechar={() => setAviso(null)} />
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  tela: { padding: 16, gap: 10, paddingBottom: 32 },
  subtitulo: { fontSize: 20, fontWeight: '800' },
  rotulo: { marginTop: 6, fontSize: 15, fontWeight: '600' },
  texto: { fontSize: 15, lineHeight: 21 },
  info: { padding: 12, borderRadius: 12 },
  campo: { minHeight: 52, paddingHorizontal: 14, borderWidth: 1, borderRadius: 12, fontSize: 17 },
  dica: { fontSize: 14, fontWeight: '600' },
  fotoLinha: { flexDirection: 'row', gap: 12, padding: 10, borderWidth: 1, borderRadius: 12, alignItems: 'center' },
  miniatura: { width: 72, height: 72, borderRadius: 8 },
  fotoAcoes: { flex: 1, gap: 6 },
  link: { fontSize: 15, fontWeight: '700', paddingVertical: 4 },
  botaoFoto: { minHeight: 52, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  botao: { minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  botaoTexto: { fontSize: 17, fontWeight: '700' },
  cameraTela: { flex: 1, backgroundColor: '#000000' },
  cameraBarra: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 12 },
  cameraCancelar: { minHeight: 44, justifyContent: 'center' },
  cameraTexto: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
});
