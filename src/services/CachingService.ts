/**
 * @deprecated This file is deprecated. Use CacheLayer instead.
 * This file now re-exports from CacheLayer for backward compatibility.
 *
 * Migration guide:
 * - Replace: import { cachingService } from './CachingService'
 * - With:    import { cacheLayer } from './CacheLayer'
 *
 * The cacheLayer provides all the same methods:
 * - get, set, delete, exists
 * - getOrSet (cache-aside pattern)
 * - invalidateByTags
 * - clear/flush
 * - getStats, getMemoryCacheInfo
 */

// Re-export everything from CacheLayer for backward compatibility
export {
  cacheLayer,
  cacheLayer as cachingService,
  CacheLayer,
  CacheLayer as CachingService,
} from './CacheLayer';

export type { CacheOptions, CacheStats } from './CacheLayer';
