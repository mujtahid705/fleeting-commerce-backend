import {
  IsEmail,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';

export class BaseUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  @IsPhoneNumber()
  phone: string;
}

export class CreateCustomerDto extends BaseUserDto {
  // Customer is always assigned to a tenant
  @IsString()
  @IsNotEmpty()
  tenantId: string;
}

export class CreateTenantAdminDto extends BaseUserDto {
  // Tenant admin must be assigned to a tenant
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  role?: 'TENANT_ADMIN';
}

export class CreateTenantAdminWithTenantDto extends BaseUserDto {
  // Tenant admin must be assigned to a tenant
  @IsString()
  @IsNotEmpty()
  tenantName: string;

  role?: 'TENANT_ADMIN';
}

export class CreateSuperAdminDto extends BaseUserDto {
  // Super admin has no tenant
  role?: 'SUPER_ADMIN';
}
