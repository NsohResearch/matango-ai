import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test rate limiting module
describe('Rate Limiting', () => {
  it('should export rate limit middleware functions', async () => {
    const rateLimit = await import('./_core/rateLimit');
    expect(rateLimit.createRateLimit).toBeDefined();
    expect(rateLimit.userRateLimit).toBeDefined();
    expect(rateLimit.authRateLimit).toBeDefined();
  });

  it('should create rate limiter with custom config', async () => {
    const { createRateLimit } = await import('./_core/rateLimit');
    const limiter = createRateLimit({
      windowMs: 60000,
      max: 100,
      keyGenerator: (req: any) => req.ip || 'unknown',
    });
    expect(limiter).toBeDefined();
    expect(typeof limiter).toBe('function');
  });
});

// Test circuit breaker module
describe('Circuit Breaker', () => {
  it('should export circuit breaker functions', async () => {
    const circuitBreaker = await import('./_core/circuitBreaker');
    expect(circuitBreaker.configureCircuit).toBeDefined();
    expect(circuitBreaker.getCircuitState).toBeDefined();
    expect(circuitBreaker.isCircuitOpen).toBeDefined();
    expect(circuitBreaker.recordSuccess).toBeDefined();
    expect(circuitBreaker.recordFailure).toBeDefined();
    expect(circuitBreaker.withCircuitBreaker).toBeDefined();
  });

  it('should start with closed circuit state', async () => {
    const { getCircuitState } = await import('./_core/circuitBreaker');
    const state = getCircuitState('test-circuit');
    expect(state.state).toBe('closed');
    expect(state.failures).toBe(0);
  });

  it('should open circuit after failure threshold', async () => {
    const { configureCircuit, recordFailure, getCircuitState } = await import('./_core/circuitBreaker');
    
    configureCircuit('test-failures', { failureThreshold: 3 });
    
    recordFailure('test-failures');
    recordFailure('test-failures');
    recordFailure('test-failures');
    
    const state = getCircuitState('test-failures');
    expect(state.state).toBe('open');
  });
});

// Test retry module
describe('Retry Logic', () => {
  it('should export retry functions', async () => {
    const retry = await import('./_core/retry');
    expect(retry.withRetry).toBeDefined();
    expect(retry.RetryPresets).toBeDefined();
    expect(retry.makeRetryable).toBeDefined();
  });

  it('should succeed on first try without retry', async () => {
    const { withRetry } = await import('./_core/retry');
    const fn = vi.fn().mockResolvedValue('success');
    
    const result = await withRetry(fn);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    const { withRetry } = await import('./_core/retry');
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce('success');
    
    const result = await withRetry(fn, { baseDelayMs: 10 });
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should have retry presets', async () => {
    const { RetryPresets } = await import('./_core/retry');
    expect(RetryPresets.llmApi).toBeDefined();
    expect(RetryPresets.mediaGeneration).toBeDefined();
    expect(RetryPresets.socialPublishing).toBeDefined();
  });
});

// Test logger module
describe('Structured Logging', () => {
  it('should export logger functions', async () => {
    const logger = await import('./_core/logger');
    expect(logger.logger).toBeDefined();
    expect(logger.requestLogger).toBeDefined();
    expect(logger.errorLogger).toBeDefined();
    expect(logger.createChildLogger).toBeDefined();
  });

  it('should have all log levels', async () => {
    const { logger } = await import('./_core/logger');
    expect(logger.debug).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.exception).toBeDefined();
  });
});

// Test sanitization module
describe('Input Sanitization', () => {
  it('should export sanitization functions', async () => {
    const sanitize = await import('./_core/sanitize');
    expect(sanitize.escapeHtml).toBeDefined();
    expect(sanitize.stripHtml).toBeDefined();
    expect(sanitize.sanitizeString).toBeDefined();
    expect(sanitize.sanitizeUrl).toBeDefined();
    expect(sanitize.sanitizeEmail).toBeDefined();
    expect(sanitize.checkContentSafety).toBeDefined();
  });

  it('should escape HTML entities', async () => {
    const { escapeHtml } = await import('./_core/sanitize');
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
  });

  it('should strip HTML tags', async () => {
    const { stripHtml } = await import('./_core/sanitize');
    expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
  });

  it('should block dangerous URLs', async () => {
    const { sanitizeUrl } = await import('./_core/sanitize');
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('should validate email format', async () => {
    const { sanitizeEmail } = await import('./_core/sanitize');
    expect(sanitizeEmail('test@example.com')).toBe('test@example.com');
    expect(sanitizeEmail('invalid-email')).toBe('');
  });

  it('should detect forbidden phrases', async () => {
    const { checkContentSafety } = await import('./_core/sanitize');
    const result = checkContentSafety('Get guaranteed results now!');
    expect(result.safe).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });
});

// Test plan limits module
describe('Plan Limits', () => {
  it('should export plan limit functions', async () => {
    const planLimits = await import('./_core/planLimits');
    expect(planLimits.getPlanLimits).toBeDefined();
    expect(planLimits.isWithinLimit).toBeDefined();
    expect(planLimits.PLAN_LIMITS).toBeDefined();
  });

  it('should have limits for all plans', async () => {
    const { PLAN_LIMITS } = await import('./_core/planLimits');
    expect(PLAN_LIMITS.free).toBeDefined();
    expect(PLAN_LIMITS.starter).toBeDefined();
    expect(PLAN_LIMITS.pro).toBeDefined();
    expect(PLAN_LIMITS.agency).toBeDefined();
    expect(PLAN_LIMITS.lifetime).toBeDefined();
  });

  it('should return correct limits for plan', async () => {
    const { getPlanLimits } = await import('./_core/planLimits');
    const freeLimits = getPlanLimits('free');
    expect(freeLimits.assetsPerMonth).toBe(20);
    expect(freeLimits.campaignsPerMonth).toBe(3);
  });

  it('should check if within limit correctly', async () => {
    const { isWithinLimit } = await import('./_core/planLimits');
    expect(isWithinLimit(10, 5)).toBe(true);
    expect(isWithinLimit(10, 10)).toBe(false);
    expect(isWithinLimit(-1, 1000)).toBe(true); // Unlimited
  });
});

// Test job queue module
describe('Job Queue', () => {
  it('should export job queue functions', async () => {
    const jobQueue = await import('./_core/jobQueue');
    expect(jobQueue.jobQueue).toBeDefined();
    expect(jobQueue.JobTypes).toBeDefined();
  });

  it('should have job type constants', async () => {
    const { JobTypes } = await import('./_core/jobQueue');
    expect(JobTypes.GENERATE_ASSET).toBe('generate_asset');
    expect(JobTypes.GENERATE_VIDEO).toBe('generate_video');
    expect(JobTypes.PUBLISH_CONTENT).toBe('publish_content');
  });
});

// Test cache module
describe('Cache', () => {
  it('should export cache functions', async () => {
    const cache = await import('./_core/cache');
    expect(cache.cache).toBeDefined();
    expect(cache.CacheKeys).toBeDefined();
    expect(cache.CacheTTL).toBeDefined();
    expect(cache.CacheInvalidation).toBeDefined();
  });

  it('should set and get values', async () => {
    const { cache } = await import('./_core/cache');
    cache.set('test-key', 'test-value');
    expect(cache.get('test-key')).toBe('test-value');
    cache.delete('test-key');
  });

  it('should have TTL presets', async () => {
    const { CacheTTL } = await import('./_core/cache');
    expect(CacheTTL.SHORT).toBe(60 * 1000);
    expect(CacheTTL.MEDIUM).toBe(5 * 60 * 1000);
    expect(CacheTTL.LONG).toBe(30 * 60 * 1000);
  });

  it('should have cache key generators', async () => {
    const { CacheKeys } = await import('./_core/cache');
    expect(CacheKeys.brandBrain(1)).toBe('brand_brain:1');
    expect(CacheKeys.campaign(123)).toBe('campaign:123');
  });
});

// Test health endpoints
describe('Health Endpoints', () => {
  it('should export health router', async () => {
    const health = await import('./_core/health');
    expect(health.healthRouter).toBeDefined();
  });
});

// Test audit logging
describe('Audit Logging', () => {
  it('should export audit log functions', async () => {
    const auditLog = await import('./_core/auditLog');
    expect(auditLog.logAuditEvent).toBeDefined();
    expect(auditLog.createAuditLogger).toBeDefined();
  });

  it('should create audit logger with context', async () => {
    const { createAuditLogger } = await import('./_core/auditLog');
    const logger = createAuditLogger(1, 1, '127.0.0.1', 'test-agent');
    expect(logger.log).toBeDefined();
    expect(logger.brandBrainCreated).toBeDefined();
    expect(logger.campaignCreated).toBeDefined();
  });
});
