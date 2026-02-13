/**
 * Pinecone Vector Store Provider
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
  PineconeMatch,
  PineconeIndexStats,
} from '../types';

export class PineconeProvider extends VectorStoreProvider {
  private client: unknown = null;
  private sdkAvailable = false;
  private initialized = false;
  private baseUrl = 'https://api.pinecone.io';

  private async initializeClient(apiKey: string): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const { Pinecone } = await import('@pinecone-database/pinecone');
      this.client = new Pinecone({ apiKey });
      this.sdkAvailable = true;
      logger.info('Pinecone SDK initialized successfully');
    } catch (error) {
      logger.warn('Pinecone SDK not available, falling back to HTTP API:', error);
      this.sdkAvailable = false;
    }
  }

  async insert(
    config: VectorStoreConfig,
    documents: VectorDocument[]
  ): Promise<VectorInsertResult> {
    try {
      await this.initializeClient(config.apiKey!);

      const vectors = documents.map((doc) => ({
        id: doc.id,
        values: doc.embedding || [],
        metadata: doc.metadata,
      }));

      if (this.sdkAvailable && this.client) {
        const pinecone = this.client as {
          index: (name: string) => { upsert: (vectors: unknown[]) => Promise<void> };
        };
        const index = pinecone.index(config.index || 'default');
        await index.upsert(vectors);
      } else {
        const indexHost = await this.getIndexHost(config);
        const response = await fetch(`${indexHost}/vectors/upsert`, {
          method: 'POST',
          headers: {
            'Api-Key': config.apiKey!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ vectors, namespace: config.collection || '' }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Pinecone insert failed: ${response.status} - ${errorText}`);
        }
      }

      return { success: true, inserted: documents.length, errors: [] };
    } catch (error) {
      logger.error('Pinecone insert error:', error);
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
      await this.initializeClient(config.apiKey!);

      let matches: PineconeMatch[] = [];

      if (this.sdkAvailable && this.client) {
        const pinecone = this.client as {
          index: (name: string) => {
            query: (params: {
              vector: number[];
              topK: number;
              filter?: Record<string, unknown>;
              includeMetadata?: boolean;
              includeValues?: boolean;
              namespace?: string;
            }) => Promise<{ matches: PineconeMatch[] }>;
          };
        };
        const index = pinecone.index(config.index || 'default');
        const results = await index.query({
          vector: query.vector || [],
          topK: query.topK,
          filter: query.filter,
          includeMetadata: query.includeMetadata ?? true,
          includeValues: query.includeValues ?? false,
          namespace: config.collection || '',
        });
        matches = results.matches || [];
      } else {
        const indexHost = await this.getIndexHost(config);
        const response = await fetch(`${indexHost}/query`, {
          method: 'POST',
          headers: {
            'Api-Key': config.apiKey!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vector: query.vector,
            topK: query.topK,
            filter: query.filter,
            includeMetadata: query.includeMetadata ?? true,
            includeValues: query.includeValues ?? false,
            namespace: config.collection || '',
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Pinecone search failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        matches = data.matches || [];
      }

      const documents: VectorDocument[] = matches.map((match) => ({
        id: match.id,
        content: (match.metadata?.content as string) || '',
        metadata: match.metadata || {},
        embedding: match.values,
        score: match.score,
      }));

      return {
        documents,
        totalResults: documents.length,
        executionTime: Date.now() - startTime,
        searchId: `pinecone_${Date.now()}`,
      };
    } catch (error) {
      logger.error('Pinecone search error:', error);
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
      await this.initializeClient(config.apiKey!);

      if (this.sdkAvailable && this.client) {
        const pinecone = this.client as {
          index: (name: string) => {
            deleteMany: (ids: string[]) => Promise<void>;
            namespace: (ns: string) => { deleteMany: (ids: string[]) => Promise<void> };
          };
        };
        const index = pinecone.index(config.index || 'default');
        if (config.collection) {
          await index.namespace(config.collection).deleteMany(vectorIds);
        } else {
          await index.deleteMany(vectorIds);
        }
      } else {
        const indexHost = await this.getIndexHost(config);
        const response = await fetch(`${indexHost}/vectors/delete`, {
          method: 'POST',
          headers: {
            'Api-Key': config.apiKey!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: vectorIds, namespace: config.collection || '' }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Pinecone delete failed: ${response.status} - ${errorText}`);
        }
      }

      return { success: true, deleted: vectorIds.length, errors: [] };
    } catch (error) {
      logger.error('Pinecone delete error:', error);
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
      await this.initializeClient(config.apiKey!);
      const metric = config.metric || 'cosine';

      if (this.sdkAvailable && this.client) {
        const pinecone = this.client as {
          createIndex: (params: {
            name: string;
            dimension: number;
            metric: 'cosine' | 'euclidean' | 'dotproduct';
            spec: { serverless: { cloud: string; region: string } };
          }) => Promise<void>;
        };
        await pinecone.createIndex({
          name: indexName,
          dimension: dimensions,
          metric: metric as 'cosine' | 'euclidean' | 'dotproduct',
          spec: {
            serverless: {
              cloud: 'aws',
              region: config.environment || 'us-east-1',
            },
          },
        });
      } else {
        const response = await fetch(`${this.baseUrl}/indexes`, {
          method: 'POST',
          headers: {
            'Api-Key': config.apiKey!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: indexName,
            dimension: dimensions,
            metric: metric,
            spec: {
              serverless: {
                cloud: 'aws',
                region: config.environment || 'us-east-1',
              },
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Pinecone index creation failed: ${response.status} - ${errorText}`);
        }
      }

      return { success: true, indexName };
    } catch (error) {
      logger.error('Pinecone createIndex error:', error);
      throw error;
    }
  }

  async deleteIndex(config: VectorStoreConfig, indexName: string): Promise<VectorIndexDeleteResult> {
    try {
      await this.initializeClient(config.apiKey!);

      if (this.sdkAvailable && this.client) {
        const pinecone = this.client as { deleteIndex: (name: string) => Promise<void> };
        await pinecone.deleteIndex(indexName);
      } else {
        const response = await fetch(`${this.baseUrl}/indexes/${indexName}`, {
          method: 'DELETE',
          headers: { 'Api-Key': config.apiKey! },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Pinecone index deletion failed: ${response.status} - ${errorText}`);
        }
      }

      return { success: true };
    } catch (error) {
      logger.error('Pinecone deleteIndex error:', error);
      throw error;
    }
  }

  async getIndexStats(config: VectorStoreConfig, indexName: string): Promise<VectorIndexStats> {
    try {
      await this.initializeClient(config.apiKey!);

      let stats: PineconeIndexStats = {};

      if (this.sdkAvailable && this.client) {
        const pinecone = this.client as {
          index: (name: string) => { describeIndexStats: () => Promise<PineconeIndexStats> };
        };
        const index = pinecone.index(indexName);
        stats = await index.describeIndexStats();
      } else {
        const indexHost = await this.getIndexHost({ ...config, index: indexName });
        const response = await fetch(`${indexHost}/describe_index_stats`, {
          method: 'POST',
          headers: {
            'Api-Key': config.apiKey!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Pinecone stats retrieval failed: ${response.status} - ${errorText}`);
        }

        stats = await response.json();
      }

      return {
        totalVectors: stats.totalRecordCount || stats.totalVectorCount || 0,
        dimensions: stats.dimension || config.dimensions || 0,
        indexSize: stats.indexFullness || 0,
        memoryUsage: 0,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Pinecone getIndexStats error:', error);
      throw error;
    }
  }

  async testConnection(config: VectorStoreConfig): Promise<boolean> {
    try {
      await this.initializeClient(config.apiKey!);

      if (this.sdkAvailable && this.client) {
        const pinecone = this.client as {
          listIndexes: () => Promise<{ indexes?: unknown[] }>;
        };
        await pinecone.listIndexes();
        return true;
      } else {
        const response = await fetch(`${this.baseUrl}/indexes`, {
          headers: { 'Api-Key': config.apiKey! },
        });
        return response.ok;
      }
    } catch (error) {
      logger.error('Pinecone testConnection error:', error);
      return false;
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxDimensions: 20000,
      supportedMetrics: ['cosine', 'euclidean', 'dotproduct'],
      supportsFiltering: true,
      supportsMetadata: true,
      maxVectorSize: 40000,
      supportsBatching: true,
      supportsNamespaces: true,
      sdkAvailable: this.sdkAvailable,
    };
  }

  private async getIndexHost(config: VectorStoreConfig): Promise<string> {
    if (config.url) {
      return config.url;
    }

    const response = await fetch(`${this.baseUrl}/indexes/${config.index || 'default'}`, {
      headers: { 'Api-Key': config.apiKey! },
    });

    if (!response.ok) {
      throw new Error(`Failed to get index host: ${response.status}`);
    }

    const indexInfo = await response.json();
    return `https://${indexInfo.host}`;
  }
}
