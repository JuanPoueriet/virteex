import { Test, TestingModule } from '@nestjs/testing';
import { TemplateService } from './template.service';
import * as fs from 'fs';
import * as handlebars from 'handlebars';

jest.mock('fs');

describe('TemplateService', () => {
  let service: TemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateService],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('compile', () => {
    it('should compile and cache template', () => {
      const templatePath = 'path/to/template.hbs';
      const templateContent = 'Hello {{name}}';
      const data = { name: 'World' };
      const compiledTemplate = jest.fn().mockReturnValue('Hello World');

      jest.spyOn(fs, 'readFileSync').mockReturnValue(templateContent);
      jest.spyOn(handlebars, 'compile').mockReturnValue(compiledTemplate);

      const result = service.compile(templatePath, data);

      expect(fs.readFileSync).toHaveBeenCalledWith(templatePath, 'utf8');
      expect(handlebars.compile).toHaveBeenCalledWith(templateContent);
      expect(compiledTemplate).toHaveBeenCalledWith(data);
      expect(result).toBe('Hello World');

      // Test caching
      service.compile(templatePath, data);
      expect(fs.readFileSync).toHaveBeenCalledTimes(1); // Should not be called again
      expect(handlebars.compile).toHaveBeenCalledTimes(1);
    });
  });
});
