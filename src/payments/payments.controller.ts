import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Initiate payment
  @Post('initiate')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  initiatePayment(@Body() dto: InitiatePaymentDto, @Req() req: any) {
    return this.paymentsService.initiatePayment(req.user.tenantId, dto.planId);
  }

  // SSLCommerz success callback
  @Post('callback/success')
  async handleSuccess(@Body() body: any) {
    const { tran_id, val_id } = body;
    return this.paymentsService.handlePaymentSuccess(tran_id, val_id, body);
  }

  // SSLCommerz fail callback
  @Post('callback/fail')
  async handleFail(@Body() body: any) {
    const { tran_id } = body;
    return this.paymentsService.handlePaymentFailed(tran_id, body);
  }

  // SSLCommerz cancel callback
  @Post('callback/cancel')
  async handleCancel(@Body() body: any) {
    const { tran_id } = body;
    return this.paymentsService.handlePaymentFailed(tran_id, {
      ...body,
      cancelled: true,
    });
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
  @Roles('TENANT_ADMIN')
  getHistory(@Req() req: any) {
    return this.paymentsService.getPaymentHistory(req.user.tenantId);
  }

  // Get single payment
  @Get(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  getPayment(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.paymentsService.getPayment(req.user.tenantId, id);
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
