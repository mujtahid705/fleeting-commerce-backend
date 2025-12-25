import {
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
