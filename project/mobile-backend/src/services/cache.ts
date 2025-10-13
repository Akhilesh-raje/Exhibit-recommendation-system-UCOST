import { LoggerService } from './logger';

interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export class CacheService {
  private cache: Map<string, CacheItem<any>>;
  private logger: LoggerService;
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.logger = new LoggerService();
    this.maxSize = maxSize;
    this.startCleanupInterval();
  }

  public async initialize(): Promise<void> {
    try {
      this.logger.info('Cache service initialized');
      this.logger.info(`Cache max size: ${this.maxSize} items`);
    } catch (error) {
      this.logger.error('Failed to initialize cache service:', error);
      throw error;
    }
  }

  public isConnected(): boolean {
    return true; // In-memory cache is always connected
  }

  public set<T>(key: string, value: T, ttl: number = 3600000): void { // Default TTL: 1 hour
    try {
      // Remove oldest items if cache is full
      if (this.cache.size >= this.maxSize) {
        this.evictOldest();
      }

      const item: CacheItem<T> = {
        value,
        timestamp: Date.now(),
        ttl
      };

      this.cache.set(key, item);
      this.logger.debug(`Cache set: ${key}`, { ttl: `${ttl}ms` });
    } catch (error) {
      this.logger.error(`Failed to set cache item: ${key}`, error);
    }
  }

  public get<T>(key: string): T | null {
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        return null;
      }

      // Check if item has expired
      if (Date.now() - item.timestamp > item.ttl) {
        this.cache.delete(key);
        this.logger.debug(`Cache expired: ${key}`);
        return null;
      }

      this.logger.debug(`Cache hit: ${key}`);
      return item.value;
    } catch (error) {
      this.logger.error(`Failed to get cache item: ${key}`, error);
      return null;
    }
  }

  public has(key: string): boolean {
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        return false;
      }

      // Check if item has expired
      if (Date.now() - item.timestamp > item.ttl) {
        this.cache.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to check cache item: ${key}`, error);
      return false;
    }
  }

  public delete(key: string): boolean {
    try {
      const deleted = this.cache.delete(key);
      if (deleted) {
        this.logger.debug(`Cache deleted: ${key}`);
      }
      return deleted;
    } catch (error) {
      this.logger.error(`Failed to delete cache item: ${key}`, error);
      return false;
    }
  }

  public clear(): void {
    try {
      this.cache.clear();
      this.logger.info('Cache cleared');
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
    }
  }

  public size(): number {
    return this.cache.size;
  }

  public keys(): string[] {
    return Array.from(this.cache.keys());
  }

  public values(): any[] {
    return Array.from(this.cache.values()).map(item => item.value);
  }

  public entries(): [string, any][] {
    return Array.from(this.cache.entries()).map(([key, item]) => [key, item.value]);
  }

  // Get cache statistics
  public getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    missRate: number;
    totalRequests: number;
    hits: number;
    misses: number;
  } {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;
    const missRate = totalRequests > 0 ? (this.misses / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round(missRate * 100) / 100,
      totalRequests,
      hits: this.hits,
      misses: this.misses
    };
  }

  // Cache with automatic refresh
  public async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    ttl: number = 3600000
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // If not in cache, fetch and store
      const value = await fetchFunction();
      this.set(key, value, ttl);
      return value;
    } catch (error) {
      this.logger.error(`Failed to get or set cache item: ${key}`, error);
      throw error;
    }
  }

  // Batch operations
  public mget(keys: string[]): (any | null)[] {
    return keys.map(key => this.get(key));
  }

  public mset(items: { key: string; value: any; ttl?: number }[]): void {
    items.forEach(item => {
      this.set(item.key, item.value, item.ttl);
    });
  }

  public mdelete(keys: string[]): number {
    let deleted = 0;
    keys.forEach(key => {
      if (this.delete(key)) {
        deleted++;
      }
    });
    return deleted;
  }

  // Pattern-based operations
  public deletePattern(pattern: string): number {
    const regex = new RegExp(pattern);
    const keysToDelete = this.keys().filter(key => regex.test(key));
    return this.mdelete(keysToDelete);
  }

  public getPattern(pattern: string): { [key: string]: any } {
    const regex = new RegExp(pattern);
    const result: { [key: string]: any } = {};
    
    this.keys().forEach(key => {
      if (regex.test(key)) {
        const value = this.get(key);
        if (value !== null) {
          result[key] = value;
        }
      }
    });
    
    return result;
  }

  // Cache warming
  public async warmCache<T>(
    keys: string[], 
    fetchFunction: (key: string) => Promise<T>, 
    ttl: number = 3600000
  ): Promise<void> {
    try {
      const promises = keys.map(async key => {
        try {
          const value = await fetchFunction(key);
          this.set(key, value, ttl);
        } catch (error) {
          this.logger.warn(`Failed to warm cache for key: ${key}`, error);
        }
      });

      await Promise.all(promises);
      this.logger.info(`Cache warming completed for ${keys.length} keys`);
    } catch (error) {
      this.logger.error('Cache warming failed:', error);
    }
  }

  // Cache invalidation strategies
  public invalidateByPattern(pattern: string): number {
    return this.deletePattern(pattern);
  }

  public invalidateByTags(tags: string[]): number {
    // This is a simplified tag-based invalidation
    // In a real implementation, you might want to maintain a tag-to-key mapping
    let deleted = 0;
    tags.forEach(tag => {
      const pattern = `.*${tag}.*`;
      deleted += this.deletePattern(pattern);
    });
    return deleted;
  }

  // Performance tracking
  private hits: number = 0;
  private misses: number = 0;

  private trackHit(): void {
    this.hits++;
  }

  private trackMiss(): void {
    this.misses++;
  }

  // Cleanup expired items
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Run every minute
  }

  private cleanupExpired(): void {
    try {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, item] of this.cache.entries()) {
        if (now - item.timestamp > item.ttl) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.debug(`Cleaned up ${cleaned} expired cache items`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired cache items:', error);
    }
  }

  // Evict oldest items when cache is full
  private evictOldest(): void {
    try {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 10% of items
      const toRemove = Math.ceil(this.maxSize * 0.1);
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        this.cache.delete(entries[i][0]);
      }
      
      this.logger.debug(`Evicted ${toRemove} oldest cache items`);
    } catch (error) {
      this.logger.error('Failed to evict oldest cache items:', error);
    }
  }

  public async close(): Promise<void> {
    try {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }
      
      this.clear();
      this.logger.info('Cache service closed');
    } catch (error) {
      this.logger.error('Failed to close cache service:', error);
    }
  }
} 