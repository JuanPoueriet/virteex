
import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesService } from './invoices.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationSettings } from '../organizations/entities/organization-settings.entity';
import { ExchangeRate } from '../currencies/entities/exchange-rate.entity';
import { CustomersService } from '../customers/customers.service';
import { InventoryService } from '../inventory/inventory.service';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ComplianceService } from '../compliance/compliance.service';
import { DocumentSequencesService } from '../shared/document-sequences/document-sequences.service';
import { FiscalAdapterFactory } from './adapters/fiscal-adapter.factory';
import { SaasService } from '../saas/saas.service';
import { PdfService } from '../shared/services/pdf.service';
import { TemplateService } from '../shared/services/template.service';

describe('InvoicesService', () => {
  let service: InvoicesService;

  const mockPdfService = {
    generatePdf: jest.fn(),
  };

  const mockTemplateService = {
    renderHtml: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: getRepositoryToken(Invoice), useValue: {} },
        { provide: getRepositoryToken(Organization), useValue: {} },
        { provide: getRepositoryToken(OrganizationSettings), useValue: {} },
        { provide: getRepositoryToken(ExchangeRate), useValue: {} },
        { provide: CustomersService, useValue: {} },
        { provide: InventoryService, useValue: {} },
        { provide: DataSource, useValue: {} },
        { provide: EventEmitter2, useValue: {} },
        { provide: ComplianceService, useValue: {} },
        { provide: DocumentSequencesService, useValue: {} },
        { provide: FiscalAdapterFactory, useValue: {} },
        { provide: SaasService, useValue: {} },
        { provide: PdfService, useValue: mockPdfService },
        { provide: TemplateService, useValue: mockTemplateService },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
