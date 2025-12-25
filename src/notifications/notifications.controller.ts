import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('notifications')
@UseGuards(JwtGuard, RolesGuard)
@Roles('TENANT_ADMIN')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Get all notifications
  @Get()
  findAll(@Req() req: any) {
    return this.notificationsService.findAll(req.user.tenantId);
  }

  // Get unread count
  @Get('unread-count')
  getUnreadCount(@Req() req: any) {
    return this.notificationsService.getUnreadCount(req.user.tenantId);
  }

  // Get unread notifications
  @Get('unread')
  getUnread(@Req() req: any) {
    return this.notificationsService.getUnread(req.user.tenantId);
  }

  // Mark single as read
  @Patch(':id/read')
  markAsRead(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.notificationsService.markAsRead(req.user.tenantId, id);
  }

  // Mark all as read
  @Patch('mark-all-read')
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.tenantId);
  }

  // Delete notification
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.notificationsService.delete(req.user.tenantId, id);
  }
}
