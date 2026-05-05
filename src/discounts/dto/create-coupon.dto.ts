import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value).trim().toUpperCase())
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT'])
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number(value))
  value: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  minOrderAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  maxDiscountAmount?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  usageLimit?: number;

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
