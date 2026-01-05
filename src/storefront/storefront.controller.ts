import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { Domain } from 'src/common/decorators/domain.decorator';
import {
  LoginCustomerDto,
  RegisterCustomerDto,
} from './dto/storefront-auth.dto';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
} from './dto/storefront-order.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';

@Controller('storefront')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  // Auth
  @Post('auth/login')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async loginCustomer(
    @Domain() domain: string,
    @Body() loginDto: LoginCustomerDto,
  ) {
    return this.storefrontService.loginCustomer(
      domain,
      loginDto.email,
      loginDto.password,
    );
  }

  @Post('auth/register')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async registerCustomer(
    @Domain() domain: string,
    @Body() registerDto: RegisterCustomerDto,
  ) {
    return this.storefrontService.registerCustomer(
      domain,
      registerDto.name,
      registerDto.email,
      registerDto.password,
      registerDto.phone,
    );
  }

  // Products
  @Get('products')
  async getAllProducts(
    @Domain() domain: string,
    @Query('categoryId') categoryId?: string,
    @Query('subCategoryId') subCategoryId?: string,
  ) {
    const categoryIdNum = categoryId ? parseInt(categoryId, 10) : undefined;
    const subCategoryIdNum = subCategoryId
      ? parseInt(subCategoryId, 10)
      : undefined;

    return this.storefrontService.getAllProducts(
      domain,
      categoryIdNum,
      subCategoryIdNum,
    );
  }

  @Get('products/:id')
  async getProductById(
    @Domain() domain: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.storefrontService.getProductById(domain, id);
  }

  // Categories
  @Get('categories')
  async getAllCategories(@Domain() domain: string) {
    return this.storefrontService.getAllCategories(domain);
  }

  // Subcategories
  @Get('subcategories')
  async getAllSubcategories(
    @Domain() domain: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const categoryIdNum = categoryId ? parseInt(categoryId, 10) : undefined;
    return this.storefrontService.getAllSubcategories(domain, categoryIdNum);
  }

  // Orders
  @Get('orders/:userId')
  @UseGuards(JwtGuard)
  async getUserOrders(
    @Domain() domain: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: any,
  ) {
    if (req.user.id !== userId) {
      throw new Error('Unauthorized access to orders');
    }
    return this.storefrontService.getUserOrders(domain, userId);
  }

  @Get('orders/details/:orderId')
  @UseGuards(JwtGuard)
  async getOrderById(
    @Domain() domain: string,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Req() req: any,
  ) {
    return this.storefrontService.getOrderById(domain, orderId, req.user.id);
  }

  @Post('orders/create')
  @UseGuards(JwtGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createOrder(
    @Domain() domain: string,
    @Body() createOrderDto: CreateOrderDto,
    @Req() req: any,
  ) {
    return this.storefrontService.createOrder(
      domain,
      req.user.id,
      createOrderDto.order_items,
    );
  }

  @Patch('orders/update/status/:orderId')
  @UseGuards(JwtGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateOrderStatus(
    @Domain() domain: string,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() updateStatusDto: UpdateOrderStatusDto,
    @Req() req: any,
  ) {
    return this.storefrontService.updateOrderStatus(
      domain,
      orderId,
      req.user.id,
      updateStatusDto.status,
    );
  }
}
