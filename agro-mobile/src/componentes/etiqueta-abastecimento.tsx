import { StyleSheet, Text, View } from 'react-native';
import { StatusAbastecimento } from '@/models/abastecimento';
import { useTema } from '@/tema';

// O que cada status quer dizer para o OPERADOR (que não vê a tela de conferência)
const ROTULO: Record<StatusAbastecimento, string> = {
  Pendente: 'Aguardando conferência',
  Aprovado: 'Aprovado',
  Recusado: 'Recusado',
};

// Etiqueta do status do abastecimento, no mesmo formato da etiqueta de status da máquina
export function EtiquetaAbastecimento({ status }: { status: StatusAbastecimento }) {
  const tema = useTema();
  // Pendente pede atenção (alerta), aprovado é bom (sucesso), recusado é erro
  const tom = {
    Pendente: tema.tons.alerta,
    Aprovado: tema.tons.sucesso,
    Recusado: { fundo: tema.erro, texto: tema.cartao },
  }[status];

  return (
    <View style={[estilos.etiqueta, { backgroundColor: tom.fundo }]}>
      <View style={[estilos.ponto, { backgroundColor: tom.texto }]} />
      <Text style={[estilos.texto, { color: tom.texto }]}>{ROTULO[status]}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ponto: { width: 7, height: 7, borderRadius: 4 },
  texto: { fontSize: 13, fontWeight: '700' },
});
