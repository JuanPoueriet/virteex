import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  constructor(private translate: TranslateService) {}

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

      // Check for structured AuthError code
      if (serverError && typeof serverError.message === 'string' && serverError.message.startsWith('AUTH_')) {
          // Attempt to translate the error code
          const translationKey = `LOGIN.ERRORS.${serverError.message}`;
          const translated = this.translate.instant(translationKey);

          // If translation exists and is different from key, use it
          if (translated !== translationKey) {
              customErrorMessage = translated;
          } else {
              // Fallback if no translation found, though ideally we should have all
              customErrorMessage = serverError.message;
          }
      } else if (serverError && typeof serverError.message === 'string') {
        customErrorMessage = serverError.message;
      } else if (serverError && Array.isArray(serverError.message)) {
        customErrorMessage = serverError.message.join('. ');
      } else if (error.status === 401) {
        customErrorMessage = this.translate.instant('LOGIN.ERRORS.AUTH_INVALID_CREDENTIALS');
      } else if (error.status === 403) {
        customErrorMessage =
          'No tienes permiso o la verificación reCAPTCHA ha fallado.';
      } else if (error.status === 404) {
        customErrorMessage = 'El recurso solicitado no fue encontrado.';
      } else if (error.status === 429) {
        customErrorMessage = this.translate.instant('LOGIN.ERRORS.TOO_MANY_ATTEMPTS');
      }
    }

    return throwError(() => ({
      status: error.status,
      message: customErrorMessage,
    }));
  }
}
