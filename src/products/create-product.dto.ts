import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  price: number;

  @IsNumber()
  stock: number;

  @IsNumber()
  categoryId: number;

  @IsNumber()
  @IsOptional()
  subCategoryId?: number;

  @IsString()
  @IsOptional()
  brand?: string;
}
