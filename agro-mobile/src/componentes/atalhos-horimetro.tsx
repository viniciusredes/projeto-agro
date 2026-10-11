import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LimitesHorimetro } from '@/models/maquina';
import { useTema } from '@/tema';
import { atalhosDoHorimetro, formatarHoras } from '@/validacao';

// A faixa válida do horímetro e os botões rápidos (+1 h, +4 h, +8 h), embaixo do campo.
// Usado no retorno, na avaria e no abastecimento (Etapa 5). O componente só AVISA o texto
// escolhido; quem guarda o valor do campo é a tela.
export function AtalhosHorimetro({ limites, aoEscolher }: { limites: LimitesHorimetro; aoEscolher: (texto: string) => void }) {
  const tema = useTema();

  const faixa =
    limites.maximo !== null
      ? `Entre ${formatarHoras(limites.minimo)} h e ${formatarHoras(limites.maximo)} h`
      : `A partir de ${formatarHoras(limites.minimo)} h`;

  return (
    <View style={estilos.bloco}>
      <Text style={[estilos.faixa, { color: tema.textoSuave }]}>
        {faixa}
        {limites.origemMinimo ? ` (o mínimo vem do ${limites.origemMinimo})` : ''}
      </Text>
      <View style={estilos.atalhos} accessibilityLabel="Horas trabalhadas desde a última leitura">
        {atalhosDoHorimetro(limites).map(atalho => (
          <Pressable
            key={atalho.rotulo}
            onPress={() => aoEscolher(atalho.texto)}
            accessibilityRole="button"
            accessibilityLabel={`${atalho.rotulo}: horímetro ${atalho.texto}`}
            style={({ pressed }) => [estilos.atalho, { borderColor: tema.primaria, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[estilos.rotulo, { color: tema.primaria }]}>{atalho.rotulo}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { gap: 8 },
  faixa: { fontSize: 13 },
  atalhos: { flexDirection: 'row', gap: 8 },
  // 48 dp de altura: dá para tocar com luva
  atalho: { flex: 1, minHeight: 48, borderWidth: 1.5, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  rotulo: { fontSize: 16, fontWeight: '700' },
});
