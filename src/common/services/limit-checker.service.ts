import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

export type ResourceType = 'products' | 'categories' | 'subcategories';

@Injectable()
export class LimitCheckerService {
  private readonly GRACE_PERIOD_DAYS = 7;

  constructor(private readonly databaseService: DatabaseService) {}

  // Check if resource creation is allowed
  async canCreate(
    tenantId: string,
    resourceType: ResourceType,
    categoryId?: number,
  ): Promise<void> {
    const subscription = await this.databaseService.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new ForbiddenException(
        'No subscription found. Please select a plan to continue.',
      );
    }

    // Check subscription status
    const accessStatus = this.checkSubscriptionAccess(subscription);
    if (!accessStatus.canCreate) {
      throw new ForbiddenException(accessStatus.message);
    }

    // Check limit exceeded from downgrade
    const limitExceeded = await this.isLimitExceeded(
      tenantId,
      subscription.plan,
    );
    if (limitExceeded.exceeded) {
      throw new ForbiddenException(
        `You have exceeded your plan limits. ${limitExceeded.violations.join(' ')} Please delete some items or upgrade your plan.`,
      );
    }

    // Check specific resource limit
    await this.checkResourceLimit(
      tenantId,
      resourceType,
      subscription.plan,
      categoryId,
    );
  }

  // Check if update is allowed
  async canUpdate(tenantId: string): Promise<void> {
    const subscription = await this.databaseService.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new ForbiddenException(
        'No subscription found. Please select a plan to continue.',
      );
    }

    const accessStatus = this.checkSubscriptionAccess(subscription);
    if (!accessStatus.canUpdate) {
      throw new ForbiddenException(accessStatus.message);
    }

    const limitExceeded = await this.isLimitExceeded(
      tenantId,
      subscription.plan,
    );
    if (limitExceeded.exceeded) {
      throw new ForbiddenException(
        `You have exceeded your plan limits. ${limitExceeded.violations.join(' ')} Please delete some items or upgrade your plan to make updates.`,
      );
    }
  }

  // Check if delete is allowed
  async canDelete(tenantId: string): Promise<void> {
    const subscription = await this.databaseService.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new ForbiddenException(
        'No subscription found. Please select a plan to continue.',
      );
    }

    const accessStatus = this.checkSubscriptionAccess(subscription);
    if (!accessStatus.canDelete) {
      throw new ForbiddenException(accessStatus.message);
    }
  }

  // Check if view is allowed
  async canView(tenantId: string): Promise<void> {
    const subscription = await this.databaseService.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new ForbiddenException(
        'No subscription found. Please select a plan to continue.',
      );
    }

    const accessStatus = this.checkSubscriptionAccess(subscription);
    if (!accessStatus.hasAccess) {
      throw new ForbiddenException(accessStatus.message);
    }
  }

  // Check specific resource limit
  private async checkResourceLimit(
    tenantId: string,
    resourceType: ResourceType,
    plan: any,
    categoryId?: number,
  ): Promise<void> {
    switch (resourceType) {
      case 'products': {
        const count = await this.databaseService.product.count({
          where: { tenantId },
        });
        if (count >= plan.maxProducts) {
          throw new ForbiddenException(
            `You have reached the maximum number of products (${plan.maxProducts}) for your ${plan.name} plan. Upgrade to add more.`,
          );
        }
        break;
      }

      case 'categories': {
        const count = await this.databaseService.category.count({
          where: { tenantId },
        });
        if (count >= plan.maxCategories) {
          throw new ForbiddenException(
            `You have reached the maximum number of categories (${plan.maxCategories}) for your ${plan.name} plan. Upgrade to add more.`,
          );
        }
        break;
      }

      case 'subcategories': {
        if (!categoryId) {
          throw new NotFoundException(
            'Category ID is required for subcategory limit check',
          );
        }
        const count = await this.databaseService.subCategory.count({
          where: { categoryId },
        });
        if (count >= plan.maxSubcategoriesPerCategory) {
          throw new ForbiddenException(
            `You have reached the maximum subcategories (${plan.maxSubcategoriesPerCategory}) for this category in your ${plan.name} plan. Upgrade to add more.`,
          );
        }
        break;
      }
    }
  }

  // Check if tenant exceeds limits
  private async isLimitExceeded(
    tenantId: string,
    plan: any,
  ): Promise<{ exceeded: boolean; violations: string[] }> {
    const [productCount, categoryCount] = await Promise.all([
      this.databaseService.product.count({ where: { tenantId } }),
      this.databaseService.category.count({ where: { tenantId } }),
    ]);

    const categories = await this.databaseService.category.findMany({
      where: { tenantId },
      include: { _count: { select: { subCategories: true } } },
    });

    const maxSubcategoriesUsed = categories.reduce(
      (max, cat) => Math.max(max, cat._count.subCategories),
      0,
    );

    const violations: string[] = [];

    if (productCount > plan.maxProducts) {
      violations.push(
        `Delete ${productCount - plan.maxProducts} product(s) to meet your limit of ${plan.maxProducts}.`,
      );
    }

    if (categoryCount > plan.maxCategories) {
      violations.push(
        `Delete ${categoryCount - plan.maxCategories} category(ies) to meet your limit of ${plan.maxCategories}.`,
      );
    }

    if (maxSubcategoriesUsed > plan.maxSubcategoriesPerCategory) {
      violations.push(
        `Reduce subcategories in some categories to meet limit of ${plan.maxSubcategoriesPerCategory} per category.`,
      );
    }

    return { exceeded: violations.length > 0, violations };
  }

  // Check subscription access status
  private checkSubscriptionAccess(subscription: any): {
    hasAccess: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    message: string;
  } {
    const now = new Date();
    const endDate = subscription.endDate
      ? new Date(subscription.endDate)
      : subscription.trialEndsAt
        ? new Date(subscription.trialEndsAt)
        : null;

    if (!endDate) {
      return {
        hasAccess: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        message: 'Subscription active',
      };
    }

    const diffTime = endDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Active subscription
    if (daysRemaining > 0) {
      return {
        hasAccess: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        message: 'Subscription active',
      };
    }

    // Grace period
    const daysSinceExpiry = Math.abs(daysRemaining);
    if (daysSinceExpiry <= this.GRACE_PERIOD_DAYS) {
      const graceDaysLeft = this.GRACE_PERIOD_DAYS - daysSinceExpiry;
      return {
        hasAccess: true,
        canCreate: false,
        canUpdate: false,
        canDelete: true,
        message: `Your subscription has expired. You have ${graceDaysLeft} day(s) left in your grace period. Renew now to continue creating and updating.`,
      };
    }

    // Fully expired
    return {
      hasAccess: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      message:
        'Your subscription has expired and the grace period has ended. Please renew to regain access.',
    };
  }
}
