import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { mensagemDeErro } from '@/api';
import { Aviso, DadosAviso } from '@/componentes/aviso';
import Camera, { FotoCapturada } from '@/componentes/camera';
import { useRequisicao } from '@/hooks/use-requisicao';
import { enviarFotoOS, MAXIMO_FOTOS_POR_OS } from '@/servicos/fotos-os';
import { buscarFicha } from '@/servicos/maquinas';
import { useTema } from '@/tema';
import { formatarTamanho, TAMANHO_MAXIMO_FOTO, tamanhoDoBase64 } from '@/validacao';

// Foto da avaria (/maquina/1/foto-avaria): anexa fotos à O.S. ABERTA da máquina.
// Mesma pasta [id] da ficha e do relato: as três telas leem o mesmo id da rota.
export default function FotoAvaria() {
  const tema = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const idNumero = Number(id);
  const buscar = useCallback(() => buscarFicha(idNumero), [idNumero]);
  const { dados, erro, carregando, recarregar } = useRequisicao(buscar);
  const [enviando, setEnviando] = useState(false);
  // Trocar a key de um componente faz o React criar um NOVO: é o jeito de "zerar" a câmera
  // (sair da prévia da foto enviada) para tirar a próxima
  const [rodada, setRodada] = useState(0);
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
        <Text style={[estilos.texto, { color: tema.erro }]}>{erro}</Text>
      </View>
    );
  }

  const { maquina, osAberta, fotos } = dados;

  // A foto pertence a uma O.S.: sem O.S. aberta, não há onde guardar
  if (!osAberta) {
    return (
      <View style={[estilos.centro, { backgroundColor: tema.fundo }]}>
        <Text style={[estilos.texto, { color: tema.texto }]}>
          A {maquina.tag} não tem O.S. aberta. Relate a avaria primeiro; a foto entra na O.S.
        </Text>
      </View>
    );
  }
  if (fotos.length >= MAXIMO_FOTOS_POR_OS) {
    return (
      <View style={[estilos.centro, { backgroundColor: tema.fundo }]}>
        <Text style={[estilos.texto, { color: tema.texto }]}>
          A O.S. nº {osAberta.id} já tem {MAXIMO_FOTOS_POR_OS} fotos, o máximo. Veja as fotos na ficha da máquina.
        </Text>
      </View>
    );
  }
  const os = osAberta; // const: o TypeScript sabe que não é null dentro da função abaixo
  const numeroDestaFoto = fotos.length + 1;

  async function enviar(foto: FotoCapturada) {
    // Confere o tamanho ANTES de gastar internet: a API recusaria mesmo (413)
    const tamanho = tamanhoDoBase64(foto.base64);
    if (tamanho > TAMANHO_MAXIMO_FOTO) {
      setAviso({
        tom: 'alerta',
        titulo: 'Foto grande demais',
        mensagem: `A foto tem ${formatarTamanho(tamanho)}; o máximo é 2 MB. Tire outra.`,
        botoes: [{ texto: 'Tirar outra', principal: true, aoTocar: () => setRodada(r => r + 1) }],
      });
      return;
    }

    setEnviando(true);
    try {
      const resposta = await enviarFotoOS(os.id, foto.base64);
      const restam = MAXIMO_FOTOS_POR_OS - numeroDestaFoto;
      const detalhe = `Foto ${numeroDestaFoto} de ${MAXIMO_FOTOS_POR_OS} anexada à O.S. nº ${os.id} (${formatarTamanho(resposta.foto.tamanho)}).`;
      // Já enviada: zera a câmera AGORA (sem a prévia, não há como reenviar a mesma foto por engano)
      // e busca a contagem de novo (o título vira "Foto N+1")
      setRodada(r => r + 1);
      recarregar();
      setAviso({
        tom: 'sucesso',
        titulo: 'Foto enviada',
        mensagem: restam > 0
          ? `${detalhe} Ainda cabem ${restam}.`
          : `${detalhe} Essa era a última: a O.S. atingiu o limite de ${MAXIMO_FOTOS_POR_OS} fotos.`,
        botoes: [
          // Tirar outra (o mais comum no campo): a câmera já está pronta, basta fechar o aviso
          ...(restam > 0 ? [{ texto: 'Tirar outra', principal: true }] : []),
          { texto: 'Concluir', principal: restam === 0, aoTocar: () => router.back() },
        ],
      });
    } catch (e) {
      // Ex.: 409 quando a O.S. já tem 5 fotos (alguém mandou por outro celular)
      setAviso({
        tom: 'erro',
        titulo: 'Não foi possível enviar a foto',
        mensagem: mensagemDeErro(e),
        botoes: [{ texto: 'OK', principal: true }],
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      {/* A barra diz QUAL foto está sendo tirada: o operador sabe quantas já foram */}
      <Stack.Screen options={{ title: `Foto ${numeroDestaFoto} de ${MAXIMO_FOTOS_POR_OS} · O.S. nº ${os.id}` }} />
      <Camera key={rodada} aoConfirmar={enviar} enviando={enviando} />
      <Aviso dados={aviso} aoFechar={() => setAviso(null)} />
    </>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  texto: { fontSize: 16, textAlign: 'center', lineHeight: 22 },
});
