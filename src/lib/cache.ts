// Simple in-memory cache implementation

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class Cache<T> {
  private store: Map<string, CacheEntry<T>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTL;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };
    this.store.set(key, entry);
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | null {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys())
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let removedCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.store.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.store.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Get or set pattern - if key exists, return it, otherwise compute and cache
   */
  async getOrSet<K>(
    key: string, 
    computeFn: () => Promise<K>, 
    ttl?: number
  ): Promise<K> {
    const cached = this.get(key) as K | null;
    if (cached !== null) {
      return cached;
    }

    const computed = await computeFn();
    this.set(key, computed as unknown as T, ttl);
    return computed;
  }
}

// Global cache instances for different types of data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const packageInfoCache = new Cache<any>(10 * 60 * 1000); // 10 minutes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const compatibilityCache = new Cache<any>(30 * 60 * 1000); // 30 minutes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const vulnerabilityCache = new Cache<any>(5 * 60 * 1000); // 5 minutes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const planCache = new Cache<any>(15 * 60 * 1000); // 15 minutes

/**
 * Cache key generators for consistent caching
 */
export const CacheKeys = {
  packageInfo: (name: string, registry: string) => `pkg:${registry}:${name}`,
  compatibility: (packages: string[]) => `compat:${packages.sort().join(',')}`,
  vulnerabilities: (name: string, version: string) => `vuln:${name}:${version}`,
  plan: (dependencies: string[]) => `plan:${dependencies.sort().join(',')}`
};

/**
 * Automatic cache cleanup - runs every 10 minutes
 */
if (typeof window !== 'undefined') {
  setInterval(() => {
    packageInfoCache.cleanup();
    compatibilityCache.cleanup();
    vulnerabilityCache.cleanup();
    planCache.cleanup();
  }, 10 * 60 * 1000);
}
