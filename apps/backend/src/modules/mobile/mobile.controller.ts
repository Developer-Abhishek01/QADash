import { Controller, Get, Post, Body, Param, Query, Res, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { MobileService, MobileTestConfig } from './mobile.service';
import { DeviceManagementService } from './device-management.service';
import { MobileReportService } from './mobile-report.service';

@Controller('mobile')
export class MobileController {
  constructor(
    private readonly mobileService: MobileService,
    private readonly deviceManager: DeviceManagementService,
    private readonly reportService: MobileReportService,
  ) {}

  @Post('upload-app')
  async uploadApp(
    @Body() body: { projectId: string; fileName: string },
  ): Promise<{ appId: string; path: string }> {
    return { appId: `app_${Date.now()}`, path: `apps/${body.projectId}/app_${Date.now()}.apk` };
  }

  @Post('run-tests')
  async runTests(@Body() config: MobileTestConfig): Promise<{ executionId: string }> {
    return this.mobileService.runTests(config);
  }

  @Get('execution/:id')
  async getExecutionStatus(@Param('id') executionId: string): Promise<Record<string, unknown>> {
    return this.mobileService.getExecutionStatus(executionId);
  }

  @Get('devices')
  async getDevices(@Query('platform') platform?: string): Promise<any[]> {
    return this.mobileService.getDeviceList(platform);
  }

  @Post('devices')
  async registerDevice(
    @Body() body: {
      name: string;
      platform: 'android' | 'ios';
      type: 'emulator' | 'real';
      osVersion: string;
      manufacturer?: string;
      model?: string;
      udid?: string;
    },
  ): Promise<{ deviceId: string }> {
    return this.mobileService.registerDevice(body);
  }

  @Get('devices/available')
  async getAvailableDevices(
    @Query('platform') platform: 'android' | 'ios',
    @Query('osVersion') osVersion?: string,
  ): Promise<any[]> {
    return this.mobileService.getAvailableDevices(platform, osVersion);
  }

  @Post('devices/:id/reserve')
  async reserveDevice(
    @Param('id') deviceId: string,
    @Body() body: { userId: string },
  ): Promise<{ reservationId: string }> {
    return this.mobileService.reserveDevice(deviceId, body.userId);
  }

  @Post('devices/:id/release')
  async releaseDevice(@Param('id') deviceId: string): Promise<void> {
    return this.mobileService.releaseDevice(deviceId);
  }

  @Get('devices/:id')
  async getDevice(@Param('id') deviceId: string): Promise<any | null> {
    return this.deviceManager.getDeviceById(deviceId);
  }

  @Get('reports/:executionId')
  async getReport(@Param('executionId') executionId: string): Promise<any> {
    return this.mobileService.getTestReports(executionId);
  }

  @Get('reports/:executionId/json')
  async getReportJSON(@Param('executionId') executionId: string): Promise<string> {
    return this.reportService.getReportAsJSON(executionId);
  }

  @Get('reports/:executionId/xml')
  async getReportXML(@Param('executionId') executionId: string): Promise<string> {
    return this.reportService.getReportAsXML(executionId);
  }

  @Get('reports/:executionId/junit')
  async getJUnitReport(@Param('executionId') executionId: string): Promise<string> {
    return this.reportService.getJUnitReport(executionId);
  }

  @Get('reports/:executionId/html')
  async getHTMLReport(@Param('executionId') executionId: string): Promise<string> {
    return this.reportService.exportReport(executionId, 'html');
  }

  @Get('reports/:executionId/export')
  async exportReport(
    @Param('executionId') executionId: string,
    @Query('format') format: 'json' | 'xml' | 'html',
  ): Promise<string> {
    return this.reportService.exportReport(executionId, format);
  }

  @Get('statistics/devices')
  async getDeviceStatistics(): Promise<Record<string, unknown>> {
    return this.deviceManager.getDeviceStats();
  }

  @Get('statistics/reports')
  async getReportStatistics(
    @Query('projectId') projectId: string,
    @Query('days') days?: string,
  ): Promise<Record<string, unknown>> {
    return this.reportService.getTrendingData(projectId, days ? parseInt(days) : 7);
  }

  @Get('statistics/device-usage')
  async getDeviceUsageStats(): Promise<Record<string, unknown>> {
    return this.reportService.getDeviceStatistics();
  }

  @Get('emulators')
  async getEmulators(@Query('platform') platform: 'android' | 'ios'): Promise<any[]> {
    return this.deviceManager.getEmulators(platform);
  }

  @Get('real-devices')
  async getRealDevices(@Query('platform') platform: 'android' | 'ios'): Promise<any[]> {
    return this.deviceManager.getRealDevices(platform);
  }
}