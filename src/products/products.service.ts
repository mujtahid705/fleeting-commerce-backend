import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateProductDto } from './dto/create-product.dto';
import { FileUploadService } from 'src/common/services/file-upload.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  // Find all products
  async findAll(categoryId: number, subCategoryId: number) {
    const products = await this.databaseService.product.findMany({
      where: {
        ...(categoryId && { categoryId: categoryId }),
        ...(subCategoryId && { subCategoryId: subCategoryId }),
      },
      include: {
        images: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
        category: true,
        subCategory: true,
      },
    });
    return {
      message: 'Products fetched successfully',
      categoryId,
      subCategoryId,
      data: products,
    };
  }

  // Find single product by id
  async findOne(id: string) {
    try {
      const product = await this.databaseService.product.findUnique({
        where: { id },
        include: {
          images: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
          },
          category: true,
          subCategory: true,
        },
      });

      if (!product) throw new NotFoundException('Product not found');

      return { message: 'Product fetched successfully', data: product };
    } catch (err) {
      // Re-throw NotFound; wrap Prisma-style errors to avoid leaking internals
      if (err instanceof NotFoundException) throw err;
      throw new NotFoundException('Product not found');
    }
  }

  // Create new product
  async create(createProductDto: CreateProductDto, images: any[], req: any) {
    const {
      title,
      description,
      price,
      stock,
      categoryId,
      subCategoryId,
      brand,
    } = createProductDto;

    // Generate a unique slug from title
    const baseSlug = this.generateSlug(title);
    const slug = await this.getUniqueSlug(baseSlug);

    // Get user ID from request
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Create product
    const product = await this.databaseService.product.create({
      data: {
        title,
        slug,
        description,
        price,
        stock,
        categoryId,
        subCategoryId,
        brand,
        createdBy: userId,
      },
    });

    // Handle images if provided
    if (images && images.length > 0) {
      const imageData = images.map((image, index) => {
        if (!image.filename) {
          console.error(`Image ${index} has no filename:`, image);
          throw new Error(`Image ${index} was not uploaded properly`);
        }

        const imageUrl = this.fileUploadService.getImageUrl(image.filename);

        return {
          productId: product.id,
          imageUrl,
          order: index,
        };
      });

      await this.databaseService.productImage.createMany({
        data: imageData,
      });
    }

    // Return created product with images
    const createdProduct = await this.databaseService.product.findUnique({
      where: { id: product.id },
      include: {
        images: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
        category: true,
        subCategory: true,
      },
    });

    return {
      message: 'Product created successfully',
      data: createdProduct,
    };
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private async getUniqueSlug(baseSlug: string): Promise<string> {
    // Find existing slugs that start with the base slug
    const existing = await this.databaseService.product.findMany({
      where: { slug: { startsWith: baseSlug } },
      select: { slug: true },
    });

    if (existing.length === 0) return baseSlug;

    const exactExists = existing.some((e) => e.slug === baseSlug);
    if (!exactExists) return baseSlug;

    let maxSuffix = 0;
    for (const { slug } of existing) {
      if (slug.startsWith(baseSlug + '-')) {
        const rest = slug.slice(baseSlug.length + 1);
        const n = parseInt(rest, 10);
        if (!isNaN(n)) maxSuffix = Math.max(maxSuffix, n);
      }
    }
    return `${baseSlug}-${maxSuffix + 1}`;
  }
}
