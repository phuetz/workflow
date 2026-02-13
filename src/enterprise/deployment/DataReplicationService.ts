/**
 * Data Replication Service
 * Enterprise-grade data replication with multi-master support,
 * conflict resolution, cross-region sync, and CDC integration
 *
 * This file is now a facade that re-exports from the modular implementation.
 * The actual implementation has been split into:
 * - src/enterprise/replication/types.ts (shared types)
 * - src/enterprise/replication/ReplicationEngine.ts (core engine)
 * - src/enterprise/replication/ConflictResolver.ts (conflict handling)
 * - src/enterprise/replication/SyncManager.ts (sync operations)
 * - src/enterprise/replication/index.ts (barrel export + facade)
 */

// Re-export everything from the modular implementation
export * from '../replication';

// Re-export default
export { DataReplicationService as default } from '../replication';
