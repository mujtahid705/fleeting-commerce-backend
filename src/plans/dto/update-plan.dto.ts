import { CreatePlanDto } from './create-plan.dto';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  Min,
} from 'class-validator';
import { BillingInterval } from './create-plan.dto';

export class UpdatePlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(BillingInterval)
  @IsOptional()
  interval?: BillingInterval;

  @IsNumber()
  @Min(0)
  @IsOptional()
  trialDays?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxProducts?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxCategories?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxSubcategoriesPerCategory?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxOrders?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
