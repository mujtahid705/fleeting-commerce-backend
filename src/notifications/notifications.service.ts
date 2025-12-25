import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  // Get all notifications for tenant
  async findAll(tenantId: string) {
    const notifications = await this.databaseService.notification.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return {
      message: 'Notifications fetched successfully',
      data: notifications,
    };
  }

  // Get unread count
  async getUnreadCount(tenantId: string) {
    const count = await this.databaseService.notification.count({
      where: { tenantId, isRead: false },
    });
    return { message: 'Unread count fetched', data: { unreadCount: count } };
  }

  // Get unread notifications
  async getUnread(tenantId: string) {
    const notifications = await this.databaseService.notification.findMany({
      where: { tenantId, isRead: false },
      orderBy: { createdAt: 'desc' },
    });
    return { message: 'Unread notifications fetched', data: notifications };
  }

  // Mark single as read
  async markAsRead(tenantId: string, notificationId: string) {
    const notification = await this.databaseService.notification.findFirst({
      where: { id: notificationId, tenantId },
    });

    if (!notification) throw new NotFoundException('Notification not found');

    const updated = await this.databaseService.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
    return { message: 'Notification marked as read', data: updated };
  }

  // Mark all as read
  async markAllAsRead(tenantId: string) {
    await this.databaseService.notification.updateMany({
      where: { tenantId, isRead: false },
      data: { isRead: true },
    });
    return { message: 'All notifications marked as read' };
  }

  // Delete notification
  async delete(tenantId: string, notificationId: string) {
    const notification = await this.databaseService.notification.findFirst({
      where: { id: notificationId, tenantId },
    });

    if (!notification) throw new NotFoundException('Notification not found');

    await this.databaseService.notification.delete({
      where: { id: notificationId },
    });
    return { message: 'Notification deleted successfully' };
  }

  // Create notification
  async createNotification(
    tenantId: string,
    title: string,
    message: string,
    type:
      | 'SUBSCRIPTION_EXPIRY'
      | 'SUBSCRIPTION_EXPIRED'
      | 'PAYMENT_SUCCESS'
      | 'PAYMENT_FAILED'
      | 'LIMIT_WARNING'
      | 'GENERAL',
  ) {
    const notification = await this.databaseService.notification.create({
      data: { tenantId, title, message, type },
    });
    return notification;
  }

  // Cron: Check expiring subscriptions daily at 9 AM BST (3 AM UTC)
  @Cron('0 3 * * *')
  async checkExpiringSubscriptions() {
    console.log('[Cron] Checking expiring subscriptions...');

    const subscriptions = await this.databaseService.subscription.findMany({
      where: {
        status: { in: ['TRIAL', 'ACTIVE'] },
      },
      include: { tenant: true, plan: true },
    });

    const now = new Date();
    const reminderDays = [10, 5, 2, 1, 0];

    for (const subscription of subscriptions) {
      const endDate = subscription.endDate || subscription.trialEndsAt;
      if (!endDate) continue;

      const diffTime = new Date(endDate).getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (!reminderDays.includes(daysRemaining)) continue;

      // Check if notification already sent today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const existingNotification =
        await this.databaseService.notification.findFirst({
          where: {
            tenantId: subscription.tenantId,
            type:
              daysRemaining === 0
                ? 'SUBSCRIPTION_EXPIRED'
                : 'SUBSCRIPTION_EXPIRY',
            createdAt: { gte: todayStart },
          },
        });

      if (existingNotification) continue;

      // Create notification
      let title: string;
      let message: string;
      let type: 'SUBSCRIPTION_EXPIRY' | 'SUBSCRIPTION_EXPIRED';

      if (daysRemaining === 0) {
        title = 'Subscription Expired';
        message = `Your ${subscription.plan.name} subscription has expired. Renew now to continue using all features.`;
        type = 'SUBSCRIPTION_EXPIRED';

        // Update subscription status
        await this.databaseService.subscription.update({
          where: { id: subscription.id },
          data: { status: 'EXPIRED' },
        });
      } else if (daysRemaining === 1) {
        title = 'Subscription Expires Tomorrow';
        message = `Your ${subscription.plan.name} subscription expires tomorrow. Renew now to avoid service interruption.`;
        type = 'SUBSCRIPTION_EXPIRY';
      } else {
        title = `Subscription Expires in ${daysRemaining} Days`;
        message = `Your ${subscription.plan.name} subscription will expire in ${daysRemaining} days. Renew early to avoid any interruption.`;
        type = 'SUBSCRIPTION_EXPIRY';
      }

      await this.createNotification(
        subscription.tenantId,
        title,
        message,
        type,
      );
      console.log(
        `[Cron] Notification sent to tenant ${subscription.tenantId}: ${title}`,
      );
    }

    console.log('[Cron] Subscription check completed');
  }

  // Check limit exceeded and notify
  async checkAndNotifyLimitExceeded(tenantId: string) {
    const subscription = await this.databaseService.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) return;

    const [productCount, categoryCount] = await Promise.all([
      this.databaseService.product.count({ where: { tenantId } }),
      this.databaseService.category.count({ where: { tenantId } }),
    ]);

    const violations: string[] = [];

    if (productCount > subscription.plan.maxProducts) {
      violations.push(
        `Products: ${productCount}/${subscription.plan.maxProducts}`,
      );
    }

    if (categoryCount > subscription.plan.maxCategories) {
      violations.push(
        `Categories: ${categoryCount}/${subscription.plan.maxCategories}`,
      );
    }

    if (violations.length === 0) return;

    // Check if warning already sent today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const existingWarning = await this.databaseService.notification.findFirst({
      where: {
        tenantId,
        type: 'LIMIT_WARNING',
        createdAt: { gte: todayStart },
      },
    });

    if (existingWarning) return;

    await this.createNotification(
      tenantId,
      'Plan Limit Exceeded',
      `You have exceeded your plan limits (${violations.join(', ')}). Please delete some items or upgrade your plan to restore full functionality.`,
      'LIMIT_WARNING',
    );
  }
}
