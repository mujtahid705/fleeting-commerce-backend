import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly databaseService: DatabaseService) {}

  // Get all orders
  async findAll() {
    const orders = await this.databaseService.order.findMany({
      include: {
        order_items: { include: { product: true } },
        user: true,
      },
    });

    return { message: 'Orders fetched successfully', data: orders };
  }

  // Get order by Id
  async findById(userId: string) {
    const order = await this.databaseService.order.findMany({
      where: { userId: userId },
      include: {
        order_items: { include: { product: true } },
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return { message: 'Order fetched successfully', data: order };
  }

  // Post Order
  async create(createOrderDto: CreateOrderDto, req: any) {
    const newOrder = await this.databaseService.order.create({
      data: {
        userId: req.user.id,
        totalAmount: createOrderDto.totalAmount,
      },
    });

    const orderItems = await this.databaseService.order_Item.createMany({
      data: createOrderDto.order_items.map((item) => ({
        orderId: newOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });

    return {
      message: 'Order created successfully',
      data: { order: newOrder, order_items: orderItems },
    };
  }

  //   Update Order Status
  async updateStatus(id: number, updateStatusDto: UpdateStatusDto) {
    const order = await this.databaseService.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
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
