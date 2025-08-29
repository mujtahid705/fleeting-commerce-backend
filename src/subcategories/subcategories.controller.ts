import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { SubcategoriesService } from './subcategories.service';
import { CreateSubCategoryDto } from './dto/create-subcategory.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('subcategories')
export class SubcategoriesController {
  constructor(private readonly subcategoriesService: SubcategoriesService) {}

  // Get all subcategories
  @Get('all')
  findAll(@Query('categoryId') categoryId?: string) {
    const cid = categoryId ? parseInt(categoryId, 10) : undefined;
    return this.subcategoriesService.findAll(cid);
  }

  // Create subcategory
  @Post('create')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin', 'superAdmin')
  @UsePipes(new ValidationPipe({ transform: true }))
  create(@Body() dto: CreateSubCategoryDto) {
    return this.subcategoriesService.create(dto);
  }

  // Update subcategory
  @Patch('update/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin', 'superAdmin')
  @UsePipes(new ValidationPipe({ transform: true }))
  update(@Param('id') id: string, @Body() dto: CreateSubCategoryDto) {
    return this.subcategoriesService.update(parseInt(id, 10), dto);
  }

  // Delete subcategory
  @Delete('delete/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin', 'superAdmin')
  delete(@Param('id') id: string) {
    return this.subcategoriesService.delete(parseInt(id, 10));
  }
}
