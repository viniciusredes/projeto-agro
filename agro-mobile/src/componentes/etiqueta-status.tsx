import { StyleSheet, Text, View } from 'react-native';
import { StatusMaquina } from '@/models/maquina';
import { TOM_STATUS, useTema } from '@/tema';

// No dia a dia do campo, "Em Operação" é "Em campo" (o mesmo texto dos filtros da web)
const ROTULO: Record<StatusMaquina, string> = {
  'Disponível': 'Disponível',
  'Em Operação': 'Em campo',
  'Em Manutenção': 'Em manutenção',
};

// Componente reutilizável: recebe dados por "props" (o equivalente aos input() do Angular)
export function EtiquetaStatus({ status }: { status: StatusMaquina }) {
  const tom = useTema().tons[TOM_STATUS[status]];
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
