import {
  Body,
  Controller,
  Get,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Domain } from 'src/common/decorators/domain.decorator';
import { DiscountsService } from './discounts.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Controller('storefront/discounts')
export class StorefrontDiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Get('active-sales')
  getActiveSales(@Domain() domain: string) {
    return this.discountsService.getActiveSalesForStorefront(domain);
  }

  @Post('coupons/validate')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  validateCoupon(
    @Domain() domain: string,
    @Body() validateCouponDto: ValidateCouponDto,
  ) {
    return this.discountsService.validateCouponForStorefront(
      domain,
      validateCouponDto.code,
      validateCouponDto.order_items,
    );
  }
}
