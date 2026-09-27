import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../api';
import { Peca, PecaParaRepor } from '../models/peca';

@Injectable({ providedIn: 'root' })
export class PecaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/pecas`;

  // GET /api/pecas -> todas as peças
  listar(): Observable<Peca[]> {
    return this.http.get<Peca[]>(this.url);
  }

  // GET /api/pecas?abaixoDoMinimo=true -> só as peças que precisam de reposição
  listarParaRepor(): Observable<PecaParaRepor[]> {
    const params = new HttpParams().set('abaixoDoMinimo', true);
    return this.http.get<PecaParaRepor[]>(this.url, { params });
  }
}
