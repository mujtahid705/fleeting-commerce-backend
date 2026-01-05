import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly GRACE_PERIOD_DAYS = 7;

  constructor(private readonly databaseService: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenantId) {
      return true; // Let other guards handle non-tenant users
    }

    // Skip for SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Skip for CUSTOMER (they access tenant resources, not manage them)
    if (user.role === 'CUSTOMER') {
      return true;
    }

    const subscription = await this.databaseService.subscription.findUnique({
      where: { tenantId: user.tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new ForbiddenException(
        'No subscription found. Please select a plan to continue using the service.',
      );
    }

    const accessStatus = this.checkAccess(subscription);

    if (!accessStatus.hasAccess) {
      throw new ForbiddenException(accessStatus.message);
    }

    // Attach subscription info to request for use in services
    request.subscription = {
      ...subscription,
      isInGracePeriod: accessStatus.isInGracePeriod,
      canCreate: accessStatus.canCreate,
      canUpdate: accessStatus.canUpdate,
      canDelete: accessStatus.canDelete,
    };

    return true;
  }

  private checkAccess(subscription: any): {
    hasAccess: boolean;
    isInGracePeriod: boolean;
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
        isInGracePeriod: false,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        message: 'Subscription active',
      };
    }

    const diffTime = endDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining > 0) {
      return {
        hasAccess: true,
        isInGracePeriod: false,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        message: 'Subscription active',
      };
    }

    const daysSinceExpiry = Math.abs(daysRemaining);
    if (daysSinceExpiry <= this.GRACE_PERIOD_DAYS) {
      return {
        hasAccess: true,
        isInGracePeriod: true,
        canCreate: false,
        canUpdate: false,
        canDelete: true,
        message: `Your subscription has expired. You have ${this.GRACE_PERIOD_DAYS - daysSinceExpiry} day(s) to renew.`,
      };
    }

    return {
      hasAccess: false,
      isInGracePeriod: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      message:
        'Your subscription has expired and the grace period has ended. Please renew to regain access.',
    };
  }
}
