import { IsArray, ValidateNested } from 'class-validator';
import { OrderItemsDto } from './order-items.dto';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemsDto)
  order_items: OrderItemsDto[];
}
