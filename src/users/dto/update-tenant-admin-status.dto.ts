import { IsBoolean } from 'class-validator';

export class UpdateTenantAdminStatusDto {
  @IsBoolean()
  isActive: boolean;
}
