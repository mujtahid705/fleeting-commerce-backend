import {
  All,
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Res,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { ConfigService } from '@nestjs/config';

@Controller('payments')
export class PaymentsController {
  private readonly frontendUrl: string;

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  private buildCallbackPayload(body: any, query: any) {
    return {
      ...(query ?? {}),
      ...(body ?? {}),
    };
  }

  private redirectPaymentError(res: Response, error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return res.redirect(
      `${this.frontendUrl}/payment/error?message=${encodeURIComponent(errorMessage)}`,
    );
  }

  // Initiate payment
  @Post('initiate')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  initiatePayment(@Body() dto: InitiatePaymentDto, @Req() req: any) {
    return this.paymentsService.initiatePayment(req.user.tenantId, dto.planId);
  }

  // SSLCommerz success callback
  @All('callback/success')
  async handleSuccess(
    @Body() body: any,
    @Query() query: any,
    @Res() res: Response,
  ) {
    try {
      const payload = this.buildCallbackPayload(body, query);
      const { tran_id, val_id } = payload;
      await this.paymentsService.handlePaymentSuccess(
        tran_id,
        val_id,
        payload,
      );
      return res.redirect(
        `${this.frontendUrl}/payment/success?transactionId=${tran_id}`,
      );
    } catch (error) {
      return this.redirectPaymentError(res, error);
    }
  }

  // SSLCommerz fail callback
  @All('callback/fail')
  async handleFail(
    @Body() body: any,
    @Query() query: any,
    @Res() res: Response,
  ) {
    try {
      const payload = this.buildCallbackPayload(body, query);
      const { tran_id } = payload;
      await this.paymentsService.handlePaymentFailed(tran_id, payload);
      return res.redirect(
        `${this.frontendUrl}/payment/failed?transactionId=${tran_id}`,
      );
    } catch (error) {
      return this.redirectPaymentError(res, error);
    }
  }

  // SSLCommerz cancel callback
  @All('callback/cancel')
  async handleCancel(
    @Body() body: any,
    @Query() query: any,
    @Res() res: Response,
  ) {
    try {
      const payload = this.buildCallbackPayload(body, query);
      const { tran_id } = payload;
      await this.paymentsService.handlePaymentFailed(tran_id, {
        ...payload,
        cancelled: true,
      });
      return res.redirect(
        `${this.frontendUrl}/payment/cancelled?transactionId=${tran_id}`,
      );
    } catch (error) {
      return this.redirectPaymentError(res, error);
    }
  }

  // SSLCommerz IPN (Instant Payment Notification)
  @Post('ipn')
  async handleIPN(@Body() body: any) {
    const { tran_id, val_id, status } = body;
    if (status === 'VALID' || status === 'VALIDATED') {
      return this.paymentsService.handlePaymentSuccess(tran_id, val_id, body);
    }
    return this.paymentsService.handlePaymentFailed(tran_id, body);
  }

  // Get payment history
  @Get('history')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN', 'SUPER_ADMIN')
  getHistory(@Req() req: any) {
    return this.paymentsService.getPaymentHistory(
      req.user.role === 'SUPER_ADMIN' ? undefined : req.user.tenantId,
    );
  }

  // Get single payment
  @Get(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN', 'SUPER_ADMIN')
  getPayment(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.paymentsService.getPayment(
      req.user.role === 'SUPER_ADMIN' ? undefined : req.user.tenantId,
      id,
    );
  }

  // Manual verification (dev/testing only)
  @Post('verify-manual')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  verifyManually(
    @Query('transactionId') transactionId: string,
    @Req() req: any,
  ) {
    return this.paymentsService.verifyPaymentManually(
      req.user.tenantId,
      transactionId,
    );
  }
}
