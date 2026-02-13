/**
 * Weaviate Vector Store Provider
 * HTTP-based implementation for Weaviate vector database
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
} from '../types';

export class WeaviateProvider extends VectorStoreProvider {
  async insert(
    config: VectorStoreConfig,
    documents: VectorDocument[]
  ): Promise<VectorInsertResult> {
    try {
      const objects = documents.map((doc) => ({
        class: config.collection,
        id: doc.id,
        properties: {
          content: doc.content,
          ...doc.metadata,
        },
        vector: doc.embedding,
      }));

      const response = await fetch(`${config.url}/v1/batch/objects`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ objects }),
      });

      if (!response.ok) {
        throw new Error(`Weaviate insert failed: ${response.statusText}`);
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
      const gqlQuery = `
        {
          Get {
            ${config.collection}(
              nearVector: {
                vector: [${query.vector?.join(', ')}]
                limit: ${query.topK}
              }
            ) {
              _id
              content
              _additional {
                distance
              }
            }
          }
        }
      `;

      const response = await fetch(`${config.url}/v1/graphql`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: gqlQuery }),
      });

      if (!response.ok) {
        throw new Error(`Weaviate search failed: ${response.statusText}`);
      }

      const data = await response.json();
      const results = data.data.Get[config.collection!] || [];
      const documents: VectorDocument[] = results.map((result: unknown) => ({
        id: (result as { _id: string })._id,
        content: (result as { content: string }).content,
        metadata: {},
        score: 1 - (result as { _additional: { distance: number } })._additional.distance,
      }));

      return {
        documents,
        totalResults: documents.length,
        executionTime: Date.now() - startTime,
        searchId: `weaviate_${Date.now()}`,
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
      const errors: string[] = [];
      let deleted = 0;

      for (const id of vectorIds) {
        const response = await fetch(`${config.url}/v1/objects/${config.collection}/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${config.apiKey}` },
        });

        if (response.ok) {
          deleted++;
        } else {
          errors.push(`Failed to delete ${id}: ${response.statusText}`);
        }
      }

      return { success: errors.length === 0, deleted, errors };
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
      const schema = {
        class: indexName,
        description: `Vector index created by WorkflowBuilder Pro (${dimensions}D)`,
        vectorizer: 'none',
        properties: [
          {
            name: 'content',
            dataType: ['text'],
            description: 'Content of the document',
          },
        ],
      };

      const response = await fetch(`${config.url}/v1/schema`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(schema),
      });

      if (!response.ok) {
        throw new Error(`Weaviate schema creation failed: ${response.statusText}`);
      }

      return { success: true, indexName };
    } catch (error) {
      throw error;
    }
  }

  async deleteIndex(config: VectorStoreConfig, indexName: string): Promise<VectorIndexDeleteResult> {
    try {
      const response = await fetch(`${config.url}/v1/schema/${indexName}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });

      if (!response.ok) {
        throw new Error(`Weaviate schema deletion failed: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  async getIndexStats(config: VectorStoreConfig, indexName: string): Promise<VectorIndexStats> {
    try {
      const response = await fetch(`${config.url}/v1/meta`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });

      if (!response.ok) {
        throw new Error(`Weaviate meta retrieval failed: ${response.statusText}`);
      }

      const data = await response.json();
      const stats = data;
      logger.debug(`Stats for index ${indexName}:`, stats);

      return {
        totalVectors: stats.totalVectors || 0,
        dimensions: stats.dimensions || 0,
        indexSize: stats.indexSize || 0,
        memoryUsage: stats.memoryUsage || 0,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      throw error;
    }
  }

  async testConnection(config: VectorStoreConfig): Promise<boolean> {
    try {
      const response = await fetch(`${config.url}/v1/.well-known/ready`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxDimensions: 65536,
      supportedMetrics: ['cosine', 'euclidean', 'manhattan', 'hamming'],
      supportsFiltering: true,
      supportsMetadata: true,
      maxVectorSize: 100000,
      supportsBatching: true,
    };
  }
}
