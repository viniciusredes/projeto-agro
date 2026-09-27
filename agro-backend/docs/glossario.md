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
| **Almoxarifado** | Depósito onde ficam guardadas as peças e os materiais de manutenção | Módulo de Estoque (`/pecas`) |
| **Avaria** | Dano ou defeito observado na máquina (vazamento, pneu furado, peça quebrada) | Campo opcional `avarias`, informado no retorno |
| **Check-in / Check-out** | Registro de devolução e de retirada de um equipamento | Rotas de retorno e de saída |
| **Custo da última compra** | Regra em que o custo da peça passa a ser o valor pago na compra mais recente | Regra adotada na entrada de estoque |
| **Custo médio ponderado** | Custo que mistura o estoque atual com a compra nova, proporcional às quantidades: `(saldo × custo atual + qtd × custo novo) / (saldo + qtd)`. O mais usado no Brasil | Alternativa discutida na Parte E4 |
| **Entrada de estoque** | Registro de peças que chegaram ao almoxarifado (compra) | `POST /pecas/:id/entradas` |
| **Estoque mínimo** | Quantidade abaixo da qual a peça deve ser comprada novamente (também chamado de *ponto de pedido*) | Campo `estoqueMinimo` e filtro `?abaixoDoMinimo=true` |
| **Frente de trabalho** | Local ou área onde a máquina vai operar (talhão, lavoura, obra) | Campo `frenteTrabalho`, obrigatório na saída |
| **Frota** | Conjunto de máquinas e veículos da fazenda | Lista `maquinas` |
| **Horímetro** | "Relógio" da máquina que acumula as horas de funcionamento, como o odômetro de um carro acumula quilômetros. Nunca volta para trás | Campo `horimetro` |
| **Horas trabalhadas** | Diferença entre o horímetro no retorno e na saída | Campo calculado `horasTrabalhadas` |
| **Kardex** | Ficha com todos os movimentos de um item do estoque (entradas e saídas), como um extrato bancário. O saldo é o resultado desses movimentos | `GET /pecas/:id/movimentos` |
| **Manutenção corretiva** | Conserto feito **depois** que o problema aparece | `tipo: "Corretiva"` na O.S. |
| **Manutenção preventiva** | Revisão programada para **evitar** problemas (ex.: troca de óleo a cada 250 h) | `tipo: "Preventiva"` na O.S. |
| **Movimentação** | Uma ida ao campo e o retorno da máquina | Tipo `Movimentacao` |
| **MVP** | *Minimum Viable Product* (Produto Mínimo Viável): a menor versão do sistema que já resolve o problema principal | Este projeto |
| **O.S. (Ordem de Serviço)** | Documento que registra uma manutenção: máquina, problema, peças usadas e custo | Módulo de Manutenção (`/ordens-servico`) |
| **Baixa de estoque** | Retirada de peças do saldo porque foram consumidas (aqui, no fechamento da O.S.) | Movimento `saida` no kardex |
| **Custo congelado** | O custo da peça é copiado para a O.S. no momento da baixa; compras futuras não alteram manutenções antigas | `custoUnitario` do item da O.S. |
| **Operador** | Pessoa que conduz a máquina no campo | Campo `operador`, obrigatório na saída |
| **PEPS / FIFO** | "Primeiro que Entra, Primeiro que Sai": cada lote comprado mantém o seu custo, e o mais antigo é consumido primeiro | Alternativa discutida na Parte E4 |
| **Saldo de implantação** | Quantidade que já existia no estoque quando o sistema começou a ser usado | Movimento do tipo `implantacao` |
| **Tag** | Código de identificação da máquina no pátio (ex.: `TR-01`) | Campo `tag` |
| **Talhão** | Divisão de uma área de plantio | Exemplo de frente de trabalho |

---

## Termos técnicos (A–Z)

### ACID / Transação
Garantias de um banco de dados ao gravar várias alterações juntas. O **A** (*atomicidade*) é o "tudo ou nada": ou todas as alterações acontecem, ou nenhuma. Em memória, conseguimos o mesmo efeito **validando tudo antes de alterar qualquer dado**.
📘 [Parte OS5](../README.md#parte-os5--validar-as-peças-do-fechamento-tudo-ou-nada)

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

### Desnormalização
Guardar uma **cópia** de um dado que já existe em outro lugar, para facilitar a leitura ou preservar um valor histórico. O item da O.S. copia o `codigo` e o `custoUnitario` da peça.
📘 [Parte OS1](../README.md#parte-os1--modelo-da-ordem-de-serviço-e-listagem)

### Desestruturação
Sintaxe para extrair vários campos de um objeto de uma só vez.
```ts
const { operador, frenteTrabalho } = req.body;
// equivale a:
// const operador = req.body.operador;
// const frenteTrabalho = req.body.frenteTrabalho;
```
📘 [Parte 3](../README.md#parte-3--dados-obrigatórios-na-saída)

### Documento com itens (cabeçalho + linhas)
Estrutura de nota fiscal, pedido e O.S.: um **cabeçalho** com os dados gerais e uma **lista de itens**. Num banco de dados, vira duas tabelas numa relação **um para muitos**.
📘 [Parte OS1](../README.md#parte-os1--modelo-da-ordem-de-serviço-e-listagem)

### DRY (Don't Repeat Yourself)
Princípio de não repetir a mesma regra em vários lugares. Quando a regra de fechar a movimentação passou a ser usada por duas rotas, ela foi **extraída** para uma função, em vez de copiada.
📘 [Parte OS3](../README.md#parte-os3--abrir-os-com-a-máquina-em-campo)

### Endpoint / Rota
A combinação de **método HTTP + caminho** que o servidor sabe atender, por exemplo `POST /maquinas/:id/saida`.
📘 [Visão geral da API](../README.md#3-visão-geral-da-api)

### Express
Framework para Node.js que facilita criar servidores HTTP: define rotas, lê requisições e monta respostas.
📘 [Ponto de partida](../README.md#ponto-de-partida)

### Função auxiliar
Função pequena, com um nome que explica a intenção, criada para não repetir a mesma lógica em vários lugares.
```ts
function arredondar(valor: number, casas: number): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}
```
📘 [Parte E4](../README.md#parte-e4--entrada-de-estoque-compra)

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

### Join (juntar dados)
Montar uma resposta combinando registros relacionados: a O.S. guarda só o `maquinaId`, e a API devolve junto a `tag` e o `modelo` da máquina. É o equivalente ao `JOIN` do SQL.
📘 [Parte OS7](../README.md#parte-os7--detalhe-da-os-e-custo-por-máquina)

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

### Refatoração
Mudar a **estrutura** do código sem mudar o seu **comportamento**, por exemplo extraindo uma função. Os testes automatizados (`testes.sh`) garantem que nada quebrou.
📘 [Parte OS3](../README.md#parte-os3--abrir-os-com-a-máquina-em-campo)

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

### Spread (`...`)
Copia todos os campos de um objeto para um objeto **novo**, permitindo acrescentar ou sobrescrever campos sem alterar o original.
```ts
const comAlerta = { ...peca, faltaParaMinimo: 1 };   // 'peca' continua igual
```
📘 [Parte E6](../README.md#parte-e6--estoque-mínimo-e-alerta-de-reposição)

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

### União discriminada
Tipo que pode ter formatos diferentes, separados por um campo comum. Depois de testar esse campo, o TypeScript sabe qual formato está em uso.
```ts
type Resultado = { ok: true; itens: Item[] } | { ok: false; status: number; erro: string };
```
📘 [Parte OS5](../README.md#parte-os5--validar-as-peças-do-fechamento-tudo-ou-nada)

### Unicidade
Regra que impede dois registros com o mesmo valor num campo (ex.: duas máquinas com a tag `PV-03`). A violação responde **409**.
🏋️ [Exercício 4](exercicios.md#exercício-4--cadastrar-máquina)

### `unknown` × `any`
Os dois aceitam qualquer valor, mas com `unknown` o TypeScript **obriga** a checar o tipo antes de usar. Com `any`, ele deixa passar tudo. `unknown` é o mais seguro para dados que vêm de fora.
📘 [Parte OS5](../README.md#parte-os5--validar-as-peças-do-fechamento-tudo-ou-nada)

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
| **201** | Created | Um recurso foi **criado** | Cadastro de peça; cadastro de máquina (🏋️ ex. 4) |
| **204** | No Content | Deu certo, **sem corpo** na resposta | Exclusão de máquina (🏋️ ex. 8) |
| **400** | Bad Request | O **pedido** está errado (campo faltando, tipo errado, JSON quebrado) | Validações de formato e de regra |
| **404** | Not Found | O recurso ou a rota **não existe** | Máquina 99, `GET /xyz` |
| **409** | Conflict | O pedido está certo, mas o **estado atual** impede a ação | Saída de máquina já em operação |
| **422** | Unprocessable Entity | Alternativa ao 400 para **regras de negócio** (não usado aqui) | Ver a discussão na Parte 4 |
| **501** | Not Implemented | O servidor **ainda não sabe** fazer aquilo | Usado de forma provisória durante a construção da O.S. (Parte OS4) |
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
