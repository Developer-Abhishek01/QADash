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

  constructor() {
    this.initializeMockDevices();
  }

  private initializeMockDevices(): void {
    const mockDevices: Device[] = [
      { id: 'device-001', name: 'Android Emulator API 33', platform: 'android', type: 'emulator', osVersion: '13', status: 'available', capabilities: ['automationName', 'platformName', 'platformVersion'], manufacturer: 'Google', model: 'Pixel 7' },
      { id: 'device-002', name: 'Android Emulator API 34', platform: 'android', type: 'emulator', osVersion: '14', status: 'available', capabilities: ['automationName', 'platformName', 'platformVersion'], manufacturer: 'Google', model: 'Pixel 8' },
      { id: 'device-003', name: 'Samsung Galaxy S23', platform: 'android', type: 'real', osVersion: '14', status: 'available', capabilities: ['automationName', 'platformName', 'platformVersion', 'deviceName'], manufacturer: 'Samsung', model: 'SM-S918B', udid: 'RF8N12345ABC' },
      { id: 'device-004', name: 'Google Pixel 8 Pro', platform: 'android', type: 'real', osVersion: '14', status: 'available', capabilities: ['automationName', 'platformName', 'platformVersion', 'deviceName'], manufacturer: 'Google', model: 'Pixel 8 Pro', udid: '1A2B3C4D5E' },
      { id: 'device-005', name: 'iPhone 15 Simulator', platform: 'ios', type: 'emulator', osVersion: '17.0', status: 'available', capabilities: ['automationName', 'platformName', 'platformVersion'], manufacturer: 'Apple', model: 'iPhone 15' },
      { id: 'device-006', name: 'iPhone 15 Pro Simulator', platform: 'ios', type: 'emulator', osVersion: '17.2', status: 'available', capabilities: ['automationName', 'platformName', 'platformVersion'], manufacturer: 'Apple', model: 'iPhone 15 Pro' },
      { id: 'device-007', name: 'iPhone 14 Pro', platform: 'ios', type: 'real', osVersion: '17.0', status: 'busy', capabilities: ['automationName', 'platformName', 'platformVersion', 'deviceName'], manufacturer: 'Apple', model: 'iPhone 14 Pro', udid: '00001234-0001234567', reservedBy: 'user-123', reservedUntil: new Date(Date.now() + 3600000) },
      { id: 'device-008', name: 'iPad Pro 12.9', platform: 'ios', type: 'real', osVersion: '17.0', status: 'available', capabilities: ['automationName', 'platformName', 'platformVersion', 'deviceName'], manufacturer: 'Apple', model: 'iPad Pro 12.9', udid: '00001234-0009876543' },
      { id: 'device-009', name: 'OnePlus 11', platform: 'android', type: 'real', osVersion: '14', status: 'maintenance', capabilities: ['automationName', 'platformName', 'platformVersion'], manufacturer: 'OnePlus', model: 'PHB110' },
      { id: 'device-010', name: 'Android Emulator API 35', platform: 'android', type: 'emulator', osVersion: '15', status: 'available', capabilities: ['automationName', 'platformName', 'platformVersion'], manufacturer: 'Google', model: 'Pixel 9' },
    ];

    mockDevices.forEach(device => this.devices.set(device.id, device));
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