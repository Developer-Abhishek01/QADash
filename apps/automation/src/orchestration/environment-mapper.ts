import { Logger } from '../utils/logger';
import { EnvironmentConfig } from './execution-engine';

export interface BrowserConfig {
  type: 'chromium' | 'firefox' | 'webkit' | 'mobile';
  version?: string;
  headless: boolean;
  viewport: { width: number; height: number };
  deviceScaleFactor?: number;
  userAgent?: string;
  timezone?: string;
  locale?: string;
  permissions?: string[];
  args?: string[];
}

export interface EnvironmentMapping {
  environmentId: string;
  browserConfig: BrowserConfig;
  capabilities: BrowserCapabilities;
  timeouts: TimeoutsConfig;
  screenshots: ScreenshotConfig;
  videos: VideoConfig;
}

export interface BrowserCapabilities {
  acceptDownloads: boolean;
  ignoreHTTPSErrors: boolean;
  javaScriptEnabled: boolean;
  contextOptions?: Record<string, unknown>;
}

export interface TimeoutsConfig {
  action: number;
  navigation: number;
  test: number;
  expect: number;
}

export interface ScreenshotConfig {
  mode: 'on-failure' | 'always' | 'never';
  fullPage: boolean;
  delay?: number;
}

export interface VideoConfig {
  mode: 'on-failure' | 'always' | 'never';
  size: { width: number; height: number };
}

export class EnvironmentMapper {
  private logger: Logger;
  private mappings: Map<string, EnvironmentMapping> = new Map();

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('EnvironmentMapper');
    this.initializeDefaultMappings();
  }

  private initializeDefaultMappings(): void {
    this.mappings.set('chromium', {
      environmentId: 'chromium',
      browserConfig: {
        type: 'chromium',
        headless: true,
        viewport: { width: 1920, height: 1080 },
      },
      capabilities: {
        acceptDownloads: true,
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true,
      },
      timeouts: {
        action: 10000,
        navigation: 30000,
        test: 60000,
        expect: 5000,
      },
      screenshots: {
        mode: 'on-failure',
        fullPage: true,
      },
      videos: {
        mode: 'on-failure',
        size: { width: 1920, height: 1080 },
      },
    });

    this.mappings.set('firefox', {
      environmentId: 'firefox',
      browserConfig: {
        type: 'firefox',
        headless: true,
        viewport: { width: 1920, height: 1080 },
      },
      capabilities: {
        acceptDownloads: true,
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true,
      },
      timeouts: {
        action: 15000,
        navigation: 45000,
        test: 90000,
        expect: 7000,
      },
      screenshots: {
        mode: 'on-failure',
        fullPage: true,
      },
      videos: {
        mode: 'on-failure',
        size: { width: 1920, height: 1080 },
      },
    });

    this.mappings.set('mobile-chrome', {
      environmentId: 'mobile-chrome',
      browserConfig: {
        type: 'mobile',
        headless: true,
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 3,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        timezone: 'America/New_York',
        locale: 'en-US',
      },
      capabilities: {
        acceptDownloads: false,
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true,
      },
      timeouts: {
        action: 20000,
        navigation: 60000,
        test: 120000,
        expect: 10000,
      },
      screenshots: {
        mode: 'on-failure',
        fullPage: false,
      },
      videos: {
        mode: 'never',
        size: { width: 375, height: 812 },
      },
    });
  }

  mapEnvironment(environment: EnvironmentConfig, browser: string): EnvironmentMapping {
    const baseMapping = this.mappings.get(browser) || this.mappings.get('chromium')!;
    
    return {
      ...baseMapping,
      environmentId: environment.id,
      browserConfig: {
        ...baseMapping.browserConfig,
        type: this.getBrowserType(browser),
      },
      timeouts: {
        ...baseMapping.timeouts,
      },
    };
  }

  private getBrowserType(browser: string): 'chromium' | 'firefox' | 'webkit' | 'mobile' {
    if (browser.includes('mobile')) return 'mobile';
    if (browser === 'firefox') return 'firefox';
    if (browser === 'webkit') return 'webkit';
    return 'chromium';
  }

  getMapping(environmentId: string): EnvironmentMapping | undefined {
    return this.mappings.get(environmentId);
  }

  setMapping(environmentId: string, mapping: EnvironmentMapping): void {
    this.mappings.set(environmentId, mapping);
    this.logger.info(`Environment mapping set for: ${environmentId}`);
  }

  getAllMappings(): EnvironmentMapping[] {
    return Array.from(this.mappings.values());
  }

  createBrowserConfig(browser: string, headless = true): BrowserConfig {
    const mapping = this.mappings.get(browser);
    return mapping?.browserConfig || {
      type: 'chromium',
      headless,
      viewport: { width: 1920, height: 1080 },
    };
  }

  getTimeouts(environmentId: string): TimeoutsConfig {
    const mapping = this.mappings.get(environmentId);
    return mapping?.timeouts || {
      action: 10000,
      navigation: 30000,
      test: 60000,
      expect: 5000,
    };
  }

  getScreenshotConfig(environmentId: string): ScreenshotConfig {
    const mapping = this.mappings.get(environmentId);
    return mapping?.screenshots || { mode: 'on-failure', fullPage: true };
  }

  getVideoConfig(environmentId: string): VideoConfig {
    const mapping = this.mappings.get(environmentId);
    return mapping?.videos || { mode: 'on-failure', size: { width: 1920, height: 1080 } };
  }
}