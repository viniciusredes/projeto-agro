import { StyleSheet, Text, View } from 'react-native';
import { EtiquetaAbastecimento } from '@/componentes/etiqueta-abastecimento';
import { CombustivelMaquina } from '@/models/abastecimento';
import { useTema } from '@/tema';
import { formatarHoras, formatarReais, horasDesdeAbastecimento } from '@/validacao';

// Combustível na ficha da máquina (Etapa 4): quando foi o último abastecimento, quanto a máquina
// trabalhou desde então e o consumo médio. Os números vêm da API (só os aprovados contam).
export function CartaoCombustivel({ combustivel, horimetroAtual }: { combustivel: CombustivelMaquina; horimetroAtual: number }) {
  const tema = useTema();

  // O último que vale (os recusados ficam de fora), pelo número: o mais recente
  const ultimo = [...combustivel.abastecimentos].filter(ab => ab.status !== 'Recusado').sort((a, b) => b.id - a.id)[0];
  const horasDesde = ultimo ? horasDesdeAbastecimento(horimetroAtual, ultimo.horimetro) : null;

  return (
    <View style={[estilos.cartao, { backgroundColor: tema.cartao, borderColor: tema.borda }]}>
      <Text style={[estilos.titulo, { color: tema.texto }]}>Combustível</Text>

      {ultimo ? (
        <>
          <View style={estilos.linha}>
            <Text style={[estilos.rotulo, { color: tema.textoSuave }]}>Último abastecimento</Text>
            <EtiquetaAbastecimento status={ultimo.status} />
          </View>
          <Text style={[estilos.valor, { color: tema.texto }]}>
            {new Date(ultimo.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
          </Text>
          <Text style={[estilos.texto, { color: tema.texto }]}>
            {formatarHoras(ultimo.litros)} L · {ultimo.origem === 'Tanque' ? 'tanque da fazenda' : ultimo.posto} · com{' '}
            {formatarHoras(ultimo.horimetro)} h
          </Text>
          {horasDesde !== null ? (
            <Text style={[estilos.texto, { color: tema.texto, fontWeight: '700' }]}>
              {formatarHoras(horasDesde)} h trabalhadas desde então
            </Text>
          ) : (
            // Abasteceu depois do último retorno: as horas aparecem quando a máquina voltar
            <Text style={[estilos.dica, { color: tema.textoSuave }]}>
              Abastecida depois do último retorno: as horas desde então aparecem no próximo retorno.
            </Text>
          )}
        </>
      ) : (
        <Text style={[estilos.texto, { color: tema.textoSuave }]}>Nenhum abastecimento registrado.</Text>
      )}

      <View style={[estilos.separador, { backgroundColor: tema.borda }]} />

      <View style={estilos.linha}>
        <Text style={[estilos.rotulo, { color: tema.textoSuave }]}>Consumo médio</Text>
        {/* "Sem dados" é diferente de zero: com menos de 2 aprovados não dá para medir */}
        <Text style={[estilos.valor, { color: tema.texto }]}>
          {combustivel.consumoMedio !== null ? `${formatarHoras(combustivel.consumoMedio)} L/h` : 'Sem dados'}
        </Text>
      </View>
      {combustivel.custoPorHora !== null && (
        <View style={estilos.linha}>
          <Text style={[estilos.rotulo, { color: tema.textoSuave }]}>Custo por hora</Text>
          <Text style={[estilos.texto, { color: tema.texto, fontWeight: '700' }]}>{formatarReais(combustivel.custoPorHora)}</Text>
        </View>
      )}
      {combustivel.consumoMedio === null && (
        <Text style={[estilos.dica, { color: tema.textoSuave }]}>O consumo aparece a partir de 2 abastecimentos aprovados.</Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 6 },
  titulo: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rotulo: { fontSize: 14, fontWeight: '600' },
  valor: { fontSize: 18, fontWeight: '800' },
  texto: { fontSize: 15, lineHeight: 21 },
  dica: { fontSize: 13 },
  separador: { height: 1, marginVertical: 6 },
});
