# Checklist do Projeto Agro Frota

Acompanhamento das etapas e passos do projeto. Cada item concluído é marcado com `[x]` e o commit correspondente.

**Legenda:** `[x]` concluído · `[ ]` pendente · 🚧 em andamento

---

## Etapa 1 — Back-end (Express + TypeScript, em memória) ✅

Concluída e mergeada na `main` (PR #1). Detalhes em [agro-backend/README.md](agro-backend/README.md).

- [x] **Módulo de Uso** — Partes 0 a 6: saída, retorno, avarias, histórico, tratamento de erros e segurança
- [x] **Módulo de Estoque** — Partes E1 a E6: peças, cadastro, entradas, kardex, estoque mínimo
- [x] **Módulo de Manutenção** — Partes OS1 a OS7: abertura e fechamento de O.S., baixa automática, custo congelado, custo por máquina
- [x] Material de apoio: README, `testes.sh` e `testes.http` (82 cenários), exercícios, gabarito e glossário

---

## Etapa 2 — Front-end (Angular 22 + Angular Material) ✅

Mergeada na `main` em dois PRs:
- **PR #2** (`feat/front-base`): Fases 0 a 4 (até o Passo 17 e os refinamentos R1 a R3) · merge `d5190a0`
- **PR #3** (`feat/redesign`): R4, Passos 16.2 e 16.3 e a Fase 5 (redesign) · merge `8b2a5ce`

### Fase 0 — Preparação ✅

- [x] **Passo 0** — Angular CLI 22 e projeto `agro-frontend` criado · incluído em `2a3d287`
- [x] **Passo 1** — Angular Material, layout com menu e rotas (lazy loading) · `2a3d287`
- [x] **Passo 2** — Proxy para a API, `HttpClient`, modelos e `MaquinaService` · `a2a57de`

### Fase 1 — Módulo de Máquinas ✅

- [x] **Passo 3** — Lista de máquinas com `mat-table` e estados (carregando, erro, vazio) · `d557dd2`
- [x] **Passo 4** — Diálogo de saída com formulário reativo · `2336c11`
- [x] **Passo 5** — Diálogo de retorno com horímetro mínimo e horas previstas · `0873cec`
- [x] **Passo 6** — Histórico de movimentações com filtro e formatação pt-BR · `962ddc2`
- [x] **Passo 7** — Interceptor global de erros da API · `88fc9f8`

### Fase 2 — Módulo de Estoque ✅

- [x] **Passo 8** — Lista de peças com custo em R$, alerta e filtro de reposição · `92c5e0d`
- [x] **Passo 8.1** *(back-end)* — Rota `POST /maquinas` (cadastro de máquina) + 6 cenários no `testes.sh` (88 no total) · `2fa529b`
- [x] **Passo 8.2** *(front-end)* — Diálogo de cadastro de máquina + regra `NAO_VAZIO` compartilhada em `core/validacao.ts` · `4f64c77`
- [x] **Passo 9** — Cadastro de peça (formulário com unidade e estoque mínimo; trata o 409 de código duplicado) · `208d344`
- [x] **Passo 10** — Entrada de estoque (compra) com validador condicional (inteiro para `un`) · `6bda400`
- [x] **Passo 11** — Kardex da peça (rota com parâmetro `/estoque/:id`) · `f3353c4`

### Fase 3 — Módulo de Manutenção (O.S.) ✅

> Nesta fase, o Claude implementa os passos (edições visíveis para os alunos) e o usuário faz os commits.

- [x] **Passo 12** — Lista de O.S. com filtros na URL (query params → `input()`), `rxResource` e modelo/service de O.S. · `89a4611`
- [x] **Passo 13** — Abertura de O.S. (aviso quando a máquina está em campo; horímetro mínimo dinâmico; aberta pela lista de O.S. e pela lista de Máquinas) · `818f127`
- [x] **Passo 14** — Detalhe e fechamento da O.S. com `FormArray` (peças dinâmicas, tudo ou nada); links O.S. ↔ kardex · `04f768c`
- [x] **Passo 15** — Custo de manutenção por máquina (`/maquinas/:id`: indicadores + barra preventiva × corretiva com paleta validada; tag e máquina viram links) · `276ccb5`

### Refinamentos (identidade visual) ✅

> Solicitados depois da Fase 3, a partir da logo do produto (verde `#0f633e` + laranja `#f38302`).

- [x] **R1** — Logo tratada (fundo removido, versões clara/escura/compacta), página inicial com a logo e o descritivo do produto, logo no lugar do texto "Agro Frota" no menu · `8a86129`
- [x] **R2** — Paleta da logo em todo o site (`_theme-colors.scss` gerado pelo schematic `theme-color`), títulos em Montserrat, barra com faixa verde→laranja, menu lateral em superfície própria · `234b243`
- [x] **R3** — Tema escuro (menu Claro/Escuro na barra, salvo no navegador; na 1ª visita segue o sistema), `light-dark()` nas cores próprias, logo escura própria (fundo removido por *color-to-alpha*, preservando o brilho), botões e destaques do escuro em verde-menta/laranja da logo (`mat.theme-overrides`), gráfico com par escuro validado; correção do rodapé cortado (`box-sizing` na área de conteúdo) · `234b243`
- [x] **R4** — Conferência visual de 18 telas e diálogos nos temas claro e escuro (capturas automatizadas pelo protocolo de depuração do Edge). Corrigidos: números sem formato pt-BR nos diálogos e snackbars (`number` / `toLocaleString`), mensagens de erro cortadas ou sobrepostas (`subscriptSizing="dynamic"`) e aviso duplicado no kardex (`HttpContextToken` `ERRO_TRATADO_NA_TELA`) · `5a61008`

### Fase 4 — Fechamento ✅

- [x] **Passo 16** — Polimento (16.2 e 16.3 retomados depois da aula, junto com o redesign)
  - [x] **16.1** — Estilos globais (`src/estilos/_comuns.scss`), tons semânticos das etiquetas (`core/ui/tons.ts`) e links com a cor do tema · `e337049`
  - [x] **16.2** — Diálogo de confirmação reutilizável (`shared/confirmacao-dialog`), usado antes de fechar a O.S. com a lista das peças e o custo estimado · `566cb45`
  - [x] **16.3** — Responsividade: `BreakpointObserver` → signal `celular()`; menu lateral fixo no desktop e em gaveta no celular, navegação inferior com 4 áreas, tabelas com rolagem horizontal, `100dvh`, linha de peças da O.S. quebrando no celular · `98d1596`
- [x] **Passo 17** — `ng build` sem erros, README do front-end, `context.md` atualizado e movido para a raiz, README da raiz (escopo, clonagem e execução) e PR final · último commit do PR #2

### Fase 5 — Redesign ✅

> A partir do canvas de design "Agro Frota — Redesign" (painel de operação, lista com ação principal, fechamento de O.S. com resumo e telas para celular), aprovado pelo usuário. Branch `feat/redesign`, mergeada na `main` pelo PR #3 (`8b2a5ce`).

- [x] **R5.1** — Identidade do redesign: menu lateral verde-escuro com seções (Operação/Histórico) via `mat.list-overrides`, contador de O.S. abertas (recarregado a cada navegação, silencioso em caso de erro) no menu e na navegação inferior, fonte de texto Source Sans 3, fundo tonalizado e novas cores `--agro-*` · `bc717ae`
- [x] **R5.2** — Página inicial vira o Painel: indicadores com as máquinas de cada situação, "Precisa de atenção" (O.S. abertas, máquinas em campo, peças abaixo do mínimo) com ações diretas, custo de manutenção por tipo e valor em estoque; cores das séries extraídas para `--agro-serie-*` · `9e684b7`
- [x] **R5.3** — Máquinas: busca por tag/modelo, filtros rápidos por situação com contagem (`?situacao=` na URL), contexto de cada máquina (operador · frente ou O.S. aberta), uma ação principal por situação + "Abrir O.S." como ícone, lista em CSS grid que vira cartões no celular (`grid-template-areas`) · `6c9fef0`
- [x] **R5.4** — O.S. em fechamento: etapas do ciclo de vida (`<ol>` + `aria-current="step"`), saldo e preço da peça escolhida, subtotal por linha, aviso específico de saldo abaixo da linha ("41 un a mais que o saldo de 9 un"), resumo lateral com o tudo ou nada citando as peças e botão "Revisar e fechar O.S." · `2e4c32e`

### Fase 6 — Redesign 2: tema escuro, Estoque e lista de O.S. ✅

> A partir do canvas "Agro Frota — Estoque, O.S. e tema escuro", aprovado pelo usuário. Branch `feat/redesign-2`; os três passos foram implementados juntos, num commit só.

- [x] **R6.1** — Paleta escura "noite no campo": menu verde-floresta, camadas com passos de luminosidade, verde-menta mais calmo nos botões e link mais claro, âmbar suave nas pendências, etiquetas mais vivas (todos os pares de texto ≥ 4,5:1; par do gráfico revalidado) · `d61e9a8`
- [x] **R6.2** — Estoque no padrão do redesign: busca, filtro `?filtro=repor`, peças a repor primeiro, barra de nível com a marca do mínimo, ação principal e cartões no celular; busca e filtros extraídos para `_comuns.scss` · `d61e9a8`
- [x] **R6.3** — Lista de O.S.: abertas em cartões e fechadas em lista, cada O.S. inteira como link, contadores por status (status filtrado na tela) · `d61e9a8`

### Fase 7 — Qualidade e pendências ✅

> Itens que estavam em "Pendências", resolvidos depois do redesign. Branch `feat/pendencias`.

- [x] **Passo 18** — Testes unitários: auxiliar `src/testing/provedores-de-teste.ts` (HttpClient de teste, Router, pt-BR, diálogo), os 20 testes gerados consertados e testes de comportamento de função pura, service, interceptor e dois diálogos · 34 testes passando · `00eee59`
- [x] **Passo 19** — Tamanho do pacote inicial: análise com `ng build --stats-json`, menu lateral com links simples no lugar do `mat-nav-list` (o `@angular/forms` saiu do carregamento inicial), 685,6 → 603,5 kB, aviso do budget em 650 kB · `00eee59`
- [x] **Passo 20** — Services com `@Service()` (Angular 22) no lugar de `@Injectable({ providedIn: 'root' })`, nos quatro services · `00eee59`

---

## Etapa 3 — App móvel do operador (React Native + Expo) ✅

Pasta `agro-mobile/` · branch `feat/app-movel`. O app cobre o trabalho no **campo** (saída, retorno, QR code da máquina, relato de avaria); a gestão continua no front web. A API continua em memória, sem banco de dados.

- [x] **M0** — Projeto Expo (SDK 57, TypeScript, Expo Router) sem as telas de exemplo; endereço da API no `.env.local` (`EXPO_PUBLIC_API_URL`, IP do computador na rede) com `.env.example` versionado; tela de teste lista as máquinas da API; `tsc`, `expo export` e `expo-doctor` (21/21) sem problemas · `4312794`
- [x] **M1** — Lista de máquinas em camadas (`api.ts` com tradução de erros, `servicos/`, hook `useRequisicao` com limpeza do efeito, `tema.ts` com as cores da web no claro/escuro), `FlatList` com puxar para atualizar, etiqueta de status, estados de carregando, erro (com "Tentar novamente") e vazio; ESLint configurado (`expo lint`) · `8ff7404`
- [x] **M2** — "Quem é você?": nome do operador salvo no aparelho (`AsyncStorage`, instalado com `npx expo install`), contexto `ProvedorOperador` + `useOperador`, redirecionamento na primeira abertura (`Redirect`), troca de operador pela barra, `router.replace` para tirar a identificação da pilha · `0de15f8`
- [x] **M3** — Ficha da máquina (rota dinâmica `/maquina/[id]`, máquina + saída em aberto com `Promise.all`), registrar saída com o operador do aparelho e aviso nativo (`Alert`), cartões da lista tocáveis (`Pressable` + `router.push`; o `Link asChild` perdia o estilo em função), lista recarrega ao voltar (`useFocusEffect`, com `recarregar` estável via `useCallback`) · `29e8ec9`
- [x] **M4** — Registrar retorno: teclado numérico com vírgula (`decimal-pad`), validação em função pura (`validarHorimetro`, mesma regra da API, testada com 7 casos), horas previstas ao vivo como valor derivado, avarias opcionais fora do corpo quando vazias · `2fa28b9`
- [x] **M5** — QR code: contrato `agrofrota:maquina:<id>` (web gera, app lê); app com `expo-camera` (docs do SDK 57 conferidas), permissão explicada, trava com `useRef` e `router.replace`; web com a seção "Etiqueta QR" no detalhe da máquina (`uqr`, ESM) e impressão numa janela própria (a tentativa com `@media print` falhou por causa do `transform` do sidenav); QR impresso decodificado e conferido · `a5eaa78`
- [x] **M6** — Relatar avaria: abrir O.S. corretiva pelo app, com rotas aninhadas (`maquina/[id]/index.tsx` e `avaria.tsx` em modal), confirmação com `Alert` dizendo a consequência, `validarHorimetro` reaproveitado, ficha com a O.S. aberta (`Promise.all` com 3 chamadas) e recarga ao voltar do modal; a saída em aberto é encerrada pela API (regra OS3) · `d991b7d`
- [x] *(Opcional)* **M7** — Foto da avaria. **Back-end (Parte OS8):** `POST /ordens-servico/:id/fotos` com base64 no JSON, limite de corpo só nessa rota (`express.json({ limit: '3mb' })` registrado antes do geral), tipo descoberto pela assinatura dos bytes, até 2 MB e 5 fotos por O.S., listagem sem os bytes e a imagem com o `Content-Type` certo; 413 no tratador de erros; 15 cenários novos (103 no total, todos passando). **App:** câmera de foto reutilizável (`componentes/camera.tsx`, com `expo-camera` e prévia), tamanho conferido sem decodificar, foto oferecida logo após abrir a O.S. e botão na ficha. **Feedback** (pedido depois do teste no celular, em que as fotos chegavam à API sem retorno ao operador): "Foto N de 5" no título, "Processando a foto…", **Tirar outra**/**Concluir** depois do envio (câmera zerada pela `key`), galeria na ficha com tela cheia em `Modal` (`resizeMethod="resize"`: as fotos de ~3000 × 4000 px não apareciam no Android) e aviso de "Limite de fotos atingido". Câmera da frente sem flash (travava com tela branca), sem a animação branca de clique e com tempo limite (`Promise.race`). Componente `Aviso` com as cores do tema no lugar de **todos** os `Alert.alert` do sistema. **Web:** seção "Fotos da avaria" no detalhe da O.S. (miniaturas pelo proxy `/api`; o clique abre a foto inteira). Um rascunho feito com outra ferramenta usava APIs de outra biblioteca de câmera e um hook depois de `return`, e foi corrigido · `e911b15`
- [x] **M8a** — Identidade do app: nome "Agro Frota", ícone (o trator, sem o texto) e ícone adaptativo do Android dentro da área segura, silhueta monocromática, splash com a logo no claro e no escuro (imagem quadrada para caber no círculo do Android 12+), imagens geradas da logo da web; imagens do template removidas; `expo-doctor` 21/21 · `ed35f98`
- [x] **M8b** — Página inicial do operador (`/`): logo no tema atual, saudação e data, **Com você agora** (saídas abertas no nome dele, com toque para a ficha), **Frota agora** (pátio, campo, oficina) e atalhos; lista movida para `/maquinas` (`git mv`); escolha de tema **Sistema** (padrão) | Claro | Escuro com `Appearance.setColorScheme`, salva no aparelho · `ed35f98`
- [x] **M8c** — Fechamento: README da raiz (terceira parte do projeto, como rodar o app no celular, comandos e problemas comuns), `context.md` (decisões e histórico da Etapa 3) e PR da branch `feat/app-movel`

---

## Etapa 4 — Gestão de abastecimento ✅

Branch `feat/abastecimento`. O operador **registra** o abastecimento no app (posto, com a foto do recibo, ou tanque da fazenda) e o gestor **confere** na web (aprova, recusa com motivo ou devolve para correção). Só os aprovados entram no custo e no consumo (L/h). Tanque da fazenda = diesel do almoxarifado, com baixa no estoque e estorno na recusa.

- [x] **A1 · API** — Abastecimento em posto (Parte AB1): modelo com origem e status, `POST /abastecimentos` com o recibo em base64 no mesmo JSON (operação atômica), horímetro mínimo pelo último abastecimento não recusado, preço/L calculado; listagem com filtros (máquina, status, origem, operador sem maiúsculas), detalhe com a máquina e o recibo como imagem; validação de imagem extraída para `lerImagemBase64` (usada também pelas fotos da O.S.); 17 cenários novos, 120 no total · `4ad918b`
- [x] **A2 · API** — Tanque da fazenda (Parte AB2): diesel `DSL-001` (peça 4, 3000 L a R$ 6,05) no almoxarifado inicial; origem Tanque com custo do diesel congelado, `posto`/`valorTotal` recusados (400), foto opcional; saldo insuficiente (409, nada gravado); baixa com saída no kardex (`abastecimentoId`); testes ajustados para a peça nova virar a 5; 7 cenários novos, 127 no total · `be29827`
- [x] **A3 · API** — Conferência e indicadores (Parte AB3): `POST /abastecimentos/:id/aprovacao` e `/recusa` com motivo obrigatório, decisão final (409 se já conferido); recusa pelo tanque com **estorno** (entrada no kardex com o custo da saída, sem mudar o custo do diesel); `GET /maquinas/:id/combustivel` com consumo médio L/h e custo por hora (o primeiro abastecimento é o ponto de partida; `null` com menos de 2 aprovados), totais, pendentes e histórico; 14 cenários novos, 141 no total · `76be127`
- [x] **A4 · App** — Registrar abastecimento: botão na ficha e tela `maquina/[id]/abastecimento` com Posto \| Tanque da fazenda (componente genérico `EscolhaSegmentada<T>`, usado também pelo seletor de tema), litros, horímetro com o mínimo da regra da API, posto e valor pago com o **preço por litro ao vivo**, foto pelo componente `Camera` num `Modal` (obrigatória no posto, opcional no tanque), "Para enviar, falta: …" e erros da API no `Aviso`; funções puras `validarPositivo` e `formatarReais` · `36bd4e0`
- [x] **A5 · App** — "Meus abastecimentos" na página inicial: os 5 mais recentes do operador (`GET /abastecimentos?operador=`), com etiqueta de status (Aguardando conferência, Aprovado, Recusado), motivo da recusa e resumo do que pede atenção; busca da página inicial movida para `servicos/painel.ts` (sem importação circular entre serviços) · `c6ba073`
- [x] **A6 · Web** — Contrato `core/models/abastecimento.ts` e `AbastecimentoService`; tela `/abastecimentos` no padrão da lista de O.S. (filtros de máquina e origem na URL e na API, status na tela com contagens; pendentes em cartões com a miniatura do recibo, conferidos em lista com o motivo da recusa); menu com contador genérico (`contador: 'os' | 'abastecimentos'`); pendentes em "Precisa de atenção" no Painel; tons novos (`erro` para Recusado); build sem avisos (605 kB), 34 testes, telas conferidas por captura nos dois temas · `6728fe1`
- [x] **A7 · Web** — Conferência `/abastecimentos/:id`: recibo grande, dados com preço/L, comparação com o abastecimento anterior da máquina (horas e L/h), **Aprovar** com a `ConfirmacaoDialog` e **Recusar** com o `RecusaDialog` (motivo obrigatório sem só espaços, sugestões, aviso do estorno no tanque); recursos encadeados; atalho "Conferir o próximo"; cartões e linhas da lista e o "Conferir" do Painel levam à conferência; `recusa-dialog.spec.ts` (3 testes, 37 no total); telas conferidas por captura · `119c1d4`
- [x] **A7.1 · API** — Devolver para correção (Parte AB4): status `Em correção` e histórico `devolucoes`; `POST /abastecimentos/:id/devolucao` (só Pendente, motivo obrigatório) e `PUT /abastecimentos/:id` (só Em correção; máquina e origem imutáveis; mesma validação do registro via `erroNosCampos`; horímetro entre o anterior e o seguinte; foto nova opcional; tanque ajusta o diesel pela diferença); 409 da conferência com a mensagem certa (`motivoParaNaoConferir`); 18 cenários novos, 159 no total · `7718a8b`
- [x] **A7.2 · Web** — Devolver para correção: o `RecusaDialog` virou "um diálogo, duas ações" (`acao: 'recusar' | 'devolver'`, tabela de textos e sugestões por ação); conferência com três botões e orientação, estado "Com o operador para correção" com o pedido e cartão do histórico de devoluções; lista com o filtro e a seção "Com o operador para correção"; tom `info` para `Em correção`; 38 testes; telas conferidas por captura · `119c1d4`
- [x] **A7.3 · App** — Corrigir um devolvido: página inicial com a etiqueta "Corrigir", o que corrigir e o toque que abre a correção; tela de abastecimento em modo corrigir (`?corrigir=ID`) com o pedido no topo, campos preenchidos (componente `Formulario` montado depois dos dados), origem fixa, foto anterior valendo, horímetro entre o anterior e o seguinte (`validarHorimetroEntre`) e `PUT` (`corrigirAbastecimento`) · `07e73b1`
- [x] **A8 · Web e app** — Combustível da máquina (pedido depois do teste: ao abrir a máquina, faltavam consumo e data do último abastecimento). **Web:** seção Combustível no detalhe da máquina (consumo L/h ou "Sem dados", custo por hora, último abastecimento com as horas trabalhadas desde então, aviso de pendentes, os 5 últimos com link para a conferência); kardex com a origem "Abastecimento nº X" e "Devolução ao tanque". **App:** cartão Combustível na ficha (`CartaoCombustivel`), com o combustível no `Promise.all` do `buscarFicha`; build, 38 testes, telas conferidas por captura · web `119c1d4`, app `07e73b1`
- [x] **A9** — Fechamento: README da raiz (módulo Abastecimento no escopo, app e web atualizados, 159 cenários), `context.md` (decisões e histórico da Etapa 4), CHECKLIST com os hashes, e PR da branch `feat/abastecimento`

---

## Etapa 5 — Jornada do usuário ✅

Branch `feat/jornada`. Revisão da jornada do operador (app) e do gestor (web) com capturas das telas reais (web a 1366 px e celular emulado; app pelo Expo web), nos dois temas. Cinco melhorias imaginadas já existiam (ação certa na ficha, retorno a partir de "Com você agora", "1 para corrigir", O.S. na ficha, entrada direto do Painel); os passos abaixo atacam o que as capturas revelaram.

- [x] **J1 · Web** — Textos: "R$ 0,00" do Painel invadia a nota de baixo (`line-height` herdado); "0 aberta(s) · 0 fechada(s)" e "1 aguardando conferência e 0 em correção" viram frases sem zeros e com plural certo (`core/ui/textos.ts`: `contagem` e `resumoSemZeros`, com 3 testes); "dados ao lado" na conferência (no celular ficam abaixo) vira "dados informados"
- [x] **J2 · Web** — Mesmos nomes de status do app: `rotuloStatusAbastecimento` em `core/ui/tons.ts` (Pendente → "Aguardando conferência") nas etiquetas do detalhe da máquina, da conferência e da lista, e no filtro
- [x] **J3 · Web** — Detalhe da máquina com as ações do dia a dia (Registrar saída/retorno, Abrir O.S., Ver O.S.) e a seção **Saídas e retornos** (as 5 últimas, com operador, frente, horas e avaria); os diálogos saíram da lista para o service `AcoesMaquina`, usado pelas duas telas
- [x] **J4 · Web e app** — Horímetro: com um abastecimento depois do último retorno (horímetro maior que o da máquina), "0 h trabalhadas desde então" vira a explicação de que as horas aparecem no próximo retorno (`horasDesdeAbastecimento` no app); o formulário do app explica por que o mínimo é maior que o horímetro da ficha
- [x] **J5 · Web** — Conferência compara o consumo sugerido com a **média aprovada** da máquina: perto da média, uma frase; mais de 30% acima ou abaixo, um aviso de alerta com a diferença (`features/abastecimentos/consumo.ts`, `compararComMedia`, com 3 testes)

- [x] **J6 · API, web e app** — Horímetro travado (Parte H1). **API:** `limitesDoHorimetro` e `erroDoHorimetro` usados pelo retorno, pela abertura de O.S. e pelo registro de abastecimento; mínimo = a maior leitura (máquina ou abastecimento não recusado, pendente conta), máximo = mínimo + horas desde a última leitura + 24 h de folga; rota `GET /maquinas/:id/horimetro`; 12 cenários novos (H1 a H12), 171 no total. **Web:** `core/horimetro.ts` (validadores e botões rápidos, 3 testes) e `shared/atalhos-horimetro` nos diálogos de retorno e de abrir O.S. (campo vazio, faixa e +1/+4/+8 h; 2 testes novos no retorno). **App:** `validarHorimetroNaFaixa` e `atalhosDoHorimetro` em `validacao.ts`, componente `AtalhosHorimetro` (botões de 48 dp) no retorno, na avaria e no registro de abastecimento; horas trabalhadas continuam contando da saída

Web: build sem avisos (606 kB), 49 testes passando. App: `tsc` e `expo lint` sem problemas. API: 171 cenários passando. Telas conferidas por captura (J1 a J5). · `d2941d3`

---

## Etapa 6 — Localização das máquinas em campo 🚧

Branch `feat/localizacao`. O **celular do operador** faz o papel de rastreador enquanto a saída está aberta: o app envia a posição (com o app aberto, a cada 30 s ou 25 m), a API guarda e a web mostra num mapa. Só a **Fase 1** (app aberto, funciona no Expo Go); o segundo plano exige development build e ficou nas pendências.

- [x] **L1 · API** — Posições (Parte L1): modelo `Posicao` ligado à saída (operador vem da saída, `data` do celular e `recebidaEm`); `POST /maquinas/:id/posicoes` em lote (até 50, tudo ou nada; só com a saída aberta, 409; latitude, longitude, precisão e data validadas, sem pontos antes da saída nem mais de 5 min no futuro, 400; até 2.000 pontos por saída); `GET /posicoes/atuais` (última posição de cada máquina em campo, com `minutosDesde`); `GET /maquinas/:id/posicoes` (trajeto da saída aberta ou de `?movimentacaoId=`); 14 cenários novos (L1 a L14), 185 no total · `46fb068`
- [x] **L2 · App** — `expo-location` (instalado com `npx expo install`; plugin no `app.json` só com a permissão "durante o uso"). Contexto `ProvedorRastreamento` + `useRastreamento`: acha as máquinas com o operador (`buscarSaidasDoOperador`, extraída do painel), lê o GPS só com o app aberto (`watchPositionAsync` a cada 30 s; `AppState` pausa em segundo plano), guarda em movimento um ponto a cada 30 s e parada (a menos de 25 m) um a cada 5 min (`deveGuardar`), fila no `AsyncStorage` (até 1.000 pontos, sem duplicatas) enviada em lotes de 50 a cada 30 s (sem rede: guarda; 409: descarta a máquina). Saída com aviso explicando antes de pedir a permissão; retorno e avaria param o GPS. Componente `IndicadorLocalizacao` na página inicial e na ficha (ativa, sem permissão, negada, GPS desligado, sem conexão). Funções da fila em `fila-posicoes.ts`, conferidas por script; fluxo conferido no Expo web com o GPS simulado pelo Edge · `281bd29`
- [x] **L3 · Web** — Tela `/mapa` com **Leaflet 1.9** e o mapa do **OpenStreetMap** (sem chave de API): o Leaflet só é baixado nessa rota (pedaço de 41 kB comprimido; pacote inicial em 607 kB) e o `leaflet.css` sai à parte (`angular.json`, `"inject": false`, carregado pela tela; `allowedCommonJsDependencies` para o aviso de CommonJS). `PosicaoService` e o contrato `core/models/posicao.ts`; polling a cada 15 s (`toSignal(timer)` como parâmetro do `rxResource`, primeira busca na hora); marcadores com a tag montados por `textContent`; lista "Em campo" com a situação (Ao vivo, Sem sinal depois de 10 min, Sem posição) e o "voar até" a máquina; "Mostrar todas"; mapa escurecido e controles com as cores do tema escuro; item **Mapa** no menu. Funções do sinal em `features/mapa/sinal.ts` (3 testes) e teste de comportamento da tela (2 testes), 54 no total; telas conferidas por captura (claro, escuro e celular) · `4e6562e`
- [x] **L4 · Web** — Seção **Trajeto** no detalhe da máquina: "da saída atual" (com o link para o mapa da frota) ou "da última saída", com o resumo (posições, horário e distância em km pela soma dos trechos, `resumoDoTrajeto` em `features/mapa/trajeto.ts`, 3 testes) e o componente `TrajetoMapa` (linha da partida até a última posição, círculo na partida e balão com a tag); em campo sem posição, um aviso explica o porquê. Peças comuns dos dois mapas extraídas para `leaflet-base.ts` (`criarMapa`, `iconeDaMaquina`) e `_leaflet.scss` (mixins `marcadores` e `tema-escuro`). No Painel, o cartão "Em campo" leva ao mapa. 57 testes; telas conferidas por captura · *commit pendente*
- [ ] **L5 · Documentação** — READMEs do app e da web, context.md (decisões e LGPD) e CHECKLIST

---

## Pendências e decisões em aberto

- [x] **Cadastro de máquinas** — decidido: **entra no sistema** (Passos 8.1 e 8.2).
- [x] **Material do back-end após o cadastro de máquinas** — `testes.http` com os cenários N1 a N6 do cadastro, roteiro de testes do README com a tabela do `POST /maquinas` (88 cenários), e o exercício 4 trocado por **"Editar máquina" (`PATCH /maquinas/:id`)**, com gabarito testado e verbete `PATCH` no glossário · `00eee59`
- [x] **Branch/PR do front-end** — decidido: tudo no PR #2 (título e descrição atualizados no Passo 17).
- [x] **Budget do pacote inicial** — resolvido no Passo 19: 685,6 → 603,5 kB (o menu `mat-nav-list` trazia o `@angular/forms` para o carregamento inicial); aviso do budget reduzido para 650 kB.
- [x] **Migrar services para `@Service()`** — feito no Passo 20 nos quatro services (`MaquinaService`, `PecaService`, `OrdemServicoService` e `TemaService`); build e testes continuam passando · `00eee59`
- [x] **Testes unitários** — resolvido no Passo 18 (34 testes passando; o teste revelou e corrigiu o `matchMedia` sem verificação no `TemaService`).
- [x] **Retorno × abastecimento** — decidido: o retorno (e a abertura de O.S.) exige horímetro ≥ o último abastecimento não recusado, pendente incluído, e ganha um limite de cima pelo tempo que passou (J6)
- [ ] **Localização em segundo plano (Fase 2 da Etapa 6)** — `expo-task-manager` + `startLocationUpdatesAsync`, com a notificação fixa no Android e a permissão "o tempo todo". Não funciona no Expo Go: exige development build (APK pelo EAS, que também resolve ver o ícone e o splash) e, na Play Store, revisão das permissões. A API e a web da Fase 1 não mudam.
- [ ] **Jornada, próximos candidatos** (da revisão da Etapa 5): preventiva por horímetro com alerta no Painel; tela "Editar máquina" (`PATCH`); Abastecimentos na navegação inferior da web no celular; atalhos de teclado na conferência; operadores escolhidos de uma lista no app (nome digitado livremente quebra "Com você agora"); sugestões de frente e posto; rascunho preservado quando o envio falha; app sem o nome salvo (ficha com "Operador:" vazio e botão desabilitado sem explicação); "conferido por"; exportar CSV.
