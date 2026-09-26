# Glossário — Agro Backend

Termos usados no treinamento, com uma explicação curta, um exemplo e onde cada um aparece no material.

**Legenda dos links:** 📘 [README](../README.md) · 🏋️ [Exercícios](exercicios.md) · ✅ [Gabarito](gabarito.md)

## Sumário

- [Termos do negócio](#termos-do-negócio)
- [Termos técnicos (A–Z)](#termos-técnicos-az)
- [Códigos de status HTTP](#códigos-de-status-http)
- [Métodos de array](#métodos-de-array)

---

## Termos do negócio

Vocabulário da gestão de frota agrícola. Entender o negócio vem **antes** de escrever código.

| Termo | Significado | No sistema |
|---|---|---|
| **Avaria** | Dano ou defeito observado na máquina (vazamento, pneu furado, peça quebrada) | Campo opcional `avarias`, informado no retorno |
| **Check-in / Check-out** | Registro de devolução e de retirada de um equipamento | Rotas de retorno e de saída |
| **Frente de trabalho** | Local ou área onde a máquina vai operar (talhão, lavoura, obra) | Campo `frenteTrabalho`, obrigatório na saída |
| **Frota** | Conjunto de máquinas e veículos da fazenda | Lista `maquinas` |
| **Horímetro** | "Relógio" da máquina que acumula as horas de funcionamento, como o odômetro de um carro acumula quilômetros. Nunca volta para trás | Campo `horimetro` |
| **Horas trabalhadas** | Diferença entre o horímetro no retorno e na saída | Campo calculado `horasTrabalhadas` |
| **Manutenção corretiva** | Conserto feito **depois** que o problema aparece | Futuro módulo de O.S. |
| **Manutenção preventiva** | Revisão programada para **evitar** problemas (ex.: troca de óleo a cada 250 h) | Futuro módulo de O.S. |
| **Movimentação** | Uma ida ao campo e o retorno da máquina | Tipo `Movimentacao` |
| **MVP** | *Minimum Viable Product* (Produto Mínimo Viável): a menor versão do sistema que já resolve o problema principal | Este projeto |
| **O.S. (Ordem de Serviço)** | Documento que registra uma manutenção: máquina, problema, peças usadas e custo | Próximo módulo |
| **Operador** | Pessoa que conduz a máquina no campo | Campo `operador`, obrigatório na saída |
| **Tag** | Código de identificação da máquina no pátio (ex.: `TR-01`) | Campo `tag` |
| **Talhão** | Divisão de uma área de plantio | Exemplo de frente de trabalho |

---

## Termos técnicos (A–Z)

### API
*Application Programming Interface.* Um conjunto de rotas que outros programas (front-end, aplicativo, outro sistema) usam para conversar com o servidor. Aqui, uma **API REST** que troca dados em **JSON**.
📘 [Visão geral da API](../README.md#3-visão-geral-da-api)

### Body (corpo da requisição)
Os dados enviados junto com a requisição, normalmente em `POST`, `PUT` e `PATCH`. No Express, ficam em `req.body` (depois do `express.json()`).
```bash
curl.exe -X POST ... -d '{"horimetro":1012}'   # o -d define o corpo
```
📘 [Parte 3](../README.md#parte-3--dados-obrigatórios-na-saída)

### Cabeçalho (header)
Informações extras que acompanham a requisição ou a resposta, fora do corpo. Exemplos: `Content-Type`, `X-Powered-By`. Para vê-los: `curl.exe -i`.
📘 [Parte 3.2](../README.md#parte-32--rota-inexistente-e-cabeçalho-do-servidor)

### Chave estrangeira (foreign key)
Campo que guarda o **id de um registro de outra lista/tabela**, criando uma relação entre eles.
```ts
maquinaId: number;  // aponta para Maquina.id
```
📘 [Parte 5](../README.md#parte-5--histórico-de-movimentações) · 🏋️ [Exercício 8](exercicios.md#exercício-8--excluir-máquina)

### Coalescência nula (`??`)
Operador que usa um valor alternativo quando o primeiro é `null` ou `undefined`.
```ts
const { operador } = req.body ?? {};   // se req.body for undefined, usa {}
```
📘 [Parte 3](../README.md#parte-3--dados-obrigatórios-na-saída)

### Constante nomeada
Um valor fixo com um nome que explica o seu significado, em vez de um "número mágico" solto no código.
```ts
const LIMITE_HORAS_POR_SAIDA = 24;
```
🏋️ [Exercício 5](exercicios.md#exercício-5--limite-de-horas-por-saída)

### Content-Type
Cabeçalho que informa o **formato** do corpo. Sem `Content-Type: application/json`, o `express.json()` não lê o corpo e `req.body` fica vazio.
📘 [Problemas comuns](../README.md#9-problemas-comuns)

### curl
Programa de linha de comando para fazer requisições HTTP. No Windows, use `curl.exe` (no PowerShell, `curl` sozinho é outro comando).
📘 [Roteiro de testes](../README.md#6-roteiro-completo-de-testes-com-curl)

### Dados derivados
Informações **calculadas** a partir de outras, em vez de armazenadas. Nunca ficam desatualizadas. Exemplos: `horasTrabalhadas` e o resumo da máquina.
🏋️ [Exercício 7](exercicios.md#exercício-7--resumo-de-uso-da-máquina)

### Desestruturação
Sintaxe para extrair vários campos de um objeto de uma só vez.
```ts
const { operador, frenteTrabalho } = req.body;
// equivale a:
// const operador = req.body.operador;
// const frenteTrabalho = req.body.frenteTrabalho;
```
📘 [Parte 3](../README.md#parte-3--dados-obrigatórios-na-saída)

### Endpoint / Rota
A combinação de **método HTTP + caminho** que o servidor sabe atender, por exemplo `POST /maquinas/:id/saida`.
📘 [Visão geral da API](../README.md#3-visão-geral-da-api)

### Express
Framework para Node.js que facilita criar servidores HTTP: define rotas, lê requisições e monta respostas.
📘 [Ponto de partida](../README.md#ponto-de-partida)

### Guard clause (retorno antecipado)
Técnica de verificar cada problema no início da função e **sair logo** com `return`, deixando o "caminho feliz" no final, sem `if/else` aninhados.
```ts
if (!maquina) return res.status(404).json({ erro: '...' });
if (maquina.status !== 'Disponível') return res.status(409).json({ erro: '...' });
// caminho feliz
```
📘 [Parte 2](../README.md#parte-2--saída-só-com-a-máquina-disponível)

### Integridade referencial
Garantia de que uma referência (chave estrangeira) sempre aponta para um registro que existe. Por isso não se apaga uma máquina que tem movimentações.
🏋️ [Exercício 8](exercicios.md#exercício-8--excluir-máquina)

### Interface
Em TypeScript, define o **formato** de um objeto: quais campos ele tem e de que tipo.
```ts
interface Maquina { id: number; tag: string; /* ... */ }
```
📘 [Parte 1](../README.md#parte-1--tipos-com-typescript)

### ISO 8601
Padrão internacional para datas e horas em texto: `2026-09-26T18:22:48.787Z`. O `Z` no final indica **UTC**. Gerado com `new Date().toISOString()`.
📘 [Parte 5](../README.md#parte-5--histórico-de-movimentações)

### JSON
*JavaScript Object Notation.* Formato de texto para trocar dados entre sistemas. Os nomes dos campos **sempre** vão entre aspas duplas.
```json
{ "operador": "Joao", "horimetro": 1012 }
```

### Middleware
Função por onde a requisição passa **antes ou depois** das rotas. É executada na ordem em que foi declarada (o "funil"). Exemplo: `express.json()`.
📘 [Parte 3.1](../README.md#parte-31--tratador-de-erros-segurança) · [Parte 3.2](../README.md#parte-32--rota-inexistente-e-cabeçalho-do-servidor)

### Middleware de erro
Middleware especial com **4 parâmetros** `(err, req, res, next)`, chamado quando algo lança um erro. Deve ser o **último** `app.use`.
📘 [Parte 3.1](../README.md#parte-31--tratador-de-erros-segurança)

### Modo watch
Execução que observa os arquivos e **reinicia** o programa automaticamente a cada alteração salva (`tsx watch`).
📘 [Parte 0](../README.md#parte-0--script-de-desenvolvimento)

### Normalização
Padronizar um dado antes de gravar ou comparar, como remover espaços e deixar em maiúsculas, para que `" pv-03 "` e `"PV-03"` sejam o mesmo valor.
🏋️ [Exercício 4](exercicios.md#exercício-4--cadastrar-máquina)

### Optional chaining (`?.`)
Acessa uma propriedade só se o objeto existir. Caso contrário, resulta em `undefined` em vez de dar erro.
```ts
maquinaEmUso?.tag
```
🏋️ [Exercício 6](exercicios.md#exercício-6--um-operador-uma-máquina)

### Parâmetro de rota
Parte **variável** do caminho, que **identifica** um recurso. Lido com `req.params` e sempre chega como texto.
```ts
app.get('/maquinas/:id', ...)   // /maquinas/1  ->  req.params.id === '1'
```
📘 [Ponto de partida](../README.md#ponto-de-partida)

### Ponto flutuante
Forma como o computador guarda números decimais, que nem sempre é exata: `1012.3 - 1000` resulta em `12.299999999999955`. Resolve-se arredondando: `Math.round(x * 10) / 10`.
📘 [Parte 5](../README.md#parte-5--histórico-de-movimentações)

### Query string
Parâmetros **opcionais** no final da URL, depois do `?`, usados geralmente para **filtros**. Lidos com `req.query`.
```
/movimentacoes?maquinaId=1
```
📘 [Parte 5](../README.md#parte-5--histórico-de-movimentações) · 🏋️ [Exercício 2](exercicios.md#exercício-2--filtrar-máquinas-por-status)

### Regra de negócio
Regra que vem do **funcionamento real da empresa**, não da tecnologia. Exemplo: "o horímetro nunca anda para trás".
📘 [Regras de negócio](../README.md#regras-de-negócio)

### REST
Estilo de API em que os **recursos** (máquinas, movimentações) são identificados por URLs e as **ações** são indicadas pelos métodos HTTP (`GET` lê, `POST` cria/executa, `DELETE` remove...).
📘 [Ponto de partida](../README.md#ponto-de-partida)

### Script npm
Atalho definido em `"scripts"` no `package.json` e executado com `npm run <nome>`.
```json
"scripts": { "dev": "tsx watch server.ts" }
```
📘 [Parte 0](../README.md#parte-0--script-de-desenvolvimento)

### Soft delete
"Exclusão lógica": em vez de apagar o registro, ele é marcado como inativo. Preserva o histórico para auditoria.
🏋️ [Exercício 8](exercicios.md#exercício-8--excluir-máquina)

### Stack trace
Lista das funções que estavam sendo executadas quando um erro aconteceu. Útil para quem desenvolve, **perigosa** se exposta ao cliente, porque revela a estrutura interna do servidor.
📘 [Parte 3.1](../README.md#parte-31--tratador-de-erros-segurança)

### Template string
Texto entre crases que aceita valores embutidos com `${...}`.
```ts
`Máquina ${maquina.tag} não pode sair`
```
📘 [Parte 2](../README.md#parte-2--saída-só-com-a-máquina-disponível)

### Tipo união
Tipo que aceita **apenas** um conjunto fechado de valores.
```ts
type StatusMaquina = 'Disponível' | 'Em Operação' | 'Em Manutenção';
```
📘 [Parte 1](../README.md#parte-1--tipos-com-typescript)

### tsx
Ferramenta que executa arquivos TypeScript diretamente, sem compilar antes. Substituiu o `ts-node` neste projeto por ser compatível com o Node 24.
📘 [Parte 0](../README.md#parte-0--script-de-desenvolvimento)

### Type assertion (afirmação de tipo)
Dizer ao TypeScript "trate este valor como o tipo X" com `as`. Não faz nenhuma verificação de verdade, então use com cuidado.
```ts
statusValidos.includes(status as StatusMaquina)
```
✅ [Gabarito do exercício 2](gabarito.md#exercício-2--filtrar-máquinas-por-status)

### TypeScript
JavaScript com **tipos**. Aponta erros enquanto você escreve o código, antes de executar. Não valida os dados que chegam pela rede: para isso, existe a validação manual.
📘 [Parte 1](../README.md#parte-1--tipos-com-typescript)

### Unicidade
Regra que impede dois registros com o mesmo valor num campo (ex.: duas máquinas com a tag `PV-03`). A violação responde **409**.
🏋️ [Exercício 4](exercicios.md#exercício-4--cadastrar-máquina)

### URL encoding
Codificação de caracteres especiais em URLs: espaço vira `%20`, `í` vira `%C3%AD`, `ç` vira `%C3%A7`. Navegadores e o Angular fazem isso automaticamente; no terminal, às vezes é preciso escrever à mão.
🏋️ [Exercício 2](exercicios.md#exercício-2--filtrar-máquinas-por-status)

### UTC
Horário universal de referência (sem fuso horário). As datas são gravadas em UTC, e o front-end converte para o horário local ao exibir. O Brasil (Brasília) fica 3 horas atrás do UTC.

### Validação
Conferir os dados antes de usá-los. Neste projeto ela é **manual** (com `if`) e segue sempre a ordem: **existe → estado → formato → regra de negócio**.
📘 [Anatomia de uma rota com validação](../README.md#anatomia-de-uma-rota-com-validação)

### X-Powered-By
Cabeçalho que o Express envia por padrão e que revela a tecnologia do servidor. Foi desativado com `app.disable('x-powered-by')`.
📘 [Parte 3.2](../README.md#parte-32--rota-inexistente-e-cabeçalho-do-servidor)

---

## Códigos de status HTTP

| Código | Nome | Significado | Neste projeto |
|---|---|---|---|
| **200** | OK | Deu certo | Saída, retorno, listagens |
| **201** | Created | Um recurso foi **criado** | Cadastro de máquina (🏋️ ex. 4) |
| **204** | No Content | Deu certo, **sem corpo** na resposta | Exclusão de máquina (🏋️ ex. 8) |
| **400** | Bad Request | O **pedido** está errado (campo faltando, tipo errado, JSON quebrado) | Validações de formato e de regra |
| **404** | Not Found | O recurso ou a rota **não existe** | Máquina 99, `GET /xyz` |
| **409** | Conflict | O pedido está certo, mas o **estado atual** impede a ação | Saída de máquina já em operação |
| **422** | Unprocessable Entity | Alternativa ao 400 para **regras de negócio** (não usado aqui) | Ver a discussão na Parte 4 |
| **500** | Internal Server Error | Erro **inesperado** no servidor | Tratador de erros genérico |

**Regra prática:** códigos **2xx** = sucesso, **4xx** = erro de quem chamou, **5xx** = erro do servidor.

📘 [Códigos HTTP usados](../README.md#códigos-http-usados)

---

## Métodos de array

| Método | Devolve | Uso típico | Exemplo no projeto |
|---|---|---|---|
| `find` | O **primeiro** item que atende à condição, ou `undefined` | Buscar por id | `maquinas.find(m => m.id === id)` |
| `filter` | **Todos** os itens que atendem (nova lista) | Filtros, remover itens | `movimentacoes.filter(mov => mov.maquinaId === 1)` |
| `some` | `true`/`false`: **algum** item atende? | Checar existência | `maquinas.some(m => m.tag === 'PV-03')` |
| `includes` | `true`/`false`: o valor está na lista? | Lista de valores válidos | `statusValidos.includes(status)` |
| `map` | Nova lista com cada item **transformado** | Montar respostas | `lista.map(mov => ({ descricao: mov.avarias }))` |
| `reduce` | **Um único valor** acumulado | Somas e totais | `lista.reduce((soma, mov) => soma + mov.horas, 0)` |
| `push` | Acrescenta um item **ao final** (altera a lista) | Gravar em memória | `movimentacoes.push(movimentacao)` |

🏋️ Exercícios [3](exercicios.md#exercício-3--histórico-de-uma-máquina), [4](exercicios.md#exercício-4--cadastrar-máquina) e [7](exercicios.md#exercício-7--resumo-de-uso-da-máquina)
