import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyGenerator: (req: Request) => string;
  message?: string;
}

/**
 * Creates a rate limiting middleware
 */
export function createRateLimit(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = config.keyGenerator(req);
    const now = Date.now();
    
    let entry = rateLimitStore.get(key);
    
    // Reset if window has passed
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
    }
    
    entry.count++;
    rateLimitStore.set(key, entry);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));
    
    if (entry.count > config.max) {
      res.status(429).json({
        error: config.message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });
      return;
    }
    
    next();
  };
}

/**
 * Per-user rate limiting - 100 requests per minute
 */
export const userRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return `user:${user?.id || req.ip}`;
  },
  message: 'Too many requests. Please slow down.',
});

/**
 * Per-organization rate limiting - 500 requests per minute
 */
export const orgRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 500,
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return `org:${user?.organizationId || req.ip}`;
  },
  message: 'Organization rate limit exceeded.',
});

/**
 * Strict limit for expensive AI generation operations - 10 per minute
 */
export const generationRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return `gen:${user?.id || req.ip}`;
  },
  message: 'Generation limit reached. Please wait before generating more content.',
});

/**
 * Very strict limit for video generation - 3 per minute
 */
export const videoRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 3,
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return `video:${user?.id || req.ip}`;
  },
  message: 'Video generation limit reached. Please wait before generating more videos.',
});

/**
 * Auth endpoint rate limiting - 5 attempts per minute
 */
export const authRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req: Request) => `auth:${req.ip}`,
  message: 'Too many authentication attempts. Please try again later.',
});

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetTime) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => rateLimitStore.delete(key));
}, 5 * 60 * 1000);
