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

## Etapa 2 — Front-end (Angular 22 + Angular Material) 🚧

Branch atual: `feat/front-base` · PR #2 (aberto)

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

### Refinamentos (identidade visual) 🚧

> Solicitados depois da Fase 3, a partir da logo do produto (verde `#0f633e` + laranja `#f38302`).

- [x] **R1** — Logo tratada (fundo removido, versões clara/escura/compacta), página inicial com a logo e o descritivo do produto, logo no lugar do texto "Agro Frota" no menu · *commit: a preencher*
- [ ] **R2** — Paleta da logo em todo o site (tema do Angular Material gerado a partir das cores da marca) e estilo mais comercial, mantendo o visual limpo
- [ ] **R3** — Tema escuro (segue o sistema operacional + botão para alternar), com as cores fixas adaptadas aos dois temas
- [ ] **R4** — Conferência visual de todas as telas nos temas claro e escuro

### Fase 4 — Fechamento

- [ ] **Passo 16** — Polimento (dividido em 3 partes)
  - [x] **16.1** — Estilos globais (`src/estilos/_comuns.scss`), tons semânticos das etiquetas (`core/ui/tons.ts`) e links com a cor do tema · *commit: a preencher*
  - [ ] **16.2** — Diálogo de confirmação reutilizável (antes de fechar a O.S.)
  - [ ] **16.3** — Responsividade (menu lateral sobreposto no celular)
- [ ] **Passo 17** — `ng build`, README do front-end, atualização do `context.md` e PR final
- [ ] *(Opcional)* Testes unitários de um service e de um componente

---

## Pendências e decisões em aberto

- [x] **Cadastro de máquinas** — decidido: **entra no sistema** (Passos 8.1 e 8.2).
- [ ] **Material do back-end após o cadastro de máquinas** — atualizar o README do back-end (nova rota), o `testes.http` e trocar o exercício 4 (que passa a ser "resposta pronta") por outro desafio, com gabarito.
- [ ] **Branch/PR do front-end** — o Passo 8 foi commitado na `feat/front-base` (PR #2). Decidir: manter tudo no PR #2 (e ajustar o título no fim) ou separar a Fase 2 numa branch própria.
- [ ] *(Opcional)* **Migrar services para `@Service()`** — decorador novo do Angular 22 (gerado pelo CLI), equivalente a `@Injectable({ providedIn: 'root' })`. Hoje os 3 services usam `@Injectable` por consistência; migrar os três juntos.
- [ ] **Testes unitários** — os `.spec.ts` gerados pelo CLI ainda não foram ajustados (planejado para a Fase 4).
