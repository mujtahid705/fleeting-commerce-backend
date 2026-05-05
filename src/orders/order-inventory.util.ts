import { BadRequestException, NotFoundException } from '@nestjs/common';

type OrderInventoryItem = {
  productId: string;
  quantity: number;
};

type InventoryForOrder = {
  productId: string;
  quantity: number;
  product: {
    title: string;
  };
};

export async function decrementInventoryForOrder(
  db: any,
  tenantId: string,
  orderItems: OrderInventoryItem[],
) {
  const quantityByProductId = new Map<string, number>();

  for (const item of orderItems) {
    const quantity = Number(item.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException('Order item quantity must be at least 1');
    }

    quantityByProductId.set(
      item.productId,
      (quantityByProductId.get(item.productId) || 0) + quantity,
    );
  }

  const productIds = [...quantityByProductId.keys()];
  const inventoryItems = (await db.inventory.findMany({
    where: {
      tenantId,
      productId: { in: productIds },
      isActive: true,
    },
    select: {
      productId: true,
      quantity: true,
      product: { select: { title: true } },
    },
  })) as InventoryForOrder[];

  if (inventoryItems.length !== productIds.length) {
    throw new NotFoundException(
      'One or more products are not available in inventory',
    );
  }

  const inventoryByProductId = new Map(
    inventoryItems.map((item) => [item.productId, item]),
  );

  for (const [productId, requestedQuantity] of quantityByProductId) {
    const inventoryItem = inventoryByProductId.get(productId)!;

    if (inventoryItem.quantity < requestedQuantity) {
      throw new BadRequestException(
        `Insufficient inventory for ${inventoryItem.product.title}. Available: ${inventoryItem.quantity}, requested: ${requestedQuantity}`,
      );
    }

    const updatedInventory = await db.inventory.updateMany({
      where: {
        tenantId,
        productId,
        isActive: true,
        quantity: { gte: requestedQuantity },
      },
      data: {
        quantity: { decrement: requestedQuantity },
      },
    });

    if (updatedInventory.count !== 1) {
      throw new BadRequestException(
        `Insufficient inventory for ${inventoryItem.product.title}`,
      );
    }

    await db.product.update({
      where: { id: productId },
      data: { totalSold: { increment: requestedQuantity } },
    });
  }
}
