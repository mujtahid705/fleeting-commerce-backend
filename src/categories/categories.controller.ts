import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
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
  @UseGuards(JwtGuard)
  findAllCategories(@Req() req: any) {
    return this.categoriesService.findAll(req);
  }

  // Create category
  @Post('create')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  createCategory(
    @Body() createCategoryDto: CreateCategoryDto,
    @Req() req: any,
  ) {
    return this.categoriesService.create(createCategoryDto, req.user.tenantId);
  }

  // Update category
  @Patch('update/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: CreateCategoryDto,
    @Req() req: any,
  ) {
    return this.categoriesService.update(
      parseInt(id, 10),
      updateCategoryDto,
      req,
    );
  }

  // Delete category
  @Delete('delete/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  deleteCategory(@Param('id') id: string, @Req() req: any) {
    return this.categoriesService.delete(parseInt(id, 10), req);
  }
}
