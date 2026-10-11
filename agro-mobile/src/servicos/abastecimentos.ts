import { requisitar } from '@/api';
import { API_URL } from '@/config';
import { Maquina } from '@/models/maquina';
import {
  Abastecimento, DadosAbastecimento, RespostaAbastecimento, StatusAbastecimento,
} from '@/models/abastecimento';
import { buscarMaquina } from '@/servicos/maquinas';

// Abastecimentos (Etapa 4). Uma função por rota da API, como nos outros serviços.

// POST /abastecimentos (201, entra Pendente). No posto, o recibo vai no mesmo JSON, em base64.
export function registrarAbastecimento(dados: DadosAbastecimento): Promise<RespostaAbastecimento> {
  return requisitar<RespostaAbastecimento>('/abastecimentos', { method: 'POST', body: JSON.stringify(dados) });
}

export interface FiltrosAbastecimento {
  maquinaId?: number;
  operador?: string;
  status?: StatusAbastecimento;
}

// GET /abastecimentos?maquinaId=&operador=&status= (filtros opcionais e combináveis)
export function listarAbastecimentos(filtros: FiltrosAbastecimento = {}): Promise<Abastecimento[]> {
  // encodeURIComponent: um nome com espaço ou acento ("João Pedro") vira texto seguro na URL
  const partes = Object.entries(filtros)
    .filter(([, valor]) => valor !== undefined)
    .map(([campo, valor]) => `${campo}=${encodeURIComponent(String(valor))}`);
  return requisitar<Abastecimento[]>(`/abastecimentos${partes.length ? `?${partes.join('&')}` : ''}`);
}

// A url do comprovante vem sem o servidor: o <Image> precisa do endereço completo
export function enderecoDoComprovante(abastecimento: Abastecimento): string | null {
  return abastecimento.comprovante ? `${API_URL}${abastecimento.comprovante.url}` : null;
}

// O que a tela de abastecimento precisa: a máquina e o horímetro MÍNIMO, que é o maior entre o
// da máquina e o do último abastecimento dela não recusado (a mesma regra da API, Parte AB1)
export interface DadosParaAbastecer {
  maquina: Maquina;
  horimetroMinimo: number;
}

export async function buscarDadosParaAbastecer(maquinaId: number): Promise<DadosParaAbastecer> {
  const [maquina, anteriores] = await Promise.all([buscarMaquina(maquinaId), listarAbastecimentos({ maquinaId })]);
  const horimetroMinimo = Math.max(
    maquina.horimetro,
    ...anteriores.filter(ab => ab.status !== 'Recusado').map(ab => ab.horimetro),
  );
  return { maquina, horimetroMinimo };
}
