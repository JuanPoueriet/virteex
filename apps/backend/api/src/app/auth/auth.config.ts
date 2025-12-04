
export const AuthConfig = {
  // Token Expiration (Time strings for JwtService)
  JWT_ACCESS_EXPIRATION: '15m',
  JWT_REFRESH_EXPIRATION: '7d',
  JWT_RESET_PASSWORD_EXPIRATION: '15m',

  // Cookie Max Age (Milliseconds)
  COOKIE_ACCESS_MAX_AGE: 15 * 60 * 1000, // 15 minutes
  COOKIE_REFRESH_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
  COOKIE_REFRESH_REMEMBER_ME_MAX_AGE: 30 * 24 * 60 * 60 * 1000, // 30 days

  // Throttle
  THROTTLE_LIMIT: 5,
  THROTTLE_TTL: 60000, // 60 seconds

  // Lockout
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
};

// Helper to convert time string to milliseconds for consistency if needed
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
