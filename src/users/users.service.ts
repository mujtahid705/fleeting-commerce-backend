import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { UpdateCustomerStatusDto } from './dto/update-customer-status.dto';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  // find all users
  async findAll() {
    const users = await this.databaseService.user.findMany();
    return users;
  }

  // Get customers by tenant
  async getCustomersByTenant(tenantId: string) {
    const customers = await this.databaseService.user.findMany({
      where: {
        tenantId,
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Customers fetched successfully',
      count: customers.length,
      data: customers,
    };
  }

  // Get tenant admins by tenant
  async getTenantAdminsByTenant(tenantId: string) {
    const tenantAdmins = await this.databaseService.user.findMany({
      where: {
        tenantId,
        role: 'TENANT_ADMIN',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      message: 'Tenant admins fetched successfully',
      count: tenantAdmins.length,
      data: tenantAdmins,
    };
  }

  private async getPrimaryTenantAdmin(tenantId: string) {
    return this.databaseService.user.findFirst({
      where: {
        tenantId,
        role: 'TENANT_ADMIN',
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Delete tenant admin
  async deleteTenantAdmin(id: string, tenantId: string) {
    const tenantAdmin = await this.databaseService.user.findUnique({
      where: { id },
    });

    if (!tenantAdmin) {
      throw new NotFoundException('Tenant admin not found');
    }

    if (tenantAdmin.tenantId !== tenantId) {
      throw new UnauthorizedException('Unauthorized tenant.');
    }

    if (tenantAdmin.role !== 'TENANT_ADMIN') {
      throw new UnauthorizedException('Can only delete tenant admins');
    }

    const primaryTenantAdmin = await this.getPrimaryTenantAdmin(tenantId);

    if (primaryTenantAdmin?.id === tenantAdmin.id) {
      throw new ForbiddenException('Primary tenant admin cannot be deleted');
    }

    await this.databaseService.user.delete({
      where: { id },
    });

    return {
      message: 'Tenant admin deleted successfully',
    };
  }

  // Update tenant admin status
  async updateTenantAdminStatus(
    id: string,
    isActive: boolean,
    tenantId: string,
  ) {
    const tenantAdmin = await this.databaseService.user.findUnique({
      where: { id },
    });

    if (!tenantAdmin) {
      throw new NotFoundException('Tenant admin not found');
    }

    if (tenantAdmin.tenantId !== tenantId) {
      throw new UnauthorizedException('Unauthorized tenant.');
    }

    if (tenantAdmin.role !== 'TENANT_ADMIN') {
      throw new UnauthorizedException('Can only update tenant admin status');
    }

    const primaryTenantAdmin = await this.getPrimaryTenantAdmin(tenantId);

    if (!isActive && primaryTenantAdmin?.id === tenantAdmin.id) {
      throw new ForbiddenException('Primary tenant admin cannot be disabled');
    }

    const updatedTenantAdmin = await this.databaseService.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      message: 'Tenant admin status updated successfully',
      data: updatedTenantAdmin,
    };
  }

  // Update customer status
  async updateCustomerStatus(
    updateCustomerStatusDto: UpdateCustomerStatusDto,
    tenantId: string,
  ) {
    const { customerId, isActive } = updateCustomerStatusDto;

    const customer = await this.databaseService.user.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (customer.tenantId !== tenantId) {
      throw new UnauthorizedException('Unauthorized tenant.');
    }

    if (customer.role !== 'CUSTOMER') {
      throw new UnauthorizedException('Can only update customer status');
    }

    const updatedCustomer = await this.databaseService.user.update({
      where: { id: customerId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      message: `Customer ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedCustomer,
    };
  }

  // Get super admins
  async getSuperAdmins() {
    const superAdmins = await this.databaseService.user.findMany({
      where: {
        role: 'SUPER_ADMIN',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Super admins fetched successfully',
      count: superAdmins.length,
      data: superAdmins,
    };
  }
}
