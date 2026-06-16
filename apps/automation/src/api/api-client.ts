import { APIRequestContext, request } from '@playwright/test';
import { Logger } from '../utils/logger';
import { RequestInterceptor } from './interceptors/request.interceptor';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { TokenManager } from './auth/token.manager';

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  auth?: AuthConfig;
}

export interface AuthConfig {
  type: 'bearer' | 'basic' | 'apiKey' | 'oauth2';
  token?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  tokenEndpoint?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  path: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string | number | boolean>;
  body?: unknown;
  formData?: Record<string, string>;
  multipart?: Record<string, unknown>;
  timeout?: number;
  retries?: number;
}

export interface ApiResponse<T = unknown> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: T;
  rawBody?: string;
  responseTime: number;
  request: RequestInfo;
}

export interface RequestInfo {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
}

export class ApiClient {
  private requestContext!: APIRequestContext;
  private logger: Logger;
  private config: ApiClientConfig;
  private tokenManager: TokenManager;
  private requestInterceptor: RequestInterceptor;
  private responseInterceptor: ResponseInterceptor;

  constructor(config: ApiClientConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger || new Logger('ApiClient');
    this.tokenManager = new TokenManager(this.logger);
    this.requestInterceptor = new RequestInterceptor(this.logger);
    this.responseInterceptor = new ResponseInterceptor(this.logger);
  }

  async init(): Promise<void> {
    this.requestContext = await request.newContext({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout || 30000,
      extraHTTPHeaders: this.config.headers,
    });
    this.logger.info(`API Client initialized with base URL: ${this.config.baseURL}`);
  }

  async dispose(): Promise<void> {
    await this.requestContext.dispose();
    this.logger.info('API Client disposed');
  }

  async request<T = unknown>(options: RequestOptions): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    const url = this.buildUrl(options.path, options.queryParams);
    const headers = this.buildHeaders(options.headers);

    this.requestInterceptor.intercept(options, headers);

    let lastError: Error | undefined;
    const maxRetries = options.retries ?? this.config.retries ?? 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const partialResponse = await this.executeRequest<T>(
          options.method,
          url,
          headers,
          options.body,
          options.formData,
          options.multipart,
          options.timeout
        );

        const response: ApiResponse<T> = {
          ...partialResponse,
          responseTime: Date.now() - startTime,
          request: {
            method: options.method,
            path: options.path,
            headers,
            body: options.body,
          },
        };

        this.responseInterceptor.intercept(response);

        return response;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Request attempt ${attempt + 1} failed: ${lastError.message}`);
        
        if (attempt < maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError;
  }

  private async executeRequest<T>(
    method: string,
    url: string,
    headers: Record<string, string>,
    body?: unknown,
    formData?: Record<string, string>,
    multipart?: any,
    timeout?: number
  ): Promise<{ status: number; statusText: string; headers: Record<string, string>; body: T; rawBody?: string }> {
    const requestOptions: any = {
      method,
      headers,
      timeout,
    };

    if (body) requestOptions.data = body;
    if (formData) requestOptions.form = formData;
    if (multipart) requestOptions.multipart = multipart;

    const response = await this.requestContext.fetch(url, requestOptions);

    const responseBody = await this.parseResponseBody<T>(response);
    const responseHeaders = response.headers();

    return {
      status: response.status(),
      statusText: response.statusText(),
      headers: responseHeaders,
      body: responseBody,
      rawBody: await response.text(),
    };
  }

  private async parseResponseBody<T>(response: { text(): Promise<string>; json(): Promise<T> }): Promise<T> {
    const text = await response.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  private buildUrl(path: string, queryParams?: Record<string, string | number | boolean>): string {
    const url = new URL(path, this.config.baseURL);
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    return url.toString();
  }

  private buildHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
      ...additionalHeaders,
    };

    if (this.config.auth) {
      const token = this.tokenManager.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async setAuthToken(token: string): Promise<void> {
    this.tokenManager.setToken(token);
  }

  async refreshAuthToken(): Promise<void> {
    if (this.config.auth?.type === 'oauth2' && this.config.auth.tokenEndpoint) {
      const token = await this.tokenManager.refreshToken(
        this.config.auth.tokenEndpoint,
        {
          client_id: this.config.auth.clientId || '',
          client_secret: this.config.auth.clientSecret || '',
          grant_type: 'refresh_token',
        }
      );
      this.tokenManager.setToken(token);
    }
  }

  get(path: string, options?: Partial<RequestOptions>): Promise<ApiResponse> {
    return this.request({ method: 'GET', path, ...options });
  }

  post(path: string, body?: unknown, options?: Partial<RequestOptions>): Promise<ApiResponse> {
    return this.request({ method: 'POST', path, body, ...options });
  }

  put(path: string, body?: unknown, options?: Partial<RequestOptions>): Promise<ApiResponse> {
    return this.request({ method: 'PUT', path, body, ...options });
  }

  patch(path: string, body?: unknown, options?: Partial<RequestOptions>): Promise<ApiResponse> {
    return this.request({ method: 'PATCH', path, body, ...options });
  }

  delete(path: string, options?: Partial<RequestOptions>): Promise<ApiResponse> {
    return this.request({ method: 'DELETE', path, ...options });
  }

  head(path: string, options?: Partial<RequestOptions>): Promise<ApiResponse> {
    return this.request({ method: 'HEAD', path, ...options });
  }

  options(path: string, options?: Partial<RequestOptions>): Promise<ApiResponse> {
    return this.request({ method: 'OPTIONS', path, ...options });
  }
}