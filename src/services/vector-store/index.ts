/**
 * Vector Store Module Barrel Export
 * Re-exports all types, providers, and utilities
 */

// Types
export type {
  VectorStoreConfig,
  VectorDocument,
  VectorQuery,
  VectorSearchResult,
  VectorIndexStats,
  VectorInsertResult,
  VectorUpdateResult,
  VectorDeleteResult,
  VectorIndexCreateResult,
  VectorIndexDeleteResult,
  ProviderCapabilities,
  PineconeMatch,
  PineconeIndexStats,
  QdrantSearchResult,
  QdrantCollectionInfo,
} from './types';

// Base class
export { VectorStoreProvider } from './VectorStoreProvider';

// Embedding generator
export { EmbeddingGenerator } from './EmbeddingGenerator';

// Providers
export {
  PineconeProvider,
  WeaviateProvider,
  ChromaProvider,
  MilvusProvider,
  QdrantProvider,
} from './providers';
