import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { LimitCheckerService } from 'src/common/services/limit-checker.service';
import { CreateSubCategoryDto } from './dto/create-subcategory.dto';

@Injectable()
export class SubcategoriesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly limitChecker: LimitCheckerService,
  ) {}

  // Get all subcategories (optionally filter by categoryId)
  async findAll(categoryId?: number, req?: any) {
    const subcategories = await this.databaseService.subCategory.findMany({
      where: {
        ...(categoryId && { categoryId }),
        category: { tenantId: req?.user?.tenantId },
      },
      include: {
        category: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const data = subcategories.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      categoryId: item.categoryId,
      category: item.category,
      isActive: item.isActive,
      productsCount: item._count.products,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return { message: 'Subcategories retrieved successfully', data };
  }

  // Create subcategory
  async create(dto: CreateSubCategoryDto, req: any) {
    const { name, categoryId } = dto;

    // Check subscription limit for subcategories per category
    await this.limitChecker.canCreate(
      req.user.tenantId,
      'subcategories',
      categoryId,
    );

    const category = await this.databaseService.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('Parent category not found');

    // Verify category belongs to the user's tenant
    if (category.tenantId !== req.user.tenantId) {
      throw new UnauthorizedException(
        'You cannot create subcategories for another tenant',
      );
    }

    // Check name uniqueness within same category
    const existingSameName = await this.databaseService.subCategory.findFirst({
      where: { name, categoryId },
    });
    if (existingSameName)
      throw new ConflictException(
        'Subcategory already exists for this category',
      );

    const slug = await this.getUniqueSlug(name);
    const created = await this.databaseService.subCategory.create({
      data: { name, categoryId, slug },
      include: { category: true },
    });
    return { message: 'Subcategory created successfully', data: created };
  }

  // Update subcategory
  async update(id: number, dto: CreateSubCategoryDto, req: any) {
    // Check subscription status
    await this.limitChecker.canUpdate(req.user.tenantId);

    const existing = await this.databaseService.subCategory.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!existing) throw new NotFoundException('Subcategory not found');

    // Verify subcategory belongs to the user's tenant
    if (existing.category.tenantId !== req.user.tenantId) {
      throw new UnauthorizedException(
        'You cannot update subcategories for another tenant',
      );
    }

    // Validate category if changed
    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      const category = await this.databaseService.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) throw new NotFoundException('Parent category not found');

      // Verify new category also belongs to the user's tenant
      if (category.tenantId !== req.user.tenantId) {
        throw new UnauthorizedException(
          "You cannot move subcategory to another tenant's category",
        );
      }
    }

    // Enforce uniqueness within category
    const duplicate = await this.databaseService.subCategory.findFirst({
      where: {
        name: dto.name,
        categoryId: dto.categoryId ?? existing.categoryId,
        NOT: { id },
      },
    });
    if (duplicate)
      throw new ConflictException(
        'Subcategory already exists for this category',
      );

    const slug = await this.getUniqueSlug(dto.name);
    const updated = await this.databaseService.subCategory.update({
      where: { id },
      data: {
        name: dto.name,
        categoryId: dto.categoryId ?? existing.categoryId,
        slug,
      },
      include: { category: true },
    });
    return { message: 'Subcategory updated successfully', data: updated };
  }

  // Delete subcategory
  async delete(id: number, req: any) {
    // Check subscription status (deletes allowed even over limit)
    await this.limitChecker.canDelete(req.user.tenantId);

    const existing = await this.databaseService.subCategory.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!existing) throw new NotFoundException('Subcategory not found');

    // Verify subcategory belongs to the user's tenant
    if (existing.category.tenantId !== req.user.tenantId) {
      throw new UnauthorizedException(
        'You cannot delete subcategories for another tenant',
      );
    }

    const deleted = await this.databaseService.subCategory.delete({
      where: { id },
    });
    return { message: 'Subcategory deleted successfully', data: deleted };
  }

  private async getUniqueSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const existing = await this.databaseService.subCategory.findMany({
      where: { slug: { startsWith: baseSlug } },
      select: { slug: true },
    });
    if (existing.length === 0) return baseSlug;
    if (!existing.some((e) => e.slug === baseSlug)) return baseSlug;
    let max = 0;
    for (const { slug } of existing) {
      if (slug.startsWith(baseSlug + '-')) {
        const n = parseInt(slug.slice(baseSlug.length + 1), 10);
        if (!isNaN(n)) max = Math.max(max, n);
      }
    }
    return `${baseSlug}-${max + 1}`;
  }
}
