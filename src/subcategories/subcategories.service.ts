import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateSubCategoryDto } from './dto/create-subcategory.dto';

@Injectable()
export class SubcategoriesService {
  constructor(private readonly databaseService: DatabaseService) {}

  // Get all subcategories (optionally filter by categoryId)
  async findAll(categoryId?: number) {
    return this.databaseService.subCategory.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: { category: true },
      orderBy: { id: 'asc' },
    });
  }

  // Create subcategory
  async create(dto: CreateSubCategoryDto) {
    const { name, categoryId } = dto;

    const category = await this.databaseService.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('Parent category not found');

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
  async update(id: number, dto: CreateSubCategoryDto) {
    const existing = await this.databaseService.subCategory.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Subcategory not found');

    // Validate category if changed
    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      const category = await this.databaseService.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) throw new NotFoundException('Parent category not found');
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
  async delete(id: number) {
    const existing = await this.databaseService.subCategory.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Subcategory not found');
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
