import { StatusMaquina } from '../models/maquina';
import { StatusOS, TipoOS } from '../models/ordem-servico';
import { OrigemAbastecimento, StatusAbastecimento } from '../models/abastecimento';

// Tons semânticos das etiquetas. A COR de cada tom fica em src/estilos/_comuns.scss;
// aqui fica só a decisão de QUAL tom cada valor recebe.
export type Tom = 'sucesso' | 'info' | 'alerta' | 'neutro' | 'corretiva' | 'erro';

// Record obriga a ter um tom para TODOS os valores do tipo
const TOM_STATUS_MAQUINA: Record<StatusMaquina, Tom> = {
  'Disponível': 'sucesso',
  'Em Operação': 'info',
  'Em Manutenção': 'alerta',
};

const TOM_STATUS_OS: Record<StatusOS, Tom> = {
  Aberta: 'alerta',
  Fechada: 'sucesso',
};

const TOM_TIPO_OS: Record<TipoOS, Tom> = {
  Preventiva: 'info',
  Corretiva: 'corretiva',
};

// Abastecimento (Etapa 4): pendente pede atenção do gestor; recusado é erro
const TOM_STATUS_ABASTECIMENTO: Record<StatusAbastecimento, Tom> = {
  Pendente: 'alerta',
  'Em correção': 'info', // a vez é do operador
  Aprovado: 'sucesso',
  Recusado: 'erro',
};

const TOM_ORIGEM_ABASTECIMENTO: Record<OrigemAbastecimento, Tom> = {
  Posto: 'info',
  Tanque: 'neutro',
};

// Funções com parâmetro tipado: podem ser chamadas no template mesmo com valores "any"
// (ex.: dentro de *matCellDef), sem o erro de indexar um Record com any
export function etiquetaStatusMaquina(status: StatusMaquina): string {
  return `etiqueta--${TOM_STATUS_MAQUINA[status]}`;
}

export function etiquetaStatusOS(status: StatusOS): string {
  return `etiqueta--${TOM_STATUS_OS[status]}`;
}

export function etiquetaTipoOS(tipo: TipoOS): string {
  return `etiqueta--${TOM_TIPO_OS[tipo]}`;
}

export function etiquetaStatusAbastecimento(status: StatusAbastecimento): string {
  return `etiqueta--${TOM_STATUS_ABASTECIMENTO[status]}`;
}

export function etiquetaOrigemAbastecimento(origem: OrigemAbastecimento): string {
  return `etiqueta--${TOM_ORIGEM_ABASTECIMENTO[origem]}`;
}
