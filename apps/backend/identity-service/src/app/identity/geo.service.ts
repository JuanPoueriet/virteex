import { Injectable } from '@nestjs/common';
import { IGeoService } from './identity.interfaces';

@Injectable()
export class GeoService implements IGeoService {
  getLocation(ip: string): any {
    return { country: 'DO', city: 'Santo Domingo', ll: [18.4861, -69.9312], ip };
  }
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return 0;
  }
}
