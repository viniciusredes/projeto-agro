import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ProvedorOperador } from '@/contextos/operador';
import { ProvedorPreferenciaTema } from '@/contextos/preferencia-tema';
import { useTema } from '@/tema';

// Layout raiz: no Expo Router, cada arquivo em src/app/ é uma tela, e o _layout.tsx diz COMO
// elas se organizam. "Stack" = navegação em pilha: cada tela nova entra por cima da anterior,
// e o botão Voltar (ou o gesto do celular) desempilha.
// O provedor do tema fica POR FORA: a escolha (claro/escuro) precisa valer antes de a pilha
// ler as cores. Por isso as telas ficam num componente separado (Telas), dentro dele.
export default function LayoutRaiz() {
  return (
    <ProvedorPreferenciaTema>
      <Telas />
    </ProvedorPreferenciaTema>
  );
}

function Telas() {
  const tema = useTema();
  return (
    // O provedor fica em VOLTA de todas as telas: qualquer uma pode ler o nome do operador
    <ProvedorOperador>
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
        <Stack.Screen name="index" options={{ title: 'Início' }} />
        <Stack.Screen name="maquinas" options={{ title: 'Máquinas' }} />
        <Stack.Screen name="identificacao" options={{ title: 'Identificação' }} />
        {/* Título provisório: a própria ficha troca pela tag da máquina */}
        <Stack.Screen name="maquina/[id]/index" options={{ title: 'Máquina' }} />
        {/* modal: no iPhone sobe de baixo para cima; deixa claro que é uma ação à parte da ficha */}
        <Stack.Screen name="maquina/[id]/avaria" options={{ title: 'Relatar avaria', presentation: 'modal' }} />
        {/* Foto da avaria: tela cheia (não modal), com a barra preta como a da própria câmera */}
        <Stack.Screen
          name="maquina/[id]/foto-avaria"
          options={{ title: 'Foto da avaria', headerStyle: { backgroundColor: '#000000' } }}
        />
        {/* Título provisório: a própria tela troca para "Abastecer <tag>" */}
        <Stack.Screen name="maquina/[id]/abastecimento" options={{ title: 'Abastecimento' }} />
        <Stack.Screen name="escanear" options={{ title: 'Escanear QR' }} />
      </Stack>
    </ProvedorOperador>
  );
}
