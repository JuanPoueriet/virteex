import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
@Processor('localization')
export class LocalizationConsumer extends WorkerHost {
  private readonly logger = new Logger(LocalizationConsumer.name);

  constructor() {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    this.logger.log(`Procesando job ${job.id} del tipo ${job.name}`);

    switch (job.name) {
      case 'apply-package':
        await this.handleApplyPackage(job.data);
        break;
      default:
        this.logger.warn(`Job con nombre desconocido: ${job.name}`);
    }
  }

  private async handleApplyPackage(data: any): Promise<void> {
    const { organizationId, template } = data;
    this.logger.log(`Aplicando CoA de la plantilla ${template.id} a la organización ${organizationId}...`);

    // for (const coa of template.coaTemplate) {
    //
    // }

    this.logger.log(`Aplicando Impuestos de la plantilla ${template.id} a la organización ${organizationId}...`);
    // for (const tax of template.taxTemplates) {
    //
    // }


    this.logger.log(`Paquete de localización aplicado exitosamente para la organización ${organizationId}.`);
  }
}