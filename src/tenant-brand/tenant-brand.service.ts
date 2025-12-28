import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateTenantBrandDto, UpdateTenantBrandDto } from './dto';
import { join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';

@Injectable()
export class TenantBrandService implements OnModuleInit {
  private readonly uploadPath = join(process.cwd(), 'uploads', 'brands');

  constructor(private readonly databaseService: DatabaseService) {}

  onModuleInit() {
    // Ensure upload directory exists
    if (!existsSync(this.uploadPath)) {
      mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  getUploadPath(): string {
    return this.uploadPath;
  }

  getLogoUrl(filename: string): string {
    return `/uploads/brands/${filename}`;
  }

  /**
   * Get the current tenant's brand settings
   */
  async getBrand(req: any) {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('No tenant associated with this user');
    }

    const brand = await this.databaseService.tenantBrand.findUnique({
      where: { tenantId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
      },
    });

    if (!brand) {
      // Return default brand settings if none exist
      return {
        message: 'No brand settings found',
        data: {
          tenantId,
          logoUrl: null,
          tagline: null,
          description: null,
          theme: 1,
        },
      };
    }

    return {
      message: 'Brand settings retrieved successfully',
      data: brand,
    };
  }

  /**
   * Get brand settings by tenant ID (public endpoint)
   */
  async getBrandByTenantId(tenantId: string) {
    const tenant = await this.databaseService.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const brand = await this.databaseService.tenantBrand.findUnique({
      where: { tenantId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
      },
    });

    if (!brand) {
      return {
        message: 'No brand settings found',
        data: {
          tenantId,
          tenantName: tenant.name,
          logoUrl: null,
          tagline: null,
          description: null,
          theme: 1,
        },
      };
    }

    return {
      message: 'Brand settings retrieved successfully',
      data: brand,
    };
  }

  /**
   * Get brand settings by domain (public endpoint for storefront)
   */
  async getBrandByDomain(domain: string) {
    const tenant = await this.databaseService.tenant.findUnique({
      where: { domain },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found for this domain');
    }

    const brand = await this.databaseService.tenantBrand.findUnique({
      where: { tenantId: tenant.id },
    });

    if (!brand) {
      return {
        message: 'No brand settings found',
        data: {
          tenantId: tenant.id,
          tenantName: tenant.name,
          domain: tenant.domain,
          logoUrl: null,
          tagline: null,
          description: null,
          theme: 1,
        },
      };
    }

    return {
      message: 'Brand settings retrieved successfully',
      data: {
        ...brand,
        tenantName: tenant.name,
        domain: tenant.domain,
      },
    };
  }

  /**
   * Create or update brand settings for the current tenant
   */
  async upsertBrand(
    createTenantBrandDto: CreateTenantBrandDto,
    logo: any | undefined,
    req: any,
  ) {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('No tenant associated with this user');
    }

    // Check if brand already exists
    const existingBrand = await this.databaseService.tenantBrand.findUnique({
      where: { tenantId },
    });

    let logoUrl: string | undefined;

    if (logo) {
      // Delete old logo if exists
      if (existingBrand?.logoUrl) {
        const oldLogoPath = join(
          process.cwd(),
          existingBrand.logoUrl.replace(/^\//, ''),
        );
        if (existsSync(oldLogoPath)) {
          try {
            unlinkSync(oldLogoPath);
          } catch (error) {
            console.error('Error deleting old logo:', error);
          }
        }
      }
      logoUrl = this.getLogoUrl(logo.filename);
    }

    const brandData = {
      domain: createTenantBrandDto.domain,
      tagline: createTenantBrandDto.tagline,
      description: createTenantBrandDto.description,
      theme: createTenantBrandDto.theme ?? 1,
      ...(logoUrl && { logoUrl }),
    };

    // If domain is provided, also update the Tenant table
    if (createTenantBrandDto.domain) {
      await this.databaseService.tenant.update({
        where: { id: tenantId },
        data: { domain: createTenantBrandDto.domain },
      });
    }

    if (existingBrand) {
      // Update existing brand
      const updatedBrand = await this.databaseService.tenantBrand.update({
        where: { tenantId },
        data: brandData,
      });

      return {
        message: 'Brand settings updated successfully',
        data: updatedBrand,
      };
    } else {
      // Create new brand
      const newBrand = await this.databaseService.tenantBrand.create({
        data: {
          tenantId,
          ...brandData,
        },
      });

      return {
        message: 'Brand settings created successfully',
        data: newBrand,
      };
    }
  }

  /**
   * Update brand settings
   */
  async updateBrand(
    updateTenantBrandDto: UpdateTenantBrandDto,
    logo: any | undefined,
    req: any,
  ) {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('No tenant associated with this user');
    }

    const existingBrand = await this.databaseService.tenantBrand.findUnique({
      where: { tenantId },
    });

    if (!existingBrand) {
      throw new NotFoundException(
        'Brand settings not found. Please create brand settings first.',
      );
    }

    let logoUrl: string | undefined;

    if (logo) {
      // Delete old logo if exists
      if (existingBrand.logoUrl) {
        const oldLogoPath = join(
          process.cwd(),
          existingBrand.logoUrl.replace(/^\//, ''),
        );
        if (existsSync(oldLogoPath)) {
          try {
            unlinkSync(oldLogoPath);
          } catch (error) {
            console.error('Error deleting old logo:', error);
          }
        }
      }
      logoUrl = this.getLogoUrl(logo.filename);
    }

    const updateData: any = {};

    if (updateTenantBrandDto.domain !== undefined) {
      updateData.domain = updateTenantBrandDto.domain;
      // Also update the Tenant table
      await this.databaseService.tenant.update({
        where: { id: tenantId },
        data: { domain: updateTenantBrandDto.domain },
      });
    }
    if (updateTenantBrandDto.tagline !== undefined) {
      updateData.tagline = updateTenantBrandDto.tagline;
    }
    if (updateTenantBrandDto.description !== undefined) {
      updateData.description = updateTenantBrandDto.description;
    }
    if (updateTenantBrandDto.theme !== undefined) {
      updateData.theme = updateTenantBrandDto.theme;
    }
    if (logoUrl) {
      updateData.logoUrl = logoUrl;
    }

    const updatedBrand = await this.databaseService.tenantBrand.update({
      where: { tenantId },
      data: updateData,
    });

    return {
      message: 'Brand settings updated successfully',
      data: updatedBrand,
    };
  }

  /**
   * Delete logo only
   */
  async deleteLogo(req: any) {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('No tenant associated with this user');
    }

    const existingBrand = await this.databaseService.tenantBrand.findUnique({
      where: { tenantId },
    });

    if (!existingBrand) {
      throw new NotFoundException('Brand settings not found');
    }

    if (!existingBrand.logoUrl) {
      return {
        message: 'No logo to delete',
        data: existingBrand,
      };
    }

    // Delete the logo file
    const logoPath = join(
      process.cwd(),
      existingBrand.logoUrl.replace(/^\//, ''),
    );
    if (existsSync(logoPath)) {
      try {
        unlinkSync(logoPath);
      } catch (error) {
        console.error('Error deleting logo:', error);
      }
    }

    const updatedBrand = await this.databaseService.tenantBrand.update({
      where: { tenantId },
      data: { logoUrl: null },
    });

    return {
      message: 'Logo deleted successfully',
      data: updatedBrand,
    };
  }

  /**
   * Delete all brand settings
   */
  async deleteBrand(req: any) {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('No tenant associated with this user');
    }

    const existingBrand = await this.databaseService.tenantBrand.findUnique({
      where: { tenantId },
    });

    if (!existingBrand) {
      throw new NotFoundException('Brand settings not found');
    }

    // Delete the logo file if exists
    if (existingBrand.logoUrl) {
      const logoPath = join(
        process.cwd(),
        existingBrand.logoUrl.replace(/^\//, ''),
      );
      if (existsSync(logoPath)) {
        try {
          unlinkSync(logoPath);
        } catch (error) {
          console.error('Error deleting logo:', error);
        }
      }
    }

    await this.databaseService.tenantBrand.delete({
      where: { tenantId },
    });

    return {
      message: 'Brand settings deleted successfully',
    };
  }
}
