

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository, DataSource, LessThanOrEqual, LessThan, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Invoice, InvoiceStatus, InvoiceType } from './entities/invoice.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CustomersService } from '../customers/customers.service';
import { InventoryService } from '../inventory/inventory.service';
import { Product } from '../inventory/entities/product.entity';
import { InvoiceLineItem } from './entities/invoice-line-item.entity';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationSettings } from '../organizations/entities/organization-settings.entity';
import { JournalEntriesService } from '../journal-entries/journal-entries.service';
import { NcfType } from '../compliance/entities/ncf-sequence.entity';
import { ComplianceService } from '../compliance/compliance.service';
import { DocumentSequencesService } from '../shared/document-sequences/document-sequences.service';
import { DocumentType } from '../shared/document-sequences/entities/document-sequence.entity';
import { ExchangeRate } from '../currencies/entities/exchange-rate.entity';
import { Buffer } from 'buffer';

@Injectable()
export class InvoicesService {
  private invoiceTemplate: HandlebarsTemplateDelegate;
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice)
    private invoicesRepository: Repository<Invoice>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationSettings)
    private orgSettingsRepository: Repository<OrganizationSettings>,
    @InjectRepository(ExchangeRate)
    private exchangeRateRepository: Repository<ExchangeRate>,
    private customersService: CustomersService,
    private inventoryService: InventoryService,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
    private readonly complianceService: ComplianceService,
    private readonly documentSequencesService: DocumentSequencesService,
  ) {
    this.compileTemplate();
  }


  findOverdueInvoices(): Promise<Invoice[]> {
    const today = new Date();
    return this.invoicesRepository.find({
      where: {
        dueDate: LessThan(today.toISOString().split('T')[0]),
        status: In([InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID]),
      },
      relations: ['customer'],
    });
  }


  private async compileTemplate() {
    try {
        const templatePath = path.join(__dirname, 'templates', 'invoice.hbs');
        const templateHtml = fs.readFileSync(templatePath, 'utf8');
        
        handlebars.registerHelper('formatNumber', (value) => {
            if (typeof value !== 'number') return value;
            return new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
        });
        handlebars.registerHelper('multiply', (a, b) => (a * b));

        this.invoiceTemplate = handlebars.compile(templateHtml);
    } catch (error) {
        this.logger.error('Error al compilar la plantilla de factura Handlebars', error);
    }
  }

  async create(
    createInvoiceDto: CreateInvoiceDto,
    organizationId: string,
  ): Promise<Invoice> {
    return this.dataSource.transaction(async (manager) => {
      const customer = await this.customersService.findOne(
        createInvoiceDto.customerId,
        organizationId,
      );

      let subtotal = 0;
      const detailedLineItems: InvoiceLineItem[] = [];

      for (const itemDto of createInvoiceDto.lineItems) {
        const product = await manager.findOneBy(Product, {
          id: itemDto.productId,
          organizationId,
        });
        if (!product) {
          throw new BadRequestException(
            `Producto con ID "${itemDto.productId}" no encontrado.`,
          );
        }

        const linePrice = itemDto.price ?? product.price;
        const lineTotal = linePrice * itemDto.quantity;
        subtotal += lineTotal;

        const lineItem = new InvoiceLineItem();
        lineItem.product = product;
        lineItem.description = itemDto.description ?? product.name;
        lineItem.quantity = itemDto.quantity;
        lineItem.price = linePrice;
        detailedLineItems.push(lineItem);


        await this.inventoryService.decreaseStock(
          itemDto.productId,
          itemDto.quantity,
          manager,
        );
      }
      
      const settings = await this.getOrgAccountingConfig(organizationId);

      const taxRate = settings.defaultTaxRate / 100 || 0.18; 
      const tax = subtotal * taxRate;
      const total = subtotal + tax;
      

      const orgSettings = await this.orgSettingsRepository.findOne({ where: { organizationId } });
      const baseCurrency = orgSettings?.baseCurrency || 'USD';
      let exchangeRate = 1.0;
      const currencyCode = createInvoiceDto.currencyCode || baseCurrency;

      if (currencyCode !== baseCurrency) {
          const rate = await this.exchangeRateRepository.findOne({ 
              where: { fromCurrency: baseCurrency, toCurrency: currencyCode, date: LessThanOrEqual(new Date(createInvoiceDto.issueDate)) }, 
              order: { date: 'DESC' }
          });
          if (!rate) {
            throw new BadRequestException(`No se encontró una tasa de cambio válida para ${currencyCode} en la fecha especificada.`);
          }
          exchangeRate = rate.rate;
      }

      
      const invoiceNumber = await this.documentSequencesService.getNextNumber(
        organizationId,
        DocumentType.CUSTOMER_INVOICE,
        manager
      );

      const ncfNumber = await this.complianceService.getNextNcf(
        organizationId,
        NcfType.B01,
        manager
      );

      const invoice = manager.create(Invoice, {
        ...createInvoiceDto,
        organizationId,
        invoiceNumber,
        ncfNumber,
        customer,
        customerName: customer.companyName,
        customerAddress: customer.address,
        lineItems: detailedLineItems,
        subtotal,
        tax,
        total,
        balance: total,
        status: InvoiceStatus.PENDING,
        type: InvoiceType.INVOICE,
        currencyCode,
        exchangeRate,
        totalInBaseCurrency: total * exchangeRate,
      });

      const savedInvoice = await manager.save(invoice);
      

      this.eventEmitter.emit('invoice.created', savedInvoice);
      
      this.logger.log(`Factura ${savedInvoice.invoiceNumber} creada exitosamente en ${savedInvoice.currencyCode}.`);
      return savedInvoice;
    });
  }

  findAll(organizationId: string): Promise<Invoice[]> {
    return this.invoicesRepository.find({
      where: { organizationId },
      relations: ['customer'],
      order: { issueDate: 'DESC' },
    });
  }

  async findOne(id: string, organizationId: string): Promise<Invoice> {
    const invoice = await this.invoicesRepository.findOne({
      where: { id, organizationId },
      relations: ['lineItems', 'lineItems.product', 'customer'],
    });
    if (!invoice) {
      throw new NotFoundException(`Factura con ID "${id}" no encontrada.`);
    }
    return invoice;
  }
  
  async generateInvoicePdf(
    invoiceId: string,
    organizationId: string,
  ): Promise<Buffer> {
    const invoice = await this.findOne(invoiceId, organizationId);
    const organization = await this.organizationRepository.findOneBy({ id: organizationId });

    if (!organization) {
        throw new NotFoundException('No se encontró la información de la organización.');
    }
    if (!this.invoiceTemplate) {
        throw new InternalServerErrorException('La plantilla para generar PDF no está disponible.');
    }

    const data = {
        ...invoice,
        organization,
        issueDate: new Date(invoice.issueDate).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' }),
        dueDate: new Date(invoice.dueDate).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' }),
    };

    const htmlContent = this.invoiceTemplate(data);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    

    const pdfUint8Array = await page.pdf({ format: 'A4', printBackground: true });
    const pdfBuffer = Buffer.from(pdfUint8Array);


    await browser.close();
    return pdfBuffer;
  }

  async createCreditNote(
    invoiceId: string,
    organizationId: string,
  ): Promise<Invoice> {
    return this.dataSource.transaction(async (manager) => {
        const originalInvoice = await manager.findOne(Invoice, {
            where: { id: invoiceId, organizationId },
            relations: ['lineItems', 'lineItems.product'],
        });
        
        if (!originalInvoice) {
            throw new NotFoundException(`Factura original con ID "${invoiceId}" no encontrada.`);
        }
        if (
            originalInvoice.status === InvoiceStatus.VOID ||
            originalInvoice.status === InvoiceStatus.CREDIT_NOTE
        ) {
            throw new BadRequestException('La factura ya ha sido anulada o tiene una nota de crédito.');
        }

        const creditNoteNcf = await this.complianceService.getNextNcf(
            organizationId,
            NcfType.B04,
            manager,
        );

        const creditNoteNumber = await this.documentSequencesService.getNextNumber(
            organizationId,
            DocumentType.CREDIT_NOTE,
            manager
        );

        const creditNote = manager.create(Invoice, {
            ...originalInvoice,
            id: undefined,
            invoiceNumber: creditNoteNumber,
            ncfNumber: creditNoteNcf,
            originalInvoiceId: originalInvoice.id,
            status: InvoiceStatus.CREDIT_NOTE,
            type: InvoiceType.CREDIT_NOTE,
            total: -originalInvoice.total,
            subtotal: -originalInvoice.subtotal,
            tax: -originalInvoice.tax,
            balance: 0,
            totalInBaseCurrency: -originalInvoice.totalInBaseCurrency,
            lineItems: originalInvoice.lineItems.map((line) => manager.create(InvoiceLineItem, {
                ...line,
                id: undefined,
                quantity: line.quantity,
            })),
        });

        const savedCreditNote = await manager.save(creditNote);

        originalInvoice.status = InvoiceStatus.VOID;
        originalInvoice.balance = 0;
        await manager.save(originalInvoice);


        for (const line of originalInvoice.lineItems) {
            await this.inventoryService.increaseStock(
            line.product.id,
            line.quantity,
            manager,
            );
        }

        this.eventEmitter.emit('invoice.voided', {
            originalInvoice,
            creditNote: savedCreditNote,
        });

        this.logger.log(`Nota de crédito ${savedCreditNote.invoiceNumber} creada para anular la factura ${originalInvoice.invoiceNumber}.`);
        return savedCreditNote;
    });
  }

  async registerPayment(
    invoiceId: string,
    amount: number,
    organizationId: string,
  ): Promise<Invoice> {
    throw new BadRequestException(
      'Este endpoint está obsoleto. La creación de pagos ahora se gestiona a través del endpoint de Recibos de Cliente (/customer-payments) para permitir pagos de múltiples facturas a la vez.',
    );
  }

  private async getOrgAccountingConfig(organizationId: string): Promise<OrganizationSettings & { defaultTaxRate: number }> {

    const settings = await this.orgSettingsRepository.findOne({ where: { organizationId } });
    if (!settings || !settings.defaultAccountsReceivableId || !settings.defaultSalesRevenueId || !settings.defaultSalesTaxId) {
      throw new BadRequestException('La configuración de cuentas automáticas para esta organización es incompleta. Faltan cuentas de Cuentas por Cobrar, Ingresos por Ventas o Impuestos sobre Ventas.');
    }

    return { ...settings, defaultTaxRate: 18.00 };
  }
}