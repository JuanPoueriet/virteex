
import { ConfigService } from '@nestjs/config';

// Helper to convert time string to milliseconds
export function parseDuration(duration: string): number {
  const match = /^(\d+)([mhd])$/i.exec(duration);
  if (!match) return 15 * 60 * 1000; // Default 15m
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
}

export const AuthConfig = {
  // Token Expiration (Time strings for JwtService)
  get JWT_ACCESS_EXPIRATION() { return process.env.JWT_ACCESS_EXPIRATION || '15m'; },
  get JWT_REFRESH_EXPIRATION() { return process.env.JWT_REFRESH_EXPIRATION || '7d'; },
  get JWT_RESET_PASSWORD_EXPIRATION() { return process.env.JWT_RESET_PASSWORD_EXPIRATION || '15m'; },

  // Cookie Max Age (Milliseconds)
  get COOKIE_ACCESS_MAX_AGE() { return parseDuration(process.env.JWT_ACCESS_EXPIRATION || '15m'); },
  get COOKIE_REFRESH_MAX_AGE() { return parseDuration(process.env.JWT_REFRESH_EXPIRATION || '7d'); },
  get COOKIE_REFRESH_REMEMBER_ME_MAX_AGE() { return parseDuration(process.env.JWT_REFRESH_REMEMBER_ME_EXPIRATION || '30d'); },

  // Throttle
  get THROTTLE_LIMIT() { return parseInt(process.env.AUTH_THROTTLE_LIMIT || '5', 10); },
  get THROTTLE_TTL() { return parseInt(process.env.AUTH_THROTTLE_TTL || '60000', 10); },

  // Lockout
  get MAX_FAILED_ATTEMPTS() { return parseInt(process.env.AUTH_MAX_FAILED_ATTEMPTS || '5', 10); },
  get LOCKOUT_DURATION() { return parseDuration(process.env.AUTH_LOCKOUT_DURATION || '15m'); },

  // Security
  get SALT_ROUNDS() { return parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10); },
};
