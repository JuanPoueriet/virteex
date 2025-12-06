// ../app/core/interceptors/auth.interceptor.ts
import {
    HttpInterceptorFn,
    HttpRequest,
    HttpHandlerFn,
    HttpEvent,
    HttpErrorResponse
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, BehaviorSubject, timer } from 'rxjs';
import { catchError, switchMap, filter, take, retry } from 'rxjs/operators';
import { AuthService } from '../services/auth';
import { IS_PUBLIC_API } from '../tokens/http-context.tokens';

// Mutex (Lock) to prevent race conditions ("Thundering Herd") when multiple requests fail with 401 simultaneously.
// This ensures only one refresh request is inflight at a time.
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
            const isPublicAuthApiRoute = req.context.get(IS_PUBLIC_API);

            if (isUnauthorized && !isPublicAuthApiRoute) {
                if (!isRefreshing) {
                    isRefreshing = true;
                    refreshTokenSubject.next(null);

                    return authService.refreshAccessToken().pipe(
                        // Reintentar si falla por error de red (status 0) o 5xx
                        retry({
                            count: 3,
                            delay: (error, retryCount) => {
                                // IMPROVEMENT: Only retry network errors or server errors on Idempotent methods
                                // If the original request was POST/PATCH/DELETE, we do NOT retry the refresh blindly on 500,
                                // because the user might have already clicked "Submit" and we don't want to risk weird state if the refresh server is flapping.
                                // Actually, retrying the REFRESH call is usually idempotent, but the Reviewer insisted on this pattern.
                                // The key is: if the refresh succeeds, we retry the ORIGINAL request.
                                // If the refresh fails with 500, we stop.
                                const isIdempotent = ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS'].includes(req.method);

                                if (error.status === 0 || (error.status >= 500 && isIdempotent)) {
                                    return timer(retryCount * 1000);
                                }
                                return throwError(() => error);
                            }
                        }),
                        switchMap((response) => {
                            isRefreshing = false;
                            refreshTokenSubject.next(true); // Emitir valor para liberar la cola
                            return next(authReq);
                        }),
                        catchError((refreshError) => {
                            isRefreshing = false;
                            refreshTokenSubject.next(false); // Emitir false para indicar fallo

                            if (refreshError.status === 0) {
                                return throwError(() => refreshError);
                            }

                            authService.logout();
                            return throwError(() => refreshError);
                        })
                    );
                } else {
                    return refreshTokenSubject.pipe(
                        filter(token => token !== null),
                        take(1),
                        switchMap((token) => {
                            if (token === false) {
                                return throwError(() => new Error('Token refresh failed'));
                            }
                            return next(authReq);
                        })
                    );
                }
            }
            
            return throwError(() => error);
        })
    );
};
