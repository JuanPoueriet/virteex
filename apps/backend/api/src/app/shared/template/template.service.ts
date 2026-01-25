import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

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
    let templateDelegate = this.templateCache.get(templatePath);

    if (!templateDelegate) {
      try {
        const templateHtml = fs.readFileSync(templatePath, 'utf8');
        templateDelegate = handlebars.compile(templateHtml);
        this.templateCache.set(templatePath, templateDelegate);
      } catch (error) {
        this.logger.error(
          `Error compiling Handlebars template at ${templatePath}`,
          error
        );
        throw error;
      }
    }

    return templateDelegate(data);
  }
}
