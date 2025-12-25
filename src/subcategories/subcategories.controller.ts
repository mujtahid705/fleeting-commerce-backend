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
  Req,
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
  findAll(@Query('categoryId') categoryId?: string, @Req() req?: any) {
    const cid = categoryId ? parseInt(categoryId, 10) : undefined;
    return this.subcategoriesService.findAll(cid, req);
  }

  // Create subcategory
  @Post('create')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  @UsePipes(new ValidationPipe({ transform: true }))
  create(@Body() dto: CreateSubCategoryDto, @Req() req: any) {
    return this.subcategoriesService.create(dto, req);
  }

  // Update subcategory
  @Patch('update/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  @UsePipes(new ValidationPipe({ transform: true }))
  update(
    @Param('id') id: string,
    @Body() dto: CreateSubCategoryDto,
    @Req() req: any,
  ) {
    return this.subcategoriesService.update(parseInt(id, 10), dto, req);
  }

  // Delete subcategory
  @Delete('delete/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.subcategoriesService.delete(parseInt(id, 10), req);
  }
}
