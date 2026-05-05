import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateTenantBrandDto, UpdateTenantBrandDto } from './dto';
import {
  FileUploadService,
  UploadedCloudinaryImage,
} from 'src/common/services/file-upload.service';

@Injectable()
export class TenantBrandService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly fileUploadService: FileUploadService,
  ) {}

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

  private parseFormData(dto: any) {
    const result: any = {};

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

    return result;
  }

  /**
   * Process uploaded files and JSON data from form-data
   */
  private async processFormData(
    dto: any,
    files: any,
    tenantId: string,
  ): Promise<{ data: any; uploadedPublicIds: string[] }> {
    const result = this.parseFormData(dto);
    const uploadedPublicIds: string[] = [];
    const brandFolder = this.fileUploadService.getBrandFolder(tenantId);

    try {
      if (files) {
        if (files.heroImage && files.heroImage[0]) {
          if (result.hero && typeof result.hero === 'object') {
            const heroImage = await this.fileUploadService.uploadImage(
              files.heroImage[0],
              brandFolder,
              'brand-hero',
            );
            uploadedPublicIds.push(heroImage.publicId);
            result.hero.backgroundImage = heroImage.optimizedUrl;
            result.hero.backgroundImagePublicId = heroImage.publicId;
          }
        }

        if (files.exclusiveImages && files.exclusiveImages.length > 0) {
          if (
            result.exclusiveSection &&
            typeof result.exclusiveSection === 'object' &&
            Array.isArray(result.exclusiveSection.products)
          ) {
            result.exclusiveSection.products =
              result.exclusiveSection.products.map(
                async (product: any, index: number) => {
                  if (files.exclusiveImages[index]) {
                    const exclusiveImage =
                      await this.fileUploadService.uploadImage(
                        files.exclusiveImages[index],
                        brandFolder,
                        'brand-exclusive',
                      );
                    uploadedPublicIds.push(exclusiveImage.publicId);

                    return {
                      ...product,
                      customImage: exclusiveImage.optimizedUrl,
                      customImagePublicId: exclusiveImage.publicId,
                    };
                  }
                  return product;
                },
              );
            result.exclusiveSection.products = await Promise.all(
              result.exclusiveSection.products,
            );
          }
        }
      }
    } catch (error) {
      await this.fileUploadService.deleteImages(uploadedPublicIds);
      throw error;
    }

    return { data: result, uploadedPublicIds };
  }

  private collectBrandPublicIds(brand: any): string[] {
    const publicIds: string[] = [];

    if (brand?.logoPublicId) publicIds.push(brand.logoPublicId);

    if (brand?.hero?.backgroundImagePublicId) {
      publicIds.push(brand.hero.backgroundImagePublicId);
    }

    if (Array.isArray(brand?.exclusiveSection?.products)) {
      for (const product of brand.exclusiveSection.products) {
        if (product?.customImagePublicId) {
          publicIds.push(product.customImagePublicId);
        }
      }
    }

    return publicIds;
  }

  private collectReplacedBrandPublicIds(
    existingBrand: any,
    files: any,
    logoUpload?: UploadedCloudinaryImage,
  ): string[] {
    const publicIds: string[] = [];

    if (logoUpload && existingBrand?.logoPublicId) {
      publicIds.push(existingBrand.logoPublicId);
    }

    if (files?.heroImage?.[0] && existingBrand?.hero?.backgroundImagePublicId) {
      publicIds.push(existingBrand.hero.backgroundImagePublicId);
    }

    if (
      files?.exclusiveImages?.length &&
      Array.isArray(existingBrand?.exclusiveSection?.products)
    ) {
      for (let index = 0; index < files.exclusiveImages.length; index += 1) {
        const publicId =
          existingBrand.exclusiveSection.products[index]?.customImagePublicId;
        if (publicId) publicIds.push(publicId);
      }
    }

    return publicIds;
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

    let logoUpload: UploadedCloudinaryImage | undefined;
    const uploadedPublicIds: string[] = [];

    if (files && files.logo && files.logo[0]) {
      logoUpload = await this.fileUploadService.uploadImage(
        files.logo[0],
        this.fileUploadService.getBrandFolder(tenantId),
        'brand-logo',
      );
      uploadedPublicIds.push(logoUpload.publicId);
    }

    let processedFormData: { data: any; uploadedPublicIds: string[] };
    try {
      processedFormData = await this.processFormData(
        createTenantBrandDto,
        files,
        tenantId,
      );
    } catch (error) {
      await this.fileUploadService.deleteImages(uploadedPublicIds);
      throw error;
    }
    const processedData = processedFormData.data;
    uploadedPublicIds.push(...processedFormData.uploadedPublicIds);

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
      ...(logoUpload && {
        logoUrl: logoUpload.optimizedUrl,
        logoPublicId: logoUpload.publicId,
      }),
    };

    try {
      const savedBrand = await this.databaseService.$transaction(async (tx) => {
        if (createTenantBrandDto.domain) {
          await (tx as any).tenant.update({
            where: { id: tenantId },
            data: { domain: createTenantBrandDto.domain },
          });
        }

        if (existingBrand) {
          return (tx as any).tenantBrand.update({
            where: { tenantId },
            data: brandData,
          });
        }

        return (tx as any).tenantBrand.create({
          data: {
            tenantId,
            ...brandData,
          },
        });
      });

      if (existingBrand) {
        await this.fileUploadService.deleteImages(
          this.collectReplacedBrandPublicIds(
            existingBrand,
            files,
            logoUpload,
          ),
        );
      }

      const populatedBrand = await this.populateCategoryData(
        savedBrand,
        tenantId,
      );

      return {
        message: existingBrand
          ? 'Brand settings updated successfully'
          : 'Brand settings created successfully',
        data: populatedBrand,
      };
    } catch (error) {
      await this.fileUploadService.deleteImages(uploadedPublicIds);
      throw error;
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

    let logoUpload: UploadedCloudinaryImage | undefined;
    const uploadedPublicIds: string[] = [];

    if (files && files.logo && files.logo[0]) {
      logoUpload = await this.fileUploadService.uploadImage(
        files.logo[0],
        this.fileUploadService.getBrandFolder(tenantId),
        'brand-logo',
      );
      uploadedPublicIds.push(logoUpload.publicId);
    }

    let processedFormData: { data: any; uploadedPublicIds: string[] };
    try {
      processedFormData = await this.processFormData(
        updateTenantBrandDto,
        files,
        tenantId,
      );
    } catch (error) {
      await this.fileUploadService.deleteImages(uploadedPublicIds);
      throw error;
    }
    const processedData = processedFormData.data;
    uploadedPublicIds.push(...processedFormData.uploadedPublicIds);

    const updateData: any = {};

    if (updateTenantBrandDto.domain !== undefined) {
      updateData.domain = updateTenantBrandDto.domain;
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
    if (logoUpload) {
      updateData.logoUrl = logoUpload.optimizedUrl;
      updateData.logoPublicId = logoUpload.publicId;
    }

    try {
      const updatedBrand = await this.databaseService.$transaction(
        async (tx) => {
          if (updateTenantBrandDto.domain !== undefined) {
            await (tx as any).tenant.update({
              where: { id: tenantId },
              data: { domain: updateTenantBrandDto.domain },
            });
          }

          return (tx as any).tenantBrand.update({
            where: { tenantId },
            data: updateData,
          });
        },
      );

      await this.fileUploadService.deleteImages(
        this.collectReplacedBrandPublicIds(existingBrand, files, logoUpload),
      );

      const populatedBrand = await this.populateCategoryData(
        updatedBrand,
        tenantId,
      );

      return {
        message: 'Brand settings updated successfully',
        data: populatedBrand,
      };
    } catch (error) {
      await this.fileUploadService.deleteImages(uploadedPublicIds);
      throw error;
    }
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

    const updatedBrand = await this.databaseService.tenantBrand.update({
      where: { tenantId },
      data: { logoUrl: null, logoPublicId: null } as any,
    });

    await this.fileUploadService.deleteImage(
      (existingBrand as any).logoPublicId,
    );

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

    const publicIds = this.collectBrandPublicIds(existingBrand);

    await this.databaseService.tenantBrand.delete({
      where: { tenantId },
    });

    await this.fileUploadService.deleteImages(publicIds);

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
