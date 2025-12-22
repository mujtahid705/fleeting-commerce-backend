import {
  Body,
  Controller,
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
} from './dto/create-user.dto';
import { RolesGuard } from './guards/roles.guard';
import { JwtGuard } from './guards/jwt.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  login(@Req() req: Request) {
    return this.authService.login(req.user);
  }

  // @Post('register')
  // @UsePipes(new ValidationPipe({ whitelist: true }))
  // register(@Body() createUserDto: CreateUserDto) {
  //   return this.authService.register(createUserDto);
  // }

  @Post('register/super-admin')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  registerSuperAdmin(@Body() createSuperAdminDto: CreateSuperAdminDto) {
    return this.authService.createSuperAdmin(createSuperAdminDto);
  }

  @Post('register/tenant-admin')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  registerTenantAdmin(@Body() createTenantAdminDto: CreateTenantAdminDto) {
    return this.authService.createTenantAdmin(createTenantAdminDto);
  }

  @Post('register/customer')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  registerCustomer(@Body() createCustomerDto: CreateCustomerDto) {
    return this.authService.createCustomer(createCustomerDto);
  }
}
