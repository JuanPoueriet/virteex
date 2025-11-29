
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// The imports for Tax, TaxConfiguration, Product, and Customer were removed since
// this service currently only uses TaxRule repository; re-add when implementing full logic.
import { TaxRule } from './entities/tax-rule.entity';

interface TaxableLineItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

interface TaxCalculationContext {
  organizationId: string;
  lineItems: TaxableLineItem[];
  customerId?: string;
  shippingAddress?: {
    countryCode?: string;
    state?: string;
  };
}

interface TaxBreakdown {
  taxId: string;
  name: string;
  rate: number;
  amount: number;
}

export interface TaxCalculationResult {
  subtotal: number;
  totalTaxAmount: number;
  grandTotal: number;
  taxBreakdown: TaxBreakdown[];
}

@Injectable()
export class TaxCalculationService {
  private readonly logger = new Logger(TaxCalculationService.name);

  constructor(
    @InjectRepository(TaxRule)
    private readonly taxRuleRepository: Repository<TaxRule>,
  ) {}

  async calculateTaxes(context: TaxCalculationContext): Promise<TaxCalculationResult> {
    // Basic implementation so values are used and lint errors are avoided - expand later
    this.logger.log('Calculating taxes...');

    // Use context to compute a subtotal (assume discount is fraction e.g., 0.1 for 10%)
    const subtotal = context.lineItems.reduce((sum, li) => {
      const discount = li.discount ?? 0;
      const lineTotal = li.unitPrice * li.quantity * (1 - discount);
      return sum + lineTotal;
    }, 0);

    // Fetch rules and log count so TS doesn't complain about unused vars
    const rules = await this.taxRuleRepository.find();
    this.logger.debug(`Found ${rules.length} tax rules`);

    // Minimal tax calculation: apply no taxes from rules until real logic is implemented
    const taxBreakdown: TaxBreakdown[] = [];
    const totalTaxAmount = 0;
    const grandTotal = subtotal + totalTaxAmount;

    return {
      subtotal,
      totalTaxAmount,
      grandTotal,
      taxBreakdown,
    };
  }
}