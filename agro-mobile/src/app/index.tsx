import { Link, Redirect, router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { EtiquetaStatus } from '@/componentes/etiqueta-status';
import { useOperador } from '@/contextos/operador';
import { useRequisicao } from '@/hooks/use-requisicao';
import { Maquina } from '@/models/maquina';
import { listarMaquinas } from '@/servicos/maquinas';
import { useTema } from '@/tema';

// Lista de máquinas. Um estado de cada vez: carregando, erro, vazio ou lista.
export default function ListaDeMaquinas() {
  // Regra dos hooks: sempre chamados, na MESMA ordem, antes de qualquer "return" antecipado
  const tema = useTema();
  const { nome, carregado } = useOperador();
  const { dados: maquinas, erro, carregando, atualizando, recarregar } = useRequisicao(listarMaquinas);

  // Ao VOLTAR para a lista (ex.: depois de registrar uma saída na ficha), busca de novo.
  // Na primeira vez a tela já buscou (useRequisicao), então pula para não buscar em dobro.
  const primeiraVez = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeiraVez.current) {
        primeiraVez.current = false;
        return;
      }
      recarregar();
    }, [recarregar]),
  );

  // Ainda lendo o nome salvo no aparelho: não decide nada antes disso
  if (!carregado) {
    return (
      <View style={[estilos.centro, { backgroundColor: tema.fundo }]}>
        <ActivityIndicator size="large" color={tema.primaria} />
      </View>
    );
  }

  // Ninguém se identificou neste aparelho: vai para "Quem é você?"
  if (!nome) {
    return <Redirect href="/identificacao" />;
  }

  return (
    <>
      {/* Uma tela pode ajustar a própria barra: aqui, o nome do operador à direita, que leva à troca */}
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/identificacao" accessibilityLabel={`Operador: ${nome}. Toque para trocar`} style={estilos.operador}>
              {nome.split(' ')[0]} · trocar
            </Link>
          ),
        }}
      />
      <Conteudo
        maquinas={maquinas}
        erro={erro}
        carregando={carregando}
        atualizando={atualizando}
        recarregar={recarregar}
      />
    </>
  );
}

// O conteúdo da lista (separado para a barra acima valer em todos os estados)
function Conteudo({
  maquinas,
  erro,
  carregando,
  atualizando,
  recarregar,
}: {
  maquinas: Maquina[] | null;
  erro: string | null;
  carregando: boolean;
  atualizando: boolean;
  recarregar: () => void;
}) {
  const tema = useTema();

  if (carregando) {
    return (
      <View style={[estilos.centro, { backgroundColor: tema.fundo }]}>
        <ActivityIndicator size="large" color={tema.primaria} />
      </View>
    );
  }

  if (erro && !maquinas) {
    return (
      <View style={[estilos.centro, { backgroundColor: tema.fundo }]}>
        <Text style={[estilos.mensagem, { color: tema.erro }]}>{erro}</Text>
        <Pressable
          onPress={recarregar}
          style={({ pressed }) => [estilos.botao, { backgroundColor: tema.primaria, opacity: pressed ? 0.8 : 1 }]}
          accessibilityRole="button"
        >
          <Text style={[estilos.botaoTexto, { color: tema.sobrePrimaria }]}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: tema.fundo }}
      contentContainerStyle={estilos.lista}
      data={maquinas ?? []}
      keyExtractor={maquina => String(maquina.id)}
      renderItem={({ item }) => <CartaoMaquina maquina={item} />}
      // Puxar a lista para baixo recarrega (o gesto padrão dos apps)
      refreshControl={
        <RefreshControl refreshing={atualizando} onRefresh={recarregar} colors={[tema.primaria]} tintColor={tema.primaria} />
      }
      ListHeaderComponent={
        <View style={estilos.cabecalho}>
          {/* A ação mais rápida para quem está AO LADO da máquina: apontar a câmera para a etiqueta */}
          <Pressable
            onPress={() => router.push('/escanear')}
            accessibilityRole="button"
            style={({ pressed }) => [estilos.botaoEscanear, { backgroundColor: tema.primaria, opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={[estilos.botaoTexto, { color: tema.sobrePrimaria }]}>Escanear QR da máquina</Text>
          </Pressable>
          {erro && <Text style={[estilos.aviso, { color: tema.erro }]}>{erro}</Text>}
        </View>
      }
      ListEmptyComponent={
        <Text style={[estilos.mensagem, { color: tema.textoSuave }]}>Nenhuma máquina cadastrada.</Text>
      }
    />
  );
}

// Um cartão por máquina (componente local: só esta tela usa)
function CartaoMaquina({ maquina }: { maquina: Maquina }) {
  const tema = useTema();
  return (
    // O cartão INTEIRO leva à ficha (área de toque grande, como a lista de O.S. da web).
    // Pressable + router.push, e não <Link asChild>: o Link repassa as propriedades ao filho,
    // mas NÃO repassa um "style" em forma de função ({ pressed }) => ...; o cartão perdia o
    // fundo, a borda e o layout em linha.
    <Pressable
      onPress={() => router.push({ pathname: '/maquina/[id]', params: { id: maquina.id } })}
      accessibilityRole="link"
      accessibilityLabel={`${maquina.tag}, ${maquina.modelo}, ${maquina.status}. Abrir ficha`}
      style={({ pressed }) => [
        estilos.cartao,
        { backgroundColor: tema.cartao, borderColor: pressed ? tema.primaria : tema.borda },
      ]}
    >
      <View style={[estilos.avatar, { backgroundColor: tema.tons.sucesso.fundo }]}>
        <Text style={[estilos.avatarTexto, { color: tema.tons.sucesso.texto }]}>{maquina.tag.slice(0, 2)}</Text>
      </View>
      <View style={estilos.cartaoTexto}>
        <Text style={[estilos.tag, { color: tema.texto }]}>{maquina.tag}</Text>
        <Text style={{ color: tema.textoSuave }}>
          {maquina.modelo} · {maquina.horimetro.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h
        </Text>
      </View>
      <EtiquetaStatus status={maquina.status} />
      <Text style={[estilos.seta, { color: tema.textoSuave }]}>›</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  mensagem: { fontSize: 16, textAlign: 'center' },
  aviso: { fontWeight: '600', marginBottom: 8 },
  botao: { minHeight: 48, paddingHorizontal: 24, borderRadius: 24, justifyContent: 'center' },
  botaoTexto: { fontSize: 16, fontWeight: '700' },
  lista: { padding: 16, gap: 10 },
  cartao: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontWeight: '800', fontSize: 14 },
  seta: { fontSize: 26, marginLeft: -4 },
  cabecalho: { gap: 8, marginBottom: 4 },
  botaoEscanear: { minHeight: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  cartaoTexto: { flex: 1 },
  tag: { fontSize: 17, fontWeight: '700' },
  operador: { color: '#ffffff', fontSize: 15, fontWeight: '600', paddingVertical: 8 },
});
