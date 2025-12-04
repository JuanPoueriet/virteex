import { Injectable, Logger } from '@nestjs/common';
import * as geoip from 'geoip-lite';

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);

  // Set this to a country code (e.g., 'CO', 'DO', 'US') to globally simulate
  // that country for all requests in dev mode. Set to null to use real detection.
  // The user requested to "change it via code".
  private readonly DEBUG_COUNTRY_OVERRIDE: string | null = 'US';

  getLocation(ip: string): { country: string | null; ip: string } {

    // 1. Handle Debug Override
    if (process.env['NODE_ENV'] !== 'production' && this.DEBUG_COUNTRY_OVERRIDE) {
        this.logger.debug(`Using DEBUG_COUNTRY_OVERRIDE: ${this.DEBUG_COUNTRY_OVERRIDE}`);
        return { country: this.DEBUG_COUNTRY_OVERRIDE, ip };
    }

    // 2. Handle Localhost / Private IPs
    if (this.isLocalOrPrivate(ip)) {
      this.logger.debug(`Local or Private IP detected: ${ip}. Defaulting to 'DO' (Dominican Republic) for dev.`);
      // Default to DO for localhost development if not overridden
      return { country: 'DO', ip };
    }

    // 3. Real Lookup
    const geo = geoip.lookup(ip);
    this.logger.debug(`Geo lookup for ${ip}: ${JSON.stringify(geo)}`);

    return {
      country: geo ? geo.country : null,
      ip
    };
  }

  private isLocalOrPrivate(ip: string): boolean {
    return (
      ip === '::1' ||
      ip === '127.0.0.1' ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('172.16.')
    );
  }
}
