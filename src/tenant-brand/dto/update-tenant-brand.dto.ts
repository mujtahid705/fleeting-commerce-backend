import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateTenantBrandDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  domain?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tagline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  theme?: number;

  @IsOptional()
  @IsString()
  hero?: string;

  @IsOptional()
  @IsString()
  browseCategories?: string;

  @IsOptional()
  @IsString()
  exclusiveSection?: string;

  @IsOptional()
  @IsString()
  featuredCategories?: string;

  @IsOptional()
  @IsString()
  footer?: string;
}
