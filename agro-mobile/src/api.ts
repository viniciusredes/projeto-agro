import { API_URL } from '@/config';

// Erro com uma mensagem pronta para mostrar ao operador
export class ErroApi extends Error {
  constructor(
    mensagem: string,
    readonly status: number, // 0 = nem chegou à API (rede, API parada)
  ) {
    super(mensagem);
  }
}

// Ponto ÚNICO de acesso à API (o papel do HttpClient + interceptor do front web).
// - Monta a URL com o endereço do .env.local
// - Manda e recebe JSON
// - Traduz qualquer falha numa mensagem: a { erro } da API tem prioridade, como na web
export async function requisitar<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      ...opcoes,
      headers: { 'Content-Type': 'application/json', ...opcoes.headers },
    });
  } catch {
    // fetch só "falha" quando nem houve resposta: sem rede, IP errado, API parada, firewall
    throw new ErroApi('Não foi possível conectar à API. Confira a rede e se ela está rodando.', 0);
  }

  // Diferente do HttpClient do Angular, o fetch NÃO trata 4xx/5xx como erro: é preciso olhar o "ok"
  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const mensagem = typeof corpo?.erro === 'string' ? corpo.erro : `Erro inesperado (HTTP ${resposta.status}).`;
    throw new ErroApi(mensagem, resposta.status);
  }
  return corpo as T;
}

// Mensagem para a tela a partir de qualquer erro (ErroApi ou outro)
export function mensagemDeErro(erro: unknown): string {
  return erro instanceof ErroApi ? erro.message : 'Erro inesperado. Tente novamente.';
}
