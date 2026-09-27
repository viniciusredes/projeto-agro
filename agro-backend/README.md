# Agro Backend — Gestão de Frota Agrícola (MVP)

> **Material de apoio do treinamento.** Este README explica **como executar** o projeto, **como ele foi construído**, passo a passo, e **quais conceitos** cada funcionalidade ensina. Use-o também como modelo para construir APIs parecidas em outros domínios.
>
> 📖 Encontrou um termo desconhecido? Consulte o [glossário](docs/glossario.md). Para praticar, veja os [exercícios](docs/exercicios.md).

API REST para a gestão de frota agrícola, com três módulos prontos:

- **Módulo de Uso:** saída de máquinas para o campo, retorno com horímetro, registro de avarias e histórico de movimentações.
- **Módulo de Estoque (almoxarifado):** cadastro de peças, entradas (compras) com custo da última compra, histórico de movimentos (kardex) e alerta de estoque mínimo.
- **Módulo de Manutenção (Ordens de Serviço):** abertura de O.S. preventiva ou corretiva, fechamento com baixa automática das peças no estoque, custo congelado e custo de manutenção por máquina.

Os dados ficam **em memória**, sem banco de dados, para que o foco fique nas **regras de negócio** e nos **contratos da API**. O front-end (Angular) e o banco de dados (PostgreSQL + Prisma) vêm em etapas futuras.

---

## Sumário

1. [Pré-requisitos](#1-pré-requisitos)
2. [Como executar](#2-como-executar)
3. [Visão geral da API](#3-visão-geral-da-api)
4. [Modelo de dados](#4-modelo-de-dados)
5. [Construção passo a passo (funcionalidades e conceitos)](#5-construção-passo-a-passo)
6. [Roteiro completo de testes com curl](#6-roteiro-completo-de-testes-com-curl)
7. [Referência rápida](#7-referência-rápida)
8. [Como criar um projeto semelhante](#8-como-criar-um-projeto-semelhante)
9. [Problemas comuns](#9-problemas-comuns)
10. [Limitações e próximos passos](#10-limitações-e-próximos-passos)

---

## 1. Pré-requisitos

| Ferramenta | Para quê |
|---|---|
| [Node.js](https://nodejs.org) 24+ | Executar o JavaScript/TypeScript no servidor |
| VS Code | Editor (mostra os erros de tipo enquanto você digita) |
| Git Bash | Terminal usado nos exemplos deste README |
| `curl` | Fazer requisições HTTP pelo terminal (já vem no Windows 10+ como `curl.exe`) |

> Todos os exemplos usam **`curl.exe` no Git Bash**. Se usar o PowerShell, veja [Problemas comuns](#9-problemas-comuns).

---

## 2. Como executar

```bash
cd agro-backend
npm install      # instala as dependências (só na primeira vez)
npm run dev      # sobe o servidor em http://localhost:3000
```

Teste se está no ar:

```bash
curl.exe http://localhost:3000/maquinas
```

Outros comandos úteis:

```bash
npx tsc --noEmit   # verifica erros de tipo sem executar
```

> ⚠️ **Os dados zeram a cada reinício.** Como tudo fica em memória, ao salvar o arquivo (o servidor reinicia sozinho) as máquinas e as peças voltam ao estado inicial, os históricos são recriados e as ordens de serviço são apagadas.

### Estrutura

```
agro-backend/
├── server.ts        # toda a API: tipos, dados em memória, rotas e tratadores de erro
├── context.md       # contexto de negócio e decisões do projeto
├── README.md        # este material
├── testes.http      # roteiro de testes para a extensão REST Client do VS Code
├── testes.sh        # roteiro de testes automatizado (mostra ✅/❌ em cada cenário)
├── docs/
│   ├── exercicios.md  # 8 exercícios práticos, do básico ao desafio
│   ├── gabarito.md    # soluções comentadas (consulte só depois de tentar!)
│   └── glossario.md   # termos do negócio e técnicos, com exemplos
├── package.json     # dependências e scripts
└── tsconfig.json    # configuração do TypeScript
```

Tudo fica num único `server.ts` de propósito, para facilitar o aprendizado. A separação em camadas (controllers, services, repositories) é um passo futuro.

---

## 3. Visão geral da API

### Módulo de Uso

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/maquinas` | Lista as máquinas |
| `POST` | `/maquinas/:id/saida` | Registra a saída da máquina para o campo |
| `POST` | `/maquinas/:id/retorno` | Registra o retorno, o horímetro e as avarias |
| `GET` | `/movimentacoes` | Lista o histórico (filtro opcional `?maquinaId=`) |

### Módulo de Estoque

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/pecas` | Lista as peças (filtro opcional `?abaixoDoMinimo=true`) |
| `GET` | `/pecas/:id` | Busca uma peça |
| `POST` | `/pecas` | Cadastra uma peça (nasce com saldo zero) |
| `POST` | `/pecas/:id/entradas` | Registra uma compra: soma ao saldo e atualiza o custo |
| `GET` | `/pecas/:id/movimentos` | Histórico de movimentos da peça (kardex) |

### Módulo de Manutenção

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/ordens-servico` | Lista as O.S. (filtros opcionais `?maquinaId=` e `?status=`) |
| `GET` | `/ordens-servico/:id` | Detalhe da O.S., com os dados da máquina |
| `POST` | `/ordens-servico` | Abre uma O.S. (a máquina vai para `Em Manutenção`) |
| `POST` | `/ordens-servico/:id/fechamento` | Fecha a O.S., com baixa automática das peças |
| `GET` | `/maquinas/:id/manutencoes` | Histórico e custo de manutenção de uma máquina |

Toda resposta de erro segue o formato:

```json
{ "erro": "mensagem descritiva" }
```

---

## 4. Modelo de dados

### Máquina

```ts
type StatusMaquina = 'Disponível' | 'Em Operação' | 'Em Manutenção';

interface Maquina {
  id: number;
  tag: string;          // identificação no pátio, ex.: 'TR-01'
  modelo: string;       // ex.: 'Trator'
  horimetro: number;    // horas acumuladas no relógio da máquina
  status: StatusMaquina;
}
```

Dados iniciais:

| id | tag | modelo | horímetro | status |
|---|---|---|---|---|
| 1 | TR-01 | Trator | 1000 | Disponível |
| 2 | CO-02 | Colheitadeira | 500 | Disponível |

### Movimentação

Cada movimentação representa **uma ida ao campo e o retorno**. Ela nasce "aberta" na saída e é "fechada" no retorno.

```ts
interface Movimentacao {
  id: number;
  maquinaId: number;          // referência a Maquina.id
  operador: string;
  frenteTrabalho: string;
  horimetroSaida: number;
  dataSaida: string;          // ISO 8601 (UTC)
  horimetroRetorno?: number;  // preenchido no retorno
  dataRetorno?: string;       // preenchido no retorno
  horasTrabalhadas?: number;  // horimetroRetorno - horimetroSaida
  avarias?: string;           // opcional, informado no retorno
}
```

### Ciclo de vida da máquina

```
             POST /saida                        POST /retorno
Disponível ──────────────► Em Operação ───────────────────► Disponível
     │     (abre movimentação)     │        (fecha movimentação)
     │                             │
     │ POST /ordens-servico        │ POST /ordens-servico
     │                             │ (fecha a movimentação automaticamente)
     ▼                             ▼
            Em Manutenção  ──── POST /ordens-servico/:id/fechamento ────►  Disponível
```

### Peça

```ts
type UnidadeMedida = 'un' | 'L';

interface Peca {
  id: number;
  codigo: string;          // código interno do almoxarifado, ex.: 'FLT-001'
  descricao: string;
  unidade: UnidadeMedida;  // 'un' (unidade) ou 'L' (litro)
  saldo: number;           // quantidade disponível, na unidade acima
  custoUnitario: number;   // em reais (R$), valor da última compra
  estoqueMinimo: number;   // abaixo deste saldo, a peça precisa ser reposta
}
```

Dados iniciais:

| id | código | descrição | unidade | saldo | custo (R$) | mínimo |
|---|---|---|---|---|---|---|
| 1 | FLT-001 | Filtro de óleo do motor | un | 10 | 85,90 | 5 |
| 2 | OLE-001 | Óleo hidráulico | L | 200 | 18,50 | 50 |
| 3 | COR-001 | Correia do alternador | un | 4 | 120,00 | 5 |

> A correia já começa **abaixo do mínimo**, de propósito, para demonstrar o alerta de reposição.

### Movimento de estoque (kardex)

Cada linha registra uma mudança no saldo de uma peça. **O saldo atual de qualquer peça é sempre explicado pelo seu histórico.**

```ts
type TipoMovimentoEstoque = 'implantacao' | 'entrada' | 'saida';

interface MovimentoEstoque {
  id: number;
  pecaId: number;          // referência a Peca.id
  tipo: TipoMovimentoEstoque;
  quantidade: number;      // sempre positiva; o tipo diz se soma ou subtrai
  custoUnitario: number;   // custo NESTE movimento (fica congelado)
  valorTotal: number;      // quantidade x custoUnitario
  saldoApos: number;       // saldo da peça logo depois deste movimento
  data: string;
  ordemServicoId?: number; // só nas saídas: a O.S. que consumiu a peça
}
```

| Tipo | Quando acontece | Efeito no saldo |
|---|---|---|
| `implantacao` | Na inicialização: saldo que já estava na prateleira | define o saldo inicial |
| `entrada` | Compra de peças (`POST /pecas/:id/entradas`) | soma |
| `saida` | Baixa no fechamento de uma Ordem de Serviço | subtrai |

### Ordem de Serviço

A O.S. é um **documento**: um cabeçalho (dados gerais) e uma lista de itens (as peças usadas).

```ts
type TipoOS = 'Preventiva' | 'Corretiva';
type StatusOS = 'Aberta' | 'Fechada';

interface ItemOS {
  pecaId: number;          // referência a Peca.id
  codigo: string;          // cópia do código da peça, para leitura rápida
  quantidade: number;
  custoUnitario: number;   // custo da peça NO MOMENTO da baixa (congelado)
  valorTotal: number;      // quantidade x custoUnitario
}

interface OrdemServico {
  id: number;
  maquinaId: number;       // referência a Maquina.id
  tipo: TipoOS;
  status: StatusOS;
  descricao: string;       // problema encontrado ou serviço a fazer
  horimetroParada: number; // horímetro da máquina quando parou
  dataAbertura: string;
  dataFechamento?: string;
  itens: ItemOS[];         // peças usadas (vazia até o fechamento)
  custoTotal: number;      // soma dos valorTotal dos itens
}
```

Ciclo de vida da O.S.: `Aberta ──(fechamento)──► Fechada`, sem volta.

### Como os módulos se ligam

```
Maquina ◄── maquinaId ── Movimentacao           (uso: saída e retorno)
   ▲
   └──── maquinaId ── OrdemServico ── itens[] ── pecaId ──► Peca
                           ▲                                 ▲
                           └── ordemServicoId ── MovimentoEstoque (saída no kardex)
```

---

## 5. Construção passo a passo

O projeto foi construído em **partes pequenas**. Cada parte traz: 🎯 o **objetivo**, 🧩 o **código**, 📚 os **conceitos** e 🧪 os **testes**.

| Módulo | Partes |
|---|---|
| **Uso** (máquinas) | [Ponto de partida](#ponto-de-partida), [Parte 0](#parte-0--script-de-desenvolvimento) a [Parte 6](#parte-6--avarias-no-retorno-campo-opcional) |
| **Estoque** (peças) | [Parte E1](#parte-e1--modelo-de-peça-e-listagem) a [Parte E6](#parte-e6--estoque-mínimo-e-alerta-de-reposição) |
| **Manutenção** (O.S.) | [Parte OS1](#parte-os1--modelo-da-ordem-de-serviço-e-listagem) a [Parte OS7](#parte-os7--detalhe-da-os-e-custo-por-máquina) |

> **Dica para os alunos:** reproduzam as partes na ordem, testando cada uma antes de seguir. É assim que se constrói software de forma segura: um passo pequeno e verificado de cada vez.

### Ponto de partida

O projeto começou com três rotas sem nenhuma validação:

```ts
import express from 'express';

const app = express();
app.use(express.json());

let maquinas = [
  { id: 1, tag: 'TR-01', modelo: 'Trator', horimetro: 1000, status: 'Disponível' },
  { id: 2, tag: 'CO-02', modelo: 'Colheitadeira', horimetro: 500, status: 'Disponível' }
];

app.get('/maquinas', (req, res) => {
  res.json(maquinas);
});

app.post('/maquinas/:id/saida', (req, res) => { /* só mudava o status */ });
app.post('/maquinas/:id/retorno', (req, res) => { /* aceitava qualquer horímetro */ });

app.listen(3000, () => console.log('Servidor no ar!'));
```

📚 **Conceitos da base**
- **Express:** framework que recebe requisições HTTP e decide qual função executar, conforme o **método** (`GET`, `POST`...) e a **rota** (`/maquinas`).
- **`app.use(express.json())`:** lê o corpo das requisições em JSON e o coloca em `req.body`.
- **`req` e `res`:** `req` é o que chegou (parâmetros, corpo, query), e `res` é o que vamos responder.
- **Parâmetro de rota (`/:id`):** a parte variável da URL, lida com `req.params.id` (sempre como texto, por isso o `parseInt`).
- **REST:** recursos (`maquinas`) identificados por URL, e ações indicadas pelo método HTTP.

---

### Parte 0 — Script de desenvolvimento

🎯 Subir o servidor com um comando curto e com reinício automático.

🧩 `package.json`:

```json
"scripts": {
  "dev": "tsx watch server.ts"
}
```

📚 **Conceitos**
- **Scripts npm:** atalhos para comandos do projeto. Quem chega no projeto só precisa saber `npm run dev`.
- **Modo watch:** o `tsx` observa os arquivos e reinicia o servidor ao salvar.
- **Por que `tsx` e não `ts-node`:** o `ts-node` teve incompatibilidades com o Node 24. O `tsx` é mais moderno e não precisa de configuração.
- **Consequência importante:** cada reinício **apaga os dados em memória**. Isso mostra, na prática, por que um banco de dados é necessário.

🧪 **Testes**

```bash
npm run dev
curl.exe http://localhost:3000/maquinas
```

Altere o texto do `console.log` no `app.listen`, salve e veja o servidor reiniciar sozinho.

---

### Parte 1 — Tipos com TypeScript

🎯 Descrever o formato dos dados e impedir erros de digitação.

🧩

```ts
type StatusMaquina = 'Disponível' | 'Em Operação' | 'Em Manutenção';

interface Maquina {
  id: number;
  tag: string;
  modelo: string;
  horimetro: number;
  status: StatusMaquina;
}

let maquinas: Maquina[] = [ /* ... */ ];
```

📚 **Conceitos**
- **`type` com união (`|`):** cria uma lista fechada de valores permitidos.
- **`interface`:** um contrato que diz quais campos o objeto tem e de que tipo.
- **`Maquina[]`:** um array de objetos no formato `Maquina`.
- **Sem os tipos**, `maquina.status = 'Disponivel'` (sem acento) passaria sem aviso e causaria um bug difícil de achar. **Com os tipos**, o editor aponta o erro na hora.
- **Limite do TypeScript:** ele só verifica o código **antes de rodar**. O que chega pela rede (`req.body`) não é verificado, por isso precisamos das validações das próximas partes.

🧪 **Testes**
1. `curl.exe http://localhost:3000/maquinas` continua funcionando igual.
2. **Exercício:** troque `'Em Operação'` por `'Em Operacao'` numa rota e rode `npx tsc --noEmit`. Veja o erro e depois desfaça.
3. **Exercício:** remova o campo `modelo` de uma máquina da lista e observe o aviso do editor.

---

### Parte 2 — Saída só com a máquina disponível

🎯 Impedir que uma máquina já em campo "saia de novo".

🧩 Rota `POST /maquinas/:id/saida`:

```ts
const maquina = maquinas.find(m => m.id === id);

// Validação 1: a máquina existe?
if (!maquina) {
  return res.status(404).json({ erro: 'Máquina não encontrada' });
}

// Validação 2: a máquina está livre para sair?
if (maquina.status !== 'Disponível') {
  return res.status(409).json({
    erro: `Máquina ${maquina.tag} não pode sair: status atual é '${maquina.status}'`
  });
}
```

📚 **Conceitos**
- **Códigos de status HTTP:** cada situação tem o seu.
  - **404 Not Found:** o recurso não existe.
  - **409 Conflict:** o recurso existe, mas o **estado atual** impede a ação.
- **Retorno antecipado (guard clause):** testa cada problema e sai da função com `return`. O "caminho feliz" fica no final, sem `if/else` aninhados.
- **O `return` é obrigatório:** sem ele, o código continua e tenta responder duas vezes, o que gera o erro `Cannot set headers after they are sent`.
- **Template string:** `` `Máquina ${maquina.tag}` `` coloca valores dentro do texto.
- **`Array.find`:** devolve o primeiro item que atende à condição, ou `undefined`.

🧪 **Testes**

```bash
# Primeira saída -> 200
curl.exe -i -X POST http://localhost:3000/maquinas/1/saida -H "Content-Type: application/json" -d '{"operador":"Joao","frenteTrabalho":"Talhao 5"}'

# Mesma máquina de novo -> 409
curl.exe -i -X POST http://localhost:3000/maquinas/1/saida -H "Content-Type: application/json" -d '{"operador":"Joao","frenteTrabalho":"Talhao 5"}'

# Máquina inexistente -> 404
curl.exe -i -X POST http://localhost:3000/maquinas/99/saida -H "Content-Type: application/json" -d '{"operador":"Joao","frenteTrabalho":"Talhao 5"}'
```

> O `-i` mostra o código HTTP e os cabeçalhos da resposta.

---

### Parte 3 — Dados obrigatórios na saída

🎯 Exigir quem está levando a máquina (`operador`) e para onde (`frenteTrabalho`).

🧩

```ts
// Validação 3: os dados obrigatórios vieram no corpo da requisição?
const { operador, frenteTrabalho } = req.body ?? {};

if (typeof operador !== 'string' || operador.trim() === '') {
  return res.status(400).json({ erro: "Campo 'operador' é obrigatório" });
}
if (typeof frenteTrabalho !== 'string' || frenteTrabalho.trim() === '') {
  return res.status(400).json({ erro: "Campo 'frenteTrabalho' é obrigatório" });
}
```

📚 **Conceitos**
- **400 Bad Request:** o cliente mandou dados inválidos ou incompletos.
  - Diferença para o 409: no 400 o **pedido** está errado; no 409 o pedido está certo, mas o **estado** não permite.
- **Validação manual:** conferir cada campo com `if` (decisão deste projeto, sem bibliotecas como Zod ou Joi).
- **Desestruturação:** `const { a, b } = objeto` extrai vários campos de uma vez.
- **`?? {}` (coalescência nula):** no Express 5, `req.body` é `undefined` quando não há corpo JSON. Desestruturar `undefined` quebraria o servidor (500). O `??` usa `{}` no lugar.
- **`typeof` + `trim()`:** garante que o valor é texto e que não é só espaços (`"   "`).
- **Ordem das validações:** existe (404) → estado (409) → dados (400).

🧪 **Testes** (use a máquina 2, que está disponível)

```bash
# Sem corpo -> 400 (operador obrigatório)
curl.exe -i -X POST http://localhost:3000/maquinas/2/saida

# Operador só com espaços -> 400
curl.exe -i -X POST http://localhost:3000/maquinas/2/saida -H "Content-Type: application/json" -d '{"operador":"   ","frenteTrabalho":"Talhao 8"}'

# Sem frenteTrabalho -> 400
curl.exe -i -X POST http://localhost:3000/maquinas/2/saida -H "Content-Type: application/json" -d '{"operador":"Maria"}'
```

**Exercício:** apague o `?? {}`, chame a rota sem corpo e observe o erro 500 no terminal do servidor. Depois restaure.

---

### Parte 3.1 — Tratador de erros (segurança)

🎯 Nunca devolver páginas HTML com detalhes internos. Antes desta parte, um JSON mal formado retornava o **stack trace** do servidor, com caminhos de pastas e bibliotecas.

🧩 No fim do arquivo, **depois de todas as rotas**:

```ts
import express, { Request, Response, NextFunction } from 'express';

// ...

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  // JSON mal formado no corpo da requisição (erro lançado pelo express.json())
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição' });
  }

  // Qualquer outro erro: detalhe só no console, mensagem genérica para o cliente
  console.error(err);
  res.status(500).json({ erro: 'Erro interno no servidor' });
});
```

📚 **Conceitos**
- **Middleware:** uma função por onde a requisição passa antes ou depois das rotas. O `express.json()` também é um middleware.
- **Middleware de erro:** o Express o reconhece pelos **4 parâmetros** `(err, req, res, next)`. Mesmo sem usar o `next`, ele precisa estar lá.
- **Segurança por não expor detalhes:** o stack trace revela a estrutura do servidor para um atacante. O cliente recebe uma mensagem genérica, e o detalhe fica só no log.
- **Prefixo `_`:** convenção para "parâmetro recebido, mas não usado".
- **Import dos tipos do Express:** sem ele, `Request` e `Response` seriam os tipos do navegador, que são diferentes.

🧪 **Testes**

```bash
# JSON quebrado (sem aspas) -> 400 em JSON, sem HTML
curl.exe -i -X POST http://localhost:3000/maquinas/2/saida -H "Content-Type: application/json" -d '{operador:Maria}'
```

**Exercício:** remova o parâmetro `_next` do tratador e repita o teste. O Express deixa de reconhecê-lo como tratador de erro.

---

### Parte 3.2 — Rota inexistente e cabeçalho do servidor

🎯 Manter o padrão JSON também para rotas que não existem e esconder a tecnologia do servidor.

🧩

```ts
const app = express();
app.disable('x-powered-by'); // não revela que o servidor usa Express
app.use(express.json());

// ... rotas ...

// Rota não encontrada: se chegou aqui, nenhuma rota acima atendeu.
app.use((req: Request, res: Response) => {
  res.status(404).json({ erro: `Rota ${req.method} ${req.path} não existe` });
});

// ... tratador de erros (sempre o último) ...
```

📚 **Conceitos**
- **Ordem dos middlewares (funil):** o Express percorre tudo **na ordem em que foi declarado**:
  ```
  express.json()  →  rotas  →  404 genérico  →  tratador de erros
  ```
  Se o 404 fosse declarado antes das rotas, toda requisição cairia nele.
- **404 de rota × 404 de recurso:** `/xyz` não existe na API. Já `/maquinas/99` é uma rota que existe, mas a máquina 99 não.
- **Cabeçalho `X-Powered-By`:** divulga a tecnologia do servidor. Removê-lo dificulta ataques direcionados, mais uma camada de defesa.

🧪 **Testes**

```bash
# Rota inexistente -> 404 em JSON
curl.exe -i http://localhost:3000/xyz

# Método inexistente numa rota existente -> 404
curl.exe -i -X DELETE http://localhost:3000/maquinas

# Confira que não aparece a linha "X-Powered-By" nos cabeçalhos
curl.exe -i http://localhost:3000/maquinas
```

---

### Parte 4 — Validações no retorno

🎯 Garantir que só retorne quem saiu e que o horímetro seja um número coerente.

🧩 Rota `POST /maquinas/:id/retorno`:

```ts
// Validação 1: a máquina existe?                          -> 404
// Validação 2: a máquina está em campo?                    -> 409
if (maquina.status !== 'Em Operação') { ... }

// Validação 3 (formato): o horímetro veio e é número?      -> 400
const { horimetro } = req.body ?? {};
if (typeof horimetro !== 'number' || !Number.isFinite(horimetro)) {
  return res.status(400).json({ erro: "Campo 'horimetro' é obrigatório e deve ser um número" });
}

// Validação 4 (regra de negócio): nunca anda para trás     -> 400
if (horimetro < maquina.horimetro) {
  return res.status(400).json({
    erro: `Horímetro informado (${horimetro}) é menor que o atual (${maquina.horimetro})`
  });
}
```

📚 **Conceitos**
- **Ordem lógica das validações:** existe → estado → formato → regra de negócio. Não faz sentido comparar o horímetro antes de saber se ele é um número.
- **Tipos no JSON:** `1010` (número) é diferente de `"1010"` (texto). Exigir o tipo certo evita dados como `"abc"` ou `"10,5"`.
- **`Number.isFinite`:** `NaN` e `Infinity` também são `typeof 'number'`, e o `isFinite` recusa os dois.
- **Mensagens úteis:** mostrar os dois valores ("900 é menor que 1000") permite ao usuário corrigir sozinho.
- **Regra "maior ou igual":** um horímetro igual ao atual é aceito (a máquina saiu e voltou sem trabalhar).
- **Discussão:** alguns times usam **422 Unprocessable Entity** para regras de negócio e deixam o 400 só para formato. Ambos são aceitos; o importante é manter um padrão.

🧪 **Testes** (faça antes a saída da máquina 1, como na Parte 2)

```bash
# Retorno de máquina que não saiu (máquina 2 disponível) -> 409
curl.exe -i -X POST http://localhost:3000/maquinas/2/retorno -H "Content-Type: application/json" -d '{"horimetro":510}'

# Sem horímetro -> 400
curl.exe -i -X POST http://localhost:3000/maquinas/1/retorno

# Horímetro como texto -> 400
curl.exe -i -X POST http://localhost:3000/maquinas/1/retorno -H "Content-Type: application/json" -d '{"horimetro":"1012"}'

# Horímetro menor que o atual -> 400
curl.exe -i -X POST http://localhost:3000/maquinas/1/retorno -H "Content-Type: application/json" -d '{"horimetro":900}'

# Retorno válido -> 200
curl.exe -i -X POST http://localhost:3000/maquinas/1/retorno -H "Content-Type: application/json" -d '{"horimetro":1012.3}'
```

---

### Parte 5 — Histórico de movimentações

🎯 Registrar **quem** levou, **para onde**, **quando** e **quantas horas** a máquina trabalhou.

🧩 Nova estrutura:

```ts
let movimentacoes: Movimentacao[] = [];
let proximoIdMovimentacao = 1; // simula o auto-incremento de um banco
```

Na **saída**, abre a movimentação:

```ts
const movimentacao: Movimentacao = {
  id: proximoIdMovimentacao++,
  maquinaId: maquina.id,
  operador: operador.trim(),
  frenteTrabalho: frenteTrabalho.trim(),
  horimetroSaida: maquina.horimetro,
  dataSaida: new Date().toISOString()
};
movimentacoes.push(movimentacao);
```

No **retorno**, localiza a movimentação aberta e a fecha:

```ts
const movimentacao = movimentacoes.find(
  mov => mov.maquinaId === maquina.id && mov.dataRetorno === undefined
);

movimentacao.horimetroRetorno = horimetro;
movimentacao.dataRetorno = new Date().toISOString();
movimentacao.horasTrabalhadas = Math.round((horimetro - movimentacao.horimetroSaida) * 10) / 10;
```

Nova rota de consulta:

```ts
app.get('/movimentacoes', (req, res) => {
  const { maquinaId } = req.query;
  if (maquinaId === undefined) return res.json(movimentacoes);

  const idFiltro = Number(maquinaId);
  if (!Number.isInteger(idFiltro)) {
    return res.status(400).json({ erro: "Parâmetro 'maquinaId' deve ser um número inteiro" });
  }
  res.json(movimentacoes.filter(mov => mov.maquinaId === idFiltro));
});
```

📚 **Conceitos**
- **Relacionamento por id:** `maquinaId` aponta para `Maquina.id`, como uma **chave estrangeira** num banco relacional. Esse desenho vira duas tabelas quando o banco entrar.
- **Campos opcionais (`?`):** a movimentação nasce sem os dados de retorno.
- **Registro "aberto":** uma movimentação aberta é a que não tem `dataRetorno`. É assim que o retorno encontra a saída certa.
- **`id++` (pós-incremento):** usa o valor atual e depois soma 1, simulando o auto-incremento.
- **Datas em ISO 8601 (`toISOString()`):** o formato padrão para datas em JSON. Fica sempre em UTC, e o front-end converte para o fuso local.
- **Ponto flutuante:** `1012.3 - 1000` dá `12.299999999999955`. O `Math.round(x * 10) / 10` arredonda para 1 casa decimal. Teste no console do navegador!
- **Query string (`?maquinaId=1`):** usada para **filtros opcionais**. Já o parâmetro de rota (`/:id`) **identifica** um recurso.
- **`Array.filter`:** devolve **todos** os itens que atendem à condição (o `find` devolve só o primeiro).

🧪 **Testes**

```bash
# Histórico completo
curl.exe http://localhost:3000/movimentacoes

# Filtrado por máquina (use aspas por causa do "?")
curl.exe "http://localhost:3000/movimentacoes?maquinaId=1"

# Filtro inválido -> 400
curl.exe -i "http://localhost:3000/movimentacoes?maquinaId=abc"
```

---

### Parte 6 — Avarias no retorno (campo opcional)

🎯 Permitir que o operador registre problemas observados na máquina.

🧩

```ts
const { horimetro, avarias } = req.body ?? {};

// Campo OPCIONAL: pode não vir; mas, se vier, precisa ser texto
if (avarias !== undefined && typeof avarias !== 'string') {
  return res.status(400).json({ erro: "Campo 'avarias', quando informado, deve ser um texto" });
}

// ...

// Só grava se houver texto de verdade (ignora "" e "   ")
if (avarias !== undefined && avarias.trim() !== '') {
  movimentacao.avarias = avarias.trim();
}
```

📚 **Conceitos — obrigatório × opcional**

| | Obrigatório (`horimetro`) | Opcional (`avarias`) |
|---|---|---|
| Não veio | ❌ 400 | ✅ aceito |
| Veio com o tipo errado | ❌ 400 | ❌ 400 |
| Veio certo | ✅ aceito | ✅ aceito |

**Opcional não é "aceita qualquer coisa".** O campo pode faltar, mas, se vier, precisa estar no formato correto.

🧪 **Testes** (com a máquina em operação)

```bash
# Avarias com tipo errado -> 400
curl.exe -i -X POST http://localhost:3000/maquinas/1/retorno -H "Content-Type: application/json" -d '{"horimetro":1012.3,"avarias":123}'

# Com avarias -> 200
curl.exe -i -X POST http://localhost:3000/maquinas/1/retorno -H "Content-Type: application/json" -d '{"horimetro":1012.3,"avarias":"Vazamento de oleo no hidraulico"}'

# Sem avarias -> 200 (o campo simplesmente não aparece na movimentação)
curl.exe -i -X POST http://localhost:3000/maquinas/2/retorno -H "Content-Type: application/json" -d '{"horimetro":510}'
```

---

## Módulo de Estoque

Com o padrão do módulo de uso aprendido, o estoque reaproveita as mesmas técnicas (tipos, validações em ordem, histórico) e acrescenta conceitos novos: **valores monetários**, **kardex** e **dados derivados**.

No `server.ts`, o módulo fica numa seção própria, marcada com `// ===== ESTOQUE (ALMOXARIFADO) =====`.

---

### Parte E1 — Modelo de peça e listagem

🎯 Representar as peças do almoxarifado e listá-las.

🧩

```ts
type UnidadeMedida = 'un' | 'L';

interface Peca {
  id: number;
  codigo: string;
  descricao: string;
  unidade: UnidadeMedida;
  saldo: number;
  custoUnitario: number;
}

let pecas: Peca[] = [
  { id: 1, codigo: 'FLT-001', descricao: 'Filtro de óleo do motor', unidade: 'un', saldo: 10, custoUnitario: 85.9 },
  // ...
];

app.get('/pecas', (req, res) => {
  res.json(pecas);
});
```

📚 **Conceitos**
- **Modelar um domínio novo:** antes das rotas, pergunte "o que o almoxarife precisa saber?". A resposta define o que é a peça, quanto tem e quanto custa.
- **`id` × `codigo`:** o `id` é interno do sistema (URLs e relações), e o `codigo` (`FLT-001`) é o que as **pessoas** usam. Mesmo papel do `id` e da `tag` nas máquinas.
- **Unidade de medida:** sem ela, "saldo: 200" não quer dizer nada (200 filtros ou 200 litros?).
- **Saldo de implantação:** as peças iniciais já têm saldo porque representam o que **já estava na prateleira** quando o sistema começou.
- **Dinheiro em ponto flutuante:** `0.1 + 0.2 = 0.30000000000000004`. Por isso os valores são arredondados (Parte E4). Sistemas financeiros costumam guardar valores **em centavos** (inteiros).

🧪 **Testes**

```bash
curl.exe http://localhost:3000/pecas   # 200, as 3 peças
```

---

### Parte E2 — Buscar peça por id

🎯 Consultar uma única peça.

🧩

```ts
app.get('/pecas/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'O id deve ser um número inteiro' });
  }

  const peca = pecas.find(p => p.id === id);
  if (!peca) {
    return res.status(404).json({ erro: 'Peça não encontrada' });
  }

  res.json(peca);
});
```

📚 **Conceitos**
- **Reaproveitar um padrão:** o mesmo esqueleto de "buscar por id" serve para qualquer recurso. Código consistente acelera cada funcionalidade nova.
- **`Number` × `parseInt`:** `parseInt('1.5')` dá `1` e `parseInt('2abc')` dá `2`, aceitando valores inválidos sem avisar. `Number` resulta em `1.5` e `NaN`, e o `Number.isInteger` recusa os dois.
- **400 antes do 404:** sem um id válido, nem faz sentido procurar.

🧪 **Testes**

```bash
curl.exe -i http://localhost:3000/pecas/2     # 200
curl.exe -i http://localhost:3000/pecas/99    # 404
curl.exe -i http://localhost:3000/pecas/abc   # 400
```

> Esta rota é praticamente a solução do [exercício 1](docs/exercicios.md#exercício-1--buscar-uma-máquina-pelo-id). Se a turma ainda não o fez, vale propô-lo antes.

---

### Parte E3 — Cadastro de peça

🎯 Cadastrar peças novas, sempre com **saldo zero**.

🧩

```ts
app.post('/pecas', (req, res) => {
  const { codigo, descricao, unidade, saldo, custoUnitario } = req.body ?? {};

  // Formato: codigo, descricao e unidade                              -> 400
  if (!UNIDADES_VALIDAS.includes(unidade)) { /* ... */ }

  // Regra: saldo e custo só mudam por entrada de estoque              -> 400
  if (saldo !== undefined || custoUnitario !== undefined) {
    return res.status(400).json({
      erro: "Saldo e custo não são informados no cadastro. Use a entrada de estoque (compra) para abastecer a peça"
    });
  }

  // Regra: código único (normalizado)                                 -> 409
  const codigoNormalizado = codigo.trim().toUpperCase();
  if (pecas.some(p => p.codigo === codigoNormalizado)) { /* ... */ }

  // Cria a peça zerada                                                -> 201
  const novaPeca: Peca = { id: proximoIdPeca++, codigo: codigoNormalizado, /* ... */ saldo: 0, custoUnitario: 0 };
  pecas.push(novaPeca);
  res.status(201).json(novaPeca);
});
```

📚 **Conceitos**
- **O saldo só muda por movimentação:** é a regra central de qualquer estoque. Se o cadastro aceitasse `"saldo": 50`, ninguém saberia de onde vieram essas unidades nem quanto custaram.
- **Recusar × ignorar campos indevidos:** aqui o `saldo` é **recusado** com uma mensagem que ensina o caminho certo, porque o cliente provavelmente **acha** que o campo funciona. Campos irrelevantes podem ser simplesmente ignorados.
- **201 Created:** o código certo quando um recurso é criado.
- **Constante com os valores válidos:** `UNIDADES_VALIDAS` fica num só lugar, e a mensagem de erro é montada a partir dela.
- **Normalização:** `" flt-002 "` vira `"FLT-002"` antes de gravar **e** antes de checar se já existe.

🧪 **Testes**

```bash
curl.exe -i -X POST http://localhost:3000/pecas -H "Content-Type: application/json" -d '{"codigo":" flt-002 ","descricao":"Filtro de ar","unidade":"un"}'           # 201
curl.exe -i -X POST http://localhost:3000/pecas -H "Content-Type: application/json" -d '{"codigo":"FLT-002","descricao":"Outro","unidade":"un"}'                # 409
curl.exe -i -X POST http://localhost:3000/pecas -H "Content-Type: application/json" -d '{"codigo":"GRX-001","descricao":"Graxa","unidade":"kg"}'                # 400
curl.exe -i -X POST http://localhost:3000/pecas -H "Content-Type: application/json" -d '{"codigo":"GRX-001","descricao":"Graxa","unidade":"un","saldo":50}'     # 400
```

---

### Parte E4 — Entrada de estoque (compra)

🎯 Registrar compras: somar ao saldo e atualizar o custo para o **valor da última compra**.

🧩 Função auxiliar de arredondamento:

```ts
function arredondar(valor: number, casas: number): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}
```

Rota `POST /pecas/:id/entradas`:

```ts
// id válido (400) -> peça existe (404) -> quantidade e custo > 0 (400)
// -> peça contada em unidades não aceita fração (400)
if (peca.unidade === 'un' && !Number.isInteger(quantidade)) {
  return res.status(400).json({
    erro: `A peça ${peca.codigo} é contada em unidades: a quantidade deve ser um número inteiro`
  });
}

const custoAnterior = peca.custoUnitario;
peca.saldo = arredondar(peca.saldo + quantidade, 2);
peca.custoUnitario = arredondar(custoUnitario, 2);   // regra: custo da última compra
```

📚 **Conceitos**
- **Extrair uma função:** o arredondamento se repetia pelo código. Uma função com nome (`arredondar`) deixa a intenção clara e evita repetição.
- **Validação que depende do dado armazenado:** "unidade não aceita fração" só pode ser checada **depois** de encontrar a peça, porque depende da `unidade` dela.
- **Regra de custo:** o projeto usa o **custo da última compra**. Veja o efeito: comprar **0,1 L a R$ 1,00** muda o custo dos **220 litros** do estoque para R$ 1,00. As alternativas reais são:
  - **custo médio ponderado:** `(saldo × custo atual + qtd × custo novo) / (saldo + qtd)`, o mais usado no Brasil;
  - **PEPS/FIFO:** cada lote tem o seu custo.

  Uma regra de negócio muda o resultado, e a escolha é do negócio, não da tecnologia.

🧪 **Testes**

```bash
curl.exe -X POST http://localhost:3000/pecas/1/entradas -H "Content-Type: application/json" -d '{"quantidade":5,"custoUnitario":92.456}'    # 200: saldo 15, custo 92.46
curl.exe -X POST http://localhost:3000/pecas/2/entradas -H "Content-Type: application/json" -d '{"quantidade":20.5,"custoUnitario":19.9}'   # 200: litros aceitam fração
curl.exe -i -X POST http://localhost:3000/pecas/1/entradas -H "Content-Type: application/json" -d '{"quantidade":1.5,"custoUnitario":90}'  # 400
curl.exe -i -X POST http://localhost:3000/pecas/1/entradas -H "Content-Type: application/json" -d '{"quantidade":0,"custoUnitario":90}'    # 400
```

---

### Parte E5 — Histórico de movimentos (kardex)

🎯 Registrar **toda** mudança de saldo, de forma que o saldo atual seja sempre explicável.

🧩 Histórico iniciado com a implantação das peças iniciais:

```ts
let movimentosEstoque: MovimentoEstoque[] = pecas.map((peca, indice) => ({
  id: indice + 1,
  pecaId: peca.id,
  tipo: 'implantacao',
  quantidade: peca.saldo,
  custoUnitario: peca.custoUnitario,
  valorTotal: arredondar(peca.saldo * peca.custoUnitario, 2),
  saldoApos: peca.saldo,
  data: new Date().toISOString()
}));
```

A rota de entrada passa a gravar um movimento `'entrada'`, e há uma rota nova de consulta:

```ts
app.get('/pecas/:id/movimentos', (req, res) => {
  // id válido (400) -> peça existe (404)
  res.json(movimentosEstoque.filter(mov => mov.pecaId === peca.id));
});
```

Exemplo de kardex do filtro FLT-001:

| Tipo | Qtd | Custo | Valor | Saldo após |
|---|---|---|---|---|
| implantação | 10 | 85,90 | 859,00 | **10** |
| entrada | 5 | 92,46 | 462,30 | **15** |
| entrada | 3 | 95,00 | 285,00 | **18** |

📚 **Conceitos**
- **Kardex:** a ficha de movimentação de cada item. É como um **extrato bancário**: o saldo é o resultado de todos os lançamentos.
- **Implantação:** sem ela, os 10 filtros iniciais não teriam explicação no histórico. Todo sistema de estoque real tem esse lançamento de "saldo inicial".
- **Custo congelado:** cada movimento guarda o custo **daquele momento**. Mesmo que o custo da peça mude depois, o histórico não muda.
- **`saldoApos`:** permite ler o histórico sem refazer contas e ajuda a detectar inconsistências.
- **Modelo pensado para o futuro:** o tipo `'saida'` já existe e será usado na baixa por Ordem de Serviço.
- **`Array.map` para gerar dados:** as linhas de implantação são criadas a partir da lista de peças, sem repetir valores à mão.

🧪 **Testes**

```bash
curl.exe http://localhost:3000/pecas/1/movimentos        # implantação
curl.exe -X POST http://localhost:3000/pecas/1/entradas -H "Content-Type: application/json" -d '{"quantidade":5,"custoUnitario":92.46}'
curl.exe http://localhost:3000/pecas/1/movimentos        # implantação + entrada
```

---

### Parte E6 — Estoque mínimo e alerta de reposição

🎯 Saber quais peças precisam ser compradas, e quanto falta.

🧩 `Peca` ganha o campo `estoqueMinimo` (opcional no cadastro, padrão 0), e a listagem ganha um filtro:

```ts
app.get('/pecas', (req, res) => {
  const { abaixoDoMinimo } = req.query;
  if (abaixoDoMinimo === undefined) return res.json(pecas);

  if (abaixoDoMinimo !== 'true') {
    return res.status(400).json({ erro: "Parâmetro 'abaixoDoMinimo' só aceita o valor 'true'" });
  }

  const paraRepor = pecas
    .filter(p => p.saldo < p.estoqueMinimo)
    .map(p => ({ ...p, faltaParaMinimo: arredondar(p.estoqueMinimo - p.saldo, 2) }));

  res.json(paraRepor);
});
```

📚 **Conceitos**
- **O TypeScript mostra o impacto de uma mudança:** ao acrescentar `estoqueMinimo` à interface, o editor acusou na hora que o cadastro criava peças sem o campo. Mudar o modelo revela tudo o que precisa ser ajustado.
- **Spread (`...p`):** copia os campos da peça para um objeto **novo** e acrescenta `faltaParaMinimo`, sem alterar a peça original.
- **Dado derivado:** `faltaParaMinimo` é calculado a cada consulta. É o que o almoxarife precisa para o pedido de compra.
- **Valor padrão com `??`:** `estoqueMinimo ?? 0` usa o valor enviado ou zero.
- **Para discutir:** com `saldo < mínimo`, uma peça **exatamente no** mínimo não aparece. Muitas empresas usam `<=`, repondo ao **atingir** o mínimo. É mais uma regra a confirmar com o negócio.

🧪 **Testes**

```bash
curl.exe "http://localhost:3000/pecas?abaixoDoMinimo=true"    # correia (4 < 5)
curl.exe -X POST http://localhost:3000/pecas/3/entradas -H "Content-Type: application/json" -d '{"quantidade":6,"custoUnitario":118}'
curl.exe "http://localhost:3000/pecas?abaixoDoMinimo=true"    # a correia sai da lista
```

---

## Módulo de Manutenção

O terceiro módulo **liga os outros dois**: a O.S. muda o status da máquina, pode encerrar uma saída em andamento e consome peças do estoque. Os conceitos novos são **documento com itens**, **operações que alteram várias entidades**, **tudo ou nada** e **refatoração para reaproveitar regras**.

No `server.ts`, o módulo fica na seção `// ===== MANUTENÇÃO (ORDENS DE SERVIÇO) =====`.

Regras de negócio decididas antes de programar:

| Decisão | Regra |
|---|---|
| Estoque negativo | Proibido: se faltar saldo de qualquer peça, o fechamento é recusado **por inteiro** |
| Momento da baixa | Só no **fechamento** da O.S. |
| Custo das peças | **Congelado** na O.S.: compras futuras não mudam O.S. fechadas |
| Máquina em campo | Pode abrir O.S.: a saída é **encerrada automaticamente** com o horímetro da parada |
| O.S. por máquina | **Uma aberta por vez** |
| Peça repetida no fechamento | Recusada (400): cada peça aparece uma vez, com a quantidade total |

---

### Parte OS1 — Modelo da ordem de serviço e listagem

🎯 Representar a O.S. e listá-la com filtros.

🧩 Tipos `TipoOS`, `StatusOS`, `ItemOS` e `OrdemServico` (veja o [modelo de dados](#ordem-de-serviço)) e a rota de listagem com **filtros combináveis**:

```ts
app.get('/ordens-servico', (req, res) => {
  const { maquinaId, status } = req.query;
  let resultado = ordensServico;

  if (maquinaId !== undefined) {
    // valida (400) e filtra
    resultado = resultado.filter(os => os.maquinaId === idFiltro);
  }
  if (status !== undefined) {
    // valida contra STATUS_OS (400) e filtra
    resultado = resultado.filter(os => os.status === status);
  }

  res.json(resultado);
});
```

📚 **Conceitos**
- **Documento com itens (cabeçalho + linhas):** é o modelo de nota fiscal, pedido e O.S. Num banco de dados, vira duas tabelas numa relação **um para muitos**.
- **Desnormalização consciente:** o item guarda o `pecaId` (a relação) **e** uma cópia do `codigo` e do custo. O código facilita a leitura, e o custo **precisa** ser copiado por causa da regra do custo congelado.
- **Filtros combináveis:** a lista começa completa e cada filtro presente a reduz. Qualquer combinação funciona sem multiplicar os `if`s.

🧪 **Testes**

```bash
curl.exe http://localhost:3000/ordens-servico
curl.exe -i "http://localhost:3000/ordens-servico?status=aberta"   # 400 (maiúscula importa)
```

---

### Parte OS2 — Abrir O.S. com a máquina disponível

🎯 Abrir a O.S. e mandar a máquina para a oficina.

🧩 `POST /ordens-servico` com o corpo `{ maquinaId, tipo, descricao, horimetro }`, validando nesta ordem:

```ts
// 1. maquinaId inteiro                          -> 400
// 2. máquina existe                             -> 404
// 3. máquina já 'Em Manutenção' (O.S. aberta)   -> 409
// 4. tipo, descricao e horimetro                -> 400
// 5. horímetro não anda para trás               -> 400

ordensServico.push(ordemServico);        // status 'Aberta', itens [], custoTotal 0
maquina.status = 'Em Manutenção';
maquina.horimetro = horimetro;
res.status(201).json({ mensagem: 'Ordem de serviço aberta!', ordemServico, maquina });
```

📚 **Conceitos**
- **Uma ação que muda duas entidades:** cria a O.S. e altera a máquina. Todas as validações vêm **antes** de qualquer alteração.
- **As regras se somam:** nada foi escrito para impedir a saída de uma máquina em manutenção. A rota de saída já exigia `Disponível` desde a Parte 2.
- **Recurso referenciado no corpo:** com o `maquinaId` no corpo, há quem responda **404** e quem responda **422**. O projeto usa 404, por consistência.
- **`Number.isInteger` também confere o tipo:** `Number.isInteger("2")` é `false`.
- **Passo intermediário:** nesta parte, a máquina **em campo** recebia um 409 provisório, trocado na OS3.

🧪 **Testes**

```bash
curl.exe -i -X POST http://localhost:3000/ordens-servico -H "Content-Type: application/json" -d '{"maquinaId":1,"tipo":"Preventiva","descricao":"Revisao 1000 h","horimetro":1000}'   # 201
curl.exe -i -X POST http://localhost:3000/ordens-servico -H "Content-Type: application/json" -d '{"maquinaId":1,"tipo":"Corretiva","descricao":"Outro","horimetro":1000}'           # 409
curl.exe -i -X POST http://localhost:3000/maquinas/1/saida -H "Content-Type: application/json" -d '{"operador":"Joao","frenteTrabalho":"Talhao 5"}'                                  # 409
```

---

### Parte OS3 — Abrir O.S. com a máquina em campo

🎯 Se a máquina quebrou no campo, abrir a O.S. encerra a saída com o horímetro da parada.

🧩 **Primeiro, uma refatoração:** a lógica de fechar a movimentação saiu da rota de retorno e virou duas funções, usadas pelas **duas** rotas:

```ts
function buscarMovimentacaoAberta(maquinaId: number): Movimentacao | undefined { /* ... */ }
function fecharMovimentacao(movimentacao: Movimentacao, horimetro: number, avarias?: string): void { /* ... */ }
```

Na abertura da O.S.:

```ts
// Antes de alterar qualquer coisa: a máquina em campo precisa ter a saída em aberto
const movimentacaoAberta = maquina.status === 'Em Operação'
  ? buscarMovimentacaoAberta(maquina.id)
  : undefined;

// ... depois de criar a O.S.:
if (movimentacaoAberta) {
  fecharMovimentacao(movimentacaoAberta, horimetro, `O.S. nº ${ordemServico.id}: ${ordemServico.descricao}`);
}
```

📚 **Conceitos**
- **DRY (*Don't Repeat Yourself*):** quando surgiu o segundo uso, a regra foi **extraída** em vez de copiada. Se ela mudar, muda num lugar só.
- **Os testes dão segurança para refatorar:** mexemos na rota de retorno, e o `testes.sh` confirmou que nada quebrou.
- **Tipo de retorno `Movimentacao | undefined`:** a função avisa, pelo tipo, que pode não encontrar nada.
- **Uma ação, três entidades:** cria a O.S., fecha a movimentação e altera a máquina.
- **Rastreabilidade entre módulos:** a avaria `"O.S. nº 2: Correia partiu"` liga o histórico de uso à manutenção.

🧪 **Testes** (com o servidor recém-iniciado)

```bash
curl.exe -X POST http://localhost:3000/maquinas/2/saida -H "Content-Type: application/json" -d '{"operador":"Maria","frenteTrabalho":"Talhao 8"}'
curl.exe -X POST http://localhost:3000/ordens-servico -H "Content-Type: application/json" -d '{"maquinaId":2,"tipo":"Corretiva","descricao":"Correia partiu","horimetro":507.5}'
curl.exe "http://localhost:3000/movimentacoes?maquinaId=2"   # fechada: 7.5 h e a avaria da O.S.
```

---

### Parte OS4 — Fechar O.S. sem peças

🎯 Encerrar a O.S. e devolver a máquina ao pátio.

🧩 `POST /ordens-servico/:id/fechamento`:

```ts
// 1. id inteiro           -> 400
// 2. O.S. existe          -> 404
// 3. O.S. está 'Aberta'   -> 409

ordemServico.status = 'Fechada';
ordemServico.dataFechamento = dataFechamento;
maquina.status = 'Disponível';
```

📚 **Conceitos**
- **Ciclo de vida:** `Aberta → Fechada`, sem volta. O 409 protege a transição proibida.
- **Ação como sub-recurso (`/fechamento`):** em vez de `PATCH {"status":"Fechada"}`, a ação tem rota própria, com as regras explícitas, igual a `/saida` e `/retorno`.
- **501 Not Implemented:** nesta parte, fechar **com** peças respondia 501, o código para "o servidor ainda não sabe fazer isso". É o desenvolvimento incremental de forma honesta.
- **`Array.isArray`:** o `typeof` de uma lista é `'object'`. Para saber se é lista, use `Array.isArray`.
- **Lista vazia = ausência:** `"pecas": []` e nenhum corpo significam a mesma coisa.

🧪 **Testes**

```bash
curl.exe -X POST http://localhost:3000/ordens-servico -H "Content-Type: application/json" -d '{"maquinaId":1,"tipo":"Preventiva","descricao":"Revisao","horimetro":1000}'
curl.exe -i -X POST http://localhost:3000/ordens-servico/1/fechamento    # 200
curl.exe -i -X POST http://localhost:3000/ordens-servico/1/fechamento    # 409
```

---

### Parte OS5 — Validar as peças do fechamento (tudo ou nada)

🎯 Garantir que **toda** a lista de peças está correta antes de baixar qualquer uma.

🧩 Um tipo que representa "deu certo" **ou** "deu errado":

```ts
type ResultadoValidacaoPecas =
  | { ok: true; itens: { peca: Peca; quantidade: number }[] }
  | { ok: false; status: number; erro: string };
```

E uma função que percorre a lista inteira:

```ts
function validarPecasDoFechamento(pecasInformadas: unknown): ResultadoValidacaoPecas {
  // para cada item: formato (400) -> peça existe (404) -> repetida (400) -> fração em 'un' (400)
  // no fim, saldo de TODAS as peças de uma vez (409):
  //   "Estoque insuficiente: FLT-001 (pedido 12, saldo 10); COR-001 (pedido 5, saldo 4). Nenhuma baixa foi realizada."
}
```

Na rota:

```ts
const validacao = validarPecasDoFechamento(req.body?.pecas);
if (!validacao.ok) {
  return res.status(validacao.status).json({ erro: validacao.erro });
}
```

📚 **Conceitos**
- **Tudo ou nada (atomicidade):** se a 3ª peça não tivesse saldo e as duas primeiras já tivessem sido baixadas, o estoque ficaria inconsistente. Em banco de dados, isso se garante com uma **transação** (o "A" de **ACID**). Em memória, conseguimos o mesmo com "validar tudo primeiro, alterar depois".
- **Mostrar todos os problemas de saldo de uma vez:** o usuário corrige tudo numa ida.
- **União discriminada:** o campo `ok` separa os dois formatos. Depois do `if (!validacao.ok)`, o TypeScript sabe que `validacao.itens` existe.
- **`unknown` × `any`:** com `unknown`, o TypeScript **obriga** a checar o tipo antes de usar. É o tipo mais seguro para dados externos.
- **Numerar para humanos:** "Item 1", "Item 2" (`i + 1`), e não o índice 0 do código.
- **Um código para cada problema:** 400 (formato), 404 (peça não existe), 409 (falta saldo).

🧪 **Testes**

```bash
curl.exe -X POST http://localhost:3000/ordens-servico -H "Content-Type: application/json" -d '{"maquinaId":1,"tipo":"Corretiva","descricao":"Vazamento","horimetro":1000}'
curl.exe -i -X POST http://localhost:3000/ordens-servico/1/fechamento -H "Content-Type: application/json" -d '{"pecas":[{"pecaId":1,"quantidade":2},{"pecaId":1,"quantidade":1}]}'   # 400 repetida
curl.exe -i -X POST http://localhost:3000/ordens-servico/1/fechamento -H "Content-Type: application/json" -d '{"pecas":[{"pecaId":1,"quantidade":12},{"pecaId":3,"quantidade":5}]}'  # 409
curl.exe http://localhost:3000/pecas   # saldos intactos
```

---

### Parte OS6 — Baixa automática no estoque

🎯 Com a lista validada, baixar as peças, registrar no kardex e calcular o custo da O.S.

🧩

```ts
for (const { peca, quantidade } of validacao.itens) {
  const custoUnitario = peca.custoUnitario;                  // custo congelado AGORA
  const valorTotal = arredondar(quantidade * custoUnitario, 2);

  peca.saldo = arredondar(peca.saldo - quantidade, 2);
  movimentosEstoque.push({ /* ... */ tipo: 'saida', saldoApos: peca.saldo, ordemServicoId: ordemServico.id });
  ordemServico.itens.push({ pecaId: peca.id, codigo: peca.codigo, quantidade, custoUnitario, valorTotal });
}

ordemServico.custoTotal = arredondar(
  ordemServico.itens.reduce((soma, item) => soma + item.valorTotal, 0), 2
);
```

Exemplo: O.S. fechada com 2 filtros e 15,5 L de óleo:

| Item | Qtd | Custo | Valor |
|---|---|---|---|
| FLT-001 | 2 | 85,90 | 171,80 |
| OLE-001 | 15,5 | 18,50 | 286,75 |
| **Total** | | | **458,55** |

📚 **Conceitos**
- **Validar primeiro, alterar depois:** como a OS5 já garantiu tudo, o laço pode baixar sem risco de parar no meio.
- **Integração entre módulos:** o tipo `'saida'`, previsto lá na E5, finalmente foi usado.
- **Rastreabilidade nos dois sentidos:** a O.S. sabe **quais peças** usou (`itens`), e o kardex sabe **para onde** cada peça foi (`ordemServicoId`).
- **Custo congelado na prática:** depois de uma compra mais cara, a O.S. antiga continua com o valor original.
- **`for...of` com desestruturação:** percorre a lista já extraindo os campos, sem índice.
- **Uma data para a operação inteira:** a O.S. e todas as saídas recebem o **mesmo** instante.

🧪 **Testes**

```bash
curl.exe -X POST http://localhost:3000/ordens-servico -H "Content-Type: application/json" -d '{"maquinaId":1,"tipo":"Corretiva","descricao":"Vazamento","horimetro":1000}'
curl.exe -X POST http://localhost:3000/ordens-servico/1/fechamento -H "Content-Type: application/json" -d '{"pecas":[{"pecaId":1,"quantidade":2},{"pecaId":2,"quantidade":15.5}]}'
curl.exe http://localhost:3000/pecas/1/movimentos   # saída de 2, com ordemServicoId 1
```

---

### Parte OS7 — Detalhe da O.S. e custo por máquina

🎯 Consultar uma O.S. com os dados da máquina e responder "quanto custa manter esta máquina?".

🧩 `GET /ordens-servico/:id` junta a O.S. com um resumo da máquina:

```ts
res.json({
  ...ordemServico,
  maquina: maquina ? { id: maquina.id, tag: maquina.tag, modelo: maquina.modelo } : null
});
```

`GET /maquinas/:id/manutencoes` calcula os indicadores (só com as O.S. **fechadas**):

```ts
const somarCusto = (tipo?: TipoOS) => arredondar(
  fechadas
    .filter(os => tipo === undefined || os.tipo === tipo)
    .reduce((soma, os) => soma + os.custoTotal, 0),
  2
);

res.json({
  maquina: maquina.tag, status: maquina.status,
  totalOrdens: ordens.length, abertas: ordens.length - fechadas.length, fechadas: fechadas.length,
  custoTotal: somarCusto(),
  custoPorTipo: { Preventiva: somarCusto('Preventiva'), Corretiva: somarCusto('Corretiva') },
  ordens
});
```

📚 **Conceitos**
- **Juntar dados na resposta (join):** a O.S. guarda só o `maquinaId`, e a API monta a resposta com a máquina. O front-end faz uma chamada em vez de duas. É o equivalente ao `JOIN` do SQL.
- **Resposta mais enxuta que o dado:** da máquina, só vai o que a tela precisa.
- **Indicador de negócio:** muito custo **corretivo** indica máquina quebrando além do esperado. Um aumento no **preventivo** tende a reduzir o corretivo.
- **Função com parâmetro opcional:** `somarCusto()` soma tudo, e `somarCusto('Preventiva')` soma um tipo.

🧪 **Testes**

```bash
curl.exe http://localhost:3000/ordens-servico/1
curl.exe http://localhost:3000/maquinas/1/manutencoes
curl.exe -i http://localhost:3000/maquinas/99/manutencoes   # 404
```

---

## 6. Roteiro completo de testes com curl

> 🤖 **Rodar tudo de uma vez:** com o servidor recém-iniciado, execute `bash testes.sh`. O script roda os 82 cenários abaixo (25 do uso, 25 do estoque e 32 da manutenção) e mostra ✅ ou ❌ em cada um, com o que era esperado e o que foi recebido quando algo falha. Use-o para conferir se a sua implementação está correta.
>
> 💡 **Alternativa sem terminal:** o arquivo [testes.http](testes.http) tem este mesmo roteiro para a extensão **REST Client** do VS Code. Basta clicar em "Send Request" acima de cada teste, sem se preocupar com aspas.

Sequência para executar **em ordem, com o servidor recém-iniciado** (salve o `server.ts` ou reinicie o `npm run dev` para zerar os dados). Cada teste depende do estado deixado pelos anteriores.

Para deixar os comandos mais curtos, defina estas variáveis no Git Bash:

```bash
B=http://localhost:3000
H="Content-Type: application/json"
```

### `GET /maquinas`

| # | Cenário | Comando | Esperado |
|---|---|---|---|
| M0 | Listar máquinas | `curl.exe $B/maquinas` | **200**, as 2 máquinas `Disponível` |

### `POST /maquinas/:id/saida`

| # | Cenário | Esperado |
|---|---|---|
| S1 | Saída válida da máquina 1 | **200**, `status: "Em Operação"`, movimentação 1 aberta |
| S2 | Saída da máquina 1 de novo | **409**, `não pode sair: status atual é 'Em Operação'` |
| S3 | Máquina inexistente | **404**, `Máquina não encontrada` |
| S4 | Sem corpo | **400**, `Campo 'operador' é obrigatório` |
| S5 | Operador só com espaços | **400**, `Campo 'operador' é obrigatório` |
| S6 | Sem `frenteTrabalho` | **400**, `Campo 'frenteTrabalho' é obrigatório` |
| S7 | JSON mal formado | **400**, `JSON inválido no corpo da requisição` |
| S8 | JSON sem o cabeçalho `Content-Type` | **400**, `Campo 'operador' é obrigatório` (o corpo não é lido) |

```bash
curl.exe -X POST $B/maquinas/1/saida  -H "$H" -d '{"operador":"Joao","frenteTrabalho":"Talhao 5"}'   # S1
curl.exe -X POST $B/maquinas/1/saida  -H "$H" -d '{"operador":"Joao","frenteTrabalho":"Talhao 5"}'   # S2
curl.exe -X POST $B/maquinas/99/saida -H "$H" -d '{"operador":"Joao","frenteTrabalho":"Talhao 5"}'   # S3
curl.exe -X POST $B/maquinas/2/saida                                                                   # S4
curl.exe -X POST $B/maquinas/2/saida  -H "$H" -d '{"operador":"   ","frenteTrabalho":"Talhao 8"}'    # S5
curl.exe -X POST $B/maquinas/2/saida  -H "$H" -d '{"operador":"Maria"}'                              # S6
curl.exe -X POST $B/maquinas/2/saida  -H "$H" -d '{operador:Maria}'                                  # S7
curl.exe -X POST $B/maquinas/2/saida  -d '{"operador":"Maria","frenteTrabalho":"Talhao 8"}'          # S8
```

### `POST /maquinas/:id/retorno`

| # | Cenário | Esperado |
|---|---|---|
| R1 | Retorno de máquina que não saiu (2) | **409**, `não pode retornar: status atual é 'Disponível'` |
| R2 | Máquina inexistente | **404**, `Máquina não encontrada` |
| R3 | Sem corpo | **400**, `Campo 'horimetro' é obrigatório e deve ser um número` |
| R4 | Horímetro como texto | **400**, mesma mensagem |
| R5 | Avarias com tipo errado | **400**, `Campo 'avarias', quando informado, deve ser um texto` |
| R6 | Horímetro menor que o atual | **400**, `Horímetro informado (900) é menor que o atual (1000)` |
| R7 | Retorno válido com avarias | **200**, `horasTrabalhadas: 12.3`, `avarias` gravado |

```bash
curl.exe -X POST $B/maquinas/2/retorno  -H "$H" -d '{"horimetro":510}'                                                    # R1
curl.exe -X POST $B/maquinas/99/retorno -H "$H" -d '{"horimetro":510}'                                                    # R2
curl.exe -X POST $B/maquinas/1/retorno                                                                                     # R3
curl.exe -X POST $B/maquinas/1/retorno  -H "$H" -d '{"horimetro":"1012"}'                                                 # R4
curl.exe -X POST $B/maquinas/1/retorno  -H "$H" -d '{"horimetro":1012.3,"avarias":123}'                                   # R5
curl.exe -X POST $B/maquinas/1/retorno  -H "$H" -d '{"horimetro":900}'                                                    # R6
curl.exe -X POST $B/maquinas/1/retorno  -H "$H" -d '{"horimetro":1012.3,"avarias":"Vazamento de oleo no hidraulico"}'     # R7
```

### `GET /movimentacoes`

| # | Cenário | Esperado |
|---|---|---|
| H1 | Histórico após R7 | **200**, 1 movimentação fechada (12.3 h, com avarias) |
| H2 | Saída da máquina 2 (preparação) | **200**, movimentação 2 aberta |
| H3 | Filtro `maquinaId=2` | **200**, só a movimentação 2, **sem** `dataRetorno` (máquina em campo) |
| H4 | Filtro inválido | **400**, `Parâmetro 'maquinaId' deve ser um número inteiro` |
| H5 | Retorno da máquina 2 sem avarias | **200**, `horasTrabalhadas: 10`, sem o campo `avarias` |
| H6 | Histórico final | **200**, 2 movimentações fechadas |

```bash
curl.exe $B/movimentacoes                                                               # H1
curl.exe -X POST $B/maquinas/2/saida -H "$H" -d '{"operador":"Maria","frenteTrabalho":"Talhao 8"}'   # H2
curl.exe "$B/movimentacoes?maquinaId=2"                                                 # H3
curl.exe "$B/movimentacoes?maquinaId=abc"                                               # H4
curl.exe -X POST $B/maquinas/2/retorno -H "$H" -d '{"horimetro":510}'                   # H5
curl.exe $B/movimentacoes                                                               # H6
```

### Comportamentos globais

| # | Cenário | Esperado |
|---|---|---|
| G1 | Rota inexistente | **404**, `Rota GET /xyz não existe` |
| G2 | Método não suportado | **404**, `Rota DELETE /maquinas não existe` |
| G3 | Cabeçalhos da resposta | sem a linha `X-Powered-By` |

```bash
curl.exe $B/xyz                     # G1
curl.exe -X DELETE $B/maquinas      # G2
curl.exe -i $B/maquinas             # G3
```

### Estoque — `GET /pecas` e `GET /pecas/:id`

| # | Cenário | Esperado |
|---|---|---|
| P1 | Listar peças | **200**, as 3 peças iniciais |
| P2 | Buscar peça 2 | **200**, `OLE-001` |
| P3 | Peça inexistente | **404**, `Peça não encontrada` |
| P4 | Id inválido | **400**, `O id deve ser um número inteiro` |

```bash
curl.exe $B/pecas        # P1
curl.exe $B/pecas/2      # P2
curl.exe $B/pecas/99     # P3
curl.exe $B/pecas/abc    # P4
```

### Estoque — `POST /pecas` (cadastro)

| # | Cenário | Esperado |
|---|---|---|
| C1 | Cadastro válido | **201**, código `FLT-002`, saldo 0, mínimo 3 |
| C2 | Código repetido | **409**, `Já existe uma peça com o código FLT-002` |
| C3 | Unidade inválida | **400**, `Campo 'unidade' deve ser um destes: un, L` |
| C4 | Saldo informado no cadastro | **400**, `... Use a entrada de estoque ...` |
| C5 | Mínimo fracionado em peça por unidade | **400**, `... 'estoqueMinimo' deve ser um número inteiro` |
| C6 | Sem código | **400**, `Campo 'codigo' é obrigatório` |

```bash
curl.exe -X POST $B/pecas -H "$H" -d '{"codigo":" flt-002 ","descricao":"Filtro de ar","unidade":"un","estoqueMinimo":3}'   # C1
curl.exe -X POST $B/pecas -H "$H" -d '{"codigo":"FLT-002","descricao":"Outro","unidade":"un"}'                             # C2
curl.exe -X POST $B/pecas -H "$H" -d '{"codigo":"GRX-001","descricao":"Graxa","unidade":"kg"}'                             # C3
curl.exe -X POST $B/pecas -H "$H" -d '{"codigo":"GRX-001","descricao":"Graxa","unidade":"un","saldo":50}'                  # C4
curl.exe -X POST $B/pecas -H "$H" -d '{"codigo":"GRX-001","descricao":"Graxa","unidade":"un","estoqueMinimo":2.5}'         # C5
curl.exe -X POST $B/pecas -H "$H" -d '{"descricao":"Graxa","unidade":"un"}'                                                # C6
```

### Estoque — `POST /pecas/:id/entradas` (compra)

| # | Cenário | Esperado |
|---|---|---|
| E1 | 5 filtros a R$ 92,456 | **200**, saldo 10 → 15 |
| E2 | Conferir a peça | **200**, custo 92,46 (arredondado, última compra) |
| E3 | 20,5 L de óleo | **200**, saldo 200 → 220,5 |
| E4 | 1,5 filtro | **400**, `... contada em unidades ...` |
| E5 | Quantidade zero | **400**, `Campo 'quantidade' deve ser um número maior que zero` |
| E6 | Custo negativo | **400**, `Campo 'custoUnitario' deve ser um número maior que zero` |
| E7 | Peça inexistente | **404** |

```bash
curl.exe -X POST $B/pecas/1/entradas  -H "$H" -d '{"quantidade":5,"custoUnitario":92.456}'   # E1
curl.exe $B/pecas/1                                                                          # E2
curl.exe -X POST $B/pecas/2/entradas  -H "$H" -d '{"quantidade":20.5,"custoUnitario":19.9}'  # E3
curl.exe -X POST $B/pecas/1/entradas  -H "$H" -d '{"quantidade":1.5,"custoUnitario":90}'     # E4
curl.exe -X POST $B/pecas/1/entradas  -H "$H" -d '{"quantidade":0,"custoUnitario":90}'       # E5
curl.exe -X POST $B/pecas/1/entradas  -H "$H" -d '{"quantidade":5,"custoUnitario":-1}'       # E6
curl.exe -X POST $B/pecas/99/entradas -H "$H" -d '{"quantidade":5,"custoUnitario":90}'       # E7
```

### Estoque — `GET /pecas/:id/movimentos` (kardex)

| # | Cenário | Esperado |
|---|---|---|
| K1/K2 | Kardex do filtro | **200**, implantação (saldo após 10) + entrada (saldo após 15) |
| K3 | Kardex da peça nova | **200**, `[]` |
| K4 | Peça inexistente | **404** |

```bash
curl.exe $B/pecas/1/movimentos     # K1/K2
curl.exe $B/pecas/4/movimentos     # K3
curl.exe $B/pecas/99/movimentos    # K4
```

### Estoque — reposição (`?abaixoDoMinimo=true`)

| # | Cenário | Esperado |
|---|---|---|
| A1 | Peças abaixo do mínimo | **200**, correia (`faltaParaMinimo: 1`) e filtro de ar FLT-002 |
| A2 | Valor inválido | **400**, `Parâmetro 'abaixoDoMinimo' só aceita o valor 'true'` |
| A3 | Compra de 6 correias (preparação) | **200**, saldo 4 → 10 |
| A4 | Lista após a compra | **200**, a correia **não** aparece mais |

```bash
curl.exe "$B/pecas?abaixoDoMinimo=true"                                       # A1
curl.exe "$B/pecas?abaixoDoMinimo=sim"                                        # A2
curl.exe -X POST $B/pecas/3/entradas -H "$H" -d '{"quantidade":6,"custoUnitario":118}'   # A3
curl.exe "$B/pecas?abaixoDoMinimo=true"                                       # A4
```

### Manutenção — `POST /ordens-servico` (abertura)

> Estado herdado dos testes anteriores: TR-01 disponível com horímetro 1012,3; CO-02 disponível com 510; filtro com saldo 15 a R$ 92,46; óleo com saldo 220,5 a R$ 19,90.

| # | Cenário | Esperado |
|---|---|---|
| O1 | Nenhuma O.S. no início | **200**, `[]` |
| O2 | Abrir O.S. na TR-01 disponível | **201**, O.S. nº 1 `Aberta`, máquina `Em Manutenção` |
| O3 | Segunda O.S. na TR-01 | **409**, `já está em manutenção (O.S. nº 1 aberta)` |
| O4 | Saída da TR-01 em manutenção | **409**, `status atual é 'Em Manutenção'` |
| O5 | `maquinaId` como texto | **400** |
| O6 | Máquina inexistente | **404** |
| O7 | Tipo inválido | **400**, `deve ser um destes: Preventiva, Corretiva` |
| O8 | Horímetro menor que o atual | **400**, `(400) é menor que o atual (510)` |

```bash
curl.exe "$B/ordens-servico"                                                                                                   # O1
curl.exe -X POST $B/ordens-servico -H "$H" -d '{"maquinaId":1,"tipo":"Preventiva","descricao":"Revisao 1000 h","horimetro":1012.3}'   # O2
curl.exe -X POST $B/ordens-servico -H "$H" -d '{"maquinaId":1,"tipo":"Corretiva","descricao":"Outro","horimetro":1012.3}'             # O3
curl.exe -X POST $B/maquinas/1/saida -H "$H" -d '{"operador":"Joao","frenteTrabalho":"Talhao 5"}'                                      # O4
curl.exe -X POST $B/ordens-servico -H "$H" -d '{"maquinaId":"2","tipo":"Corretiva","descricao":"X","horimetro":510}'                  # O5
curl.exe -X POST $B/ordens-servico -H "$H" -d '{"maquinaId":99,"tipo":"Corretiva","descricao":"X","horimetro":1}'                     # O6
curl.exe -X POST $B/ordens-servico -H "$H" -d '{"maquinaId":2,"tipo":"Urgente","descricao":"X","horimetro":510}'                      # O7
curl.exe -X POST $B/ordens-servico -H "$H" -d '{"maquinaId":2,"tipo":"Corretiva","descricao":"X","horimetro":400}'                    # O8
```

### Manutenção — abertura com a máquina em campo

| # | Cenário | Esperado |
|---|---|---|
| O9 | Saída da CO-02 (preparação) | **200**, `Em Operação` |
| O10 | O.S. na CO-02 com horímetro 517,5 | **201**, saída encerrada com `horasTrabalhadas: 7.5` |
| O11 | Retorno depois da O.S. | **409**, `não pode retornar` |
| O12 | Histórico da CO-02 | **200**, avaria `O.S. nº 2: Correia partiu` |

```bash
curl.exe -X POST $B/maquinas/2/saida -H "$H" -d '{"operador":"Maria","frenteTrabalho":"Talhao 8"}'                                     # O9
curl.exe -X POST $B/ordens-servico -H "$H" -d '{"maquinaId":2,"tipo":"Corretiva","descricao":"Correia partiu","horimetro":517.5}'     # O10
curl.exe -X POST $B/maquinas/2/retorno -H "$H" -d '{"horimetro":520}'                                                                 # O11
curl.exe "$B/movimentacoes?maquinaId=2"                                                                                               # O12
```

### Manutenção — `POST /ordens-servico/:id/fechamento`

| # | Cenário | Esperado |
|---|---|---|
| F1 | O.S. inexistente | **404** |
| F2 | `pecas` não é lista | **400** |
| F3 | Peça repetida | **400**, `aparece mais de uma vez` |
| F4 | Peça 99 na lista | **404**, `Item 2: peça 99 não encontrada` |
| F5 | 10 L de óleo (tem saldo) + 20 filtros (saldo 15) | **409**, `Estoque insuficiente ... Nenhuma baixa foi realizada.` |
| F6 | Saldo do óleo | **200**, continua **220,5**: nem a peça com saldo foi baixada |
| F7 | Fechar com 2 filtros + 15,5 L | **200**, `custoTotal: 493.37` (184,92 + 308,45) |
| F8 | Kardex do filtro | **200**, saída com `ordemServicoId: 1` |
| F9 | Saldo do filtro | **200**, 15 → **13** |
| F10 | Fechar de novo | **409**, `já está fechada` |
| F11 | Fechar a O.S. nº 2 sem peças | **200**, `custoTotal: 0` |
| F12 | Máquinas | **200**, as duas `Disponível` (CO-02 com 517,5) |

```bash
curl.exe -X POST $B/ordens-servico/99/fechamento                                                                                 # F1
curl.exe -X POST $B/ordens-servico/1/fechamento -H "$H" -d '{"pecas":{"pecaId":1}}'                                              # F2
curl.exe -X POST $B/ordens-servico/1/fechamento -H "$H" -d '{"pecas":[{"pecaId":1,"quantidade":1},{"pecaId":1,"quantidade":1}]}'   # F3
curl.exe -X POST $B/ordens-servico/1/fechamento -H "$H" -d '{"pecas":[{"pecaId":1,"quantidade":1},{"pecaId":99,"quantidade":1}]}'  # F4
curl.exe -X POST $B/ordens-servico/1/fechamento -H "$H" -d '{"pecas":[{"pecaId":2,"quantidade":10},{"pecaId":1,"quantidade":20}]}' # F5
curl.exe $B/pecas/2                                                                                                              # F6
curl.exe -X POST $B/ordens-servico/1/fechamento -H "$H" -d '{"pecas":[{"pecaId":1,"quantidade":2},{"pecaId":2,"quantidade":15.5}]}' # F7
curl.exe $B/pecas/1/movimentos                                                                                                   # F8
curl.exe $B/pecas/1                                                                                                              # F9
curl.exe -X POST $B/ordens-servico/1/fechamento                                                                                  # F10
curl.exe -X POST $B/ordens-servico/2/fechamento                                                                                  # F11
curl.exe $B/maquinas                                                                                                             # F12
```

### Manutenção — consultas e custo congelado

| # | Cenário | Esperado |
|---|---|---|
| Q1 | Detalhe da O.S. nº 1 | **200**, com `"maquina": { "tag": "TR-01", ... }` |
| Q2 | O.S. inexistente | **404** |
| Q3 | `?maquinaId=2&status=Fechada` | **200**, só a O.S. nº 2 |
| Q4 | `?status=aberta` | **400** |
| Q5 | Manutenções da TR-01 | **200**, `custoPorTipo.Preventiva: 493.37` |
| Q6 | Manutenções da máquina 99 | **404** |
| Q7 | Compra de filtros a R$ 110 (preparação) | **200** |
| Q8 | Detalhe da O.S. nº 1 de novo | **200**, filtro **continua** a R$ 92,46 (custo congelado) |

```bash
curl.exe $B/ordens-servico/1                                                              # Q1
curl.exe $B/ordens-servico/99                                                             # Q2
curl.exe "$B/ordens-servico?maquinaId=2&status=Fechada"                                   # Q3
curl.exe "$B/ordens-servico?status=aberta"                                                # Q4
curl.exe $B/maquinas/1/manutencoes                                                        # Q5
curl.exe $B/maquinas/99/manutencoes                                                       # Q6
curl.exe -X POST $B/pecas/1/entradas -H "$H" -d '{"quantidade":5,"custoUnitario":110}'   # Q7
curl.exe $B/ordens-servico/1                                                              # Q8
```

> **Dica:** para ver só o código HTTP de cada resposta, acrescente `-w "  [%{http_code}]\n"` ao comando.

---

## 7. Referência rápida

### Códigos HTTP usados

| Código | Quando usar | Exemplo nesta API |
|---|---|---|
| **200 OK** | Deu certo | Saída ou retorno registrados, compra registrada |
| **201 Created** | Um recurso foi criado | Cadastro de peça, abertura de O.S. |
| **400 Bad Request** | O cliente enviou dados inválidos | Campo faltando, tipo errado, JSON quebrado |
| **404 Not Found** | Recurso ou rota inexistente | Máquina 99, `GET /xyz` |
| **409 Conflict** | O estado atual impede a ação | Saída de máquina já em operação, estoque insuficiente, O.S. já fechada |
| **500 Internal Server Error** | Erro inesperado no servidor | Mensagem genérica, detalhe só no log |

### Regras de negócio

| Rota | Regra | Erro |
|---|---|---|
| Saída | Máquina precisa existir | 404 |
| Saída | Status precisa ser `Disponível` | 409 |
| Saída | `operador` e `frenteTrabalho` obrigatórios (texto não vazio) | 400 |
| Retorno | Máquina precisa existir | 404 |
| Retorno | Status precisa ser `Em Operação` | 409 |
| Retorno | `horimetro` obrigatório e numérico | 400 |
| Retorno | `avarias`, se informado, deve ser texto | 400 |
| Retorno | `horimetro` ≥ horímetro atual | 400 |
| Retorno | Precisa existir movimentação aberta | 409 |
| Histórico | `maquinaId`, se informado, deve ser inteiro | 400 |
| Peças (todas com `:id`) | `id` deve ser inteiro / peça precisa existir | 400 / 404 |
| Cadastro de peça | `codigo`, `descricao` obrigatórios; `unidade` deve ser `un` ou `L` | 400 |
| Cadastro de peça | `saldo` e `custoUnitario` não podem ser informados | 400 |
| Cadastro de peça | `estoqueMinimo`, se informado, ≥ 0 (inteiro para `un`) | 400 |
| Cadastro de peça | Código único (após normalizar) | 409 |
| Entrada | `quantidade` e `custoUnitario` > 0 | 400 |
| Entrada | Peça em `un` só aceita quantidade inteira | 400 |
| Entrada | Custo da peça passa a ser o da **última compra** | — |
| Reposição | `abaixoDoMinimo` só aceita `true` | 400 |
| Abertura de O.S. | `maquinaId` inteiro / máquina existe | 400 / 404 |
| Abertura de O.S. | Máquina sem outra O.S. aberta | 409 |
| Abertura de O.S. | `tipo` (`Preventiva`/`Corretiva`), `descricao` e `horimetro` válidos | 400 |
| Abertura de O.S. | Horímetro ≥ atual | 400 |
| Abertura de O.S. | Máquina em campo: a saída é encerrada automaticamente | — |
| Fechamento de O.S. | O.S. existe e está `Aberta` | 404 / 409 |
| Fechamento de O.S. | `pecas`, se informado, é lista; itens com `pecaId` inteiro e `quantidade` > 0 | 400 |
| Fechamento de O.S. | Toda peça existe; sem repetição; inteira se `un` | 404 / 400 / 400 |
| Fechamento de O.S. | Saldo suficiente de **todas** as peças (tudo ou nada) | 409 |
| Fechamento de O.S. | Custo de cada peça congelado no item | — |
| Consultas de O.S. | `status`, se informado, é `Aberta` ou `Fechada` | 400 |

### Anatomia de uma rota com validação

Todas as rotas de escrita seguem o mesmo esqueleto. **Use-o como molde:**

```ts
app.post('/recurso/:id/acao', (req, res) => {
  // 1. Buscar o recurso
  const item = lista.find(i => i.id === parseInt(req.params.id));

  // 2. Existe?                         -> 404
  if (!item) return res.status(404).json({ erro: '...' });

  // 3. O estado permite a ação?         -> 409
  if (item.status !== 'X') return res.status(409).json({ erro: '...' });

  // 4. Os dados vieram no formato certo? -> 400
  const { campo } = req.body ?? {};
  if (typeof campo !== 'string') return res.status(400).json({ erro: '...' });

  // 5. As regras de negócio são atendidas? -> 400
  if (/* regra violada */) return res.status(400).json({ erro: '...' });

  // 6. Caminho feliz: altera os dados e responde
  item.status = 'Y';
  res.json({ mensagem: '...', item });
});
```

---

## 8. Como criar um projeto semelhante

### Passo 1 — Criar o projeto do zero

```bash
mkdir meu-backend && cd meu-backend
npm init -y
npm install express
npm install -D typescript tsx @types/express @types/node
```

Crie o `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "commonjs",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true
  }
}
```

Adicione o script no `package.json`:

```json
"scripts": {
  "dev": "tsx watch server.ts"
}
```

### Passo 2 — Esqueleto do `server.ts`

```ts
import express, { Request, Response, NextFunction } from 'express';

const app = express();
app.disable('x-powered-by');
app.use(express.json());

// 1) Tipos
// 2) Dados em memória
// 3) Rotas

// 4) 404 genérico
app.use((req: Request, res: Response) => {
  res.status(404).json({ erro: `Rota ${req.method} ${req.path} não existe` });
});

// 5) Tratador de erros (sempre o último)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição' });
  }
  console.error(err);
  res.status(500).json({ erro: 'Erro interno no servidor' });
});

app.listen(3000, () => console.log('Servidor em http://localhost:3000'));
```

### Passo 3 — Modelar o seu domínio

O padrão desta API (**um recurso com status + movimentações de "sai e volta"**) se aplica a muitos negócios:

| Neste projeto | Biblioteca | Locadora de ferramentas | Frota de veículos |
|---|---|---|---|
| Máquina | Livro | Ferramenta | Veículo |
| `horimetro` | — | horas de uso | quilometragem |
| Saída | Empréstimo | Locação | Retirada |
| Retorno | Devolução | Devolução | Devolução |
| `operador` | leitor | cliente | motorista |
| `frenteTrabalho` | — | obra | destino |
| `avarias` | danos ao livro | defeitos | avarias |
| Movimentação | Empréstimo | Contrato | Viagem |

O padrão do estoque (**catálogo + histórico de movimentos que explica o saldo**) também é muito comum:

| Neste projeto | Loja | Farmácia | Banco |
|---|---|---|---|
| Peça | Produto | Medicamento | Conta |
| Saldo | Estoque | Estoque | Saldo |
| Entrada | Compra do fornecedor | Recebimento | Depósito |
| Saída | Venda | Dispensação | Saque |
| Kardex | Movimentação de estoque | Controle de lotes | Extrato |
| Estoque mínimo | Ponto de pedido | Estoque de segurança | Limite de alerta |

### Pratique antes

Antes de começar um projeto do zero, resolva os [exercícios](docs/exercicios.md). São 8 desafios que acrescentam funcionalidades reais a esta API: buscar por id, filtros, cadastro, regras entre entidades, indicadores e exclusão com integridade referencial. O [gabarito](docs/gabarito.md) traz as soluções comentadas.

### Checklist para o seu projeto

- [ ] Definir os **tipos** (`interface`) e os **status** possíveis (`type` com união)
- [ ] Desenhar o **ciclo de vida** (quais transições de status são permitidas)
- [ ] Para cada rota de escrita, listar as validações: **existe → estado → formato → regra**
- [ ] Escolher o **código HTTP** certo para cada erro
- [ ] Registrar um **histórico** das ações (quem, quando, o quê)
- [ ] Garantir que todo **saldo/total** seja explicável pelo histórico (nada muda "por fora")
- [ ] Em operações com várias entidades, **validar tudo antes de alterar** (tudo ou nada)
- [ ] Quando uma regra for usada em dois lugares, **extrair uma função** em vez de copiar
- [ ] Adicionar o **404 genérico** e o **tratador de erros**
- [ ] Escrever o **roteiro de testes** com curl, incluindo os casos de erro, e não só o de sucesso

---

## 9. Problemas comuns

| Sintoma | Causa | Solução |
|---|---|---|
| `JSON inválido` mesmo com o JSON aparentemente certo | Aspas escapadas (`\"`) no Git Bash | No Git Bash use `'{"campo":"valor"}'`, sem barras |
| O mesmo comando falha no PowerShell | O PowerShell 5.1 trata as aspas de outro jeito | No PowerShell use `'{\"campo\":\"valor\"}'` |
| `curl` no PowerShell retorna um objeto estranho | No PowerShell, `curl` é apelido do `Invoke-WebRequest` | Use sempre `curl.exe` |
| "Campo obrigatório" mesmo enviando o JSON | Falta o cabeçalho `-H "Content-Type: application/json"` | Sem ele, o `express.json()` não lê o corpo |
| `EADDRINUSE: address already in use :::3000` | Já existe um servidor rodando na porta 3000 | Feche o outro terminal (Ctrl+C) ou encerre o processo |
| `Cannot set headers after they are sent` | Faltou `return` antes de um `res.status(...).json(...)` | Todo retorno de erro precisa de `return` |
| Os dados sumiram | O servidor reiniciou (ao salvar um arquivo) | Comportamento esperado: os dados ficam em memória |
| Filtro com acento (ex.: `?status=Disponível`) não encontra nada | O terminal do Windows codifica o acento no padrão antigo (Latin-1) | Codifique a URL em UTF-8: `?status=Dispon%C3%ADvel`, ou use o `testes.http` |
| A URL com `?` não funciona no Bash | O `?` é interpretado pelo terminal | Coloque a URL entre aspas: `"http://...?maquinaId=1"` |

---

## 10. Limitações e próximos passos

### Limitações atuais (decisões do MVP)

- **Sem persistência:** os dados se perdem a cada reinício.
- **Sem autenticação:** todas as rotas são abertas.
- **Sem cadastro de máquinas pela API:** a lista inicial é fixa no código.
- **O.S. sem cancelamento e sem mão de obra:** uma O.S. aberta só termina pelo fechamento, e o custo considera apenas as peças.
- **Sem modo offline:** o uso assume conexão (sede, pátio ou oficina).

### Próximos passos

**Etapa 1, back-end em memória: ✅ concluída**
1. ✅ **Módulo de Uso:** saída, retorno, avarias e histórico.
2. ✅ **Módulo de Estoque:** cadastro de peças, entradas, kardex e estoque mínimo.
3. ✅ **Módulo de Manutenção:** abertura e fechamento de O.S., baixa automática no estoque, custo congelado e custo por máquina.

**Etapa 2:** front-end em Angular consumindo esta API.

**Futuro:** trocar os arrays em memória por PostgreSQL com Prisma ORM.

---

Contexto de negócio e decisões do projeto: [context.md](context.md)
