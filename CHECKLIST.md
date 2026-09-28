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

- [x] **Passo 18** — Testes unitários: auxiliar `src/testing/provedores-de-teste.ts` (HttpClient de teste, Router, pt-BR, diálogo), os 20 testes gerados consertados e testes de comportamento de função pura, service, interceptor e dois diálogos · 34 testes passando · *commit: a preencher*
- [x] **Passo 19** — Tamanho do pacote inicial: análise com `ng build --stats-json`, menu lateral com links simples no lugar do `mat-nav-list` (o `@angular/forms` saiu do carregamento inicial), 685,6 → 603,5 kB, aviso do budget em 650 kB · *commit: a preencher*
- [x] **Passo 20** — Services com `@Service()` (Angular 22) no lugar de `@Injectable({ providedIn: 'root' })`, nos quatro services · *commit: a preencher*

---

## Pendências e decisões em aberto

- [x] **Cadastro de máquinas** — decidido: **entra no sistema** (Passos 8.1 e 8.2).
- [x] **Material do back-end após o cadastro de máquinas** — `testes.http` com os cenários N1 a N6 do cadastro, roteiro de testes do README com a tabela do `POST /maquinas` (88 cenários), e o exercício 4 trocado por **"Editar máquina" (`PATCH /maquinas/:id`)**, com gabarito testado e verbete `PATCH` no glossário · *commit: a preencher*
- [x] **Branch/PR do front-end** — decidido: tudo no PR #2 (título e descrição atualizados no Passo 17).
- [x] **Budget do pacote inicial** — resolvido no Passo 19: 685,6 → 603,5 kB (o menu `mat-nav-list` trazia o `@angular/forms` para o carregamento inicial); aviso do budget reduzido para 650 kB.
- [x] **Migrar services para `@Service()`** — feito no Passo 20 nos quatro services (`MaquinaService`, `PecaService`, `OrdemServicoService` e `TemaService`); build e testes continuam passando · *commit: a preencher*
- [x] **Testes unitários** — resolvido no Passo 18 (34 testes passando; o teste revelou e corrigiu o `matchMedia` sem verificação no `TemaService`).
