import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { FileUploadService } from 'src/common/services/file-upload.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  // Get all products
  @Get('all')
  findAllProducts(
    @Query('category') categoryId: number,
    @Query('subCategory') subCategoryId: number,
  ) {
    return this.productsService.findAll(categoryId, subCategoryId);
  }

  // Get single product by id
  @Get(':id')
  findOneProduct(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.productsService.findOne(id);
  }

  // Create new product
  @Post('create')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin', 'superAdmin')
  @UseInterceptors(FilesInterceptor('images', 5))
  @UsePipes(new ValidationPipe({ transform: true }))
  createProduct(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() images: any[],
    @Req() req: any,
  ) {
    return this.productsService.create(createProductDto, images, req);
  }

  // Update Product
  @Patch(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin', 'superAdmin')
  @UseInterceptors(FilesInterceptor('images', 5))
  updateProduct(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles() images: any[],
    @Req() req: any,
  ) {
    return this.productsService.update(id, updateProductDto, images, req);
  }

  // Delete Product
  @Delete(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin', 'superAdmin')
  deleteProduct(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.productsService.delete(id);
  }
}
