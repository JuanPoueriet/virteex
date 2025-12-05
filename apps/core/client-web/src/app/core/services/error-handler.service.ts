import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  handleError(operation: string, error: HttpErrorResponse): Observable<never> {
    let customErrorMessage =
      'Ocurrió un error inesperado. Por favor, intenta más tarde.';
    console.error(
      `Error en la operación '${operation}'. Código: ${error.status}`,
      error.error
    );

    if (error.error instanceof ErrorEvent) {
      customErrorMessage = `Error de red: ${error.error.message}`;
    } else {
      const serverError = error.error;
      if (serverError && typeof serverError.message === 'string') {
        customErrorMessage = serverError.message;
      } else if (serverError && Array.isArray(serverError.message)) {
        customErrorMessage = serverError.message.join('. ');
      } else if (error.status === 401) {
        customErrorMessage =
          'Credenciales inválidas. Por favor, verifica tu correo y contraseña.';
      } else if (error.status === 403) {
        customErrorMessage =
          'No tienes permiso o la verificación reCAPTCHA ha fallado.';
      } else if (error.status === 404) {
        customErrorMessage = 'El recurso solicitado no fue encontrado.';
      } else if (error.status === 429) {
        customErrorMessage = 'Demasiadas solicitudes. Por favor, espera un momento antes de intentar de nuevo.';
      }
    }

    return throwError(() => ({
      status: error.status,
      message: customErrorMessage,
    }));
  }
}
