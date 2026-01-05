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
   * Helper method to populate category data in customization fields
   */
  private async populateCategoryData(brand: any, tenantId: string) {
    if (!brand) return brand;

    const categories = await this.databaseService.category.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        subCategories: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    const result = { ...brand };

    // Process browseCategories
    if (brand.browseCategories) {
      if (
        typeof brand.browseCategories === 'object' &&
        brand.browseCategories.categories
      ) {
        result.browseCategories = {
          ...brand.browseCategories,
          categories: brand.browseCategories.categories.map((item: any) => {
            const category = categories.find(
              (cat) => cat.id === item.categoryId,
            );
            if (category) {
              return {
                ...item,
                category: {
                  id: category.id,
                  name: category.name,
                  slug: category.slug,
                },
              };
            }
            return item;
          }),
        };
      } else if (Array.isArray(brand.browseCategories)) {
        result.browseCategories = categories.filter((cat) =>
          (brand.browseCategories as number[]).includes(cat.id),
        );
      }
    }

    // Process featuredCategories
    if (brand.featuredCategories) {
      if (
        typeof brand.featuredCategories === 'object' &&
        brand.featuredCategories.categories
      ) {
        result.featuredCategories = {
          ...brand.featuredCategories,
          categories: brand.featuredCategories.categories.map((item: any) => {
            const category = categories.find(
              (cat) => cat.id === item.categoryId,
            );
            if (category) {
              return {
                ...item,
                category: {
                  id: category.id,
                  name: category.name,
                  slug: category.slug,
                },
              };
            }
            return item;
          }),
        };
      } else if (Array.isArray(brand.featuredCategories)) {
        result.featuredCategories = categories.filter((cat) =>
          (brand.featuredCategories as number[]).includes(cat.id),
        );
      }
    }

    return result;
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

    const populatedBrand = await this.populateCategoryData(brand, tenantId);

    return {
      message: 'Brand settings retrieved successfully',
      data: populatedBrand,
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

    const populatedBrand = await this.populateCategoryData(brand, tenantId);

    return {
      message: 'Brand settings retrieved successfully',
      data: populatedBrand,
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

    const populatedBrand = await this.populateCategoryData(brand, tenant.id);

    return {
      message: 'Brand settings retrieved successfully',
      data: {
        ...populatedBrand,
        tenantName: tenant.name,
        domain: tenant.domain,
      },
    };
  }

  /**
   * Process uploaded files and JSON data from form-data
   */
  private processFormData(dto: any, files: any) {
    const result: any = {};

    // Parse JSON strings from form-data
    if (dto.hero) {
      try {
        result.hero = JSON.parse(dto.hero);
      } catch (e) {
        result.hero = dto.hero;
      }
    }

    if (dto.browseCategories) {
      try {
        result.browseCategories = JSON.parse(dto.browseCategories);
      } catch (e) {
        result.browseCategories = dto.browseCategories;
      }
    }

    if (dto.exclusiveSection) {
      try {
        result.exclusiveSection = JSON.parse(dto.exclusiveSection);
      } catch (e) {
        result.exclusiveSection = dto.exclusiveSection;
      }
    }

    if (dto.featuredCategories) {
      try {
        result.featuredCategories = JSON.parse(dto.featuredCategories);
      } catch (e) {
        result.featuredCategories = dto.featuredCategories;
      }
    }

    if (dto.footer) {
      try {
        result.footer = JSON.parse(dto.footer);
      } catch (e) {
        result.footer = dto.footer;
      }
    }

    // Process uploaded image files
    if (files) {
      // Hero image
      if (files.heroImage && files.heroImage[0]) {
        const heroImageUrl = this.getLogoUrl(files.heroImage[0].filename);
        if (result.hero && typeof result.hero === 'object') {
          result.hero.backgroundImage = heroImageUrl;
        }
      }

      // Exclusive section images
      if (files.exclusiveImages && files.exclusiveImages.length > 0) {
        if (
          result.exclusiveSection &&
          typeof result.exclusiveSection === 'object' &&
          Array.isArray(result.exclusiveSection.products)
        ) {
          result.exclusiveSection.products =
            result.exclusiveSection.products.map(
              (product: any, index: number) => {
                if (files.exclusiveImages[index]) {
                  return {
                    ...product,
                    customImage: this.getLogoUrl(
                      files.exclusiveImages[index].filename,
                    ),
                  };
                }
                return product;
              },
            );
        }
      }
    }

    return result;
  }

  /**
   * Create or update brand settings for the current tenant
   */
  async upsertBrand(
    createTenantBrandDto: CreateTenantBrandDto,
    files: any | undefined,
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

    if (files && files.logo && files.logo[0]) {
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
      logoUrl = this.getLogoUrl(files.logo[0].filename);
    }

    // Process form data and files
    const processedData = this.processFormData(createTenantBrandDto, files);

    const brandData = {
      domain: createTenantBrandDto.domain,
      tagline: createTenantBrandDto.tagline,
      description: createTenantBrandDto.description,
      theme: createTenantBrandDto.theme ?? 1,
      hero: processedData.hero,
      browseCategories: processedData.browseCategories,
      exclusiveSection: processedData.exclusiveSection,
      featuredCategories: processedData.featuredCategories,
      footer: processedData.footer,
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

      const populatedBrand = await this.populateCategoryData(
        updatedBrand,
        tenantId,
      );

      return {
        message: 'Brand settings updated successfully',
        data: populatedBrand,
      };
    } else {
      // Create new brand
      const newBrand = await this.databaseService.tenantBrand.create({
        data: {
          tenantId,
          ...brandData,
        },
      });

      const populatedBrand = await this.populateCategoryData(
        newBrand,
        tenantId,
      );

      return {
        message: 'Brand settings created successfully',
        data: populatedBrand,
      };
    }
  }

  /**
   * Update brand settings
   */
  async updateBrand(
    updateTenantBrandDto: UpdateTenantBrandDto,
    files: any | undefined,
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

    if (files && files.logo && files.logo[0]) {
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
      logoUrl = this.getLogoUrl(files.logo[0].filename);
    }

    // Process form data and files
    const processedData = this.processFormData(updateTenantBrandDto, files);

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
    if (processedData.hero !== undefined) {
      updateData.hero = processedData.hero;
    }
    if (processedData.browseCategories !== undefined) {
      updateData.browseCategories = processedData.browseCategories;
    }
    if (processedData.exclusiveSection !== undefined) {
      updateData.exclusiveSection = processedData.exclusiveSection;
    }
    if (processedData.featuredCategories !== undefined) {
      updateData.featuredCategories = processedData.featuredCategories;
    }
    if (processedData.footer !== undefined) {
      updateData.footer = processedData.footer;
    }
    if (logoUrl) {
      updateData.logoUrl = logoUrl;
    }

    const updatedBrand = await this.databaseService.tenantBrand.update({
      where: { tenantId },
      data: updateData,
    });

    const populatedBrand = await this.populateCategoryData(
      updatedBrand,
      tenantId,
    );

    return {
      message: 'Brand settings updated successfully',
      data: populatedBrand,
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

  async checkUniqueDomain(domain: string, currentTenantId: string) {
    if (!domain) {
      return {
        message: 'Domain is required',
        isAvailable: false,
      };
    }

    const existingTenant = await this.databaseService.tenant.findUnique({
      where: { domain },
      select: { id: true },
    });

    const isAvailable =
      !existingTenant || existingTenant.id === currentTenantId;

    return {
      message: isAvailable ? 'Domain is available' : 'Domain is already taken',
      isAvailable,
    };
  }
}
