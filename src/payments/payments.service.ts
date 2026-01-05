import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from 'src/database/database.service';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { v4 as uuidv4 } from 'uuid';
import {
  SSLCommerzInitData,
  SSLCommerzInitResponse,
  SSLCommerzValidationResponse,
} from './types/sslcommerz.types';

const SSLCommerzPayment = require('sslcommerz-lts');

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private sslCommerz: any;
  private readonly storeId: string;
  private readonly storePassword: string;
  private readonly isLive: boolean;
  private readonly frontendUrl: string;
  private readonly backendUrl: string;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {
    this.storeId = this.configService.get<string>('SSLCOMMERZ_STORE_ID') || '';
    this.storePassword =
      this.configService.get<string>('SSLCOMMERZ_STORE_PASSWORD') || '';
    this.isLive =
      this.configService.get<string>('SSLCOMMERZ_IS_LIVE') === 'true';
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    this.backendUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:5000';

    if (!this.storeId || !this.storePassword) {
      this.logger.error('SSLCommerz credentials not configured');
      throw new Error('SSLCommerz credentials are required');
    }

    this.sslCommerz = new SSLCommerzPayment(
      this.storeId,
      this.storePassword,
      this.isLive,
    );

    this.logger.log(
      `SSLCommerz initialized in ${this.isLive ? 'LIVE' : 'SANDBOX'} mode`,
    );
  }

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
      include: { plan: true },
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
        include: { plan: true },
      });
    }

    // Get tenant and admin user details
    const tenant = await this.databaseService.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          where: { role: 'TENANT_ADMIN' },
          select: { id: true, name: true, email: true, phone: true },
          take: 1,
        },
      },
    });

    if (!tenant || !tenant.users.length) {
      throw new NotFoundException('Tenant or admin user not found');
    }

    const user = tenant.users[0];
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

    // Prepare SSLCommerz payment data
    const sslCommerzData: SSLCommerzInitData = {
      total_amount: plan.price,
      currency: plan.currency,
      tran_id: transactionId,
      success_url: `${this.backendUrl}/api/payments/callback/success`,
      fail_url: `${this.backendUrl}/api/payments/callback/fail`,
      cancel_url: `${this.backendUrl}/api/payments/callback/cancel`,
      ipn_url: `${this.backendUrl}/api/payments/ipn`,
      product_name: `${plan.name} Plan Subscription`,
      product_category: 'Subscription',
      product_profile: 'general',
      cus_name: user.name || 'Customer',
      cus_email: user.email,
      cus_add1: tenant.name,
      cus_city: 'Dhaka',
      cus_state: 'Dhaka',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: user.phone || '01700000000',
      shipping_method: 'NO',
    };

    try {
      // Initialize payment with SSLCommerz
      const apiResponse: SSLCommerzInitResponse =
        await this.sslCommerz.init(sslCommerzData);

      if (apiResponse.status === 'SUCCESS' && apiResponse.GatewayPageURL) {
        // Update payment with session data
        await this.databaseService.payment.update({
          where: { id: payment.id },
          data: {
            rawResponse: apiResponse as any,
          },
        });

        this.logger.log(
          `Payment initiated successfully. Transaction ID: ${transactionId}`,
        );

        return {
          message: 'Payment initiated successfully',
          data: {
            paymentId: payment.id,
            gatewayUrl: apiResponse.GatewayPageURL,
            transactionId: payment.transactionId,
            amount: plan.price,
            currency: plan.currency,
            planName: plan.name,
          },
        };
      } else {
        // Update payment as failed
        await this.databaseService.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            rawResponse: apiResponse as any,
          },
        });

        this.logger.error(
          `SSLCommerz initialization failed: ${apiResponse.failedreason || 'Unknown error'}`,
        );

        throw new BadRequestException(
          apiResponse.failedreason || 'Failed to initiate payment',
        );
      }
    } catch (error) {
      this.logger.error('SSLCommerz initialization failed:', error);

      // Update payment as failed
      await this.databaseService.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          rawResponse: { error: error.message } as any,
        },
      });

      throw new BadRequestException(
        'Failed to initiate payment. Please try again.',
      );
    }
  }

  // Handle payment success callback
  async handlePaymentSuccess(
    transactionId: string,
    validationId: string,
    rawResponse: any,
  ) {
    this.logger.log(
      `Payment success callback received: ${transactionId}, val_id: ${validationId}`,
    );

    try {
      // Validate with SSLCommerz
      const validationData = { val_id: validationId };
      const validationResponse: SSLCommerzValidationResponse =
        await this.sslCommerz.validate(validationData);

      if (
        validationResponse.status !== 'VALID' &&
        validationResponse.status !== 'VALIDATED'
      ) {
        this.logger.error(
          `Payment validation failed for transaction: ${transactionId}`,
        );
        throw new BadRequestException('Payment validation failed');
      }

      const payment = await this.databaseService.payment.findUnique({
        where: { transactionId },
        include: { subscription: { include: { plan: true } } },
      });

      if (!payment) {
        this.logger.error(
          `Payment not found for transaction: ${transactionId}`,
        );
        throw new NotFoundException('Payment not found');
      }

      if (payment.status === 'PAID') {
        this.logger.warn(
          `Payment already processed for transaction: ${transactionId}`,
        );
        return { message: 'Payment already processed', data: payment };
      }

      // Update payment status
      await this.databaseService.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          validationId,
          rawResponse: {
            ...rawResponse,
            validation: validationResponse,
          } as any,
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

      this.logger.log(
        `Payment completed and subscription activated. Transaction: ${transactionId}`,
      );

      return {
        message: 'Payment successful and subscription activated',
        data: result.data,
      };
    } catch (error) {
      this.logger.error('Error handling successful payment:', error);
      throw error;
    }
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
