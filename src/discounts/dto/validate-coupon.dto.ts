import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItemsDto } from 'src/orders/dto/order-items.dto';

export class ValidateCouponDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemsDto)
  order_items: OrderItemsDto[];
}
