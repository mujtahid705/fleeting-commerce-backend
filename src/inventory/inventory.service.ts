import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AddProductToInventoryDto } from './dto/add-product-inventory.dto';
import { DatabaseService } from 'src/database/database.service';
import { UpdateInventoryQuantityDto } from './dto/update-inventory-quantity.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly databaseService: DatabaseService) {}

  // Add Product to Inventory
  async addProductToInventory(
    addProductToInventory: AddProductToInventoryDto,
    req: any,
  ) {
    if (addProductToInventory.tenantId !== req.user.tenantId) {
      throw new UnauthorizedException('Unauthorized tenant.');
    }

    if (addProductToInventory.quantity < 0) {
      throw new Error('Invalid quantity.');
    }

    const product = this.databaseService.product.findUnique({
      where: { id: addProductToInventory.productId },
    });

    if (!product) {
      throw new Error('Product not found!');
    }

    const createdProduct = this.databaseService.inventory.create({
      data: {
        productId: addProductToInventory.productId,
        tenantId: addProductToInventory.tenantId,
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
      throw new Error('Inventory item not found!');
    }

    if (inventoryItem.tenantId !== req.user.tenantId) {
      throw new UnauthorizedException('Unauthorized tenant.');
    }

    if (updateInventoryQuantityDto.quantity < 0) {
      throw new Error('Invalid quantity.');
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
      throw new Error('Inventory item not found!');
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
