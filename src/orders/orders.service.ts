import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { DiscountsService } from 'src/discounts/discounts.service';
import { decrementInventoryForOrder } from './order-inventory.util';

@Injectable()
export class OrdersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly discountsService: DiscountsService,
  ) {}

  // Get all orders (for TENANT_ADMIN - gets all orders for their tenant)
  async findAll(req: any) {
    const orders = await this.databaseService.order.findMany({
      where: { tenantId: req.user?.tenantId },
      include: {
        order_items: { include: { product: true } },
        user: true,
      },
    });

    return { message: 'Orders fetched successfully', data: orders };
  }

  // Get orders by userId
  async findById(userId: string, req: any) {
    // CUSTOMER can only access their own orders
    if (req.user.role === 'CUSTOMER' && userId !== req.user.id) {
      throw new ForbiddenException('You are not allowed to access this order');
    }

    const orders = await this.databaseService.order.findMany({
      where: {
        userId: userId,
        tenantId: req.user.tenantId, // Ensure orders belong to the same tenant
      },
      include: {
        order_items: { include: { product: true } },
        user: true,
      },
    });

    return { message: 'Orders fetched successfully', data: orders };
  }

  // Create Order
  async create(createOrderDto: CreateOrderDto, req: any) {
    const pricing = await this.discountsService.calculateOrderPricing(
      req.user.tenantId,
      createOrderDto.order_items,
      createOrderDto.couponCode,
    );

    const newOrder = await this.databaseService.$transaction(async (tx) => {
      const order = await (tx as any).order.create({
        data: {
          userId: req.user.id,
          tenantId: req.user.tenantId,
          subtotalAmount: pricing.subtotalAmount,
          saleDiscountAmount: pricing.saleDiscountAmount,
          couponDiscount: pricing.couponDiscount,
          discountAmount: pricing.discountAmount,
          couponCode: pricing.coupon?.code || null,
          totalAmount: pricing.totalAmount,
        },
      });

      await (tx as any).orderItem.createMany({
        data: pricing.orderItemsData.map((item) => ({
          orderId: order.id,
          ...item,
        })),
      });

      await decrementInventoryForOrder(
        tx,
        req.user.tenantId,
        pricing.orderItemsData,
      );

      if (pricing.coupon?.id) {
        await (tx as any).coupon.update({
          where: { id: pricing.coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      return order;
    });

    // Fetch the complete order with order items
    const createdOrder = await this.databaseService.order.findUnique({
      where: { id: newOrder.id },
      include: {
        order_items: {
          include: {
            product: {
              include: {
                inventory: {
                  select: {
                    quantity: true,
                  },
                },
              },
            },
          },
        },
        user: true,
      },
    });

    return {
      message: 'Order created successfully',
      data: createdOrder,
    };
  }

  // Update Order Status
  async updateStatus(id: number, updateStatusDto: UpdateStatusDto, req: any) {
    const order = await this.databaseService.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Ensure order belongs to the user's tenant
    if (order.tenantId !== req.user.tenantId) {
      throw new UnauthorizedException(
        'You cannot update orders from another tenant',
      );
    }

    // CUSTOMER can only cancel their own pending orders
    if (req.user.role === 'CUSTOMER') {
      if (order.userId !== req.user.id) {
        throw new ForbiddenException(
          'You are not allowed to update this order',
        );
      }
      if (
        order.status !== 'pending' ||
        updateStatusDto.status !== 'cancelled'
      ) {
        throw new ForbiddenException(
          'You can only cancel your own pending orders',
        );
      }
    }

    const updatedOrder = await this.databaseService.order.update({
      where: { id },
      data: { status: updateStatusDto.status },
    });

    return {
      message: 'Order status updated successfully',
      data: updatedOrder,
    };
  }
}
