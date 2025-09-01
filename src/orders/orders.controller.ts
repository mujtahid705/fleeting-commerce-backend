import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Get all orders
  @Get('all')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin', 'superAdmin')
  findAllOrders() {
    return this.ordersService.findAll();
  }

  // Get order by userId
  @Get(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin', 'superAdmin')
  findOrderById(@Param('id', ParseUUIDPipe) userId: string) {
    return this.ordersService.findById(userId);
  }

  // Post order
  @Post('create')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin', 'superAdmin')
  createOrder(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    return this.ordersService.create(createOrderDto, req);
  }

  // Update Status
  @Patch('update/status/:id')
  updateStatus(
    @Param('id') id: number,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateStatusDto);
  }
}
