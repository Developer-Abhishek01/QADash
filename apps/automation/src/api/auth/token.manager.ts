import { Logger } from '../../utils/logger';

export interface TokenInfo {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
}

export class TokenManager {
  private token: string | null = null;
  private storedRefreshToken: string | null = null;
  private expiresAt: number | null = null;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  setToken(token: string, refreshToken?: string, expiresIn?: number): void {
    this.token = token;
    this.storedRefreshToken = refreshToken || null;
    this.expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : null;
    this.logger.debug(`Token set, expires at: ${this.expiresAt ? new Date(this.expiresAt).toISOString() : 'never'}`);
  }

  getToken(): string | null {
    if (this.token && this.isExpired()) {
      this.logger.warn('Token is expired');
      return null;
    }
    return this.token;
  }

  getRefreshToken(): string | null {
    return this.storedRefreshToken;
  }

  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return Date.now() >= this.expiresAt;
  }

  async refreshToken(endpoint: string, params: Record<string, string>): Promise<string> {
    this.logger.info(`Refreshing token at: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.setToken(data.access_token, data.refresh_token, data.expires_in);
    return data.access_token;
  }

  clear(): void {
    this.token = null;
    this.storedRefreshToken = null;
    this.expiresAt = null;
    this.logger.debug('Token cleared');
  }

  hasToken(): boolean {
    return !!this.token && !this.isExpired();
  }

  async getValidToken(): Promise<string> {
    const token = this.getToken();
    if (token) return token;

    if (this.storedRefreshToken) {
      return this.storedRefreshToken;
    }

    throw new Error('No valid token available');
  }
}

export class TokenStorage {
  private tokens: Map<string, TokenInfo> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  save(key: string, token: TokenInfo): void {
    this.tokens.set(key, token);
    this.logger.debug(`Token saved for: ${key}`);
  }

  get(key: string): TokenInfo | undefined {
    return this.tokens.get(key);
  }

  delete(key: string): void {
    this.tokens.delete(key);
    this.logger.debug(`Token deleted for: ${key}`);
  }

  clear(): void {
    this.tokens.clear();
    this.logger.debug('All tokens cleared');
  }

  has(key: string): boolean {
    return this.tokens.has(key);
  }

  getAll(): Map<string, TokenInfo> {
    return new Map(this.tokens);
  }
}