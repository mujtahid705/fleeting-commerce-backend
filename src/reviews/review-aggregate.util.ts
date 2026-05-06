import { DatabaseService } from 'src/database/database.service';

export async function recomputeProductRating(
  db: DatabaseService,
  productId: string,
): Promise<void> {
  const agg = await db.review.aggregate({
    where: { productId, isActive: true },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await db.product.update({
    where: { id: productId },
    data: {
      averageRating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
      reviewCount: agg._count._all,
    },
  });
}
