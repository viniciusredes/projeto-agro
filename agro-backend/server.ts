import express, { Request, Response, NextFunction } from 'express';

const app = express();
app.disable('x-powered-by'); // não revela que o servidor usa Express
app.use(express.json());

// Status possíveis de uma máquina (só estes 3 valores são aceitos)
type StatusMaquina = 'Disponível' | 'Em Operação' | 'Em Manutenção';

// Formato (contrato) de uma máquina
interface Maquina {
  id: number;
  tag: string;
  modelo: string;
  horimetro: number;
  status: StatusMaquina;
}

// Nossa lista de máquinas em memória (banco de dados provisório)
let maquinas: Maquina[] = [
  { id: 1, tag: 'TR-01', modelo: 'Trator', horimetro: 1000, status: 'Disponível' },
  { id: 2, tag: 'CO-02', modelo: 'Colheitadeira', horimetro: 500, status: 'Disponível' }
];

// Formato de uma movimentação (uma ida ao campo + o retorno)
// Campos com "?" são opcionais: só são preenchidos quando a máquina retorna.
interface Movimentacao {
  id: number;
  maquinaId: number;        // "chave estrangeira": aponta para Maquina.id
  operador: string;
  frenteTrabalho: string;
  horimetroSaida: number;
  dataSaida: string;
  horimetroRetorno?: number;
  dataRetorno?: string;
  horasTrabalhadas?: number;
  avarias?: string;         // problemas observados pelo operador (opcional)
}

// Histórico de movimentações em memória
let movimentacoes: Movimentacao[] = [];
let proximoIdMovimentacao = 1; // simula o auto-incremento de um banco de dados

// ===================== ESTOQUE (ALMOXARIFADO) =====================

// Unidades de medida aceitas: unidade (peças) ou litro (fluidos)
type UnidadeMedida = 'un' | 'L';

// Formato de uma peça do almoxarifado
interface Peca {
  id: number;
  codigo: string;          // código interno do almoxarifado, ex.: 'FLT-001'
  descricao: string;
  unidade: UnidadeMedida;
  saldo: number;           // quantidade disponível, na unidade acima
  custoUnitario: number;   // em reais (R$), valor da última compra
  estoqueMinimo: number;   // abaixo deste saldo, a peça precisa ser reposta
}

// Peças em memória (saldo de implantação: o que já havia na prateleira)
let pecas: Peca[] = [
  { id: 1, codigo: 'FLT-001', descricao: 'Filtro de óleo do motor', unidade: 'un', saldo: 10, custoUnitario: 85.9, estoqueMinimo: 5 },
  { id: 2, codigo: 'OLE-001', descricao: 'Óleo hidráulico', unidade: 'L', saldo: 200, custoUnitario: 18.5, estoqueMinimo: 50 },
  { id: 3, codigo: 'COR-001', descricao: 'Correia do alternador', unidade: 'un', saldo: 4, custoUnitario: 120, estoqueMinimo: 5 }
];
let proximoIdPeca = 4; // as 3 peças iniciais usam os ids 1, 2 e 3

// Lista de unidades válidas (usada para validar o que chega na requisição)
const UNIDADES_VALIDAS: UnidadeMedida[] = ['un', 'L'];

// Arredonda um número para N casas decimais (evita 0.1 + 0.2 = 0.30000000000000004)
function arredondar(valor: number, casas: number): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

// Tipos de movimento de estoque:
// - implantacao: saldo que já existia quando o sistema começou
// - entrada:     compra de peças (soma ao saldo)
// - saida:       baixa por Ordem de Serviço (subtrai do saldo) — usado no módulo de O.S.
type TipoMovimentoEstoque = 'implantacao' | 'entrada' | 'saida';

// Formato de um movimento de estoque (uma linha do "kardex")
interface MovimentoEstoque {
  id: number;
  pecaId: number;          // "chave estrangeira": aponta para Peca.id
  tipo: TipoMovimentoEstoque;
  quantidade: number;      // sempre positiva; o tipo diz se soma ou subtrai
  custoUnitario: number;   // custo da peça NESTE movimento (fica congelado)
  valorTotal: number;      // quantidade x custoUnitario
  saldoApos: number;       // saldo da peça logo depois deste movimento
  data: string;
}

// Histórico de movimentos: começa com a implantação do saldo das peças iniciais
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
let proximoIdMovimentoEstoque = movimentosEstoque.length + 1;

// 1. Caminho para VER as máquinas (Listagem)
app.get('/maquinas', (req, res) => {
  res.json(maquinas);
});

// 2. Caminho para registrar a SAÍDA da máquina (Ida para o campo)
app.post('/maquinas/:id/saida', (req, res) => {
  const id = parseInt(req.params.id);
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

  // Validação 3: os dados obrigatórios vieram no corpo da requisição?
  const { operador, frenteTrabalho } = req.body ?? {};

  if (typeof operador !== 'string' || operador.trim() === '') {
    return res.status(400).json({ erro: "Campo 'operador' é obrigatório" });
  }
  if (typeof frenteTrabalho !== 'string' || frenteTrabalho.trim() === '') {
    return res.status(400).json({ erro: "Campo 'frenteTrabalho' é obrigatório" });
  }

  // Tudo certo: abre uma movimentação e libera a máquina
  const movimentacao: Movimentacao = {
    id: proximoIdMovimentacao++,
    maquinaId: maquina.id,
    operador: operador.trim(),
    frenteTrabalho: frenteTrabalho.trim(),
    horimetroSaida: maquina.horimetro,
    dataSaida: new Date().toISOString()
  };
  movimentacoes.push(movimentacao);

  maquina.status = 'Em Operação';
  res.json({ mensagem: 'Máquina liberada para o campo!', maquina, movimentacao });
});

// 3. Caminho para registrar o RETORNO da máquina
app.post('/maquinas/:id/retorno', (req, res) => {
  const id = parseInt(req.params.id);
  const maquina = maquinas.find(m => m.id === id);

  // Validação 1: a máquina existe?
  if (!maquina) {
    return res.status(404).json({ erro: 'Máquina não encontrada' });
  }

  // Validação 2: a máquina está em campo? (só retorna quem saiu)
  if (maquina.status !== 'Em Operação') {
    return res.status(409).json({
      erro: `Máquina ${maquina.tag} não pode retornar: status atual é '${maquina.status}'`
    });
  }

  // Validação 3 (formato): o horímetro veio e é um número válido?
  const { horimetro, avarias } = req.body ?? {}; // horimetro: valor atualizado do relógio da máquina

  if (typeof horimetro !== 'number' || !Number.isFinite(horimetro)) {
    return res.status(400).json({ erro: "Campo 'horimetro' é obrigatório e deve ser um número" });
  }

  // Campo OPCIONAL: pode não vir; mas, se vier, precisa ser texto
  if (avarias !== undefined && typeof avarias !== 'string') {
    return res.status(400).json({ erro: "Campo 'avarias', quando informado, deve ser um texto" });
  }

  // Validação 4 (regra de negócio): o horímetro nunca anda para trás
  if (horimetro < maquina.horimetro) {
    return res.status(400).json({
      erro: `Horímetro informado (${horimetro}) é menor que o atual (${maquina.horimetro})`
    });
  }

  // Localiza a movimentação "aberta" (sem retorno) desta máquina
  const movimentacao = movimentacoes.find(
    mov => mov.maquinaId === maquina.id && mov.dataRetorno === undefined
  );

  if (!movimentacao) {
    // Não deveria acontecer: toda máquina 'Em Operação' saiu pela rota de saída
    return res.status(409).json({ erro: `Nenhuma saída em aberto para a máquina ${maquina.tag}` });
  }

  // Tudo certo: fecha a movimentação e registra o retorno
  movimentacao.horimetroRetorno = horimetro;
  movimentacao.dataRetorno = new Date().toISOString();
  // Arredonda para 1 casa decimal (evita resultados como 12.299999999)
  movimentacao.horasTrabalhadas = Math.round((horimetro - movimentacao.horimetroSaida) * 10) / 10;

  // Só grava avarias se houver texto de verdade (ignora "" e "   ")
  if (avarias !== undefined && avarias.trim() !== '') {
    movimentacao.avarias = avarias.trim();
  }

  maquina.status = 'Disponível';
  maquina.horimetro = horimetro;
  res.json({ mensagem: 'Máquina retornou com sucesso!', maquina, movimentacao });
});

// 4. Caminho para VER o histórico de movimentações (filtro opcional: ?maquinaId=1)
app.get('/movimentacoes', (req, res) => {
  const { maquinaId } = req.query;

  // Sem filtro: devolve tudo
  if (maquinaId === undefined) {
    return res.json(movimentacoes);
  }

  // Com filtro: valida e devolve só as movimentações daquela máquina
  const idFiltro = Number(maquinaId);
  if (!Number.isInteger(idFiltro)) {
    return res.status(400).json({ erro: "Parâmetro 'maquinaId' deve ser um número inteiro" });
  }

  res.json(movimentacoes.filter(mov => mov.maquinaId === idFiltro));
});

// 5. Caminho para VER as peças do estoque
// (filtro opcional: ?abaixoDoMinimo=true lista só as peças que precisam de reposição)
app.get('/pecas', (req, res) => {
  const { abaixoDoMinimo } = req.query;

  // Sem filtro: devolve todas
  if (abaixoDoMinimo === undefined) {
    return res.json(pecas);
  }

  if (abaixoDoMinimo !== 'true') {
    return res.status(400).json({ erro: "Parâmetro 'abaixoDoMinimo' só aceita o valor 'true'" });
  }

  // Com filtro: peças abaixo do mínimo + quanto falta para chegar nele (dado calculado)
  const paraRepor = pecas
    .filter(p => p.saldo < p.estoqueMinimo)
    .map(p => ({ ...p, faltaParaMinimo: arredondar(p.estoqueMinimo - p.saldo, 2) }));

  res.json(paraRepor);
});

// 6. Caminho para VER uma peça específica
app.get('/pecas/:id', (req, res) => {
  const id = Number(req.params.id);

  // Validação 1 (formato): o id é um número inteiro?
  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'O id deve ser um número inteiro' });
  }

  // Validação 2: a peça existe?
  const peca = pecas.find(p => p.id === id);
  if (!peca) {
    return res.status(404).json({ erro: 'Peça não encontrada' });
  }

  res.json(peca);
});

// 7. Caminho para CADASTRAR uma peça
app.post('/pecas', (req, res) => {
  const { codigo, descricao, unidade, estoqueMinimo, saldo, custoUnitario } = req.body ?? {};

  // Validação 1 (formato): campos obrigatórios
  if (typeof codigo !== 'string' || codigo.trim() === '') {
    return res.status(400).json({ erro: "Campo 'codigo' é obrigatório" });
  }
  if (typeof descricao !== 'string' || descricao.trim() === '') {
    return res.status(400).json({ erro: "Campo 'descricao' é obrigatório" });
  }
  if (!UNIDADES_VALIDAS.includes(unidade)) {
    return res.status(400).json({ erro: `Campo 'unidade' deve ser um destes: ${UNIDADES_VALIDAS.join(', ')}` });
  }

  // Campo OPCIONAL: se vier, precisa ser um número >= 0 (inteiro, se a peça for contada em unidades)
  if (estoqueMinimo !== undefined) {
    if (typeof estoqueMinimo !== 'number' || !Number.isFinite(estoqueMinimo) || estoqueMinimo < 0) {
      return res.status(400).json({ erro: "Campo 'estoqueMinimo', quando informado, deve ser um número maior ou igual a zero" });
    }
    if (unidade === 'un' && !Number.isInteger(estoqueMinimo)) {
      return res.status(400).json({ erro: "Peça contada em unidades: 'estoqueMinimo' deve ser um número inteiro" });
    }
  }

  // Validação 2 (regra de negócio): saldo e custo só mudam por entrada de estoque
  if (saldo !== undefined || custoUnitario !== undefined) {
    return res.status(400).json({
      erro: "Saldo e custo não são informados no cadastro. Use a entrada de estoque (compra) para abastecer a peça"
    });
  }

  // Validação 3 (regra de negócio): código único (comparando já normalizado)
  const codigoNormalizado = codigo.trim().toUpperCase();
  if (pecas.some(p => p.codigo === codigoNormalizado)) {
    return res.status(409).json({ erro: `Já existe uma peça com o código ${codigoNormalizado}` });
  }

  // Tudo certo: cria a peça zerada
  const novaPeca: Peca = {
    id: proximoIdPeca++,
    codigo: codigoNormalizado,
    descricao: descricao.trim(),
    unidade,
    saldo: 0,
    custoUnitario: 0,
    estoqueMinimo: estoqueMinimo ?? 0   // sem mínimo informado, não gera alerta de reposição
  };
  pecas.push(novaPeca);

  res.status(201).json(novaPeca);
});

// 8. Caminho para registrar uma ENTRADA de estoque (compra de peças)
app.post('/pecas/:id/entradas', (req, res) => {
  const id = Number(req.params.id);

  // Validação 1 (formato): o id é um número inteiro?
  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'O id deve ser um número inteiro' });
  }

  // Validação 2: a peça existe?
  const peca = pecas.find(p => p.id === id);
  if (!peca) {
    return res.status(404).json({ erro: 'Peça não encontrada' });
  }

  // Validação 3 (formato): quantidade e custo são números positivos?
  const { quantidade, custoUnitario } = req.body ?? {};

  if (typeof quantidade !== 'number' || !Number.isFinite(quantidade) || quantidade <= 0) {
    return res.status(400).json({ erro: "Campo 'quantidade' deve ser um número maior que zero" });
  }
  if (typeof custoUnitario !== 'number' || !Number.isFinite(custoUnitario) || custoUnitario <= 0) {
    return res.status(400).json({ erro: "Campo 'custoUnitario' deve ser um número maior que zero" });
  }

  // Validação 4 (regra de negócio): peça contada em unidades não aceita fração
  if (peca.unidade === 'un' && !Number.isInteger(quantidade)) {
    return res.status(400).json({
      erro: `A peça ${peca.codigo} é contada em unidades: a quantidade deve ser um número inteiro`
    });
  }

  // Tudo certo: soma ao saldo e o custo passa a ser o da última compra
  const custoAnterior = peca.custoUnitario;
  peca.saldo = arredondar(peca.saldo + quantidade, 2);
  peca.custoUnitario = arredondar(custoUnitario, 2);

  // Registra o movimento no histórico (kardex)
  const movimento: MovimentoEstoque = {
    id: proximoIdMovimentoEstoque++,
    pecaId: peca.id,
    tipo: 'entrada',
    quantidade,
    custoUnitario: peca.custoUnitario,
    valorTotal: arredondar(quantidade * peca.custoUnitario, 2),
    saldoApos: peca.saldo,
    data: new Date().toISOString()
  };
  movimentosEstoque.push(movimento);

  res.json({ mensagem: 'Entrada registrada com sucesso!', peca, custoAnterior, movimento });
});

// 9. Caminho para VER o histórico de movimentos de uma peça (kardex)
app.get('/pecas/:id/movimentos', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'O id deve ser um número inteiro' });
  }

  const peca = pecas.find(p => p.id === id);
  if (!peca) {
    return res.status(404).json({ erro: 'Peça não encontrada' });
  }

  res.json(movimentosEstoque.filter(mov => mov.pecaId === peca.id));
});

// Rota não encontrada: se a requisição chegou até aqui, nenhuma rota acima atendeu.
app.use((req: Request, res: Response) => {
  res.status(404).json({ erro: `Rota ${req.method} ${req.path} não existe` });
});

// Tratamento de erros: SEMPRE o último app.use, depois de todas as rotas.
// O Express reconhece que é um tratador de erros porque ele recebe 4 parâmetros.
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  // JSON mal formado no corpo da requisição (erro lançado pelo express.json())
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição' });
  }

  // Qualquer outro erro inesperado: registra o detalhe só no console do servidor
  // e devolve ao cliente uma mensagem genérica, sem expor detalhes internos.
  console.error(err);
  res.status(500).json({ erro: 'Erro interno no servidor' });
});

app.listen(3000, () => {
  console.log('Eita nóis! Acesse: http://localhost:3000');
});