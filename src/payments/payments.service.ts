import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Initiate payment
  async initiatePayment(tenantId: string, planId: string) {
    const plan = await this.databaseService.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) throw new NotFoundException('Plan not found');
    if (!plan.isActive)
      throw new BadRequestException('This plan is no longer available');
    if (plan.price === 0) {
      throw new BadRequestException(
        'Free trial does not require payment. Use activate-trial endpoint.',
      );
    }

    let subscription = await this.databaseService.subscription.findUnique({
      where: { tenantId },
    });

    // Create subscription if doesn't exist (for first-time paid users)
    if (!subscription) {
      subscription = await this.databaseService.subscription.create({
        data: {
          tenantId,
          planId,
          status: 'EXPIRED',
          startDate: new Date(),
        },
      });
    }

    const transactionId = `TXN_${uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase()}`;

    // Create pending payment record
    const payment = await this.databaseService.payment.create({
      data: {
        tenantId,
        subscriptionId: subscription.id,
        amount: plan.price,
        currency: plan.currency,
        provider: 'sslcommerz',
        transactionId,
        status: 'PENDING',
      },
    });

    // TODO: Integrate with SSLCommerz API
    // For now, return mock data for frontend to handle
    return {
      message: 'Payment initiated successfully',
      data: {
        paymentId: payment.id,
        transactionId,
        amount: plan.price,
        currency: plan.currency,
        planName: plan.name,
        // Mock gateway URL - replace with actual SSLCommerz URL
        gatewayUrl: `https://sandbox.sslcommerz.com/gwprocess/v4/api.php`,
        // These would be SSLCommerz session data
        sessionData: {
          store_id: 'YOUR_STORE_ID',
          store_passwd: 'YOUR_STORE_PASSWORD',
          total_amount: plan.price,
          currency: plan.currency,
          tran_id: transactionId,
          success_url: `${process.env.API_URL || 'http://localhost:3000'}/payments/callback/success`,
          fail_url: `${process.env.API_URL || 'http://localhost:3000'}/payments/callback/fail`,
          cancel_url: `${process.env.API_URL || 'http://localhost:3000'}/payments/callback/cancel`,
          ipn_url: `${process.env.API_URL || 'http://localhost:3000'}/payments/ipn`,
        },
      },
    };
  }

  // Handle payment success callback
  async handlePaymentSuccess(
    transactionId: string,
    validationId: string,
    rawResponse: any,
  ) {
    const payment = await this.databaseService.payment.findUnique({
      where: { transactionId },
      include: { subscription: { include: { plan: true } } },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    if (payment.status === 'PAID') {
      return { message: 'Payment already processed', data: payment };
    }

    // Update payment status
    await this.databaseService.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        validationId,
        rawResponse,
      },
    });

    // Activate subscription
    const result = await this.subscriptionsService.activateSubscription(
      payment.tenantId,
      payment.subscription.planId,
    );

    // Send success notification
    await this.notificationsService.createNotification(
      payment.tenantId,
      'Payment Successful',
      `Your payment of ${payment.currency} ${payment.amount} for ${payment.subscription.plan.name} plan was successful. Your subscription is now active.`,
      'PAYMENT_SUCCESS',
    );

    return {
      message: 'Payment successful and subscription activated',
      data: result.data,
    };
  }

  // Handle payment failure callback
  async handlePaymentFailed(transactionId: string, rawResponse: any) {
    const payment = await this.databaseService.payment.findUnique({
      where: { transactionId },
      include: { subscription: { include: { plan: true } } },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    await this.databaseService.payment.update({
      where: { id: payment.id },
      data: {
        status: 'FAILED',
        rawResponse,
      },
    });

    await this.notificationsService.createNotification(
      payment.tenantId,
      'Payment Failed',
      `Your payment of ${payment.currency} ${payment.amount} for ${payment.subscription.plan.name} plan failed. Please try again.`,
      'PAYMENT_FAILED',
    );

    return { message: 'Payment failed', data: { transactionId } };
  }

  // Get payment history
  async getPaymentHistory(tenantId: string) {
    const payments = await this.databaseService.payment.findMany({
      where: { tenantId },
      include: {
        subscription: { include: { plan: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { message: 'Payment history fetched successfully', data: payments };
  }

  // Get single payment
  async getPayment(tenantId: string, paymentId: string) {
    const payment = await this.databaseService.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        subscription: { include: { plan: true } },
      },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    return { message: 'Payment fetched successfully', data: payment };
  }

  // Manual payment verification (for testing/development)
  async verifyPaymentManually(tenantId: string, transactionId: string) {
    const payment = await this.databaseService.payment.findFirst({
      where: { transactionId, tenantId },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    return this.handlePaymentSuccess(transactionId, 'MANUAL_VERIFICATION', {
      verified_manually: true,
      verified_at: new Date().toISOString(),
    });
  }
}
