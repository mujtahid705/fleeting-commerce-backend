import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateSaleDiscountDto } from './dto/create-sale-discount.dto';
import { UpdateSaleDiscountDto } from './dto/update-sale-discount.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
type SaleDiscountScope = 'ALL_PRODUCTS' | 'SPECIFIC_PRODUCTS';

type PricingResult = {
  orderItemsData: {
    productId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
  }[];
  subtotalAmount: number;
  saleDiscountAmount: number;
  couponDiscount: number;
  discountAmount: number;
  totalAmount: number;
  coupon: any | null;
  items: any[];
};

@Injectable()
export class DiscountsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db(): any {
    return this.databaseService as any;
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private normalizeCode(code: string) {
    return code.trim().toUpperCase();
  }

  private toDate(value?: string) {
    return value ? new Date(value) : undefined;
  }

  private validateDiscountValue(discountType: DiscountType, value: number) {
    if (value <= 0) {
      throw new BadRequestException('Discount value must be greater than 0');
    }

    if (discountType === 'PERCENTAGE' && value > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100');
    }
  }

  private validateDateRange(startsAt?: string, endsAt?: string) {
    if (!startsAt || !endsAt) return;

    if (new Date(startsAt).getTime() > new Date(endsAt).getTime()) {
      throw new BadRequestException('startsAt must be before endsAt');
    }
  }

  private getActiveDateWhere(now = new Date()) {
    return [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ];
  }

  private calculateDiscountAmount(
    amount: number,
    discountType: DiscountType,
    value: number,
    maxDiscountAmount?: number | null,
  ) {
    const raw =
      discountType === 'PERCENTAGE' ? (amount * value) / 100 : value;
    const capped =
      maxDiscountAmount !== undefined && maxDiscountAmount !== null
        ? Math.min(raw, maxDiscountAmount)
        : raw;

    return this.roundMoney(Math.min(amount, Math.max(0, capped)));
  }

  private async validateProductsBelongToTenant(
    tenantId: string,
    productIds: string[],
  ) {
    const uniqueProductIds = [...new Set(productIds)];
    if (uniqueProductIds.length === 0) {
      throw new BadRequestException(
        'At least one productId is required for SPECIFIC_PRODUCTS discounts',
      );
    }

    const products = await this.databaseService.product.findMany({
      where: { id: { in: uniqueProductIds }, tenantId },
      select: { id: true },
    });

    if (products.length !== uniqueProductIds.length) {
      throw new NotFoundException(
        'One or more products were not found for this tenant',
      );
    }

    return uniqueProductIds;
  }

  private async findSaleDiscountForTenant(tenantId: string, id: string) {
    const saleDiscount = await this.db.saleDiscount.findFirst({
      where: { id, tenantId },
      include: { products: true },
    });

    if (!saleDiscount) {
      throw new NotFoundException('Sale discount not found');
    }

    return saleDiscount;
  }

  private async findCouponForTenant(tenantId: string, id: string) {
    const coupon = await this.db.coupon.findFirst({
      where: { id, tenantId },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return coupon;
  }

  async createSaleDiscount(tenantId: string, dto: CreateSaleDiscountDto) {
    this.validateDiscountValue(dto.discountType, dto.value);
    this.validateDateRange(dto.startsAt, dto.endsAt);

    let productIds: string[] = [];
    if (dto.scope === 'SPECIFIC_PRODUCTS') {
      productIds = await this.validateProductsBelongToTenant(
        tenantId,
        dto.productIds || [],
      );
    }

    const saleDiscount = await this.db.saleDiscount.create({
      data: {
        tenantId,
        title: dto.title,
        description: dto.description,
        discountType: dto.discountType,
        value: dto.value,
        scope: dto.scope,
        startsAt: this.toDate(dto.startsAt),
        endsAt: this.toDate(dto.endsAt),
        isActive: dto.isActive ?? true,
        products:
          dto.scope === 'SPECIFIC_PRODUCTS'
            ? {
                create: productIds.map((productId) => ({ productId })),
              }
            : undefined,
      },
      include: { products: true },
    });

    return {
      message: 'Sale discount created successfully',
      data: saleDiscount,
    };
  }

  async findAllSaleDiscounts(tenantId: string) {
    const saleDiscounts = await this.db.saleDiscount.findMany({
      where: { tenantId },
      include: { products: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Sale discounts fetched successfully',
      data: saleDiscounts,
    };
  }

  async findOneSaleDiscount(tenantId: string, id: string) {
    const saleDiscount = await this.findSaleDiscountForTenant(tenantId, id);

    return {
      message: 'Sale discount fetched successfully',
      data: saleDiscount,
    };
  }

  async updateSaleDiscount(
    tenantId: string,
    id: string,
    dto: UpdateSaleDiscountDto,
  ) {
    const current = await this.findSaleDiscountForTenant(tenantId, id);
    const discountType = dto.discountType || current.discountType;
    const value = dto.value ?? current.value;
    const scope = (dto.scope || current.scope) as SaleDiscountScope;
    const startsAt = dto.startsAt ?? current.startsAt?.toISOString();
    const endsAt = dto.endsAt ?? current.endsAt?.toISOString();

    this.validateDiscountValue(discountType, value);
    this.validateDateRange(startsAt, endsAt);

    let productIds: string[] | undefined;
    if (scope === 'SPECIFIC_PRODUCTS' && dto.productIds) {
      productIds = await this.validateProductsBelongToTenant(
        tenantId,
        dto.productIds,
      );
    }

    if (scope === 'SPECIFIC_PRODUCTS' && !dto.productIds) {
      const existingProductIds = current.products.map((item) => item.productId);
      if (existingProductIds.length === 0) {
        throw new BadRequestException(
          'productIds are required for SPECIFIC_PRODUCTS sale discounts',
        );
      }
    }

    const updated = await this.db.saleDiscount.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        discountType: dto.discountType,
        value: dto.value,
        scope: dto.scope,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        isActive: dto.isActive,
        products:
          scope === 'ALL_PRODUCTS'
            ? { deleteMany: {} }
            : productIds
              ? {
                  deleteMany: {},
                  create: productIds.map((productId) => ({ productId })),
                }
              : undefined,
      },
      include: { products: true },
    });

    return {
      message: 'Sale discount updated successfully',
      data: updated,
    };
  }

  async deleteSaleDiscount(tenantId: string, id: string) {
    await this.findSaleDiscountForTenant(tenantId, id);
    await this.db.saleDiscount.delete({ where: { id } });

    return { message: 'Sale discount deleted successfully' };
  }

  async createCoupon(tenantId: string, dto: CreateCouponDto) {
    this.validateDiscountValue(dto.discountType, dto.value);
    this.validateDateRange(dto.startsAt, dto.endsAt);

    const code = this.normalizeCode(dto.code);
    const existingCoupon = await this.db.coupon.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });

    if (existingCoupon) {
      throw new ConflictException('Coupon code already exists for this tenant');
    }

    const coupon = await this.db.coupon.create({
      data: {
        tenantId,
        code,
        description: dto.description,
        discountType: dto.discountType,
        value: dto.value,
        minOrderAmount: dto.minOrderAmount,
        maxDiscountAmount: dto.maxDiscountAmount,
        usageLimit: dto.usageLimit,
        startsAt: this.toDate(dto.startsAt),
        endsAt: this.toDate(dto.endsAt),
        isActive: dto.isActive ?? true,
      },
    });

    return {
      message: 'Coupon created successfully',
      data: coupon,
    };
  }

  async findAllCoupons(tenantId: string) {
    const coupons = await this.db.coupon.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Coupons fetched successfully',
      data: coupons,
    };
  }

  async findOneCoupon(tenantId: string, id: string) {
    const coupon = await this.findCouponForTenant(tenantId, id);

    return {
      message: 'Coupon fetched successfully',
      data: coupon,
    };
  }

  async updateCoupon(tenantId: string, id: string, dto: UpdateCouponDto) {
    await this.findCouponForTenant(tenantId, id);

    const existingValues = await this.db.coupon.findFirst({
      where: { id, tenantId },
    });
    const discountType = dto.discountType || existingValues.discountType;
    const value = dto.value ?? existingValues.value;
    const startsAt = dto.startsAt ?? existingValues.startsAt?.toISOString();
    const endsAt = dto.endsAt ?? existingValues.endsAt?.toISOString();

    this.validateDiscountValue(discountType, value);
    this.validateDateRange(startsAt, endsAt);

    const code = dto.code ? this.normalizeCode(dto.code) : undefined;
    if (code && code !== existingValues.code) {
      const duplicate = await this.db.coupon.findUnique({
        where: { tenantId_code: { tenantId, code } },
      });

      if (duplicate) {
        throw new ConflictException(
          'Coupon code already exists for this tenant',
        );
      }
    }

    const coupon = await this.db.coupon.update({
      where: { id },
      data: {
        code,
        description: dto.description,
        discountType: dto.discountType,
        value: dto.value,
        minOrderAmount: dto.minOrderAmount,
        maxDiscountAmount: dto.maxDiscountAmount,
        usageLimit: dto.usageLimit,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        isActive: dto.isActive,
      },
    });

    return {
      message: 'Coupon updated successfully',
      data: coupon,
    };
  }

  async deleteCoupon(tenantId: string, id: string) {
    await this.findCouponForTenant(tenantId, id);
    await this.db.coupon.delete({ where: { id } });

    return { message: 'Coupon deleted successfully' };
  }

  async getTenantIdByDomain(domain: string) {
    if (!domain) {
      throw new BadRequestException('Tenant domain header is required');
    }

    const tenant = await this.databaseService.tenant.findUnique({
      where: { domain },
      select: { id: true, isActive: true },
    });

    if (!tenant) {
      throw new NotFoundException('Store not found for this domain');
    }

    if (!tenant.isActive) {
      throw new BadRequestException('This store is currently unavailable');
    }

    return tenant.id;
  }

  async getActiveSaleDiscounts(tenantId: string, productIds?: string[]) {
    const uniqueProductIds = productIds ? [...new Set(productIds)] : undefined;

    return this.db.saleDiscount.findMany({
      where: {
        tenantId,
        isActive: true,
        AND: this.getActiveDateWhere(),
        ...(uniqueProductIds && uniqueProductIds.length > 0
          ? {
              OR: [
                { scope: 'ALL_PRODUCTS' },
                {
                  products: {
                    some: { productId: { in: uniqueProductIds } },
                  },
                },
              ],
            }
          : {}),
      },
      include: { products: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActiveSalesForStorefront(domain: string) {
    const tenantId = await this.getTenantIdByDomain(domain);
    const saleDiscounts = await this.getActiveSaleDiscounts(tenantId);

    return {
      message: 'Active sale discounts fetched successfully',
      data: saleDiscounts,
    };
  }

  async getBestSaleDiscountsForProducts(
    tenantId: string,
    productIds: string[],
    productPriceMap?: Map<string, number>,
  ) {
    const sales = await this.getActiveSaleDiscounts(tenantId, productIds);
    const bestDiscounts = new Map<string, any>();

    for (const productId of productIds) {
      let best: any = null;
      let bestAmount = 0;

      for (const sale of sales) {
        const appliesToProduct =
          sale.scope === 'ALL_PRODUCTS' ||
          sale.products.some((item) => item.productId === productId);

        if (!appliesToProduct) continue;

        best = best || sale;
        const productPrice = productPriceMap?.get(productId);
        const currentAmount =
          productPrice !== undefined
            ? this.calculateDiscountAmount(
                productPrice,
                sale.discountType,
                Number(sale.value),
              )
            : Number(sale.value);
        if (currentAmount > bestAmount) {
          best = sale;
          bestAmount = currentAmount;
        }
      }

      if (best) {
        bestDiscounts.set(productId, best);
      }
    }

    return bestDiscounts;
  }

  async decorateProductsWithPricing(tenantId: string, products: any[]) {
    const productIds = products.map((product) => product.id);
    const bestDiscounts = await this.getBestSaleDiscountsForProducts(
      tenantId,
      productIds,
      new Map(
        products.map((product) => [product.id, Number(product.price)]),
      ),
    );

    return products.map((product) => {
      const originalPrice = Number(product.price);
      const saleDiscount = bestDiscounts.get(product.id);
      const saleDiscountAmount = saleDiscount
        ? this.calculateDiscountAmount(
            originalPrice,
            saleDiscount.discountType,
            Number(saleDiscount.value),
          )
        : 0;
      const salePrice = this.roundMoney(originalPrice - saleDiscountAmount);

      return {
        ...product,
        pricing: {
          originalPrice,
          salePrice,
          saleDiscountAmount,
          saleDiscountPercentage:
            originalPrice > 0
              ? this.roundMoney((saleDiscountAmount / originalPrice) * 100)
              : 0,
          activeSaleDiscount: saleDiscount
            ? {
                id: saleDiscount.id,
                title: saleDiscount.title,
                discountType: saleDiscount.discountType,
                value: saleDiscount.value,
                scope: saleDiscount.scope,
                startsAt: saleDiscount.startsAt,
                endsAt: saleDiscount.endsAt,
              }
            : null,
        },
      };
    });
  }

  private async getActiveCoupon(tenantId: string, code: string) {
    const now = new Date();
    const coupon = await this.db.coupon.findFirst({
      where: {
        tenantId,
        code: this.normalizeCode(code),
        isActive: true,
        AND: this.getActiveDateWhere(now),
      },
    });

    if (!coupon) {
      throw new BadRequestException('Coupon is invalid or expired');
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit has been reached');
    }

    return coupon;
  }

  async calculateOrderPricing(
    tenantId: string,
    orderItems: { productId: string; quantity: number }[],
    couponCode?: string,
  ): Promise<PricingResult> {
    const productIds = [...new Set(orderItems.map((item) => item.productId))];
    const products = await this.databaseService.product.findMany({
      where: {
        id: { in: productIds },
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        price: true,
        tenantId: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const productPriceMap = new Map(
      products.map((product) => [product.id, Number(product.price)]),
    );
    const bestDiscounts = await this.getBestSaleDiscountsForProducts(
      tenantId,
      productIds,
      productPriceMap,
    );

    let subtotalAmount = 0;
    let saleDiscountAmount = 0;

    const items = orderItems.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = Number(product.price);
      const lineSubtotal = this.roundMoney(unitPrice * item.quantity);
      const saleDiscount = bestDiscounts.get(item.productId);
      const unitDiscount = saleDiscount
        ? this.calculateDiscountAmount(
            unitPrice,
            saleDiscount.discountType,
            Number(saleDiscount.value),
          )
        : 0;
      const lineDiscount = this.roundMoney(unitDiscount * item.quantity);
      const lineTotal = this.roundMoney(lineSubtotal - lineDiscount);

      subtotalAmount += lineSubtotal;
      saleDiscountAmount += lineDiscount;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        lineSubtotal,
        saleDiscountAmount: lineDiscount,
        lineTotal,
        activeSaleDiscount: saleDiscount
          ? {
              id: saleDiscount.id,
              title: saleDiscount.title,
              discountType: saleDiscount.discountType,
              value: saleDiscount.value,
            }
          : null,
      };
    });

    subtotalAmount = this.roundMoney(subtotalAmount);
    saleDiscountAmount = this.roundMoney(saleDiscountAmount);

    const amountAfterSale = this.roundMoney(
      subtotalAmount - saleDiscountAmount,
    );
    let coupon: any | null = null;
    let couponDiscount = 0;

    if (couponCode) {
      coupon = await this.getActiveCoupon(tenantId, couponCode);

      if (
        coupon.minOrderAmount !== null &&
        amountAfterSale < coupon.minOrderAmount
      ) {
        throw new BadRequestException(
          `Minimum order amount for this coupon is ${coupon.minOrderAmount}`,
        );
      }

      couponDiscount = this.calculateDiscountAmount(
        amountAfterSale,
        coupon.discountType,
        Number(coupon.value),
        coupon.maxDiscountAmount,
      );
    }

    const discountAmount = this.roundMoney(
      saleDiscountAmount + couponDiscount,
    );
    const totalAmount = this.roundMoney(subtotalAmount - discountAmount);

    return {
      orderItemsData: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.saleDiscountAmount,
      })),
      subtotalAmount,
      saleDiscountAmount,
      couponDiscount,
      discountAmount,
      totalAmount,
      coupon,
      items,
    };
  }

  async validateCouponForStorefront(
    domain: string,
    code: string,
    orderItems: { productId: string; quantity: number }[],
  ) {
    const tenantId = await this.getTenantIdByDomain(domain);
    const pricing = await this.calculateOrderPricing(tenantId, orderItems, code);

    return {
      message: 'Coupon applied successfully',
      data: {
        isValid: true,
        coupon: pricing.coupon,
        pricing: {
          items: pricing.items,
          subtotalAmount: pricing.subtotalAmount,
          saleDiscountAmount: pricing.saleDiscountAmount,
          couponDiscount: pricing.couponDiscount,
          discountAmount: pricing.discountAmount,
          totalAmount: pricing.totalAmount,
        },
      },
    };
  }

  async recordCouponUsage(couponId?: string) {
    if (!couponId) return;

    await this.db.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    });
  }
}
