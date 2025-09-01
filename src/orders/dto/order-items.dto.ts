import { IsNumber, IsString } from 'class-validator';

export class OrderItemsDto {
  @IsString()
  productId: string;
  @IsNumber()
  quantity: number;
  @IsNumber()
  unitPrice: number;
}
