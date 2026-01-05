import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class TenantsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private getDefaultCustomization(
    domain: string,
    tenantName: string,
    categories: any[],
  ) {
    const firstCategory = categories[0] || null;
    return {
      hero: {
        title: 'Elevate Your Style',
        subtitle: 'Discover curated collections designed for the modern you.',
        ctaText: 'Shop Now',
        ctaLink: '/products',
        backgroundImage:
          'https://images.pexels.com/photos/5709661/pexels-photo-5709661.jpeg',
      },
      browseCategories: {
        title: 'Browse Categories',
        categories: firstCategory
          ? [
              {
                categoryId: firstCategory.id,
                displayOrder: 1,
                category: {
                  id: firstCategory.id,
                  name: firstCategory.name,
                  slug: firstCategory.slug,
                },
              },
            ]
          : [],
      },
      exclusiveSection: {
        title: 'Exclusive Collection',
        products: [],
      },
      featuredCategories: {
        title: 'Featured Categories',
        categories: firstCategory
          ? [
              {
                categoryId: firstCategory.id,
                displayOrder: 1,
                category: {
                  id: firstCategory.id,
                  name: firstCategory.name,
                  slug: firstCategory.slug,
                },
              },
            ]
          : [],
      },
      footer: {
        companyName: tenantName,
        email: `support@${domain}`,
        phone: '',
        copyrightText: `© ${new Date().getFullYear()} ${tenantName}. All rights reserved.`,
      },
    };
  }

  /**
   * Populate category data for browseCategories and featuredCategories
   */
  private populateCategoryData(section: any, categories: any[]) {
    if (!section) return section;

    // Handle new structure: { title, categories: [{categoryId, displayOrder}] }
    if (
      typeof section === 'object' &&
      section.categories &&
      Array.isArray(section.categories)
    ) {
      return {
        ...section,
        categories: section.categories.map((item: any) => {
          const category = categories.find((cat) => cat.id === item.categoryId);
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
    }

    // Handle legacy structure: array of category IDs
    if (Array.isArray(section)) {
      return {
        title: '',
        categories: categories
          .filter((cat) => section.includes(cat.id))
          .map((cat, index) => ({
            categoryId: cat.id,
            displayOrder: index + 1,
            category: {
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
            },
          })),
      };
    }

    return section;
  }

  async registerTenant(registerTenantDto: { name: string; domain?: string }) {
    const newTenant = await this.databaseService.tenant.create({
      data: {
        name: registerTenantDto.name,
        domain: registerTenantDto.domain,
      },
    });

    return { message: 'Tenant registered successfully!', data: newTenant };
  }

  async getTenantByDomain(domain: string) {
    const tenant = await this.databaseService.tenant.findUnique({
      where: { domain },
      include: {
        brand: {
          select: {
            id: true,
            logoUrl: true,
            tagline: true,
            description: true,
            theme: true,
            hero: true,
            browseCategories: true,
            exclusiveSection: true,
            featuredCategories: true,
            footer: true,
          },
        },
        categories: {
          where: { isActive: true },
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
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found for this domain');
    }

    if (!tenant.isActive) {
      throw new NotFoundException('This store is currently unavailable');
    }

    const defaultCustomization = this.getDefaultCustomization(
      domain,
      tenant.name,
      tenant.categories,
    );

    // Build brand data with populated category information
    const brand = tenant.brand
      ? {
          id: tenant.brand.id,
          logoUrl: tenant.brand.logoUrl,
          tagline: tenant.brand.tagline,
          description: tenant.brand.description,
          theme: tenant.brand.theme,
          hero: tenant.brand.hero || defaultCustomization.hero,
          browseCategories: this.populateCategoryData(
            tenant.brand.browseCategories ||
              defaultCustomization.browseCategories,
            tenant.categories,
          ),
          exclusiveSection:
            tenant.brand.exclusiveSection ||
            defaultCustomization.exclusiveSection,
          featuredCategories: this.populateCategoryData(
            tenant.brand.featuredCategories ||
              defaultCustomization.featuredCategories,
            tenant.categories,
          ),
          footer: tenant.brand.footer || defaultCustomization.footer,
        }
      : {
          logoUrl: null,
          tagline: null,
          description: null,
          theme: 1,
          hero: defaultCustomization.hero,
          browseCategories: defaultCustomization.browseCategories,
          exclusiveSection: defaultCustomization.exclusiveSection,
          featuredCategories: defaultCustomization.featuredCategories,
          footer: defaultCustomization.footer,
        };

    return {
      message: 'Tenant details retrieved successfully',
      data: {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        brand,
        categories: tenant.categories,
      },
    };
  }
}
