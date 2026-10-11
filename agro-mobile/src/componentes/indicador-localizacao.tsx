import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRastreamento } from '@/contextos/rastreamento';
import { useTema } from '@/tema';

// "Localização ativa · TR-01 · último envio há 20 s": o operador sempre SABE quando a posição
// dele está sendo enviada (a posição é um dado pessoal). Some quando não há máquina com ele.
// Com maquinaId (na ficha), só aparece se AQUELA máquina estiver com o operador deste aparelho.
export function IndicadorLocalizacao({ maquinaId }: { maquinaId?: number }) {
  const tema = useTema();
  const { estado, maquinas, ultimoEnvio, pendentes, semConexao, ativar, atualizar } = useRastreamento();

  // Relógio da tela: o "há 20 s" anda sozinho, sem depender de um envio novo.
  // useState(() => ...): a função roda só na PRIMEIRA vez (Date.now() direto no render mudaria a
  // cada renderização, e o React Compiler recusa: a renderização precisa ser "pura")
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 10_000);
    return () => clearInterval(relogio);
  }, []);

  if (estado === 'sem-saida' || (maquinaId !== undefined && !maquinas.some(m => m.id === maquinaId))) {
    return null;
  }

  const tags = maquinas.map(m => m.tag).join(', ');
  const ativa = estado === 'ativa';
  const cores = ativa ? tema.tons.sucesso : tema.tons.alerta;

  const titulo = ativa ? `Localização ativa · ${tags}` : `Localização desligada · ${tags}`;
  const detalhe = {
    ativa: semConexao
      ? `Sem conexão: ${pendentes} ${pendentes === 1 ? 'posição guardada' : 'posições guardadas'}, enviadas quando o sinal voltar.`
      : ultimoEnvio
        ? `Último envio ${tempoDesde(agora - ultimoEnvio)}. Com o app fechado ou a tela bloqueada, o envio pausa.`
        : 'Enviando a primeira posição. Com o app fechado ou a tela bloqueada, o envio pausa.',
    'sem-permissao': 'Permita a localização para o gestor ver a máquina no mapa. Ela só é enviada durante a saída.',
    negada: 'A localização foi negada. Para ativar, permita nas configurações do celular.',
    'gps-desligado': 'A localização (GPS) do celular está desligada.',
  }[estado];

  const acao =
    estado === 'sem-permissao'
      ? { texto: 'Ativar localização', aoTocar: ativar }
      : estado === 'negada'
        ? { texto: 'Abrir configurações', aoTocar: () => Linking.openSettings() }
        : estado === 'gps-desligado'
          ? { texto: 'Tentar de novo', aoTocar: atualizar }
          : null;

  return (
    <View
      style={[estilos.cartao, { backgroundColor: cores.fundo }]}
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
    >
      <View style={estilos.linha}>
        <View style={[estilos.ponto, { backgroundColor: cores.texto }]} />
        <Text style={[estilos.titulo, { color: cores.texto }]}>{titulo}</Text>
      </View>
      <Text style={[estilos.detalhe, { color: cores.texto }]}>{detalhe}</Text>
      {acao && (
        <Pressable
          onPress={acao.aoTocar}
          accessibilityRole="button"
          style={({ pressed }) => [estilos.botao, { borderColor: cores.texto, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[estilos.botaoTexto, { color: cores.texto }]}>{acao.texto}</Text>
        </Pressable>
      )}
    </View>
  );
}

// 20000 ms -> "há 20 s"; 150000 -> "há 2 min"
function tempoDesde(ms: number): string {
  const segundos = Math.max(0, Math.round(ms / 1000));
  return segundos < 60 ? `há ${segundos} s` : `há ${Math.floor(segundos / 60)} min`;
}

const estilos = StyleSheet.create({
  cartao: { padding: 14, borderRadius: 16, gap: 6 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ponto: { width: 10, height: 10, borderRadius: 5 },
  titulo: { fontSize: 15, fontWeight: '700', flex: 1 },
  detalhe: { fontSize: 14, lineHeight: 20 },
  botao: { minHeight: 48, borderWidth: 1.5, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  botaoTexto: { fontSize: 15, fontWeight: '700' },
});
