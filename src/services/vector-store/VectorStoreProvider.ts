/**
 * Abstract base class for vector store providers
 * All provider implementations must extend this class
 */

import type {
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
} from './types';

export abstract class VectorStoreProvider {
  abstract insert(
    config: VectorStoreConfig,
    documents: VectorDocument[]
  ): Promise<VectorInsertResult>;

  abstract search(
    config: VectorStoreConfig,
    query: VectorQuery
  ): Promise<VectorSearchResult>;

  abstract update(
    config: VectorStoreConfig,
    documents: VectorDocument[]
  ): Promise<VectorUpdateResult>;

  abstract delete(
    config: VectorStoreConfig,
    vectorIds: string[]
  ): Promise<VectorDeleteResult>;

  abstract createIndex(
    config: VectorStoreConfig,
    indexName: string,
    dimensions: number
  ): Promise<VectorIndexCreateResult>;

  abstract deleteIndex(
    config: VectorStoreConfig,
    indexName: string
  ): Promise<VectorIndexDeleteResult>;

  abstract getIndexStats(
    config: VectorStoreConfig,
    indexName: string
  ): Promise<VectorIndexStats>;

  abstract testConnection(config: VectorStoreConfig): Promise<boolean>;

  abstract getCapabilities(): ProviderCapabilities;
}
