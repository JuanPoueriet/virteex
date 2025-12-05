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
  }

  clearAuthCookies(res: Response): void {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }
}
