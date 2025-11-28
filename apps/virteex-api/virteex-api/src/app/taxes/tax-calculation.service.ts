
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tax, TaxType } from './entities/tax.entity';
import { TaxConfiguration } from './entities/tax-configuration.entity';
import { Product } from '../inventory/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';
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
    @InjectRepository(Tax)
    private readonly taxRepository: Repository<Tax>,
    @InjectRepository(TaxConfiguration)
    private readonly taxConfigRepository: Repository<TaxConfiguration>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(TaxRule)
    private readonly taxRuleRepository: Repository<TaxRule>,
  ) {}

  async calculateTaxes(context: TaxCalculationContext): Promise<TaxCalculationResult> {
    const rules = await this.taxRuleRepository.find({
