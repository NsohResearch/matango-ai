/**
 * Retry Logic with Exponential Backoff
 * 
 * Provides resilient retry mechanisms for external API calls and async operations.
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  
  // Add jitter (±25%) to prevent thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(cappedDelay + jitter);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: Error, config: RetryConfig): boolean {
  // Always retry on network errors
  if (error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('fetch failed')) {
    return true;
  }
  
  // Check for specific retryable error types
  if (config.retryableErrors) {
    return config.retryableErrors.some(e => 
      error.name.includes(e) || error.message.includes(e)
    );
  }
  
  // Retry on 5xx errors (if error message contains status code)
  if (error.message.includes('500') ||
      error.message.includes('502') ||
      error.message.includes('503') ||
      error.message.includes('504')) {
    return true;
  }
  
  return false;
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig: RetryConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= fullConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on last attempt
      if (attempt === fullConfig.maxAttempts) {
        break;
      }
      
      // Check if error is retryable
      if (!isRetryableError(lastError, fullConfig)) {
        throw lastError;
      }
      
      // Calculate delay and wait
      const delayMs = calculateDelay(attempt, fullConfig);
      
      // Call onRetry callback if provided
      if (fullConfig.onRetry) {
        fullConfig.onRetry(attempt, lastError, delayMs);
      }
      
      await sleep(delayMs);
    }
  }
  
  throw lastError;
}

/**
 * Retry configuration presets for common use cases
 */
export const RetryPresets = {
  /**
   * For LLM/AI API calls - longer delays, more attempts
   */
  llmApi: {
    maxAttempts: 3,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableErrors: ['rate_limit', 'overloaded', 'timeout'],
  } as Partial<RetryConfig>,
  
  /**
   * For image/video generation - very long delays
   */
  mediaGeneration: {
    maxAttempts: 2,
    baseDelayMs: 5000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
  } as Partial<RetryConfig>,
  
  /**
   * For social media publishing - moderate retries
   */
  socialPublishing: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableErrors: ['rate_limit', 'temporary'],
  } as Partial<RetryConfig>,
  
  /**
   * For webhook processing - quick retries
   */
  webhook: {
    maxAttempts: 5,
    baseDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 1.5,
  } as Partial<RetryConfig>,
  
  /**
   * For database operations - very quick retries
   */
  database: {
    maxAttempts: 3,
    baseDelayMs: 100,
    maxDelayMs: 1000,
    backoffMultiplier: 2,
    retryableErrors: ['deadlock', 'lock wait timeout'],
  } as Partial<RetryConfig>,
};

/**
 * Create a retryable version of an async function
 */
export function makeRetryable<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config: Partial<RetryConfig> = {}
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => withRetry(() => fn(...args), config);
}
