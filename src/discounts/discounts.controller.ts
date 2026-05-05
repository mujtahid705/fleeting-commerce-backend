import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CreateSaleDiscountDto } from './dto/create-sale-discount.dto';
import { UpdateSaleDiscountDto } from './dto/update-sale-discount.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Controller('discounts')
@UseGuards(JwtGuard, RolesGuard)
@Roles('TENANT_ADMIN')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post('sales')
  createSaleDiscount(@Req() req: any, @Body() dto: CreateSaleDiscountDto) {
    return this.discountsService.createSaleDiscount(req.user.tenantId, dto);
  }

  @Get('sales')
  findAllSaleDiscounts(@Req() req: any) {
    return this.discountsService.findAllSaleDiscounts(req.user.tenantId);
  }

  @Get('sales/:id')
  findOneSaleDiscount(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.discountsService.findOneSaleDiscount(req.user.tenantId, id);
  }

  @Patch('sales/:id')
  updateSaleDiscount(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSaleDiscountDto,
  ) {
    return this.discountsService.updateSaleDiscount(
      req.user.tenantId,
      id,
      dto,
    );
  }

  @Delete('sales/:id')
  deleteSaleDiscount(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.discountsService.deleteSaleDiscount(req.user.tenantId, id);
  }

  @Post('coupons')
  createCoupon(@Req() req: any, @Body() dto: CreateCouponDto) {
    return this.discountsService.createCoupon(req.user.tenantId, dto);
  }

  @Get('coupons')
  findAllCoupons(@Req() req: any) {
    return this.discountsService.findAllCoupons(req.user.tenantId);
  }

  @Get('coupons/:id')
  findOneCoupon(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.discountsService.findOneCoupon(req.user.tenantId, id);
  }

  @Patch('coupons/:id')
  updateCoupon(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.discountsService.updateCoupon(req.user.tenantId, id, dto);
  }

  @Delete('coupons/:id')
  deleteCoupon(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.discountsService.deleteCoupon(req.user.tenantId, id);
  }
}
