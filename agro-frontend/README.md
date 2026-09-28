# Agro Frontend: Gestão de Frota Agrícola (MVP)

> **Material de apoio do treinamento.** Este README explica **como executar** o front-end, **como ele foi construído**, passo a passo, e **quais conceitos** de Angular cada tela ensina. Use-o também como modelo para construir interfaces parecidas em outros domínios.
>
> 📖 As regras de negócio e os contratos da API estão no [README do back-end](../agro-backend/README.md). Os termos do negócio estão no [glossário](../agro-backend/docs/glossario.md).

Interface web em **Angular 22 + Angular Material** que consome a API do `agro-backend`. Ela tem uma página inicial e os três módulos do produto:

- **Início:** apresentação do produto e números da frota em tempo real (disponíveis, em campo, em manutenção, peças para repor).
- **Módulo de Uso:** lista de máquinas, cadastro, saída para o campo, retorno com horímetro e histórico de movimentações.
- **Módulo de Estoque (almoxarifado):** lista de peças com custo e alerta de reposição, cadastro, entrada (compra) e kardex.
- **Módulo de Manutenção (O.S.):** lista com filtros na URL, abertura (com aviso de máquina em campo), fechamento com peças dinâmicas e custo de manutenção por máquina.

Também tem **identidade visual** própria (paleta da logo) e **tema escuro**.

---

## Sumário

1. [Pré-requisitos](#1-pré-requisitos)
2. [Como executar](#2-como-executar)
3. [Visão geral das telas](#3-visão-geral-das-telas)
4. [Arquitetura](#4-arquitetura)
5. [Construção passo a passo (funcionalidades e conceitos)](#5-construção-passo-a-passo)
6. [Roteiro de testes no navegador](#6-roteiro-de-testes-no-navegador)
7. [Referência rápida](#7-referência-rápida)
8. [Como criar um projeto semelhante](#8-como-criar-um-projeto-semelhante)
9. [Problemas comuns](#9-problemas-comuns)
10. [Limitações e próximos passos](#10-limitações-e-próximos-passos)

---

## 1. Pré-requisitos

| Ferramenta | Para quê |
|---|---|
| [Node.js](https://nodejs.org) 24+ | Executar o Angular CLI e o servidor de desenvolvimento |
| Angular CLI 22 (`npm i -g @angular/cli`) | Criar componentes e rodar `ng serve`/`ng build` (opcional: `npx ng` também funciona) |
| VS Code + extensão *Angular Language Service* | Autocompletar e erros de tipo **dentro dos templates HTML** |
| Um navegador com DevTools | Aba **Network** para ver as requisições e as respostas da API |
| O **back-end rodando** | O front não tem dados próprios: tudo vem da API em `http://localhost:3000` |

> ⚠️ O Angular CLI 17 (ou anterior) **não funciona com o Node 24**. Se `ng version` mostrar uma versão antiga, atualize com `npm i -g @angular/cli@latest`.

---

## 2. Como executar

São **dois terminais**: um para a API e outro para o front.

```bash
# Terminal 1: API
cd agro-backend
npm install      # só na primeira vez
npm run dev      # http://localhost:3000

# Terminal 2: front-end
cd agro-frontend
npm install      # só na primeira vez
npm start        # = ng serve -> http://localhost:4200
```

Abra **http://localhost:4200**. A página inicial deve mostrar "2 de 2 máquinas disponíveis".

Outros comandos úteis:

```bash
npm run build    # gera a versão de produção em dist/agro-frontend (deve terminar sem erros nem avisos)
npm test         # testes unitários (Vitest), veja as limitações na seção 10
```

> ⚠️ **Os dados zeram quando a API reinicia.** O front só mostra o que a API tem na memória. Se as O.S. sumirem, verifique se o back-end reiniciou (ao salvar o `server.ts`, por exemplo).

### Estrutura

```
agro-frontend/
├── proxy.conf.json            # /api/... -> http://localhost:3000/... (evita CORS no desenvolvimento)
├── angular.json               # configuração do CLI (proxy, budgets de tamanho, estilos globais)
├── public/
│   ├── favicon.png / .ico
│   └── img/                   # logos: clara, escura e compactas (WebP com fundo transparente)
└── src/
    ├── index.html             # fontes, cor da barra do navegador e script que aplica o tema salvo
    ├── styles.scss            # tema do Angular Material (paleta da marca + claro/escuro)
    ├── estilos/
    │   ├── _theme-colors.scss # paletas geradas a partir das cores da logo
    │   └── _comuns.scss       # estilos compartilhados: avisos, tabelas, etiquetas, cores semânticas
    └── app/
        ├── app.config.ts      # providers: rotas, HttpClient + interceptor, idioma pt-BR, moeda BRL
        ├── app.routes.ts      # rotas das telas (lazy loading)
        ├── layout/shell/      # casca: barra superior, menu lateral, seletor de tema, <router-outlet>
        ├── core/              # o que NÃO é de uma tela específica
        │   ├── api.ts         # prefixo /api e tradução de erros HTTP em mensagens
        │   ├── validacao.ts   # regras de formulário reutilizadas (NAO_VAZIO, inteiro())
        │   ├── models/        # interfaces espelhando o back-end (Maquina, Peca, OrdemServico...)
        │   ├── services/      # MaquinaService, PecaService, OrdemServicoService (HttpClient)
        │   ├── interceptors/  # erro-api-interceptor: snackbar vermelho para qualquer erro da API
        │   └── ui/            # tons das etiquetas (tons.ts) e TemaService (claro/escuro)
        └── features/          # uma pasta por módulo, uma subpasta por tela ou diálogo
            ├── inicio/
            ├── maquinas/      # lista, detalhe, movimentações e diálogos (nova, saída, retorno)
            ├── estoque/       # lista de peças, kardex e diálogos (nova peça, entrada)
            └── ordens-servico/# lista, detalhe/fechamento e diálogo de abertura
```

Cada componente tem **quatro arquivos**: `.ts` (lógica), `.html` (template), `.scss` (estilo só daquele componente) e `.spec.ts` (teste).

---

## 3. Visão geral das telas

| Rota | Tela | Chamadas à API |
|---|---|---|
| `/` | Início: logo, descritivo e "A frota agora" | `GET /maquinas`, `GET /pecas?abaixoDoMinimo=true` |
| `/maquinas` | Lista de máquinas + diálogos Nova máquina, Saída, Retorno e O.S. | `GET /maquinas`, `POST /maquinas`, `POST /maquinas/:id/saida`, `POST /maquinas/:id/retorno` |
| `/maquinas/:id` | Detalhe da máquina: indicadores e custo por tipo de O.S. | `GET /maquinas/:id/manutencoes` |
| `/movimentacoes` | Histórico de saídas e retornos, com filtro por máquina | `GET /movimentacoes?maquinaId=` |
| `/estoque` | Lista de peças + diálogos Nova peça e Entrada | `GET /pecas`, `POST /pecas`, `POST /pecas/:id/entradas` |
| `/estoque/:id` | Kardex da peça | `GET /pecas/:id`, `GET /pecas/:id/movimentos` |
| `/ordens-servico` | Lista de O.S. com filtros na URL + diálogo de abertura | `GET /ordens-servico?maquinaId=&status=`, `POST /ordens-servico` |
| `/ordens-servico/:id` | Detalhe e fechamento da O.S. | `GET /ordens-servico/:id`, `POST /ordens-servico/:id/fechamento` |
| qualquer outra | Volta para o início | — |

As telas se ligam por **links**:
- a tag da máquina abre o detalhe;
- o número da O.S. abre a O.S.;
- no kardex, a saída de uma peça leva à O.S. que a consumiu;
- no detalhe da O.S., a máquina leva ao detalhe dela.

---

## 4. Arquitetura

### O caminho de um dado, da API até a tela

```
 Tela (componente)          Service                    Interceptor           Proxy do ng serve        API
 ─────────────────          ───────                    ───────────           ─────────────────        ───
 maquinaService.listar() -> http.get('/api/maquinas') -> (passa adiante) ->   /api/maquinas         -> GET /maquinas
        ▲                                                   │ erro?                                        │
        │ signal / rxResource                               └─> snackbar vermelho com { erro }            │
        └───────────────────────────── Observable<Maquina[]> <────────────────────────────────────────────┘
```

| Camada | Responsabilidade | Não faz |
|---|---|---|
| **Componente** (`features/`) | Estado da tela (signals), reação aos cliques, abrir diálogos | Não monta URLs, não conhece `HttpClient` |
| **Service** (`core/services/`) | Uma função por rota da API, tipada com os models | Não mostra mensagens, não guarda estado de tela |
| **Model** (`core/models/`) | O **contrato**: o formato dos dados que vão e voltam | Não tem lógica |
| **Interceptor** (`core/interceptors/`) | Tratamento **global** de erros HTTP | Não decide o que a tela faz depois do erro |
| **Estilos globais** (`src/estilos/`) | Aparência compartilhada (avisos, etiquetas, tabelas, cores) | Não conhece nenhuma tela |

### Padrões de Angular moderno usados em todo o projeto

- **Componentes standalone:** cada componente declara no próprio `imports` o que usa. Não há `NgModule`.
- **`inject()`** no lugar de injeção pelo construtor.
- **Signals** (`signal`, `computed`) para o estado da tela, e **`rxResource`** para dados que dependem de parâmetros.
- **Control flow** no template: `@if`, `@for`, `@else`, em vez de `*ngIf`/`*ngFor`.
- **Formulários reativos** tipados (`FormBuilder.nonNullable`, `FormArray`).
- **Zoneless:** o Angular 22 não usa mais o `zone.js`. A tela se atualiza porque os **signals** avisam quando mudam.
- **Lazy loading:** cada tela é um arquivo JavaScript separado, baixado só quando o usuário entra nela.

---

## 5. Construção passo a passo

O front foi construído em **passos pequenos**. Cada passo traz: 🎯 o **objetivo**, 🧩 o **código** (trechos principais), 📚 os **conceitos** e 🧪 os **testes**.

| Fase | Passos |
|---|---|
| **0. Preparação** | [Passo 0](#passo-0--projeto-com-o-angular-cli) a [Passo 2](#passo-2--ponte-com-a-api-proxy-httpclient-e-service) |
| **1. Máquinas** | [Passo 3](#passo-3--lista-de-máquinas) a [Passo 7](#passo-7--interceptor-global-de-erros) |
| **2. Estoque** | [Passo 8](#passo-8--lista-de-peças-com-custo-e-reposição) a [Passo 11](#passo-11--kardex-rota-com-parâmetro) |
| **3. Manutenção** | [Passo 12](#passo-12--lista-de-os-com-filtros-na-url) a [Passo 15](#passo-15--custo-de-manutenção-por-máquina) |
| **4. Polimento** | [Passo 16.1](#passo-161--estilos-globais-e-tons-semânticos), [Refinamentos R1 a R3](#refinamentos-r1-a-r3--identidade-visual-e-tema-escuro) e [R4](#refinamento-r4--conferência-visual-e-correções) |

> **Dica para os alunos:** o histórico do Git tem **um commit por passo** (`git log --oneline`). Para ver exatamente o que mudou num passo, use `git show <hash>`. O [CHECKLIST.md](../CHECKLIST.md) lista os hashes.

---

### Passo 0 — Projeto com o Angular CLI

🎯 Criar o projeto e ver a página padrão no navegador.

🧩

```bash
npm i -g @angular/cli@latest
ng new agro-frontend --style=scss --ssr=false
cd agro-frontend
ng serve
```

📚 **Conceitos**
- **Angular CLI:** gera o projeto, os componentes (`ng generate component`) e roda o servidor de desenvolvimento.
- **`ng serve`:** compila em memória e **recarrega o navegador** a cada arquivo salvo.
- **SCSS:** CSS com variáveis, aninhamento e `@use`, compilado para CSS comum.
- **SSR desligado:** a renderização no servidor não faz sentido num sistema interno sem SEO.

🧪 **Teste:** `http://localhost:4200` mostra a página de boas-vindas do Angular.

---

### Passo 1 — Angular Material, layout e rotas

🎯 Montar a "casca" do sistema: barra superior, menu lateral e área central onde as telas aparecem.

🧩 `layout/shell/shell.html` (resumido):

```html
<mat-toolbar class="barra">
  <button mat-icon-button (click)="menu.toggle()"><mat-icon>menu</mat-icon></button>
  ...
</mat-toolbar>

<mat-sidenav-container class="container">
  <mat-sidenav #menu mode="side" opened class="menu">
    <mat-nav-list>
      @for (item of itensMenu; track item.rota) {
        <a mat-list-item [routerLink]="item.rota" routerLinkActive #rla="routerLinkActive" [activated]="rla.isActive">
          <mat-icon matListItemIcon>{{ item.icone }}</mat-icon>
          <span matListItemTitle>{{ item.titulo }}</span>
        </a>
      }
    </mat-nav-list>
  </mat-sidenav>

  <mat-sidenav-content class="conteudo">
    <router-outlet />
  </mat-sidenav-content>
</mat-sidenav-container>
```

`app.routes.ts`:

```ts
{
  path: 'maquinas',
  title: 'Máquinas | Agro Frota',
  loadComponent: () =>
    import('./features/maquinas/maquinas-lista/maquinas-lista').then(m => m.MaquinasLista),
},
// ...
{ path: '**', redirectTo: '' }, // SEMPRE a última rota
```

📚 **Conceitos**
- **`ng add @angular/material`:** instala a biblioteca, o tema e as fontes de uma vez.
- **Componente:** classe TypeScript + template HTML + estilo. O `Shell` é um componente que contém outros.
- **Roteamento:** a URL decide qual componente aparece no `<router-outlet>`. O `routerLink` troca de tela **sem recarregar a página** (SPA).
- **`loadComponent` (lazy loading):** o código da tela só é baixado quando o usuário entra nela. O `ng build` mostra um arquivo separado para cada uma.
- **Referência de template (`#menu`):** dá um nome ao elemento para usá-lo em outro ponto do template (`menu.toggle()`).
- **Menu como lista de dados (`itensMenu`):** para criar uma tela nova no menu, basta **uma linha** no array.
- **`@for ... track`:** o `track` diz ao Angular como identificar cada item, para não recriar o HTML de todos a cada mudança.
- **`title` na rota:** o texto da aba do navegador muda sozinho a cada tela.

🧪 **Teste:** o menu navega entre as telas, o item ativo fica destacado e o título da aba muda.

---

### Passo 2 — Ponte com a API: proxy, HttpClient e service

🎯 Buscar as máquinas na API e vê-las no console do navegador.

🧩 `proxy.conf.json` (ligado no `angular.json` em `serve.options.proxyConfig`):

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true,
    "pathRewrite": { "^/api": "" }
  }
}
```

`core/models/maquina.ts`: o **mesmo formato** do `server.ts`:

```ts
export type StatusMaquina = 'Disponível' | 'Em Operação' | 'Em Manutenção';

export interface Maquina {
  id: number;
  tag: string;
  modelo: string;
  horimetro: number;
  status: StatusMaquina;
}
```

`core/services/maquina.service.ts`:

```ts
@Injectable({ providedIn: 'root' }) // uma única instância para o app inteiro
export class MaquinaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/maquinas`;   // API_URL = '/api'

  listar(): Observable<Maquina[]> {
    return this.http.get<Maquina[]>(this.url);
  }
}
```

`app.config.ts`:

```ts
provideHttpClient(withInterceptors([erroApiInterceptor])), // o interceptor chega no Passo 7
{ provide: LOCALE_ID, useValue: 'pt-BR' },
{ provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
```

📚 **Conceitos**
- **CORS:** o navegador bloqueia chamadas de `localhost:4200` para `localhost:3000` (origens diferentes), a menos que a API autorize.
- **Proxy de desenvolvimento:** o front chama **a própria origem** (`/api/maquinas`), e o `ng serve` repassa para a porta 3000. Assim **o back-end não precisou mudar**.
- **`pathRewrite`:** tira o `/api` do caminho antes de repassar, porque a API não usa esse prefixo.
- **Model como contrato:** as interfaces **copiam** os tipos do back-end. Se a API mudar um campo, o TypeScript aponta todos os pontos do front que quebram.
- **Service + injeção de dependência:** a tela pede o service com `inject()`, e o Angular entrega **a mesma instância** para todos (`providedIn: 'root'`).
- **Observable:** a requisição **só acontece** quando alguém faz `.subscribe()` (é "preguiçosa").
- **`http.get<Maquina[]>`:** o genérico diz o tipo da resposta. É uma **promessa** que o TypeScript não confere em tempo de execução.

🧪 **Testes**

```bash
curl.exe http://localhost:4200/api/maquinas   # passa pelo proxy e deve devolver o JSON das máquinas
```

No DevTools → **Network**, a requisição aparece como `api/maquinas`, status 200.

---

### Passo 3 — Lista de máquinas

🎯 Mostrar as máquinas numa tabela, com os estados **carregando**, **erro** e **lista vazia**.

🧩 `maquinas-lista.ts`:

```ts
protected readonly maquinas = signal<Maquina[]>([]);
protected readonly carregando = signal(false);
protected readonly erro = signal<string | null>(null);

protected carregar(): void {
  this.carregando.set(true);
  this.erro.set(null);

  this.maquinaService
    .listar()
    .pipe(finalize(() => this.carregando.set(false))) // roda no sucesso E no erro
    .subscribe({
      next: maquinas => this.maquinas.set(maquinas),
      error: () => this.erro.set('Não foi possível carregar as máquinas. Verifique se a API está rodando.'),
    });
}
```

`maquinas-lista.html`:

```html
@if (carregando()) {
  <mat-progress-bar mode="indeterminate" />
}

@if (erro(); as mensagem) {
  <p class="aviso aviso--erro"><mat-icon>error</mat-icon> {{ mensagem }}</p>
} @else if (!carregando() && maquinas().length === 0) {
  <p class="aviso">Nenhuma máquina cadastrada.</p>
} @else if (maquinas().length > 0) {
  <table mat-table [dataSource]="maquinas()" class="tabela">
    <ng-container matColumnDef="horimetro">
      <th mat-header-cell *matHeaderCellDef>Horímetro</th>
      <td mat-cell *matCellDef="let maquina">{{ maquina.horimetro | number: '1.0-1' }} h</td>
    </ng-container>
    ...
  </table>
}
```

📚 **Conceitos**
- **Signal:** uma "caixa" com um valor. Lê com `maquinas()` e grava com `.set()`. Quando muda, **só as partes da tela que o leem** são atualizadas.
- **Os quatro estados de uma tela com dados:** carregando, erro, vazio e com dados. Esquecer um deles é a causa mais comum de tela "em branco" sem explicação.
- **`finalize`:** operador do RxJS que roda **no fim**, com sucesso ou erro. Evita repetir o `carregando.set(false)` nos dois caminhos.
- **`mat-table`:** cada coluna é um `matColumnDef`. A ordem das colunas vem do array `colunas`, não do HTML.
- **Pipe `number: '1.0-1'`:** formata o número (no mínimo 1 dígito inteiro, 0 a 1 casa decimal) no padrão pt-BR: `1.006,5`.
- **`@if (...; as mensagem)`:** guarda o valor testado numa variável do template.

🧪 **Testes**
1. Com a API no ar, a tabela mostra TR-01 e CO-02.
2. Pare a API (Ctrl+C) e clique em **Atualizar**: aparece o aviso de erro.
3. No DevTools → Network → *Throttling* "Slow 3G": a barra de progresso aparece durante a carga.

---

### Passo 4 — Diálogo de saída

🎯 Registrar a saída de uma máquina num diálogo com formulário, e recarregar a lista.

🧩 Na lista, o diálogo é aberto **passando a máquina** e **esperando a resposta**:

```ts
protected abrirSaida(maquina: Maquina): void {
  this.dialog
    .open<SaidaDialog, Maquina, RespostaSaida>(SaidaDialog, { data: maquina, width: '440px' })
    .afterClosed()
    .subscribe(resposta => {
      if (resposta) {            // undefined quando o usuário cancela
        this.snackBar.open(resposta.mensagem, 'OK', { duration: 4000 });
        this.carregar();
      }
    });
}
```

`saida-dialog.ts`:

```ts
protected readonly maquina = inject<Maquina>(MAT_DIALOG_DATA);

protected readonly form = inject(FormBuilder).nonNullable.group({
  operador: ['', [Validators.required, Validators.pattern(NAO_VAZIO)]],
  frenteTrabalho: ['', [Validators.required, Validators.pattern(NAO_VAZIO)]],
});

protected confirmar(): void {
  if (this.form.invalid) {
    this.form.markAllAsTouched(); // mostra as mensagens de todos os campos
    return;
  }
  this.salvando.set(true);
  this.maquinaService
    .registrarSaida(this.maquina.id, this.form.getRawValue())
    .pipe(finalize(() => this.salvando.set(false)))
    .subscribe({
      next: resposta => this.dialogRef.close(resposta), // devolve a resposta para a lista
      error: () => {},                                   // o diálogo continua aberto
    });
}
```

`saida-dialog.html` (um campo):

```html
<mat-form-field class="campo">
  <mat-label>Operador</mat-label>
  <input matInput formControlName="operador" />
  @if (form.controls.operador.invalid) {
    <mat-error>Informe o operador.</mat-error>
  }
</mat-form-field>
```

📚 **Conceitos**
- **`MatDialog`:** abre um componente por cima da tela. Os genéricos `<Componente, Entrada, Saída>` tipam o que entra (`data`) e o que volta (`afterClosed`).
- **`MAT_DIALOG_DATA`:** o **token** que entrega ao diálogo o `data` passado no `open`.
- **Formulário reativo:** o formulário é um **objeto no TypeScript**, e o HTML só se liga a ele com `formControlName`. As regras ficam testáveis e fora do HTML.
- **`nonNullable`:** ao resetar, o campo volta ao valor inicial (e não a `null`), e o tipo fica `string` em vez de `string | null`.
- **`Validators.pattern(NAO_VAZIO)`:** `NAO_VAZIO = /\S/` recusa texto só com espaços, **a mesma regra do back-end** (que faz `trim`).
- **Validação no front × no back:** o front valida para **ajudar o usuário**, e o back valida para **proteger os dados**. O front nunca substitui o back: qualquer um pode chamar a API com o `curl`.
- **O botão certo para o estado certo:** "Saída" só aparece para máquinas `Disponível` (`@if` no template).

🧪 **Testes**
1. Clique em **Saída** e confirme vazio: os dois campos ficam vermelhos, e **nada** vai para a API (confira na aba Network).
2. Digite só espaços no operador: continua inválido.
3. Preencha e confirme: aparece o snackbar, e a máquina fica "Em Operação" com o botão **Retorno**.

---

### Passo 5 — Diálogo de retorno

🎯 Registrar o retorno com o horímetro final, **impedindo** um valor menor que o atual e **mostrando as horas** enquanto o usuário digita.

🧩 `retorno-dialog.ts`:

```ts
protected readonly form = inject(FormBuilder).nonNullable.group({
  horimetro: [this.maquina.horimetro, [Validators.required, Validators.min(this.maquina.horimetro)]],
  avarias: [''], // opcional
});

// Observable -> signal...
private readonly horimetroDigitado = toSignal(this.form.controls.horimetro.valueChanges, {
  initialValue: this.form.controls.horimetro.value,
});

// ...para um cálculo derivado que se atualiza sozinho
protected readonly horasPrevistas = computed(() => {
  const valor = this.horimetroDigitado();
  if (typeof valor !== 'number' || valor < this.maquina.horimetro) return null;
  return Math.round((valor - this.maquina.horimetro) * 10) / 10;
});
```

Envio com campo opcional:

```ts
avarias: avarias.trim() || undefined, // undefined some do JSON
```

📚 **Conceitos**
- **Validador com valor dinâmico:** `Validators.min(this.maquina.horimetro)` usa o dado que chegou no diálogo.
- **`toSignal`:** converte um Observable (`valueChanges`) em signal, para usar em `computed`.
- **`computed`:** um valor **derivado** de outros signals. É recalculado sozinho, e só quando algo que ele lê muda.
- **Campo opcional no JSON:** mandar `avarias: ""` é diferente de não mandar. `undefined` é omitido pelo `JSON.stringify`.
- **Defesa em profundidade:** mesmo que alguém burle o formulário, a API recusa o horímetro menor com 400.

🧪 **Testes**
1. Com o TR-01 "Em Operação", abra **Retorno** e digite um valor menor que o atual: erro no campo, botão sem efeito.
2. Digite `1010`: aparece "10 h trabalhadas" antes de confirmar.
3. Confirme: o snackbar mostra as horas, e a máquina volta a "Disponível" com o horímetro novo.

---

### Passo 6 — Histórico de movimentações

🎯 Listar saídas e retornos com filtro por máquina, datas e números no padrão brasileiro.

🧩 `movimentacoes-lista.ts`:

```ts
// "Join" feito no front: a movimentação só tem maquinaId; a tag vem da lista de máquinas
private readonly tagPorId = computed(
  () => new Map(this.maquinas().map(maquina => [maquina.id, maquina.tag])),
);

// Mais recentes primeiro (copia antes de ordenar: nunca altere o array do signal)
protected readonly movimentacoesOrdenadas = computed(() =>
  [...this.movimentacoes()].sort((a, b) => b.id - a.id),
);
```

Service com filtro opcional:

```ts
listarMovimentacoes(maquinaId: number | null = null): Observable<Movimentacao[]> {
  let params = new HttpParams();
  if (maquinaId !== null) {
    params = params.set('maquinaId', maquinaId);
  }
  return this.http.get<Movimentacao[]>(`${API_URL}/movimentacoes`, { params });
}
```

Template: `{{ mov.dataSaida | date: 'dd/MM/yyyy HH:mm' }}`.

📚 **Conceitos**
- **`registerLocaleData(localePt)` + `LOCALE_ID`:** ensinam os pipes `date`, `number` e `currency` a formatar no padrão pt-BR.
- **`HttpParams`:** monta a *query string* (`?maquinaId=1`) com a codificação correta. É **imutável**: `set` devolve um novo objeto, por isso o `params = params.set(...)`.
- **`Map` para buscas:** achar a tag pelo id em O(1), em vez de um `find` por linha.
- **Nunca ordenar o array original** do signal (`sort` altera o array): copie com `[...]`.

🧪 **Testes:** faça duas saídas e retornos com máquinas diferentes. O filtro mostra só a máquina escolhida, e as datas aparecem como `27/09/2026 14:05`.

---

### Passo 7 — Interceptor global de erros

🎯 Mostrar **qualquer** erro da API num snackbar vermelho, sem repetir o tratamento em cada diálogo.

🧩 `core/interceptors/erro-api-interceptor.ts`:

```ts
export const erroApiInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((erro: unknown) => {
      snackBar.open(mensagemDeErro(erro), 'Fechar', { duration: 6000, panelClass: 'snack-erro' });
      return throwError(() => erro); // repassa o erro: a tela ainda pode reagir
    }),
  );
};
```

`core/api.ts`:

```ts
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof HttpErrorResponse) {
    const corpo = erro.error as { erro?: unknown } | null;
    if (corpo && typeof corpo.erro === 'string') {
      return corpo.erro;                     // a mensagem da API tem prioridade
    }
    if (erro.status === 0 || erro.status >= 500) {
      return 'Não foi possível conectar à API. Verifique se ela está rodando.';
    }
  }
  return 'Erro inesperado. Tente novamente.';
}
```

📚 **Conceitos**
- **Interceptor:** uma função que fica **no meio de todas as requisições** do `HttpClient`. É o lugar certo para regras transversais (erros, token de login, logs).
- **DRY no front:** antes, cada diálogo tinha o seu `snackBar.open(...)` de erro. Agora os diálogos só fazem `error: () => {}`, para continuar abertos.
- **`catchError` + `throwError`:** "trata e repassa". Se o interceptor engolisse o erro, a tela nunca saberia que falhou (o `carregando` ficaria preso, o diálogo fecharia...).
- **Contrato de erro da API:** como o back **sempre** responde `{ "erro": "..." }`, o front consegue mostrar a mensagem exata (ex.: *"Máquina TR-01 não pode sair: status atual é 'Em Operação'"*).
- **Status 0:** a requisição nem chegou ao servidor (API parada, rede fora).

🧪 **Testes**
1. Abra dois diálogos de saída para a mesma máquina (duas abas) e confirme os dois: o segundo mostra o **409** da API.
2. Pare a API e clique em **Atualizar**: snackbar "Não foi possível conectar à API".

---

### Passo 8 — Lista de peças com custo e reposição

🎯 Mostrar o estoque com custo em R$, destacar as peças abaixo do mínimo e filtrar só as que precisam de reposição.

🧩 `pecas-lista.ts`:

```ts
protected readonly somenteReposicao = signal(false);

// As colunas também são um dado derivado: "Falta" só existe no modo reposição
protected readonly colunas = computed(() => [
  'codigo', 'descricao', 'saldo', 'minimo', 'custo',
  ...(this.somenteReposicao() ? ['falta'] : []),
  'situacao', 'acoes',
]);

// Valor total na prateleira
protected readonly valorEmEstoque = computed(() =>
  this.pecas().reduce((soma, peca) => soma + peca.saldo * peca.custoUnitario, 0),
);

protected carregar(): void {
  const requisicao = this.somenteReposicao()
    ? this.pecaService.listarParaRepor()   // GET /pecas?abaixoDoMinimo=true
    : this.pecaService.listar();
  // ...
}
```

Template: `{{ peca.custoUnitario | currency }}` → `R$ 45,90`. A linha recebe `[class.linha-repor]="precisaRepor(peca)"`.

📚 **Conceitos**
- **`currency` com `DEFAULT_CURRENCY_CODE = 'BRL'`:** não é preciso repetir `'BRL'` em cada uso.
- **`reduce`:** transforma uma lista num único valor (a soma).
- **Filtro no servidor × no cliente:** aqui o filtro vai para a API (`?abaixoDoMinimo=true`), porque ela devolve o campo calculado `faltaParaMinimo`.
- **Tipo união `(Peca | PecaParaRepor)[]`:** a lista pode ter peças com ou sem o campo extra.
- **`mat-slide-toggle`:** um liga/desliga que chama `alternarReposicao($event.checked)`.

🧪 **Testes:** a COR-001 aparece destacada (saldo abaixo do mínimo). Ligue **Só reposição**: só ela aparece, com a coluna "Falta".

---

### Passo 8.1 e 8.2 — Cadastro de máquinas (back + front)

🎯 Durante o front, percebeu-se que **não havia como cadastrar máquinas**. A rota `POST /maquinas` foi criada no back-end (Passo 8.1, com 6 cenários novos no `testes.sh`) e o diálogo **Nova máquina** no front (Passo 8.2).

🧩 `core/validacao.ts`: a regra que três formulários já repetiam virou uma constante compartilhada:

```ts
// "Tem pelo menos um caractere que não é espaço". Espelha o trim do back-end.
export const NAO_VAZIO = /\S/;
```

`nova-maquina-dialog.ts`:

```ts
protected readonly form = inject(FormBuilder).nonNullable.group({
  tag: ['', [Validators.required, Validators.pattern(NAO_VAZIO)]],
  modelo: ['', [Validators.required, Validators.pattern(NAO_VAZIO)]],
  horimetro: [0, [Validators.required, Validators.min(0)]],
});
```

📚 **Conceitos**
- **Requisito descoberto no meio do caminho:** acontece em todo projeto real. O caminho seguro é **decidir** (entra ou não no escopo), **registrar** (CHECKLIST) e implementar **nas duas pontas**, começando pela API.
- **Diálogo sem `MAT_DIALOG_DATA`:** este diálogo **cria** uma máquina, não recebe nenhuma.
- **Refatoração pequena e segura:** extrair `NAO_VAZIO` para `core/validacao.ts` só depois que a regra apareceu **repetida**.

🧪 **Teste:** cadastre `TR-03` e depois tente de novo: o **409** da API aparece no snackbar, e o diálogo continua aberto para correção.

---

### Passo 9 — Cadastro de peça

🎯 Cadastrar uma peça escolhendo a unidade (`un` ou `L`) e o estoque mínimo, com regras que **mudam conforme a unidade**.

🧩 `nova-peca-dialog.ts`:

```ts
protected readonly unidades = UNIDADES_MEDIDA; // opções vêm do model, não ficam soltas no HTML

constructor() {
  const unidade = this.form.controls.unidade;
  this.aplicarRegrasDoMinimo(unidade.value);
  unidade.valueChanges
    .pipe(takeUntilDestroyed())                 // encerra a inscrição quando o diálogo fecha
    .subscribe(nova => this.aplicarRegrasDoMinimo(nova));
}

private aplicarRegrasDoMinimo(unidade: UnidadeMedida): void {
  const estoqueMinimo = this.form.controls.estoqueMinimo;
  estoqueMinimo.setValidators([
    Validators.required,
    Validators.min(0),
    ...(unidade === 'un' ? [inteiro()] : []),
  ]);
  estoqueMinimo.updateValueAndValidity();       // revalida o valor que já está no campo
}
```

📚 **Conceitos**
- **`mat-select`:** a lista de opções vem de um array tipado (`UNIDADES_MEDIDA`).
- **Validador condicional dinâmico:** `setValidators` troca as regras, e `updateValueAndValidity` aplica na hora.
- **`takeUntilDestroyed()`:** sem ele, a inscrição em `valueChanges` continuaria viva depois de o diálogo fechar (**vazamento de memória**).
- **Validador customizado `inteiro()`:** um `ValidatorFn` devolve `null` (válido) ou um objeto de erro (`{ inteiro: true }`).
- **Campo vazio é problema do `required`:** o `inteiro()` ignora valores que não são número. Cada validador cuida de **uma** regra.

🧪 **Testes**
1. Unidade `un` com mínimo `2,5`: erro "deve ser inteiro". Troque para `L`: o erro some sozinho.
2. Cadastre `FLT-001` (já existe): **409** da API.

---

### Passo 10 — Entrada de estoque (compra)

🎯 Registrar uma compra, **prevendo** o saldo e o valor antes de confirmar e mostrando a mudança de custo.

🧩 `entrada-dialog.ts`:

```ts
protected readonly exigeInteiro = this.peca.unidade === 'un';

// Validador condicional ESTÁTICO: a unidade não muda dentro deste diálogo
protected readonly form = inject(FormBuilder).nonNullable.group({
  quantidade: [1, [Validators.required, Validators.min(0.01), ...(this.exigeInteiro ? [inteiro()] : [])]],
  custoUnitario: [this.peca.custoUnitario, [Validators.required, Validators.min(0.01)]],
});

private readonly valores = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

protected readonly previa = computed(() => {
  const { quantidade, custoUnitario } = this.valores();
  if (/* valores inválidos */) return null;
  const custo = this.arredondar(custoUnitario);  // mesma conta da API
  return {
    saldoApos: this.arredondar(this.peca.saldo + quantidade),
    valorTotal: this.arredondar(quantidade * custo),
  };
});
```

Na lista, depois do sucesso: *"Entrada registrada. Custo: R$ 45,90 → R$ 48,00"*.

📚 **Conceitos**
- **Condicional estático × dinâmico:** no Passo 9 a regra muda **com o formulário aberto** (`valueChanges`). Aqui ela depende só do dado recebido, então é decidida **uma vez**.
- **Prévia com a mesma regra da API:** o front repete o arredondamento para a prévia bater **exatamente** com o que será gravado.
- **`Intl.NumberFormat`:** formata moeda **fora do template** (no snackbar), onde o pipe `currency` não está disponível.

🧪 **Testes:** compre 1,5 unidade de uma peça em `un` (bloqueado) e 1,5 L de óleo (aceito). Confira a prévia e a mensagem "de → para".

---

### Passo 11 — Kardex (rota com parâmetro)

🎯 Tela `/estoque/:id` com todos os movimentos da peça.

🧩 `app.config.ts`: `provideRouter(routes, withComponentInputBinding())`.

`peca-kardex.ts`:

```ts
// O :id da rota chega como input. Na URL tudo é texto: numberAttribute converte '1' em 1
readonly id = input.required({ transform: numberAttribute });

ngOnInit(): void {       // os inputs só existem DEPOIS do construtor
  this.carregar();
}

protected carregar(): void {
  // forkJoin: as duas requisições em paralelo; responde quando AMBAS terminam
  forkJoin({
    peca: this.pecaService.buscar(this.id()),
    movimentos: this.pecaService.listarMovimentos(this.id()),
  }).subscribe({
    next: ({ peca, movimentos }) => { /* ... */ },
    error: erro => {
      if (erro instanceof HttpErrorResponse && (erro.status === 404 || erro.status === 400)) {
        this.naoEncontrada.set(true);    // /estoque/99 ou /estoque/abc
      }
    },
  });
}
```

Apresentação de cada tipo com `Record` (o TypeScript exige **todos** os tipos):

```ts
private readonly tipos: Record<TipoMovimentoEstoque, ApresentacaoTipo> = {
  implantacao: { rotulo: 'Implantação', icone: 'inventory_2', classe: 'etiqueta--neutro', sinal: '+' },
  entrada:     { rotulo: 'Entrada',     icone: 'south_west',  classe: 'etiqueta--sucesso', sinal: '+' },
  saida:       { rotulo: 'Saída',       icone: 'north_east',  classe: 'etiqueta--alerta',  sinal: '−' },
};
```

📚 **Conceitos**
- **Parâmetro de rota:** `/estoque/:id`. Com `withComponentInputBinding`, ele vira um **`input()`** do componente, sem `ActivatedRoute`.
- **`transform: numberAttribute`:** conversão de texto para número **na entrada** do componente.
- **`forkJoin`:** espera várias requisições em paralelo. Se uma falhar, o todo falha.
- **404 × 400 × erro de rede:** a tela distingue "peça não existe" (mensagem amigável) de "API fora" (aviso de erro).
- **`Record<Tipo, ...>`:** se um tipo novo for criado no model, o compilador aponta que falta a apresentação dele.
- **Método tipado no template:** a variável de `*matCellDef` é `any`, e indexar um `Record` com `any` dá erro TS7053. A solução é um método com parâmetro tipado (`tipo(mov.tipo)`).

🧪 **Testes:** clique no código de uma peça: o kardex mostra a implantação e as entradas. Acesse `/estoque/99` e `/estoque/abc`: "Peça não encontrada".

---

### Passo 12 — Lista de O.S. com filtros na URL

🎯 Listar as O.S. com filtros por máquina e status que ficam **na URL**, para que um link copiado abra a tela já filtrada.

🧩 `os-lista.ts`:

```ts
// ?maquinaId=2&status=Aberta viram inputs (withComponentInputBinding também liga query params)
readonly maquinaId = input<number | undefined, string | undefined>(undefined, { transform: paraMaquinaId });
readonly status = input<StatusOS | undefined, string | undefined>(undefined, { transform: paraStatus });

// Recurso reativo: quando um filtro muda, a lista é buscada de novo (e a requisição antiga é cancelada)
protected readonly ordens = rxResource({
  params: () => ({ maquinaId: this.maquinaId(), status: this.status() }),
  stream: ({ params }) => this.osService.listar(params),
});

// Os selects NÃO buscam dados: só mudam a URL
protected filtrarStatus(status: StatusOS | null): void {
  this.router.navigate([], { relativeTo: this.rota, queryParams: { status }, queryParamsHandling: 'merge' });
}
```

Template:

```html
@if (ordens.isLoading()) { <mat-progress-bar mode="indeterminate" /> }
@if (ordens.error()) {
  <p class="aviso aviso--erro">...</p>
} @else if (ordensOrdenadas().length === 0) { ... } @else { <table mat-table ...> }
```

📚 **Conceitos**
- **URL como fonte da verdade:** o filtro é **estado da URL**, não da tela. O botão Voltar funciona, F5 mantém o filtro e o link pode ser compartilhado.
- **Fluxo em uma direção:** select → URL → input → `rxResource` → API → tela. Nenhum passo "pula" o outro.
- **`rxResource`:** junta **estado + requisição**: `value()`, `isLoading()`, `error()` e `reload()`, sem `signal` de carregando nem `subscribe` manual.
- **`value()` lança erro** quando o recurso está em erro: teste `error()` antes, ou use `hasValue()` no código.
- **Transform que valida:** `?status=xyz` digitado à mão é ignorado (vira "sem filtro"), em vez de quebrar a tela.
- **`queryParamsHandling: 'merge'`:** muda um parâmetro e preserva os outros. `null` remove o parâmetro.

🧪 **Testes:** filtre por status "Aberta" e veja a URL mudar. Copie a URL, abra numa aba nova: o filtro vem aplicado. Use **Voltar** do navegador: o filtro anterior volta.

---

### Passo 13 — Abertura de O.S.

🎯 Abrir uma O.S. a partir da lista de O.S. **ou** da lista de máquinas, avisando quando a máquina está em campo.

🧩 `abrir-os-dialog.ts`:

```ts
// Dado OPCIONAL: pela tela Máquinas vem a máquina; pela tela de O.S. vem null
private readonly maquinaInicial = inject<Maquina | null>(MAT_DIALOG_DATA, { optional: true });

protected readonly maquinaSelecionada = computed(() => {
  const id = this.maquinaIdEscolhida();
  const lista = this.maquinas.hasValue() ? this.maquinas.value() : [];
  return lista.find(maquina => maquina.id === id) ?? null;
});

constructor() {
  // Ao trocar a máquina, o horímetro recebe o valor atual dela e o novo mínimo
  this.form.controls.maquinaId.valueChanges
    .pipe(takeUntilDestroyed())
    .subscribe(id => { /* aplicarHorimetroMinimo(maquina.horimetro) */ });
}
```

Template:

```html
@if (maquinaSelecionada()?.status === 'Em Operação') {
  <p class="aviso-campo">
    <mat-icon>warning</mat-icon>
    <span>A máquina está <strong>em campo</strong>. Ao abrir a O.S., a saída em aberto será encerrada automaticamente ...</span>
  </p>
}
```

`features/ordens-servico/mensagens.ts`: o texto de sucesso é compartilhado pelas duas telas que abrem o diálogo:

```ts
export function mensagemAberturaOS(resposta: RespostaAberturaOS): string {
  const numero = `O.S. nº ${resposta.ordemServico.id} aberta para ${resposta.maquina.tag}.`;
  const saida = resposta.movimentacaoEncerrada;
  return saida ? `${numero} Saída encerrada automaticamente (${saida.horasTrabalhadas} h trabalhadas).` : numero;
}
```

📚 **Conceitos**
- **Um diálogo, dois pontos de entrada:** `{ optional: true }` permite reaproveitar o mesmo componente com ou sem dado inicial.
- **Avisar antes de uma consequência:** a regra "O.S. encerra a saída" é do back. O front **explica** o que vai acontecer antes do clique.
- **Máquinas em manutenção desabilitadas no select:** o usuário nem consegue escolher algo que a API recusaria (409).
- **`mat-button-toggle`:** para poucas opções exclusivas (Preventiva/Corretiva), é mais rápido que um select.

🧪 **Testes:** dê saída no TR-01 e abra uma O.S. para ele: o aviso aparece, e o snackbar mostra as horas trabalhadas. Na lista de máquinas, o TR-01 fica "Em Manutenção".

---

### Passo 14 — Detalhe e fechamento da O.S. (`FormArray`)

🎯 Fechar a O.S. informando **quantas peças quiser**, com validação por linha, na lista inteira e com o "tudo ou nada" da API.

🧩 `os-detalhe.ts`:

```ts
type LinhaPeca = FormGroup<{
  pecaId: FormControl<number | null>;
  quantidade: FormControl<number | null>;
}>;

// Validador da LISTA: a mesma peça não pode aparecer em duas linhas
const pecasSemRepeticao: ValidatorFn = lista => {
  const ids = (lista as FormArray<LinhaPeca>).controls
    .map(linha => linha.controls.pecaId.value)
    .filter((id): id is number => id !== null);
  return new Set(ids).size !== ids.length ? { pecaRepetida: true } : null;
};

protected readonly linhas = new FormArray<LinhaPeca>([], pecasSemRepeticao);

protected adicionarLinha(): void {
  this.linhas.push(new FormGroup(
    {
      pecaId: new FormControl<number | null>(null, Validators.required),
      quantidade: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    },
    { validators: this.quantidadeCompativelComUnidade }, // validador da LINHA (peça "un" -> inteiro)
  ));
}

// Custo ESTIMADO: o custo real é congelado pela API no fechamento
protected readonly custoEstimado = computed(() =>
  this.valoresLinhas().reduce((soma, linha) => { /* quantidade x custo atual */ }, 0),
);
```

Template:

```html
@for (linha of linhas.controls; track linha; let i = $index) {
  <div class="linha" [formGroup]="linha">
    <mat-form-field class="linha__peca"> <mat-select formControlName="pecaId"> ... </mat-select> </mat-form-field>
    <mat-form-field class="linha__quantidade"> <input matInput type="number" formControlName="quantidade" /> </mat-form-field>
    <button mat-icon-button (click)="removerLinha(i)"><mat-icon>delete</mat-icon></button>
  </div>
  @if (acimaDoSaldo(i)) { <p class="alerta-linha">Acima do saldo disponível</p> }
}
```

📚 **Conceitos**
- **`FormArray`:** uma **lista** de controles, com `push`, `removeAt`, `clear` e `at(i)`. É o padrão para linhas dinâmicas (itens de pedido, telefones, dependentes).
- **Validadores em três níveis:** no **campo** (obrigatório, mínimo), na **linha** (inteiro se `un`, que depende de dois campos) e na **lista** (sem repetição).
- **Aviso × bloqueio:** "acima do saldo" é só um **aviso**. Quem decide é a API, que recusa o fechamento **inteiro** com 409 (tudo ou nada). O front não duplica a regra de estoque, porque o saldo pode mudar entre a tela e o clique.
- **Estimado × real:** o total mostrado é uma **estimativa**. O custo congelado vem na resposta.
- **Duas visões da mesma tela:** O.S. aberta mostra o formulário, e fechada mostra a tabela de itens com **total no rodapé** (`mat-footer-row`).
- **`reload()` depois de gravar:** a O.S. e os saldos das peças são buscados de novo, porque a API mudou os dois.

🧪 **Testes**
1. Adicione a mesma peça em duas linhas: erro "peça repetida", nada enviado.
2. Peça em `un` com quantidade 1,5: erro na linha.
3. Peça com quantidade acima do saldo: aviso amarelo. Ao fechar, **409** da API e **nenhuma** peça baixada (confira o kardex).
4. Quantidades válidas: a O.S. fecha, mostra os itens com o custo congelado e a máquina volta a "Disponível".

---

### Passo 15 — Custo de manutenção por máquina

🎯 Tela `/maquinas/:id` com indicadores e a divisão do custo entre preventiva e corretiva.

🧩 `maquina-detalhe.ts`:

```ts
protected readonly resumo = rxResource({
  params: () => this.id(),
  stream: ({ params }) => this.osService.manutencoesDaMaquina(params),
});

// Sempre na mesma ordem e com a mesma cor: a cor identifica o TIPO, não a posição
protected readonly segmentos = computed<SegmentoCusto[]>(() => {
  if (!this.resumo.hasValue()) return [];
  const { custoTotal, custoPorTipo } = this.resumo.value();
  return TIPOS_OS.map(tipo => ({
    tipo,
    valor: custoPorTipo[tipo],
    percentual: custoTotal > 0 ? (custoPorTipo[tipo] / custoTotal) * 100 : 0,
  }));
});
```

Barra empilhada em HTML/CSS puro (sem biblioteca de gráficos):

```html
<div class="barra" role="img" [attr.aria-label]="descricaoBarra()">
  @for (s of segmentos(); track s.tipo) {
    @if (s.valor > 0) {
      <div class="barra__segmento" [attr.data-tipo]="s.tipo" [style.flex-grow]="s.valor"></div>
    }
  }
</div>
```

📚 **Conceitos**
- **Escolher a forma certa:** números isolados viram **indicadores** (stat tiles). "Parte de um todo" vira **barra empilhada**. Não é preciso uma biblioteca de gráficos para isso.
- **`flex-grow` = valor:** cada segmento cresce na proporção do custo.
- **Paleta validada:** as duas cores (azul e laranja) foram testadas para **daltonismo** e **contraste**, nos temas claro e escuro.
- **Acessibilidade:** `role="img"` + `aria-label` descrevem a barra para leitores de tela, e a **legenda com valores** garante que a informação não dependa só da cor.
- **Dados de duas fontes:** a API de manutenções devolve só a tag, e o modelo e o horímetro vêm da lista de máquinas (`computed`).

🧪 **Teste:** feche uma O.S. preventiva e uma corretiva do TR-01 e abra `/maquinas/1`: indicadores, barra proporcional e lista das O.S.

---

### Passo 16.1 — Estilos globais e tons semânticos

🎯 Tirar as regras de estilo **repetidas** dos componentes e dar um significado fixo às cores das etiquetas.

🧩 `core/ui/tons.ts`:

```ts
export type Tom = 'sucesso' | 'info' | 'alerta' | 'neutro' | 'corretiva';

const TOM_STATUS_MAQUINA: Record<StatusMaquina, Tom> = {
  'Disponível': 'sucesso',
  'Em Operação': 'info',
  'Em Manutenção': 'alerta',
};

export function etiquetaStatusMaquina(status: StatusMaquina): string {
  return `etiqueta--${TOM_STATUS_MAQUINA[status]}`;
}
```

`src/estilos/_comuns.scss` (trecho):

```scss
.etiqueta--sucesso {
  background: var(--agro-sucesso-fundo);
  color: var(--agro-sucesso-texto);
}

// Mais específico que a regra de alinhamento das células do Material
.mat-mdc-table .numero,
.numero {
  text-align: right;
}
```

📚 **Conceitos**
- **Estilo global × estilo do componente:** o `.scss` de um componente só vale para ele (**encapsulamento emulado**, com atributos `_ngcontent-xxx`). O que se repete em várias telas vai para um arquivo global.
- **Tom semântico:** a tela diz **o que** o valor significa ("sucesso"), e o CSS decide **qual cor** isso tem. Trocar a cor de "alerta" muda o sistema inteiro num lugar só.
- **Especificidade:** uma regra global `.numero` perdia para a do Material (`.mat-mdc-cell`). A solução foi aumentar a especificidade (`.mat-mdc-table .numero`), sem `!important`.
- **`:where()`:** a regra global dos links usa `a:where(:not(...))`, que tem **especificidade zero** e por isso não atropela os botões do Material.

---

### Passo 16.2 — Diálogo de confirmação reutilizável

🎯 Pedir confirmação antes de uma ação **irreversível** (fechar a O.S.), dizendo **o que vai acontecer**.

🧩 `shared/confirmacao-dialog/confirmacao-dialog.ts`:

```ts
export interface DadosConfirmacao {
  titulo: string;
  mensagem: string;
  detalhes?: string[];     // o que será afetado
  confirmar: string;       // o VERBO da ação, nunca só "OK"
  cancelar?: string;
  irreversivel?: boolean;
}

export class ConfirmacaoDialog {
  protected readonly dados = inject<DadosConfirmacao>(MAT_DIALOG_DATA);
}
```

Template: os botões devolvem a resposta sem nenhum código:

```html
<button mat-button [mat-dialog-close]="false">{{ dados.cancelar ?? 'Cancelar' }}</button>
<button mat-flat-button [mat-dialog-close]="true" cdkFocusInitial>{{ dados.confirmar }}</button>
```

No detalhe da O.S., o `fechar()` virou **perguntar** + **enviar**:

```ts
this.dialog
  .open<ConfirmacaoDialog, DadosConfirmacao, boolean>(ConfirmacaoDialog, { data: dados, width: '480px' })
  .afterClosed()
  .pipe(filter(confirmou => confirmou === true)) // cancelar, Esc ou clique fora: nada acontece
  .subscribe(() => this.enviarFechamento(pecas));
```

📚 **Conceitos**
- **`core/` × `shared/`:** `core` guarda o que existe **uma vez** no app (services, interceptor, tema). `shared` guarda **componentes reutilizáveis** por várias telas. O diálogo não sabe nada de O.S.: recebe textos e devolve `true`/`false`.
- **`[mat-dialog-close]="valor"`:** fecha o diálogo e entrega o valor ao `afterClosed()`. Esc e clique fora devolvem `undefined`, por isso o filtro compara com `=== true`.
- **Confirmação que informa:** "Tem certeza?" não ajuda ninguém a decidir. O diálogo lista as peças que vão sair do estoque, o custo estimado e as consequências; o botão repete o verbo ("Fechar O.S.").
- **Só para o irreversível:** confirmar tudo treina o usuário a clicar sem ler. Saída, retorno e entrada de estoque não pedem confirmação.

🧪 **Testes**
1. Numa O.S. aberta, adicione uma peça e clique em **Fechar O.S.**: o diálogo lista a peça e o custo estimado.
2. **Cancelar**, Esc ou clique fora: nada é enviado (confira a aba Network) e o formulário continua preenchido.
3. **Fechar O.S.** no diálogo: a O.S. fecha como antes.
4. Sem nenhuma linha: o diálogo avisa que a O.S. será fechada sem custo.

---

### Refinamentos R1 a R3 — Identidade visual e tema escuro

🎯 Dar ao sistema a cara do produto: página inicial com a logo, paleta da marca e tema escuro.

🧩 **R1 — Página inicial:** logo, descritivo e o bloco "A frota agora", com dois `rxResource` e contagens em `computed`.

🧩 **R2 — Paleta da marca**, gerada a partir das duas cores da logo:

```bash
ng generate @angular/material:theme-color --primary-color="#0f633e" --tertiary-color="#f38302" --directory=src/estilos
```

`styles.scss`:

```scss
@use '@angular/material' as mat;
@use './estilos/theme-colors' as marca;

html {
  @include mat.theme((
    color: (
      primary: marca.$primary-palette,
      tertiary: marca.$tertiary-palette,
      theme-type: color-scheme,        // cores geradas com light-dark()
    ),
    typography: (brand-family: 'Montserrat, Roboto, sans-serif', plain-family: 'Roboto, sans-serif'),
  ));

  // Ajuste de componente pelo jeito oficial (tokens), sem sobrescrever classes internas
  @include mat.sidenav-overrides((container-shape: 0));

  // Só a metade ESCURA muda: verde-menta e laranja da logo escura
  @include mat.theme-overrides((
    primary: light-dark(#1c6b45, #4cf090),
    tertiary: light-dark(#924c00, #fa9400),
  ));

  color-scheme: light dark;            // 1ª visita: segue o sistema
  &.tema-claro  { color-scheme: light; }
  &.tema-escuro { color-scheme: dark; }
}
```

🧩 **R3 — Tema escuro:** cores próprias com `light-dark()` e um service para a escolha do usuário.

```scss
:root {
  --agro-sucesso-fundo: light-dark(#e3f4e6, #1c3a26);
  --agro-sucesso-texto: light-dark(#1b6b2c, #9fe0b2);
}
```

```ts
@Injectable({ providedIn: 'root' })
export class TemaService {
  readonly preferencia = signal<PreferenciaTema>(this.lerPreferenciaInicial());
  readonly escuroAtivo = computed(() => this.preferencia() === 'escuro');

  constructor() {
    effect(() => {                                   // aplica a classe sempre que a escolha mudar
      const html = this.documento.documentElement;
      html.classList.remove('tema-claro', 'tema-escuro');
      html.classList.add(`tema-${this.preferencia()}`);
    });
  }

  escolher(preferencia: PreferenciaTema): void {
    this.preferencia.set(preferencia);
    try { localStorage.setItem(CHAVE, preferencia); } catch { /* navegação privada */ }
  }
}
```

No `index.html`, um script de poucas linhas aplica o tema salvo **antes** do Angular carregar.

📚 **Conceitos**
- **Paleta gerada, não escolhida à mão:** o Material 3 deriva **dezenas de tons** (fundos, bordas, textos, estados) de duas cores.
- **`color-scheme` + `light-dark()`:** cada cor já carrega as duas versões, e **uma propriedade CSS** escolhe qual vale. Trocar o tema é trocar **uma classe** no `<html>`.
- **Tokens de sistema (`--mat-sys-*`):** as telas usam `var(--mat-sys-primary)`, `var(--mat-sys-surface-container)`..., nunca cores fixas. Por isso o tema escuro funcionou **sem mexer nas telas**.
- **`effect()`:** executa um efeito colateral (mexer no DOM) sempre que os signals que ele lê mudam.
- **`localStorage` com `try/catch`:** em navegação privada o acesso pode falhar, e o sistema precisa continuar funcionando.
- **Evitar o "piscar":** sem o script do `index.html`, a página abriria clara e trocaria para escura só depois do Angular carregar.
- **Box model:** a área de conteúdo tinha `height: 100%` **mais** `padding`, e o fim da página ficava escondido. `box-sizing: border-box` faz o padding ficar **dentro** da altura.
- **Imagens:** as logos são **WebP** com fundo transparente (bem menores que PNG), com `width`/`height` no `<img>` para a página não "pular" enquanto carregam.

🧪 **Testes:** use o botão de tema na barra (Claro/Escuro). A logo troca, as etiquetas e o gráfico continuam legíveis, e a escolha permanece depois do F5.

---

### Refinamento R4 — Conferência visual e correções

🎯 Percorrer **todas** as telas e diálogos nos dois temas, com dados reais, e corrigir o que aparecer.

A conferência cobriu 18 cenários (listas, diálogos abertos, erros de validação, snackbars, kardex inexistente, O.S. aberta e fechada) × 2 temas. As cores passaram; os defeitos foram de **formatação** e **layout**:

| Defeito | Correção |
|---|---|
| "horímetro atual: 1012.5 h" e "11.5 h" nos diálogos | Pipe `number: '1.0-1'` no template; `toLocaleString('pt-BR')` nos textos montados no TypeScript (snackbars) |
| Mensagem de erro cortada no estoque mínimo e invadindo a linha de baixo no fechamento da O.S. | `subscriptSizing="dynamic"` no `mat-form-field` |
| Kardex de peça inexistente com o aviso **duas vezes** (tela + snackbar) | `HttpContextToken` que marca a requisição como "erro tratado na tela" |

🧩 `core/api.ts` + interceptor + service:

```ts
export const ERRO_TRATADO_NA_TELA = new HttpContextToken<boolean>(() => false);

export function erroTratadoNaTela(): HttpContext {
  return new HttpContext().set(ERRO_TRATADO_NA_TELA, true);
}

// interceptor
if (!req.context.get(ERRO_TRATADO_NA_TELA)) {
  snackBar.open(mensagemDeErro(erro), 'Fechar', { ... });
}

// PecaService
buscar(id: number): Observable<Peca> {
  return this.http.get<Peca>(`${this.url}/${id}`, { context: erroTratadoNaTela() });
}
```

📚 **Conceitos**
- **Todo número exibido passa por formatação:** o pipe cuida do template, mas texto montado em TypeScript (`` `${horas} h` ``) usa o formato do JavaScript (ponto decimal). Revise os dois lugares.
- **`subscriptSizing`:** por padrão, o `mat-form-field` reserva **uma linha fixa** para dica/erro (para o layout não "pular"). Mensagens longas precisam de `dynamic`, ou de um texto mais curto.
- **`HttpContext`:** metadados que viajam **junto com a requisição**, sem ir para o servidor. É o jeito oficial de uma chamada pedir um comportamento diferente a um interceptor (pular o aviso, pular o token de login, marcar para cache...).
- **Regra geral com exceção explícita:** o aviso global continua valendo para todo o sistema; só as chamadas que a tela explica sozinha são marcadas.
- **Conferir com dados reais:** a maioria desses defeitos só aparece com números decimais, erros de validação e registros inexistentes. Uma tela "vazia" parece sempre perfeita.

🧪 **Testes**
1. Dê saída no TR-01 (horímetro 1.000) e retorno com 1012,5: o diálogo e o snackbar mostram vírgula.
2. Nova peça em `un` com mínimo 2,5: a mensagem aparece inteira, em duas linhas.
3. Na O.S. aberta, adicione duas linhas vazias e clique em **Fechar O.S.**: as mensagens não se sobrepõem.
4. Acesse `/estoque/99`: só o aviso da tela, sem snackbar. Acesse `/ordens-servico/99`: o snackbar continua aparecendo (lá a tela mostra um texto genérico e o snackbar traz o motivo da API).

---

## 6. Roteiro de testes no navegador

Roteiro completo para uma demonstração, com a API recém-iniciada. Siga na ordem.

| # | Onde | Ação | Resultado esperado |
|---|---|---|---|
| 1 | Início | Abrir `http://localhost:4200` | Logo, "2 de 2 máquinas disponíveis", "1 peça para repor" |
| 2 | Máquinas | **Nova máquina** `PU-03`, Pulverizador, 0 h | Snackbar de sucesso, 3 máquinas na lista |
| 3 | Máquinas | **Nova máquina** `PU-03` de novo | Snackbar vermelho com o 409 da API, diálogo continua aberto |
| 4 | Máquinas | **Saída** do TR-01 sem preencher | Campos em vermelho, nenhuma requisição na aba Network |
| 5 | Máquinas | **Saída** do TR-01 com operador e frente | TR-01 "Em Operação", botão vira **Retorno** |
| 6 | Máquinas | **Retorno** do TR-01 com horímetro menor | Erro no campo |
| 7 | Máquinas | **Retorno** com 1010 e uma avaria | "10 h trabalhadas", TR-01 "Disponível" |
| 8 | Movimentações | Filtrar por TR-01 | Uma linha, com datas em pt-BR e a avaria |
| 9 | Estoque | Ligar **Só reposição** | Só a COR-001, com a coluna "Falta" |
| 10 | Estoque | **Nova peça** em `un` com mínimo 2,5 | Erro "inteiro"; trocando para `L`, o erro some |
| 11 | Estoque | **Entrada** de 10 un na COR-001 | Prévia do saldo, mensagem "Custo: de → para" |
| 12 | Estoque | Clicar no código da COR-001 | Kardex com implantação e entrada |
| 13 | Máquinas | **Saída** do CO-02 e depois **O.S.** nele | Aviso "máquina em campo"; snackbar com as horas trabalhadas |
| 14 | Ordens de Serviço | Filtrar por status "Aberta"; copiar a URL numa aba nova | O filtro vem aplicado pela URL |
| 15 | O.S. aberta | Adicionar a mesma peça em duas linhas | Erro "peça repetida" |
| 16 | O.S. aberta | Quantidade acima do saldo e **Fechar** | Aviso amarelo; 409 da API; kardex sem baixa |
| 17 | O.S. aberta | Quantidades válidas e **Fechar** | O.S. fechada, itens com custo, total no rodapé |
| 18 | Estoque → kardex | Abrir a peça usada | Linha de **saída** com link para a O.S. |
| 19 | Máquinas → tag CO-02 | Abrir o detalhe | Indicadores e barra preventiva × corretiva |
| 20 | Barra superior | Trocar para o tema escuro e dar F5 | Continua escuro, sem piscar em claro |
| 21 | Qualquer tela | Parar a API e clicar em **Atualizar** | Snackbar "Não foi possível conectar à API" |

---

## 7. Referência rápida

### Qual ferramenta de estado usar

| Situação | Use | Exemplo |
|---|---|---|
| Valor que a tela altera (filtro, "salvando") | `signal()` | `somenteReposicao`, `salvando` |
| Valor calculado a partir de outros | `computed()` | `valorEmEstoque`, `horasPrevistas` |
| Dado da API que depende de parâmetros | `rxResource({ params, stream })` | lista de O.S. filtrada, detalhe pelo `:id` |
| Dado da API carregado uma vez | `rxResource({ stream })` | máquinas do select |
| Mudanças de um campo de formulário como signal | `toSignal(control.valueChanges)` | prévia da entrada |
| Efeito fora da tela (DOM, armazenamento) | `effect()` | classe do tema no `<html>` |
| Parâmetro de rota ou query param | `input()` + `withComponentInputBinding()` | `id`, `status`, `maquinaId` |

### Anatomia de um diálogo de formulário

Todos os diálogos seguem o mesmo esqueleto. **Use-o como molde:**

```ts
export class MeuDialog {
  private readonly service = inject(MeuService);
  private readonly dialogRef = inject<MatDialogRef<MeuDialog, Resposta>>(MatDialogRef);
  protected readonly dados = inject<Entrada>(MAT_DIALOG_DATA);          // 1. o que chegou

  protected readonly form = inject(FormBuilder).nonNullable.group({     // 2. campos + regras
    campo: ['', [Validators.required, Validators.pattern(NAO_VAZIO)]],
  });

  protected readonly salvando = signal(false);

  protected confirmar(): void {
    if (this.form.invalid) {                                            // 3. inválido: mostra e para
      this.form.markAllAsTouched();
      return;
    }
    this.salvando.set(true);                                            // 4. trava o botão
    this.service.gravar(this.form.getRawValue())
      .pipe(finalize(() => this.salvando.set(false)))                   // 5. destrava sempre
      .subscribe({
        next: resposta => this.dialogRef.close(resposta),               // 6. sucesso: devolve
        error: () => {},                                                //    erro: interceptor já avisou
      });
  }
}
```

E quem abre:

```ts
this.dialog.open<MeuDialog, Entrada, Resposta>(MeuDialog, { data })
  .afterClosed()
  .subscribe(resposta => {
    if (resposta) { /* snackbar de sucesso + recarregar */ }
  });
```

### Validadores usados

| Validador | Nível | Onde |
|---|---|---|
| `Validators.required` | campo | todos os formulários |
| `Validators.pattern(NAO_VAZIO)` | campo | textos obrigatórios (sem só espaços) |
| `Validators.min(x)` | campo | horímetro ≥ atual, quantidades > 0 |
| `inteiro()` (customizado) | campo | peças em `un` |
| `quantidadeCompativelComUnidade` | linha (`FormGroup`) | fechamento de O.S. |
| `pecasSemRepeticao` | lista (`FormArray`) | fechamento de O.S. |

### Tons das etiquetas

| Valor | Tom |
|---|---|
| Máquina `Disponível` / O.S. `Fechada` / entrada no kardex | sucesso (verde) |
| Máquina `Em Operação` / O.S. `Preventiva` | info (azul) |
| Máquina `Em Manutenção` / O.S. `Aberta` / saída no kardex | alerta (laranja) |
| O.S. `Corretiva` | corretiva (laranja-avermelhado) |
| Implantação no kardex | neutro (cinza) |

---

## 8. Como criar um projeto semelhante

### Passo 1 — Projeto e dependências

```bash
npm i -g @angular/cli@latest
ng new meu-frontend --style=scss --ssr=false
cd meu-frontend
ng add @angular/material
```

### Passo 2 — Ponte com a API

1. Crie o `proxy.conf.json` (seção [Passo 2](#passo-2--ponte-com-a-api-proxy-httpclient-e-service)) e aponte `serve.options.proxyConfig` no `angular.json`.
2. Em `app.config.ts`: `provideHttpClient(withInterceptors([...]))`, `provideRouter(routes, withComponentInputBinding())`, `LOCALE_ID` e `registerLocaleData`.
3. Copie os **tipos do back-end** para `core/models/`.

### Passo 3 — Uma tela por vez

```bash
ng generate service core/services/produto
ng generate component features/produtos/produtos-lista
ng generate component features/produtos/novo-produto-dialog
```

O padrão deste projeto (**lista com estados + diálogos que devolvem a resposta + detalhe por `:id`**) se aplica a quase todo sistema de gestão:

| Neste projeto | Loja | Clínica | Oficina |
|---|---|---|---|
| Lista de máquinas | Produtos | Pacientes | Veículos |
| Diálogo de saída/retorno | Venda/devolução | Check-in/alta | Entrada/entrega |
| Kardex da peça | Movimento do produto | Histórico do paciente | Histórico do veículo |
| Fechamento da O.S. com peças | Pedido com itens | Atendimento com procedimentos | Serviço com peças |
| Custo por máquina | Faturamento por produto | Custo por paciente | Custo por veículo |

### Checklist para o seu projeto

- [ ] **Models** copiados do back-end (o contrato)
- [ ] **Um service por recurso**, uma função por rota
- [ ] **Interceptor** de erros lendo o formato de erro da sua API
- [ ] Cada lista com os **quatro estados**: carregando, erro, vazio e com dados
- [ ] Formulários **reativos** com as mesmas regras da API (e a API continua validando)
- [ ] Botões de ação **travados** enquanto a requisição está em andamento
- [ ] **Filtros na URL** quando fizer sentido compartilhar o link
- [ ] Rotas com **lazy loading** e `title`
- [ ] Cores por **significado** (tons semânticos) e pelos **tokens** do tema, nunca fixas nas telas
- [ ] `ng build` **sem erros nem avisos** antes de cada entrega

---

## 9. Problemas comuns

| Sintoma | Causa | Solução |
|---|---|---|
| A tela mostra "Não foi possível conectar à API" | O back-end está parado | `cd agro-backend && npm run dev` |
| A chamada `/api/...` devolve **HTML** em vez de JSON | O `ng serve` foi iniciado **antes** de configurar o proxy | Pare o `ng serve` (Ctrl+C) e rode de novo: o proxy só é lido na partida |
| `ng` mostra versão 17 ou erro com o Node 24 | CLI global antigo | `npm i -g @angular/cli@latest` ou use `npx ng ...` |
| Erro `NG8113`/`NG8116` "is not used within the template" / "unknown element" | Componente ou módulo faltando (ou sobrando) no `imports` do componente | Em componentes standalone, **cada um** importa o que usa |
| `TS7053: Element implicitly has an 'any' type` no template | Indexar um `Record` com a variável do `*matCellDef` (que é `any`) | Crie um método ou função com parâmetro tipado (ex.: `etiquetaStatus(maquina.status)`) |
| Um estilo global não "pega" numa célula da tabela | A regra do Material é mais específica | Aumente a especificidade (`.mat-mdc-table .numero`), sem `!important` |
| `withFetch()` aparece riscado no editor | Está obsoleto: o `HttpClient` já usa `fetch` por padrão | Remova o `withFetch()` |
| Código colado no `.spec.ts` em vez do `.ts` | Os dois arquivos têm nomes parecidos | Confira o nome da aba no editor antes de colar |
| Item repetido no menu | Linhas de contexto de um trecho foram coladas junto | Cole só as linhas novas; revise com `git diff` antes do commit |
| Aviso de *budget* no `ng build` | O pacote inicial passou do limite do `angular.json` | Veja o que entrou no pacote inicial (componentes do Material na casca pesam) |
| Você salva o arquivo e a tela não muda (nem com F5) | O `ng serve` parou de observar os arquivos (acontece depois de trocar de branch ou de muitas alterações de uma vez) | Pare o `ng serve` (Ctrl+C) e rode `npm start` de novo |
| Os dados da demonstração sumiram | A API reiniciou (dados em memória) | Comportamento esperado; refaça o roteiro |
| O `localhost:4200` abre, mas sem estilo nem ícones | Sem internet: as fontes vêm do Google Fonts | Conecte-se, ou baixe as fontes para `public/` |

---

## 10. Limitações e próximos passos

### Limitações atuais (decisões do MVP)

- **Sem login:** qualquer pessoa com acesso à URL usa tudo (mesma decisão do back-end).
- **Dados em memória:** herdado da API; reiniciar o back-end zera tudo.
- **Menu lateral fixo:** em telas de celular ele ocupa espaço demais (Passo 16.3, responsividade, não implementado).
- **Testes unitários:** os `.spec.ts` são os gerados pelo CLI e ainda não foram adaptados. Hoje o `npm test` mostra **7 passando e 14 falhando**: as telas dependem de `HttpClient`, `ActivatedRoute` e `MAT_DIALOG_DATA`, e os testes gerados não fornecem esses providers (erro `NG0201: No provider found`). Adaptá-los é um ótimo exercício.
- **Proxy só no desenvolvimento:** em produção, o front e a API precisam ser servidos na mesma origem (ou a API precisa liberar CORS).

### Próximos passos

**Etapa 2, front-end: ✅ concluída** (Fases 0 a 3, polimento de estilos e identidade visual).

1. **Responsividade:** `BreakpointObserver` para o menu virar sobreposto (`mode="over"`) no celular.
2. **Testes unitários** de um service (`HttpTestingController`) e de um componente.

**Futuro:** login e perfis, banco de dados (PostgreSQL + Prisma) no back-end e publicação (build + servidor web).

---

Contexto de negócio e decisões do projeto: [context.md](../context.md) · Acompanhamento dos passos: [CHECKLIST.md](../CHECKLIST.md)
