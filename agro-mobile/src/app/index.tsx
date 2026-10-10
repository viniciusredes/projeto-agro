import { Link, Redirect, router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import {
  ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useColorScheme, View,
} from 'react-native';
import { EtiquetaStatus } from '@/componentes/etiqueta-status';
import { SeletorTema } from '@/componentes/seletor-tema';
import { useOperador } from '@/contextos/operador';
import { useRequisicao } from '@/hooks/use-requisicao';
import { StatusMaquina } from '@/models/maquina';
import { buscarPainelDoOperador } from '@/servicos/maquinas';
import { TOM_STATUS, useTema } from '@/tema';

// require: a imagem entra NO PACOTE do app (não vem da internet). Uma versão para cada tema.
const LOGO = require('../../assets/images/logo.png');
const LOGO_ESCURO = require('../../assets/images/logo-escuro.png');

// Os três números da frota, na ordem em que a máquina "anda" (pátio → campo → oficina)
const RESUMO: { status: StatusMaquina; rotulo: string }[] = [
  { status: 'Disponível', rotulo: 'no pátio' },
  { status: 'Em Operação', rotulo: 'em campo' },
  { status: 'Em Manutenção', rotulo: 'na oficina' },
];

function saudacao(): string {
  const hora = new Date().getHours();
  return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
}

// Página inicial do operador (/): quem é, o que está com ele, a frota e os atalhos do dia
export default function Inicio() {
  // Regra dos hooks: todos antes de qualquer "return" antecipado
  const tema = useTema();
  const escuro = useColorScheme() === 'dark';
  const { nome, carregado } = useOperador();
  const buscar = useCallback(() => buscarPainelDoOperador(nome ?? ''), [nome]);
  const { dados, erro, carregando, atualizando, recarregar } = useRequisicao(buscar);

  // Ao voltar para o início (ex.: depois de registrar um retorno), busca de novo
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

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const contar = (status: StatusMaquina) => dados?.maquinas.filter(m => m.status === status).length ?? 0;

  return (
    <ScrollView
      style={{ backgroundColor: tema.fundo }}
      contentContainerStyle={estilos.tela}
      refreshControl={
        <RefreshControl refreshing={atualizando} onRefresh={recarregar} colors={[tema.primaria]} tintColor={tema.primaria} />
      }
    >
      {/* Na barra: o nome do operador, que leva à troca (antes ficava na lista de máquinas) */}
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/identificacao" accessibilityLabel={`Operador: ${nome}. Toque para trocar`} style={estilos.operador}>
              {nome.split(' ')[0]} · trocar
            </Link>
          ),
        }}
      />

      {/* Boas-vindas, com a logo da marca na versão do tema atual */}
      <View style={estilos.boasVindas}>
        <Image source={escuro ? LOGO_ESCURO : LOGO} style={estilos.logo} resizeMode="contain" accessibilityLabel="Agro Frota" />
        <Text style={[estilos.saudacao, { color: tema.texto }]}>
          {saudacao()}, {nome.split(' ')[0]}!
        </Text>
        <Text style={[estilos.data, { color: tema.textoSuave }]}>{hoje}</Text>
      </View>

      {/* A ação mais comum no campo: estar ao lado da máquina e abrir a ficha dela */}
      <Pressable
        onPress={() => router.push('/escanear')}
        accessibilityRole="button"
        style={({ pressed }) => [estilos.botaoPrincipal, { backgroundColor: tema.primaria, opacity: pressed ? 0.8 : 1 }]}
      >
        <Text style={[estilos.botaoTexto, { color: tema.sobrePrimaria }]}>Escanear QR da máquina</Text>
      </Pressable>

      {carregando ? (
        <ActivityIndicator size="large" color={tema.primaria} style={estilos.carregando} />
      ) : !dados ? (
        <View style={[estilos.cartao, { backgroundColor: tema.cartao, borderColor: tema.borda }]}>
          <Text style={[estilos.texto, { color: tema.erro }]}>{erro}</Text>
          <Pressable
            onPress={recarregar}
            accessibilityRole="button"
            style={({ pressed }) => [estilos.botaoSecundario, { borderColor: tema.borda, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[estilos.botaoTexto, { color: tema.texto }]}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* O que o operador precisa lembrar: as máquinas que ele tirou e ainda não devolveu */}
          <Text style={[estilos.secao, { color: tema.texto }]}>Com você agora</Text>
          {dados.comigo.length === 0 ? (
            <View style={[estilos.cartao, { backgroundColor: tema.cartao, borderColor: tema.borda }]}>
              <Text style={[estilos.texto, { color: tema.textoSuave }]}>
                Nenhuma máquina com você. Para registrar uma saída, escaneie o QR da máquina ou escolha na lista.
              </Text>
            </View>
          ) : (
            dados.comigo.map(({ maquina, saida }) => (
              <Pressable
                key={saida.id}
                onPress={() => router.push({ pathname: '/maquina/[id]', params: { id: maquina.id } })}
                accessibilityRole="link"
                accessibilityLabel={`${maquina.tag}, em ${saida.frenteTrabalho}. Abrir ficha para registrar o retorno`}
                style={({ pressed }) => [
                  estilos.cartao,
                  { backgroundColor: tema.tons.info.fundo, borderColor: pressed ? tema.primaria : tema.borda },
                ]}
              >
                <View style={estilos.linha}>
                  <Text style={[estilos.tag, { color: tema.tons.info.texto }]}>{maquina.tag}</Text>
                  <EtiquetaStatus status={maquina.status} />
                </View>
                <Text style={[estilos.texto, { color: tema.texto }]}>
                  {maquina.modelo} · {saida.frenteTrabalho}
                </Text>
                <Text style={[estilos.texto, { color: tema.textoSuave }]}>
                  Saiu {new Date(saida.dataSaida).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} com{' '}
                  {saida.horimetroSaida.toLocaleString('pt-BR')} h · toque para registrar o retorno
                </Text>
              </Pressable>
            ))
          )}

          {/* A frota em três números; o toque leva à lista completa */}
          <Text style={[estilos.secao, { color: tema.texto }]}>Frota agora</Text>
          <Pressable
            onPress={() => router.push('/maquinas')}
            accessibilityRole="link"
            accessibilityLabel={RESUMO.map(r => `${contar(r.status)} ${r.rotulo}`).join(', ') + '. Ver todas as máquinas'}
            style={estilos.resumo}
          >
            {RESUMO.map(({ status, rotulo }) => {
              const tom = tema.tons[TOM_STATUS[status]];
              return (
                <View key={status} style={[estilos.numero, { backgroundColor: tom.fundo }]}>
                  <Text style={[estilos.numeroValor, { color: tom.texto }]}>{contar(status)}</Text>
                  <Text style={[estilos.numeroRotulo, { color: tom.texto }]}>{rotulo}</Text>
                </View>
              );
            })}
          </Pressable>
          <Pressable
            onPress={() => router.push('/maquinas')}
            accessibilityRole="button"
            style={({ pressed }) => [estilos.botaoSecundario, { borderColor: tema.borda, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[estilos.botaoTexto, { color: tema.texto }]}>Ver todas as máquinas</Text>
          </Pressable>
        </>
      )}

      {/* Aparência: segue o celular por padrão; o operador pode fixar claro ou escuro */}
      <Text style={[estilos.secao, { color: tema.texto }]}>Aparência</Text>
      <SeletorTema />
      <Text style={[estilos.dica, { color: tema.textoSuave }]}>&quot;Sistema&quot; segue o tema do celular.</Text>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tela: { padding: 16, gap: 12, paddingBottom: 32 },
  boasVindas: { alignItems: 'center', gap: 4, marginBottom: 4 },
  logo: { width: 240, height: 123 }, // mesma proporção da logo (900 x 460)
  saudacao: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  data: { fontSize: 15 },
  secao: { fontSize: 18, fontWeight: '800', marginTop: 8 },
  cartao: { padding: 14, borderRadius: 14, borderWidth: 1, gap: 4 },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: { fontSize: 18, fontWeight: '800' },
  texto: { fontSize: 15, lineHeight: 21 },
  resumo: { flexDirection: 'row', gap: 10 },
  numero: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  numeroValor: { fontSize: 28, fontWeight: '800' },
  numeroRotulo: { fontSize: 14, fontWeight: '600' },
  botaoPrincipal: { minHeight: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  botaoSecundario: { minHeight: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  botaoTexto: { fontSize: 16, fontWeight: '700' },
  carregando: { marginVertical: 24 },
  dica: { fontSize: 14, textAlign: 'center' },
  operador: { color: '#ffffff', fontSize: 15, fontWeight: '600', paddingVertical: 8 },
});
