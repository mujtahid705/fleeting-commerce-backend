import { IsNotEmpty, IsString } from 'class-validator';

export class RegisterTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  domain?: string;
}
