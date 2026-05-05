import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSaleDiscountDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT'])
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  value: number;

  @IsIn(['ALL_PRODUCTS', 'SPECIFIC_PRODUCTS'])
  scope: 'ALL_PRODUCTS' | 'SPECIFIC_PRODUCTS';

  @ValidateIf((dto) => dto.scope === 'SPECIFIC_PRODUCTS')
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  productIds?: string[];

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
