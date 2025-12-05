
import { Injectable, Logger } from '@nestjs/common';
import { BaseFiscalStrategy } from '../fiscal-strategy.interface';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class DominicanRepublicStrategy extends BaseFiscalStrategy {
  private readonly logger = new Logger(DominicanRepublicStrategy.name);

  constructor(private readonly httpService: HttpService) {
    super();
  }

  async validateTaxId(taxId: string): Promise<boolean> {
    return /^\d{9,11}$/.test(taxId);
  }

  async getTaxIdDetails(taxId: string): Promise<any> {
    try {
      const url = `https://api.digital.gob.do/v3/rnc/${taxId}`;
      const { data } = await lastValueFrom(this.httpService.get(url));

      if (data) {
        return {
          taxId: data.rnc,
          legalName: data.name,
          status: data.status,
          industry: data.activity,
          isValid: true
        };
      }
      return null;
    } catch (error) {
        this.logger.error(`Error fetching DGII data for ${taxId}`, error);
        return null;
    }
  }

  getConfig(): any {
    return {
      countryCode: 'DO',
      name: 'República Dominicana',
      taxIdLabel: 'RNC',
      taxIdRegex: '^\\d{9,11}$',
      taxIdMask: '000-00000-0',
      currency: 'DOP'
    };
  }
}
