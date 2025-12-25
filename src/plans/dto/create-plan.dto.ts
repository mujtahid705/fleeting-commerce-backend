import {
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsOptional,
  Min,
} from 'class-validator';

export enum BillingInterval {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(BillingInterval)
  interval: BillingInterval;

  @IsNumber()
  @IsOptional()
  @Min(0)
  trialDays?: number;

  @IsNumber()
  @Min(1)
  maxProducts: number;

  @IsNumber()
  @Min(1)
  maxCategories: number;

  @IsNumber()
  @Min(1)
  maxSubcategoriesPerCategory: number;

  @IsNumber()
  @Min(0)
  maxOrders: number;

  @IsBoolean()
  @IsOptional()
  customDomain?: boolean;
}
