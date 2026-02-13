/**
 * Vector Store Service
 * Main orchestrator for vector store operations across multiple providers
 *
 * Refactored: Extracted providers and utilities to src/services/vector-store/
 */

import { SecretsService } from './SecretsService';
import { logger } from './SimpleLogger';
import {
  VectorStoreProvider,
  EmbeddingGenerator,
  PineconeProvider,
  WeaviateProvider,
  ChromaProvider,
  MilvusProvider,
  QdrantProvider,
} from './vector-store';
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
} from './vector-store';

// Re-export types for backward compatibility
export type {
  VectorStoreConfig,
  VectorDocument,
  VectorQuery,
  VectorSearchResult,
  VectorIndexStats,
};

export class VectorStoreService {
  private secretsService: SecretsService;
  private providers: Map<string, VectorStoreProvider> = new Map();
  private embeddingGenerator: EmbeddingGenerator;

  constructor(secretsService: SecretsService) {
    this.secretsService = secretsService;
    this.embeddingGenerator = new EmbeddingGenerator();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    this.providers.set('pinecone', new PineconeProvider());
    this.providers.set('weaviate', new WeaviateProvider());
    this.providers.set('chroma', new ChromaProvider());
    this.providers.set('milvus', new MilvusProvider());
    this.providers.set('qdrant', new QdrantProvider());
  }

  private getProvider(providerName: string): VectorStoreProvider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Unsupported vector store provider: ${providerName}`);
    }
    return provider;
  }

  // Vector Operations
  async insertVectors(
    config: VectorStoreConfig,
    documents: VectorDocument[]
  ): Promise<VectorInsertResult> {
    const provider = this.getProvider(config.provider);
    try {
      return await provider.insert(config, documents);
    } catch (error) {
      logger.error(`Vector insertion failed for ${config.provider}:`, error);
      throw error;
    }
  }

  async searchVectors(
    config: VectorStoreConfig,
    query: VectorQuery
  ): Promise<VectorSearchResult> {
    const provider = this.getProvider(config.provider);
    try {
      return await provider.search(config, query);
    } catch (error) {
      logger.error(`Vector search failed for ${config.provider}:`, error);
      throw error;
    }
  }

  async updateVectors(
    config: VectorStoreConfig,
    documents: VectorDocument[]
  ): Promise<VectorUpdateResult> {
    const provider = this.getProvider(config.provider);
    try {
      return await provider.update(config, documents);
    } catch (error) {
      logger.error(`Vector update failed for ${config.provider}:`, error);
      throw error;
    }
  }

  async deleteVectors(
    config: VectorStoreConfig,
    vectorIds: string[]
  ): Promise<VectorDeleteResult> {
    const provider = this.getProvider(config.provider);
    try {
      return await provider.delete(config, vectorIds);
    } catch (error) {
      logger.error(`Vector deletion failed for ${config.provider}:`, error);
      throw error;
    }
  }

  // Index Management
  async createIndex(
    config: VectorStoreConfig,
    indexName: string,
    dimensions: number
  ): Promise<VectorIndexCreateResult> {
    const provider = this.getProvider(config.provider);
    try {
      return await provider.createIndex(config, indexName, dimensions);
    } catch (error) {
      logger.error(`Index creation failed for ${config.provider}:`, error);
      throw error;
    }
  }

  async deleteIndex(
    config: VectorStoreConfig,
    indexName: string
  ): Promise<VectorIndexDeleteResult> {
    const provider = this.getProvider(config.provider);
    try {
      return await provider.deleteIndex(config, indexName);
    } catch (error) {
      logger.error(`Index deletion failed for ${config.provider}:`, error);
      throw error;
    }
  }

  async getIndexStats(
    config: VectorStoreConfig,
    indexName: string
  ): Promise<VectorIndexStats> {
    const provider = this.getProvider(config.provider);
    try {
      return await provider.getIndexStats(config, indexName);
    } catch (error) {
      logger.error(`Index stats retrieval failed for ${config.provider}:`, error);
      throw error;
    }
  }

  // Embedding Generation
  async generateEmbeddings(
    texts: string[],
    model: string = 'text-embedding-ada-002'
  ): Promise<number[][]> {
    return this.embeddingGenerator.generateEmbeddings(texts, model);
  }

  // Utility Methods
  async testConnection(config: VectorStoreConfig): Promise<boolean> {
    const provider = this.providers.get(config.provider);
    if (!provider) {
      return false;
    }

    try {
      return await provider.testConnection(config);
    } catch (error) {
      logger.error(`Connection test failed for ${config.provider}:`, error);
      return false;
    }
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  async getProviderCapabilities(provider: string): Promise<ProviderCapabilities> {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    return providerInstance.getCapabilities();
  }

  // Advanced Operations
  async batchInsert(
    config: VectorStoreConfig,
    documents: VectorDocument[],
    batchSize: number = 100
  ): Promise<{ totalInserted: number; errors: string[] }> {
    let totalInserted = 0;
    const allErrors: string[] = [];

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const result = await this.insertVectors(config, batch);
      totalInserted += result.inserted;
      allErrors.push(...result.errors);
    }

    return { totalInserted, errors: allErrors };
  }

  async searchWithEmbedding(
    config: VectorStoreConfig,
    text: string,
    topK: number,
    filter?: Record<string, unknown>
  ): Promise<VectorSearchResult> {
    const embeddings = await this.generateEmbeddings([text]);
    return this.searchVectors(config, {
      vector: embeddings[0],
      topK,
      filter,
      includeMetadata: true,
    });
  }

  async insertWithEmbedding(
    config: VectorStoreConfig,
    documents: Omit<VectorDocument, 'embedding'>[]
  ): Promise<VectorInsertResult> {
    const texts = documents.map((doc) => doc.content);
    const embeddings = await this.generateEmbeddings(texts);

    const docsWithEmbeddings: VectorDocument[] = documents.map((doc, index) => ({
      ...doc,
      embedding: embeddings[index],
    }));

    return this.insertVectors(config, docsWithEmbeddings);
  }

  // Expose secrets service for credential retrieval (used by some integrations)
  getSecretsService(): SecretsService {
    return this.secretsService;
  }
}
