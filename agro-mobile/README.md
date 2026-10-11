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
├── assets/images/      # ícone e splash, gerados da logo da web (M8a)
└── src/
    ├── app/            # TELAS: cada arquivo é uma rota (Expo Router)
    │   ├── _layout.tsx # navegação em pilha, com a barra verde da marca
    │   ├── index.tsx   # página inicial do operador (M8b)
    │   ├── maquinas.tsx       # lista de máquinas
    │   ├── identificacao.tsx  # "Quem é você?" (nome do operador)
    │   ├── escanear.tsx       # câmera que lê o QR da máquina
    │   └── maquina/[id]/      # rotas da máquina (o [id] vale para as duas)
    │       ├── index.tsx      # ficha, saída e retorno (/maquina/1)
    │       ├── avaria.tsx     # relatar avaria, em modal (/maquina/1/avaria)
    │       ├── foto-avaria.tsx  # foto da avaria para a O.S. aberta
    │       └── abastecimento.tsx  # registrar abastecimento, com a foto do recibo (Etapa 4)
    ├── api.ts          # ponto único de acesso à API e tradução de erros
    ├── config.ts       # API_URL lida do .env.local
    ├── tema.ts         # cores da marca no claro e no escuro (as mesmas da web)
    ├── validacao.ts    # regras de formulário em funções puras (ex.: horímetro)
    ├── qr.ts           # formato do QR da etiqueta (contrato com a web)
    ├── componentes/    # peças reutilizáveis (etiqueta de status, câmera, galeria, aviso, escolha segmentada, seletor de tema)
    ├── contextos/      # valores compartilhados entre telas (o operador, a preferência de tema)
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

### M2 — "Quem é você?": o operador salvo no aparelho

🎯 A saída de máquina exige o nome do `operador`, mas o MVP não tem login. O app pergunta o nome **uma vez**, guarda **no aparelho** e o usa nas saídas dali em diante.

🧩 Biblioteca de armazenamento, instalada pelo Expo (versão compatível com o SDK, já incluída no Expo Go):

```bash
npx expo install @react-native-async-storage/async-storage
```

`src/contextos/operador.tsx`:

```tsx
const ContextoOperador = createContext<Operador | null>(null);

export function ProvedorOperador({ children }) {
  const [nome, setNome] = useState<string | null>(null);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE)
      .then(salvo => setNome(salvo))
      .finally(() => setCarregado(true));
  }, []);

  async function definir(novoNome: string) {
    await AsyncStorage.setItem(CHAVE, novoNome.trim());
    setNome(novoNome.trim());
  }
  ...
}

export function useOperador() { ... }   // const { nome } = useOperador();
```

O provedor fica em volta de todas as telas (`_layout.tsx`), e a lista decide para onde ir:

```tsx
if (!carregado) return <ActivityIndicator />;     // ainda lendo o aparelho
if (!nome) return <Redirect href="/identificacao" />;
```

Na identificação, o botão usa `router.replace('/')`: a tela **sai da pilha**, então o Voltar não volta para ela.

📚 **Conceitos**
- **Contexto (`createContext` + Provider + hook):** um valor que qualquer tela lê sem passar de componente em componente. É o papel de um service global (`@Service()`) no Angular.
- **`AsyncStorage`:** armazenamento chave-valor **no aparelho**, que sobrevive a fechar o app. Diferente do `localStorage` da web, é **assíncrono**: por isso o `carregado`, para não redirecionar antes de a leitura terminar.
- **Formulário controlado:** o texto do `TextInput` vive no estado (`value` + `onChangeText`), o papel do `FormControl`. A regra "não aceita só espaços" é a mesma da API.
- **`Redirect` × `router.replace` × `router.push`:** o `Redirect` desvia durante a renderização; o `replace` troca a tela atual (sem volta); o `push` empilha (com volta).
- **Regra dos hooks:** sempre chamados na mesma ordem, antes de qualquer `return` antecipado.
- **`KeyboardAvoidingView`:** no iPhone, sobe o conteúdo quando o teclado abre (senão o botão fica escondido).
- **Barra por tela:** `<Stack.Screen options={{ headerRight }} />` dentro da tela ajusta só a barra dela (o nome do operador à direita).
- **Rotas tipadas:** com `typedRoutes`, `href="/identificacao"` é conferido pelo TypeScript; uma rota com erro de digitação não compila.

🧪 **Testes**
1. Na primeira abertura, aparece **"Quem é você?"**; o botão **Continuar** fica apagado enquanto o nome está vazio ou só com espaços.
2. Informe o nome: a lista aparece, com o primeiro nome e "trocar" na barra; o Voltar do Android **não** volta para a identificação.
3. Feche o app de vez e abra de novo: vai direto para a lista (o nome ficou salvo).
4. Toque em "trocar": a tela vem preenchida com o nome atual; mude e continue.

---

### M3 — Ficha da máquina e registrar saída

🎯 Tocar numa máquina abre a ficha dela, e, se estiver disponível, o operador registra a saída informando só a frente de trabalho (o nome já vem do M2).

🧩 **Rota dinâmica:** o arquivo `src/app/maquina/[id].tsx` atende `/maquina/1`, `/maquina/2`...

```tsx
const { id } = useLocalSearchParams<{ id: string }>();
const buscar = useCallback(() => buscarFicha(Number(id)), [id]);
const { dados, erro, carregando, recarregar } = useRequisicao(buscar);
```

**A ficha em duas chamadas paralelas** (`src/servicos/maquinas.ts`):

```ts
export async function buscarFicha(id: number) {
  const [maquina, movimentacoes] = await Promise.all([buscarMaquina(id), listarMovimentacoes(id)]);
  return { maquina, saidaAberta: movimentacoes.find(mov => !mov.dataRetorno) ?? null };
}
```

A API não tem `GET /maquinas/:id` (é o **exercício 1** do back-end), então `buscarMaquina` busca a lista e filtra pelo id.

**Registrar saída:**

```ts
const resposta = await registrarSaida(maquinaId, { operador: nome, frenteTrabalho: frente.trim() });
Alert.alert('Saída registrada', resposta.mensagem);
```

**Cartão inteiro como link** (lista):

```tsx
<Pressable
  onPress={() => router.push({ pathname: '/maquina/[id]', params: { id: maquina.id } })}
  accessibilityRole="link"
  style={({ pressed }) => [estilos.cartao, { borderColor: pressed ? tema.primaria : tema.borda }]}
>
  ...
</Pressable>
```

> ⚠️ **Erro que aconteceu de verdade:** a primeira versão usou `<Link href=... asChild><Pressable style={({ pressed }) => ...}>`. O `Link` com `asChild` repassa as propriedades ao filho, mas **não** repassa um `style` em forma de função: o cartão perdeu o fundo, a borda e o layout em linha (tudo ficou empilhado). Com `asChild`, use estilo comum; para estilo que muda ao tocar, use `Pressable` + `router.push`.

**A lista se atualiza ao voltar** da ficha:

```ts
useFocusEffect(useCallback(() => { recarregar(); }, [recarregar]));
```

📚 **Conceitos**
- **Rota dinâmica `[id]`:** o nome do arquivo entre colchetes vira parâmetro (o `:id` do Angular); o valor chega como **texto** e é convertido com `Number`.
- **`Promise.all`:** dispara as duas chamadas ao mesmo tempo e espera as duas (o `forkJoin` do kardex na web). Se uma falhar, o todo falha.
- **`useCallback` com dependências:** a função de busca da ficha depende do `id`; com `useCallback`, ela só muda quando o `id` muda, e o `useRequisicao` não busca em ciclo.
- **`useFocusEffect`:** roda quando a tela **volta a ficar visível** (não só quando é criada). Exige uma função estável: por isso o `recarregar` do hook virou `useCallback`. Sem isso: recarrega → muda o estado → função nova → roda de novo → ciclo infinito.
- **Ação por situação:** a ficha mostra o formulário só para máquina **Disponível**; em campo, mostra quem está com ela e onde; em manutenção, explica por que não pode sair.
- **`Alert.alert`:** o aviso **nativo** do Android/iOS. O erro mostra a mensagem da API (ex.: 409 se outro operador tirou a máquina antes).
- **Cartão inteiro tocável:** `Pressable` + `router.push`, com `accessibilityRole="link"` e um rótulo que descreve a máquina para leitores de tela. O estilo em função (`({ pressed }) => ...`) dá a resposta visual ao toque (a borda fica verde).
- **`<Link>` × `router.push`:** o `<Link>` é declarativo (ótimo para textos, como o "trocar"); o `router.push` é a navegação "por código", dentro de um evento.
- **`keyboardShouldPersistTaps="handled"`:** com o teclado aberto, o toque no botão funciona na primeira vez (sem isso, o primeiro toque só fecha o teclado).

🧪 **Testes**
1. Toque na TR-01: a ficha abre com o título "TR-01", o modelo, o status e o horímetro.
2. Com a frente vazia, **Registrar saída** fica apagado. Preencha "Talhão 5" e registre: aviso "Saída registrada", e a ficha passa a mostrar "Em campo · seu nome · Talhão 5".
3. Volte para a lista: a TR-01 aparece "Em campo" sem precisar puxar.
4. Na web, a TR-01 aparece em campo com o seu nome (o Painel e as Movimentações também).
5. Abra a mesma máquina em dois celulares (ou registre a saída pela web antes): o segundo recebe a mensagem 409 da API.

---

### M4 — Registrar retorno

🎯 Com a máquina em campo, o operador informa o horímetro de agora (e as avarias, se houver) e devolve a máquina. O app mostra as horas trabalhadas **enquanto ele digita** e barra horímetro menor que o atual antes de enviar.

🧩 A regra numa **função pura** (`src/validacao.ts`):

```ts
export function validarHorimetro(texto: string, atual: number): ResultadoHorimetro {
  const limpo = texto.trim().replace(',', '.');   // o teclado brasileiro usa vírgula
  if (limpo === '') return { valido: false, erro: null };
  const valor = Number(limpo);
  if (!Number.isFinite(valor)) return { valido: false, erro: 'Digite só números (ex.: 1012,5).' };
  if (valor < atual) return { valido: false, erro: `Não pode ser menor que o atual (${formatarHoras(atual)} h).` };
  return { valido: true, valor, horas: Math.round((valor - atual) * 10) / 10 };
}
```

Na tela, o resultado é um **valor derivado**, recalculado a cada tecla:

```tsx
const resultado = validarHorimetro(horimetro, horimetroAtual);
...
<TextInput value={horimetro} onChangeText={setHorimetro} keyboardType="decimal-pad" />
{resultado.valido && <Text>{formatarHoras(resultado.horas)} h trabalhadas nesta saída</Text>}
```

Envio, com o campo opcional fora do corpo quando vazio:

```ts
await registrarRetorno(maquinaId, { horimetro: resultado.valor, avarias: avarias.trim() || undefined });
```

📚 **Conceitos**
- **`keyboardType="decimal-pad"`:** abre o teclado numérico, que no Brasil traz **vírgula**. O app converte para ponto antes de usar `Number` (o `Number('1012,5')` daria `NaN`).
- **Valor derivado sem estado:** `resultado` não é um `useState`: é calculado de novo a cada renderização a partir do texto digitado (o papel do `computed`). Guardar em estado seria duplicar a informação e arriscar ficar desatualizado.
- **União discriminada:** `{ valido: true; valor; horas } | { valido: false; erro }`. Depois de testar `resultado.valido`, o TypeScript sabe quais campos existem.
- **Função pura:** sem tela e sem estado, testável com uma linha (`validarHorimetro('1012,5', 1000)`), como o `core/validacao.ts` do Passo 18 da web.
- **Validação no app × na API:** o app avisa **antes** de enviar (rápido, sem rede); a API continua recusando com 400. Quem chama a API por outro caminho não escapa da regra.
- **Ponto flutuante:** `1012.3 - 1000` dá `12.299999999999955`; o arredondamento para 1 casa (o mesmo da API) mostra 12,3.
- **`accessibilityLiveRegion="polite"`:** no Android, o leitor de tela anuncia o erro ou as horas quando o texto muda, sem o operador precisar procurar.
- **Campo opcional:** `avarias: texto || undefined` faz o campo **sumir** do JSON quando vazio (o `JSON.stringify` ignora `undefined`).

🧪 **Testes**
1. Com uma máquina em campo, abra a ficha: o quadro "Em campo" e o formulário **Registrar retorno**.
2. Digite um horímetro **menor** que o atual: a borda fica vermelha, aparece "Não pode ser menor que o atual" e o botão fica apagado.
3. Digite o atual + `12,5` (com vírgula): aparece "12,5 h trabalhadas nesta saída".
4. Escreva uma avaria e registre: aviso "Retorno registrado" com as horas, e a máquina volta a **Disponível**.
5. Na web, em **Movimentações**, a linha mostra as horas e a avaria.

---

### M5 — QR code: etiqueta na web, leitura no app

🎯 Ao lado da máquina, o operador aponta a câmera para a etiqueta colada nela e a ficha abre na hora, sem procurar na lista. A etiqueta é gerada e impressa pela **web**.

🧩 **O contrato do QR:** `agrofrota:maquina:<id>`, gerado pela web (`agro-frontend/src/app/core/qr.ts`) e lido pelo app (`src/qr.ts`):

```ts
const FORMATO = /^agrofrota:maquina:(\d+)$/;
export function idDaMaquinaNoQr(texto: string): number | null {
  const encontrado = FORMATO.exec(texto.trim());
  return encontrado ? Number(encontrado[1]) : null;
}
```

**App:** câmera instalada pelo Expo e permissão explicada no `app.json`:

```bash
npx expo install expo-camera
```

```json
["expo-camera", { "cameraPermission": "O Agro Frota usa a câmera para ler o QR code colado nas máquinas." }]
```

`src/app/escanear.tsx`:

```tsx
const [permissao, pedirPermissao] = useCameraPermissions();
const jaLeu = useRef(false);   // a câmera lê várias vezes por segundo: navega uma vez só

<CameraView
  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
  onBarcodeScanned={({ data }) => {
    const id = idDaMaquinaNoQr(data);
    if (id !== null && !jaLeu.current) {
      jaLeu.current = true;
      router.replace({ pathname: '/maquina/[id]', params: { id } });
    }
  }}
/>
```

**Web:** o detalhe da máquina ganhou a seção **"Etiqueta QR da máquina"**, com a biblioteca `uqr` (ESM, sem dependências), que gera o QR como SVG:

```ts
protected readonly qrDaMaquina = computed(() => {
  const svg = renderSVG(conteudoDoQrDaMaquina(this.id()));
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
});
```

O botão **Imprimir etiqueta** abre uma **janela própria**, só com a etiqueta, montada com `createElement` e `textContent`, e manda imprimir quando a imagem do QR carrega.

📚 **Conceitos**
- **Contrato entre dois apps:** o texto do QR é combinado entre quem gera (web) e quem lê (app), como um contrato de API. O prefixo `agrofrota:maquina:` faz o app ignorar QR codes que não são da frota.
- **Confira a documentação da sua versão:** o `AGENTS.md` do template avisa que o Expo muda a cada SDK. Os nomes (`CameraView`, `useCameraPermissions`, `data`) foram conferidos na documentação do **SDK 57**. Mesmo assim, o TypeScript achou uma API que **não existe mais** no React Native 0.86 (`StyleSheet.absoluteFillObject`): por isso o `tsc` roda a cada passo.
- **Permissões:** o app explica **por que** quer a câmera antes de pedir. Se o usuário negou de vez (`canAskAgain` falso), o sistema não pergunta de novo, e o caminho é abrir as configurações (`Linking.openSettings()`). A frase do `app.json` é a que o iPhone mostra no pedido.
- **`useRef` como trava:** guarda um valor **sem** redesenhar a tela. A câmera dispara a leitura muitas vezes por segundo; a trava garante uma navegação só.
- **`router.replace` depois da leitura:** a câmera sai da pilha; o Voltar da ficha volta para a lista.
- **Data URL:** o SVG vira `data:image/svg+xml,...` e entra numa `<img>` comum, sem `innerHTML` (o Angular removeria o SVG por segurança).
- **Imprimir só uma parte da página:** a primeira tentativa (esconder "tudo menos a etiqueta" com `@media print`) **falhou** de verdade: o conteúdo do `mat-sidenav` tem `overflow` e `transform`, e a etiqueta saía cortada. A janela própria não depende do layout do app.
- **Dados do cadastro nunca viram HTML:** tag e modelo entram na janela com `textContent`, não concatenados num texto HTML: uma tag "maliciosa" não executa nada.

🧪 **Testes**
1. Na **web**, abra uma máquina: a seção "Etiqueta QR da máquina" mostra o QR, a tag e o modelo. **Imprimir etiqueta** abre a janela só com a etiqueta e o diálogo de impressão (se o navegador bloquear, aparece um aviso pedindo para permitir pop-ups).
2. No **app**, toque em **Escanear QR da máquina**: na primeira vez, o pedido de permissão da câmera.
3. Aponte para a etiqueta (na tela do computador ou impressa): a ficha da máquina abre; o Voltar volta para a lista.
4. Aponte para outro QR qualquer (de um site, por exemplo): aparece "Este QR não é de uma máquina do Agro Frota." e a câmera continua aberta.
5. Negue a permissão: aparece a explicação e o botão para permitir (ou abrir as configurações).

### M6 — Relatar avaria: abrir O.S. corretiva pelo app

🎯 A máquina quebrou no campo: o operador relata a avaria na hora, pelo celular. O app abre uma **O.S. corretiva** e a máquina vai para a oficina. Nenhuma rota nova no back-end: o app usa o `POST /ordens-servico` que a web já usa.

🧩 **Rotas aninhadas:** a ficha saiu de `maquina/[id].tsx` e foi para uma **pasta** (`git mv`, para o Git entender que é o mesmo arquivo):

```
src/app/maquina/[id]/index.tsx   →  /maquina/1          (a ficha)
src/app/maquina/[id]/avaria.tsx  →  /maquina/1/avaria   (o relato, em modal)
```

No `_layout.tsx`, o relato abre como **modal**:

```tsx
<Stack.Screen name="maquina/[id]/avaria" options={{ title: 'Relatar avaria', presentation: 'modal' }} />
```

**Serviço novo**, `src/servicos/ordens-servico.ts` (tipos copiados do front em `src/models/ordem-servico.ts`):

```ts
export function abrirOS(dados: DadosAberturaOS): Promise<RespostaAberturaOS> {
  return requisitar<RespostaAberturaOS>('/ordens-servico', { method: 'POST', body: JSON.stringify(dados) });
}
```

**A ficha agora sabe da O.S. aberta:** o `buscarFicha` faz **três** chamadas ao mesmo tempo:

```ts
const [maquina, movimentacoes, ordensAbertas] = await Promise.all([
  buscarMaquina(id),
  listarMovimentacoes(id),
  listarOrdensAbertas(id),   // GET /ordens-servico?maquinaId=1&status=Aberta
]);
```

**Confirmação antes de tirar a máquina de operação** (`avaria.tsx`):

```tsx
Alert.alert('Abrir O.S. corretiva?', consequencia, [
  { text: 'Cancelar', style: 'cancel' },
  { text: 'Abrir O.S.', style: 'destructive', onPress: () => enviar(resultado.valor) },
]);
```

📚 **Conceitos**
- **Rotas aninhadas:** o `[id]` da pasta vale para todos os arquivos dentro dela. A tela de avaria lê o mesmo `useLocalSearchParams<{ id: string }>()` da ficha.
- **Modal:** `presentation: 'modal'` mostra que é uma ação **à parte**. No iPhone, a tela sobe de baixo; no Android, o efeito é discreto. O `router.back()` fecha o modal e volta para a ficha.
- **`Alert` com botões:** é o diálogo nativo do sistema. A mensagem diz **o que vai acontecer** ("A saída de Ana será encerrada…"), não um genérico "Tem certeza?". O `style: 'destructive'` deixa o botão vermelho no iPhone.
- **Reaproveitar a regra, não copiar:** o horímetro do relato segue a mesma regra do retorno (M4). Por isso a validação é a mesma função pura, `validarHorimetro`.
- **A regra mora na API:** se a máquina está em campo, a API encerra a saída sozinha (regra OS3 do back-end) e devolve `movimentacaoEncerrada`. O app só **avisa antes** e **mostra depois** as horas trabalhadas. Se outra pessoa já abriu uma O.S. para a máquina, a API responde **409**, e o app mostra a mensagem dela.
- **Recarregar ao voltar:** a ficha usa `useFocusEffect` para buscar de novo quando o modal fecha. A ref `primeiraVez` evita uma busca dupla na abertura.
- **Cor com significado:** o botão do relato é **laranja** (o sinal da marca), não verde. Ação que tira a máquina de operação pede atenção.
- **Rotas tipadas são geradas:** com `typedRoutes`, o Expo gera os tipos das rotas em `.expo/types/router.d.ts`. Depois de mover a ficha, o `tsc` acusou `'/maquina/[id]'` como rota inexistente: o arquivo de tipos estava velho. Basta rodar `npx expo start` uma vez para gerar de novo.

🧪 **Testes**
1. Abra a ficha de uma máquina **Disponível**: aparece o botão **Relatar avaria** (contorno laranja).
2. Toque nele: o modal abre com o cursor na descrição. O botão **Abrir O.S. corretiva** só acende com a descrição preenchida e um horímetro válido. Um horímetro menor que o atual mostra o erro em vermelho.
3. Toque em **Abrir O.S. corretiva** e depois em **Cancelar**: nada acontece. Repita e confirme: aparece "O.S. nº X aberta", e a ficha volta mostrando **Em manutenção** com o número, o tipo e a descrição da O.S. O botão de relato some.
4. Com uma máquina **Em campo**: o modal avisa "A máquina está em campo com…". Ao confirmar, a mensagem mostra as horas trabalhadas da saída encerrada.
5. Na **web**, abra a lista de O.S.: a O.S. corretiva aparece aberta, com a descrição do app.

### M7 — Foto da avaria *(opcional)*

🎯 Uma foto vale mais que a descrição: o operador fotografa o vazamento ou a peça quebrada, e a foto fica na O.S. para a oficina.

Este passo teve duas partes:
- **M7a, back-end:** rotas novas na API (veja a **Parte OS8** do [README do back-end](../agro-backend/README.md)):
  - `POST /ordens-servico/:id/fotos`, com a foto em base64 dentro do JSON, até 2 MB, 5 por O.S.;
  - a listagem das fotos;
  - a imagem em si.
- **M7b, app:** o que está abaixo.

🧩 **Sem dependência nova:** o `expo-camera` do M5 também tira fotos. A câmera virou um componente reutilizável, `src/componentes/camera.tsx`, com permissão, flash, virar câmera e **prévia** (Refazer / Usar esta foto):

```tsx
const camera = useRef<CameraView>(null);   // "controle remoto" da câmera

const resultado = await camera.current.takePictureAsync({
  quality: 0.5,  // JPEG mais comprimido: a foto cheia de um celular passa fácil dos 2 MB
  base64: true,  // os bytes em texto, que vão no JSON
});
```

**Conferir o tamanho sem decodificar** (`src/validacao.ts`): cada 4 caracteres de base64 guardam 3 bytes:

```ts
export function tamanhoDoBase64(base64: string): number {
  const enchimento = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return (base64.length / 4) * 3 - enchimento;
}
```

**Serviço** (`src/servicos/fotos-os.ts`):

```ts
export function enviarFotoOS(ordemServicoId: number, imagemBase64: string): Promise<RespostaFotoOS> {
  return requisitar<RespostaFotoOS>(`/ordens-servico/${ordemServicoId}/fotos`, {
    method: 'POST',
    body: JSON.stringify({ imagem: imagemBase64 }),
  });
}
```

**Dois caminhos até a câmera** (`src/app/maquina/[id]/foto-avaria.tsx`):
1. Logo depois de abrir a O.S., o aviso oferece **Fotografar avaria**. O `router.replace` faz a câmera tomar o lugar do relato.
2. Na ficha de uma máquina com O.S. aberta, o botão **Fotografar avaria** permite mandar mais fotos, até 5.

**Feedback e onde ver as fotos** (ajustes depois do primeiro teste no celular: as fotos chegavam à API, mas o operador não tinha retorno nem como vê-las):
- **Na câmera:**
  - o título diz qual foto é ("Foto 3 de 5 · O.S. nº 1");
  - enquanto a foto é processada, aparece "Processando a foto…";
  - o botão só funciona depois que a câmera avisa que está pronta (`onCameraReady`).
- **Depois de enviar:** o aviso diz "Foto 3 de 5 anexada…" e oferece **Tirar outra** ou **Concluir**. Para tirar outra, a câmera recomeça do zero trocando a `key` do componente.
- **Na ficha:** a **galeria** (`src/componentes/galeria-fotos.tsx`) mostra "Fotos da avaria · 3 de 5" e as miniaturas. Um toque abre a foto na tela cheia, num `Modal`. A ficha agora traz as fotos no `buscarFicha`, **depois** do `Promise.all`, porque a busca precisa do id da O.S.
- **Na web:** o detalhe da O.S. ganhou a seção **Fotos da avaria** (veja o [README do front-end](../agro-frontend/README.md)).

```tsx
// A API devolve a url sem o servidor: o <Image> precisa do endereço completo
<Image source={{ uri: `${API_URL}${foto.url}` }} style={{ width: 96, height: 96 }} />
```

📚 **Conceitos**
- **`ref` em componente:** o `useRef` também guarda um componente da tela, para chamar métodos dele (`takePictureAsync`). É o jeito React de "apertar o botão" da câmera pelo código.
- **Leia a documentação da opção:** `skipProcessing: true` deixa a foto mais rápida, mas os tipos do `expo-camera` avisam que ele **ignora o `quality`**. A foto sairia cheia (3 a 6 MB) e a API recusaria. Uma opção "de desempenho" pode desligar outra.
- **Validar no app × na API:** o app confere só o **tamanho**, para não gastar o 4G do campo à toa. Se é mesmo JPEG ou PNG, quem decide é a API, a autoridade, como no horímetro (M4).
- **Base64 custa um terço a mais:** 2 MB de foto viram ~2,7 MB de texto. Por isso a API aceita 3 MB de corpo nessa rota.
- **Prévia antes de enviar:** foto tremida ou cortada é comum no campo. Mostrar a foto e oferecer **Refazer** evita lixo na O.S.
- **`Alert` com escolhas:** depois de abrir a O.S., o aviso tem dois botões ("Agora não" e "Fotografar avaria"). O `cancelable: false` impede que o operador feche o aviso no Android sem escolher.
- **Toda ação precisa de retorno visível:** a foto chegava à API, mas sem número, contagem nem galeria o operador achava que nada tinha acontecido. Funcionar não basta: a pessoa precisa **ver** que funcionou.
- **Buscas que dependem de outra:** o `Promise.all` serve para buscas independentes. As fotos dependem do id da O.S., então vêm num `await` depois dele.
- **`key` para recomeçar um componente:** com outra `key`, o React descarta o componente antigo, com o estado dele (a prévia), e cria um novo.
- **`<Image>` com endereço da rede:** a imagem é baixada direto da API pela `url`. O JSON da ficha só traz os dados (tamanho, data), o que mantém a ficha leve.
- **Foto grande no Android (`resizeMethod="resize"`):** a foto do celular tem ~3000 × 4000 pixels. No primeiro teste, ela aparecia na web mas **não** no app: o Android tentava montar a imagem inteira na memória (~50 MB) e desistia sem avisar. Com `resizeMethod="resize"`, a foto é reduzida ao tamanho da miniatura antes de ser montada. O navegador faz isso sozinho, por isso a web funcionava. O `onError` mostra "Não carregou" se algo ainda falhar.
- **Aviso com a cara do app (`src/componentes/aviso.tsx`):** o `Alert.alert` usa o diálogo **do sistema**: no Android, botões azuis em maiúsculas, sem as cores da marca e sem tema escuro. O componente `Aviso` é um `Modal` transparente com as cores do tema, um símbolo por tom (✓ sucesso, ! alerta ou erro) e os botões em pílula das telas. O botão principal (cheio) é a ação recomendada. Ele substituiu **todos** os `Alert` do app: um design system só funciona se for usado em tudo.
- **Onde guardar o estado do aviso:** na ficha, o aviso fica no componente da **ficha**, e não no formulário. Depois de registrar, a ficha recarrega e o formulário some, e um aviso guardado nele sumiria junto. Os formulários recebem uma função `avisar`.
- **Fechar sem escolher (`aoDispensar`):** pelo Voltar do Android, o aviso fecha sem que nenhum botão seja tocado. Depois de abrir a O.S., isso também leva à ficha. Depois de enviar uma foto, a câmera recomeça na hora, e assim não há como reenviar a mesma foto por engano.
- **Câmera da frente:** ela não tem flash, e pedir flash a ela travava a captura (tela branca). Agora o botão de flash só aparece na câmera de trás, e virar a câmera desliga o flash. O `animateShutter={false}` tira a animação de clique, que pinta a tela de branco. O `Promise.race` com 15 segundos garante um aviso de erro se a câmera não responder.
- **Explicar o que sumiu:** no limite de 5 fotos, o botão some e um aviso diz por quê ("Limite de fotos atingido"). Um botão que desaparece sem explicação parece defeito.
- **Os hooks vêm antes de qualquer `return`:** o React identifica cada hook pela **ordem** em que é chamado. Um `useEffect` depois de um `if (...) return` às vezes roda e às vezes não, e o React quebra a tela. (Esse erro apareceu num rascunho deste passo e foi corrigido.)

🧪 **Testes**
1. Relate uma avaria (M6). No aviso "O.S. nº X aberta", toque em **Fotografar avaria**.
2. Na primeira vez, o celular pede a câmera (a frase do `app.json` aparece no iPhone).
3. O título mostra "Foto 1 de 5 · O.S. nº X". Fotografe: aparece "Processando a foto…" e depois a prévia. Toque em **Refazer**, fotografe de novo e toque em **Usar esta foto**: o aviso diz "Foto 1 de 5 anexada…".
4. Toque em **Tirar outra**: a câmera volta, e o título passa a "Foto 2 de 5". Depois toque em **Concluir**.
5. Na ficha, a galeria mostra "Fotos da avaria · 2 de 5" com as miniaturas. Toque numa delas: a foto abre na tela cheia, com data e tamanho.
6. Mande fotos até completar 5: no lugar do botão **Fotografar avaria**, a ficha mostra o aviso "Limite de fotos atingido".
7. Teste **Flash** e **Virar câmera**.
8. Na **web**, abra a O.S.: a seção **Fotos da avaria** mostra as miniaturas. Um clique abre a foto inteira numa aba nova.

### M8a — Identidade do app: nome, ícone e splash

🎯 O app deixa de parecer um projeto de exemplo: no celular, ele se chama **Agro Frota**, tem o trator da marca como ícone e abre com a logo, no claro e no escuro.

🧩 **As imagens saem da logo da web** (`agro-frontend/public/img/`), geradas com Python e Pillow:

| Arquivo (`assets/images/`) | O que é |
|---|---|
| `icon.png` | Ícone principal (iOS e lojas): o trator, sem o texto, sobre o creme do tema. Opaco, 1024 × 1024 |
| `android-icon-foreground.png` | Ícone adaptativo do Android: o trator, com fundo transparente |
| `android-icon-background.png` | Fundo do ícone adaptativo: o creme do tema (`#f5f4ee`) |
| `android-icon-monochrome.png` | Silhueta branca, para os ícones temáticos do Android 13+ |
| `splash-icon.png` / `splash-icon-escuro.png` | A logo completa, para a tela de abertura no claro e no escuro |
| `favicon.png` | Ícone da versão web do app |

No `app.json`:

```json
"name": "Agro Frota",
"scheme": "agrofrota",
"android": { "adaptiveIcon": { "backgroundColor": "#f5f4ee", ... } },
"plugins": [
  ["expo-splash-screen", {
    "backgroundColor": "#f5f4ee",
    "image": "./assets/images/splash-icon.png",
    "imageWidth": 288,
    "dark": { "backgroundColor": "#111a15", "image": "./assets/images/splash-icon-escuro.png" }
  }]
]
```

As imagens do template (logos do Expo e do React, ícones de abas, `expo.icon`) foram removidas com `git rm`: nenhuma era usada.

📚 **Conceitos**
- **Ícone não é logo:** com 48 px na tela inicial, o texto "Agro Frota" ficaria ilegível. O ícone usa só o desenho, e o nome aparece embaixo dele, vindo do `name` do `app.json`.
- **Ícone adaptativo (Android):** o sistema recorta o ícone com a máscara do fabricante (círculo, gota, quadrado arredondado). Só o **círculo central de ~66%** é garantido, e por isso o trator ocupa ~60% da largura. Frente e fundo são camadas separadas, para o sistema animá-las.
- **Splash do Android 12+:** a imagem fica numa área circular do tamanho de um ícone. Uma logo larga teria as pontas cortadas. A imagem é quadrada, com a logo ocupando 58% da largura, que é o tamanho que cabe no círculo seguro.
- **Tema claro e escuro desde a abertura:** o `"userInterfaceStyle": "automatic"` segue o tema do celular, e a opção `dark` do splash usa a logo para fundo escuro (`#111a15`, o mesmo `tema.fundo` das telas). O app abre no tema certo, sem flash branco.
- **O Expo Go não mostra o ícone nem o splash do app:** ele é um app "hospedeiro", com o ícone dele. Para ver os nossos, é preciso gerar um APK, com o EAS Build na nuvem (`npx eas-cli build -p android --profile preview`, exige conta Expo gratuita) ou com o Android Studio (`npx expo run:android`).

🧪 **Testes**
1. `npx expo-doctor`: 21/21 verificações.
2. `npx expo config --type public`: `name: 'Agro Frota'` e o splash com a variante `dark`.
3. *(Com um APK)* O ícone na tela inicial mostra o trator e o nome "Agro Frota". O splash mostra a logo sobre o creme e, com o celular no tema escuro, a logo clara sobre o verde-escuro.

### M8b — Página inicial do operador e escolha de tema

🎯 O app abre numa **página inicial** feita para quem está no campo, com a logo, e o operador pode fixar o tema claro ou escuro (o padrão continua sendo seguir o celular).

🧩 **Rotas:** a lista de máquinas saiu do `index.tsx` (`git mv` para `maquinas.tsx`, rota `/maquinas`). O `index.tsx` novo é a página inicial (`/`). A verificação "ninguém se identificou → `/identificacao`" e o "Nome · trocar" da barra foram junto para a página inicial.

**O que a página inicial mostra:**
1. A logo da marca (a versão do tema atual), "Boa tarde, Ana!" e a data de hoje.
2. O botão grande **Escanear QR da máquina**.
3. **Com você agora:** as máquinas que o operador tirou e ainda não devolveu (saída sem retorno no nome dele), com a frente de trabalho e a hora da saída. Um toque abre a ficha, para registrar o retorno.
4. **Frota agora:** três números (no pátio, em campo, na oficina) nas cores das etiquetas de status, e o botão **Ver todas as máquinas**.
5. **Aparência:** Sistema | Claro | Escuro.

Uma busca só monta a página (`buscarPainelDoOperador`, em `servicos/maquinas.ts`):

```ts
const [maquinas, movimentacoes] = await Promise.all([listarMaquinas(), requisitar<Movimentacao[]>('/movimentacoes')]);
const comigo = movimentacoes
  .filter(mov => !mov.dataRetorno && mesmoNome(mov.operador, nome))
  .flatMap(saida => { const maquina = maquinas.find(m => m.id === saida.maquinaId); return maquina ? [{ maquina, saida }] : []; });
```

**A escolha de tema** (`src/contextos/preferencia-tema.tsx`):

```ts
const ESQUEMA = { sistema: 'unspecified', claro: 'light', escuro: 'dark' } as const;

function escolher(nova: PreferenciaTema) {
  Appearance.setColorScheme(ESQUEMA[nova]);   // troca o tema do app inteiro
  setPreferencia(nova);
  AsyncStorage.setItem(CHAVE, nova);           // lembra na próxima abertura
}
```

📚 **Conceitos**
- **Trocar o tema na fonte:** o `Appearance.setColorScheme` muda o que o `useColorScheme()` devolve **no app inteiro**. O `useTema()` de todas as telas já usava esse hook, então nenhuma tela precisou mudar. `'unspecified'` desfaz a escolha e volta a seguir o celular. Teclado e componentes nativos também acompanham.
- **Padrão sensato, escolha disponível:** quem não mexe em nada continua com o tema do celular. A escolha fica salva no aparelho (`AsyncStorage`), como o nome do operador.
- **Provedor por fora:** no `_layout.tsx`, o `ProvedorPreferenciaTema` envolve as telas. A pilha (com as cores da barra) fica num componente de dentro (`Telas`), para já nascer com o tema escolhido.
- **Imagem do pacote (`require`):** a logo entra no app na hora de montar (não vem da API). Há uma versão para cada tema, escolhida pelo `useColorScheme()`.
- **Informação para quem usa:** a página inicial responde às perguntas do operador ("o que está comigo?", "o que tem disponível?") antes de ele precisar procurar. A lista completa continua a um toque.
- **Comparar nomes digitados:** "ana" e "Ana " são a mesma pessoa. A comparação ignora espaços nas pontas e maiúsculas (`toLocaleLowerCase('pt-BR')`).

🧪 **Testes**
1. Abra o app: a página inicial mostra a logo, a saudação com o seu nome e a data.
2. Com nenhuma máquina sua em campo, "Com você agora" diz que não há nenhuma. Registre a saída de uma máquina e volte ao início: ela aparece, com a frente de trabalho e a hora. Toque nela: abre a ficha. Registre o retorno e volte: ela some, e os números da frota se atualizam.
3. Toque nos números da frota ou em **Ver todas as máquinas**: abre a lista (`/maquinas`).
4. Em **Aparência**, toque em **Escuro**: o app inteiro escurece na hora, e a logo troca para a versão escura. **Claro** faz o contrário. **Sistema** volta a seguir o celular (troque o tema do celular para conferir).
5. Feche o app pelo multitarefa e abra de novo: a escolha continua valendo.
6. Puxe a página para baixo: ela recarrega.

## Etapa 4 — Abastecimento

A Etapa 4 atravessa as três partes do projeto. O operador **registra** o abastecimento no app, com a foto do recibo. A API guarda e calcula (Partes AB1 a AB3 do [README do back-end](../agro-backend/README.md)). O gestor **confere** na web.

### A4 — Registrar abastecimento, com a foto do recibo

🎯 Ao lado da máquina, o operador registra o abastecimento: de onde veio o combustível, litros, horímetro e, no posto, o nome do posto, o valor pago e a **foto do recibo**. O registro vai para a conferência do gestor.

🧩 **Tela nova** `src/app/maquina/[id]/abastecimento.tsx`, aberta pelo botão **Registrar abastecimento** da ficha (vale em qualquer situação da máquina).

| | Posto | Tanque da fazenda |
|---|---|---|
| Campos | litros, horímetro, nome do posto, valor pago | litros, horímetro |
| Foto | recibo, **obrigatória** | bomba, opcional |
| Ao vivo | preço por litro (valor ÷ litros) | aviso: "o custo é o da última compra do diesel" |

**Escolha segmentada genérica** (`src/componentes/escolha-segmentada.tsx`): os botões "Posto | Tanque da fazenda" são os mesmos do "Sistema | Claro | Escuro". O seletor de tema passou a usar o componente novo:

```tsx
export function EscolhaSegmentada<T extends string>({ opcoes, valor, aoEscolher, rotulo }: Props<T>) { ... }

<EscolhaSegmentada opcoes={ORIGENS} valor={origem} aoEscolher={setOrigem} rotulo="Origem do combustível" />
```

**A câmera do M7 dentro de um `Modal`:** ela abre por cima do formulário e devolve a foto, que aparece em miniatura, com **Tirar outra** e **Remover**. Nada do que foi digitado se perde.

```tsx
<Modal visible={cameraAberta} animationType="slide" onRequestClose={() => setCameraAberta(false)}>
  <Camera aoConfirmar={capturada => { setFoto(capturada); setCameraAberta(false); }} />
</Modal>
```

**O horímetro mínimo vem da mesma regra da API**: o maior entre o da máquina e o do último abastecimento não recusado (`buscarDadosParaAbastecer`, em `src/servicos/abastecimentos.ts`, com `Promise.all`).

**Funções puras novas** em `src/validacao.ts`: `validarPositivo` (litros e valor pago, com vírgula) e `formatarReais` (`R$ 746,30`; com 3 casas para o preço do litro, `R$ 6,193`).

**O que falta, em palavras:** abaixo do botão **Enviar para conferência**, enquanto ele está apagado, aparece "Para enviar, falta: litros, foto do recibo." O botão apagado sozinho não diz o que fazer.

📚 **Conceitos**
- **Formulário condicional:** a origem muda os campos, a obrigatoriedade da foto e o corpo enviado. No tanque, `posto` e `valorTotal` **não vão** no JSON (a API os recusaria: o custo vem do almoxarifado).
- **Componente genérico (`<T extends string>`):** o mesmo componente serve a valores de tipos diferentes, e o TypeScript confere que `aoEscolher` recebe exatamente `'Posto' | 'Tanque'`.
- **Reaproveitar em vez de copiar:** a câmera (M7), o aviso, a validação do horímetro (M4) e a conferência do tamanho da foto vieram prontos. A tela nova só juntou as peças.
- **Valor derivado:** o preço por litro é calculado a cada digitação, sem estado próprio. Um valor errado (R$ 74,63 no lugar de R$ 746,30) fica visível antes do envio.
- **A API continua sendo a autoridade:** o app valida para ajudar, mas um diesel insuficiente (409) ou um horímetro abaixo do último (400) chega no aviso com a mensagem da API.

🧪 **Testes**
1. Na ficha de uma máquina, toque em **Registrar abastecimento**. A tela vem com **Posto** escolhido, e o botão **Enviar** apagado com "Para enviar, falta: litros, horímetro, nome do posto, valor pago, foto do recibo."
2. Preencha litros (`120,5`) e valor (`746,30`): aparece "Preço por litro: R$ 6,193".
3. Digite um horímetro menor que o mínimo: o erro aparece em vermelho.
4. Toque em **Fotografar o recibo**, fotografe e use a foto: a miniatura aparece, com **Tirar outra** e **Remover**. **Cancelar** fecha a câmera sem perder o formulário.
5. Envie: o aviso "Abastecimento enviado" mostra os litros, o valor e o preço por litro. **Concluir** volta para a ficha.
6. Troque para **Tanque da fazenda**: os campos do posto somem, a foto vira opcional e aparece a explicação do custo. Envie sem foto. Na web, o kardex do DSL-001 mostra a saída.
7. Pelo tanque, peça mais litros do que há no estoque: o aviso mostra o erro da API ("Diesel insuficiente no tanque…").
8. Confira com `curl http://localhost:3000/abastecimentos`: os dois estão **Pendente**.

### A5 — "Meus abastecimentos" na página inicial

🎯 O operador fica sabendo o que o gestor decidiu: cada abastecimento dele aparece na página inicial com o status (**Aguardando conferência**, **Aprovado** ou **Recusado**) e, na recusa, o **motivo**, para ele corrigir.

🧩 **Serviço próprio da página inicial** (`src/servicos/painel.ts`): o `buscarPainelDoOperador` saiu de `maquinas.ts`, porque agora usa máquinas **e** abastecimentos. Em `maquinas.ts`, os dois serviços passariam a importar um ao outro (`abastecimentos.ts` já importa `maquinas.ts`). Uma busca só, com três chamadas ao mesmo tempo:

```ts
const [maquinas, movimentacoes, abastecimentos] = await Promise.all([
  listarMaquinas(),
  requisitar<Movimentacao[]>('/movimentacoes'),
  listarAbastecimentos({ operador: nome }),   // GET /abastecimentos?operador=Ana
]);
```

**Na tela** (`src/app/index.tsx`), entre "Com você agora" e "Frota agora":
- um resumo do que pede atenção: "2 aguardando conferência · 1 recusado" (ou "Todos conferidos e aprovados.");
- os 5 mais recentes, cada um com a máquina, a etiqueta de status (`src/componentes/etiqueta-abastecimento.tsx`), litros, posto ou tanque, valor, data, horímetro e, se recusado, **"Motivo: …"** em vermelho;
- um toque abre a ficha da máquina (por exemplo, para registrar de novo um abastecimento recusado).

📚 **Conceitos**
- **Fechar o ciclo com quem registrou:** o operador mandou o recibo; sem retorno, ele não sabe se valeu. A etiqueta e o motivo completam o fluxo app → web → app.
- **Evitar importação circular:** quando dois módulos precisam um do outro, a função que usa os dois vai para um terceiro módulo (`painel.ts`), e cada serviço continua dependendo só "para baixo".
- **Rótulo para quem lê:** o status da API é `Pendente`; para o operador, a etiqueta diz "Aguardando conferência", que explica o que está acontecendo.
- **Atualiza sozinho:** a página inicial já recarrega ao voltar para ela (`useFocusEffect`) e ao puxar para baixo. Depois de uma conferência na web, basta puxar.

🧪 **Testes**
1. Registre um abastecimento (A4) e volte ao início: ele aparece como **Aguardando conferência**, com "1 aguardando conferência" no resumo.
2. Aprove pela API (`curl -X POST http://localhost:3000/abastecimentos/1/aprovacao`) e puxe a página para baixo: a etiqueta fica **Aprovado** (verde).
3. Registre outro e recuse com motivo (`curl -X POST http://localhost:3000/abastecimentos/2/recusa -H "Content-Type: application/json" -d '{"motivo":"Recibo ilegível"}'`). Puxe: a etiqueta fica **Recusado**, com "Motivo: Recibo ilegível".
4. Toque num abastecimento: abre a ficha da máquina.
5. Troque de operador (barra → "trocar"): a lista mostra só os abastecimentos do nome novo.

### A7.3 — Corrigir um abastecimento devolvido

🎯 Quando o gestor **devolve** um abastecimento para correção (erro de preenchimento), o operador vê na página inicial **o que corrigir**, abre o **mesmo** abastecimento já preenchido, corrige e reenvia. Ele volta para a conferência, sem registro novo.

🧩 **Na página inicial:** o abastecimento devolvido aparece com a etiqueta laranja **Corrigir**, a linha **"O que corrigir: …"** e o convite **"Toque para corrigir ›"**. O resumo diz primeiro o que depende dele: "1 para corrigir · 2 aguardando conferência". O toque abre a correção (os outros continuam abrindo a ficha).

**A tela de abastecimento em modo corrigir** (`/maquina/1/abastecimento?corrigir=4`):
- no topo, em destaque, **o que o gestor pediu**;
- os campos **já preenchidos** com o que foi enviado (os números voltam com vírgula: `120,5`);
- a origem aparece, mas **não muda** (regra da API);
- a foto enviada antes **continua valendo**: aparece em miniatura, com **Tirar outra** (e **Voltar à anterior**, se tirou);
- o horímetro fica **entre** o do abastecimento anterior e o do seguinte (`validarHorimetroEntre`, em `validacao.ts`);
- **Enviar correção** chama `PUT /abastecimentos/:id` (`corrigirAbastecimento`, em `servicos/abastecimentos.ts`).

**Estado inicial que vem da API:** o `useState` usa o valor inicial só na **primeira** renderização. Por isso a tela foi dividida em duas partes: `RegistrarAbastecimento` carrega os dados (e trata carregando e erro), e só então monta o `Formulario`, que já nasce com os valores do abastecimento devolvido:

```tsx
export default function RegistrarAbastecimento() {
  const { dados, erro, carregando } = useRequisicao(buscar);
  if (carregando) return <Carregando />;
  ...
  return <Formulario dados={dados} />;   // montado DEPOIS dos dados
}

function Formulario({ dados }: { dados: DadosParaAbastecer }) {
  const [litros, setLitros] = useState(paraCampo(dados.corrigindo?.litros)); // "120,5"
  ...
}
```

`buscarDadosParaAbastecer(maquinaId, corrigirId?)` serve aos dois modos: no registro, devolve só o horímetro mínimo; na correção, também o máximo e o próprio abastecimento.

📚 **Conceitos**
- **Uma tela, dois modos:** registrar e corrigir têm os mesmos campos e as mesmas validações. O parâmetro `corrigir` na rota muda o título, o preenchimento, a origem fixa, a regra da foto e a chamada (`POST` ou `PUT`).
- **Componente montado depois dos dados:** é o jeito simples de ter um formulário com valores iniciais vindos da API, sem `useEffect` para "copiar" os dados para o estado.
- **O que depende de mim primeiro:** no resumo e na etiqueta ("Corrigir", no laranja forte da marca), o devolvido chama mais atenção do que o que só está esperando.
- **Mesmas regras dos dois lados:** o limite do horímetro (anterior e seguinte), a origem fixa e a foto opcional são as regras da API (Parte AB4); o app só avisa antes.

🧪 **Testes**
1. Registre um abastecimento no posto. Na web, abra a conferência e **Devolva para correção** ("Valor pago não confere com o recibo").
2. No app, puxe a página inicial: ele aparece com **Corrigir**, "O que corrigir: Valor pago não confere com o recibo" e "1 para corrigir" no resumo.
3. Toque nele: a tela abre com o pedido no topo, os campos preenchidos, a origem fixa e a foto anterior.
4. Corrija o valor e toque em **Enviar correção**: o aviso "Correção enviada". De volta ao início, ele está **Aguardando conferência**.
5. Na web, a conferência mostra o valor novo e "Devolvido 1 vez para correção · corrigido em…". Aprove.
6. Pelo tanque: devolva, corrija os litros (ex.: 50 → 30) e confira no kardex do DSL-001 a entrada de 20 L.

### A8 — Combustível na ficha da máquina

🎯 Ao lado da máquina, o operador vê quando ela foi abastecida pela última vez e quanto trabalhou desde então, além do consumo médio.

🧩 **Cartão Combustível** (`src/componentes/cartao-combustivel.tsx`), na ficha, junto do botão **Registrar abastecimento**:
- **Último abastecimento** (o mais recente que não foi recusado): data e hora, litros, posto ou tanque, horímetro e a etiqueta do status;
- **"N h trabalhadas desde então"** (horímetro atual − horímetro do abastecimento);
- **Consumo médio** (L/h) e **custo por hora**, ou "Sem dados" com o motivo.

**A ficha busca o combustível junto com o resto:** o `buscarFicha` ganhou uma quarta chamada no `Promise.all`, `buscarCombustivel(id)` (`GET /maquinas/:id/combustivel`). Ela fica em `servicos/maquinas.ts`, porque a rota é da máquina e porque `abastecimentos.ts` já importa `maquinas.ts` (importar de volta criaria um ciclo).

📚 **Conceitos**
- **Mais uma chamada em paralelo:** a ficha continua carregando de uma vez; o tempo é o da chamada mais lenta, não a soma das quatro.
- **Componente de apresentação:** o cartão recebe os dados prontos (`combustivel`, `horimetroAtual`) e só decide como mostrar; quem busca é a ficha.

🧪 **Testes**
1. Abra a ficha de uma máquina com abastecimentos: o cartão mostra o último, as horas desde então e o consumo (ou "Sem dados").
2. Registre um retorno com o horímetro maior e volte à ficha: as horas desde o último abastecimento aumentam.
3. Registre um abastecimento: ao voltar, ele aparece como o último, com a etiqueta "Aguardando conferência".

---

## 4. Problemas comuns

| Sintoma | Causa | Solução |
|---|---|---|
| "Não foi possível acessar a API em http://..." | API parada, IP errado ou firewall | Confira a API (`npm run dev`), o IP do `.env.local` (`ipconfig`) e a porta 3000 no firewall |
| Aviso amarelo "Cannot connect to Expo CLI" | O Expo Go perdeu a ligação com o `npx expo start` do PC: celular com a tela bloqueada ou o app em segundo plano por muito tempo, troca ou queda da rede (inclusive do roteador do celular), PC que dormiu, ou `app.json` alterado com o servidor rodando | Confira se o `npx expo start` ainda roda no PC. Feche o aviso e recarregue (`r` no terminal ou sacudir o celular → Reload). Depois de mudar o `app.json`, reinicie o `npx expo start`. Se nada resolver, reabra o projeto pelo QR do terminal |
| O Expo Go não abre o projeto (fica carregando) | O celular não alcança a porta 8081 | Mesma rede Wi-Fi, rede **privada** no Windows e porta 8081 liberada; ou `npx expo start --tunnel` |
| A API mudou de endereço e o app não percebeu | O `.env` só é lido na partida | Pare e rode `npx expo start` de novo |
| "Project is incompatible with this version of Expo Go" | Expo Go desatualizado | Atualize o Expo Go na loja (o projeto usa o SDK 57) |
| O `tsc` diz que uma rota existente não existe (ex.: `'/maquina/[id]'`) | Os tipos de `.expo/types/router.d.ts` ficaram velhos depois de mover telas | Rode `npx expo start` uma vez: o Expo gera os tipos de novo |
| "Foto grande demais" ao enviar | Câmera de resolução muito alta, mesmo com `quality: 0.5` | Baixe o `quality` em `componentes/camera.tsx` (ex.: 0.3) |
| `npm audit` mostra vulnerabilidades | Dependências das ferramentas de desenvolvimento do Expo | Não rode `npm audit fix --force`: ele troca versões fixadas pelo SDK e quebra o projeto. Use `npx expo install --fix` |
