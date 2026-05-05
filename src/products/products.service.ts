import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateProductDto } from './dto/create-product.dto';
import {
  FileUploadService,
  UploadedImageFile,
} from 'src/common/services/file-upload.service';
import { LimitCheckerService } from 'src/common/services/limit-checker.service';
import { UpdateProductDto } from './dto/update-product.dto';
import { DiscountsService } from 'src/discounts/discounts.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly fileUploadService: FileUploadService,
    private readonly limitChecker: LimitCheckerService,
    private readonly discountsService: DiscountsService,
  ) {}

  // Find all products
  async findAll(categoryId: number, subCategoryId: number, req: any) {
    const products = await this.databaseService.product.findMany({
      where: {
        ...(categoryId && { categoryId: categoryId }),
        ...(subCategoryId && { subCategoryId: subCategoryId }),
        tenantId: req.user?.tenantId,
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
    const data = await this.discountsService.decorateProductsWithPricing(
      req.user?.tenantId,
      products,
    );

    return {
      message: 'Products fetched successfully',
      categoryId,
      subCategoryId,
      data,
    };
  }

  // Find single product by id
  async findOne(id: string, req: any) {
    try {
      const product = await this.databaseService.product.findUnique({
        where: { id, tenantId: req.user?.tenantId },
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

      const [data] = await this.discountsService.decorateProductsWithPricing(
        req.user?.tenantId,
        [product],
      );

      return { message: 'Product fetched successfully', data };
    } catch (err) {
      // Re-throw NotFound; wrap Prisma-style errors to avoid leaking internals
      if (err instanceof NotFoundException) throw err;
      throw new NotFoundException('Product not found');
    }
  }

  // Create new product
  async create(
    createProductDto: CreateProductDto,
    images: UploadedImageFile[],
    req: any,
  ) {
    const { title, description, price, categoryId, subCategoryId, brand } =
      createProductDto;

    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant not found for user');
    }

    // Check subscription and limits
    await this.limitChecker.canCreate(tenantId, 'products');

    // Validate category
    const category = await this.databaseService.category.findFirst({
      where: { id: categoryId, tenantId },
    });
    if (!category) {
      throw new NotFoundException(
        'Category not found or does not belong to your tenant',
      );
    }

    // Validate subcategory if provided
    if (subCategoryId) {
      const subCategory = await this.databaseService.subCategory.findFirst({
        where: {
          id: subCategoryId,
          categoryId,
          category: { tenantId },
        },
      });
      if (!subCategory) {
        throw new NotFoundException(
          'Subcategory not found or does not belong to the selected category',
        );
      }
    }

    // Generate a unique slug from title
    const baseSlug = this.generateSlug(title);
    const slug = await this.getUniqueSlug(baseSlug);

    const productId = randomUUID();
    const uploadedImages = await this.fileUploadService.uploadImages(
      images,
      this.fileUploadService.getProductFolder(tenantId, productId),
      'product',
    );

    try {
      const createdProduct = await this.databaseService.$transaction(
        async (tx) => {
          await (tx as any).product.create({
            data: {
              id: productId,
              title,
              slug,
              description,
              price,
              categoryId,
              subCategoryId,
              brand,
              tenantId,
            },
          });

          if (uploadedImages.length > 0) {
            await (tx as any).productImage.createMany({
              data: uploadedImages.map((image, index) => ({
                productId,
                imageUrl: image.optimizedUrl,
                cloudinaryPublicId: image.publicId,
                order: index,
              })),
            });
          }

          return (tx as any).product.findUnique({
            where: { id: productId },
            include: {
              images: {
                where: { isActive: true },
                orderBy: { order: 'asc' },
              },
              category: true,
              subCategory: true,
            },
          });
        },
      );

      return {
        message: 'Product created successfully',
        data: createdProduct,
      };
    } catch (error) {
      await this.fileUploadService.deleteImages(
        uploadedImages.map((image) => image.publicId),
      );
      throw error;
    }
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

  // Update Products
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    images: UploadedImageFile[],
    req: any,
  ) {
    const existingProduct = await this.databaseService.product.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!existingProduct) throw new NotFoundException('Product not found');

    if (existingProduct.tenantId !== req.user?.tenantId) {
      throw new UnauthorizedException('Unauthorized tenant.');
    }

    // Check subscription and limits for update
    await this.limitChecker.canUpdate(req.user.tenantId);

    const dataToUpdate: any = { ...updateProductDto };

    // If title is being changed, potentially regenerate slug uniquely
    if (
      updateProductDto.title &&
      updateProductDto.title !== existingProduct.title
    ) {
      const newBase = this.generateSlug(updateProductDto.title);
      dataToUpdate.slug = await this.getUniqueSlug(newBase);
    }

    const uploadedImages = await this.fileUploadService.uploadImages(
      images,
      this.fileUploadService.getProductFolder(existingProduct.tenantId, id),
      'product',
    );

    try {
      const fresh = await this.databaseService.$transaction(async (tx) => {
        await (tx as any).product.update({
          where: { id },
          data: dataToUpdate,
        });

        if (uploadedImages.length > 0) {
          await (tx as any).productImage.updateMany({
            where: { productId: id, isActive: true },
            data: { isActive: false },
          });

          await (tx as any).productImage.createMany({
            data: uploadedImages.map((image, index) => ({
              productId: id,
              imageUrl: image.optimizedUrl,
              cloudinaryPublicId: image.publicId,
              order: index,
            })),
          });
        }

        return (tx as any).product.findUnique({
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
      });

      if (uploadedImages.length > 0) {
        await this.fileUploadService.deleteImages(
          existingProduct.images
            .filter((image) => image.isActive)
            .map((image) => (image as any).cloudinaryPublicId),
        );
      }

      return { message: 'Product updated successfully', data: fresh };
    } catch (error) {
      await this.fileUploadService.deleteImages(
        uploadedImages.map((image) => image.publicId),
      );
      throw error;
    }
  }

  // Delete Product
  async delete(id: string, req: any) {
    const product = await this.databaseService.product.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!product) throw new NotFoundException('Product not found!');

    if (product.tenantId !== req.user?.tenantId) {
      throw new UnauthorizedException('Unauthorized tenant.');
    }

    // Check if delete is allowed
    await this.limitChecker.canDelete(req.user.tenantId);

    const deletedProduct = await this.databaseService.product.delete({
      where: { id },
    });

    await this.fileUploadService.deleteImages(
      product.images.map((image) => (image as any).cloudinaryPublicId),
    );

    return { message: 'Product deleted successfully', data: deletedProduct };
  }
}
