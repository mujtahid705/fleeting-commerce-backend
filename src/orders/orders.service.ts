import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly databaseService: DatabaseService) {}

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
    // Validate that all products belong to the user's tenant
    const productIds = createOrderDto.order_items.map((item) => item.productId);
    const products = await this.databaseService.product.findMany({
      where: { id: { in: productIds } },
    });

    // Check all products exist
    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    // Check all products belong to the user's tenant
    const invalidProducts = products.filter(
      (p) => p.tenantId !== req.user.tenantId,
    );
    if (invalidProducts.length > 0) {
      throw new UnauthorizedException(
        'You cannot order products from another tenant',
      );
    }

    // Create a map of productId -> price for quick lookup
    const productPriceMap = new Map(products.map((p) => [p.id, p.price]));

    // Calculate total amount from product prices
    let totalAmount = 0;
    const orderItemsData = createOrderDto.order_items.map((item) => {
      const unitPrice = productPriceMap.get(item.productId);
      totalAmount += Number(unitPrice) * item.quantity;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: Number(unitPrice),
      };
    });

    const newOrder = await this.databaseService.order.create({
      data: {
        userId: req.user.id,
        tenantId: req.user.tenantId,
        totalAmount,
      },
    });

    await this.databaseService.orderItem.createMany({
      data: orderItemsData.map((item) => ({
        orderId: newOrder.id,
        ...item,
      })),
    });

    // Fetch the complete order with order items
    const createdOrder = await this.databaseService.order.findUnique({
      where: { id: newOrder.id },
      include: {
        order_items: { include: { product: true } },
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
