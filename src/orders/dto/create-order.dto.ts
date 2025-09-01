import { IsNumber, ValidateNested } from 'class-validator';
import { OrderItemsDto } from './order-items.dto';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @IsNumber()
  totalAmount: number;

  @ValidateNested({ each: true })
  @Type(() => OrderItemsDto)
  order_items: OrderItemsDto[];
}
