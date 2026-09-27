import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../api';
import { Maquina } from '../models/maquina';

@Injectable({ providedIn: 'root' }) // uma única instância para o app inteiro
export class MaquinaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/maquinas`;

  // GET /api/maquinas -> lista de máquinas
  listar(): Observable<Maquina[]> {
    return this.http.get<Maquina[]>(this.url);
  }
}
