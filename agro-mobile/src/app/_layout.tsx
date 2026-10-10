import { Stack } from 'expo-router';

// Layout raiz: no Expo Router, cada arquivo em src/app/ é uma tela, e o _layout.tsx diz COMO
// elas se organizam. "Stack" = navegação em pilha: cada tela nova entra por cima da anterior,
// e o botão Voltar (ou o gesto do celular) desempilha.
export default function LayoutRaiz() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0f633e' }, // verde da marca, o mesmo da web
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Agro Frota' }} />
    </Stack>
  );
}
