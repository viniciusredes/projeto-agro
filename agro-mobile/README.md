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
    │   ├── index.tsx   # lista de máquinas
    │   ├── identificacao.tsx  # "Quem é você?" (nome do operador)
    │   ├── escanear.tsx       # câmera que lê o QR da máquina
    │   └── maquina/[id]/      # rotas da máquina (o [id] vale para as duas)
    │       ├── index.tsx      # ficha, saída e retorno (/maquina/1)
    │       └── avaria.tsx     # relatar avaria, em modal (/maquina/1/avaria)
    ├── api.ts          # ponto único de acesso à API e tradução de erros
    ├── config.ts       # API_URL lida do .env.local
    ├── tema.ts         # cores da marca no claro e no escuro (as mesmas da web)
    ├── validacao.ts    # regras de formulário em funções puras (ex.: horímetro)
    ├── qr.ts           # formato do QR da etiqueta (contrato com a web)
    ├── componentes/    # peças reutilizáveis (ex.: etiqueta de status)
    ├── contextos/      # valores compartilhados entre telas (ex.: o operador)
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

---

## 4. Problemas comuns

| Sintoma | Causa | Solução |
|---|---|---|
| "Não foi possível acessar a API em http://..." | API parada, IP errado ou firewall | Confira a API (`npm run dev`), o IP do `.env.local` (`ipconfig`) e a porta 3000 no firewall |
| O Expo Go não abre o projeto (fica carregando) | O celular não alcança a porta 8081 | Mesma rede Wi-Fi, rede **privada** no Windows e porta 8081 liberada; ou `npx expo start --tunnel` |
| A API mudou de endereço e o app não percebeu | O `.env` só é lido na partida | Pare e rode `npx expo start` de novo |
| "Project is incompatible with this version of Expo Go" | Expo Go desatualizado | Atualize o Expo Go na loja (o projeto usa o SDK 57) |
| O `tsc` diz que uma rota existente não existe (ex.: `'/maquina/[id]'`) | Os tipos de `.expo/types/router.d.ts` ficaram velhos depois de mover telas | Rode `npx expo start` uma vez: o Expo gera os tipos de novo |
| `npm audit` mostra vulnerabilidades | Dependências das ferramentas de desenvolvimento do Expo | Não rode `npm audit fix --force`: ele troca versões fixadas pelo SDK e quebra o projeto. Use `npx expo install --fix` |
