import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Request() req: any, @Query('unread') unreadOnly?: boolean) { return this.notificationsService.findAll(req.user.id, unreadOnly); }

  @Post(':id/read')
  markAsRead(@Param('id') id: string) { return this.notificationsService.markAsRead(id); }

  @Post('read-all')
  markAllAsRead(@Request() req: any) { return this.notificationsService.markAllAsRead(req.user.id); }
}