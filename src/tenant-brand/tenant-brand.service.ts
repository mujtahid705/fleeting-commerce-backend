import {
  BadRequestException,
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

  private readonly smallBrandImageMaxSize = 2 * 1024 * 1024;

  private buildDefaultAboutPage(storeName: string) {
    return {
      isEnabled: true,
      hero: {
        eyebrow: 'Our Story',
        title: `About ${storeName}`,
        highlightText: storeName,
        description: `${storeName} is your trusted partner for quality products and an exceptional shopping experience. We are committed to bringing you the best selection at the best prices.`,
        backgroundImage: null,
      },
      stats: {
        isEnabled: true,
        items: [
          { label: 'Happy Customers', value: '10,000+', icon: 'users' },
          { label: 'Products', value: '500+', icon: 'shopping-bag' },
          { label: 'Years in Business', value: '5+', icon: 'award' },
          { label: 'Countries Served', value: '10+', icon: 'globe' },
        ],
      },
      story: {
        isEnabled: true,
        eyebrow: 'How It Started',
        title: 'Our Story',
        paragraphs: [
          `${storeName} was born from a simple idea: to make quality products accessible to everyone, everywhere.`,
          'We started small, driven by a passion for great products and even better customer service. Over the years, we have grown into a store that thousands of customers trust every day.',
          'Today, we are proud to serve customers across the country and beyond, and we are just getting started.',
        ],
        featuredCard: {
          title: 'Quality First',
          description:
            'Every product in our store is carefully reviewed before it reaches your hands.',
          icon: 'shopping-bag',
        },
        image: null,
      },
      values: {
        isEnabled: true,
        eyebrow: 'What We Believe',
        title: 'Our Values',
        description: 'These core values guide every decision we make.',
        items: [
          {
            title: 'Customer First',
            description:
              'We put our customers at the heart of everything we do. Your satisfaction is our success.',
            icon: 'heart',
          },
          {
            title: 'Quality Always',
            description:
              'We never compromise on quality. Every product is held to the highest standard.',
            icon: 'award',
          },
          {
            title: 'Fast & Reliable',
            description:
              'Quick dispatch, reliable delivery, and hassle-free returns - every single time.',
            icon: 'truck',
          },
          {
            title: 'Trust & Transparency',
            description: 'Honest pricing, clear policies, and no hidden surprises.',
            icon: 'shield',
          },
        ],
      },
      milestones: {
        isEnabled: true,
        eyebrow: 'Our Journey',
        title: 'Key Milestones',
        description: 'From humble beginnings to serving thousands of customers.',
        items: [
          {
            year: '2020',
            title: 'Store Founded',
            description: `${storeName} launched with a small catalog and a big vision.`,
          },
          {
            year: '2021',
            title: 'First 1,000 Orders',
            description:
              'We hit our first major milestone and knew we were onto something special.',
          },
          {
            year: '2022',
            title: 'Expanded Catalog',
            description:
              'Grew our product range to over 200 items across multiple categories.',
          },
          {
            year: '2023',
            title: '10,000 Happy Customers',
            description:
              'A proud moment - 10,000 customers who trust us with their orders.',
          },
        ],
      },
      team: {
        isEnabled: false,
        eyebrow: 'The People',
        title: 'Meet Our Team',
        description: 'The passionate people behind the store.',
        members: [
          {
            name: 'Jane Doe',
            role: 'Founder & CEO',
            description:
              'Passionate about bringing quality products to customers everywhere.',
            image: null,
          },
          {
            name: 'John Smith',
            role: 'Head of Operations',
            description: 'Keeps everything running smoothly behind the scenes.',
            image: null,
          },
        ],
      },
      mission: {
        isEnabled: true,
        title: 'Our Mission',
        description: `To make quality products easy to discover, easy to buy, and backed by service you can count on. At ${storeName}, we believe every customer deserves a great shopping experience.`,
        icon: 'target',
      },
      seo: {
        title: `About ${storeName}`,
        description: `Learn more about ${storeName} - our story, values, team, and mission.`,
      },
    };
  }

  private buildDefaultContactPage(storeName: string) {
    return {
      isEnabled: true,
      hero: {
        eyebrow: 'Get In Touch',
        title: `Contact ${storeName}`,
        description:
          'Have a question about an order, a product, or just want to say hello? We are here and happy to help.',
      },
      contactInfo: {
        isEnabled: true,
        items: [
          {
            type: 'email',
            title: 'Email Us',
            description: 'We usually reply within one business day.',
            details: 'support@example.com',
            actionUrl: 'mailto:support@example.com',
            icon: 'mail',
          },
          {
            type: 'phone',
            title: 'Call Us',
            description: 'Monday to Friday, 9am - 6pm',
            details: '+880 1700-000000',
            actionUrl: 'tel:+8801700000000',
            icon: 'phone',
          },
          {
            type: 'hours',
            title: 'Business Hours',
            description: null,
            details:
              'Monday - Friday: 9am - 6pm\nSaturday: 10am - 4pm\nSunday: Closed',
            actionUrl: null,
            icon: 'clock',
          },
        ],
      },
      form: {
        isEnabled: true,
        title: 'Send Us a Message',
        description:
          'Fill out the form below and we will get back to you as soon as possible.',
        submitButtonText: 'Send Message',
        successMessage:
          'Thank you for reaching out! We have received your message and will get back to you within one business day.',
        recipientEmail: '',
        fields: {
          name: {
            isEnabled: true,
            isRequired: true,
            label: 'Full Name',
            placeholder: 'Your full name',
          },
          email: {
            isEnabled: true,
            isRequired: true,
            label: 'Email Address',
            placeholder: 'your.email@example.com',
          },
          subject: {
            isEnabled: true,
            isRequired: true,
            label: 'Subject',
            placeholder: 'What is this about?',
          },
          message: {
            isEnabled: true,
            isRequired: true,
            label: 'Message',
            placeholder: 'Tell us more about your inquiry...',
          },
        },
      },
      supportOptions: {
        isEnabled: true,
        title: 'Other Ways to Reach Us',
        items: [
          {
            title: 'Live Chat',
            description: 'Chat with our support team in real time.',
            isAvailable: false,
            actionUrl: null,
            icon: 'message-circle',
          },
          {
            title: 'Help Center',
            description: 'Browse our FAQs and support articles.',
            isAvailable: true,
            actionUrl: null,
            icon: 'help-circle',
          },
          {
            title: 'WhatsApp',
            description: 'Message us on WhatsApp for quick replies.',
            isAvailable: false,
            actionUrl: null,
            icon: 'headphones',
          },
        ],
      },
      socialLinks: {
        isEnabled: true,
        title: 'Follow Us',
        items: [
          { platform: 'facebook', label: 'Facebook', url: 'https://facebook.com' },
          {
            platform: 'instagram',
            label: 'Instagram',
            url: 'https://instagram.com',
          },
        ],
      },
      faq: {
        isEnabled: true,
        eyebrow: 'Common Questions',
        title: 'Frequently Asked Questions',
        description: 'Quick answers to our most common questions.',
        items: [
          {
            question: 'How long does delivery take?',
            answer:
              'Standard delivery takes 3-5 business days. Express delivery is available at checkout for 1-2 business days.',
          },
          {
            question: 'How do I track my order?',
            answer:
              'Once your order is dispatched, you will receive an email with a tracking link. You can also check order status from your account dashboard.',
          },
          {
            question: 'What is your return policy?',
            answer:
              'We accept returns within 7 days of delivery for unused items in original packaging. Contact us to initiate a return.',
          },
          {
            question: 'Do you offer international shipping?',
            answer:
              'Currently we ship within the country. International shipping is coming soon - stay tuned!',
          },
          {
            question: 'How do I cancel or change an order?',
            answer:
              'Orders can be cancelled or modified within 2 hours of placing them. Contact us immediately via email or phone.',
          },
        ],
      },
      location: {
        isEnabled: false,
        title: 'Find Us',
        description: 'Visit our office or warehouse.',
        addressLabel: 'Our Location',
        address: '123 Commerce Street, Dhaka, Bangladesh',
        mapEmbedUrl: null,
        directionsUrl: 'https://maps.google.com/?q=Dhaka+Bangladesh',
        buttonText: 'Get Directions',
      },
      seo: {
        title: `Contact ${storeName}`,
        description: `Contact ${storeName} for support, order questions, returns, and general inquiries.`,
      },
    };
  }

  private withDefaultPageData(brand: any, storeName?: string) {
    const tenantName =
      storeName || brand?.tenant?.name || brand?.tenantName || 'Your Store';

    return {
      ...brand,
      aboutPage: brand?.aboutPage ?? this.buildDefaultAboutPage(tenantName),
      contactPage:
        brand?.contactPage ?? this.buildDefaultContactPage(tenantName),
    };
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
      const tenant = await this.databaseService.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      });

      // Return default brand settings if none exist
      return {
        message: 'No brand settings found',
        data: this.withDefaultPageData(
          {
            tenantId,
            logoUrl: null,
            tagline: null,
            description: null,
            theme: 1,
          },
          tenant?.name,
        ),
      };
    }

    const populatedBrand = await this.populateCategoryData(brand, tenantId);

    return {
      message: 'Brand settings retrieved successfully',
      data: this.withDefaultPageData(populatedBrand),
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
        data: this.withDefaultPageData(
          {
            tenantId,
            tenantName: tenant.name,
            logoUrl: null,
            tagline: null,
            description: null,
            theme: 1,
          },
          tenant.name,
        ),
      };
    }

    const populatedBrand = await this.populateCategoryData(brand, tenantId);

    return {
      message: 'Brand settings retrieved successfully',
      data: this.withDefaultPageData(populatedBrand, tenant.name),
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
        data: this.withDefaultPageData(
          {
            tenantId: tenant.id,
            tenantName: tenant.name,
            domain: tenant.domain,
            logoUrl: null,
            tagline: null,
            description: null,
            theme: 1,
          },
          tenant.name,
        ),
      };
    }

    const populatedBrand = await this.populateCategoryData(brand, tenant.id);

    return {
      message: 'Brand settings retrieved successfully',
      data: this.withDefaultPageData(
        {
          ...populatedBrand,
          tenantName: tenant.name,
          domain: tenant.domain,
        },
        tenant.name,
      ),
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

    if (dto.aboutPage !== undefined) {
      try {
        result.aboutPage = JSON.parse(dto.aboutPage);
      } catch {
        throw new BadRequestException('Invalid aboutPage JSON');
      }
    }

    if (dto.contactPage !== undefined) {
      try {
        result.contactPage = JSON.parse(dto.contactPage);
      } catch {
        throw new BadRequestException('Invalid contactPage JSON');
      }
    }

    return result;
  }

  private isPlainObject(value: any): value is Record<string, any> {
    return (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    );
  }

  private deepMergeJson(base: any, incoming: any): any {
    if (incoming === undefined) return base;
    if (!this.isPlainObject(base) || !this.isPlainObject(incoming)) {
      return incoming;
    }

    const merged = { ...base };
    for (const [key, value] of Object.entries(incoming)) {
      merged[key] = this.deepMergeJson(merged[key], value);
    }
    return merged;
  }

  private assertMaxFileSize(file: any, fieldName: string, maxSize: number) {
    if (file?.size > maxSize) {
      throw new BadRequestException(
        `${fieldName} file size must be ${maxSize / (1024 * 1024)}MB or less`,
      );
    }
  }

  private assertSmallBrandFiles(files: any) {
    for (const file of files?.logo ?? []) {
      this.assertMaxFileSize(file, 'logo', this.smallBrandImageMaxSize);
    }
    for (const file of files?.exclusiveImages ?? []) {
      this.assertMaxFileSize(
        file,
        'exclusiveImages',
        this.smallBrandImageMaxSize,
      );
    }
    for (const file of files?.aboutTeamImages ?? []) {
      this.assertMaxFileSize(
        file,
        'aboutTeamImages',
        this.smallBrandImageMaxSize,
      );
    }
  }

  private hasAboutPageUploads(files: any) {
    return Boolean(
      files?.aboutHeroImage?.[0] ||
        files?.aboutStoryImage?.[0] ||
        files?.aboutTeamImages?.length,
    );
  }

  private hasContactPageUploads(files: any) {
    return Boolean(files?.contactMapImage?.[0]);
  }

  private normalizeTheme(theme: unknown) {
    const parsedTheme =
      typeof theme === 'number' ? theme : Number.parseInt(String(theme), 10);

    return Number.isInteger(parsedTheme) && parsedTheme >= 1 && parsedTheme <= 100
      ? parsedTheme
      : undefined;
  }

  /**
   * Process uploaded files and JSON data from form-data
   */
  private async processFormData(
    dto: any,
    files: any,
    tenantId: string,
    existingBrand?: any,
  ): Promise<{ data: any; uploadedPublicIds: string[] }> {
    const result = this.parseFormData(dto);
    const uploadedPublicIds: string[] = [];
    const brandFolder = this.fileUploadService.getBrandFolder(tenantId);

    try {
      if (files) {
        this.assertSmallBrandFiles(files);

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

        if (this.hasAboutPageUploads(files)) {
          result.aboutPage = this.deepMergeJson(
            existingBrand?.aboutPage ?? {},
            result.aboutPage ?? {},
          );
        }

        if (files.aboutHeroImage?.[0]) {
          result.aboutPage.hero = result.aboutPage.hero ?? {};
          const aboutHeroImage = await this.fileUploadService.uploadImage(
            files.aboutHeroImage[0],
            brandFolder,
            'brand-about-hero',
          );
          uploadedPublicIds.push(aboutHeroImage.publicId);
          result.aboutPage.hero.backgroundImage = aboutHeroImage.optimizedUrl;
          result.aboutPage.hero.backgroundImagePublicId =
            aboutHeroImage.publicId;
        }

        if (files.aboutStoryImage?.[0]) {
          result.aboutPage.story = result.aboutPage.story ?? {};
          const aboutStoryImage = await this.fileUploadService.uploadImage(
            files.aboutStoryImage[0],
            brandFolder,
            'brand-about-story',
          );
          uploadedPublicIds.push(aboutStoryImage.publicId);
          result.aboutPage.story.image = aboutStoryImage.optimizedUrl;
          result.aboutPage.story.imagePublicId = aboutStoryImage.publicId;
        }

        if (files.aboutTeamImages?.length) {
          result.aboutPage.team = result.aboutPage.team ?? {};
          result.aboutPage.team.members = Array.isArray(
            result.aboutPage.team.members,
          )
            ? result.aboutPage.team.members
            : [];

          result.aboutPage.team.members = await Promise.all(
            result.aboutPage.team.members.map(
              async (member: any, index: number) => {
                if (!files.aboutTeamImages[index]) return member;

                const aboutTeamImage =
                  await this.fileUploadService.uploadImage(
                    files.aboutTeamImages[index],
                    brandFolder,
                    'brand-about-team',
                  );
                uploadedPublicIds.push(aboutTeamImage.publicId);

                return {
                  ...member,
                  image: aboutTeamImage.optimizedUrl,
                  imagePublicId: aboutTeamImage.publicId,
                };
              },
            ),
          );
        }

        if (this.hasContactPageUploads(files)) {
          result.contactPage = this.deepMergeJson(
            existingBrand?.contactPage ?? {},
            result.contactPage ?? {},
          );
        }

        if (files.contactMapImage?.[0]) {
          result.contactPage.location = result.contactPage.location ?? {};
          const contactMapImage = await this.fileUploadService.uploadImage(
            files.contactMapImage[0],
            brandFolder,
            'brand-contact-map',
          );
          uploadedPublicIds.push(contactMapImage.publicId);
          result.contactPage.location.mapImage = contactMapImage.optimizedUrl;
          result.contactPage.location.mapImagePublicId =
            contactMapImage.publicId;
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

    if (brand?.aboutPage?.hero?.backgroundImagePublicId) {
      publicIds.push(brand.aboutPage.hero.backgroundImagePublicId);
    }

    if (brand?.aboutPage?.story?.imagePublicId) {
      publicIds.push(brand.aboutPage.story.imagePublicId);
    }

    if (Array.isArray(brand?.aboutPage?.team?.members)) {
      for (const member of brand.aboutPage.team.members) {
        if (member?.imagePublicId) {
          publicIds.push(member.imagePublicId);
        }
      }
    }

    if (brand?.contactPage?.location?.mapImagePublicId) {
      publicIds.push(brand.contactPage.location.mapImagePublicId);
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

    if (
      files?.aboutHeroImage?.[0] &&
      existingBrand?.aboutPage?.hero?.backgroundImagePublicId
    ) {
      publicIds.push(existingBrand.aboutPage.hero.backgroundImagePublicId);
    }

    if (
      files?.aboutStoryImage?.[0] &&
      existingBrand?.aboutPage?.story?.imagePublicId
    ) {
      publicIds.push(existingBrand.aboutPage.story.imagePublicId);
    }

    if (
      files?.aboutTeamImages?.length &&
      Array.isArray(existingBrand?.aboutPage?.team?.members)
    ) {
      for (let index = 0; index < files.aboutTeamImages.length; index += 1) {
        const publicId = existingBrand.aboutPage.team.members[index]?.imagePublicId;
        if (publicId) publicIds.push(publicId);
      }
    }

    if (
      files?.contactMapImage?.[0] &&
      existingBrand?.contactPage?.location?.mapImagePublicId
    ) {
      publicIds.push(existingBrand.contactPage.location.mapImagePublicId);
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

    this.assertSmallBrandFiles(files);

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
        existingBrand,
      );
    } catch (error) {
      await this.fileUploadService.deleteImages(uploadedPublicIds);
      throw error;
    }
    const processedData = processedFormData.data;
    uploadedPublicIds.push(...processedFormData.uploadedPublicIds);
    const theme = this.normalizeTheme(createTenantBrandDto.theme);
    const aboutPage =
      processedData.aboutPage !== undefined
        ? this.deepMergeJson(existingBrand?.aboutPage, processedData.aboutPage)
        : undefined;
    const contactPage =
      processedData.contactPage !== undefined
        ? this.deepMergeJson(
            existingBrand?.contactPage,
            processedData.contactPage,
          )
        : undefined;

    const brandData = {
      domain: createTenantBrandDto.domain,
      tagline: createTenantBrandDto.tagline,
      description: createTenantBrandDto.description,
      theme: theme ?? existingBrand?.theme ?? 1,
      hero: processedData.hero,
      browseCategories: processedData.browseCategories,
      exclusiveSection: processedData.exclusiveSection,
      featuredCategories: processedData.featuredCategories,
      footer: processedData.footer,
      aboutPage,
      contactPage,
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
        data: this.withDefaultPageData(populatedBrand),
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

    this.assertSmallBrandFiles(files);

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
        existingBrand,
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
    const theme = this.normalizeTheme(updateTenantBrandDto.theme);
    if (theme !== undefined) {
      updateData.theme = theme;
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
    if (processedData.aboutPage !== undefined) {
      updateData.aboutPage = this.deepMergeJson(
        existingBrand.aboutPage,
        processedData.aboutPage,
      );
    }
    if (processedData.contactPage !== undefined) {
      updateData.contactPage = this.deepMergeJson(
        existingBrand.contactPage,
        processedData.contactPage,
      );
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
        data: this.withDefaultPageData(populatedBrand),
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
