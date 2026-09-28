# Exercícios — Agro Backend

Desafios para praticar os conceitos do treinamento. Cada exercício acrescenta uma funcionalidade real à API de gestão de frota.

> **Antes de começar**
> - Leia o [README](../README.md), principalmente a seção **"Anatomia de uma rota com validação"**.
> - Resolva **na ordem**: os exercícios ficam mais difíceis aos poucos.
> - Novas rotas devem ser declaradas **antes** do tratador de 404 (o "funil" da Parte 3.2).
> - Depois de cada exercício, rode `bash testes.sh` para garantir que **nada do que já funcionava quebrou**.
> - Só consulte o [gabarito](gabarito.md) depois de tentar. Errar faz parte do aprendizado!

## Sumário

| # | Nível | Exercício | Conceitos principais |
|---|---|---|---|
| 1 | 🟢 Básico | [Buscar uma máquina pelo id](#exercício-1--buscar-uma-máquina-pelo-id) | Parâmetro de rota, 400 × 404 |
| 2 | 🟢 Básico | [Filtrar máquinas por status](#exercício-2--filtrar-máquinas-por-status) | Query string, lista de valores válidos |
| 3 | 🟢 Básico | [Histórico de uma máquina](#exercício-3--histórico-de-uma-máquina) | Rotas aninhadas, `filter` |
| 4 | 🟡 Intermediário | [Editar máquina](#exercício-4--editar-máquina) | `PATCH`, atualização parcial, campos protegidos, unicidade (409) |
| 5 | 🟡 Intermediário | [Limite de horas por saída](#exercício-5--limite-de-horas-por-saída) | Regra de negócio, constantes |
| 6 | 🟡 Intermediário | [Um operador, uma máquina](#exercício-6--um-operador-uma-máquina) | Regra entre entidades, comparação de texto |
| 7 | 🔴 Desafio | [Resumo de uso da máquina](#exercício-7--resumo-de-uso-da-máquina) | `reduce`, `map`, dados calculados |
| 8 | 🔴 Desafio | [Excluir máquina](#exercício-8--excluir-máquina) | `DELETE`, 204, integridade referencial |

---

## Exercício 1 — Buscar uma máquina pelo id

🟢 **Básico**

**Contexto:** o front-end precisa exibir a tela de detalhes de uma única máquina.

**O que fazer:** criar a rota `GET /maquinas/:id`.

**Regras:**

| Situação | Resposta |
|---|---|
| Máquina encontrada | **200** com a máquina |
| `id` não é um número inteiro (ex.: `/maquinas/abc`) | **400** `{ "erro": "O id deve ser um número inteiro" }` |
| Máquina não existe | **404** `{ "erro": "Máquina não encontrada" }` |

**Conceitos praticados:** parâmetro de rota (`req.params`), `Number.isInteger`, diferença entre **400** (pedido malformado) e **404** (recurso inexistente).

**Testes:**

```bash
curl.exe -i http://localhost:3000/maquinas/1     # 200
curl.exe -i http://localhost:3000/maquinas/99    # 404
curl.exe -i http://localhost:3000/maquinas/abc   # 400
```

💡 **Dica:** `Number('abc')` resulta em `NaN`, e `Number.isInteger(NaN)` é `false`.

---

## Exercício 2 — Filtrar máquinas por status

🟢 **Básico**

**Contexto:** o encarregado quer ver rapidamente quais máquinas estão livres no pátio.

**O que fazer:** alterar a rota `GET /maquinas` para aceitar o filtro opcional `?status=`.

**Regras:**

| Situação | Resposta |
|---|---|
| Sem filtro | **200** com todas as máquinas (comportamento atual) |
| Filtro válido | **200** só com as máquinas daquele status (pode ser uma lista vazia `[]`) |
| Status que não existe (ex.: `?status=Quebrada`) | **400** `{ "erro": "Status inválido. Use: Disponível, Em Operação, Em Manutenção" }` |

**Conceitos praticados:** query string (`req.query`), filtro opcional, validação contra uma lista de valores permitidos (`includes`).

**Testes:**

```bash
curl.exe "http://localhost:3000/maquinas?status=Dispon%C3%ADvel"          # 200 (Disponível)
curl.exe "http://localhost:3000/maquinas?status=Em%20Opera%C3%A7%C3%A3o"  # 200 (Em Operação)
curl.exe -i "http://localhost:3000/maquinas?status=Quebrada"               # 400
```

⚠️ **Por que `%C3%AD` em vez de `í`?** Em uma URL, acentos e espaços precisam ser **codificados** (*URL encoding*): `í` vira `%C3%AD`, `ç` vira `%C3%A7`, `ã` vira `%C3%A3` e o espaço vira `%20`. O terminal do Windows às vezes codifica os acentos no padrão antigo (Latin-1), e aí o servidor recebe um texto diferente de `Disponível`. Navegadores, o Angular e a extensão REST Client fazem essa codificação corretamente, de forma automática.

💡 **Dica:** crie uma lista com os status válidos (`const statusValidos: StatusMaquina[] = [...]`) e use `statusValidos.includes(...)`.

---

## Exercício 3 — Histórico de uma máquina

🟢 **Básico**

**Contexto:** na tela de detalhes da máquina, o front-end quer mostrar o histórico de saídas **daquela** máquina.

**O que fazer:** criar a rota `GET /maquinas/:id/movimentacoes`.

**Regras:**

| Situação | Resposta |
|---|---|
| Máquina existe | **200** com as movimentações dela (pode ser `[]`) |
| Máquina não existe | **404** `{ "erro": "Máquina não encontrada" }` |

**Conceitos praticados:** rotas aninhadas (sub-recursos), `Array.filter`.

**Testes:**

```bash
curl.exe -X POST http://localhost:3000/maquinas/1/saida -H "Content-Type: application/json" -d '{"operador":"Joao","frenteTrabalho":"Talhao 5"}'
curl.exe http://localhost:3000/maquinas/1/movimentacoes      # 200, 1 movimentação
curl.exe http://localhost:3000/maquinas/2/movimentacoes      # 200, []
curl.exe -i http://localhost:3000/maquinas/99/movimentacoes  # 404
```

🤔 **Para pensar:** já existe `GET /movimentacoes?maquinaId=1`. Qual a diferença para `GET /maquinas/1/movimentacoes`? (Resposta: a rota aninhada deixa claro que movimentações *pertencem* a uma máquina e devolve 404 se a máquina não existe, em vez de uma lista vazia.)

---

## Exercício 4 — Editar máquina

🟡 **Intermediário**

**Contexto:** a API já cadastra máquinas (`POST /maquinas`). Mas alguém cadastrou a colheitadeira como "Colhedora", e a fazenda decidiu trocar a tag `CO-02` por `CL-02`. Hoje não há como corrigir sem reiniciar o servidor.

**O que fazer:** criar a rota `PATCH /maquinas/:id`, que altera **só os campos enviados** (`tag` e/ou `modelo`).

**Corpo da requisição** (os dois campos são opcionais, mas pelo menos um precisa vir):

```json
{ "modelo": "Colheitadeira" }
```

**Regras:**

| Situação | Resposta |
|---|---|
| Alteração válida | **200** com a máquina já atualizada |
| `id` não é um número inteiro | **400** `{ "erro": "O id deve ser um número inteiro" }` |
| Máquina não existe | **404** `{ "erro": "Máquina não encontrada" }` |
| Corpo com `status`, `horimetro` ou `id` | **400** `{ "erro": "Campo 'status' é controlado pelo sistema e não pode ser alterado" }` (com o nome do campo enviado). O status muda pela saída, pelo retorno e pelas O.S.; o horímetro, pelo retorno; o id nunca muda. |
| Nem `tag` nem `modelo` no corpo | **400** `{ "erro": "Informe 'tag' e/ou 'modelo' para alterar" }` |
| `tag` ou `modelo` enviados vazios (ou que não são texto) | **400** `{ "erro": "Campo 'tag' não pode ficar vazio" }` (ou `'modelo'`) |
| Tag já usada por **outra** máquina | **409** `{ "erro": "Já existe uma máquina com a tag TR-01" }` |

Além disso:
- A tag é gravada do mesmo jeito que no cadastro: **sem espaços nas pontas e em maiúsculas**.
- Enviar a **mesma tag** que a máquina já tem **não** é duplicidade (a máquina não conflita com ela mesma).

**Conceitos praticados:** **`PATCH`** (atualização parcial) × `PUT` (substituição completa), **campos controlados pelo sistema**, **unicidade ignorando o próprio registro**, reaproveitar a normalização do cadastro (extrair uma função).

**Testes:**

```bash
curl.exe -i -X PATCH http://localhost:3000/maquinas/2 -H "Content-Type: application/json" -d '{"modelo":"Colheitadeira de grãos"}'  # 200, só o modelo muda
curl.exe -i -X PATCH http://localhost:3000/maquinas/2 -H "Content-Type: application/json" -d '{"tag":" cl-02 "}'                       # 200, tag "CL-02"
curl.exe -i -X PATCH http://localhost:3000/maquinas/2 -H "Content-Type: application/json" -d '{"tag":"CL-02"}'                         # 200 (a mesma tag: não é duplicidade)
curl.exe -i -X PATCH http://localhost:3000/maquinas/2 -H "Content-Type: application/json" -d '{"tag":"TR-01"}'                         # 409
curl.exe -i -X PATCH http://localhost:3000/maquinas/2 -H "Content-Type: application/json" -d '{"status":"Disponível"}'                 # 400 (campo protegido)
curl.exe -i -X PATCH http://localhost:3000/maquinas/2 -H "Content-Type: application/json" -d '{}'                                      # 400 (nada para alterar)
curl.exe -i -X PATCH http://localhost:3000/maquinas/2 -H "Content-Type: application/json" -d '{"modelo":"  "}'                         # 400 (vazio)
curl.exe -i -X PATCH http://localhost:3000/maquinas/99 -H "Content-Type: application/json" -d '{"modelo":"X"}'                         # 404
```

💡 **Dica:** a normalização da tag (`trim` + `toUpperCase`) já existe no `POST /maquinas`. Em vez de copiar, extraia uma função `normalizarTag(tag)` e use nas duas rotas. Para a duplicidade, procure outra máquina com a mesma tag **e um id diferente**: `maquinas.some(m => m.tag === tag && m.id !== maquina.id)`.

🤔 **Para pensar:** por que `PATCH` e não `PUT`? (Resposta: o `PUT` substitui o recurso **inteiro**; quem quisesse trocar só o modelo teria de reenviar tudo, inclusive `horimetro` e `status`, que o cliente nem pode alterar. O `PATCH` descreve exatamente a intenção: "mude só isto".)

---

## Exercício 5 — Limite de horas por saída

🟡 **Intermediário**

**Contexto:** um operador digitou `10120` em vez de `1012` no retorno, e o horímetro do trator "saltou" 9 mil horas. A regra atual (horímetro ≥ atual) não pegou o erro.

**O que fazer:** na rota de retorno, recusar retornos em que o horímetro avance **mais de 24 horas** numa única saída.

**Regras:**

| Situação | Resposta |
|---|---|
| Avanço de até 24 h | segue normalmente |
| Avanço maior que 24 h | **400** `{ "erro": "Horímetro avançou 9120 h numa única saída (limite: 24 h). Confira o valor digitado." }` |

**Conceitos praticados:** regra de negócio de **sanidade** (detectar erro de digitação), **constantes** nomeadas em vez de "números mágicos", posição da nova validação na ordem existente.

**Testes:**

```bash
curl.exe -X POST http://localhost:3000/maquinas/1/saida -H "Content-Type: application/json" -d '{"operador":"Joao","frenteTrabalho":"Talhao 5"}'
curl.exe -i -X POST http://localhost:3000/maquinas/1/retorno -H "Content-Type: application/json" -d '{"horimetro":10120}'   # 400
curl.exe -i -X POST http://localhost:3000/maquinas/1/retorno -H "Content-Type: application/json" -d '{"horimetro":1012}'    # 200
```

💡 **Dica:** crie `const LIMITE_HORAS_POR_SAIDA = 24;` no início do arquivo. Se a regra mudar, você altera um único lugar.

🤔 **Para pensar:** onde colocar essa validação: antes ou depois da regra "horímetro não pode ser menor que o atual"? Por quê?

---

## Exercício 6 — Um operador, uma máquina

🟡 **Intermediário**

**Contexto:** a fazenda quer impedir que um operador fique registrado com duas máquinas em campo ao mesmo tempo.

**O que fazer:** na rota de saída, recusar a saída se o operador já tiver uma **movimentação aberta** (sem retorno).

**Regras:**

| Situação | Resposta |
|---|---|
| Operador sem máquina em campo | segue normalmente |
| Operador já está com outra máquina | **409** `{ "erro": "Operador Joao já está com a máquina TR-01 em campo" }` |

A comparação do nome deve **ignorar maiúsculas/minúsculas e espaços nas pontas**: `"Joao"`, `"JOAO"` e `" joao "` são a mesma pessoa.

**Conceitos praticados:** regra que cruza **duas entidades** (movimentações + máquinas), comparação de textos (`toLowerCase`, `trim`), *optional chaining* (`?.`).

**Testes:**

```bash
curl.exe -X POST http://localhost:3000/maquinas/1/saida -H "Content-Type: application/json" -d '{"operador":"Joao","frenteTrabalho":"Talhao 5"}'           # 200
curl.exe -i -X POST http://localhost:3000/maquinas/2/saida -H "Content-Type: application/json" -d '{"operador":"  JOAO ","frenteTrabalho":"Talhao 8"}'     # 409
curl.exe -X POST http://localhost:3000/maquinas/1/retorno -H "Content-Type: application/json" -d '{"horimetro":1010}'                                     # 200
curl.exe -i -X POST http://localhost:3000/maquinas/2/saida -H "Content-Type: application/json" -d '{"operador":"Joao","frenteTrabalho":"Talhao 8"}'       # 200 (agora ele está livre)
```

🤔 **Para pensar:** comparar pelo **nome** do operador é frágil (e se houver dois "João"?). Como isso seria resolvido com um cadastro de operadores? (Resposta: cada operador teria um `id`, e a movimentação guardaria o `operadorId`, do mesmo jeito que guarda o `maquinaId`.)

---

## Exercício 7 — Resumo de uso da máquina

🔴 **Desafio**

**Contexto:** o gestor da frota quer um painel com os indicadores de cada máquina.

**O que fazer:** criar a rota `GET /maquinas/:id/resumo`, que devolve dados **calculados** a partir do histórico.

**Resposta esperada (200):**

```json
{
  "maquina": "TR-01",
  "status": "Disponível",
  "totalSaidas": 1,
  "totalHorasTrabalhadas": 12.3,
  "mediaHorasPorSaida": 12.3,
  "avarias": [
    { "data": "2026-09-26T18:44:41.126Z", "operador": "Joao", "descricao": "Pneu furado" }
  ]
}
```

**Regras:**
- `totalSaidas`: todas as movimentações da máquina (abertas e fechadas).
- `totalHorasTrabalhadas` e `mediaHorasPorSaida`: só das movimentações **concluídas**, com 1 casa decimal.
- Máquina sem histórico: totais **0** e `avarias` como lista vazia (atenção à **divisão por zero** na média!).
- Máquina inexistente: **404**.

**Conceitos praticados:** `Array.reduce` (somar), `Array.map` (transformar), `filter` encadeado, dados derivados (calculados, não armazenados), divisão por zero.

**Testes:**

```bash
curl.exe -X POST http://localhost:3000/maquinas/1/saida -H "Content-Type: application/json" -d '{"operador":"Joao","frenteTrabalho":"Talhao 5"}'
curl.exe -X POST http://localhost:3000/maquinas/1/retorno -H "Content-Type: application/json" -d '{"horimetro":1012.3,"avarias":"Pneu furado"}'
curl.exe http://localhost:3000/maquinas/1/resumo       # totais preenchidos
curl.exe http://localhost:3000/maquinas/2/resumo       # tudo zerado
curl.exe -i http://localhost:3000/maquinas/99/resumo   # 404
```

💡 **Dica:** `lista.reduce((soma, item) => soma + item.valor, 0)` soma os valores de uma lista. O `0` é o valor inicial da soma.

---

## Exercício 8 — Excluir máquina

🔴 **Desafio**

**Contexto:** uma máquina foi cadastrada por engano e precisa ser removida.

**O que fazer:** criar a rota `DELETE /maquinas/:id`.

**Regras:**

| Situação | Resposta |
|---|---|
| Exclusão permitida | **204 No Content** (sem corpo) |
| Máquina não existe | **404** |
| Máquina não está `Disponível` | **409** `{ "erro": "Máquina CO-02 não pode ser excluída: status atual é 'Em Operação'" }` |
| Máquina tem histórico de movimentações | **409** `{ "erro": "Máquina TR-01 possui histórico de movimentações e não pode ser excluída" }` |

**Conceitos praticados:** método `DELETE`, **204 No Content**, **integridade referencial** (não apagar um registro referenciado por outros), remoção de itens de um array.

**Testes** (usam o `POST /maquinas`, que já faz parte da API, para criar uma máquina sem histórico):

```bash
curl.exe -X POST http://localhost:3000/maquinas -H "Content-Type: application/json" -d '{"tag":"PV-03","modelo":"Pulverizador","horimetro":250}'   # cria id 3
curl.exe -X POST http://localhost:3000/maquinas/1/saida -H "Content-Type: application/json" -d '{"operador":"Joao","frenteTrabalho":"Talhao 5"}'
curl.exe -i -X DELETE http://localhost:3000/maquinas/1    # 409 (em operação)
curl.exe -X POST http://localhost:3000/maquinas/1/retorno -H "Content-Type: application/json" -d '{"horimetro":1010}'
curl.exe -i -X DELETE http://localhost:3000/maquinas/1    # 409 (tem histórico)
curl.exe -i -X DELETE http://localhost:3000/maquinas/3    # 204
curl.exe -i -X DELETE http://localhost:3000/maquinas/3    # 404 (já foi excluída)
```

🤔 **Para pensar:** por que não permitir apagar uma máquina com histórico? O que aconteceria com as movimentações que apontam para ela? (Esse é o problema de **integridade referencial** que os bancos de dados resolvem com *foreign keys*.) Em sistemas reais, é comum **desativar** o registro (ex.: status `Inativa`) em vez de apagá-lo. Isso se chama *soft delete*.

---

## Desafios extras (sem gabarito)

Para quem terminou tudo:

1. **Editar máquina:** `PATCH /maquinas/:id` permitindo alterar só `tag` e `modelo`. O `horimetro` e o `status` **não** podem ser editados diretamente. Por quê?
2. **Máquinas em campo há muito tempo:** `GET /movimentacoes/atrasadas` lista as saídas abertas há mais de 12 horas (compare `dataSaida` com `new Date()`).
3. **Testes automatizados:** acrescente os cenários dos seus exercícios ao `testes.sh` e ao `testes.http`.
4. **Aplicar em outro domínio:** usando a seção 8 do README, crie uma API de empréstimo de livros ou de locação de ferramentas.

### Desafios extras do Módulo de Estoque (sem gabarito)

5. **Conferência de estoque:** `GET /pecas/:id/conferencia` soma as implantações e entradas do kardex, subtrai as saídas e compara com o `saldo` da peça. Responda se o saldo "bate" e a diferença, se houver.
6. **Custo médio ponderado:** altere a entrada de estoque para calcular o custo pela média ponderada, em vez do custo da última compra. Compare os dois resultados comprando 0,1 L de óleo a R$ 1,00.
7. **Refatoração:** troque os arredondamentos antigos do módulo de uso (`Math.round(x * 10) / 10`) pela função `arredondar(x, 1)`. Rode o `testes.sh` para garantir que nada mudou.
8. **Valor do estoque:** `GET /pecas/valor-total` devolve o valor total do almoxarifado (soma de `saldo × custoUnitario` de todas as peças). Atenção à ordem das rotas: `/pecas/valor-total` precisa ser declarada **antes** de `/pecas/:id`. Por quê?

### Desafios extras do Módulo de Manutenção (sem gabarito)

9. **Cancelar O.S.:** `POST /ordens-servico/:id/cancelamento`, que só vale para O.S. `Aberta`, exige um `motivo` e devolve a máquina para `Disponível`. Crie o status `Cancelada`. Uma O.S. cancelada entra no custo da máquina?
10. **Mão de obra:** no fechamento, aceite um campo opcional `horasMaoDeObra` e uma constante `VALOR_HORA_MECANICO`. O `custoTotal` passa a ser peças + mão de obra. Mostre os dois valores separados na O.S.
11. **Preventiva vencida:** `GET /maquinas/preventivas-vencidas` lista as máquinas que rodaram mais de 250 h desde a última O.S. preventiva fechada (compare o horímetro atual com o `horimetroParada` dessa O.S.).
12. **Peças mais consumidas:** `GET /pecas/mais-consumidas` soma as saídas do kardex por peça e devolve o ranking, do maior para o menor valor consumido.
