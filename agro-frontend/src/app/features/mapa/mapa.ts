import {
  Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, signal, viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { map, timer } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import * as L from 'leaflet';
import { PosicaoService } from '../../core/services/posicao.service';
import { PosicaoAtual } from '../../core/models/posicao';
import { ROTULO_SINAL, TOM_SINAL, situacaoDoSinal, textoDoSinal } from './sinal';

// O celular envia a cada 30 s; buscar a cada 15 s deixa o mapa no máximo uns 45 s atrás do campo
export const ATUALIZACAO_MS = 15_000;

// Sem nenhuma posição ainda: o mapa abre no centro do Brasil
const CENTRO_INICIAL: L.LatLngTuple = [-15.8, -47.9];

// Mapa da frota (Etapa 6): onde está cada máquina em campo, pela posição que o app do operador envia
@Component({
  selector: 'app-mapa',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './mapa.html',
  styleUrl: './mapa.scss',
})
export class Mapa {
  private readonly posicaoService = inject(PosicaoService);
  private readonly documento = inject(DOCUMENT);
  private readonly elementoMapa = viewChild.required<ElementRef<HTMLDivElement>>('mapa');

  // POLLING: o tique começa em 0 (a primeira busca sai na hora) e o timer emite 1, 2, 3... a cada
  // 15 s; cada valor novo é o parâmetro do recurso, e parâmetro novo = busca nova.
  // Saiu da tela: o toSignal cancela o timer sozinho.
  private readonly tique = toSignal(timer(ATUALIZACAO_MS, ATUALIZACAO_MS).pipe(map(n => n + 1)), { initialValue: 0 });
  protected readonly posicoes = rxResource({
    params: () => this.tique(),
    stream: () => this.posicaoService.atuais(),
  });

  // Durante a recarga o rxResource mantém o valor anterior: o mapa não pisca a cada 15 s
  protected readonly emCampo = computed(() => (this.posicoes.hasValue() ? this.posicoes.value() : []));
  protected readonly comPosicao = computed(() => this.emCampo().filter(item => item.posicao !== null));

  protected readonly resumo = computed(() => {
    const total = this.emCampo().length;
    const semSinal = this.emCampo().filter(item => situacaoDoSinal(item) !== 'ativo').length;
    const maquinas = total === 1 ? '1 máquina em campo' : `${total} máquinas em campo`;
    return semSinal > 0 ? `${maquinas} · ${semSinal} sem posição recente` : maquinas;
  });

  // O mapa do Leaflet só existe DEPOIS que a <div #mapa> foi desenhada (afterNextRender)
  private readonly mapa = signal<L.Map | null>(null);
  private readonly marcadores = new Map<number, L.Marker>();
  private enquadrado = false; // enquadra os marcadores só na primeira vez (depois, o gestor manda)

  constructor() {
    afterNextRender(() => {
      carregarEstiloDoLeaflet(this.documento);
      const mapa = L.map(this.elementoMapa().nativeElement).setView(CENTRO_INICIAL, 4);
      // Mapa do OpenStreetMap: livre, sem chave de API; a atribuição é obrigatória
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; colaboradores do <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapa);
      this.mapa.set(mapa);
    });

    // Dados novos ou mapa pronto: redesenha os marcadores
    effect(() => {
      const mapa = this.mapa();
      if (mapa) {
        this.desenhar(mapa, this.comPosicao());
      }
    });

    inject(DestroyRef).onDestroy(() => this.mapa()?.remove());
  }

  // Na lista ao lado: voa até a máquina e abre o balão dela
  protected selecionar(item: PosicaoAtual): void {
    const marcador = this.marcadores.get(item.maquinaId);
    if (marcador && item.posicao) {
      this.mapa()?.flyTo([item.posicao.latitude, item.posicao.longitude], 16);
      marcador.openPopup();
    }
  }

  // Volta a enquadrar todas as máquinas
  protected centralizar(): void {
    const mapa = this.mapa();
    if (mapa) {
      this.enquadrar(mapa, this.comPosicao());
    }
  }

  protected etiqueta(item: PosicaoAtual): string {
    return `etiqueta--${TOM_SINAL[situacaoDoSinal(item)]}`;
  }

  protected readonly rotulo = (item: PosicaoAtual) => ROTULO_SINAL[situacaoDoSinal(item)];
  protected readonly texto = textoDoSinal;

  private desenhar(mapa: L.Map, lista: PosicaoAtual[]): void {
    const presentes = new Set(lista.map(item => item.maquinaId));

    // Saíram do campo (retorno, O.S.): os marcadores saem do mapa
    for (const [maquinaId, marcador] of this.marcadores) {
      if (!presentes.has(maquinaId)) {
        marcador.remove();
        this.marcadores.delete(maquinaId);
      }
    }

    for (const item of lista) {
      const { latitude, longitude } = item.posicao!;
      // iconSize [0, 0]: o ícone é só a ÂNCORA no ponto exato; o CSS (.marcador) desenha o balão acima
      const icone = L.divIcon({ className: 'ancora-marcador', html: this.elementoDoMarcador(item), iconSize: [0, 0] });
      const existente = this.marcadores.get(item.maquinaId);
      if (existente) {
        // Mesmo marcador, posição e aparência novas (o balão aberto continua aberto)
        existente.setLatLng([latitude, longitude]).setIcon(icone);
        existente.setPopupContent(this.elementoDoBalao(item));
      } else {
        const marcador = L.marker([latitude, longitude], { icon: icone, title: item.tag, alt: item.tag })
          .bindPopup(this.elementoDoBalao(item))
          .addTo(mapa);
        this.marcadores.set(item.maquinaId, marcador);
      }
    }

    if (!this.enquadrado && lista.length > 0) {
      this.enquadrar(mapa, lista);
      this.enquadrado = true;
    }
  }

  private enquadrar(mapa: L.Map, lista: PosicaoAtual[]): void {
    if (lista.length === 0) {
      return;
    }
    const pontos = lista.map(item => [item.posicao!.latitude, item.posicao!.longitude] as L.LatLngTuple);
    mapa.fitBounds(L.latLngBounds(pontos), { padding: [48, 48], maxZoom: 16 });
  }

  // O marcador é um "balão" com a tag. Montado com textContent (nunca innerHTML): a tag vem do
  // cadastro, e um texto com <script> viraria código na página
  private elementoDoMarcador(item: PosicaoAtual): HTMLElement {
    const marcador = this.documento.createElement('span');
    marcador.className = `marcador marcador--${situacaoDoSinal(item)}`;
    marcador.textContent = item.tag;
    return marcador;
  }

  private elementoDoBalao(item: PosicaoAtual): HTMLElement {
    const balao = this.documento.createElement('div');
    balao.className = 'balao';
    const titulo = this.documento.createElement('strong');
    titulo.textContent = `${item.tag} · ${item.modelo}`;
    const quem = this.documento.createElement('span');
    quem.textContent = `${item.operador ?? ''} · ${item.frenteTrabalho ?? ''}`;
    const quando = this.documento.createElement('small');
    quando.textContent = `${textoDoSinal(item)} · precisão de ${Math.round(item.posicao!.precisao)} m`;
    balao.append(titulo, quem, quando);
    return balao;
  }
}

// O CSS do Leaflet é grande demais para o estilo de um componente (orçamento de 4 kB): o build
// gera um leaflet.css à parte (angular.json, "inject": false), e esta função o põe na página
// só quando o mapa abre. Uma vez basta: as outras visitas reaproveitam o mesmo <link>.
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
