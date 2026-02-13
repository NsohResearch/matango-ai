/**
 * Caching Layer
 * 
 * In-memory cache with TTL support for frequently accessed data.
 * Can be extended to use Redis for distributed caching.
 */

import { logger } from './logger';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheConfig {
  defaultTtl: number;
  maxSize: number;
  cleanupInterval: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  defaultTtl: 5 * 60 * 1000, // 5 minutes
  maxSize: 10000,
  cleanupInterval: 60 * 1000, // 1 minute
};

class Cache {
  private store: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private hits: number = 0;
  private misses: number = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    
    if (!entry) {
      this.misses++;
      return undefined;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    
    this.hits++;
    return entry.value as T;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // Evict oldest entries if at max size
    if (this.store.size >= this.config.maxSize) {
      this.evictOldest();
    }
    
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + (ttl || this.config.defaultTtl),
      createdAt: Date.now(),
    };
    
    this.store.set(key, entry);
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace('*', '.*'));
    let deleted = 0;
    
    const keysToDelete: string[] = [];
    this.store.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.store.delete(key);
      deleted++;
    });
    
    return deleted;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Get or set with a factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }
    
    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear();
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Evict oldest entries
   */
  private evictOldest(): void {
    let oldest: { key: string; createdAt: number } | null = null;
    
    this.store.forEach((entry, key) => {
      if (!oldest || entry.createdAt < oldest.createdAt) {
        oldest = { key, createdAt: entry.createdAt };
      }
    });
    
    if (oldest) {
      this.store.delete((oldest as any).key);
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    this.store.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        toDelete.push(key);
      }
    });
    
    toDelete.forEach(key => this.store.delete(key));
  }

  /**
   * Stop cleanup timer
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Create singleton instance
export const cache = new Cache();

/**
 * Cache key generators for common use cases
 */
export const CacheKeys = {
  brandBrain: (userId: number) => `brand_brain:${userId}`,
  brandBrainByOrg: (orgId: number) => `brand_brain:org:${orgId}`,
  campaign: (campaignId: number) => `campaign:${campaignId}`,
  campaignAssets: (campaignId: number) => `campaign_assets:${campaignId}`,
  userInfluencers: (userId: number) => `influencers:user:${userId}`,
  analytics: (orgId: number, period: string) => `analytics:${orgId}:${period}`,
  socialConnections: (userId: number) => `social:${userId}`,
  planUsage: (userId: number) => `usage:${userId}`,
};

/**
 * TTL presets (in milliseconds)
 */
export const CacheTTL = {
  SHORT: 60 * 1000,           // 1 minute
  MEDIUM: 5 * 60 * 1000,      // 5 minutes
  LONG: 30 * 60 * 1000,       // 30 minutes
  HOUR: 60 * 60 * 1000,       // 1 hour
  DAY: 24 * 60 * 60 * 1000,   // 1 day
};

/**
 * Invalidation helpers
 */
export const CacheInvalidation = {
  /**
   * Invalidate all brand brain related caches for a user
   */
  brandBrain: (userId: number, orgId?: number) => {
    cache.delete(CacheKeys.brandBrain(userId));
    if (orgId) {
      cache.delete(CacheKeys.brandBrainByOrg(orgId));
    }
  },
  
  /**
   * Invalidate campaign related caches
   */
  campaign: (campaignId: number) => {
    cache.delete(CacheKeys.campaign(campaignId));
    cache.delete(CacheKeys.campaignAssets(campaignId));
  },
  
  /**
   * Invalidate user's influencer cache
   */
  influencers: (userId: number) => {
    cache.delete(CacheKeys.userInfluencers(userId));
  },
  
  /**
   * Invalidate analytics cache for an org
   */
  analytics: (orgId: number) => {
    cache.deletePattern(`analytics:${orgId}:*`);
  },
  
  /**
   * Invalidate all caches for a user
   */
  user: (userId: number, orgId?: number) => {
    cache.delete(CacheKeys.brandBrain(userId));
    cache.delete(CacheKeys.userInfluencers(userId));
    cache.delete(CacheKeys.socialConnections(userId));
    cache.delete(CacheKeys.planUsage(userId));
    if (orgId) {
      cache.delete(CacheKeys.brandBrainByOrg(orgId));
    }
  },
};
