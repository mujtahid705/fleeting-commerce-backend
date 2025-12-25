import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SelectPlanDto } from './dto/select-plan.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('subscriptions')
@UseGuards(JwtGuard, RolesGuard)
@Roles('TENANT_ADMIN')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // Get current subscription
  @Get('current')
  getCurrentSubscription(@Req() req: any) {
    return this.subscriptionsService.getCurrentSubscription(req.user.tenantId);
  }

  // Get usage vs limits
  @Get('usage')
  getUsage(@Req() req: any) {
    return this.subscriptionsService.getUsage(req.user.tenantId);
  }

  // Activate free trial
  @Post('activate-trial')
  activateTrial(@Req() req: any) {
    return this.subscriptionsService.activateTrial(req.user.tenantId);
  }

  // Select a plan
  @Post('select-plan')
  selectPlan(@Body() selectPlanDto: SelectPlanDto, @Req() req: any) {
    return this.subscriptionsService.selectPlan(
      req.user.tenantId,
      selectPlanDto.planId,
    );
  }

  // Upgrade plan
  @Post('upgrade')
  upgradePlan(@Body() selectPlanDto: SelectPlanDto, @Req() req: any) {
    return this.subscriptionsService.upgradePlan(
      req.user.tenantId,
      selectPlanDto.planId,
    );
  }

  // Downgrade plan
  @Post('downgrade')
  downgradePlan(@Body() selectPlanDto: SelectPlanDto, @Req() req: any) {
    return this.subscriptionsService.downgradePlan(
      req.user.tenantId,
      selectPlanDto.planId,
    );
  }

  // Renew subscription
  @Post('renew')
  renewSubscription(@Req() req: any) {
    return this.subscriptionsService.renewSubscription(req.user.tenantId);
  }

  // Check access status
  @Get('access-status')
  checkAccessStatus(@Req() req: any) {
    return this.subscriptionsService.checkAccess(req.user.tenantId);
  }
}
