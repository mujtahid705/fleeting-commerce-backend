import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // Get all categories
  @Get('all')
  findAllCategories() {
    return this.categoriesService.findAll();
  }

  // Create category
  @Post('create')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin', 'superAdmin')
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  // Update category
  @Patch('update/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin', 'superAdmin')
  updateCategory(
    @Param('id') id: number,
    @Body() updateCategoryDto: CreateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  // Delete category
  @Delete('delete/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin', 'superAdmin')
  deleteCategory(@Param('id') id: number) {
    return this.categoriesService.delete(id);
  }
}
