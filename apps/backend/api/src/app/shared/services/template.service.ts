import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templateCache = new Map<string, HandlebarsTemplateDelegate>();

  constructor() {
    this.registerHelpers();
  }

  private registerHelpers() {
    handlebars.registerHelper('formatNumber', (value) => {
      if (typeof value !== 'number') return value;
      return new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    });
    handlebars.registerHelper('multiply', (a, b) => a * b);
  }

  renderHtml(templatePath: string, data: any): string {
    try {
      let compiled = this.templateCache.get(templatePath);

      if (!compiled) {
          const templateContent = fs.readFileSync(templatePath, 'utf8');
          compiled = handlebars.compile(templateContent);
          this.templateCache.set(templatePath, compiled);
      }

      return compiled(data);
    } catch (error) {
      this.logger.error(`Error rendering template at ${templatePath}`, error);
      throw new InternalServerErrorException('Error generating document from template');
    }
  }
}
