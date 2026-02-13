/**
 * @deprecated This file is deprecated. Use CacheLayer instead.
 * This file now re-exports from CacheLayer for backward compatibility.
 *
 * Migration guide:
 * - Replace: import cacheService from './CacheService'
 * - With:    import { cacheLayer } from './CacheLayer'
 *
 * The cacheLayer provides all the same methods plus additional features:
 * - Tags-based invalidation
 * - Namespace support
 * - Priority-based LRU eviction
 * - Detailed statistics
 */

// Re-export everything from CacheLayer for backward compatibility
export { cacheLayer, cacheLayer as cacheService, CacheLayer } from './CacheLayer';
export type { CacheOptions, CacheStats } from './CacheLayer';

// Default export for backward compatibility
import { cacheLayer } from './CacheLayer';
export default cacheLayer;
