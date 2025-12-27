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
import {
  InitiateRegistrationDto,
  VerifyOtpRegistrationDto,
  ResendOtpDto,
} from './dto/otp.dto';
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

  // Register Tenant Admin with New Tenant (Legacy - direct registration)
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

  // ========== OTP-BASED REGISTRATION ENDPOINTS ==========

  // Step 1: Initiate registration - send OTP to email
  @Post('register/initiate')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  initiateRegistration(@Body() initiateDto: InitiateRegistrationDto) {
    return this.authService.initiateRegistration(initiateDto.email);
  }

  // Step 2: Verify OTP and complete registration
  @Post('register/verify-otp')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  verifyOtpAndRegister(@Body() verifyDto: VerifyOtpRegistrationDto) {
    return this.authService.verifyOtpAndRegister(
      verifyDto.email,
      verifyDto.otp,
      verifyDto.name,
      verifyDto.password,
      verifyDto.phone,
      verifyDto.tenantName,
    );
  }

  // Resend OTP
  @Post('register/resend-otp')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  resendOtp(@Body() resendDto: ResendOtpDto) {
    return this.authService.resendOtp(resendDto.email);
  }
}
