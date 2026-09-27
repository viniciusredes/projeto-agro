import { HttpContext, HttpContextToken, HttpErrorResponse } from '@angular/common/http';

// Prefixo de todas as chamadas à API.
// O proxy do ng serve (proxy.conf.json) repassa /api/... para http://localhost:3000/...
export const API_URL = '/api';

// "Etiqueta" que viaja junto com a requisição: quando true, a PRÓPRIA tela explica o erro
// (ex.: kardex mostra "Peça não encontrada") e o interceptor não repete a mensagem no snackbar.
export const ERRO_TRATADO_NA_TELA = new HttpContextToken<boolean>(() => false);

// Atalho para os services: http.get(url, { context: erroTratadoNaTela() })
export function erroTratadoNaTela(): HttpContext {
  return new HttpContext().set(ERRO_TRATADO_NA_TELA, true);
}

// Transforma qualquer erro de uma chamada HTTP numa mensagem para o usuário.
// A API sempre responde erros no formato { "erro": "mensagem" }: essa mensagem tem prioridade.
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof HttpErrorResponse) {
    const corpo = erro.error as { erro?: unknown } | null;
    if (corpo && typeof corpo.erro === 'string') {
      return corpo.erro;
    }
    // status 0: sem resposta | 5xx: servidor ou proxy com problema (ex.: API parada)
    if (erro.status === 0 || erro.status >= 500) {
      return 'Não foi possível conectar à API. Verifique se ela está rodando.';
    }
  }
  return 'Erro inesperado. Tente novamente.';
}
