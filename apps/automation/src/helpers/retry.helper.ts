import { Logger } from '../utils/logger';

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export class RetryHelper {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('RetryHelper');
  }

  async retry<T>(
    fn: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    const {
      maxAttempts,
      delayMs,
      backoffMultiplier = 1.5,
      maxDelayMs = 30000,
      retryCondition,
      onRetry,
    } = options;

    let lastError: Error | undefined;
    let currentDelay = delayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (retryCondition && !retryCondition(lastError)) {
          throw lastError;
        }

        if (attempt === maxAttempts) {
          this.logger.error(`All ${maxAttempts} attempts failed. Last error: ${lastError.message}`);
          throw lastError;
        }

        if (onRetry) {
          onRetry(attempt, lastError);
        }

        this.logger.warn(`Attempt ${attempt}/${maxAttempts} failed: ${lastError.message}. Retrying in ${currentDelay}ms...`);
        
        await this.sleep(currentDelay);
        
        currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelayMs);
      }
    }

    throw lastError;
  }

  async retryWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    intervalMs = 1000
  ): Promise<T> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        return await fn();
      } catch (error) {
        if (Date.now() - startTime >= timeoutMs) {
          throw error;
        }
        await this.sleep(intervalMs);
      }
    }
    
    throw new Error('Timeout exceeded');
  }

  async retryUntil<T>(
    fn: () => Promise<T>,
    condition: (result: T) => boolean,
    options: { maxAttempts: number; delayMs: number }
  ): Promise<T> {
    for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
      const result = await fn();
      
      if (condition(result)) {
        return result;
      }

      if (attempt < options.maxAttempts) {
        await this.sleep(options.delayMs);
      }
    }

    throw new Error(`Condition not met after ${options.maxAttempts} attempts`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const retry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> => {
  const helper = new RetryHelper();
  return helper.retry(fn, options);
};

export const retryUntil = async <T>(
  fn: () => Promise<T>,
  condition: (result: T) => boolean,
  options: { maxAttempts: number; delayMs: number }
): Promise<T> => {
  const helper = new RetryHelper();
  return helper.retryUntil(fn, condition, options);
};