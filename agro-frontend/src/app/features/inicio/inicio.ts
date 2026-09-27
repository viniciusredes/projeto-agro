import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MaquinaService } from '../../core/services/maquina.service';
import { PecaService } from '../../core/services/peca.service';
import { TemaService } from '../../core/ui/tema.service';

// Um cartão de módulo da página inicial
interface Modulo {
  titulo: string;
  icone: string;
  descricao: string;
  rota: string;
  acao: string;
}

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio {
  private readonly maquinaService = inject(MaquinaService);
  private readonly pecaService = inject(PecaService);
  protected readonly tema = inject(TemaService); // para escolher a versão clara/escura da logo

  // Dados ao vivo para o bloco "A frota agora"
  protected readonly maquinas = rxResource({ stream: () => this.maquinaService.listar() });
  protected readonly pecasParaRepor = rxResource({ stream: () => this.pecaService.listarParaRepor() });

  // Contagem por status (dado derivado das máquinas)
  protected readonly frota = computed(() => {
    const lista = this.maquinas.hasValue() ? this.maquinas.value() : [];
    const contar = (status: string) => lista.filter(m => m.status === status).length;
    return {
      total: lista.length,
      disponiveis: contar('Disponível'),
      emCampo: contar('Em Operação'),
      emManutencao: contar('Em Manutenção'),
    };
  });

  protected readonly totalParaRepor = computed(() =>
    this.pecasParaRepor.hasValue() ? this.pecasParaRepor.value().length : 0,
  );

  // Os três módulos do produto (o texto da página fica aqui, fácil de revisar)
  protected readonly modulos: Modulo[] = [
    {
      titulo: 'Uso da frota',
      icone: 'agriculture',
      descricao:
        'Saída e retorno das máquinas com operador, frente de trabalho e horímetro. Horas trabalhadas e avarias ficam no histórico.',
      rota: '/maquinas',
      acao: 'Ver máquinas',
    },
    {
      titulo: 'Almoxarifado',
      icone: 'inventory_2',
      descricao:
        'Peças e fluidos com saldo, custo da última compra e alerta de reposição. Cada entrada e saída fica registrada no kardex.',
      rota: '/estoque',
      acao: 'Ver estoque',
    },
    {
      titulo: 'Manutenção',
      icone: 'build',
      descricao:
        'Ordens de serviço preventivas e corretivas, com baixa automática das peças no estoque e custo de manutenção por máquina.',
      rota: '/ordens-servico',
      acao: 'Ver ordens de serviço',
    },
  ];
}
