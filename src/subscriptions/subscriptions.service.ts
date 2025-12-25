import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class SubscriptionsService {
  private readonly GRACE_PERIOD_DAYS = 7;

  constructor(private readonly databaseService: DatabaseService) {}

  // Get current subscription
  async getCurrentSubscription(tenantId: string) {
    const subscription = await this.databaseService.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      return {
        message: 'No active subscription',
        data: null,
        hasSubscription: false,
      };
    }

    const status = this.getSubscriptionStatus(subscription);

    return {
      message: 'Subscription fetched successfully',
      data: {
        ...subscription,
        currentStatus: status.status,
        daysRemaining: status.daysRemaining,
        isInGracePeriod: status.isInGracePeriod,
        gracePeriodDaysRemaining: status.gracePeriodDaysRemaining,
      },
      hasSubscription: true,
    };
  }

  // Get usage vs limits
  async getUsage(tenantId: string) {
    const subscription = await this.databaseService.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException(
        'No subscription found. Please select a plan.',
      );
    }

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

    return {
      message: 'Usage fetched successfully',
      data: {
        products: {
          used: productCount,
          limit: subscription.plan.maxProducts,
          remaining: subscription.plan.maxProducts - productCount,
        },
        categories: {
          used: categoryCount,
          limit: subscription.plan.maxCategories,
          remaining: subscription.plan.maxCategories - categoryCount,
        },
        subcategoriesPerCategory: {
          maxUsed: maxSubcategoriesUsed,
          limit: subscription.plan.maxSubcategoriesPerCategory,
        },
        plan: subscription.plan,
      },
    };
  }

  // Activate free trial
  async activateTrial(tenantId: string) {
    const tenant = await this.databaseService.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    if (tenant.hasUsedTrial) {
      throw new BadRequestException(
        'You have already used your free trial. Please select a paid plan to continue.',
      );
    }

    const existingSubscription =
      await this.databaseService.subscription.findUnique({
        where: { tenantId },
      });

    if (existingSubscription) {
      throw new BadRequestException(
        'You already have an active subscription. Use upgrade or renew instead.',
      );
    }

    const trialPlan = await this.databaseService.plan.findFirst({
      where: { name: 'Free Trial', isActive: true },
    });

    if (!trialPlan) {
      throw new NotFoundException(
        'Free trial plan not available. Please contact support.',
      );
    }

    const startDate = new Date();
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialPlan.trialDays);

    const subscription = await this.databaseService.subscription.create({
      data: {
        tenantId,
        planId: trialPlan.id,
        status: 'TRIAL',
        startDate,
        endDate: trialEndsAt,
        trialEndsAt,
      },
      include: { plan: true },
    });

    await this.databaseService.tenant.update({
      where: { id: tenantId },
      data: { hasUsedTrial: true },
    });

    return {
      message:
        'Free trial activated successfully! You have 14 days to explore.',
      data: subscription,
    };
  }

  // Select paid plan (returns payment initiation data)
  async selectPlan(tenantId: string, planId: string) {
    const plan = await this.databaseService.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) throw new NotFoundException('Plan not found');
    if (!plan.isActive)
      throw new BadRequestException('This plan is no longer available');

    if (plan.price === 0 && plan.trialDays > 0) {
      return this.activateTrial(tenantId);
    }

    return {
      message: 'Please complete payment to activate this plan',
      data: {
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        currency: plan.currency,
        requiresPayment: true,
      },
    };
  }

  // Activate subscription after payment
  async activateSubscription(tenantId: string, planId: string) {
    const plan = await this.databaseService.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) throw new NotFoundException('Plan not found');

    const existingSubscription =
      await this.databaseService.subscription.findUnique({
        where: { tenantId },
      });

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    if (existingSubscription) {
      const subscription = await this.databaseService.subscription.update({
        where: { tenantId },
        data: {
          planId,
          status: 'ACTIVE',
          startDate,
          endDate,
          trialEndsAt: null,
        },
        include: { plan: true },
      });
      return {
        message: 'Subscription activated successfully',
        data: subscription,
      };
    }

    const subscription = await this.databaseService.subscription.create({
      data: {
        tenantId,
        planId,
        status: 'ACTIVE',
        startDate,
        endDate,
      },
      include: { plan: true },
    });

    return {
      message: 'Subscription activated successfully',
      data: subscription,
    };
  }

  // Upgrade plan
  async upgradePlan(tenantId: string, newPlanId: string) {
    const subscription = await this.databaseService.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException(
        'No subscription found. Please select a plan first.',
      );
    }

    const newPlan = await this.databaseService.plan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan) throw new NotFoundException('Plan not found');
    if (!newPlan.isActive)
      throw new BadRequestException('This plan is no longer available');

    if (newPlan.price <= subscription.plan.price) {
      throw new BadRequestException(
        'For upgrading, please select a plan with a higher price. Use downgrade for lower plans.',
      );
    }

    return {
      message: 'Please complete payment to upgrade your plan',
      data: {
        currentPlan: subscription.plan.name,
        newPlan: newPlan.name,
        amount: newPlan.price,
        currency: newPlan.currency,
        requiresPayment: true,
        planId: newPlan.id,
      },
    };
  }

  // Downgrade plan
  async downgradePlan(tenantId: string, newPlanId: string) {
    const subscription = await this.databaseService.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException(
        'No subscription found. Please select a plan first.',
      );
    }

    const newPlan = await this.databaseService.plan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan) throw new NotFoundException('Plan not found');
    if (!newPlan.isActive)
      throw new BadRequestException('This plan is no longer available');

    if (newPlan.price >= subscription.plan.price) {
      throw new BadRequestException(
        'For downgrading, please select a plan with a lower price. Use upgrade for higher plans.',
      );
    }

    // Check if current usage exceeds new plan limits
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

    if (productCount > newPlan.maxProducts) {
      violations.push(
        `You have ${productCount} products but the ${newPlan.name} plan only allows ${newPlan.maxProducts}. Delete ${productCount - newPlan.maxProducts} product(s) first.`,
      );
    }

    if (categoryCount > newPlan.maxCategories) {
      violations.push(
        `You have ${categoryCount} categories but the ${newPlan.name} plan only allows ${newPlan.maxCategories}. Delete ${categoryCount - newPlan.maxCategories} category(ies) first.`,
      );
    }

    if (maxSubcategoriesUsed > newPlan.maxSubcategoriesPerCategory) {
      violations.push(
        `Some categories have more than ${newPlan.maxSubcategoriesPerCategory} subcategories allowed by the ${newPlan.name} plan. Reduce subcategories first.`,
      );
    }

    if (violations.length > 0) {
      throw new ForbiddenException({
        message: 'Cannot downgrade: You exceed the new plan limits',
        violations,
      });
    }

    if (newPlan.price === 0) {
      throw new BadRequestException(
        'Cannot downgrade to the free trial. Please select a paid plan or contact support.',
      );
    }

    return {
      message: 'Please complete payment to downgrade your plan',
      data: {
        currentPlan: subscription.plan.name,
        newPlan: newPlan.name,
        amount: newPlan.price,
        currency: newPlan.currency,
        requiresPayment: true,
        planId: newPlan.id,
        effectiveFrom: 'Next billing cycle',
      },
    };
  }

  // Renew subscription
  async renewSubscription(tenantId: string) {
    const subscription = await this.databaseService.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException(
        'No subscription found. Please select a plan first.',
      );
    }

    if (subscription.plan.price === 0) {
      throw new BadRequestException(
        'Free trial cannot be renewed. Please select a paid plan to continue.',
      );
    }

    return {
      message: 'Please complete payment to renew your subscription',
      data: {
        plan: subscription.plan.name,
        amount: subscription.plan.price,
        currency: subscription.plan.currency,
        requiresPayment: true,
        planId: subscription.plan.id,
      },
    };
  }

  // Check subscription status
  async checkAccess(tenantId: string): Promise<{
    hasAccess: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    message: string;
  }> {
    const subscription = await this.databaseService.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      return {
        hasAccess: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        message: 'No subscription found. Please select a plan to continue.',
      };
    }

    const status = this.getSubscriptionStatus(subscription);

    if (status.status === 'ACTIVE' || status.status === 'TRIAL') {
      return {
        hasAccess: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        message: 'Subscription active',
      };
    }

    if (status.isInGracePeriod) {
      return {
        hasAccess: true,
        canCreate: false,
        canUpdate: false,
        canDelete: true,
        message: `Your subscription has expired. You have ${status.gracePeriodDaysRemaining} day(s) to renew before losing access.`,
      };
    }

    return {
      hasAccess: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      message:
        'Your subscription has expired and the grace period has ended. Please renew to regain access.',
    };
  }

  // Check if tenant exceeds limits (for downgrade scenarios)
  async checkLimitExceeded(tenantId: string): Promise<{
    exceeded: boolean;
    violations: string[];
  }> {
    const subscription = await this.databaseService.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      return { exceeded: false, violations: [] };
    }

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

    if (productCount > subscription.plan.maxProducts) {
      violations.push(
        `Product limit exceeded: ${productCount}/${subscription.plan.maxProducts}`,
      );
    }

    if (categoryCount > subscription.plan.maxCategories) {
      violations.push(
        `Category limit exceeded: ${categoryCount}/${subscription.plan.maxCategories}`,
      );
    }

    if (maxSubcategoriesUsed > subscription.plan.maxSubcategoriesPerCategory) {
      violations.push(
        `Subcategory limit exceeded in some categories: ${maxSubcategoriesUsed}/${subscription.plan.maxSubcategoriesPerCategory}`,
      );
    }

    return {
      exceeded: violations.length > 0,
      violations,
    };
  }

  // Helper: Calculate subscription status
  private getSubscriptionStatus(subscription: any): {
    status: string;
    daysRemaining: number;
    isInGracePeriod: boolean;
    gracePeriodDaysRemaining: number;
  } {
    const now = new Date();
    const endDate = subscription.endDate
      ? new Date(subscription.endDate)
      : subscription.trialEndsAt
        ? new Date(subscription.trialEndsAt)
        : null;

    if (!endDate) {
      return {
        status: subscription.status,
        daysRemaining: 0,
        isInGracePeriod: false,
        gracePeriodDaysRemaining: 0,
      };
    }

    const diffTime = endDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining > 0) {
      return {
        status: subscription.status,
        daysRemaining,
        isInGracePeriod: false,
        gracePeriodDaysRemaining: 0,
      };
    }

    const daysSinceExpiry = Math.abs(daysRemaining);
    const gracePeriodDaysRemaining = this.GRACE_PERIOD_DAYS - daysSinceExpiry;

    if (gracePeriodDaysRemaining > 0) {
      return {
        status: 'EXPIRED',
        daysRemaining: 0,
        isInGracePeriod: true,
        gracePeriodDaysRemaining,
      };
    }

    return {
      status: 'EXPIRED',
      daysRemaining: 0,
      isInGracePeriod: false,
      gracePeriodDaysRemaining: 0,
    };
  }
}
