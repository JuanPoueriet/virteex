import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import * as handlebars from 'handlebars';
import * as fs from 'fs';

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

  compile(templatePath: string, data: any): string {
    let template = this.templateCache.get(templatePath);

    if (!template) {
      try {
        const templateHtml = fs.readFileSync(templatePath, 'utf8');
        template = handlebars.compile(templateHtml);
        this.templateCache.set(templatePath, template);
      } catch (error) {
        this.logger.error(`Error compiling template at ${templatePath}`, error);
        throw new InternalServerErrorException(
          'Could not compile template.'
        );
      }
    }

    return template(data);
  }
}
