import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

const toOptionalInt = ({ value, obj }: { value: unknown; obj?: any }) => {
  const rawValue = obj?.theme ?? value;

  if (
    rawValue === undefined ||
    rawValue === null ||
    rawValue === '' ||
    rawValue === 'undefined' ||
    rawValue === 'null'
  ) {
    return undefined;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
};

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
  @Transform(toOptionalInt)
  @ValidateIf((_, value) => Number.isFinite(value))
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

  @IsOptional()
  @IsString()
  aboutPage?: string;

  @IsOptional()
  @IsString()
  contactPage?: string;
}
