import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpContext } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  Observable,
  catchError,
  map,
  tap,
  throwError,
  of,
  take,
} from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

import { API_URL } from '../tokens/api-url.token';
import { RegisterPayload } from '../../shared/interfaces/register-payload.interface';
import { User } from '../../shared/interfaces/user.interface';
import { LoginCredentials } from '../../shared/interfaces/login-credentials.interface';
import { AuthStatus } from '../../shared/enums/auth-status.enum';
import { UserStatus } from '../../shared/enums/user-status.enum';
import { UserPayload } from '../../shared/interfaces/user-payload.interface';
import { NotificationService } from './notification';
import { WebSocketService } from './websocket.service';
import { ModalService } from '../../shared/service/modal.service';
import { ErrorHandlerService } from './error-handler.service';
import { IS_PUBLIC_API } from '../tokens/http-context.tokens';
import { hasPermission } from '@virteex/shared/util-auth';

interface LoginResponse {
  user: User;
  accessToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private webSocketService = inject(WebSocketService);
  private errorHandlerService = inject(ErrorHandlerService);
  private readonly baseUrl = inject(API_URL);

  // URL base de tu API de autenticación.
  private readonly apiUrl = `${this.baseUrl}/auth`;

  // --- Estado Reactivo con Signals ---

  // Almacena la información del usuario actual. Privado para controlar su modificación.
  private _currentUser = signal<User | null>(null);
  // Almacena el estado actual de la autenticación.
  private _authStatus = signal<AuthStatus>(AuthStatus.pending);

  // --- Selectores Públicos (Computed Signals) ---

  // Expone el usuario actual de forma pública y de solo lectura.
  public readonly currentUser = computed(() => this._currentUser());
  // Expone el estado de autenticación actual de forma pública y de solo lectura.
  public readonly authStatus = computed(() => this._authStatus());
  // Un selector booleano para verificar fácilmente si el usuario está autenticado.
  public readonly isAuthenticated = computed(
    () => this._authStatus() === AuthStatus.authenticated
  );

  // Compatibilidad con código legado usando Observables derivados de Signals
  public isAuthenticated$ = toObservable(this.isAuthenticated);
  public user$ = toObservable(this.currentUser);

  constructor(private modalService: ModalService) {
    this.listenForForcedLogout();
  }

  private listenForForcedLogout(): void {
    // Espera a que la conexión esté lista
    this.webSocketService.connectionReady$.pipe(take(1)).subscribe(() => {
      console.log(
        "WebSocket connection is ready. Listening for 'force-logout'."
      );
      this.webSocketService
        .listen<{ reason: string }>('force-logout')
        .subscribe((data) => {
          console.log('Forced logout event received:', data.reason);
          this.logout();
          this.modalService
            .open({
              title: 'Sesión Terminada',
              message: data.reason,
              confirmText: 'Aceptar',
            })
            ?.onClose$.subscribe(() => {});
        });
    });
  }

  /**
   * ✅ NUEVO Y CORREGIDO: Verifica si el usuario actual tiene un conjunto de permisos.
   * Soporta wildcards (ej: 'sales.*' permite 'sales.create').
   * @param requiredPermissions Los permisos requeridos para realizar una acción.
   * @returns `true` si el usuario tiene todos los permisos, `false` de lo contrario.
   */
  hasPermissions(requiredPermissions: string[]): boolean {
    const user = this.currentUser();
    return hasPermission(user?.permissions, requiredPermissions);
  }

  /**
   * Refresca el token de acceso utilizando el token de refresco (almacenado en una cookie segura).
   * @returns Un observable que, al completarse, actualiza el estado de autenticación.
   */
  refreshAccessToken(): Observable<LoginResponse> {
    return this.http
      .get<LoginResponse>(`${this.apiUrl}/refresh`, {
        withCredentials: true,
        context: new HttpContext().set(IS_PUBLIC_API, true)
      })
      .pipe(
        tap((response) => {
          if (response && response.user && response.accessToken) {
            this._currentUser.set(response.user);
            this._authStatus.set(AuthStatus.authenticated);
            console.log('[AuthService] Token refrescado exitosamente');
          }
        })
      );
  }

  /**
   * Envía las credenciales del usuario al backend para iniciar sesión.
   * @param credentials Objeto con email, password y recaptchaToken.
   * @returns Un observable que emite el objeto User en caso de éxito.
   */
  login(credentials: LoginCredentials): Observable<User> {
    const url = `${this.apiUrl}/login`;
    return this.http
      .post<{ user: User }>(url, credentials, {
        withCredentials: true,
        context: new HttpContext().set(IS_PUBLIC_API, true)
      })
      .pipe(
        tap((response) => {
          this._currentUser.set(response.user);
          this._authStatus.set(AuthStatus.authenticated);

          this.webSocketService.connect();
          this.webSocketService.emit('user-status', { isOnline: true });
          this.listenForForcedLogout();
        }),
        map((response) => response.user),
        catchError((err) => this.errorHandlerService.handleError('login', err))
      );
  }

  checkAuthStatus(): Observable<boolean> {
    const url = `${this.apiUrl}/status`;
    this._authStatus.set(AuthStatus.pending);
    return this.http.get<{ isAuthenticated: boolean; user: User | null }>(url, {
      withCredentials: true,
      context: new HttpContext().set(IS_PUBLIC_API, true)
    }).pipe(
      map((res) => {
        if (res.isAuthenticated && res.user) {
          this._currentUser.set(res.user);
          this._authStatus.set(AuthStatus.authenticated);
          this.webSocketService.connect();
          this.webSocketService.emit('user-status', { isOnline: true });
          this.listenForForcedLogout();
          return true;
        } else {
          this._currentUser.set(null);
          this._authStatus.set(AuthStatus.unauthenticated);
          this.webSocketService.disconnect();
          return false;
        }
      }),
      catchError(() => {
        // En caso de error 500 real u otros problemas de red
        this._currentUser.set(null);
        this._authStatus.set(AuthStatus.unauthenticated);
        this.webSocketService.disconnect();
        return of(false);
      })
    );
  }

  // 🔥 Añadir método para obtener permisos como observable
  getPermissions$(): Observable<string[]> {
    return this.user$.pipe(map((user) => user?.permissions || []));
  }

  /**
   * Registra un nuevo usuario en el sistema.
   * @param payload Objeto con los datos del nuevo usuario.
   * @returns Un observable que emite el objeto User del usuario recién creado.
   */
  register(payload: RegisterPayload): Observable<User> {
    const url = `${this.apiUrl}/register`;
    return this.http
      .post<{ user: User }>(url, payload, {
        withCredentials: true,
        context: new HttpContext().set(IS_PUBLIC_API, true)
      })
      .pipe(
        map((response) => response.user),
        tap((user) => {
          this._currentUser.set(user);
          this._authStatus.set(AuthStatus.authenticated);
          this.router.navigate(['/app/dashboard']);
        }),
        catchError((err) => this.errorHandlerService.handleError('register', err))
      );
  }

  /**
   * Cierra la sesión del usuario tanto en el frontend como en el backend.
   */
  logout(): void {
    const url = `${this.apiUrl}/logout`;
    // Pass IS_PUBLIC_API to prevent interceptor from trying to refresh token if logout fails (e.g. 401)
    this.http.post(url, {}, {
      withCredentials: true,
      context: new HttpContext().set(IS_PUBLIC_API, true)
    }).subscribe({
      // Se ejecuta siempre, sin importar si el backend responde con éxito o error,
      // para asegurar que el usuario es deslogueado del lado del cliente.
      complete: () => {
        this._currentUser.set(null);
        this._authStatus.set(AuthStatus.unauthenticated);
        this.webSocketService.emit('user-status', { isOnline: false });
        this.webSocketService.disconnect();

        this.router.navigate(['/auth/login']);
      },
    });
  }

  /**
   * Inicia el flujo de recuperación de contraseña.
   * @param email El correo electrónico del usuario.
   * @returns Un observable que emite un mensaje de confirmación del backend.
   */
  forgotPassword(
    email: string,
    recaptchaToken: string
  ): Observable<{ message: string }> {
    const url = `${this.apiUrl}/forgot-password`;
    return this.http
      .post<{ message: string }>(url, { email, recaptchaToken }, {
        context: new HttpContext().set(IS_PUBLIC_API, true)
      })
      .pipe(catchError((err) => this.errorHandlerService.handleError('forgotPassword', err)));
  }

  /**
   * Envía la nueva contraseña y el token de reseteo al backend.
   * @param token El token recibido por el usuario (generalmente en la URL).
   * @param password La nueva contraseña.
   * @returns Un observable que emite el objeto User con la información actualizada.
   */
  resetPassword(token: string, password: string): Observable<User> {
    const url = `${this.apiUrl}/reset-password`;
    return this.http
      .post<User>(url, { token, password }, {
        context: new HttpContext().set(IS_PUBLIC_API, true)
      })
      .pipe(catchError((err) => this.errorHandlerService.handleError('resetPassword', err)));
  }

  // **** ✅ NUEVO MÉTODO AÑADIDO ****
  setPasswordFromInvitation(
    token: string,
    password: string
  ): Observable<LoginResponse> {
    const url = `${this.apiUrl}/set-password-from-invitation`;
    return this.http
      .post<LoginResponse>(url, { token, password }, {
        withCredentials: true,
        context: new HttpContext().set(IS_PUBLIC_API, true)
      })
      .pipe(
        tap((response) => {
          // Al establecer la contraseña, también iniciamos sesión
          this._currentUser.set(response.user);
          this._authStatus.set(AuthStatus.authenticated);
        }),
        catchError((err) => this.errorHandlerService.handleError('setPasswordFromInvitation', err))
      );
  }

  getInvitationDetails(token: string): Observable<{ firstName: string }> {
    const url = `${this.apiUrl}/invitation/${token}`;
    return this.http
      .get<{ firstName: string }>(url, {
        context: new HttpContext().set(IS_PUBLIC_API, true)
      })
      .pipe(catchError((err) => this.errorHandlerService.handleError('getInvitationDetails', err)));
  }

  // --- NUEVOS MÉTODOS ---

  /**
   * Invita a un nuevo usuario al sistema.
   */
  inviteUser(payload: UserPayload): Observable<User> {
    // Nota: El backend creará este usuario con estado 'PENDING'.
    return this.http.post<User>(`${this.apiUrl}/invite`, payload);
  }

  /**
   * Actualiza los datos de un usuario existente.
   */
  updateUser(id: string, payload: UserPayload): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * Actualiza únicamente el estado de un usuario (para bloquear, archivar, etc.).
   */
  updateUserStatus(id: string, status: UserStatus): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}/status`, { status });
  }

  /**
   * Elimina permanentemente a un usuario del sistema.
   */
  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // --- NUEVOS MÉTODOS PARA SUPLANTACIÓN ---
  impersonate(userId: string): Observable<User> {
    return this.http
      .post<{ user: User }>(
        `${this.apiUrl}/impersonate`,
        { userId },
        { withCredentials: true }
      )
      .pipe(
        tap((response) => {
          this._currentUser.set(response.user);
          this._authStatus.set(AuthStatus.authenticated);
          this.notificationService.showSuccess(
            `Ahora estás viendo como ${response.user.firstName}`
          );
          // Usar Router en lugar de recarga forzada
          this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
            this.router.navigate(['/app/dashboard']);
          });
        }),
        map((response) => response.user),
        catchError((err) => this.errorHandlerService.handleError('impersonate', err))
      );
  }

  stopImpersonation(): Observable<User> {
    return this.http
      .post<{ user: User }>(
        `${this.apiUrl}/stop-impersonation`,
        {},
        { withCredentials: true }
      )
      .pipe(
        tap((response) => {
          this._currentUser.set(response.user);
          this._authStatus.set(AuthStatus.authenticated);
          this.notificationService.showSuccess(
            'Has vuelto a tu cuenta original.'
          );
          // Usar Router en lugar de recarga forzada
          this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
            this.router.navigate(['/app/dashboard']);
          });
        }),
        map((response) => response.user),
        catchError((err) => this.errorHandlerService.handleError('stopImpersonation', err))
      );
  }
}
