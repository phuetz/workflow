/**
 * Apollo Federation Manager
 * Coordinates Apollo Federation 2.x subgraphs and supergraph composition
 */

import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../types/graphql';
import { SubgraphRegistry } from './SubgraphRegistry';
import { SupergraphComposer } from './SupergraphComposer';
import { logger } from '../../services/SimpleLogger';

/**
 * Subgraph configuration
 */
export interface SubgraphConfig {
  name: string;
  url: string;
  schema?: string;
  active: boolean;
  healthCheckUrl?: string;
  timeout?: number;
  retries?: number;
}

/**
 * Federation configuration
 */
export interface FederationConfig {
  mode: 'managed' | 'unmanaged';
  pollIntervalMs?: number;
  serviceList?: SubgraphConfig[];
  introspection?: boolean;
  debug?: boolean;
}

/**
 * Federation metrics
 */
export interface FederationMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  subgraphLatencies: Map<string, number>;
  errors: Array<{
    timestamp: Date;
    subgraph: string;
    error: string;
  }>;
}

/**
 * FederationManager coordinates Apollo Federation setup
 */
export class FederationManager {
  private gateway: ApolloGateway | null = null;
  private server: ApolloServer | null = null;
  private registry: SubgraphRegistry;
  private composer: SupergraphComposer;
  private metrics: FederationMetrics;
  private config: FederationConfig;
  private latencies: number[] = [];

  constructor(config: FederationConfig) {
    this.config = config;
    this.registry = new SubgraphRegistry();
    this.composer = new SupergraphComposer();
    this.metrics = this.initializeMetrics();
  }

  /**
   * Initialize the federation gateway
   */
  async initialize(): Promise<void> {
    if (this.config.mode === 'managed') {
      await this.initializeManagedFederation();
    } else {
      await this.initializeUnmanagedFederation();
    }
  }

  /**
   * Initialize managed federation (Apollo Studio)
   */
  private async initializeManagedFederation(): Promise<void> {
    this.gateway = new ApolloGateway({
      // Managed mode uses Apollo Studio for schema composition
      async supergraphSdl({ healthCheck }) {
        if (healthCheck) {
          // Perform health check
          await this.performHealthChecks();
        }

        // Fetch supergraph SDL from Apollo Studio or local composition
        return this.composer.getSupergraphSDL();
      },
      buildService: ({ url }) => {
        return new RemoteGraphQLDataSource({
          url,
          willSendRequest: ({ request, context }) => {
            // Forward authentication headers
            if ((context as GraphQLContext).user) {
              request.http?.headers.set(
                'x-user-id',
                (context as GraphQLContext).user!.id
              );
              request.http?.headers.set(
                'x-user-role',
                (context as GraphQLContext).user!.role
              );
            }
          },
          didReceiveResponse: ({ response, request, context }) => {
            // Record metrics
            const latency = Date.now() - (request as any).startTime;
            this.recordLatency(latency);

            return response;
          }
        });
      }
    });

    await this.gateway.load();
  }

  /**
   * Initialize unmanaged federation (static service list)
   */
  private async initializeUnmanagedFederation(): Promise<void> {
    if (!this.config.serviceList || this.config.serviceList.length === 0) {
      throw new Error('Service list is required for unmanaged federation');
    }

    // Register all subgraphs
    for (const service of this.config.serviceList) {
      await this.registry.registerSubgraph({
        name: service.name,
        url: service.url,
        schema: service.schema || '',
        version: '1.0.0',
        active: service.active
      });
    }

    // Compose supergraph
    const supergraphSdl = await this.composer.composeSupergraph(
      this.config.serviceList.map(s => ({
        name: s.name,
        url: s.url,
        schema: s.schema || ''
      }))
    );

    this.gateway = new ApolloGateway({
      supergraphSdl,
      serviceList: this.config.serviceList.filter(s => s.active),
      buildService: ({ url, name }) => {
        return new RemoteGraphQLDataSource({
          url,
          willSendRequest: async ({ request, context }) => {
            const startTime = Date.now();
            (request as any).startTime = startTime;
            (request as any).subgraph = name;

            // Forward authentication
            if ((context as GraphQLContext).user) {
              request.http?.headers.set(
                'x-user-id',
                (context as GraphQLContext).user!.id
              );
            }

            // Add tracing headers
            if (context.requestId) {
              request.http?.headers.set('x-request-id', context.requestId);
            }
          },
          didReceiveResponse: async ({ response, request, context }) => {
            const latency = Date.now() - (request as any).startTime;
            const subgraph = (request as any).subgraph;

            this.recordLatency(latency, subgraph);

            // Track errors
            if (response.errors && response.errors.length > 0) {
              this.recordError(subgraph, response.errors[0].message);
            }

            return response;
          },
          didEncounterError: (error: any) => {
            const subgraph = error.request?.subgraph || 'unknown';
            this.recordError(subgraph, error.message || String(error));
            throw error;
          }
        });
      }
    });

    await this.gateway.load();
  }

  /**
   * Create Apollo Server with gateway
   */
  createServer(): ApolloServer {
    if (!this.gateway) {
      throw new Error('Gateway not initialized. Call initialize() first.');
    }

    this.server = new ApolloServer({
      gateway: this.gateway,
      introspection: this.config.introspection ?? true,
      plugins: [
        // Request metrics plugin
        {
          async requestDidStart() {
            const startTime = Date.now();

            return {
              async willSendResponse({ response }) {
                const duration = Date.now() - startTime;
                // Record request metrics
              }
            };
          }
        },
        // Error reporting plugin
        {
          async requestDidStart() {
            return {
              async didEncounterErrors({ errors }) {
                for (const error of errors) {
                  logger.error('GraphQL Error:', error);
                }
              }
            };
          }
        }
      ],
      formatError: (formattedError, error) => {
        // Sanitize errors for production
        if (process.env.NODE_ENV === 'production') {
          delete formattedError.extensions?.exception;
        }

        return formattedError;
      }
    });

    return this.server;
  }

  /**
   * Register a new subgraph
   */
  async registerSubgraph(config: SubgraphConfig): Promise<void> {
    await this.registry.registerSubgraph({
      name: config.name,
      url: config.url,
      schema: config.schema || '',
      version: '1.0.0',
      active: config.active
    });

    // Recompose supergraph if in unmanaged mode
    if (this.config.mode === 'unmanaged') {
      await this.recomposeSupergraph();
    }
  }

  /**
   * Unregister a subgraph
   */
  async unregisterSubgraph(name: string): Promise<void> {
    await this.registry.unregisterSubgraph(name);

    // Recompose supergraph if in unmanaged mode
    if (this.config.mode === 'unmanaged') {
      await this.recomposeSupergraph();
    }
  }

  /**
   * Update subgraph schema
   */
  async updateSubgraphSchema(name: string, schema: string): Promise<void> {
    const subgraph = await this.registry.getSubgraph(name);
    if (!subgraph) {
      throw new Error(`Subgraph ${name} not found`);
    }

    await this.registry.updateSubgraphSchema(name, schema);

    // Recompose supergraph
    if (this.config.mode === 'unmanaged') {
      await this.recomposeSupergraph();
    }
  }

  /**
   * Recompose the supergraph
   */
  private async recomposeSupergraph(): Promise<void> {
    const subgraphs = await this.registry.listSubgraphs();
    const activeSubgraphs = subgraphs.filter(s => s.active);

    const supergraphSdl = await this.composer.composeSupergraph(
      activeSubgraphs.map(s => ({
        name: s.name,
        url: s.url,
        schema: s.schema
      }))
    );

    // Update gateway with new supergraph
    // Note: In production, you may need to stop the old gateway and create a new one
    // or implement hot reloading based on your Apollo Gateway version
    if (this.gateway) {
      await this.gateway.stop();
      // Reinitialize with new supergraph
      await this.initializeUnmanagedFederation();
    }
  }

  /**
   * Perform health checks on all subgraphs
   */
  private async performHealthChecks(): Promise<void> {
    const subgraphs = await this.registry.listSubgraphs();

    const checks = subgraphs.map(async (subgraph) => {
      try {
        const response = await fetch(subgraph.healthCheckUrl || subgraph.url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`Health check failed: ${response.statusText}`);
        }

        return { name: subgraph.name, healthy: true };
      } catch (error) {
        logger.error(`Health check failed for ${subgraph.name}:`, error);
        return { name: subgraph.name, healthy: false };
      }
    });

    const results = await Promise.all(checks);

    // Deactivate unhealthy subgraphs
    for (const result of results) {
      if (!result.healthy) {
        await this.registry.deactivateSubgraph(result.name);
      }
    }
  }

  /**
   * Get federation metrics
   */
  getMetrics(): FederationMetrics {
    // Calculate percentiles
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      ...this.metrics,
      p95Latency: sorted[p95Index] || 0,
      p99Latency: sorted[p99Index] || 0,
      averageLatency:
        this.latencies.length > 0
          ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
          : 0
    };
  }

  /**
   * Record request latency
   */
  private recordLatency(latency: number, subgraph?: string): void {
    this.latencies.push(latency);
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;

    // Keep only last 1000 latencies
    if (this.latencies.length > 1000) {
      this.latencies.shift();
    }

    // Record subgraph-specific latency
    if (subgraph) {
      this.metrics.subgraphLatencies.set(subgraph, latency);
    }
  }

  /**
   * Record error
   */
  private recordError(subgraph: string, error: string): void {
    this.metrics.failedRequests++;
    this.metrics.errors.push({
      timestamp: new Date(),
      subgraph,
      error
    });

    // Keep only last 100 errors
    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): FederationMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      subgraphLatencies: new Map(),
      errors: []
    };
  }

  /**
   * Shutdown the gateway
   */
  async shutdown(): Promise<void> {
    if (this.server) {
      await this.server.stop();
    }

    if (this.gateway) {
      await this.gateway.stop();
    }
  }

  /**
   * Get gateway instance
   */
  getGateway(): ApolloGateway | null {
    return this.gateway;
  }

  /**
   * Get server instance
   */
  getServer(): ApolloServer | null {
    return this.server;
  }

  /**
   * Get registry
   */
  getRegistry(): SubgraphRegistry {
    return this.registry;
  }

  /**
   * Get composer
   */
  getComposer(): SupergraphComposer {
    return this.composer;
  }
}

export default FederationManager;
