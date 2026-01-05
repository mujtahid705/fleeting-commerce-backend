import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Status } from 'generated/prisma';

@Injectable()
export class StorefrontService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  // Helpers
  private async getTenantIdByDomain(domain: string): Promise<string> {
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

  // Auth
  async loginCustomer(
    domain: string,
    email: string,
    password: string,
  ): Promise<{ token: string; user: any }> {
    const tenantId = await this.getTenantIdByDomain(domain);

    const user = await this.databaseService.user.findFirst({
      where: {
        email,
        tenantId,
        role: 'CUSTOMER',
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const jwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    const token = this.jwtService.sign(jwtPayload);

    const { password: _, ...userData } = user;

    return {
      token,
      user: userData,
    };
  }

  async registerCustomer(
    domain: string,
    name: string,
    email: string,
    password: string,
    phone?: string,
  ) {
    const tenantId = await this.getTenantIdByDomain(domain);

    const existingUser = await this.databaseService.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.databaseService.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role: 'CUSTOMER',
        tenantId,
      },
    });

    const { password: _, ...userData } = newUser;

    return {
      message: 'Customer registered successfully',
      data: userData,
    };
  }

  // Products
  async getAllProducts(
    domain: string,
    categoryId?: number,
    subCategoryId?: number,
  ) {
    const tenantId = await this.getTenantIdByDomain(domain);

    const inventoryItems = await this.databaseService.inventory.findMany({
      where: {
        tenantId,
        isActive: true,
        product: {
          isActive: true,
          ...(categoryId && { categoryId }),
          ...(subCategoryId && { subCategoryId }),
        },
      },
      include: {
        product: {
          include: {
            images: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            subCategory: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const products = inventoryItems.map((item) => ({
      ...item.product,
      inventory: {
        quantity: item.quantity,
      },
    }));

    return {
      message: 'Products fetched successfully',
      data: products,
    };
  }

  async getProductById(domain: string, productId: string) {
    const tenantId = await this.getTenantIdByDomain(domain);

    const inventoryItem = await this.databaseService.inventory.findFirst({
      where: {
        productId,
        tenantId,
        isActive: true,
        product: {
          isActive: true,
        },
      },
      include: {
        product: {
          include: {
            images: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            subCategory: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!inventoryItem) {
      throw new NotFoundException('Product not found');
    }

    const product = {
      ...inventoryItem.product,
      inventory: {
        quantity: inventoryItem.quantity,
      },
    };

    return {
      message: 'Product fetched successfully',
      data: product,
    };
  }

  // Categories
  async getAllCategories(domain: string) {
    const tenantId = await this.getTenantIdByDomain(domain);

    const categories = await this.databaseService.category.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
            subCategories: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const data = categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      productsCount: category._count.products,
      subCategoriesCount: category._count.subCategories,
    }));

    return {
      message: 'Categories fetched successfully',
      data,
    };
  }

  // Subcategories
  async getAllSubcategories(domain: string, categoryId?: number) {
    const tenantId = await this.getTenantIdByDomain(domain);

    const subcategories = await this.databaseService.subCategory.findMany({
      where: {
        isActive: true,
        category: {
          tenantId,
          isActive: true,
        },
        ...(categoryId && { categoryId }),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const data = subcategories.map((subcategory) => ({
      id: subcategory.id,
      name: subcategory.name,
      slug: subcategory.slug,
      categoryId: subcategory.categoryId,
      category: subcategory.category,
      productsCount: subcategory._count.products,
    }));

    return {
      message: 'Subcategories fetched successfully',
      data,
    };
  }

  // Orders
  async getUserOrders(domain: string, userId: string) {
    const tenantId = await this.getTenantIdByDomain(domain);

    const orders = await this.databaseService.order.findMany({
      where: {
        userId,
        tenantId,
      },
      include: {
        order_items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                images: {
                  where: { isActive: true },
                  orderBy: { order: 'asc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Orders fetched successfully',
      data: orders,
    };
  }

  async getOrderById(domain: string, orderId: number, userId: string) {
    const tenantId = await this.getTenantIdByDomain(domain);

    const order = await this.databaseService.order.findFirst({
      where: {
        id: orderId,
        userId,
        tenantId,
      },
      include: {
        order_items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                price: true,
                images: {
                  where: { isActive: true },
                  orderBy: { order: 'asc' },
                  take: 1,
                },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      message: 'Order details fetched successfully',
      data: order,
    };
  }

  async createOrder(
    domain: string,
    userId: string,
    orderItems: { productId: string; quantity: number }[],
  ) {
    const tenantId = await this.getTenantIdByDomain(domain);

    const productIds = orderItems.map((item) => item.productId);
    const products = await this.databaseService.product.findMany({
      where: {
        id: { in: productIds },
        tenantId,
        isActive: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products not found');
    }

    const productPriceMap = new Map(products.map((p) => [p.id, p.price]));

    let totalAmount = 0;
    const orderItemsData = orderItems.map((item) => {
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
        userId,
        tenantId,
        totalAmount,
      },
    });

    await this.databaseService.orderItem.createMany({
      data: orderItemsData.map((item) => ({
        orderId: newOrder.id,
        ...item,
      })),
    });

    const createdOrder = await this.databaseService.order.findUnique({
      where: { id: newOrder.id },
      include: {
        order_items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                price: true,
                images: {
                  where: { isActive: true },
                  orderBy: { order: 'asc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    return {
      message: 'Order created successfully',
      data: createdOrder,
    };
  }

  async updateOrderStatus(
    domain: string,
    orderId: number,
    userId: string,
    status: Status,
  ) {
    const tenantId = await this.getTenantIdByDomain(domain);

    const order = await this.databaseService.order.findFirst({
      where: {
        id: orderId,
        userId,
        tenantId,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'pending' || status !== 'cancelled') {
      throw new ForbiddenException(
        'You can only cancel your own pending orders',
      );
    }

    const updatedOrder = await this.databaseService.order.update({
      where: { id: orderId },
      data: { status },
    });

    return {
      message: 'Order status updated successfully',
      data: updatedOrder,
    };
  }
}
