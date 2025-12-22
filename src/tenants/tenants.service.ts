import { Injectable } from '@nestjs/common';
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
}
