import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/localAuth.guard';
import { Request } from 'express';
import {
  CreateCustomerDto,
  CreateSuperAdminDto,
  CreateTenantAdminDto,
  CreateTenantAdminWithTenantDto,
} from './dto/create-user.dto';
import { RolesGuard } from './guards/roles.guard';
import { JwtGuard } from './guards/jwt.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Validate session - call on every app reload
  @Get('validate-session')
  @UseGuards(JwtGuard)
  validateSession(@Req() req: any) {
    return this.authService.validateSession(
      req.user.id,
      req.user.tenantId,
      req.user.role,
    );
  }

  // Login
  @Post('login')
  @UseGuards(LocalAuthGuard)
  login(@Req() req: Request) {
    return this.authService.login(req.user);
  }

  // Register Super Admin
  @Post('register/super-admin')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  registerSuperAdmin(@Body() createSuperAdminDto: CreateSuperAdminDto) {
    return this.authService.createSuperAdmin(createSuperAdminDto);
  }

  // Register Tenant Admin
  @Post('register/tenant-admin')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  registerTenantAdmin(@Body() createTenantAdminDto: CreateTenantAdminDto) {
    return this.authService.createTenantAdmin(createTenantAdminDto);
  }

  // Register Tenant Admin with New Tenant
  @Post('register/tenant-admin-with-tenant')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  registerTenantAdminWithTenant(
    @Body() createTenantAdminWithTenantDto: CreateTenantAdminWithTenantDto,
  ) {
    return this.authService.createTenantAdminWithTenant(
      createTenantAdminWithTenantDto,
    );
  }

  // Register Customer
  @Post('register/customer')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  registerCustomer(@Body() createCustomerDto: CreateCustomerDto) {
    return this.authService.createCustomer(createCustomerDto);
  }
}
