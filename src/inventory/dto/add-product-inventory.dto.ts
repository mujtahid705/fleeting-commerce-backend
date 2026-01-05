import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class AddProductToInventoryDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;
}
