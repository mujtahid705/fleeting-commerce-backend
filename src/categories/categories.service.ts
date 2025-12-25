import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { LimitCheckerService } from 'src/common/services/limit-checker.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly limitChecker: LimitCheckerService,
  ) {}

  // Get all categories
  async findAll(req: any) {
    const categories = await this.databaseService.category.findMany({
      where: { tenantId: req.user?.tenantId },
      include: {
        _count: {
          select: {
            products: true,
            subCategories: true,
          },
        },
      },
    });

    const data = categories.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      tenantId: item.tenantId,
      isActive: item.isActive,
      productsCount: item._count.products,
      subCategoriesCount: item._count.subCategories,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return { message: 'Categories fetched successfully', data };
  }

  // Create category
  async create(createCategoryDto: CreateCategoryDto, tenantId: string) {
    // Check subscription and limits
    await this.limitChecker.canCreate(tenantId, 'categories');

    const existingCategory = await this.databaseService.category.findUnique({
      where: { name: createCategoryDto.name },
    });

    if (existingCategory)
      throw new ConflictException('Category already exists!');

    const slug = await this.getUniqueSlug(createCategoryDto.name);

    const newCategory = await this.databaseService.category.create({
      data: { name: createCategoryDto.name, slug, tenantId },
    });

    return { message: 'Category created successfully!', data: newCategory };
  }

  // Update category
  async update(id: number, updateCategoryDto: CreateCategoryDto, req: any) {
    if (!id || isNaN(id)) {
      throw new NotFoundException('Invalid category ID');
    }

    const category = await this.databaseService.category.findUnique({
      where: { id },
    });

    if (!category) throw new NotFoundException('Category not found');

    if (category.tenantId !== req.user.tenantId) {
      throw new UnauthorizedException('Unauthorized tenant.');
    }

    // Check subscription and limits for update
    await this.limitChecker.canUpdate(req.user.tenantId);

    const slug = await this.getUniqueSlug(updateCategoryDto.name);
    const updatedCategory = await this.databaseService.category.update({
      where: { id },
      data: { name: updateCategoryDto.name, slug },
    });

    return { message: 'Category updated successfully', data: updatedCategory };
  }

  // Delete category
  async delete(id: number, req: any) {
    if (!id || isNaN(id)) {
      throw new NotFoundException('Invalid category ID');
    }

    const category = await this.databaseService.category.findUnique({
      where: { id },
    });

    if (!category) throw new NotFoundException('Category not found');

    if (category.tenantId !== req.user.tenantId) {
      throw new UnauthorizedException('Unauthorized tenant.');
    }

    // Check if delete is allowed
    await this.limitChecker.canDelete(req.user.tenantId);

    const deletedCategory = await this.databaseService.category.delete({
      where: { id },
    });

    return { message: 'Category deleted successfully', data: deletedCategory };
  }

  // Generate unique slug
  private async getUniqueSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if base slug is available
    const existing = await this.databaseService.category.findMany({
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
