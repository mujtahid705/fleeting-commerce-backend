import {
  Body,
  Controller,
  Get,
  Param,
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
import { CreateProductDto } from './create-product.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { FileUploadService } from 'src/common/services/file-upload.service';

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
  findOneProduct(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  // Create new product
  @Post('create')
  @UseGuards(JwtGuard)
  @UseInterceptors(FilesInterceptor('images', 5))
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createProduct(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() images: any[],
    @Req() req: any,
  ) {
    return this.productsService.create(createProductDto, images, req);
  }
}
