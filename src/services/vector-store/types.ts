/**
 * Vector Store Types and Interfaces
 * Centralized type definitions for vector store operations
 */

export interface VectorStoreConfig {
  provider: 'pinecone' | 'weaviate' | 'chroma' | 'milvus' | 'qdrant';
  apiKey?: string;
  url?: string;
  environment?: string;
  index?: string;
  collection?: string;
  dimensions?: number;
  metric?: 'cosine' | 'euclidean' | 'dotproduct';
}

export interface VectorDocument {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
  score?: number;
}

export interface VectorQuery {
  vector?: number[];
  text?: string;
  topK: number;
  filter?: Record<string, unknown>;
  includeMetadata?: boolean;
  includeValues?: boolean;
}

export interface VectorSearchResult {
  documents: VectorDocument[];
  totalResults: number;
  executionTime: number;
  searchId: string;
}

export interface VectorIndexStats {
  totalVectors: number;
  dimensions: number;
  indexSize: number;
  memoryUsage: number;
  lastUpdated: string;
}

export interface VectorInsertResult {
  success: boolean;
  inserted: number;
  errors: string[];
}

export interface VectorUpdateResult {
  success: boolean;
  updated: number;
  errors: string[];
}

export interface VectorDeleteResult {
  success: boolean;
  deleted: number;
  errors: string[];
}

export interface VectorIndexCreateResult {
  success: boolean;
  indexName: string;
}

export interface VectorIndexDeleteResult {
  success: boolean;
}

export interface ProviderCapabilities {
  maxDimensions: number;
  supportedMetrics: string[];
  supportsFiltering: boolean;
  supportsMetadata: boolean;
  maxVectorSize: number;
  supportsBatching: boolean;
  supportsNamespaces?: boolean;
  supportsPayloads?: boolean;
  sdkAvailable?: boolean;
}

// Pinecone-specific types
export interface PineconeMatch {
  id: string;
  score?: number;
  values?: number[];
  metadata?: Record<string, unknown>;
}

export interface PineconeIndexStats {
  totalRecordCount?: number;
  totalVectorCount?: number;
  dimension?: number;
  indexFullness?: number;
  namespaces?: Record<string, { recordCount: number }>;
}

// Qdrant-specific types
export interface QdrantSearchResult {
  id: string | number;
  score: number;
  payload?: Record<string, unknown>;
  vector?: number[];
}

export interface QdrantCollectionInfo {
  status?: string;
  vectors_count?: number;
  points_count?: number;
  config?: {
    params?: {
      vectors?: {
        size?: number;
      };
    };
  };
  segments_count?: number;
}
