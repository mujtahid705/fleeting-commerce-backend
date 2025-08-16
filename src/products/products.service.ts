import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateProductDto } from './create-product.dto';
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
    const product = await this.databaseService.product.findUnique({
      where: { id: id },
      include: {
        images: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
        category: true,
        subCategory: true,
      },
    });

    if (!product) throw new NotFoundException('Product not found!');

    return { message: 'Product fetched successfully', data: product };
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

    // Generate slug from title
    const slug = this.generateSlug(title);

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
      const imageData = images.map((image, index) => ({
        productId: product.id,
        imageUrl: this.fileUploadService.getImageUrl(image.filename),
        order: index,
      }));

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
}
