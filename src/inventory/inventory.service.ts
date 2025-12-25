import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AddProductToInventoryDto } from './dto/add-product-inventory.dto';
import { DatabaseService } from 'src/database/database.service';
import { UpdateInventoryQuantityDto } from './dto/update-inventory-quantity.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly databaseService: DatabaseService) {}

  // Get All Inventory Items
  async findAll(req: any) {
    const inventoryItems = await this.databaseService.inventory.findMany({
      where: { tenantId: req.user?.tenantId },
      include: {
        product: {
          include: {
            images: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
            },
            category: true,
            subCategory: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Inventory items fetched successfully',
      data: inventoryItems,
    };
  }

  // Get Single Inventory Item by Product ID
  async findOne(productId: string, req: any) {
    const inventoryItem = await this.databaseService.inventory.findUnique({
      where: { productId },
      include: {
        product: {
          include: {
            images: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
            },
            category: true,
            subCategory: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!inventoryItem) {
      throw new NotFoundException('Inventory item not found!');
    }

    if (inventoryItem.tenantId !== req.user?.tenantId) {
      throw new UnauthorizedException('Unauthorized tenant.');
    }

    return {
      message: 'Inventory item fetched successfully',
      data: inventoryItem,
    };
  }

  // Get Low Stock Items
  async getLowStock(threshold: number, req: any) {
    const lowStockItems = await this.databaseService.inventory.findMany({
      where: {
        tenantId: req.user?.tenantId,
        quantity: { lte: threshold },
      },
      include: {
        product: {
          include: {
            images: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
              take: 1,
            },
            category: true,
          },
        },
      },
      orderBy: { quantity: 'asc' },
    });

    return {
      message: 'Low stock items fetched successfully',
      threshold,
      count: lowStockItems.length,
      data: lowStockItems,
    };
  }

  // Get Out of Stock Items
  async getOutOfStock(req: any) {
    const outOfStockItems = await this.databaseService.inventory.findMany({
      where: {
        tenantId: req.user?.tenantId,
        quantity: 0,
      },
      include: {
        product: {
          include: {
            images: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
              take: 1,
            },
            category: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      message: 'Out of stock items fetched successfully',
      count: outOfStockItems.length,
      data: outOfStockItems,
    };
  }

  // Add Product to Inventory
  async addProductToInventory(
    addProductToInventory: AddProductToInventoryDto,
    req: any,
  ) {
    if (addProductToInventory.quantity < 0) {
      throw new BadRequestException('Invalid quantity.');
    }

    const product = await this.databaseService.product.findUnique({
      where: { id: addProductToInventory.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found!');
    }

    if (product.tenantId !== req.user.tenantId) {
      throw new UnauthorizedException('Unauthorized tenant.');
    }

    const inventoryExists = await this.databaseService.inventory.findUnique({
      where: { productId: addProductToInventory.productId },
    });

    if (inventoryExists) {
      throw new ConflictException('Product already exists in inventory!');
    }

    const createdProduct = await this.databaseService.inventory.create({
      data: {
        productId: addProductToInventory.productId,
        tenantId: req.user.tenantId,
        quantity: addProductToInventory.quantity,
        addedBy: req.user.id,
      },
    });

    return {
      message: 'Product added to inventory successfully',
      data: createdProduct,
    };
  }

  // Update Inventory Quantity
  async updateInventoryQuantity(
    productId: string,
    updateInventoryQuantityDto: UpdateInventoryQuantityDto,
    req: any,
  ) {
    const inventoryItem = await this.databaseService.inventory.findUnique({
      where: { productId },
    });

    if (!inventoryItem) {
      throw new NotFoundException('Inventory item not found!');
    }

    if (inventoryItem.tenantId !== req.user.tenantId) {
      throw new UnauthorizedException('Unauthorized tenant.');
    }

    if (updateInventoryQuantityDto.quantity < 0) {
      throw new BadRequestException('Invalid quantity.');
    }

    const updatedInventory = await this.databaseService.inventory.update({
      where: { id: inventoryItem.id },
      data: { quantity: updateInventoryQuantityDto.quantity },
    });

    return {
      message: 'Inventory quantity updated successfully',
      data: updatedInventory,
    };
  }

  // Delete Inventory Item (Soft Delete)
  async deleteInventoryItem(productId: string, req: any) {
    const inventoryItem = await this.databaseService.inventory.findUnique({
      where: { productId },
    });

    if (!inventoryItem) {
      throw new NotFoundException('Inventory item not found!');
    }

    if (inventoryItem.tenantId !== req.user.tenantId) {
      throw new UnauthorizedException('Unauthorized tenant.');
    }

    const deletedInventory = await this.databaseService.inventory.delete({
      where: { id: inventoryItem.id },
    });

    return {
      message: 'Inventory item deleted successfully',
      data: deletedInventory,
    };
  }
}
