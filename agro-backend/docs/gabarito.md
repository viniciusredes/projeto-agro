# Gabarito — Exercícios do Agro Backend

> ⚠️ **Tente resolver antes de olhar!** Voltar aqui só para comparar a sua solução é o melhor uso deste arquivo.
>
> As soluções abaixo são **uma** forma de resolver. Se a sua for diferente, mas passar em todos os testes do [enunciado](exercicios.md), ela também está certa. Compare as duas e reflita sobre as diferenças.

Todas as soluções foram testadas com os comandos dos enunciados.

**Onde colocar o código:** novas rotas vão **depois das rotas existentes e antes do tratador de 404** (`// Rota não encontrada...`). Alterações em rotas existentes (exercícios 2, 4, 5 e 6) são indicadas em cada solução.

---

## Exercício 1 — Buscar uma máquina pelo id

```ts
// Caminho para VER uma máquina específica
app.get('/maquinas/:id', (req, res) => {
  const id = Number(req.params.id);

  // Validação 1 (formato): o id é um número inteiro?
  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'O id deve ser um número inteiro' });
  }

  // Validação 2: a máquina existe?
  const maquina = maquinas.find(m => m.id === id);
  if (!maquina) {
    return res.status(404).json({ erro: 'Máquina não encontrada' });
  }

  res.json(maquina);
});
```

**Pontos de atenção**
- `Number('abc')` é `NaN` → 400. Já `parseInt('12abc')` daria `12`, porque o `parseInt` "aproveita" o começo do texto. Por isso o `Number` é mais rigoroso para validar.
- Aqui a validação de **formato** vem antes da de **existência**: sem um id válido, nem dá para procurar.

---

## Exercício 2 — Filtrar máquinas por status

Esta solução **substitui** a rota `GET /maquinas` existente:

```ts
// 1. Caminho para VER as máquinas (filtro opcional: ?status=Disponível)
app.get('/maquinas', (req, res) => {
  const { status } = req.query;

  // Sem filtro: devolve todas
  if (status === undefined) {
    return res.json(maquinas);
  }

  // Com filtro: o status precisa ser um dos valores permitidos
  const statusValidos: StatusMaquina[] = ['Disponível', 'Em Operação', 'Em Manutenção'];
  if (!statusValidos.includes(status as StatusMaquina)) {
    return res.status(400).json({ erro: `Status inválido. Use: ${statusValidos.join(', ')}` });
  }

  res.json(maquinas.filter(m => m.status === status));
});
```

**Pontos de atenção**
- `status as StatusMaquina` é uma **afirmação de tipo** (*type assertion*): dizemos ao TypeScript "trate isso como StatusMaquina" só para poder chamar o `includes`. A checagem de verdade é o próprio `includes`.
- A mensagem de erro **lista os valores válidos** com `join(', ')`, e o cliente já sabe o que enviar.
- A lista `statusValidos` repete os valores do `type StatusMaquina`. **Para ir além:** declare `const STATUS_MAQUINA = ['Disponível', 'Em Operação', 'Em Manutenção'] as const;` e derive o tipo com `type StatusMaquina = typeof STATUS_MAQUINA[number];`. Assim existe uma única fonte da verdade.

---

## Exercício 3 — Histórico de uma máquina

```ts
// Caminho para VER o histórico de uma máquina
app.get('/maquinas/:id/movimentacoes', (req, res) => {
  const id = Number(req.params.id);
  const maquina = maquinas.find(m => m.id === id);

  if (!maquina) {
    return res.status(404).json({ erro: 'Máquina não encontrada' });
  }

  res.json(movimentacoes.filter(mov => mov.maquinaId === maquina.id));
});
```

**Pontos de atenção**
- Aqui não foi preciso validar o formato do id à parte: `/maquinas/abc/movimentacoes` gera `NaN`, que não encontra nenhuma máquina, e cai no 404. As duas abordagens são aceitas (compare com o exercício 1).
- **Lista vazia não é erro:** uma máquina que nunca saiu responde `200 []`.

---

## Exercício 4 — Editar máquina

**1)** Uma função para a normalização da tag, **antes** das rotas. Ela passa a ser usada no cadastro (`POST /maquinas`) e na edição:

```ts
// A tag é gravada sem espaços nas pontas e em maiúsculas: " pv-03 " vira "PV-03".
// Uma função só, usada no cadastro e na edição: a regra não pode divergir entre as duas.
function normalizarTag(tag: string): string {
  return tag.trim().toUpperCase();
}
```

No `POST /maquinas`, troque `tag.trim().toUpperCase()` por `normalizarTag(tag)`.

**2)** A rota de edição, depois das rotas existentes e antes do tratador de 404:

```ts
// Campos que o cliente NÃO altera por aqui: o sistema controla (status e horímetro mudam
// pela saída, pelo retorno e pelas O.S.; o id nunca muda)
const CAMPOS_PROTEGIDOS = ['id', 'status', 'horimetro'];

// Caminho para EDITAR uma máquina (só os campos enviados)
app.patch('/maquinas/:id', (req, res) => {
  const id = Number(req.params.id);

  // Validação 1 (formato): o id é um número inteiro?
  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'O id deve ser um número inteiro' });
  }

  // Validação 2: a máquina existe?
  const maquina = maquinas.find(m => m.id === id);
  if (!maquina) {
    return res.status(404).json({ erro: 'Máquina não encontrada' });
  }

  const corpo = req.body ?? {};

  // Validação 3: nenhum campo controlado pelo sistema
  const protegido = CAMPOS_PROTEGIDOS.find(campo => campo in corpo);
  if (protegido) {
    return res.status(400).json({ erro: `Campo '${protegido}' é controlado pelo sistema e não pode ser alterado` });
  }

  const { tag, modelo } = corpo;

  // Validação 4: há algo para alterar?
  if (tag === undefined && modelo === undefined) {
    return res.status(400).json({ erro: "Informe 'tag' e/ou 'modelo' para alterar" });
  }

  // Validação 5 (formato): o que veio precisa ser texto não vazio
  if (tag !== undefined && (typeof tag !== 'string' || tag.trim() === '')) {
    return res.status(400).json({ erro: "Campo 'tag' não pode ficar vazio" });
  }
  if (modelo !== undefined && (typeof modelo !== 'string' || modelo.trim() === '')) {
    return res.status(400).json({ erro: "Campo 'modelo' não pode ficar vazio" });
  }

  // Validação 6 (regra de negócio): tag única, ignorando a própria máquina
  const novaTag = tag !== undefined ? normalizarTag(tag) : undefined;
  if (novaTag !== undefined && maquinas.some(m => m.tag === novaTag && m.id !== maquina.id)) {
    return res.status(409).json({ erro: `Já existe uma máquina com a tag ${novaTag}` });
  }

  // Tudo validado: só agora altera (e só o que foi enviado)
  if (novaTag !== undefined) {
    maquina.tag = novaTag;
  }
  if (modelo !== undefined) {
    maquina.modelo = modelo.trim();
  }

  res.json(maquina);
});
```

**Pontos de atenção**
- **`PATCH` × `PUT`:** o `PATCH` altera só o que veio no corpo. Com `PUT`, o cliente teria de mandar a máquina **inteira**, inclusive `status` e `horimetro`, que ele nem pode mudar.
- **`undefined` × vazio:** campo **ausente** (`undefined`) significa "não mexa"; campo **presente e vazio** é erro. Por isso as validações testam `tag !== undefined` antes de olhar o conteúdo.
- **Recusar em vez de ignorar os campos protegidos:** no cadastro, um `status` enviado era simplesmente ignorado. Na edição, ignorar seria enganoso: o cliente acharia que mudou o status. O 400 com o nome do campo deixa claro o que não é permitido.
- **`campo in corpo`:** o operador `in` diz se a chave existe no objeto, mesmo com valor `null` ou `0`.
- **A máquina não conflita com ela mesma:** sem o `m.id !== maquina.id`, reenviar a própria tag daria 409.
- **Validar tudo antes de alterar:** se a tag conflitar, nem o modelo muda. É o mesmo "tudo ou nada" do fechamento de O.S. (Parte OS5), em escala menor.
- **Extrair na segunda vez:** a normalização apareceu em duas rotas e virou uma função. Se a regra mudar (ex.: trocar `_` por `-`), muda num lugar só.

---

## Exercício 5 — Limite de horas por saída

**1)** No início do arquivo, junto dos dados em memória:

```ts
// Máximo de horas que uma máquina pode trabalhar numa única saída
const LIMITE_HORAS_POR_SAIDA = 24;
```

**2)** Na rota de retorno, **logo depois** da validação "horímetro menor que o atual":

```ts
  // Validação 5 (sanidade): avanço exagerado indica erro de digitação
  const horasNestaSaida = Math.round((horimetro - maquina.horimetro) * 10) / 10;
  if (horasNestaSaida > LIMITE_HORAS_POR_SAIDA) {
    return res.status(400).json({
      erro: `Horímetro avançou ${horasNestaSaida} h numa única saída (limite: ${LIMITE_HORAS_POR_SAIDA} h). Confira o valor digitado.`
    });
  }
```

**Pontos de atenção**
- **Por que depois da regra "menor que o atual"?** Porque cada validação deve responder a **um problema específico**. Se o horímetro for menor, a mensagem certa é "é menor que o atual", e essa checagem deve vir primeiro. A regra de limite só faz sentido para valores que já avançaram.
- **Constante nomeada** em vez de `24` solto no código: quem lê entende o significado, e uma mudança de regra (ex.: 36 h) é feita num único lugar.
- O `Math.round` evita mensagens como "avançou 24.000000000001 h".

---

## Exercício 6 — Um operador, uma máquina

Na rota de saída, **logo depois** das validações de `operador` e `frenteTrabalho`:

```ts
  // Validação 4 (regra de negócio): o operador já está com outra máquina?
  const saidaEmAberto = movimentacoes.find(
    mov => mov.dataRetorno === undefined &&
           mov.operador.toLowerCase() === operador.trim().toLowerCase()
  );
  if (saidaEmAberto) {
    const maquinaEmUso = maquinas.find(m => m.id === saidaEmAberto.maquinaId);
    return res.status(409).json({
      erro: `Operador ${saidaEmAberto.operador} já está com a máquina ${maquinaEmUso?.tag} em campo`
    });
  }
```

**Pontos de atenção**
- **Comparação sem diferenciar maiúsculas:** os dois lados passam por `toLowerCase()`. O valor gravado já está sem espaços (o `trim` foi feito na saída), e o valor recebido passa por `trim()` agora.
- **Cruzamento de entidades:** encontramos a movimentação aberta e, com o `maquinaId` dela, buscamos a máquina para mostrar a **tag** na mensagem, que é mais útil que o id.
- **`?.` (optional chaining):** `maquinaEmUso?.tag` evita erro caso a máquina não seja encontrada (em vez de quebrar, resulta em `undefined`).
- **409** porque o pedido está correto, mas o **estado atual** (o operador ocupado) impede a ação.

---

## Exercício 7 — Resumo de uso da máquina

```ts
// Caminho para VER os indicadores de uso de uma máquina
app.get('/maquinas/:id/resumo', (req, res) => {
  const id = Number(req.params.id);
  const maquina = maquinas.find(m => m.id === id);

  if (!maquina) {
    return res.status(404).json({ erro: 'Máquina não encontrada' });
  }

  const historico = movimentacoes.filter(mov => mov.maquinaId === maquina.id);
  const concluidas = historico.filter(mov => mov.dataRetorno !== undefined);

  // reduce: percorre a lista acumulando a soma (começando em 0)
  const totalHoras = concluidas.reduce((soma, mov) => soma + (mov.horasTrabalhadas ?? 0), 0);

  // Evita divisão por zero quando não há movimentações concluídas
  const media = concluidas.length > 0 ? totalHoras / concluidas.length : 0;

  res.json({
    maquina: maquina.tag,
    status: maquina.status,
    totalSaidas: historico.length,
    totalHorasTrabalhadas: Math.round(totalHoras * 10) / 10,
    mediaHorasPorSaida: Math.round(media * 10) / 10,
    avarias: concluidas
      .filter(mov => mov.avarias !== undefined)
      .map(mov => ({ data: mov.dataRetorno, operador: mov.operador, descricao: mov.avarias }))
  });
});
```

**Pontos de atenção**
- **`reduce`** transforma uma lista em **um único valor** (aqui, a soma). O segundo argumento (`0`) é o valor inicial.
- **`?? 0`**: `horasTrabalhadas` é opcional no tipo, e o `??` garante um número na soma.
- **Divisão por zero:** `0 / 0` resulta em `NaN` em JavaScript. O operador ternário (`condição ? a : b`) evita isso.
- **`filter` + `map` encadeados:** primeiro seleciona as movimentações com avaria, depois transforma cada uma num objeto só com o que interessa ao painel.
- **Dados derivados:** o resumo **não é armazenado**; é calculado a cada requisição a partir do histórico. Assim, ele nunca fica desatualizado.

---

## Exercício 8 — Excluir máquina

```ts
// Caminho para EXCLUIR uma máquina
app.delete('/maquinas/:id', (req, res) => {
  const id = Number(req.params.id);
  const maquina = maquinas.find(m => m.id === id);

  // Validação 1: existe?
  if (!maquina) {
    return res.status(404).json({ erro: 'Máquina não encontrada' });
  }

  // Validação 2: está parada no pátio?
  if (maquina.status !== 'Disponível') {
    return res.status(409).json({
      erro: `Máquina ${maquina.tag} não pode ser excluída: status atual é '${maquina.status}'`
    });
  }

  // Validação 3 (integridade referencial): alguém aponta para ela?
  if (movimentacoes.some(mov => mov.maquinaId === maquina.id)) {
    return res.status(409).json({
      erro: `Máquina ${maquina.tag} possui histórico de movimentações e não pode ser excluída`
    });
  }

  // Tudo certo: remove da lista
  maquinas = maquinas.filter(m => m.id !== maquina.id);
  res.status(204).send();
});
```

**Pontos de atenção**
- **204 No Content:** sucesso **sem corpo** na resposta. Por isso usamos `.send()` e não `.json(...)`.
- **Remover com `filter`:** cria uma nova lista sem a máquina. Funciona porque `maquinas` foi declarada com `let`. Com `const`, seria preciso usar `splice`:
  ```ts
  const indice = maquinas.findIndex(m => m.id === maquina.id);
  maquinas.splice(indice, 1);
  ```
- **Integridade referencial:** se a máquina fosse apagada, as movimentações ficariam com um `maquinaId` apontando para o nada ("registros órfãos"). Num banco relacional, uma *foreign key* impediria isso automaticamente.
- **Soft delete:** em sistemas reais, o comum é marcar a máquina como inativa (ex.: `ativa: false`) em vez de apagá-la, preservando o histórico para auditoria.

---

## Checklist final

Depois de implementar tudo:

- [ ] `npx tsc --noEmit` não mostra erros
- [ ] `bash testes.sh` continua com **25/25** (as funcionalidades antigas não quebraram)
- [ ] Todos os comandos dos enunciados dão o resultado esperado
- [ ] Toda resposta de erro segue o formato `{ "erro": "..." }`
- [ ] Todo `res.status(...)` de erro tem `return` antes
