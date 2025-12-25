import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateInventoryQuantityDto {
  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}
