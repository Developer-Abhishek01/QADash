import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AppiumCapabilities {
  platformName: 'Android' | 'iOS';
  platformVersion: string;
  deviceName: string;
  automationName: 'UiAutomator2' | 'XCUITest' | 'Espresso';
  app?: string;
  appPackage?: string;
  appActivity?: string;
  bundleId?: string;
  udid?: string;
  browserName?: string;
  newCommandTimeout?: number;
  noReset?: boolean;
  fullReset?: boolean;
  autoGrantPermissions?: boolean;
  allowSessionOverride?: boolean;
  autoAcceptAlerts?: boolean;
  disableWindowAnimation?: boolean;
  nativeWebScreenshot?: boolean;
  screenshotWaitTimeout?: number;
  [key: string]: unknown;
}

export interface AppiumSession {
  sessionId: string;
  deviceId: string;
  capabilities: AppiumCapabilities;
  status: 'starting' | 'running' | 'stopping' | 'stopped';
  startTime: Date;
  endTime?: Date;
}

export interface MobileElement {
  id: string;
  locator: string;
  value: string;
  text?: string;
  displayed?: boolean;
  enabled?: boolean;
  selected?: boolean;
}

@Injectable()
export class AppiumService {
  private readonly appiumUrl: string;
  private readonly logger = new Logger(AppiumService.name);

  constructor(private readonly configService: ConfigService) {
    this.appiumUrl = this.configService.get<string>('APPIUM_URL', 'http://127.0.0.1:4723');
  }

  async createSession(deviceId: string, capabilities: AppiumCapabilities): Promise<{ sessionId: string }> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ desiredCapabilities: capabilities }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Appium create session failed: ${response.status} - ${text}`);
    }

    const data = await response.json() as any;
    const sessionId = data.value?.sessionId || data.sessionId;

    if (!sessionId) {
      throw new Error('Appium did not return a session ID');
    }

    this.logger.log(`Session created: ${sessionId} for device ${deviceId} (${capabilities.platformName})`);

    return { sessionId };
  }

  async endSession(sessionId: string): Promise<void> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 404) {
      const text = await response.text();
      throw new Error(`Appium end session failed: ${response.status} - ${text}`);
    }

    this.logger.log(`Session ended: ${sessionId}`);
  }

  async getSession(sessionId: string): Promise<AppiumSession | null> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}`);

    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Appium get session failed: ${response.status}`);

    const data = await response.json() as any;
    const value = data.value || data;

    return {
      sessionId,
      deviceId: value.capabilities?.deviceName || value.deviceUDID || '',
      capabilities: value.capabilities || value,
      status: 'running',
      startTime: new Date(),
    };
  }

  async findElement(sessionId: string, locator: string, value: string): Promise<MobileElement> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/element`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ using: locator, value }),
    });

    if (!response.ok) throw new Error(`Appium find element failed: ${response.status}`);

    const data = await response.json() as any;
    const elementId = data.value?.ELEMENT || data.value?.elementId || data.ELEMENT;

    return {
      id: elementId,
      locator,
      value,
      displayed: true,
      enabled: true,
      selected: false,
    };
  }

  async findElements(sessionId: string, locator: string, value: string): Promise<MobileElement[]> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/elements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ using: locator, value }),
    });

    if (!response.ok) throw new Error(`Appium find elements failed: ${response.status}`);

    const data = await response.json() as any;
    const elements = data.value || [];

    return elements.map((el: any) => {
      const id = el.ELEMENT || el.elementId;
      return { id, locator, value, displayed: true, enabled: true };
    });
  }

  async clickElement(sessionId: string, elementId: string): Promise<void> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/element/${elementId}/click`, {
      method: 'POST',
    });

    if (!response.ok) throw new Error(`Appium click failed: ${response.status}`);
  }

  async sendKeys(sessionId: string, elementId: string, text: string): Promise<void> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/element/${elementId}/value`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: [...text] }),
    });

    if (!response.ok) throw new Error(`Appium send keys failed: ${response.status}`);
  }

  async getText(sessionId: string, elementId: string): Promise<string> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/element/${elementId}/text`);

    if (!response.ok) throw new Error(`Appium get text failed: ${response.status}`);

    const data = await response.json() as any;
    return data.value || '';
  }

  async getAttribute(sessionId: string, elementId: string, attribute: string): Promise<string> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/element/${elementId}/attribute/${attribute}`);

    if (!response.ok) throw new Error(`Appium get attribute failed: ${response.status}`);

    const data = await response.json() as any;
    return data.value || '';
  }

  async isDisplayed(sessionId: string, elementId: string): Promise<boolean> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/element/${elementId}/displayed`);

    if (!response.ok) throw new Error(`Appium isDisplayed failed: ${response.status}`);

    const data = await response.json() as any;
    return data.value === true;
  }

  async isEnabled(sessionId: string, elementId: string): Promise<boolean> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/element/${elementId}/enabled`);

    if (!response.ok) throw new Error(`Appium isEnabled failed: ${response.status}`);

    const data = await response.json() as any;
    return data.value === true;
  }

  async takeScreenshot(sessionId: string): Promise<string> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/screenshot`);

    if (!response.ok) throw new Error(`Appium screenshot failed: ${response.status}`);

    const data = await response.json() as any;
    return data.value || '';
  }

  async startRecording(sessionId: string): Promise<{ recordingId: string }> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/appium/start_recording_screen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: {} }),
    });

    if (!response.ok) throw new Error(`Appium start recording failed: ${response.status}`);

    this.logger.log(`Recording started: ${sessionId}`);

    return { recordingId: `rec_${sessionId}_${Date.now()}` };
  }

  async stopRecording(sessionId: string): Promise<string> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/appium/stop_recording_screen`, {
      method: 'POST',
    });

    if (!response.ok) throw new Error(`Appium stop recording failed: ${response.status}`);

    const data = await response.json() as any;

    this.logger.log(`Recording stopped: ${sessionId}`);

    return data.value || '';
  }

  async getSessionLogs(sessionId: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'client' }),
      });

      if (!response.ok) return [];
      const data = await response.json() as any;
      return (data.value || []).map((entry: any) => entry.message || '');
    } catch {
      return [];
    }
  }

  async installApp(sessionId: string, appPath: string): Promise<void> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/appium/device/install_app`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appPath }),
    });

    if (!response.ok) throw new Error(`Appium install app failed: ${response.status}`);
  }

  async uninstallApp(sessionId: string, appPackage: string): Promise<void> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/appium/device/uninstall_app`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: appPackage }),
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Appium uninstall app failed: ${response.status}`);
    }
  }

  async resetApp(sessionId: string): Promise<void> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/appium/app/reset`, {
      method: 'POST',
    });

    if (!response.ok) throw new Error(`Appium reset app failed: ${response.status}`);
  }

  async swipe(sessionId: string, startX: number, startY: number, endX: number, endY: number, _duration?: number): Promise<void> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/touch/perform`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actions: [
          { action: 'press', options: { x: startX, y: startY } },
          { action: 'wait', options: { ms: _duration || 300 } },
          { action: 'moveTo', options: { x: endX, y: endY } },
          { action: 'release' },
        ],
      }),
    });

    if (!response.ok) throw new Error(`Appium swipe failed: ${response.status}`);
  }

  async pinch(sessionId: string, scale: number, _duration?: number): Promise<void> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/appium/perform_multitouch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actions: [
          [
            { action: 'press', options: { x: 100, y: 200 } },
            { action: 'moveTo', options: { x: Math.round(100 * scale), y: Math.round(200 * scale) } },
            { action: 'release' },
          ],
          [
            { action: 'press', options: { x: 300, y: 400 } },
            { action: 'moveTo', options: { x: Math.round(300 / scale), y: Math.round(400 / scale) } },
            { action: 'release' },
          ],
        ],
      }),
    });

    if (!response.ok) throw new Error(`Appium pinch failed: ${response.status}`);
  }

  async zoom(sessionId: string, scale: number, _duration?: number): Promise<void> {
    await this.pinch(sessionId, 1 / scale);
  }

  async getDeviceTime(sessionId: string): Promise<string> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/appium/device/system_time`);

    if (!response.ok) throw new Error(`Appium get device time failed: ${response.status}`);

    const data = await response.json() as any;
    return data.value || new Date().toISOString();
  }

  async getNetworkConnection(sessionId: string): Promise<number> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/network_connection`);

    if (!response.ok) throw new Error(`Appium get network connection failed: ${response.status}`);

    const data = await response.json() as any;
    return data.value || 0;
  }

  async setNetworkConnection(sessionId: string, connectionType: number): Promise<void> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/network_connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: connectionType }),
    });

    if (!response.ok) throw new Error(`Appium set network connection failed: ${response.status}`);
  }

  async getDeviceCapabilities(sessionId: string): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}`);

    if (!response.ok) throw new Error(`Appium get capabilities failed: ${response.status}`);

    const data = await response.json() as any;
    return data.value?.capabilities || data.value || {};
  }

  async executeScript(sessionId: string, script: string, args?: unknown[]): Promise<unknown> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/execute/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script, args: args || [] }),
    });

    if (!response.ok) throw new Error(`Appium execute script failed: ${response.status}`);

    const data = await response.json() as any;
    return data.value;
  }

  async getActiveElement(sessionId: string): Promise<MobileElement> {
    const response = await fetch(`${this.appiumUrl}/wd/hub/session/${sessionId}/element/active`, {
      method: 'POST',
    });

    if (!response.ok) throw new Error(`Appium get active element failed: ${response.status}`);

    const data = await response.json() as any;
    const elementId = data.value?.ELEMENT || data.value?.elementId || data.ELEMENT;

    return { id: elementId, locator: 'active', value: 'active', displayed: true, enabled: true };
  }

  getDefaultCapabilities(platform: 'android' | 'ios', deviceName: string): AppiumCapabilities {
    if (platform === 'android') {
      return {
        platformName: 'Android',
        platformVersion: '14',
        deviceName,
        automationName: 'UiAutomator2',
        noReset: true,
        autoGrantPermissions: true,
        newCommandTimeout: 300,
      };
    }

    return {
      platformName: 'iOS',
      platformVersion: '17.0',
      deviceName,
      automationName: 'XCUITest',
      noReset: true,
      newCommandTimeout: 300,
    };
  }
}