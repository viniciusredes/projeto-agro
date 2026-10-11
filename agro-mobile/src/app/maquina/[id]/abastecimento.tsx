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
import {
  buscarDadosParaAbastecer, corrigirAbastecimento, DadosParaAbastecer, enderecoDoComprovante, registrarAbastecimento,
} from '@/servicos/abastecimentos';
import { useTema } from '@/tema';
import {
  formatarHoras, formatarReais, formatarTamanho, TAMANHO_MAXIMO_FOTO, tamanhoDoBase64, validarHorimetroEntre,
  validarHorimetroNaFaixa, validarPositivo,
} from '@/validacao';
import { AtalhosHorimetro } from '@/componentes/atalhos-horimetro';

const ORIGENS: OpcaoSegmentada<OrigemAbastecimento>[] = [
  { valor: 'Posto', rotulo: 'Posto' },
  { valor: 'Tanque', rotulo: 'Tanque da fazenda' },
];

// 120.5 -> "120,5": o número da API volta para o campo no formato que o operador digita
const paraCampo = (valor: number | undefined) => (valor === undefined ? '' : String(valor).replace('.', ','));

// Abastecimento (/maquina/1/abastecimento). Dois modos:
// - registrar: um abastecimento novo;
// - corrigir (?corrigir=4): o abastecimento que o gestor DEVOLVEU, já preenchido (PUT na API).
// Esta parte só carrega os dados; o formulário é montado DEPOIS, já com os valores iniciais.
export default function RegistrarAbastecimento() {
  const tema = useTema();
  const { id, corrigir } = useLocalSearchParams<{ id: string; corrigir?: string }>();
  const idNumero = Number(id);
  const corrigirId = corrigir !== undefined ? Number(corrigir) : undefined;
  const buscar = useCallback(() => buscarDadosParaAbastecer(idNumero, corrigirId), [idNumero, corrigirId]);
  const { dados, erro, carregando } = useRequisicao(buscar);

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
  // Pediu para corrigir algo que não está (mais) em correção: ex.: o gestor já decidiu
  if (corrigirId !== undefined && dados.corrigindo?.status !== 'Em correção') {
    return (
      <View style={[estilos.centro, { backgroundColor: tema.fundo }]}>
        <Text style={[estilos.texto, { color: tema.texto, textAlign: 'center' }]}>
          O abastecimento nº {corrigirId} não está esperando correção. Veja o status na página inicial.
        </Text>
      </View>
    );
  }

  return <Formulario dados={dados} />;
}

// O formulário em si. Montado só com os dados em mãos: o useState usa o valor inicial apenas na
// PRIMEIRA renderização, e é aqui que ele já pode vir do abastecimento devolvido.
function Formulario({ dados }: { dados: DadosParaAbastecer }) {
  const tema = useTema();
  const { nome } = useOperador();
  const { maquina, limites, horimetroMinimo, horimetroMaximo, corrigindo } = dados;

  const [origem, setOrigem] = useState<OrigemAbastecimento>(corrigindo?.origem ?? 'Posto');
  const [litros, setLitros] = useState(paraCampo(corrigindo?.litros));
  const [horimetro, setHorimetro] = useState(paraCampo(corrigindo?.horimetro));
  const [posto, setPosto] = useState(corrigindo?.posto ?? '');
  const [valor, setValor] = useState(corrigindo?.origem === 'Posto' ? paraCampo(corrigindo.valorTotal) : '');
  const [foto, setFoto] = useState<FotoCapturada | null>(null);
  const [cameraAberta, setCameraAberta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<DadosAviso | null>(null);

  const noPosto = origem === 'Posto';
  // Na correção, a foto enviada antes continua valendo se o operador não tirar outra
  const fotoAnterior = corrigindo ? enderecoDoComprovante(corrigindo) : null;
  const pedido = corrigindo?.devolucoes[corrigindo.devolucoes.length - 1]?.motivo;

  // Cada campo validado por uma função pura (validacao.ts): a tela só mostra o resultado
  const rLitros = validarPositivo(litros);
  // Registro: a faixa da API (Etapa 5). Correção: entre o abastecimento anterior e o seguinte.
  const rHorimetro = limites
    ? validarHorimetroNaFaixa(horimetro, limites)
    : validarHorimetroEntre(horimetro, horimetroMinimo, horimetroMaximo);
  const rValor = validarPositivo(valor);
  // Valor DERIVADO: calculado a cada digitação, não guardado em estado
  const precoLitro = rLitros.valido && rValor.valido ? rValor.valor / rLitros.valor : null;

  // O que ainda falta, dito em palavras (um botão apagado sem explicação parece defeito)
  const faltando = [
    !rLitros.valido && 'litros',
    !rHorimetro.valido && 'horímetro',
    noPosto && posto.trim() === '' && 'nome do posto',
    noPosto && !rValor.valido && 'valor pago',
    noPosto && !foto && !fotoAnterior && 'foto do recibo',
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

    // Os campos que o operador digita, iguais nos dois modos.
    // Posto: nome e valor pago. Tanque: nada disso (o custo vem do almoxarifado).
    const campos = {
      litros: rLitros.valor,
      horimetro: rHorimetro.valor,
      ...(noPosto && rValor.valido ? { posto: posto.trim(), valorTotal: rValor.valor } : {}),
      ...(foto ? { comprovante: foto.base64 } : {}),
    };

    setEnviando(true);
    try {
      const resposta = corrigindo
        ? await corrigirAbastecimento(corrigindo.id, campos)
        : await registrarAbastecimento({ maquinaId: maquina.id, operador: nome!, origem, ...campos });
      const ab = resposta.abastecimento;
      setAviso({
        tom: 'sucesso',
        titulo: corrigindo ? 'Correção enviada' : 'Abastecimento enviado',
        mensagem:
          `${formatarHoras(ab.litros)} L na ${maquina.tag} (${formatarReais(ab.valorTotal)}, ${formatarReais(ab.precoLitro, 3)}/L). ` +
          (corrigindo
            ? 'O abastecimento voltou para a conferência do gestor.'
            : 'Ele vai para a conferência do gestor; acompanhe na página inicial.'),
        botoes: [{ texto: 'Concluir', principal: true, aoTocar: () => router.back() }],
        aoDispensar: () => router.back(), // já foi enviado: fechar pelo Voltar também conclui
      });
    } catch (e) {
      // Ex.: 409 diesel insuficiente no tanque; 400 horímetro fora do intervalo
      setAviso({ tom: 'erro', titulo: 'Não foi possível enviar', mensagem: mensagemDeErro(e), botoes: [{ texto: 'OK', principal: true }] });
    } finally {
      setEnviando(false);
    }
  }

  const corDaBorda = (r: { valido: boolean; erro?: string | null }) => (!r.valido && r.erro ? tema.erro : tema.borda);
  const estiloCampo = [estilos.campo, { color: tema.texto, backgroundColor: tema.cartao }];
  // No registro, a faixa aparece embaixo do campo (AtalhosHorimetro); na correção, no placeholder
  const limiteHorimetro = limites
    ? 'Leia no painel da máquina'
    : horimetroMaximo !== null
      ? `Entre ${formatarHoras(horimetroMinimo)} e ${formatarHoras(horimetroMaximo)}`
      : `Mínimo ${formatarHoras(horimetroMinimo)}`;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: corrigindo ? `Corrigir abastecimento nº ${corrigindo.id}` : `Abastecer ${maquina.tag}` }} />
      <ScrollView style={{ backgroundColor: tema.fundo }} contentContainerStyle={estilos.tela} keyboardShouldPersistTaps="handled">
        <Text style={[estilos.subtitulo, { color: tema.texto }]}>{maquina.tag} · {maquina.modelo}</Text>

        {/* Correção: o que o gestor pediu, no topo, antes dos campos */}
        {pedido && (
          <View style={[estilos.pedido, { backgroundColor: tema.sinal }]} accessibilityRole="alert">
            <Text style={estilos.pedidoTitulo}>O gestor pediu para corrigir</Text>
            <Text style={estilos.pedidoTexto}>{pedido}</Text>
          </View>
        )}

        <Text style={[estilos.rotulo, { color: tema.texto }]}>De onde veio o combustível?</Text>
        {corrigindo ? (
          // A origem não muda na correção (regra da API): mostra, sem deixar trocar
          <Text style={[estilos.texto, { color: tema.textoSuave }]}>
            {noPosto ? 'Posto' : 'Tanque da fazenda'} (não muda na correção)
          </Text>
        ) : (
          <EscolhaSegmentada opcoes={ORIGENS} valor={origem} aoEscolher={setOrigem} rotulo="Origem do combustível" />
        )}

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

        <Text style={[estilos.rotulo, { color: tema.texto }]} nativeID="rotulo-horimetro-abast">Horímetro no abastecimento (h)</Text>
        <TextInput
          value={horimetro}
          onChangeText={setHorimetro}
          placeholder={limiteHorimetro}
          placeholderTextColor={tema.textoSuave}
          keyboardType="decimal-pad"
          accessibilityLabelledBy="rotulo-horimetro-abast"
          style={[estiloCampo, { borderColor: corDaBorda(rHorimetro) }]}
        />
        {!rHorimetro.valido && rHorimetro.erro && (
          <Text style={[estilos.dica, { color: tema.erro }]}>{rHorimetro.erro}</Text>
        )}
        {/* A faixa diz de onde vem o mínimo (ex.: "do abastecimento nº 5"), mesmo que a ficha mostre menos */}
        {limites && <AtalhosHorimetro limites={limites} aoEscolher={setHorimetro} />}

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

        {/* Foto: obrigatória no posto (o recibo), opcional no tanque. Na correção, vale a anterior. */}
        <Text style={[estilos.rotulo, { color: tema.texto }]}>
          {noPosto ? 'Foto do recibo (obrigatória)' : 'Foto da bomba (opcional)'}
        </Text>
        {foto || fotoAnterior ? (
          <View style={[estilos.fotoLinha, { borderColor: tema.borda, backgroundColor: tema.cartao }]}>
            <Image
              source={{ uri: foto ? foto.uri : fotoAnterior! }}
              resizeMethod="resize"
              style={estilos.miniatura}
              accessibilityLabel={foto ? 'Foto anexada' : 'Foto enviada antes'}
            />
            <View style={estilos.fotoAcoes}>
              <Text style={[estilos.texto, { color: tema.texto }]}>
                {foto ? 'Foto anexada' : 'Foto enviada antes (vale, se você não tirar outra)'}
              </Text>
              <Pressable onPress={() => setCameraAberta(true)} accessibilityRole="button">
                <Text style={[estilos.link, { color: tema.primaria }]}>Tirar outra</Text>
              </Pressable>
              {foto && (
                <Pressable onPress={() => setFoto(null)} accessibilityRole="button">
                  <Text style={[estilos.link, { color: tema.erro }]}>{fotoAnterior ? 'Voltar à anterior' : 'Remover'}</Text>
                </Pressable>
              )}
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
            <Text style={[estilos.botaoTexto, { color: tema.sobrePrimaria }]}>
              {corrigindo ? 'Enviar correção' : 'Enviar para conferência'}
            </Text>
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
  pedido: { padding: 14, borderRadius: 12, gap: 4 },
  pedidoTitulo: { fontSize: 13, fontWeight: '700', color: '#2b1600', textTransform: 'uppercase' },
  pedidoTexto: { fontSize: 17, fontWeight: '700', color: '#2b1600' },
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
