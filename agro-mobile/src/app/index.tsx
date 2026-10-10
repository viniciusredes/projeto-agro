import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { API_URL } from '@/config';
import { Maquina } from '@/models/maquina';

// M0: tela de TESTE de conexão. Prova que o celular alcança a API pela rede.
// No M1 ela vira a lista de máquinas de verdade.
export default function TelaInicial() {
  const [maquinas, setMaquinas] = useState<Maquina[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // useEffect com [] roda UMA vez, quando a tela aparece (como o ngOnInit do Angular)
  useEffect(() => {
    fetch(`${API_URL}/maquinas`)
      .then(resposta => resposta.json())
      .then((lista: Maquina[]) => setMaquinas(lista))
      .catch(() => setErro(`Não foi possível acessar a API em ${API_URL}`));
  }, []);

  return (
    <ScrollView contentContainerStyle={estilos.tela}>
      <Text style={estilos.titulo}>Teste de conexão</Text>
      <Text style={estilos.detalhe}>API: {API_URL || '(não configurada)'}</Text>

      {erro ? (
        <Text style={estilos.erro}>{erro}</Text>
      ) : maquinas === null ? (
        <ActivityIndicator size="large" color="#0f633e" />
      ) : (
        <View style={estilos.lista}>
          <Text style={estilos.ok}>Conectado! {maquinas.length} máquinas na API:</Text>
          {maquinas.map(maquina => (
            <Text key={maquina.id} style={estilos.item}>
              {maquina.tag} · {maquina.modelo} · {maquina.status}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// StyleSheet.create: estilos em objetos JavaScript (não existe CSS no React Native).
// Os nomes lembram o CSS, em camelCase: font-size vira fontSize.
const estilos = StyleSheet.create({
  tela: { padding: 24, gap: 12 },
  titulo: { fontSize: 22, fontWeight: '700' },
  detalhe: { color: '#5b645e' },
  erro: { color: '#b3261e', fontWeight: '600' },
  ok: { color: '#1b6b2c', fontWeight: '600' },
  lista: { gap: 6 },
  item: { fontSize: 16 },
});
