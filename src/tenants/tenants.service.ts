import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class TenantsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async registerTenant(registerTenantDto: { name: string; domain?: string }) {
    const newTenant = await this.databaseService.tenant.create({
      data: {
        name: registerTenantDto.name,
        domain: registerTenantDto.domain,
      },
    });

    return { message: 'Tenant registered successfully!', data: newTenant };
  }

  /**
   * Get tenant details by domain (public endpoint for storefront)
   * Returns tenant info, brand settings, and categories
   */
  async getTenantByDomain(domain: string) {
    const tenant = await this.databaseService.tenant.findUnique({
      where: { domain },
      select: {
        id: true,
        name: true,
        domain: true,
        isActive: true,
        createdAt: true,
        brand: {
          select: {
            id: true,
            logoUrl: true,
            tagline: true,
            description: true,
            theme: true,
          },
        },
        categories: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            subCategories: {
              where: { isActive: true },
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found for this domain');
    }

    if (!tenant.isActive) {
      throw new NotFoundException('This store is currently unavailable');
    }

    return {
      message: 'Tenant details retrieved successfully',
      data: {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        brand: tenant.brand || {
          logoUrl: null,
          tagline: null,
          description: null,
          theme: 1,
        },
        categories: tenant.categories,
      },
    };
  }
}
