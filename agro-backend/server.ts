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