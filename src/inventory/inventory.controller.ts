import { Controller, Post } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // Add Products to Inventory
  @Post('add-products')
  addProductsToInventory() {}
}
