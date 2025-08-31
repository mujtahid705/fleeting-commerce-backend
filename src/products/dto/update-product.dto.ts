import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  title?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  price?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  stock?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  categoryId?: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value) : null))
  subCategoryId?: number;

  @IsString()
  @IsOptional()
  brand?: string;
}
