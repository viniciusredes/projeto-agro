import { EscolhaSegmentada, OpcaoSegmentada } from '@/componentes/escolha-segmentada';
import { PreferenciaTema, usePreferenciaTema } from '@/contextos/preferencia-tema';

// Sistema | Claro | Escuro, com os botões segmentados genéricos (os mesmos do Posto | Tanque)
const OPCOES: OpcaoSegmentada<PreferenciaTema>[] = [
  { valor: 'sistema', rotulo: 'Sistema' },
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
];

export function SeletorTema() {
  const { preferencia, escolher } = usePreferenciaTema();
  return <EscolhaSegmentada opcoes={OPCOES} valor={preferencia} aoEscolher={escolher} rotulo="Tema do app" />;
}
