import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';

import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Request() req: ExpressRequest, @Query('unread') unreadOnly?: boolean) { return this.notificationsService.findAll((req.user as { id: string }).id, unreadOnly); }

  @Post(':id/read')
  markAsRead(@Param('id') id: string) { return this.notificationsService.markAsRead(id); }

  @Post('read-all')
  markAllAsRead(@Request() req: ExpressRequest) { return this.notificationsService.markAllAsRead((req.user as { id: string }).id); }
}