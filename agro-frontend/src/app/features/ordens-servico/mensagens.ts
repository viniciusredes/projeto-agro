import { RespostaAberturaOS } from '../../core/models/ordem-servico';

// Texto do aviso de sucesso da abertura de O.S. (usado pela lista de O.S. e pela lista de Máquinas).
// Se a máquina estava em campo, a API encerrou a saída: mostramos as horas trabalhadas.
export function mensagemAberturaOS(resposta: RespostaAberturaOS): string {
  const numero = `O.S. nº ${resposta.ordemServico.id} aberta para ${resposta.maquina.tag}.`;
  const saida = resposta.movimentacaoEncerrada;
  return saida
    ? `${numero} Saída encerrada automaticamente (${saida.horasTrabalhadas} h trabalhadas).`
    : numero;
}
