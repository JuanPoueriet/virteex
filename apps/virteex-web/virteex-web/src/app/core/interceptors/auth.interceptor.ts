// src/app/core/interceptors/auth.interceptor.ts
import {
    HttpInterceptorFn,
    HttpRequest,
    HttpHandlerFn,
    HttpEvent,
    HttpErrorResponse
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth';

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
            
            // Lista de rutas de autenticación públicas que no deben disparar el refresco de token
            const publicAuthApiPaths = [
                '/auth/login',
                '/auth/register',
                '/auth/refresh',
                '/auth/status',
                '/auth/forgot-password',
                '/auth/reset-password'
            ];
            
            const isPublicAuthApiRoute = publicAuthApiPaths.some(path => authReq.url.includes(path));

            if (isUnauthorized && !isPublicAuthApiRoute) {
                console.log('[Interceptor] Token expirado detectado. Intentando refrescar...');
                return authService.refreshAccessToken().pipe(
                    switchMap(() => {
                        console.log('[Interceptor] Token refrescado. Reintentando la solicitud original.');
                        // Reintenta la solicitud original con las credenciales actualizadas
                        return next(authReq);
                    }),
                    catchError((refreshError) => {
                        console.error('[Interceptor] Fallo al refrescar el token. Deslogueando usuario.', refreshError);
                        authService.logout(); // Si el refresco falla, se desloguea al usuario
                        return throwError(() => refreshError);
                    })
                );
            }
            
            // Para todos los demás errores, o para errores 401 en rutas públicas, se propaga el error.
            return throwError(() => error);
        })
    );
};