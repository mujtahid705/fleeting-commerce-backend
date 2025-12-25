import { IsNumber, IsString, Min } from 'class-validator';

export class OrderItemsDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}
