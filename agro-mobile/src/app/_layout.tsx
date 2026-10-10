import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTema } from '@/tema';

// Layout raiz: no Expo Router, cada arquivo em src/app/ é uma tela, e o _layout.tsx diz COMO
// elas se organizam. "Stack" = navegação em pilha: cada tela nova entra por cima da anterior,
// e o botão Voltar (ou o gesto do celular) desempilha.
export default function LayoutRaiz() {
  const tema = useTema();
  return (
    <>
      {/* Ícones da barra do sistema (hora, bateria) em branco, sobre a barra verde */}
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: tema.barra }, // verde da marca (floresta no escuro)
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: tema.fundo },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Máquinas' }} />
      </Stack>
    </>
  );
}
