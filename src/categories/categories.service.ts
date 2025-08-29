import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly databaseService: DatabaseService) {}

  // Get all categories
  async findAll() {
    return this.databaseService.category.findMany();
  }

  // Create category
  async create(createCategoryDto: CreateCategoryDto) {
    const existingCategory = await this.databaseService.category.findUnique({
      where: { name: createCategoryDto.name },
    });

    if (existingCategory)
      throw new ConflictException('Category already exists!');

    const slug = await this.getUniqueSlug(createCategoryDto.name);

    const newCategory = this.databaseService.category.create({
      data: { name: createCategoryDto.name, slug },
    });

    return { message: 'Category created successfully!', data: newCategory };
  }

  // Update category
  async update(id: number, updateCategoryDto: CreateCategoryDto) {
    const category = await this.databaseService.category.findUnique({
      where: { id },
    });

    if (!category) throw new NotFoundException('Category not found');

    const slug = await this.getUniqueSlug(updateCategoryDto.name);
    const updatedCategory = await this.databaseService.category.update({
      where: { id },
      data: { name: updateCategoryDto.name, slug },
    });

    return { message: 'Category updated successfully', data: updatedCategory };
  }

  // Delete category
  async delete(id: number) {
    const category = await this.databaseService.category.findUnique({
      where: { id },
    });

    if (!category) throw new NotFoundException('Category not found');

    const deletedCategory = await this.databaseService.category.delete({
      where: { id },
    });

    return { message: 'Category deleted successfully', data: deletedCategory };
  }

  // Generate unique slug
  private async getUniqueSlug(name: string) {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let count = 0;
    let slugNew = '';
    while (true) {
      const existingCategory = this.databaseService.category.findUnique({
        where: { slug: baseSlug },
      });

      count += 1;
      if (!existingCategory) {
        slugNew = count === 0 ? baseSlug : `${baseSlug}-${count}`;
        break;
      }
    }
    return slugNew;
  }
}
