import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings() { return this.settingsService.getSettings(); }

  @Put()
  updateSettings(@Body() data: Record<string, unknown>) { return this.settingsService.updateSettings(data); }

  @Get('team')
  getTeam() { return this.settingsService.getTeam(); }

  @Put('team')
  updateTeam(@Body() data: { userId: string; role: string }[]) { return this.settingsService.updateTeam(data); }

  @Get('integrations')
  getIntegrations() { return this.settingsService.getIntegrations(); }

  @Put('integrations')
  updateIntegrations(@Body() data: Record<string, unknown>) { return this.settingsService.updateIntegrations(data); }
}
