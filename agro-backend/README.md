# Agro Backend — Gestão de Frota Agrícola (MVP)

> **Material de apoio do treinamento.** Este README explica **como executar** o projeto, **como ele foi construído**, passo a passo, e **quais conceitos** cada funcionalidade ensina. Use-o também como modelo para construir APIs parecidas em outros domínios.
>
> 📖 Encontrou um termo desconhecido? Consulte o [glossário](docs/glossario.md). Para praticar, veja os [exercícios](docs/exercicios.md).

API REST para controlar o uso de máquinas agrícolas: saída para o campo, retorno com horímetro, registro de avarias e histórico de movimentações.

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

> ⚠️ **Os dados zeram a cada reinício.** Como tudo fica em memória, ao salvar o arquivo (o servidor reinicia sozinho) as máquinas voltam ao estado inicial e o histórico fica vazio.

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

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/maquinas` | Lista as máquinas |
| `POST` | `/maquinas/:id/saida` | Registra a saída da máquina para o campo |
| `POST` | `/maquinas/:id/retorno` | Registra o retorno, o horímetro e as avarias |
| `GET` | `/movimentacoes` | Lista o histórico (filtro opcional `?maquinaId=`) |

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
           (abre movimentação)              (fecha movimentação)
```

O status `Em Manutenção` já existe no tipo e será usado no módulo de Ordens de Serviço.

---

## 5. Construção passo a passo

O projeto foi construído em **partes pequenas**. Cada parte traz: 🎯 o **objetivo**, 🧩 o **código**, 📚 os **conceitos** e 🧪 os **testes**.

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

## 6. Roteiro completo de testes com curl

> 🤖 **Rodar tudo de uma vez:** com o servidor recém-iniciado, execute `bash testes.sh`. O script roda os 25 cenários abaixo e mostra ✅ ou ❌ em cada um, com o que era esperado e o que foi recebido quando algo falha. Use-o para conferir se a sua implementação está correta.
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

> **Dica:** para ver só o código HTTP de cada resposta, acrescente `-w "  [%{http_code}]\n"` ao comando.

---

## 7. Referência rápida

### Códigos HTTP usados

| Código | Quando usar | Exemplo nesta API |
|---|---|---|
| **200 OK** | Deu certo | Saída ou retorno registrados |
| **400 Bad Request** | O cliente enviou dados inválidos | Campo faltando, tipo errado, JSON quebrado |
| **404 Not Found** | Recurso ou rota inexistente | Máquina 99, `GET /xyz` |
| **409 Conflict** | O estado atual impede a ação | Saída de máquina já em operação |
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

### Pratique antes

Antes de começar um projeto do zero, resolva os [exercícios](docs/exercicios.md). São 8 desafios que acrescentam funcionalidades reais a esta API: buscar por id, filtros, cadastro, regras entre entidades, indicadores e exclusão com integridade referencial. O [gabarito](docs/gabarito.md) traz as soluções comentadas.

### Checklist para o seu projeto

- [ ] Definir os **tipos** (`interface`) e os **status** possíveis (`type` com união)
- [ ] Desenhar o **ciclo de vida** (quais transições de status são permitidas)
- [ ] Para cada rota de escrita, listar as validações: **existe → estado → formato → regra**
- [ ] Escolher o **código HTTP** certo para cada erro
- [ ] Registrar um **histórico** das ações (quem, quando, o quê)
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
- **Sem modo offline:** o uso assume conexão (sede, pátio ou oficina).

### Próximos passos

**Etapa 1, back-end em memória (continuação):**
1. **Módulo de Estoque:** cadastro e listagem de peças, com saldo e custo unitário (valor da última compra).
2. **Módulo de Manutenção (O.S.):** abrir O.S. preventiva ou corretiva (a máquina vai para `Em Manutenção`) e fechar a O.S. com **baixa automática** das peças e cálculo do custo total.

**Etapa 2:** front-end em Angular consumindo esta API.

**Futuro:** trocar os arrays em memória por PostgreSQL com Prisma ORM.

---

Contexto de negócio e decisões do projeto: [context.md](context.md)
