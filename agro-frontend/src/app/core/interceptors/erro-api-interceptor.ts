import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { mensagemDeErro } from '../api';

// Passa por TODAS as requisições do HttpClient.
// Se a resposta for um erro, mostra a mensagem num snackbar vermelho e repassa o erro
// adiante, para a tela ainda poder reagir (parar o "carregando", manter o diálogo aberto...).
export const erroApiInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((erro: unknown) => {
      snackBar.open(mensagemDeErro(erro), 'Fechar', {
        duration: 6000,
        panelClass: 'snack-erro', // estilo definido no styles.scss
      });
      return throwError(() => erro); // devolve o erro para quem fez a chamada
    }),
  );
};
