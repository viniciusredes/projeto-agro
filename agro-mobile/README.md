# Agro Mobile: o app do operador (React Native + Expo)

> **Material de apoio do treinamento.** Este README explica **como executar** o app, **como ele foi construído**, passo a passo, e **quais conceitos** cada etapa ensina.
>
> 📖 Regras de negócio e contratos da API: [README do back-end](../agro-backend/README.md). Telas de gestão: [README do front-end](../agro-frontend/README.md).

App para o **operador no campo**: registrar saída e retorno da máquina, ler o QR code colado nela e relatar avarias. A gestão (estoque, custos, painel) continua no front web.

Feito com **React Native** e **Expo** (SDK 57), em TypeScript, consumindo a mesma API do `agro-backend`.

---

## 1. Pré-requisitos

| Ferramenta | Para quê |
|---|---|
| [Node.js](https://nodejs.org) 24+ | Rodar o Expo e o Metro (o empacotador do React Native) |
| Celular com o app **Expo Go** (Play Store / App Store, versão atual) | Executar o projeto no aparelho sem instalar Android Studio nem Xcode |
| Celular e computador na **mesma rede Wi-Fi** | O app chama a API pelo IP do computador |
| *(Opcional)* Android Studio com um emulador | Alternativa ao celular |

---

## 2. Como executar

```bash
# Terminal 1: API
cd agro-backend
npm run dev

# Terminal 2: app
cd agro-mobile
npm install                 # só na primeira vez
cp .env.example .env.local  # só na primeira vez; depois edite o IP (abaixo)
npx expo start
```

Aparece um **QR code** no terminal. No Android, abra o **Expo Go** e escaneie; no iPhone, use a câmera.

### O endereço da API (`.env.local`)

No navegador, o front web chama `/api` e o proxy do `ng serve` repassa para a porta 3000. **No celular não existe proxy**: o app chama a API direto, pelo **IP do computador na rede**.

1. No Windows, rode `ipconfig` e anote o **Endereço IPv4** do adaptador Wi-Fi (ex.: `192.168.0.15`).
2. No `.env.local`: `EXPO_PUBLIC_API_URL=http://192.168.0.15:3000`.
3. Reinicie o `npx expo start` (o `.env` só é lido na partida).

> ⚠️ Trocou de rede, o IP muda: atualize o `.env.local`.

### Firewall do Windows

O celular precisa alcançar **duas portas** do computador: **8081** (o Metro, que entrega o app ao Expo Go) e **3000** (a API). Se o Windows perguntar ao rodar `npx expo start`, permita o acesso em **redes privadas**. Para liberar de uma vez (PowerShell **como administrador**):

```powershell
New-NetFirewallRule -DisplayName "Agro Frota (API e Metro)" -Direction Inbound -Protocol TCP -LocalPort 3000,8081 -Action Allow -Profile Private
```

A rede Wi-Fi precisa estar marcada como **privada** no Windows (Configurações → Rede e Internet → Wi-Fi → propriedades da rede).

### Estrutura

```
agro-mobile/
├── .env.example        # modelo do endereço da API (vai para o Git)
├── .env.local          # o endereço da SUA rede (fica fora do Git)
├── app.json            # nome, ícone, splash e permissões do app
└── src/
    ├── app/            # TELAS: cada arquivo é uma rota (Expo Router)
    │   ├── _layout.tsx # navegação em pilha, com a barra verde da marca
    │   └── index.tsx   # lista de máquinas
    ├── api.ts          # ponto único de acesso à API e tradução de erros
    ├── config.ts       # API_URL lida do .env.local
    ├── tema.ts         # cores da marca no claro e no escuro (as mesmas da web)
    ├── componentes/    # peças reutilizáveis (ex.: etiqueta de status)
    ├── hooks/          # lógica reutilizável com estado (ex.: useRequisicao)
    ├── models/         # tipos copiados do front web (o contrato da API)
    └── servicos/       # uma função por rota da API
```

---

## 3. Construção passo a passo

### M0 — Projeto Expo e conexão com a API

🎯 Criar o app, abri-lo no celular e provar que ele alcança a API pela rede.

🧩 Projeto criado com o template padrão (TypeScript + Expo Router), sem as telas de exemplo:

```bash
npx create-expo-app@latest agro-mobile --template default
```

`src/config.ts`:

```ts
// O Expo troca "process.env.EXPO_PUBLIC_..." pelo valor na hora de montar o app
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
```

`src/app/index.tsx` (tela de teste):

```tsx
useEffect(() => {
  fetch(`${API_URL}/maquinas`)
    .then(resposta => resposta.json())
    .then((lista: Maquina[]) => setMaquinas(lista))
    .catch(() => setErro(`Não foi possível acessar a API em ${API_URL}`));
}, []);
```

📚 **Conceitos**
- **React Native:** as telas são componentes React, mas viram componentes **nativos** do celular (`<View>`, `<Text>`), não HTML. Não existe CSS: os estilos são objetos (`StyleSheet.create`), com nomes em camelCase (`fontSize`).
- **Expo:** ferramentas em volta do React Native. O **Metro** empacota o JavaScript; o **Expo Go** executa o projeto no aparelho sem compilar um app nativo.
- **Expo Router:** cada arquivo em `src/app/` é uma tela (como as rotas do Angular, mas definidas pelos arquivos). O `_layout.tsx` diz como elas se organizam; aqui, em **pilha** (`Stack`).
- **`useEffect(..., [])`:** roda uma vez, quando a tela aparece, como o `ngOnInit` do Angular.
- **Variáveis `EXPO_PUBLIC_`:** só elas chegam ao app, e **ficam visíveis dentro dele**: servem para endereços, nunca para senhas.
- **Sem proxy, sem CORS:** no celular, o app chama a API direto. O `fetch` nativo do React Native **não aplica CORS** (essa é uma regra dos navegadores), por isso o back-end não precisou mudar.
- **`npx expo install`:** para instalar bibliotecas, use sempre este comando (e não `npm install`): ele escolhe a versão compatível com o SDK do Expo.

🧪 **Testes**
1. `npx tsc --noEmit` sem erros.
2. Com a API no ar, abra no Expo Go: "Conectado! 2 máquinas na API", com TR-01 e CO-02.
3. Pare a API e recarregue (no terminal do Expo, tecla `r`): aparece a mensagem de erro com o endereço usado.

---

### M1 — Lista de máquinas

🎯 Trocar a tela de teste por uma lista de verdade, organizada em camadas como no front web: acesso à API, busca de dados, tema e tela.

🧩 **Camadas** (o paralelo com o Angular):

| App móvel | Front web | Papel |
|---|---|---|
| `src/api.ts` (`requisitar`, `mensagemDeErro`) | `HttpClient` + `erro-api-interceptor` | Monta a URL, manda/recebe JSON, traduz erros |
| `src/servicos/maquinas.ts` (`listarMaquinas`) | `MaquinaService` | Uma função por rota da API |
| `src/hooks/use-requisicao.ts` | `rxResource` | Estados de carregando, erro, dados e atualizando |
| `src/tema.ts` (`useTema`) | `light-dark()` no CSS | Cores da marca no claro e no escuro |

`src/api.ts`:

```ts
// Diferente do HttpClient, o fetch NÃO trata 4xx/5xx como erro: é preciso olhar o "ok"
const corpo = await resposta.json().catch(() => null);
if (!resposta.ok) {
  const mensagem = typeof corpo?.erro === 'string' ? corpo.erro : `Erro inesperado (HTTP ${resposta.status}).`;
  throw new ErroApi(mensagem, resposta.status);
}
```

`src/hooks/use-requisicao.ts` (a primeira busca, com a limpeza):

```ts
useEffect(() => {
  let ativo = true;
  buscar()
    .then(resultado => ativo && setDados(resultado))
    .catch(e => ativo && setErro(mensagemDeErro(e)))
    .finally(() => ativo && setCarregando(false));
  return () => { ativo = false; };   // a tela saiu: ignora a resposta atrasada
}, [buscar]);
```

A lista (`src/app/index.tsx`):

```tsx
<FlatList
  data={maquinas ?? []}
  keyExtractor={maquina => String(maquina.id)}
  renderItem={({ item }) => <CartaoMaquina maquina={item} />}
  refreshControl={<RefreshControl refreshing={atualizando} onRefresh={recarregar} />}
  ListEmptyComponent={<Text>Nenhuma máquina cadastrada.</Text>}
/>
```

📚 **Conceitos**
- **`fetch` × `HttpClient`:** o `fetch` só lança erro quando **não há resposta** (rede, API parada). Um 409 ou 400 chega como resposta "normal", e o código precisa conferir `resposta.ok`.
- **Hook customizado:** `useRequisicao` guarda estado e é reaproveitado por qualquer tela que busca dados. Recebe uma função **estável** (declarada fora do componente), senão o efeito rodaria a cada renderização.
- **Efeito × evento:** no `useEffect`, o estado só muda quando a resposta chega (o lint do React acusa `setState` direto no corpo do efeito). No "puxar para atualizar", que é um **evento** do usuário, mudar o estado logo é o normal.
- **Limpeza do efeito:** o `return () => { ativo = false }` roda quando a tela sai; sem ela, uma resposta atrasada atualizaria uma tela que já fechou (o papel do `takeUntilDestroyed`).
- **`FlatList`:** só desenha os itens visíveis e reaproveita as linhas ao rolar (importante numa frota grande). `keyExtractor` faz o papel do `track` do `@for`.
- **`RefreshControl`:** o gesto de "puxar para atualizar", nativo em Android e iOS.
- **Props:** `<EtiquetaStatus status={...} />` recebe dados como o `input()` do Angular.
- **Tema pelo sistema:** `useColorScheme()` diz se o celular está no claro ou no escuro; as cores são **as mesmas** da web (incluindo o escuro revisto no R6).

🧪 **Testes**
1. As máquinas aparecem em cartões, com a etiqueta de status colorida e o horímetro em pt-BR (`1.000 h`).
2. Registre uma saída pela web e **puxe a lista para baixo** no celular: o status muda para "Em campo".
3. Pare a API e abra o app: mensagem de erro e o botão **Tentar novamente**. Suba a API e toque nele: a lista volta.
4. Troque o tema do celular para escuro: barra verde-floresta, cartões escuros e etiquetas no tom escuro.
5. `npx tsc --noEmit` e `npx expo lint` sem erros.

---

## 4. Problemas comuns

| Sintoma | Causa | Solução |
|---|---|---|
| "Não foi possível acessar a API em http://..." | API parada, IP errado ou firewall | Confira a API (`npm run dev`), o IP do `.env.local` (`ipconfig`) e a porta 3000 no firewall |
| O Expo Go não abre o projeto (fica carregando) | O celular não alcança a porta 8081 | Mesma rede Wi-Fi, rede **privada** no Windows e porta 8081 liberada; ou `npx expo start --tunnel` |
| A API mudou de endereço e o app não percebeu | O `.env` só é lido na partida | Pare e rode `npx expo start` de novo |
| "Project is incompatible with this version of Expo Go" | Expo Go desatualizado | Atualize o Expo Go na loja (o projeto usa o SDK 57) |
| `npm audit` mostra vulnerabilidades | Dependências das ferramentas de desenvolvimento do Expo | Não rode `npm audit fix --force`: ele troca versões fixadas pelo SDK e quebra o projeto. Use `npx expo install --fix` |
