import { requisitar } from '@/api';
import { Maquina } from '@/models/maquina';

// Uma função por rota da API (o papel do MaquinaService do front web).
// Funções declaradas FORA dos componentes são estáveis: podem ir direto para o useRequisicao.

// GET /maquinas
export function listarMaquinas(): Promise<Maquina[]> {
  return requisitar<Maquina[]>('/maquinas');
}
