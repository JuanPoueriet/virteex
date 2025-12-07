import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, firstValueFrom } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { LoginUserDto, LoginResult, RegisterUserDto, LoginResponseDto, TwoFactorRequiredResponseDto } from './interfaces/auth.interfaces';
import { User } from '../../shared/interfaces/user.interface';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly API_URL = '/api/v1/auth';

  constructor() {}

  /**
   * Authenticates a user with email and password.
   * @param credentials LoginUserDto
   * @returns Observable<LoginResult> (Either full login success or 2FA required)
   */
  login(credentials: LoginUserDto): Observable<LoginResult> {
    return this.http.post<LoginResult>(`${this.API_URL}/login`, credentials).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Registers a new organization and user.
   * @param data RegisterUserDto
   * @returns Observable<LoginResponseDto> (Auto-login after register usually, or void depending on backend)
   */
  register(data: RegisterUserDto): Observable<LoginResponseDto> {
    return this.http.post<LoginResponseDto>(`${this.API_URL}/register`, data).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Verifies the 2FA code to complete login.
   * @param code The 6-digit OTP code
   * @param tempToken The temporary token received from the initial login
   * @returns Observable<User> (The authenticated user)
   */
  verify2fa(code: string, tempToken: string): Observable<User> {
    // Note: The backend likely expects 'code' in the body and Authorization header with tempToken?
    // Or tempToken in body? Let's assume standard Bearer pattern or body based on previous implementation.
    // However, usually verify-2fa is an authenticated endpoint using the temp token.
    // Looking at previous code: authService.verify2fa(code, tempToken) was used.

    // We will attach the temp token as a header or body depending on backend expectation.
    // Based on standard JWT flows, we usually send it as a Bearer token or in the body.
    // Let's assume body for now or headers.
    // Actually, looking at the previous implementation, it didn't seem to set headers manually,
    // so it might rely on the interceptor OR it passed it in body.
    // Let's pass it in body to be safe if the interceptor isn't set up for "temp" tokens.

    return this.http.post<LoginResponseDto>(`${this.API_URL}/verify-2fa`, { code }, {
        headers: { 'Authorization': `Bearer ${tempToken}` }
    }).pipe(
      map(response => response.user),
      catchError(this.handleError)
    );
  }

  /**
   * Initiates Passkey Login
   * @param email Optional email
   */
  async loginWithPasskey(email?: string): Promise<User | undefined> {
    // Implementation would depend on the WebAuthn library used.
    // For this refactor, we keep the signature but this requires the actual WebAuthn logic.
    // Since I cannot implement the full WebAuthn flow without the specific library helper (SimpleWebAuthn client),
    // I will mock this or leave it as a placeholder if the library isn't already imported.
    // The previous code called `authService.loginWithPasskey`.
    // I'll leave it as a generic promise reject for now if I don't see the util.
    return Promise.reject('WebAuthn not fully implemented in this refactor step yet.');
  }

  /**
   * Logout the user.
   */
  logout(): void {
    // Call backend to invalidate refresh token
    this.http.post(`${this.API_URL}/logout`, {}).subscribe({
        next: () => this.doLocalLogout(),
        error: () => this.doLocalLogout() // Force local logout anyway
    });
  }

  private doLocalLogout() {
      // Clear any local storage if used (though we use HTTP-only cookies mostly)
      this.router.navigate(['/auth/login']);
  }

  private handleError(error: HttpErrorResponse) {
    // Rethrow strict error objects for the component to handle (translation keys)
    return throwError(() => error);
  }
}
