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

  /**
   * Renders a Handlebars template with the provided data.
   * Uses caching to avoid recompiling the template on every request.
   *
   * @param templatePath The absolute path to the template file.
   * @param data The data to bind to the template.
   * @returns The rendered HTML string.
   */
  renderHtml(templatePath: string, data: any): string {
    try {
      let compiledTemplate = this.templateCache.get(templatePath);

      if (!compiledTemplate) {
        // Read and compile if not cached
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        compiledTemplate = handlebars.compile(templateContent);
        this.templateCache.set(templatePath, compiledTemplate);
        this.logger.debug(`Template compiled and cached: ${templatePath}`);
      }

      return compiledTemplate(data);
    } catch (error) {
      this.logger.error(`Error rendering template at ${templatePath}`, error);
      throw new InternalServerErrorException('Error generating document from template');
    }
  }

  /**
   * Clears the template cache. Useful for development or when templates change.
   */
  clearCache() {
    this.templateCache.clear();
  }
}
