/**
 * Qdrant Vector Store Provider
 * Uses official SDK with HTTP fallback
 */

import { logger } from '../../SimpleLogger';
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
  QdrantSearchResult,
  QdrantCollectionInfo,
} from '../types';

export class QdrantProvider extends VectorStoreProvider {
  private client: unknown = null;
  private sdkAvailable = false;
  private initialized = false;

  private async initializeClient(config: VectorStoreConfig): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const { QdrantClient } = await import('@qdrant/js-client-rest');
      this.client = new QdrantClient({
        url: config.url || process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: config.apiKey || process.env.QDRANT_API_KEY,
      });
      this.sdkAvailable = true;
      logger.info('Qdrant SDK initialized successfully');
    } catch (error) {
      logger.warn('Qdrant SDK not available, falling back to HTTP API:', error);
      this.sdkAvailable = false;
    }
  }

  private getBaseUrl(config: VectorStoreConfig): string {
    return config.url || process.env.QDRANT_URL || 'http://localhost:6333';
  }

  private getHeaders(config: VectorStoreConfig): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const apiKey = config.apiKey || process.env.QDRANT_API_KEY;
    if (apiKey) {
      headers['api-key'] = apiKey;
    }
    return headers;
  }

  async insert(
    config: VectorStoreConfig,
    documents: VectorDocument[]
  ): Promise<VectorInsertResult> {
    try {
      await this.initializeClient(config);

      const collectionName = config.collection || config.index || 'default';
      const points = documents.map((doc, index) => ({
        id: this.toQdrantId(doc.id, index),
        vector: doc.embedding || [],
        payload: { content: doc.content, ...doc.metadata },
      }));

      if (this.sdkAvailable && this.client) {
        const qdrant = this.client as {
          upsert: (
            collectionName: string,
            options: { wait: boolean; points: unknown[] }
          ) => Promise<void>;
        };
        await qdrant.upsert(collectionName, { wait: true, points });
      } else {
        const baseUrl = this.getBaseUrl(config);
        const response = await fetch(
          `${baseUrl}/collections/${collectionName}/points?wait=true`,
          {
            method: 'PUT',
            headers: this.getHeaders(config),
            body: JSON.stringify({ points }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Qdrant insert failed: ${response.status} - ${JSON.stringify(errorData)}`
          );
        }
      }

      return { success: true, inserted: documents.length, errors: [] };
    } catch (error) {
      logger.error('Qdrant insert error:', error);
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
      await this.initializeClient(config);

      const collectionName = config.collection || config.index || 'default';
      let results: QdrantSearchResult[] = [];

      if (this.sdkAvailable && this.client) {
        const qdrant = this.client as {
          search: (
            collectionName: string,
            options: {
              vector: number[];
              limit: number;
              filter?: unknown;
              with_payload: boolean;
              with_vector?: boolean;
            }
          ) => Promise<QdrantSearchResult[]>;
        };
        results = await qdrant.search(collectionName, {
          vector: query.vector || [],
          limit: query.topK,
          filter: query.filter ? this.convertFilter(query.filter) : undefined,
          with_payload: query.includeMetadata ?? true,
          with_vector: query.includeValues ?? false,
        });
      } else {
        const baseUrl = this.getBaseUrl(config);
        const response = await fetch(
          `${baseUrl}/collections/${collectionName}/points/search`,
          {
            method: 'POST',
            headers: this.getHeaders(config),
            body: JSON.stringify({
              vector: query.vector || [],
              limit: query.topK,
              filter: query.filter ? this.convertFilter(query.filter) : undefined,
              with_payload: query.includeMetadata ?? true,
              with_vector: query.includeValues ?? false,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Qdrant search failed: ${response.status} - ${JSON.stringify(errorData)}`
          );
        }

        const data = await response.json();
        results = data.result || [];
      }

      const documents: VectorDocument[] = results.map((r) => ({
        id: String(r.id),
        content: (r.payload?.content as string) || '',
        metadata: r.payload || {},
        embedding: r.vector,
        score: r.score,
      }));

      return {
        documents,
        totalResults: documents.length,
        executionTime: Date.now() - startTime,
        searchId: `qdrant_${Date.now()}`,
      };
    } catch (error) {
      logger.error('Qdrant search error:', error);
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
      await this.initializeClient(config);

      const collectionName = config.collection || config.index || 'default';
      const pointIds = vectorIds.map((id, index) => this.toQdrantId(id, index));

      if (this.sdkAvailable && this.client) {
        const qdrant = this.client as {
          delete: (
            collectionName: string,
            options: { wait: boolean; points: (string | number)[] }
          ) => Promise<void>;
        };
        await qdrant.delete(collectionName, { wait: true, points: pointIds });
      } else {
        const baseUrl = this.getBaseUrl(config);
        const response = await fetch(
          `${baseUrl}/collections/${collectionName}/points/delete?wait=true`,
          {
            method: 'POST',
            headers: this.getHeaders(config),
            body: JSON.stringify({ points: pointIds }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Qdrant delete failed: ${response.status} - ${JSON.stringify(errorData)}`
          );
        }
      }

      return { success: true, deleted: vectorIds.length, errors: [] };
    } catch (error) {
      logger.error('Qdrant delete error:', error);
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
      await this.initializeClient(config);

      const metricMap: Record<string, string> = {
        cosine: 'Cosine',
        euclidean: 'Euclid',
        dotproduct: 'Dot',
        Cosine: 'Cosine',
        Euclid: 'Euclid',
        Dot: 'Dot',
      };
      const distance = metricMap[config.metric || 'cosine'] || 'Cosine';

      if (this.sdkAvailable && this.client) {
        const qdrant = this.client as {
          createCollection: (
            collectionName: string,
            options: { vectors: { size: number; distance: string } }
          ) => Promise<void>;
        };
        await qdrant.createCollection(indexName, {
          vectors: { size: dimensions, distance: distance },
        });
      } else {
        const baseUrl = this.getBaseUrl(config);
        const response = await fetch(`${baseUrl}/collections/${indexName}`, {
          method: 'PUT',
          headers: this.getHeaders(config),
          body: JSON.stringify({
            vectors: { size: dimensions, distance: distance },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Qdrant collection creation failed: ${response.status} - ${JSON.stringify(errorData)}`
          );
        }
      }

      return { success: true, indexName };
    } catch (error) {
      logger.error('Qdrant createIndex error:', error);
      throw error;
    }
  }

  async deleteIndex(
    config: VectorStoreConfig,
    indexName: string
  ): Promise<VectorIndexDeleteResult> {
    try {
      await this.initializeClient(config);

      if (this.sdkAvailable && this.client) {
        const qdrant = this.client as {
          deleteCollection: (collectionName: string) => Promise<void>;
        };
        await qdrant.deleteCollection(indexName);
      } else {
        const baseUrl = this.getBaseUrl(config);
        const response = await fetch(`${baseUrl}/collections/${indexName}`, {
          method: 'DELETE',
          headers: this.getHeaders(config),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Qdrant collection deletion failed: ${response.status} - ${JSON.stringify(errorData)}`
          );
        }
      }

      return { success: true };
    } catch (error) {
      logger.error('Qdrant deleteIndex error:', error);
      throw error;
    }
  }

  async getIndexStats(
    config: VectorStoreConfig,
    indexName: string
  ): Promise<VectorIndexStats> {
    try {
      await this.initializeClient(config);

      let info: QdrantCollectionInfo = {};

      if (this.sdkAvailable && this.client) {
        const qdrant = this.client as {
          getCollection: (collectionName: string) => Promise<QdrantCollectionInfo>;
        };
        info = await qdrant.getCollection(indexName);
      } else {
        const baseUrl = this.getBaseUrl(config);
        const response = await fetch(`${baseUrl}/collections/${indexName}`, {
          method: 'GET',
          headers: this.getHeaders(config),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Qdrant stats retrieval failed: ${response.status} - ${JSON.stringify(errorData)}`
          );
        }

        const data = await response.json();
        info = data.result || {};
      }

      return {
        totalVectors: info.vectors_count || info.points_count || 0,
        dimensions: info.config?.params?.vectors?.size || config.dimensions || 0,
        indexSize: info.segments_count || 0,
        memoryUsage: 0,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Qdrant getIndexStats error:', error);
      throw error;
    }
  }

  async testConnection(config: VectorStoreConfig): Promise<boolean> {
    try {
      await this.initializeClient(config);

      if (this.sdkAvailable && this.client) {
        const qdrant = this.client as {
          getCollections: () => Promise<{ collections: unknown[] }>;
        };
        await qdrant.getCollections();
        return true;
      } else {
        const baseUrl = this.getBaseUrl(config);
        const response = await fetch(`${baseUrl}/collections`, {
          method: 'GET',
          headers: this.getHeaders(config),
        });
        return response.ok;
      }
    } catch (error) {
      logger.error('Qdrant testConnection error:', error);
      return false;
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxDimensions: 65536,
      supportedMetrics: ['cosine', 'euclidean', 'dotproduct'],
      supportsFiltering: true,
      supportsMetadata: true,
      maxVectorSize: 1000000,
      supportsBatching: true,
      supportsPayloads: true,
      sdkAvailable: this.sdkAvailable,
    };
  }

  private toQdrantId(id: string, fallbackIndex: number): string | number {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      return id;
    }
    const numId = parseInt(id, 10);
    if (!isNaN(numId)) {
      return numId;
    }
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash) || fallbackIndex + 1;
  }

  private convertFilter(filter: Record<string, unknown>): unknown {
    const must: unknown[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        must.push({ key: key, match: { value } });
      } else if (Array.isArray(value)) {
        must.push({ key: key, match: { any: value } });
      } else if (typeof value === 'object' && value !== null) {
        const rangeFilter = value as Record<string, unknown>;
        if (
          'gte' in rangeFilter ||
          'lte' in rangeFilter ||
          'gt' in rangeFilter ||
          'lt' in rangeFilter
        ) {
          must.push({ key: key, range: rangeFilter });
        }
      }
    }

    return must.length > 0 ? { must } : undefined;
  }
}
