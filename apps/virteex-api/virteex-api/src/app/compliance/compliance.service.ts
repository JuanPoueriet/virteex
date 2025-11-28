
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Between, EntityManager, Repository, Not, IsNull } from 'typeorm';
import { NcfSequence, NcfType } from './entities/ncf-sequence.entity';
import { VendorBill } from '../accounts-payable/entities/vendor-bill.entity';
import { Invoice, InvoiceType } from '../invoices/entities/invoice.entity';

@Injectable()
export class ComplianceService {
  constructor(
    @InjectRepository(NcfSequence)
    private readonly ncfSequenceRepository: Repository<NcfSequence>,
    @InjectRepository(VendorBill)
    private readonly vendorBillRepository: Repository<VendorBill>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async getNextNcf(
    organizationId: string,
    type: NcfType,
    manager: EntityManager,
  ): Promise<string> {
    const sequence = await manager
      .getRepository(NcfSequence)
      .createQueryBuilder('seq')
      .where(
        'seq.organizationId = :organizationId AND seq.type = :type AND seq.isActive = true',
        { organizationId, type },
      )
      .setLock('pessimistic_write')
      .getOne();

    if (!sequence) {
      throw new InternalServerErrorException(`No se encontró una secuencia de NCF activa para el tipo ${type}`);
    }

    if (sequence.currentSequence >= sequence.endsAt) {
      throw new InternalServerErrorException(`La secuencia de NCF para el tipo ${type} se ha agotado.`);
    }

    sequence.currentSequence++;
    await manager.save(sequence);

    const sequenceNumber = sequence.currentSequence.toString().padStart(8, '0');
    return `${sequence.prefix}${sequenceNumber}`;
  }
  
  async generate607Report(organizationId: string, year: number, month: number): Promise<string> {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const sales = await this.invoiceRepository.find({
          relations: ['customer'],
          where: {
              customer: { organizationId },
              issueDate: Between(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]),

              ncfNumber: Not(IsNull()),
          },
      });

      const lines = sales.map(sale => {
          const customerTaxId = sale.customer?.taxId?.replace(/-/g, '') || '';
          const idType = this.getTaxIdType(customerTaxId);
          const ncf = sale.ncfNumber || '';
          const modifiedNcf = sale.type === InvoiceType.CREDIT_NOTE ? (sale.originalInvoiceId || '') : '';
          
          const totalAmount = Math.abs(sale.total).toFixed(2);
          const taxAmount = Math.abs(sale.tax).toFixed(2);

          return `${customerTaxId}|${idType}|${ncf}|${modifiedNcf}|${totalAmount}|${taxAmount}`;
      });
      
      return lines.join('\n');
  }

  async generate606Report(organizationId: string, year: number, month: number): Promise<string> {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const purchases = await this.vendorBillRepository.find({
          relations: ['vendor'],
          where: {
              organizationId,
              date: Between(startDate, endDate),

              ncf: Not(IsNull())
          },
      });

      const lines = purchases.map(p => {
          const rnc = p.vendor?.taxId?.replace(/-/g, '') || ''; 
          const ncf = p.ncf || '';
          const totalAmount = p.total.toFixed(2);
          const itbis = (p.total * 0.18).toFixed(2);
          
          return `${rnc}|2|${ncf}|${totalAmount}|${itbis}`;
      });
      
      return lines.join('\n');
  }

  private getTaxIdType(taxId: string): '1' | '2' {
      if (taxId.length === 9) {
          return '1';
      }
      return '2';
  }
}