import { requisitar } from '@/api';
import { API_URL } from '@/config';
import { Maquina } from '@/models/maquina';
import {
  Abastecimento, DadosAbastecimento, DadosCorrecao, RespostaAbastecimento, StatusAbastecimento,
} from '@/models/abastecimento';
import { buscarMaquina } from '@/servicos/maquinas';

// Abastecimentos (Etapa 4). Uma função por rota da API, como nos outros serviços.

// POST /abastecimentos (201, entra Pendente). No posto, o recibo vai no mesmo JSON, em base64.
export function registrarAbastecimento(dados: DadosAbastecimento): Promise<RespostaAbastecimento> {
  return requisitar<RespostaAbastecimento>('/abastecimentos', { method: 'POST', body: JSON.stringify(dados) });
}

// PUT /abastecimentos/:id: a correção de um abastecimento DEVOLVIDO pelo gestor (volta a Pendente).
// PUT, e não POST: altera o abastecimento que já existe (mesmo número, mesmo histórico).
export function corrigirAbastecimento(id: number, dados: DadosCorrecao): Promise<RespostaAbastecimento> {
  return requisitar<RespostaAbastecimento>(`/abastecimentos/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
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

// O que a tela de abastecimento precisa, nos dois modos (as mesmas regras da API):
// - registrar: horímetro MÍNIMO = o maior entre o da máquina e o do último abastecimento não recusado
// - corrigir: o abastecimento devolvido (para preencher o formulário) e o horímetro entre o do
//   abastecimento ANTERIOR e o do SEGUINTE da máquina (Parte AB4)
export interface DadosParaAbastecer {
  maquina: Maquina;
  horimetroMinimo: number;
  horimetroMaximo: number | null; // null = sem limite de cima (registro novo)
  corrigindo: Abastecimento | null;
}

export async function buscarDadosParaAbastecer(maquinaId: number, corrigirId?: number): Promise<DadosParaAbastecer> {
  const [maquina, daMaquina] = await Promise.all([buscarMaquina(maquinaId), listarAbastecimentos({ maquinaId })]);
  const validos = daMaquina.filter(ab => ab.status !== 'Recusado');

  if (corrigirId === undefined) {
    return {
      maquina,
      horimetroMinimo: Math.max(maquina.horimetro, ...validos.map(ab => ab.horimetro)),
      horimetroMaximo: null,
      corrigindo: null,
    };
  }

  const corrigindo = daMaquina.find(ab => ab.id === corrigirId) ?? null;
  const anteriores = validos.filter(ab => ab.id < corrigirId).map(ab => ab.horimetro);
  const seguintes = validos.filter(ab => ab.id > corrigirId).map(ab => ab.horimetro);
  return {
    maquina,
    horimetroMinimo: anteriores.length > 0 ? Math.max(...anteriores) : 0,
    horimetroMaximo: seguintes.length > 0 ? Math.min(...seguintes) : null,
    corrigindo,
  };
}
