import { IsBoolean, IsString, IsUUID } from 'class-validator';

export class UpdateCustomerStatusDto {
  @IsUUID()
  @IsString()
  customerId: string;

  @IsBoolean()
  isActive: boolean;
}
