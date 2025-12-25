import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { AddProductToInventoryDto } from './dto/add-product-inventory.dto';
import { UpdateInventoryQuantityDto } from './dto/update-inventory-quantity.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // Add Product to Inventory
  @Post('add-product')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  @UsePipes(new ValidationPipe({ transform: true }))
  addProductToInventory(
    @Body() addProductToInventory: AddProductToInventoryDto,
    @Req() req: any,
  ) {
    return this.inventoryService.addProductToInventory(
      addProductToInventory,
      req,
    );
  }

  // Update Inventory Quantity
  @Patch('update-quantity/:productId')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  @UsePipes(new ValidationPipe({ transform: true }))
  updateInventoryQuantity(
    @Param('productId') productId: string,
    @Body() updateInventoryQuantityDto: UpdateInventoryQuantityDto,
    @Req() req: any,
  ) {
    return this.inventoryService.updateInventoryQuantity(
      productId,
      updateInventoryQuantityDto,
      req,
    );
  }

  // Delete Inventory Item
  @Delete('delete-item/:productId')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  deleteInventoryItem(@Param('productId') productId: string, @Req() req: any) {
    return this.inventoryService.deleteInventoryItem(productId, req);
  }
}
