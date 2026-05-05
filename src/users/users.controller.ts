import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Request } from 'express';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { JwtPayload } from 'src/auth/types/jwt-payload.interface';
import { UpdateCustomerStatusDto } from './dto/update-customer-status.dto';
import { UpdateTenantAdminStatusDto } from './dto/update-tenant-admin-status.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // get all users
  @Get('all')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  getAllUsers(@Req() req: Request & { user: JwtPayload }) {
    return this.usersService.findAll();
  }

  // Get Customers By Tenant
  @Get('customers-by-tenant')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  getCustomersByTenant(@Req() req: Request & { user: JwtPayload }) {
    return this.usersService.getCustomersByTenant(req.user.tenantId);
  }

  // Get Tenant Admins By Tenant
  @Get('tenant-admins')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  getTenantAdminsByTenant(@Req() req: Request & { user: JwtPayload }) {
    return this.usersService.getTenantAdminsByTenant(req.user.tenantId);
  }

  // Delete Tenant Admin
  @Delete('tenant-admin/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  deleteTenantAdmin(
    @Param('id') id: string,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.usersService.deleteTenantAdmin(id, req.user.tenantId);
  }

  // Update Tenant Admin Status
  @Patch('tenant-admin/:id/status')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  @UsePipes(new ValidationPipe({ transform: true }))
  updateTenantAdminStatus(
    @Param('id') id: string,
    @Body() updateTenantAdminStatusDto: UpdateTenantAdminStatusDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.usersService.updateTenantAdminStatus(
      id,
      updateTenantAdminStatusDto.isActive,
      req.user.tenantId,
    );
  }

  // Update Customer Status
  @Patch('update-status')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  @UsePipes(new ValidationPipe({ transform: true }))
  updateCustomerStatus(
    @Body() updateCustomerStatusDto: UpdateCustomerStatusDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.usersService.updateCustomerStatus(
      updateCustomerStatusDto,
      req.user.tenantId,
    );
  }

  // Get Super Admins
  @Get('super-admins')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  getSuperAdmins() {
    return this.usersService.getSuperAdmins();
  }
}
