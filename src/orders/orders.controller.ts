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
  @Roles('admin', 'superAdmin', 'user')
  findOrderById(@Param('id', ParseUUIDPipe) userId: string, @Req() req: any) {
    return this.ordersService.findById(userId, req);
  }

  // Post order
  @Post('create')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin', 'superAdmin', 'user')
  createOrder(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    return this.ordersService.create(createOrderDto, req);
  }

  // Update Status
  @Patch('update/status/:id')
  @UseGuards(JwtGuard)
  updateStatus(
    @Param('id') id: number,
    @Body() updateStatusDto: UpdateStatusDto,
    @Req() req: any,
  ) {
    return this.ordersService.updateStatus(id, updateStatusDto, req);
  }
}
