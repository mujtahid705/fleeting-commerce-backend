import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';
import { recomputeProductRating } from './review-aggregate.util';

@Injectable()
export class ReviewsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(query: ListReviewsQueryDto, req: any) {
    const tenantId: string = req.user.tenantId;
    const { productId, rating, search, isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      ...(productId && { productId }),
      ...(rating && { rating }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        comment: { contains: search, mode: 'insensitive' },
      }),
    };

    const [items, total] = await Promise.all([
      this.databaseService.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, title: true, slug: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.databaseService.review.count({ where }),
    ]);

    return {
      message: 'Reviews fetched successfully',
      data: {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, req: any) {
    const tenantId: string = req.user.tenantId;

    const review = await this.databaseService.review.findFirst({
      where: { id, tenantId },
      include: {
        product: { select: { id: true, title: true, slug: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!review) throw new NotFoundException('Review not found');

    return { message: 'Review fetched successfully', data: review };
  }

  async setActive(id: string, req: any, isActive: boolean) {
    const tenantId: string = req.user.tenantId;

    const review = await this.databaseService.review.findFirst({
      where: { id, tenantId },
    });

    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.databaseService.review.update({
      where: { id },
      data: { isActive },
    });

    await recomputeProductRating(this.databaseService, review.productId);

    return {
      message: `Review ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: updated,
    };
  }
}
