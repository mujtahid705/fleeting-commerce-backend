import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /**
   * Get tenant details by domain (public endpoint for storefront)
   * GET /api/tenants/storefront?domain=example.com
   */
  @Get('storefront')
  getTenantByDomain(@Query('domain') domain: string) {
    return this.tenantsService.getTenantByDomain(domain);
  }

  @Post('register')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  registerTenant(@Body() registerTenantDto: RegisterTenantDto) {
    return this.tenantsService.registerTenant(registerTenantDto);
  }
}
