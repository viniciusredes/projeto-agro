import { Service, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../api';
import { PosicaoAtual, Trajeto } from '../models/posicao';

// Posições das máquinas em campo (Etapa 6). Quem ENVIA é o app do operador; a web só lê.
@Service()
export class PosicaoService {
  private readonly http = inject(HttpClient);

  // GET /api/posicoes/atuais -> cada máquina em campo com a última posição (o mapa)
  atuais(): Observable<PosicaoAtual[]> {
    return this.http.get<PosicaoAtual[]>(`${API_URL}/posicoes/atuais`);
  }

  // GET /api/maquinas/:id/posicoes -> o trajeto da saída aberta (ou de ?movimentacaoId=)
  trajeto(maquinaId: number, movimentacaoId?: number): Observable<Trajeto> {
    let params = new HttpParams();
    if (movimentacaoId !== undefined) {
      params = params.set('movimentacaoId', movimentacaoId);
    }
    return this.http.get<Trajeto>(`${API_URL}/maquinas/${maquinaId}/posicoes`, { params });
  }
}
