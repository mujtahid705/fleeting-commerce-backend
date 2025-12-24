import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  price: number;

  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  categoryId: number;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value) : null))
  subCategoryId?: number;

  @IsString()
  @IsOptional()
  brand?: string;
}
