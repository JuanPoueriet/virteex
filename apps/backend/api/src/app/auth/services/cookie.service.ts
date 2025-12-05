import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthConfig } from '../auth.config';

@Injectable()
export class CookieService {
  constructor(private readonly configService: ConfigService) {}

  setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string | null,
    rememberMe: boolean = false
  ): void {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    // Configuración base segura
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      // Se mantiene 'lax' para permitir que el callback de OAuth (Google/Microsoft)
      // envíe las cookies de sesión en el redirect. 'strict' rompería el login social.
      // Se debe asegurar protección CSRF vía tokens en endpoints mutables.
      sameSite: 'lax' as 'strict' | 'lax' | 'none',
    };

    // Access Token
    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: AuthConfig.COOKIE_ACCESS_MAX_AGE,
    });

    // Refresh Token
    if (refreshToken) {
      res.cookie('refresh_token', refreshToken, {
        ...cookieOptions,
        maxAge: rememberMe
          ? AuthConfig.COOKIE_REFRESH_REMEMBER_ME_MAX_AGE
          : AuthConfig.COOKIE_REFRESH_MAX_AGE,
      });
    }

    // CSRF Token (Readable by JS, not HttpOnly)
    // We generate a random token or just reuse the signature of the access token (or similar) as a binding.
    // For simplicity and effectiveness in Double Submit Cookie, a random value is enough,
    // or even a static value rotated per session.
    // Here we will use a random string.
    const csrfToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    res.cookie('XSRF-TOKEN', csrfToken, {
      secure: isProduction,
      sameSite: 'lax', // Must be readable on same site
      httpOnly: false, // Essential for JS to read and send back in header
      maxAge: AuthConfig.COOKIE_ACCESS_MAX_AGE,
    });
  }

  setRegisterTokenCookie(res: Response, token: string): void {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    res.cookie('register_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 15, // 15 minutes
    });
  }

  clearAuthCookies(res: Response): void {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.clearCookie('XSRF-TOKEN');
  }
}
