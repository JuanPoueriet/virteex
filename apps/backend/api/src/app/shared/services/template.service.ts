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

  /**
   * Renders a Handlebars template.
   * Uses caching to avoid re-reading and re-compiling the template on every request.
   * @param templatePath Absolute path to the template file
   * @param data Data context for the template
   */
  renderHtml(templatePath: string, data: any): string {
    try {
      let template = this.templateCache.get(templatePath);

      if (!template) {
        if (!fs.existsSync(templatePath)) {
             this.logger.error(`Template file not found at: ${templatePath}`);
             throw new InternalServerErrorException(`Template not found: ${path.basename(templatePath)}`);
        }
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        template = handlebars.compile(templateContent);
        this.templateCache.set(templatePath, template);
      }

      return template(data);
    } catch (error) {
      this.logger.error(`Error rendering template at ${templatePath}`, error);
      throw error; // Propagate or wrap in InternalServerError
    }
  }
}
