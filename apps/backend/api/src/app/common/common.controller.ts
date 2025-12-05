
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Common')
@Controller('common')
export class CommonController {

  @Get('industries')
  @ApiOperation({ summary: 'Get list of industries' })
  getIndustries() {
    return [
        { id: 'tech', label: 'Tecnología y Software' },
        { id: 'retail', label: 'Comercio Minorista (Retail)' },
        { id: 'services', label: 'Servicios Profesionales' },
        { id: 'construction', label: 'Construcción e Inmobiliaria' },
        { id: 'health', label: 'Salud y Medicina' },
        { id: 'manufacturing', label: 'Manufactura' },
        { id: 'education', label: 'Educación' },
        { id: 'other', label: 'Otro' }
    ];
  }
}
