import { Service, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_URL, erroTratadoNaTela } from '../api';
import {
  Abastecimento, AbastecimentoDetalhe, CombustivelMaquina, FiltrosAbastecimento, RespostaConferencia,
} from '../models/abastecimento';

@Service()
export class AbastecimentoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/abastecimentos`;

  // GET /api/abastecimentos?maquinaId=&status=&origem=&operador= (filtros opcionais e combináveis)
  listar(filtros: FiltrosAbastecimento = {}): Observable<Abastecimento[]> {
    let params = new HttpParams();
    for (const [campo, valor] of Object.entries(filtros)) {
      if (valor !== undefined) {
        params = params.set(campo, valor);
      }
    }
    return this.http.get<Abastecimento[]>(this.url, { params });
  }

  // Quantos esperam a conferência (contador do menu). Silencioso, como o contador de O.S.:
  // é chamado a cada navegação, então um erro aqui não deve abrir snackbar (o contador só some)
  contarPendentes(): Observable<number> {
    const params = new HttpParams().set('status', 'Pendente');
    return this.http
      .get<Abastecimento[]>(this.url, { params, context: erroTratadoNaTela() })
      .pipe(map(lista => lista.length));
  }

  // GET /api/abastecimentos/:id -> detalhe com a tag e o modelo da máquina
  buscar(id: number): Observable<AbastecimentoDetalhe> {
    return this.http.get<AbastecimentoDetalhe>(`${this.url}/${id}`);
  }

  // POST /api/abastecimentos/:id/aprovacao
  aprovar(id: number): Observable<RespostaConferencia> {
    return this.http.post<RespostaConferencia>(`${this.url}/${id}/aprovacao`, {});
  }

  // POST /api/abastecimentos/:id/recusa (o motivo é obrigatório)
  recusar(id: number, motivo: string): Observable<RespostaConferencia> {
    return this.http.post<RespostaConferencia>(`${this.url}/${id}/recusa`, { motivo });
  }

  // GET /api/maquinas/:id/combustivel -> consumo L/h, custo por hora e totais (só os aprovados)
  combustivelDaMaquina(maquinaId: number): Observable<CombustivelMaquina> {
    return this.http.get<CombustivelMaquina>(`${API_URL}/maquinas/${maquinaId}/combustivel`);
  }

  // A API devolve a url SEM o prefixo ("/abastecimentos/1/comprovante"). Com o /api na frente,
  // o <img> pede a imagem pelo mesmo proxy do ng serve (o mesmo das fotos da O.S.)
  enderecoDoComprovante(abastecimento: Abastecimento): string | null {
    return abastecimento.comprovante ? `${API_URL}${abastecimento.comprovante.url}` : null;
  }
}
