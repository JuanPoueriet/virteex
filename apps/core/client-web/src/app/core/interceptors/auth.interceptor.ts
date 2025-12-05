// ../app/core/interceptors/auth.interceptor.ts
import {
    HttpInterceptorFn,
    HttpRequest,
    HttpHandlerFn,
    HttpEvent,
    HttpErrorResponse
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthService } from '../services/auth';
import { IS_PUBLIC_API } from '../tokens/http-context.tokens';

// Mutex para evitar la condición de carrera "Thundering Herd"
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<boolean | null>(null);

export const authInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    const authService = inject(AuthService);

    const authReq = req.clone({
        withCredentials: true
    });

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            const isUnauthorized = error.status === 401;
            
            // Verificamos si la ruta es pública usando el HttpContextToken
            // Esto evita problemas de hardcoding de URLs y es más robusto.
            const isPublicAuthApiRoute = req.context.get(IS_PUBLIC_API);

            if (isUnauthorized && !isPublicAuthApiRoute) {
                if (!isRefreshing) {
                    isRefreshing = true;
                    refreshTokenSubject.next(null);
                    console.log('[Interceptor] Token expirado detectado. Iniciando refresco único...');

                    return authService.refreshAccessToken().pipe(
                        switchMap((response) => {
                            isRefreshing = false;
                            console.log('[Interceptor] Token refrescado exitosamente.');
                            refreshTokenSubject.next(true); // Emitir valor para liberar la cola

                            // Clonar la petición original con el nuevo token si estuviera disponible en la respuesta
                            // Nota: Al usar cookies HttpOnly, el navegador adjunta automáticamente la cookie en la nueva petición.
                            // Sin embargo, si se usaran headers Authorization, aquí se debería actualizar.
                            // Dado que la arquitectura usa cookies, next(authReq) funciona porque el navegador envía la cookie nueva.
                            return next(authReq);
                        }),
                        catchError((refreshError) => {
                            isRefreshing = false;
                            console.error('[Interceptor] Fallo al refrescar el token. Deslogueando usuario.', refreshError);
                            refreshTokenSubject.next(false); // Emitir false para indicar fallo

                            // Prevent logout loop if the error comes from a critical or already failing state
                            // But usually, logout() handles redirect to login, which is public.
                            // Ensure logout doesn't trigger interceptor failure loops.
                            authService.logout();
                            return throwError(() => refreshError);
                        })
                    );
                } else {
                    console.log('[Interceptor] Refresco en progreso. Poniendo petición en cola...');
                    // Esperar a que el subject emita un valor que no sea null (null = inicial/en proceso)
                    return refreshTokenSubject.pipe(
                        filter(token => token !== null),
                        take(1),
                        switchMap((token) => {
                            // Si el valor es false, significa que el refresco falló
                            if (token === false) {
                                return throwError(() => new Error('Token refresh failed'));
                            }
                            console.log('[Interceptor] Cola liberada. Reintentando petición.');
                            return next(authReq);
                        })
                    );
                }
            }
            
            return throwError(() => error);
        })
    );
};
