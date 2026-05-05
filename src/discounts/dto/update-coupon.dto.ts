import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateCouponDto {
  @IsString()
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : String(value).trim().toUpperCase(),
  )
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT'])
  @IsOptional()
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  value?: number;

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
