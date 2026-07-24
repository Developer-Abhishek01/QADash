import { Injectable } from '@nestjs/common';

import { LoggerService } from '../../common/logging';

export interface Device {
  id: string;
  name: string;
  platform: 'android' | 'ios';
  type: 'emulator' | 'real';
  osVersion: string;
  manufacturer?: string;
  model?: string;
  udid?: string;
  host?: string;
  port?: number;
  status: 'available' | 'busy' | 'offline' | 'maintenance';
  capabilities: string[];
  lastUsed?: Date;
  reservedBy?: string;
  reservedUntil?: Date;
  projectId?: string;
}

export interface DeviceReservation {
  deviceId: string;
  userId: string;
  reservedAt: Date;
  expiresAt: Date;
}

@Injectable()
export class DeviceManagementService {
  private devices: Map<string, Device> = new Map();
  private reservations: Map<string, DeviceReservation> = new Map();
  private readonly logger = new LoggerService({} as any);
  private appiumUrl: string;

  constructor() {
    this.appiumUrl = process.env.APPIUM_URL || 'http://localhost:4723';
    this.discoverAppiumDevices();
  }

  private async discoverAppiumDevices(): Promise<void> {
    try {
      const response = await fetch(`${this.appiumUrl}/wd/hub/sessions`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return;
      const sessions: { value?: any[] } = await response.json();
      if (sessions?.value) {
        for (const session of sessions.value) {
          const caps = session.capabilities || {};
          this.devices.set(session.id, {
            id: session.id,
            name: caps.deviceName || caps.deviceUDID || `Device-${session.id}`,
            platform: (caps.platformName || '').toLowerCase() as 'android' | 'ios',
            type: caps.isEmulator ? 'emulator' : 'real',
            osVersion: caps.platformVersion || '',
            manufacturer: caps.deviceManufacturer,
            model: caps.deviceModel || caps.deviceName,
            udid: caps.deviceUDID,
            host: new URL(this.appiumUrl).hostname,
            port: parseInt(new URL(this.appiumUrl).port, 10) || 4723,
            status: 'available',
            capabilities: Object.keys(caps),
          });
        }
      }
    } catch {
      this.logger.logBusinessEvent({
        event: 'appium_discovery_failed',
        entity: 'device',
        entityId: 'appium',
        metadata: { appiumUrl: this.appiumUrl, error: 'Appium server not reachable' },
      });
    }
  }

  async refreshDevices(): Promise<Device[]> {
    this.devices.clear();
    await this.discoverAppiumDevices();
    return this.getDevices();
  }

  async getDevices(platform?: 'android' | 'ios'): Promise<Device[]> {
    const devices = Array.from(this.devices.values());
    if (platform) {
      return devices.filter(d => d.platform === platform);
    }
    return devices;
  }

  async getAvailableDevices(platform: 'android' | 'ios', osVersion?: string): Promise<Device[]> {
    let devices = Array.from(this.devices.values()).filter(d => d.platform === platform && d.status === 'available');
    
    if (osVersion) {
      devices = devices.filter(d => d.osVersion === osVersion);
    }

    return devices;
  }

  async getDeviceById(deviceId: string): Promise<Device | null> {
    return this.devices.get(deviceId) || null;
  }

  async registerDevice(deviceData: {
    name: string;
    platform: 'android' | 'ios';
    type: 'emulator' | 'real';
    osVersion: string;
    manufacturer?: string;
    model?: string;
    udid?: string;
    host?: string;
    port?: number;
  }): Promise<{ deviceId: string }> {
    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const device: Device = {
      id: deviceId,
      name: deviceData.name,
      platform: deviceData.platform,
      type: deviceData.type,
      osVersion: deviceData.osVersion,
      manufacturer: deviceData.manufacturer,
      model: deviceData.model,
      udid: deviceData.udid,
      host: deviceData.host,
      port: deviceData.port,
      status: 'available',
      capabilities: ['automationName', 'platformName', 'platformVersion'],
    };

    this.devices.set(deviceId, device);

    this.logger.logBusinessEvent({
      event: 'device_registered',
      entity: 'device',
      entityId: deviceId,
      metadata: { platform: deviceData.platform, type: deviceData.type },
    });

    return { deviceId };
  }

  async unregisterDevice(deviceId: string): Promise<void> {
    this.devices.delete(deviceId);
    this.reservations.delete(deviceId);

    this.logger.logBusinessEvent({
      event: 'device_unregistered',
      entity: 'device',
      entityId: deviceId,
    });
  }

  async reserveDevice(deviceId: string, userId: string): Promise<{ reservationId: string }> {
    const device = this.devices.get(deviceId);
    
    if (!device) {
      throw new Error('Device not found');
    }

    if (device.status !== 'available') {
      throw new Error(`Device is not available. Current status: ${device.status}`);
    }

    const reservationId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 3600000);

    const reservation: DeviceReservation = {
      deviceId,
      userId,
      reservedAt: new Date(),
      expiresAt,
    };

    device.status = 'busy';
    device.reservedBy = userId;
    device.reservedUntil = expiresAt;
    this.devices.set(deviceId, device);
    this.reservations.set(reservationId, reservation);

    this.logger.logBusinessEvent({
      event: 'device_reserved',
      entity: 'device',
      entityId: deviceId,
      metadata: { userId, reservationId },
    });

    return { reservationId };
  }

  async releaseDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    
    if (!device) {
      throw new Error('Device not found');
    }

    device.status = 'available';
    device.reservedBy = undefined;
    device.reservedUntil = undefined;
    this.devices.set(deviceId, device);

    for (const [resId, res] of this.reservations.entries()) {
      if (res.deviceId === deviceId) {
        this.reservations.delete(resId);
      }
    }

    this.logger.logBusinessEvent({
      event: 'device_released',
      entity: 'device',
      entityId: deviceId,
    });
  }

  async updateDeviceStatus(deviceId: string, status: Device['status']): Promise<void> {
    const device = this.devices.get(deviceId);
    
    if (!device) {
      throw new Error('Device not found');
    }

    device.status = status;
    this.devices.set(deviceId, device);
  }

  async getDevicesByProject(projectId: string): Promise<Device[]> {
    return Array.from(this.devices.values()).filter(d => d.projectId === projectId);
  }

  async getDeviceStats(): Promise<Record<string, unknown>> {
    const devices = Array.from(this.devices.values());
    
    const byPlatform = {
      android: devices.filter(d => d.platform === 'android').length,
      ios: devices.filter(d => d.platform === 'ios').length,
    };

    const byType = {
      emulator: devices.filter(d => d.type === 'emulator').length,
      real: devices.filter(d => d.type === 'real').length,
    };

    const byStatus = {
      available: devices.filter(d => d.status === 'available').length,
      busy: devices.filter(d => d.status === 'busy').length,
      offline: devices.filter(d => d.status === 'offline').length,
      maintenance: devices.filter(d => d.status === 'maintenance').length,
    };

    return {
      total: devices.length,
      byPlatform,
      byType,
      byStatus,
      utilization: Math.round(((byStatus.busy / devices.length) * 100) || 0),
    };
  }

  async updateDevice(deviceId: string, updates: Partial<Device>): Promise<Device> {
    const device = this.devices.get(deviceId);
    
    if (!device) {
      throw new Error('Device not found');
    }

    const updatedDevice = { ...device, ...updates };
    this.devices.set(deviceId, updatedDevice);

    return updatedDevice;
  }

  async getEmulators(platform: 'android' | 'ios'): Promise<Device[]> {
    return Array.from(this.devices.values()).filter(d => d.platform === platform && d.type === 'emulator');
  }

  async getRealDevices(platform: 'android' | 'ios'): Promise<Device[]> {
    return Array.from(this.devices.values()).filter(d => d.platform === platform && d.type === 'real');
  }
}