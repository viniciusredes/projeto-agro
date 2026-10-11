import { Component, DestroyRef, ElementRef, afterNextRender, effect, inject, input, signal, viewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import * as L from 'leaflet';
import { Posicao } from '../../../core/models/posicao';
import { criarMapa, iconeDaMaquina } from '../leaflet-base';

// O caminho de uma saída num mapa pequeno (Etapa 6): a linha liga as posições na ordem em que o
// GPS leu; um círculo marca a partida e o balão com a tag, a última posição.
// Componente de APRESENTAÇÃO: recebe os pontos prontos; quem busca é o detalhe da máquina.
@Component({
  selector: 'app-trajeto-mapa',
  template: `<div #mapa class="mapa" role="region" [attr.aria-label]="'Trajeto da ' + tag()"></div>`,
  styleUrl: './trajeto-mapa.scss',
})
export class TrajetoMapa {
  readonly posicoes = input.required<Posicao[]>();
  readonly tag = input.required<string>();
  readonly emCampo = input(false); // em campo: balão verde; saída encerrada: cinza

  private readonly documento = inject(DOCUMENT);
  private readonly elementoMapa = viewChild.required<ElementRef<HTMLDivElement>>('mapa');
  private readonly mapa = signal<L.Map | null>(null);
  private camada: L.LayerGroup | null = null; // linha + marcadores: some e volta inteira

  constructor() {
    afterNextRender(() => this.mapa.set(criarMapa(this.elementoMapa().nativeElement, this.documento)));

    // Pontos novos (ou o mapa ficou pronto): redesenha tudo e enquadra o caminho
    effect(() => {
      const mapa = this.mapa();
      if (mapa) {
        this.desenhar(mapa, this.posicoes());
      }
    });

    inject(DestroyRef).onDestroy(() => this.mapa()?.remove());
  }

  private desenhar(mapa: L.Map, posicoes: Posicao[]): void {
    this.camada?.remove();
    if (posicoes.length === 0) {
      this.camada = null;
      return;
    }

    const pontos = posicoes.map(p => [p.latitude, p.longitude] as L.LatLngTuple);
    const ultimo = pontos[pontos.length - 1];
    // className: a cor vem do CSS (var(--mat-sys-primary)); a cor no atributo SVG não aceita var()
    const linha = L.polyline(pontos, { className: 'trajeto-linha', weight: 4 });
    const partida = L.circleMarker(pontos[0], { className: 'trajeto-partida', radius: 6 }).bindTooltip('Partida');
    const agora = L.marker(ultimo, {
      icon: iconeDaMaquina(this.documento, this.tag(), this.emCampo() ? 'ativo' : 'sem-sinal'),
      title: this.tag(),
      alt: this.tag(),
    });
    this.camada = L.layerGroup([linha, partida, agora]).addTo(mapa);

    // Um ponto só: centraliza nele. Mais de um: enquadra o caminho inteiro
    if (pontos.length === 1) {
      mapa.setView(ultimo, 16);
    } else {
      mapa.fitBounds(linha.getBounds(), { padding: [32, 32], maxZoom: 17 });
    }
  }
}
