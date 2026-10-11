import * as L from 'leaflet';

// O que os dois mapas da web têm em comum (Etapa 6): o mapa da frota (/mapa) e o trajeto no
// detalhe da máquina. Fica num lugar só: mudou o provedor do mapa, muda aqui.

// Sem nenhuma posição: o mapa abre no centro do Brasil
const CENTRO_INICIAL: L.LatLngTuple = [-15.8, -47.9];

// Cria o mapa na <div>, com os blocos do OpenStreetMap (livres, sem chave de API; a atribuição
// é obrigatória). Chame no afterNextRender: a <div> precisa existir.
export function criarMapa(elemento: HTMLElement, documento: Document): L.Map {
  carregarEstiloDoLeaflet(documento);
  const mapa = L.map(elemento).setView(CENTRO_INICIAL, 4);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; colaboradores do <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);
  return mapa;
}

// O ícone de uma máquina: um "balão" com a tag, apontando para o ponto exato.
// iconSize [0, 0]: o ícone é só a ÂNCORA; o CSS (.marcador, em _leaflet.scss) desenha o balão.
// Montado com textContent (nunca innerHTML): a tag vem do cadastro, e um texto com <script>
// viraria código na página.
export function iconeDaMaquina(documento: Document, tag: string, variante: string): L.DivIcon {
  const marcador = documento.createElement('span');
  marcador.className = `marcador marcador--${variante}`;
  marcador.textContent = tag;
  return L.divIcon({ className: 'ancora-marcador', html: marcador, iconSize: [0, 0] });
}

// O CSS do Leaflet é grande demais para o estilo de um componente (orçamento de 4 kB): o build
// gera um leaflet.css à parte (angular.json, "inject": false), e esta função o põe na página
// só quando um mapa abre. Uma vez basta: as outras telas reaproveitam o mesmo <link>.
function carregarEstiloDoLeaflet(documento: Document): void {
  if (documento.getElementById('estilo-leaflet')) {
    return;
  }
  const link = documento.createElement('link');
  link.id = 'estilo-leaflet';
  link.rel = 'stylesheet';
  link.href = 'leaflet.css';
  documento.head.append(link);
}
