import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../api';
import {
  DadosNovaMaquina, DadosRetorno, DadosSaida, Maquina, Movimentacao, RespostaRetorno, RespostaSaida,
} from '../models/maquina';


@Injectable({ providedIn: 'root' }) // uma única instância para o app inteiro
export class MaquinaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/maquinas`;

  // GET /api/maquinas -> lista de máquinas
  listar(): Observable<Maquina[]> {
    return this.http.get<Maquina[]>(this.url);
  }

    // POST /api/maquinas -> cadastra uma máquina (a API responde 201 com a máquina criada)
  cadastrar(dados: DadosNovaMaquina): Observable<Maquina> {
    return this.http.post<Maquina>(this.url, dados);
  }

  // POST /api/maquinas/:id/saida -> registra a saída para o campo
  registrarSaida(id: number, dados: DadosSaida): Observable<RespostaSaida> {
    return this.http.post<RespostaSaida>(`${this.url}/${id}/saida`, dados);
  }

  // POST /api/maquinas/:id/retorno -> registra o retorno do campo
  registrarRetorno(id: number, dados: DadosRetorno): Observable<RespostaRetorno> {
    return this.http.post<RespostaRetorno>(`${this.url}/${id}/retorno`, dados);
  }

  // GET /api/movimentacoes (filtro opcional ?maquinaId=) -> histórico de saídas e retornos
  listarMovimentacoes(maquinaId: number | null = null): Observable<Movimentacao[]> {
    let params = new HttpParams();
    if (maquinaId !== null) {
      params = params.set('maquinaId', maquinaId);
    }
    return this.http.get<Movimentacao[]>(`${API_URL}/movimentacoes`, { params });
  }
}
