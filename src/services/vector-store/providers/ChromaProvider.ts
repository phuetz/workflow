/**
 * Chroma Vector Store Provider
 * HTTP-based implementation for ChromaDB
 */

import { VectorStoreProvider } from '../VectorStoreProvider';
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
} from '../types';

export class ChromaProvider extends VectorStoreProvider {
  async insert(
    config: VectorStoreConfig,
    documents: VectorDocument[]
  ): Promise<VectorInsertResult> {
    try {
      const response = await fetch(
        `${config.url}/api/v1/collections/${config.collection}/add`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids: documents.map((doc) => doc.id),
            embeddings: documents.map((doc) => doc.embedding),
            documents: documents.map((doc) => doc.content),
            metadatas: documents.map((doc) => doc.metadata),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Chroma insert failed: ${response.statusText}`);
      }

      return { success: true, inserted: documents.length, errors: [] };
    } catch (error) {
      return {
        success: false,
        inserted: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  async search(config: VectorStoreConfig, query: VectorQuery): Promise<VectorSearchResult> {
    const startTime = Date.now();
    try {
      const response = await fetch(
        `${config.url}/api/v1/collections/${config.collection}/query`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query_embeddings: [query.vector],
            n_results: query.topK,
            where: query.filter,
            include: ['documents', 'metadatas', 'distances'],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Chroma search failed: ${response.statusText}`);
      }

      const results = await response.json();
      const documents: VectorDocument[] = (results.ids || []).map(
        (id: string, index: number) => ({
          id,
          content: results.documents?.[index] || '',
          metadata: results.metadatas?.[index] || {},
          score: 1 - (results.distances?.[index] || 0),
        })
      );

      return {
        documents,
        totalResults: documents.length,
        executionTime: Date.now() - startTime,
        searchId: `chroma_${Date.now()}`,
      };
    } catch (error) {
      throw error;
    }
  }

  async update(
    config: VectorStoreConfig,
    documents: VectorDocument[]
  ): Promise<VectorUpdateResult> {
    const result = await this.insert(config, documents);
    return { success: result.success, updated: result.inserted, errors: result.errors };
  }

  async delete(config: VectorStoreConfig, vectorIds: string[]): Promise<VectorDeleteResult> {
    try {
      const response = await fetch(
        `${config.url}/api/v1/collections/${config.collection}/delete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: vectorIds }),
        }
      );

      if (!response.ok) {
        throw new Error(`Chroma delete failed: ${response.statusText}`);
      }

      return { success: true, deleted: vectorIds.length, errors: [] };
    } catch (error) {
      return {
        success: false,
        deleted: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  async createIndex(
    config: VectorStoreConfig,
    indexName: string,
    dimensions: number
  ): Promise<VectorIndexCreateResult> {
    try {
      const response = await fetch(`${config.url}/api/v1/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: indexName,
          metadata: { dimensions },
        }),
      });

      if (!response.ok) {
        throw new Error(`Chroma collection creation failed: ${response.statusText}`);
      }

      return { success: true, indexName };
    } catch (error) {
      throw error;
    }
  }

  async deleteIndex(
    config: VectorStoreConfig,
    indexName: string
  ): Promise<VectorIndexDeleteResult> {
    try {
      const response = await fetch(`${config.url}/api/v1/collections/${indexName}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Chroma collection deletion failed: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  async getIndexStats(
    config: VectorStoreConfig,
    indexName: string
  ): Promise<VectorIndexStats> {
    try {
      const response = await fetch(`${config.url}/api/v1/collections/${indexName}/count`);

      if (!response.ok) {
        throw new Error(`Chroma count retrieval failed: ${response.statusText}`);
      }

      const count = await response.json();
      return {
        totalVectors: count,
        dimensions: 0,
        indexSize: 0,
        memoryUsage: 0,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  async testConnection(config: VectorStoreConfig): Promise<boolean> {
    try {
      const response = await fetch(`${config.url}/api/v1/heartbeat`);
      return response.ok;
    } catch {
      return false;
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxDimensions: 2048,
      supportedMetrics: ['cosine', 'euclidean', 'manhattan'],
      supportsFiltering: true,
      supportsMetadata: true,
      maxVectorSize: 50000,
      supportsBatching: true,
    };
  }
}
