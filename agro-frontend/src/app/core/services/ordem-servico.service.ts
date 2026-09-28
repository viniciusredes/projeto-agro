import { Service, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_URL, erroTratadoNaTela } from '../api';
import {
  DadosAberturaOS, DadosFechamentoOS, FiltrosOS, ManutencoesMaquina, OrdemServico,
  OrdemServicoDetalhe, RespostaAberturaOS, RespostaFechamentoOS,
} from '../models/ordem-servico';

@Service()
export class OrdemServicoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/ordens-servico`;

  // GET /api/ordens-servico?maquinaId=&status= (filtros opcionais e combináveis)
  listar(filtros: FiltrosOS = {}): Observable<OrdemServico[]> {
    let params = new HttpParams();
    if (filtros.maquinaId !== undefined) {
      params = params.set('maquinaId', filtros.maquinaId);
    }
    if (filtros.status !== undefined) {
      params = params.set('status', filtros.status);
    }
    return this.http.get<OrdemServico[]>(this.url, { params });
  }

  // Quantas O.S. estão abertas (contador do menu). Silencioso: é chamado a cada navegação,
  // então um erro aqui não deve abrir snackbar (o contador só some)
  contarAbertas(): Observable<number> {
    const params = new HttpParams().set('status', 'Aberta');
    return this.http
      .get<OrdemServico[]>(this.url, { params, context: erroTratadoNaTela() })
      .pipe(map(ordens => ordens.length));
  }

  // GET /api/ordens-servico/:id -> detalhe com a tag e o modelo da máquina
  buscar(id: number): Observable<OrdemServicoDetalhe> {
    return this.http.get<OrdemServicoDetalhe>(`${this.url}/${id}`);
  }

  // POST /api/ordens-servico -> abre a O.S. (201)
  abrir(dados: DadosAberturaOS): Observable<RespostaAberturaOS> {
    return this.http.post<RespostaAberturaOS>(this.url, dados);
  }

  // POST /api/ordens-servico/:id/fechamento -> fecha a O.S. com baixa das peças
  fechar(id: number, dados: DadosFechamentoOS): Observable<RespostaFechamentoOS> {
    return this.http.post<RespostaFechamentoOS>(`${this.url}/${id}/fechamento`, dados);
  }

  // GET /api/maquinas/:id/manutencoes -> histórico e custo de manutenção da máquina
  manutencoesDaMaquina(maquinaId: number): Observable<ManutencoesMaquina> {
    return this.http.get<ManutencoesMaquina>(`${API_URL}/maquinas/${maquinaId}/manutencoes`);
  }
}
