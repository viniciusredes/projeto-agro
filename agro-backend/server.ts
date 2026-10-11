import express, { Request, Response, NextFunction } from 'express';

const app = express();
app.disable('x-powered-by'); // não revela que o servidor usa Express

// As fotos de O.S. chegam em base64 dentro do JSON, e só ESSA rota aceita um corpo grande.
// A ORDEM importa: este leitor vem antes do geral. Quando o corpo já foi lido aqui, o
// express.json() de baixo percebe e passa adiante sem ler de novo.
app.use('/ordens-servico/:id/fotos', express.json({ limit: '3mb' }));
app.use('/abastecimentos', express.json({ limit: '3mb' })); // o comprovante vai junto no JSON
app.use(express.json()); // demais rotas: limite padrão de 100 KB

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
let proximoIdMaquina = 3; // as 2 máquinas iniciais usam os ids 1 e 2

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

// Encontra a movimentação "aberta" (sem retorno) de uma máquina
function buscarMovimentacaoAberta(maquinaId: number): Movimentacao | undefined {
  return movimentacoes.find(mov => mov.maquinaId === maquinaId && mov.dataRetorno === undefined);
}

// Fecha uma movimentação: usada no retorno E na abertura de O.S. com a máquina em campo
function fecharMovimentacao(movimentacao: Movimentacao, horimetro: number, avarias?: string): void {
  movimentacao.horimetroRetorno = horimetro;
  movimentacao.dataRetorno = new Date().toISOString();
  // Arredonda para 1 casa decimal (evita resultados como 12.299999999)
  movimentacao.horasTrabalhadas = Math.round((horimetro - movimentacao.horimetroSaida) * 10) / 10;

  // Só grava avarias se houver texto de verdade (ignora "" e "   ")
  if (avarias !== undefined && avarias.trim() !== '') {
    movimentacao.avarias = avarias.trim();
  }
}

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
  { id: 3, codigo: 'COR-001', descricao: 'Correia do alternador', unidade: 'un', saldo: 4, custoUnitario: 120, estoqueMinimo: 5 },
  // O tanque de diesel da fazenda também é estoque (Etapa 4): abastecer pelo tanque dá baixa aqui
  { id: 4, codigo: 'DSL-001', descricao: 'Óleo diesel S10 (tanque da fazenda)', unidade: 'L', saldo: 3000, custoUnitario: 6.05, estoqueMinimo: 1000 }
];
let proximoIdPeca = 5; // as 4 peças iniciais usam os ids 1 a 4

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
  ordemServicoId?: number; // só nas saídas: a O.S. que consumiu a peça
  abastecimentoId?: number; // só no diesel: o abastecimento pelo tanque (saída) ou o estorno da recusa (entrada)
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

// ===================== MANUTENÇÃO (ORDENS DE SERVIÇO) =====================

type TipoOS = 'Preventiva' | 'Corretiva';
type StatusOS = 'Aberta' | 'Fechada';

const TIPOS_OS: TipoOS[] = ['Preventiva', 'Corretiva'];
const STATUS_OS: StatusOS[] = ['Aberta', 'Fechada'];

// Uma linha da O.S.: uma peça usada no reparo (preenchida no fechamento)
interface ItemOS {
  pecaId: number;          // "chave estrangeira": aponta para Peca.id
  codigo: string;          // cópia do código da peça, para leitura rápida
  quantidade: number;
  custoUnitario: number;   // custo da peça NO MOMENTO da baixa (congelado)
  valorTotal: number;      // quantidade x custoUnitario
}

// A O.S. é um "documento": um cabeçalho (dados gerais) + uma lista de itens
interface OrdemServico {
  id: number;
  maquinaId: number;       // "chave estrangeira": aponta para Maquina.id
  tipo: TipoOS;
  status: StatusOS;
  descricao: string;       // problema encontrado ou serviço a fazer
  horimetroParada: number; // horímetro da máquina quando parou para manutenção
  dataAbertura: string;
  dataFechamento?: string; // preenchido no fechamento
  itens: ItemOS[];         // peças usadas (vazia até o fechamento)
  custoTotal: number;      // soma dos valorTotal dos itens
}

// Ordens de serviço em memória
let ordensServico: OrdemServico[] = [];
let proximoIdOS = 1;

// Foto anexada a uma O.S. (ex.: a avaria fotografada no campo pelo app do operador).
// Fica numa lista À PARTE: listar O.S. não carrega o peso das imagens.
type TipoFoto = 'image/jpeg' | 'image/png';

interface FotoOS {
  id: number;
  ordemServicoId: number;  // "chave estrangeira": aponta para OrdemServico.id
  tipo: TipoFoto;          // descoberto pelos bytes do arquivo, não pelo que o cliente diz
  tamanho: number;         // em bytes
  data: string;
  conteudo: Buffer;        // os bytes da imagem (em memória, como os demais dados)
}

let fotosOS: FotoOS[] = [];
let proximoIdFoto = 1;

const TAMANHO_MAXIMO_FOTO = 2 * 1024 * 1024; // 2 MB
const FOTOS_POR_OS = 5;

// Todo JPEG começa com os bytes FF D8 FF, e todo PNG com 89 50 4E 47 ("assinatura" do arquivo)
function tipoDaImagem(bytes: Buffer): TipoFoto | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (bytes.length > 4 && bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) {
    return 'image/png';
  }
  return null;
}

// Lê uma imagem enviada em base64 (fotos da O.S. e comprovante do abastecimento).
// A MESMA regra nos dois lugares: uma função só, em vez de copiar as validações.
type ResultadoImagem =
  | { ok: true; conteudo: Buffer; tipo: TipoFoto }
  | { ok: false; status: number; erro: string };

function lerImagemBase64(texto: unknown, campo: string): ResultadoImagem {
  // Formato: só letras, números, + e /, com até dois = no fim.
  // Sem essa conferência, o Buffer.from ignoraria os caracteres estranhos em silêncio.
  if (typeof texto !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(texto)) {
    return { ok: false, status: 400, erro: `Campo '${campo}' é obrigatório e deve ser a foto em base64` };
  }
  // Conteúdo: é mesmo uma imagem? Do tamanho permitido?
  const conteudo = Buffer.from(texto, 'base64');
  const tipo = tipoDaImagem(conteudo);
  if (!tipo) {
    return { ok: false, status: 400, erro: 'A foto deve ser JPEG ou PNG' };
  }
  if (conteudo.length > TAMANHO_MAXIMO_FOTO) {
    return { ok: false, status: 413, erro: 'Foto muito grande: o máximo é 2 MB' };
  }
  return { ok: true, conteudo, tipo };
}

// O que a API devolve de uma foto: os dados dela + o endereço da imagem (sem os bytes)
function resumoDaFoto(foto: FotoOS) {
  const { conteudo, ...dados } = foto;
  return { ...dados, url: `/ordens-servico/${foto.ordemServicoId}/fotos/${foto.id}` };
}

// Resultado da validação das peças do fechamento: OU deu certo (com os itens
// já conferidos), OU deu erro (com o código HTTP e a mensagem)
type ResultadoValidacaoPecas =
  | { ok: true; itens: { peca: Peca; quantidade: number }[] }
  | { ok: false; status: number; erro: string };

// Valida a lista de peças do fechamento INTEIRA antes de qualquer baixa (tudo ou nada)
function validarPecasDoFechamento(pecasInformadas: unknown): ResultadoValidacaoPecas {
  // Sem peças: fechamento sem baixa de estoque
  if (pecasInformadas === undefined) {
    return { ok: true, itens: [] };
  }

  if (!Array.isArray(pecasInformadas)) {
    return { ok: false, status: 400, erro: "Campo 'pecas', quando informado, deve ser uma lista" };
  }

  const itens: { peca: Peca; quantidade: number }[] = [];

  for (let i = 0; i < pecasInformadas.length; i++) {
    const n = i + 1; // posição "humana" do item na lista (1, 2, 3...)
    const item = pecasInformadas[i];

    // Formato de cada item
    if (typeof item !== 'object' || item === null) {
      return { ok: false, status: 400, erro: `Item ${n}: formato inválido, use { "pecaId": ..., "quantidade": ... }` };
    }
    const { pecaId, quantidade } = item as { pecaId?: unknown; quantidade?: unknown };

    if (!Number.isInteger(pecaId)) {
      return { ok: false, status: 400, erro: `Item ${n}: 'pecaId' deve ser um número inteiro` };
    }
    if (typeof quantidade !== 'number' || !Number.isFinite(quantidade) || quantidade <= 0) {
      return { ok: false, status: 400, erro: `Item ${n}: 'quantidade' deve ser um número maior que zero` };
    }

    // A peça existe?
    const peca = pecas.find(p => p.id === pecaId);
    if (!peca) {
      return { ok: false, status: 404, erro: `Item ${n}: peça ${pecaId} não encontrada` };
    }

    // Regras de negócio do item
    if (itens.some(it => it.peca.id === peca.id)) {
      return {
        ok: false, status: 400,
        erro: `A peça ${peca.codigo} aparece mais de uma vez: informe a quantidade total numa única linha`
      };
    }
    if (peca.unidade === 'un' && !Number.isInteger(quantidade)) {
      return {
        ok: false, status: 400,
        erro: `Item ${n}: a peça ${peca.codigo} é contada em unidades, a quantidade deve ser um número inteiro`
      };
    }

    itens.push({ peca, quantidade });
  }

  // Estoque nunca fica negativo: lista TODAS as peças sem saldo de uma vez
  const insuficientes = itens.filter(it => it.quantidade > it.peca.saldo);
  if (insuficientes.length > 0) {
    const detalhes = insuficientes
      .map(it => `${it.peca.codigo} (pedido ${it.quantidade}, saldo ${it.peca.saldo})`)
      .join('; ');
    return {
      ok: false, status: 409,
      erro: `Estoque insuficiente: ${detalhes}. Nenhuma baixa foi realizada.`
    };
  }

  return { ok: true, itens };
}

// ===================== ABASTECIMENTO =====================

// De onde veio o combustível: posto externo (com recibo) ou tanque da fazenda (diesel do almoxarifado)
type OrigemAbastecimento = 'Posto' | 'Tanque';
// Ciclo de vida: o operador registra (Pendente) e o gestor confere: aprova, recusa (final) ou
// DEVOLVE para correção (Em correção). Corrigido pelo operador, volta a Pendente.
type StatusAbastecimento = 'Pendente' | 'Em correção' | 'Aprovado' | 'Recusado';

const ORIGENS_ABASTECIMENTO: OrigemAbastecimento[] = ['Posto', 'Tanque'];

// O item do almoxarifado que representa o tanque de diesel da fazenda
const CODIGO_DIESEL = 'DSL-001';
const STATUS_ABASTECIMENTO: StatusAbastecimento[] = ['Pendente', 'Em correção', 'Aprovado', 'Recusado'];

// Cada vez que o gestor devolve o abastecimento: o que corrigir, quando, e quando foi corrigido
interface Devolucao {
  motivo: string;
  data: string;
  corrigidaEm?: string;
}

// Foto do comprovante (o recibo do posto), guardada junto do abastecimento
interface Comprovante {
  tipo: TipoFoto;
  tamanho: number;   // em bytes
  conteudo: Buffer;  // os bytes da imagem (nunca vão nas respostas em JSON)
}

interface Abastecimento {
  id: number;
  maquinaId: number;        // "chave estrangeira": aponta para Maquina.id
  operador: string;
  origem: OrigemAbastecimento;
  litros: number;
  horimetro: number;        // leitura no momento do abastecimento (não muda a máquina)
  posto?: string;           // só no Posto: nome do posto
  pecaId?: number;          // só no Tanque: o item do almoxarifado baixado (o diesel)
  valorTotal: number;       // R$: o valor pago no posto, ou litros x custo do diesel no tanque
  precoLitro: number;       // R$/L: valorTotal / litros (posto) ou custo do diesel, congelado (tanque)
  data: string;
  status: StatusAbastecimento;
  motivoRecusa?: string;    // preenchidos na conferência do gestor
  dataConferencia?: string;
  devolucoes: Devolucao[];  // histórico das devoluções para correção (vazio se nunca voltou)
  comprovante?: Comprovante;
}

let abastecimentos: Abastecimento[] = [];
let proximoIdAbastecimento = 1;

// ===================== LIMITES DO HORÍMETRO (Etapa 5, J6) =====================
// Uma regra só para o retorno, a abertura de O.S. e o registro de abastecimento.
// - MÍNIMO: a maior leitura conhecida. O abastecimento não muda o horímetro da máquina, mas a
//   leitura dele vale: quem abasteceu em campo com 1050 h não pode voltar com 1020 h.
// - MÁXIMO: o horímetro não avança mais que o tempo que passou desde a última leitura, com uma
//   folga de 24 h (registro feito com atraso, relógio do celular adiantado). Pega o "10000"
//   digitado no lugar de "1000".
const FOLGA_HORIMETRO_H = 24;

interface LimitesHorimetro {
  minimo: number;
  origemMinimo: string | null; // ex.: "abastecimento nº 5"; null = o próprio horímetro da máquina
  maximo: number | null;       // null = sem nenhuma leitura com data (máquina recém-cadastrada)
}

function limitesDoHorimetro(maquina: Maquina): LimitesHorimetro {
  // Abastecimentos que valem (pendentes também: a leitura existe até o gestor recusar)
  const validos = abastecimentos.filter(ab => ab.maquinaId === maquina.id && ab.status !== 'Recusado');

  let minimo = maquina.horimetro;
  let origemMinimo: string | null = null;
  for (const ab of validos) {
    if (ab.horimetro > minimo) {
      minimo = ab.horimetro;
      origemMinimo = `abastecimento nº ${ab.id}`;
    }
  }

  // A leitura mais recente, pela data: saídas, retornos, aberturas de O.S. e abastecimentos
  const datas = [
    ...movimentacoes.filter(mov => mov.maquinaId === maquina.id).flatMap(mov => [mov.dataSaida, mov.dataRetorno]),
    ...ordensServico.filter(os => os.maquinaId === maquina.id).map(os => os.dataAbertura),
    ...validos.map(ab => ab.data),
  ].filter((data): data is string => data !== undefined);

  if (datas.length === 0) {
    return { minimo, origemMinimo, maximo: null };
  }
  const ultimaLeitura = Math.max(...datas.map(data => new Date(data).getTime()));
  const horasDesde = (Date.now() - ultimaLeitura) / 3_600_000;
  return { minimo, origemMinimo, maximo: arredondar(minimo + horasDesde + FOLGA_HORIMETRO_H, 1) };
}

// A mensagem do 400 quando o horímetro sai dos limites; null se estiver dentro
function erroDoHorimetro(horimetro: number, limites: LimitesHorimetro): string | null {
  if (horimetro < limites.minimo) {
    return limites.origemMinimo
      ? `Horímetro informado (${horimetro}) é menor que o último registrado (${limites.minimo}) no ${limites.origemMinimo}`
      : `Horímetro informado (${horimetro}) é menor que o atual (${limites.minimo})`;
  }
  if (limites.maximo !== null && horimetro > limites.maximo) {
    return `Horímetro informado (${horimetro}) é maior que o máximo possível (${limites.maximo}): ` +
      `a máquina não trabalha mais horas do que as que passaram desde a última leitura. Confira o painel.`;
  }
  return null;
}

// Formato dos campos que o OPERADOR digita: os mesmos no registro (POST) e na correção (PUT).
// Devolve a mensagem do primeiro erro, ou null se estiver tudo certo (sempre um 400).
function erroNosCampos(
  origem: OrigemAbastecimento,
  campos: { litros: unknown; horimetro: unknown; posto: unknown; valorTotal: unknown }
): string | null {
  const { litros, horimetro, posto, valorTotal } = campos;
  if (typeof litros !== 'number' || !Number.isFinite(litros) || litros <= 0) {
    return "Campo 'litros' deve ser um número maior que zero";
  }
  if (typeof horimetro !== 'number' || !Number.isFinite(horimetro)) {
    return "Campo 'horimetro' é obrigatório e deve ser um número";
  }
  if (origem === 'Posto') {
    // Posto: nome e valor pago
    if (typeof posto !== 'string' || posto.trim() === '') {
      return "Campo 'posto' é obrigatório no abastecimento em posto";
    }
    if (typeof valorTotal !== 'number' || !Number.isFinite(valorTotal) || valorTotal <= 0) {
      return "Campo 'valorTotal' deve ser um número maior que zero";
    }
  } else if (posto !== undefined || valorTotal !== undefined) {
    // Tanque: o custo vem do almoxarifado (última compra do diesel), não de quem registra
    return "No abastecimento pelo tanque, não informe 'posto' nem 'valorTotal': o custo vem do almoxarifado";
  }
  return null;
}

// Por que um abastecimento NÃO pode ser conferido agora (409 da aprovação e da recusa)
function motivoParaNaoConferir(abastecimento: Abastecimento): string {
  return abastecimento.status === 'Em correção'
    ? `Abastecimento nº ${abastecimento.id} está com o operador para correção: confira quando ele reenviar`
    : `Abastecimento nº ${abastecimento.id} já foi conferido (${abastecimento.status})`;
}

// O que a API devolve de um abastecimento: os dados + o endereço do comprovante (sem os bytes)
function resumoDoAbastecimento(abastecimento: Abastecimento) {
  const { comprovante, ...dados } = abastecimento;
  return {
    ...dados,
    comprovante: comprovante
      ? { tipo: comprovante.tipo, tamanho: comprovante.tamanho, url: `/abastecimentos/${abastecimento.id}/comprovante` }
      : null
  };
}

// 1. Caminho para VER as máquinas (Listagem)
app.get('/maquinas', (req, res) => {
  res.json(maquinas);
});

// 1.1 Caminho para CADASTRAR uma máquina
app.post('/maquinas', (req, res) => {
  const { tag, modelo, horimetro } = req.body ?? {};

  // Validação 1 (formato): campos obrigatórios
  if (typeof tag !== 'string' || tag.trim() === '') {
    return res.status(400).json({ erro: "Campo 'tag' é obrigatório" });
  }
  if (typeof modelo !== 'string' || modelo.trim() === '') {
    return res.status(400).json({ erro: "Campo 'modelo' é obrigatório" });
  }
  if (typeof horimetro !== 'number' || !Number.isFinite(horimetro) || horimetro < 0) {
    return res.status(400).json({ erro: "Campo 'horimetro' deve ser um número maior ou igual a zero" });
  }

  // Validação 2 (regra de negócio): tag única (comparando já normalizada)
  const tagNormalizada = tag.trim().toUpperCase();
  if (maquinas.some(m => m.tag === tagNormalizada)) {
    return res.status(409).json({ erro: `Já existe uma máquina com a tag ${tagNormalizada}` });
  }

  // Tudo certo: toda máquina nova começa disponível no pátio
  const novaMaquina: Maquina = {
    id: proximoIdMaquina++,
    tag: tagNormalizada,
    modelo: modelo.trim(),
    horimetro,
    status: 'Disponível'
  };
  maquinas.push(novaMaquina);

  res.status(201).json(novaMaquina);
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

  // Validação 4 (regra de negócio): nunca anda para trás (nem abaixo de um abastecimento feito em
  // campo) e não avança mais que o tempo que passou (limitesDoHorimetro, Etapa 5)
  const erroHorimetro = erroDoHorimetro(horimetro, limitesDoHorimetro(maquina));
  if (erroHorimetro) {
    return res.status(400).json({ erro: erroHorimetro });
  }

  // Localiza a movimentação "aberta" (sem retorno) desta máquina
  const movimentacao = buscarMovimentacaoAberta(maquina.id);

  if (!movimentacao) {
    // Não deveria acontecer: toda máquina 'Em Operação' saiu pela rota de saída
    return res.status(409).json({ erro: `Nenhuma saída em aberto para a máquina ${maquina.tag}` });
  }

  // Tudo certo: fecha a movimentação e registra o retorno
  fecharMovimentacao(movimentacao, horimetro, avarias);

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

// 10. Caminho para VER as ordens de serviço
// (filtros opcionais e combináveis: ?maquinaId=1 e ?status=Aberta)
app.get('/ordens-servico', (req, res) => {
  const { maquinaId, status } = req.query;
  let resultado = ordensServico;

  if (maquinaId !== undefined) {
    const idFiltro = Number(maquinaId);
    if (!Number.isInteger(idFiltro)) {
      return res.status(400).json({ erro: "Parâmetro 'maquinaId' deve ser um número inteiro" });
    }
    resultado = resultado.filter(os => os.maquinaId === idFiltro);
  }

  if (status !== undefined) {
    if (!STATUS_OS.includes(status as StatusOS)) {
      return res.status(400).json({ erro: `Parâmetro 'status' deve ser um destes: ${STATUS_OS.join(', ')}` });
    }
    resultado = resultado.filter(os => os.status === status);
  }

  res.json(resultado);
});

// 11. Caminho para VER uma ordem de serviço específica (com os dados da máquina)
app.get('/ordens-servico/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'O id deve ser um número inteiro' });
  }

  const ordemServico = ordensServico.find(os => os.id === id);
  if (!ordemServico) {
    return res.status(404).json({ erro: 'Ordem de serviço não encontrada' });
  }

  // "Junta" a O.S. com a máquina, para a tela de detalhes não precisar de outra chamada
  const maquina = maquinas.find(m => m.id === ordemServico.maquinaId);

  res.json({
    ...ordemServico,
    maquina: maquina ? { id: maquina.id, tag: maquina.tag, modelo: maquina.modelo } : null
  });
});

// 12. Caminho para VER o histórico e o custo de manutenção de uma máquina
app.get('/maquinas/:id/manutencoes', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'O id deve ser um número inteiro' });
  }

  const maquina = maquinas.find(m => m.id === id);
  if (!maquina) {
    return res.status(404).json({ erro: 'Máquina não encontrada' });
  }

  const ordens = ordensServico.filter(os => os.maquinaId === maquina.id);
  const fechadas = ordens.filter(os => os.status === 'Fechada');

  // Soma o custo das O.S. fechadas de um tipo (ou de todas, sem tipo)
  const somarCusto = (tipo?: TipoOS) => arredondar(
    fechadas
      .filter(os => tipo === undefined || os.tipo === tipo)
      .reduce((soma, os) => soma + os.custoTotal, 0),
    2
  );

  res.json({
    maquina: maquina.tag,
    status: maquina.status,
    totalOrdens: ordens.length,
    abertas: ordens.length - fechadas.length,
    fechadas: fechadas.length,
    custoTotal: somarCusto(),
    custoPorTipo: {
      Preventiva: somarCusto('Preventiva'),
      Corretiva: somarCusto('Corretiva')
    },
    ordens
  });
});

// 13. Caminho para ABRIR uma ordem de serviço
app.post('/ordens-servico', (req, res) => {
  const { maquinaId, tipo, descricao, horimetro } = req.body ?? {};

  // Validação 1 (formato): qual máquina?
  if (!Number.isInteger(maquinaId)) {
    return res.status(400).json({ erro: "Campo 'maquinaId' é obrigatório e deve ser um número inteiro" });
  }

  // Validação 2: a máquina existe?
  const maquina = maquinas.find(m => m.id === maquinaId);
  if (!maquina) {
    return res.status(404).json({ erro: 'Máquina não encontrada' });
  }

  // Validação 3 (estado): uma O.S. aberta por máquina
  if (maquina.status === 'Em Manutenção') {
    const osAberta = ordensServico.find(os => os.maquinaId === maquina.id && os.status === 'Aberta');
    return res.status(409).json({
      erro: `Máquina ${maquina.tag} já está em manutenção (O.S. nº ${osAberta?.id} aberta)`
    });
  }

  // Validação 4 (estado): máquina em campo precisa ter a saída em aberto
  // (ela será fechada automaticamente com o horímetro da parada)
  const movimentacaoAberta = maquina.status === 'Em Operação'
    ? buscarMovimentacaoAberta(maquina.id)
    : undefined;

  if (maquina.status === 'Em Operação' && !movimentacaoAberta) {
    // Não deveria acontecer: toda máquina 'Em Operação' saiu pela rota de saída
    return res.status(409).json({ erro: `Nenhuma saída em aberto para a máquina ${maquina.tag}` });
  }

  // Validação 5 (formato): dados da O.S.
  if (!TIPOS_OS.includes(tipo)) {
    return res.status(400).json({ erro: `Campo 'tipo' deve ser um destes: ${TIPOS_OS.join(', ')}` });
  }
  if (typeof descricao !== 'string' || descricao.trim() === '') {
    return res.status(400).json({ erro: "Campo 'descricao' é obrigatório" });
  }
  if (typeof horimetro !== 'number' || !Number.isFinite(horimetro)) {
    return res.status(400).json({ erro: "Campo 'horimetro' é obrigatório e deve ser um número" });
  }

  // Validação 6 (regra de negócio): os mesmos limites do retorno (limitesDoHorimetro)
  const erroHorimetro = erroDoHorimetro(horimetro, limitesDoHorimetro(maquina));
  if (erroHorimetro) {
    return res.status(400).json({ erro: erroHorimetro });
  }

  // Tudo certo: abre a O.S. e a máquina vai para a oficina
  const ordemServico: OrdemServico = {
    id: proximoIdOS++,
    maquinaId: maquina.id,
    tipo,
    status: 'Aberta',
    descricao: descricao.trim(),
    horimetroParada: horimetro,
    dataAbertura: new Date().toISOString(),
    itens: [],        // as peças entram no fechamento
    custoTotal: 0
  };
  ordensServico.push(ordemServico);

  // Máquina estava em campo: encerra a saída com o horímetro da parada,
  // registrando o problema da O.S. como avaria
  if (movimentacaoAberta) {
    fecharMovimentacao(movimentacaoAberta, horimetro, `O.S. nº ${ordemServico.id}: ${ordemServico.descricao}`);
  }

  maquina.status = 'Em Manutenção';
  maquina.horimetro = horimetro;

  res.status(201).json({
    mensagem: movimentacaoAberta
      ? 'Ordem de serviço aberta! A saída da máquina foi encerrada automaticamente.'
      : 'Ordem de serviço aberta!',
    ordemServico,
    maquina,
    movimentacaoEncerrada: movimentacaoAberta ?? null
  });
});

// 14. Caminho para FECHAR uma ordem de serviço
app.post('/ordens-servico/:id/fechamento', (req, res) => {
  const id = Number(req.params.id);

  // Validação 1 (formato): o id é um número inteiro?
  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'O id deve ser um número inteiro' });
  }

  // Validação 2: a O.S. existe?
  const ordemServico = ordensServico.find(os => os.id === id);
  if (!ordemServico) {
    return res.status(404).json({ erro: 'Ordem de serviço não encontrada' });
  }

  // Validação 3 (estado): só fecha O.S. aberta
  if (ordemServico.status !== 'Aberta') {
    return res.status(409).json({ erro: `O.S. nº ${ordemServico.id} já está fechada` });
  }

  // Validação 4: peças usadas — valida a lista inteira (tudo ou nada)
  const validacao = validarPecasDoFechamento(req.body?.pecas);
  if (!validacao.ok) {
    return res.status(validacao.status).json({ erro: validacao.erro });
  }

  // Tudo validado: agora sim, baixa automática de cada peça no estoque
  const dataFechamento = new Date().toISOString();

  for (const { peca, quantidade } of validacao.itens) {
    const custoUnitario = peca.custoUnitario;                  // custo congelado AGORA
    const valorTotal = arredondar(quantidade * custoUnitario, 2);

    peca.saldo = arredondar(peca.saldo - quantidade, 2);

    // Movimento de saída no kardex, apontando para a O.S.
    movimentosEstoque.push({
      id: proximoIdMovimentoEstoque++,
      pecaId: peca.id,
      tipo: 'saida',
      quantidade,
      custoUnitario,
      valorTotal,
      saldoApos: peca.saldo,
      data: dataFechamento,
      ordemServicoId: ordemServico.id
    });

    // Item da O.S., com o custo copiado (não muda com compras futuras)
    ordemServico.itens.push({ pecaId: peca.id, codigo: peca.codigo, quantidade, custoUnitario, valorTotal });
  }

  // Custo total da manutenção: soma dos itens
  ordemServico.custoTotal = arredondar(
    ordemServico.itens.reduce((soma, item) => soma + item.valorTotal, 0),
    2
  );

  // Fecha a O.S. e a máquina volta para o pátio
  ordemServico.status = 'Fechada';
  ordemServico.dataFechamento = dataFechamento;

  const maquina = maquinas.find(m => m.id === ordemServico.maquinaId);
  if (maquina) {
    maquina.status = 'Disponível';
  }

  res.json({ mensagem: 'Ordem de serviço fechada! Máquina liberada.', ordemServico, maquina });
});

// 15. Caminho para ANEXAR uma foto a uma O.S. aberta (corpo: { "imagem": "<base64>" })
app.post('/ordens-servico/:id/fotos', (req, res) => {
  const id = Number(req.params.id);

  // Validação 1 (formato): o id é um número inteiro?
  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'O id deve ser um número inteiro' });
  }

  // Validação 2: a O.S. existe?
  const ordemServico = ordensServico.find(os => os.id === id);
  if (!ordemServico) {
    return res.status(404).json({ erro: 'Ordem de serviço não encontrada' });
  }

  // Validação 3 (estado): só O.S. aberta recebe foto, e com um limite por O.S.
  if (ordemServico.status !== 'Aberta') {
    return res.status(409).json({ erro: `O.S. nº ${ordemServico.id} já está fechada` });
  }
  if (fotosOS.filter(foto => foto.ordemServicoId === id).length >= FOTOS_POR_OS) {
    return res.status(409).json({ erro: `A O.S. nº ${id} já tem ${FOTOS_POR_OS} fotos (o máximo)` });
  }

  // Validações 4 e 5 (formato e conteúdo da imagem): a regra fica em lerImagemBase64
  const imagem = lerImagemBase64(req.body?.imagem, 'imagem');
  if (!imagem.ok) {
    return res.status(imagem.status).json({ erro: imagem.erro });
  }
  const { conteudo, tipo } = imagem;

  const foto: FotoOS = {
    id: proximoIdFoto++,
    ordemServicoId: id,
    tipo,
    tamanho: conteudo.length,
    data: new Date().toISOString(),
    conteudo
  };
  fotosOS.push(foto);

  res.status(201).json({ mensagem: 'Foto anexada!', foto: resumoDaFoto(foto) });
});

// 16. Caminho para LISTAR as fotos de uma O.S. (só os dados; a imagem vem pela url de cada uma)
app.get('/ordens-servico/:id/fotos', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'O id deve ser um número inteiro' });
  }
  if (!ordensServico.some(os => os.id === id)) {
    return res.status(404).json({ erro: 'Ordem de serviço não encontrada' });
  }

  res.json(fotosOS.filter(foto => foto.ordemServicoId === id).map(resumoDaFoto));
});

// 17. Caminho para VER a imagem: devolve os bytes com o Content-Type certo (não é JSON!)
app.get('/ordens-servico/:id/fotos/:fotoId', (req, res) => {
  const id = Number(req.params.id);
  const fotoId = Number(req.params.fotoId);

  if (!Number.isInteger(id) || !Number.isInteger(fotoId)) {
    return res.status(400).json({ erro: 'Os ids devem ser números inteiros' });
  }

  const foto = fotosOS.find(f => f.id === fotoId && f.ordemServicoId === id);
  if (!foto) {
    return res.status(404).json({ erro: 'Foto não encontrada' });
  }

  res.type(foto.tipo).send(foto.conteudo);
});

// 18. Caminho para REGISTRAR um abastecimento (pelo app do operador).
// No posto, o recibo vai NO MESMO JSON (campo "comprovante", em base64): ou entra tudo, ou nada.
// Pelo tanque da fazenda, o diesel é baixado do almoxarifado na hora.
app.post('/abastecimentos', (req, res) => {
  const { maquinaId, operador, origem, litros, horimetro, posto, valorTotal, comprovante } = req.body ?? {};

  // Validação 1 (formato): qual máquina?
  if (!Number.isInteger(maquinaId)) {
    return res.status(400).json({ erro: "Campo 'maquinaId' é obrigatório e deve ser um número inteiro" });
  }

  // Validação 2: a máquina existe?
  const maquina = maquinas.find(m => m.id === maquinaId);
  if (!maquina) {
    return res.status(404).json({ erro: 'Máquina não encontrada' });
  }

  // Validação 3 (formato): dados de todo abastecimento
  if (typeof operador !== 'string' || operador.trim() === '') {
    return res.status(400).json({ erro: "Campo 'operador' é obrigatório" });
  }
  if (!ORIGENS_ABASTECIMENTO.includes(origem)) {
    return res.status(400).json({ erro: `Campo 'origem' deve ser um destes: ${ORIGENS_ABASTECIMENTO.join(', ')}` });
  }
  // Litros, horímetro e os dados do posto: a mesma função da correção (rota 26)
  const erroDeFormato = erroNosCampos(origem, { litros, horimetro, posto, valorTotal });
  if (erroDeFormato) {
    return res.status(400).json({ erro: erroDeFormato });
  }

  // Validação 4: no tanque, o diesel precisa existir e ter saldo
  let diesel: Peca | undefined;
  if (origem === 'Tanque') {
    diesel = pecas.find(peca => peca.codigo === CODIGO_DIESEL);
    if (!diesel) {
      return res.status(409).json({ erro: `O diesel (${CODIGO_DIESEL}) não está cadastrado no almoxarifado` });
    }
    // Estoque nunca fica negativo (a mesma regra do fechamento da O.S.)
    if (litros > diesel.saldo) {
      return res.status(409).json({
        erro: `Diesel insuficiente no tanque: pedido ${litros} L, saldo ${diesel.saldo} L. Nada foi registrado.`
      });
    }
  }

  // Comprovante: obrigatório no posto, opcional no tanque (ex.: foto do marcador da bomba)
  let foto: Comprovante | undefined;
  if (origem === 'Posto' || comprovante !== undefined) {
    const imagem = lerImagemBase64(comprovante, 'comprovante');
    if (!imagem.ok) {
      return res.status(imagem.status).json({ erro: imagem.erro });
    }
    foto = { tipo: imagem.tipo, tamanho: imagem.conteudo.length, conteudo: imagem.conteudo };
  }

  // Validação 5 (regra de negócio): o mínimo é o maior entre o horímetro da máquina e o do último
  // abastecimento dela que não foi recusado; o máximo, o tempo que passou (limitesDoHorimetro)
  const erroHorimetro = erroDoHorimetro(horimetro, limitesDoHorimetro(maquina));
  if (erroHorimetro) {
    return res.status(400).json({ erro: erroHorimetro });
  }

  // Tudo validado. O custo depende da origem: o valor pago no posto, ou o custo do diesel
  // NESTE momento (congelado: compras futuras não mudam abastecimentos já feitos)
  const data = new Date().toISOString();
  const abastecimento: Abastecimento = {
    id: proximoIdAbastecimento++,
    maquinaId: maquina.id,
    operador: operador.trim(),
    origem,
    litros,
    horimetro,
    ...(diesel
      ? {
          pecaId: diesel.id,
          valorTotal: arredondar(litros * diesel.custoUnitario, 2),
          precoLitro: diesel.custoUnitario
        }
      : {
          posto: posto.trim(),
          valorTotal: arredondar(valorTotal, 2),
          precoLitro: arredondar(valorTotal / litros, 3) // combustível costuma ter 3 casas (R$ 6,199)
        }),
    data,
    status: 'Pendente',
    devolucoes: [],
    comprovante: foto
  };
  abastecimentos.push(abastecimento);

  // Tanque: o diesel saiu de verdade, então a baixa é AGORA (se o gestor recusar, há estorno)
  if (diesel) {
    diesel.saldo = arredondar(diesel.saldo - litros, 2);
    movimentosEstoque.push({
      id: proximoIdMovimentoEstoque++,
      pecaId: diesel.id,
      tipo: 'saida',
      quantidade: litros,
      custoUnitario: diesel.custoUnitario,
      valorTotal: abastecimento.valorTotal,
      saldoApos: diesel.saldo,
      data,
      abastecimentoId: abastecimento.id
    });
  }

  res.status(201).json({
    mensagem: 'Abastecimento registrado! Aguardando a conferência do gestor.',
    abastecimento: resumoDoAbastecimento(abastecimento)
  });
});

// 19. Caminho para LISTAR os abastecimentos
// (filtros opcionais e combináveis: ?maquinaId=1&status=Pendente&origem=Posto&operador=Ana)
app.get('/abastecimentos', (req, res) => {
  const { maquinaId, status, origem, operador } = req.query;
  let resultado = abastecimentos;

  if (maquinaId !== undefined) {
    const idFiltro = Number(maquinaId);
    if (!Number.isInteger(idFiltro)) {
      return res.status(400).json({ erro: "Parâmetro 'maquinaId' deve ser um número inteiro" });
    }
    resultado = resultado.filter(ab => ab.maquinaId === idFiltro);
  }

  if (status !== undefined) {
    if (!STATUS_ABASTECIMENTO.includes(status as StatusAbastecimento)) {
      return res.status(400).json({ erro: `Parâmetro 'status' deve ser um destes: ${STATUS_ABASTECIMENTO.join(', ')}` });
    }
    resultado = resultado.filter(ab => ab.status === status);
  }

  if (origem !== undefined) {
    if (origem !== 'Posto' && origem !== 'Tanque') {
      return res.status(400).json({ erro: "Parâmetro 'origem' deve ser um destes: Posto, Tanque" });
    }
    resultado = resultado.filter(ab => ab.origem === origem);
  }

  // Operador: "ana" e "Ana " são a mesma pessoa (sem espaços nas pontas, sem maiúsculas)
  if (typeof operador === 'string') {
    const nome = operador.trim().toLocaleLowerCase('pt-BR');
    resultado = resultado.filter(ab => ab.operador.toLocaleLowerCase('pt-BR') === nome);
  }

  res.json(resultado.map(resumoDoAbastecimento));
});

// 20. Caminho para VER um abastecimento (com os dados da máquina, como o detalhe da O.S.)
app.get('/abastecimentos/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'O id deve ser um número inteiro' });
  }

  const abastecimento = abastecimentos.find(ab => ab.id === id);
  if (!abastecimento) {
    return res.status(404).json({ erro: 'Abastecimento não encontrado' });
  }

  const maquina = maquinas.find(m => m.id === abastecimento.maquinaId);
  res.json({
    ...resumoDoAbastecimento(abastecimento),
    maquina: maquina ? { id: maquina.id, tag: maquina.tag, modelo: maquina.modelo } : null
  });
});

// 21. Caminho para VER o comprovante: a imagem em si, com o Content-Type certo (não é JSON!)
app.get('/abastecimentos/:id/comprovante', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'O id deve ser um número inteiro' });
  }

  const abastecimento = abastecimentos.find(ab => ab.id === id);
  if (!abastecimento) {
    return res.status(404).json({ erro: 'Abastecimento não encontrado' });
  }
  if (!abastecimento.comprovante) {
    return res.status(404).json({ erro: 'Este abastecimento não tem comprovante' });
  }

  res.type(abastecimento.comprovante.tipo).send(abastecimento.comprovante.conteudo);
});

// 22. Caminho para APROVAR um abastecimento (conferência do gestor, na web)
app.post('/abastecimentos/:id/aprovacao', (req, res) => {
  const id = Number(req.params.id);

  // Validação 1 (formato): o id é um número inteiro?
  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'O id deve ser um número inteiro' });
  }

  // Validação 2: o abastecimento existe?
  const abastecimento = abastecimentos.find(ab => ab.id === id);
  if (!abastecimento) {
    return res.status(404).json({ erro: 'Abastecimento não encontrado' });
  }

  // Validação 3 (estado): só se confere o que está Pendente. A decisão é final.
  if (abastecimento.status !== 'Pendente') {
    return res.status(409).json({ erro: motivoParaNaoConferir(abastecimento) });
  }

  abastecimento.status = 'Aprovado';
  abastecimento.dataConferencia = new Date().toISOString();

  res.json({ mensagem: 'Abastecimento aprovado!', abastecimento: resumoDoAbastecimento(abastecimento) });
});

// 23. Caminho para RECUSAR um abastecimento (com motivo). Pelo tanque, o diesel volta ao estoque.
app.post('/abastecimentos/:id/recusa', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'O id deve ser um número inteiro' });
  }

  const abastecimento = abastecimentos.find(ab => ab.id === id);
  if (!abastecimento) {
    return res.status(404).json({ erro: 'Abastecimento não encontrado' });
  }

  if (abastecimento.status !== 'Pendente') {
    return res.status(409).json({ erro: motivoParaNaoConferir(abastecimento) });
  }

  // Validação 4 (formato): o operador precisa saber POR QUE foi recusado
  const { motivo } = req.body ?? {};
  if (typeof motivo !== 'string' || motivo.trim() === '') {
    return res.status(400).json({ erro: "Campo 'motivo' é obrigatório para recusar" });
  }

  const data = new Date().toISOString();
  abastecimento.status = 'Recusado';
  abastecimento.motivoRecusa = motivo.trim();
  abastecimento.dataConferencia = data;

  // Pelo tanque, o diesel já tinha sido baixado no registro: o ESTORNO devolve os litros, com o
  // MESMO custo da saída (e sem mudar o custo do diesel, que só muda com uma compra)
  let estorno: MovimentoEstoque | null = null;
  const diesel = abastecimento.pecaId !== undefined ? pecas.find(peca => peca.id === abastecimento.pecaId) : undefined;
  if (diesel) {
    diesel.saldo = arredondar(diesel.saldo + abastecimento.litros, 2);
    estorno = {
      id: proximoIdMovimentoEstoque++,
      pecaId: diesel.id,
      tipo: 'entrada',
      quantidade: abastecimento.litros,
      custoUnitario: abastecimento.precoLitro,
      valorTotal: abastecimento.valorTotal,
      saldoApos: diesel.saldo,
      data,
      abastecimentoId: abastecimento.id
    };
    movimentosEstoque.push(estorno);
  }

  res.json({
    mensagem: estorno
      ? `Abastecimento recusado. ${abastecimento.litros} L de diesel voltaram ao estoque.`
      : 'Abastecimento recusado.',
    abastecimento: resumoDoAbastecimento(abastecimento),
    estorno
  });
});

// 24. Caminho para VER o combustível de uma máquina: consumo (L/h) e custo, só com os APROVADOS
app.get('/maquinas/:id/combustivel', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'O id deve ser um número inteiro' });
  }

  const maquina = maquinas.find(m => m.id === id);
  if (!maquina) {
    return res.status(404).json({ erro: 'Máquina não encontrada' });
  }

  const daMaquina = abastecimentos.filter(ab => ab.maquinaId === maquina.id);
  const aprovados = daMaquina
    .filter(ab => ab.status === 'Aprovado')
    .sort((a, b) => a.horimetro - b.horimetro);

  // Consumo médio: o PRIMEIRO abastecimento é só o ponto de partida (ninguém sabe o que já havia
  // no tanque). O que foi colocado DEPOIS dele é o que a máquina gastou nas horas trabalhadas.
  const primeiro = aprovados[0];
  const ultimo = aprovados[aprovados.length - 1];
  const depoisDoPrimeiro = aprovados.slice(1);
  const horasMedidas = aprovados.length >= 2 ? arredondar(ultimo.horimetro - primeiro.horimetro, 1) : 0;
  const somar = (lista: Abastecimento[], campo: 'litros' | 'valorTotal') =>
    lista.reduce((soma, ab) => soma + ab[campo], 0);

  res.json({
    maquina: maquina.tag,
    aprovados: aprovados.length,
    pendentes: daMaquina.filter(ab => ab.status === 'Pendente').length,
    emCorrecao: daMaquina.filter(ab => ab.status === 'Em correção').length,
    litros: arredondar(somar(aprovados, 'litros'), 2),
    custoTotal: arredondar(somar(aprovados, 'valorTotal'), 2),
    horasMedidas,
    // null = sem dados suficientes (menos de 2 abastecimentos aprovados, ou horímetro parado)
    consumoMedio: horasMedidas > 0 ? arredondar(somar(depoisDoPrimeiro, 'litros') / horasMedidas, 2) : null,
    custoPorHora: horasMedidas > 0 ? arredondar(somar(depoisDoPrimeiro, 'valorTotal') / horasMedidas, 2) : null,
    abastecimentos: daMaquina.map(resumoDoAbastecimento)
  });
});

// 25. Caminho para DEVOLVER um abastecimento para correção (o gestor, na web).
// Para erro de preenchimento: o MESMO abastecimento volta ao operador, em vez de recusar e
// exigir um registro novo. Nada muda no estoque: o diesel continua baixado até a correção.
app.post('/abastecimentos/:id/devolucao', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'O id deve ser um número inteiro' });
  }

  const abastecimento = abastecimentos.find(ab => ab.id === id);
  if (!abastecimento) {
    return res.status(404).json({ erro: 'Abastecimento não encontrado' });
  }

  // Só o que está esperando a conferência pode voltar (Em correção, a vez é do operador)
  if (abastecimento.status !== 'Pendente') {
    return res.status(409).json({
      erro: `Só um abastecimento Pendente pode ser devolvido (o nº ${id} está ${abastecimento.status})`
    });
  }

  // O operador precisa saber O QUE corrigir
  const { motivo } = req.body ?? {};
  if (typeof motivo !== 'string' || motivo.trim() === '') {
    return res.status(400).json({ erro: "Campo 'motivo' é obrigatório para devolver: diga o que corrigir" });
  }

  abastecimento.status = 'Em correção';
  abastecimento.devolucoes.push({ motivo: motivo.trim(), data: new Date().toISOString() });

  res.json({
    mensagem: `Abastecimento nº ${id} devolvido ao operador para correção.`,
    abastecimento: resumoDoAbastecimento(abastecimento)
  });
});

// 26. Caminho para CORRIGIR um abastecimento devolvido (o operador, no app).
// Corpo: os campos que ele digita (litros, horimetro, posto, valorTotal) e, se quiser, uma foto nova.
// Máquina, operador e origem não mudam: origem errada é registro indevido (o gestor recusa).
app.put('/abastecimentos/:id', (req, res) => {
  const id = Number(req.params.id);

  // Validação 1 (formato): o id é um número inteiro?
  if (!Number.isInteger(id)) {
    return res.status(400).json({ erro: 'O id deve ser um número inteiro' });
  }

  // Validação 2: o abastecimento existe?
  const abastecimento = abastecimentos.find(ab => ab.id === id);
  if (!abastecimento) {
    return res.status(404).json({ erro: 'Abastecimento não encontrado' });
  }

  // Validação 3 (estado): só o que foi devolvido pode ser alterado
  if (abastecimento.status !== 'Em correção') {
    return res.status(409).json({
      erro: `Só um abastecimento devolvido para correção pode ser alterado (o nº ${id} está ${abastecimento.status})`
    });
  }

  const { maquinaId, origem, litros, horimetro, posto, valorTotal, comprovante } = req.body ?? {};

  // Validação 4: o que NÃO muda na correção
  if (origem !== undefined && origem !== abastecimento.origem) {
    return res.status(400).json({
      erro: `A origem não muda na correção (é ${abastecimento.origem}). Origem errada: o gestor deve recusar.`
    });
  }
  if (maquinaId !== undefined && maquinaId !== abastecimento.maquinaId) {
    return res.status(400).json({ erro: 'A máquina não muda na correção. Máquina errada: o gestor deve recusar.' });
  }

  // Validação 5 (formato): a MESMA função do registro
  const erroDeFormato = erroNosCampos(abastecimento.origem, { litros, horimetro, posto, valorTotal });
  if (erroDeFormato) {
    return res.status(400).json({ erro: erroDeFormato });
  }

  // Validação 6 (regra de negócio): o horímetro fica entre o do abastecimento ANTERIOR e o do
  // SEGUINTE desta máquina (os não recusados). O horímetro atual da máquina não serve aqui: ele
  // pode já ter andado depois deste abastecimento.
  const outros = abastecimentos.filter(
    ab => ab.maquinaId === abastecimento.maquinaId && ab.id !== id && ab.status !== 'Recusado'
  );
  const anterior = Math.max(...outros.filter(ab => ab.id < id).map(ab => ab.horimetro));
  const seguinte = Math.min(...outros.filter(ab => ab.id > id).map(ab => ab.horimetro));
  if (horimetro < anterior) {
    return res.status(400).json({ erro: `Horímetro informado (${horimetro}) é menor que o do abastecimento anterior (${anterior})` });
  }
  if (horimetro > seguinte) {
    return res.status(400).json({ erro: `Horímetro informado (${horimetro}) é maior que o do abastecimento seguinte (${seguinte})` });
  }

  // Validação 7 (tanque): se os litros mudaram, o estoque é ajustado pela DIFERENÇA
  const diferenca = arredondar(litros - abastecimento.litros, 2);
  const diesel = abastecimento.pecaId !== undefined ? pecas.find(peca => peca.id === abastecimento.pecaId) : undefined;
  if (diesel && diferenca > diesel.saldo) {
    return res.status(409).json({
      erro: `Diesel insuficiente no tanque para a correção: faltam ${diferenca} L, saldo ${diesel.saldo} L. Nada foi alterado.`
    });
  }

  // Validação 8: foto nova é opcional (sem ela, vale a anterior); se vier, segue a mesma regra
  let foto = abastecimento.comprovante;
  if (comprovante !== undefined) {
    const imagem = lerImagemBase64(comprovante, 'comprovante');
    if (!imagem.ok) {
      return res.status(imagem.status).json({ erro: imagem.erro });
    }
    foto = { tipo: imagem.tipo, tamanho: imagem.conteudo.length, conteudo: imagem.conteudo };
  }

  // Tudo validado: aplica a correção. No tanque, o preço continua o CONGELADO no registro.
  const data = new Date().toISOString();
  abastecimento.litros = litros;
  abastecimento.horimetro = horimetro;
  abastecimento.comprovante = foto;
  if (abastecimento.origem === 'Posto') {
    abastecimento.posto = posto.trim();
    abastecimento.valorTotal = arredondar(valorTotal, 2);
    abastecimento.precoLitro = arredondar(valorTotal / litros, 3);
  } else {
    abastecimento.valorTotal = arredondar(litros * abastecimento.precoLitro, 2);
  }

  // Tanque com litros diferentes: um movimento no kardex (saída se aumentou, entrada se diminuiu)
  let ajusteEstoque: MovimentoEstoque | null = null;
  if (diesel && diferenca !== 0) {
    diesel.saldo = arredondar(diesel.saldo - diferenca, 2);
    ajusteEstoque = {
      id: proximoIdMovimentoEstoque++,
      pecaId: diesel.id,
      tipo: diferenca > 0 ? 'saida' : 'entrada',
      quantidade: Math.abs(diferenca),
      custoUnitario: abastecimento.precoLitro,
      valorTotal: arredondar(Math.abs(diferenca) * abastecimento.precoLitro, 2),
      saldoApos: diesel.saldo,
      data,
      abastecimentoId: abastecimento.id
    };
    movimentosEstoque.push(ajusteEstoque);
  }

  // A devolução em aberto fica marcada como corrigida, e o abastecimento volta à conferência
  const devolucao = abastecimento.devolucoes[abastecimento.devolucoes.length - 1];
  if (devolucao) {
    devolucao.corrigidaEm = data;
  }
  abastecimento.status = 'Pendente';

  res.json({
    mensagem: 'Correção enviada! O abastecimento voltou para a conferência do gestor.',
    abastecimento: resumoDoAbastecimento(abastecimento),
    ajusteEstoque
  });
});

// 27. Caminho para VER os limites do horímetro de uma máquina (Etapa 5): o app e a web mostram a
// faixa válida ANTES de enviar, com a mesma regra que o retorno, a O.S. e o abastecimento aplicam.
app.get('/maquinas/:id/horimetro', (req, res) => {
  const maquina = maquinas.find(m => m.id === parseInt(req.params.id));
  if (!maquina) {
    return res.status(404).json({ erro: 'Máquina não encontrada' });
  }
  res.json(limitesDoHorimetro(maquina));
});

// ===================== POSIÇÕES (Etapa 6: localização em campo) =====================
// O celular do operador faz o papel de rastreador ENQUANTO a saída está aberta: o app manda as
// posições em lotes, e a web mostra a última de cada máquina num mapa. Fora de uma saída aberta,
// nenhuma posição é aceita (a posição é de uma PESSOA: só durante o trabalho, com consentimento).

interface Posicao {
  id: number;
  maquinaId: number;        // "chave estrangeira": aponta para Maquina.id
  movimentacaoId: number;   // a saída durante a qual a posição foi registrada
  operador: string;         // vem da saída aberta, não do corpo (o app não escolhe quem é)
  latitude: number;
  longitude: number;
  precisao: number;         // raio de incerteza, em metros (o GPS informa)
  data: string;             // quando o CELULAR leu a posição
  recebidaEm: string;       // quando a API recebeu (o lote pode chegar atrasado, sem sinal)
}

let posicoes: Posicao[] = [];
let proximoIdPosicao = 1;

const MAXIMO_POR_LOTE = 50;
const MAXIMO_POR_SAIDA = 2000;        // passou disso, as mais antigas da saída saem (memória)
const TOLERANCIA_RELOGIO_MS = 5 * 60_000; // celular com o relógio até 5 min adiantado

// Valida UM ponto do lote. Devolve a mensagem do erro, ou null se estiver tudo certo.
function erroNaPosicao(ponto: any, dataSaida: string): string | null {
  const { latitude, longitude, precisao, data } = ponto ?? {};
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return "'latitude' deve ser um número entre -90 e 90";
  }
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return "'longitude' deve ser um número entre -180 e 180";
  }
  if (typeof precisao !== 'number' || !Number.isFinite(precisao) || precisao < 0) {
    return "'precisao' deve ser um número maior ou igual a zero (metros)";
  }
  const instante = typeof data === 'string' ? new Date(data).getTime() : NaN;
  if (Number.isNaN(instante)) {
    return "'data' deve ser uma data ISO 8601 (ex.: 2026-10-11T14:05:00.000Z)";
  }
  if (instante > Date.now() + TOLERANCIA_RELOGIO_MS) {
    return "'data' está no futuro: confira o relógio do celular";
  }
  if (instante < new Date(dataSaida).getTime()) {
    return "'data' é anterior à saída da máquina";
  }
  return null;
}

// 28. Caminho para ENVIAR posições de uma máquina em campo (pelo app do operador), em LOTE:
// { "posicoes": [{ "latitude": -22.1, "longitude": -47.9, "precisao": 12, "data": "..." }] }
// Tudo ou nada (como o fechamento da O.S.): um ponto inválido recusa o lote inteiro.
app.post('/maquinas/:id/posicoes', (req, res) => {
  const maquina = maquinas.find(m => m.id === parseInt(req.params.id));
  if (!maquina) {
    return res.status(404).json({ erro: 'Máquina não encontrada' });
  }

  // Só durante uma saída aberta: depois do retorno (ou da O.S.), a posição não é mais coletada
  const saida = maquina.status === 'Em Operação' ? buscarMovimentacaoAberta(maquina.id) : undefined;
  if (!saida) {
    return res.status(409).json({ erro: `Máquina ${maquina.tag} não está em campo: posições não são mais aceitas` });
  }

  const { posicoes: lote } = req.body ?? {};
  if (!Array.isArray(lote) || lote.length === 0) {
    return res.status(400).json({ erro: "Campo 'posicoes' deve ser uma lista com pelo menos uma posição" });
  }
  if (lote.length > MAXIMO_POR_LOTE) {
    return res.status(400).json({ erro: `No máximo ${MAXIMO_POR_LOTE} posições por envio` });
  }
  for (let i = 0; i < lote.length; i++) {
    const erro = erroNaPosicao(lote[i], saida.dataSaida);
    if (erro) {
      return res.status(400).json({ erro: `Posição ${i + 1}: ${erro}` });
    }
  }

  // Tudo validado: grava o lote
  const recebidaEm = new Date().toISOString();
  const novas: Posicao[] = lote.map((ponto: any) => ({
    id: proximoIdPosicao++,
    maquinaId: maquina.id,
    movimentacaoId: saida.id,
    operador: saida.operador,
    latitude: ponto.latitude,
    longitude: ponto.longitude,
    precisao: arredondar(ponto.precisao, 1),
    data: new Date(ponto.data).toISOString(),
    recebidaEm,
  }));
  posicoes.push(...novas);

  // Limite de memória por saída: ficam as mais recentes
  const daSaida = posicoes.filter(p => p.movimentacaoId === saida.id);
  if (daSaida.length > MAXIMO_POR_SAIDA) {
    const sobrando = new Set(
      [...daSaida].sort((a, b) => a.data.localeCompare(b.data)).slice(0, daSaida.length - MAXIMO_POR_SAIDA).map(p => p.id)
    );
    posicoes = posicoes.filter(p => !sobrando.has(p.id));
  }

  const ultima = [...novas].sort((a, b) => b.data.localeCompare(a.data))[0];
  res.status(201).json({ mensagem: `${novas.length} posição(ões) recebida(s)`, recebidas: novas.length, ultima });
});

// 29. Caminho para VER onde está cada máquina em campo agora (o mapa da web).
// Toda máquina com saída aberta aparece; sem nenhuma posição ainda, "posicao" vem null.
app.get('/posicoes/atuais', (_req, res) => {
  const agora = Date.now();
  const emCampo = maquinas
    .filter(m => m.status === 'Em Operação')
    .map(maquina => {
      const saida = buscarMovimentacaoAberta(maquina.id);
      const daSaida = saida ? posicoes.filter(p => p.movimentacaoId === saida.id) : [];
      const ultima = daSaida.sort((a, b) => b.data.localeCompare(a.data))[0] ?? null;
      return {
        maquinaId: maquina.id,
        tag: maquina.tag,
        modelo: maquina.modelo,
        operador: saida?.operador ?? null,
        frenteTrabalho: saida?.frenteTrabalho ?? null,
        dataSaida: saida?.dataSaida ?? null,
        posicao: ultima,
        // Há quanto tempo foi a última leitura (o mapa apaga o marcador "sem sinal")
        minutosDesde: ultima ? arredondar((agora - new Date(ultima.data).getTime()) / 60_000, 1) : null,
      };
    });
  res.json(emCampo);
});

// 30. Caminho para VER o trajeto de uma saída (filtro opcional ?movimentacaoId=).
// Sem filtro: a saída aberta da máquina ou, se ela não estiver em campo, a última saída.
app.get('/maquinas/:id/posicoes', (req, res) => {
  const maquina = maquinas.find(m => m.id === parseInt(req.params.id));
  if (!maquina) {
    return res.status(404).json({ erro: 'Máquina não encontrada' });
  }

  const daMaquina = movimentacoes.filter(mov => mov.maquinaId === maquina.id);
  let saida: Movimentacao | undefined;
  if (req.query.movimentacaoId !== undefined) {
    const idSaida = Number(req.query.movimentacaoId);
    if (!Number.isInteger(idSaida)) {
      return res.status(400).json({ erro: "Parâmetro 'movimentacaoId' deve ser um número inteiro" });
    }
    saida = daMaquina.find(mov => mov.id === idSaida);
    if (!saida) {
      return res.status(404).json({ erro: `Saída nº ${idSaida} não encontrada para a máquina ${maquina.tag}` });
    }
  } else {
    saida = buscarMovimentacaoAberta(maquina.id) ?? daMaquina[daMaquina.length - 1];
  }

  res.json({
    movimentacaoId: saida?.id ?? null,
    emCampo: saida !== undefined && saida.dataRetorno === undefined,
    // Em ordem de leitura: a polyline do mapa liga os pontos nesta ordem
    posicoes: saida
      ? posicoes.filter(p => p.movimentacaoId === saida.id).sort((a, b) => a.data.localeCompare(b.data))
      : [],
  });
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

  // Corpo maior que o limite do express.json() (100 KB; 3 MB nas rotas com foto)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'Corpo da requisição grande demais' });
  }

  // Qualquer outro erro inesperado: registra o detalhe só no console do servidor
  // e devolve ao cliente uma mensagem genérica, sem expor detalhes internos.
  console.error(err);
  res.status(500).json({ erro: 'Erro interno no servidor' });
});

app.listen(3000, () => {
  console.log('Eita nóis! Acesse: http://localhost:3000');
});