import { 
  GraphQLSchema, 
  GraphQLObjectType, 
  GraphQLString, 
  GraphQLID, 
  GraphQLList, 
  GraphQLNonNull, 
  GraphQLInputObjectType,
  GraphQLEnumType,
  GraphQLBoolean,
  GraphQLInt,
  GraphQLFloat,
  GraphQLUnionType,
  GraphQLInterfaceType,
  GraphQLFieldConfig,
  GraphQLResolveInfo,
  execute,
  subscribe,
  parse,
  validate,
  buildSchema,
  printSchema
} from 'graphql';

import { RBACService } from './RBACService';
import { SecretsService } from './SecretsService';
import { LLMService } from './LLMService';
import { MarketplaceService } from './MarketplaceService';
import { PluginEngine } from './PluginEngine';
import { logger } from './LoggingService';

export interface GraphQLContext {
  userId: string;
  organizationId: string;
  permissions: string[];
  services: {
    rbac: RBACService;
    secrets: SecretsService;
    llm: LLMService;
    marketplace: MarketplaceService;
    plugins: PluginEngine;
  };
  request: Record<string, unknown>;
  response: Record<string, unknown>;
}

export interface GraphQLSubscriptionContext extends GraphQLContext {
  pubsub: PubSubService;
}

export interface PubSubService {
  publish(event: string, payload: unknown): void;
  subscribe(event: string, callback: (payload: unknown) => void): () => void;
  asyncIterator(events: string[]): AsyncIterableIterator<unknown>;
}

export class GraphQLService {
  private schema: GraphQLSchema;
  private pubsub: PubSubService;
  private subscriptions: Map<string, Set<(payload: unknown) => void>> = new Map();
  private resolvers: Map<string, unknown> = new Map();
  
  // MEMORY LEAK FIX: Track active subscriptions for cleanup
  private activeSubscriptions: Map<string, {
    callback: (payload: unknown) => void;
    events: string[];
    createdAt: number;
    lastActivity: number;
    clientId: string;
  }> = new Map();
  
  // MEMORY LEAK FIX: Cleanup intervals
  private cleanupInterval: NodeJS.Timeout;
  private readonly SUBSCRIPTION_TIMEOUT = 300000; // 5 minutes
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute
  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly RATE_LIMIT_CLEANUP_INTERVAL = 300000; // 5 minutes

  constructor(
    private rbacService: RBACService,
    private secretsService: SecretsService,
    private llmService: LLMService,
    private marketplaceService: MarketplaceService,
    private pluginEngine: PluginEngine
  ) {
    this.pubsub = this.createPubSubService();
    this.schema = this.createSchema();
    
    // MEMORY LEAK FIX: Start cleanup processes
    this.startCleanupProcesses();
  }
  
  /**
   * MEMORY LEAK FIX: Start automatic cleanup processes
   */
  private startCleanupProcesses(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSubscriptions();
      this.cleanupExpiredCache();
      this.cleanupExpiredRateLimits();
    }, this.CLEANUP_INTERVAL);
    
    // Prevent the interval from keeping the process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }
  
  /**
   * MEMORY LEAK FIX: Cleanup expired subscriptions
   */
  private cleanupExpiredSubscriptions(): void {
    const expiredIds: string[] = [];
    
    for (const [id, subscription] of this.activeSubscriptions) {
      // Remove subscriptions that haven't been active for the timeout period
      if (now - subscription.lastActivity > this.SUBSCRIPTION_TIMEOUT) {
        logger.info(`Cleaning up expired subscription: ${id}`);
        
        // Remove from event subscriptions
        for (const event of subscription.events) {
          if (listeners) {
            listeners.delete(subscription.callback);
            if (listeners.size === 0) {
              this.subscriptions.delete(event);
            }
          }
        }
        
        expiredIds.push(id);
      }
    }
    
    // Remove expired subscriptions from active tracking
    expiredIds.forEach(id => this.activeSubscriptions.delete(id));
    
    if (expiredIds.length > 0) {
      logger.info(`Cleaned up ${expiredIds.length} expired subscriptions`);
    }
  }
  
  /**
   * MEMORY LEAK FIX: Cleanup expired cache entries
   */
  private cleanupExpiredCache(): void {
    const expiredKeys: string[] = [];
    
    for (const [key, cached] of this.cache) {
      if (now >= cached.expiry) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      logger.debug(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }
  
  /**
   * MEMORY LEAK FIX: Cleanup expired rate limit entries
   */
  private cleanupExpiredRateLimits(): void {
    const expiredUsers: string[] = [];
    
    for (const [userId, limit] of this.rateLimitMap) {
      if (now > limit.resetTime) {
        expiredUsers.push(userId);
      }
    }
    
    expiredUsers.forEach(userId => this.rateLimitMap.delete(userId));
    
    if (expiredUsers.length > 0) {
      logger.debug(`Cleaned up ${expiredUsers.length} expired rate limit entries`);
    }
  }

  private createPubSubService(): PubSubService {
    return {
      publish: (event: string, payload: unknown) => {
        if (listeners) {
          listeners.forEach(callback => callback(payload));
        }
      },
      subscribe: (event: string, callback: (payload: unknown) => void, clientId?: string) => {
        if (!this.subscriptions.has(event)) {
          this.subscriptions.set(event, new Set());
        }
        this.subscriptions.get(event)!.add(callback);
        
        // MEMORY LEAK FIX: Track active subscription for cleanup
        this.activeSubscriptions.set(subscriptionId, {
          callback,
          events: [event],
          createdAt: Date.now(),
          lastActivity: Date.now(),
          clientId: clientId || 'unknown'
        });
        
        return () => {
          // MEMORY LEAK FIX: Proper cleanup on unsubscribe
          this.subscriptions.get(event)?.delete(callback);
          
          // Clean up empty event sets
          if (this.subscriptions.get(event)?.size === 0) {
            this.subscriptions.delete(event);
          }
          
          // Remove from active subscriptions tracking
          this.activeSubscriptions.delete(subscriptionId);
        };
      },
      asyncIterator: (events: string[], clientId?: string) => {
        return this.createAsyncIterator(events, clientId);
      }
    };
  }

  private async *createAsyncIterator(events: string[], clientId?: string): AsyncIterableIterator<unknown> {
    const queue: unknown[] = [];
    let resolve: ((value: unknown) => void) | null = null;
    
    // MEMORY LEAK FIX: Enhanced protection against infinite loops and resource exhaustion
    
    // MEMORY LEAK FIX: Track this iterator for cleanup
    
    const unsubscribeFunctions: (() => void)[] = [];
    
    try {
      // MEMORY LEAK FIX: Create subscriptions with proper tracking
      for (const event of events) {
          // MEMORY LEAK FIX: Prevent queue from growing too large
          if (queue.length >= MAX_QUEUE_SIZE) {
            logger.warn(`Queue size limit reached for subscription ${iteratorId}, dropping oldest events`);
            queue.shift(); // Remove oldest event
          }
          
          queue.push({ event, payload });
          if (resolve) {
            resolve(item);
            resolve = null;
          }
        }, clientId);
        
        unsubscribeFunctions.push(unsubscribe);
      }
      
      // MEMORY LEAK FIX: Track active iterator
      this.activeSubscriptions.set(iteratorId, {
        callback: () => {}, // Placeholder for compatibility
        events,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        clientId: clientId || 'unknown'
      });

      while (!done) {
        // MEMORY LEAK FIX: Update last activity
        if (subscription) {
          subscription.lastActivity = Date.now();
        }
        
        // Vérifier le timeout pour éviter les souscriptions infinies
        if (Date.now() - startTime > MAX_SUBSCRIPTION_TIME) {
          logger.warn(`GraphQL subscription timeout for ${iteratorId}, closing to prevent resource exhaustion`);
          done = true;
          break;
        }
        
        // Vérifier le nombre d'itérations pour éviter les boucles rapides
        iterationCount++;
        if (iterationCount > MAX_ITERATIONS) {
          logger.warn(`GraphQL subscription max iterations reached for ${iteratorId}, closing to prevent DoS`);
          done = true;
          break;
        }

        if (queue.length > 0) {
          yield queue.shift();
        } else {
          // MEMORY LEAK FIX: Use AbortController for better cancellation
            abortController.abort();
          }, 30000); // 30 second timeout
          
          try {
            await Promise.race([
              new Promise<unknown>(r => {
                resolve = r;
                abortController.signal.addEventListener('abort', () => {
                  resolve = null;
                  r({ timeout: true });
                });
              }),
              new Promise<void>((_, reject) => {
                abortController.signal.addEventListener('abort', () => {
                  reject(new Error('Subscription timeout'));
                });
              })
            ]);
          } catch (error) {
            if (error.message === 'Subscription timeout') {
              logger.debug(`Subscription ${iteratorId} timed out waiting for events`);
            }
          } finally {
            clearTimeout(timeout);
          }
        }
      }
    } catch (error) {
      logger.error(`Error in GraphQL subscription iterator ${iteratorId}:`, error);
      done = true;
    } finally {
      // MEMORY LEAK FIX: Ensure cleanup always happens
      try {
        unsubscribeFunctions.forEach(unsubscribe => {
          try {
            unsubscribe();
          } catch (cleanupError) {
            logger.error('Error during subscription cleanup:', cleanupError);
          }
        });
        
        // Remove from active subscriptions
        this.activeSubscriptions.delete(iteratorId);
        
        // Clear any remaining resolve function
        resolve = null;
        
        logger.debug(`Cleaned up GraphQL subscription iterator ${iteratorId}`);
      } catch (finalCleanupError) {
        logger.error('Error during final subscription cleanup:', finalCleanupError);
      }
    }
  }

  private createSchema(): GraphQLSchema {
    // User Types
      name: 'User',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        email: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        avatar: { type: GraphQLString },
        status: { type: new GraphQLNonNull(GraphQLString) },
        roles: { type: new GraphQLList(RoleType) },
        permissions: { type: new GraphQLList(PermissionType) },
        createdAt: { type: new GraphQLNonNull(GraphQLString) },
        updatedAt: { type: new GraphQLNonNull(GraphQLString) }
      }
    });

      name: 'Role',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: GraphQLString },
        permissions: { type: new GraphQLList(PermissionType) },
        isSystemRole: { type: new GraphQLNonNull(GraphQLBoolean) },
        createdAt: { type: new GraphQLNonNull(GraphQLString) }
      }
    });

      name: 'Permission',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: GraphQLString },
        resource: { type: new GraphQLNonNull(GraphQLString) },
        action: { type: new GraphQLNonNull(GraphQLString) }
      }
    });

    // Secret Types
      name: 'Secret',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: GraphQLString },
        type: { type: new GraphQLNonNull(GraphQLString) },
        encrypted: { type: new GraphQLNonNull(GraphQLBoolean) },
        tags: { type: new GraphQLList(GraphQLString) },
        metadata: { type: SecretMetadataType },
        createdAt: { type: new GraphQLNonNull(GraphQLString) },
        updatedAt: { type: new GraphQLNonNull(GraphQLString) }
      }
    });

      name: 'SecretMetadata',
      fields: {
        version: { type: new GraphQLNonNull(GraphQLInt) },
        expiresAt: { type: GraphQLString },
        lastRotated: { type: GraphQLString },
        autoRotate: { type: new GraphQLNonNull(GraphQLBoolean) },
        source: { type: new GraphQLNonNull(GraphQLString) }
      }
    });

    // LLM Types
      name: 'LLMProvider',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: GraphQLString },
        type: { type: new GraphQLNonNull(GraphQLString) },
        status: { type: new GraphQLNonNull(GraphQLString) },
        models: { type: new GraphQLList(LLMModelType) },
        capabilities: { type: LLMCapabilitiesType }
      }
    });

      name: 'LLMModel',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: GraphQLString },
        type: { type: new GraphQLNonNull(GraphQLString) },
        contextLength: { type: new GraphQLNonNull(GraphQLInt) },
        maxTokens: { type: new GraphQLNonNull(GraphQLInt) },
        status: { type: new GraphQLNonNull(GraphQLString) },
        capabilities: { type: ModelCapabilitiesType },
        performance: { type: ModelPerformanceType }
      }
    });

      name: 'LLMCapabilities',
      fields: {
        streaming: { type: new GraphQLNonNull(GraphQLBoolean) },
        functionCalling: { type: new GraphQLNonNull(GraphQLBoolean) },
        imageInput: { type: new GraphQLNonNull(GraphQLBoolean) },
        jsonMode: { type: new GraphQLNonNull(GraphQLBoolean) },
        systemMessages: { type: new GraphQLNonNull(GraphQLBoolean) },
        contextWindow: { type: new GraphQLNonNull(GraphQLInt) }
      }
    });

      name: 'ModelCapabilities',
      fields: {
        textGeneration: { type: new GraphQLNonNull(GraphQLBoolean) },
        codeGeneration: { type: new GraphQLNonNull(GraphQLBoolean) },
        reasoning: { type: new GraphQLNonNull(GraphQLBoolean) },
        imageAnalysis: { type: new GraphQLNonNull(GraphQLBoolean) },
        functionCalling: { type: new GraphQLNonNull(GraphQLBoolean) },
        streaming: { type: new GraphQLNonNull(GraphQLBoolean) }
      }
    });

      name: 'ModelPerformance',
      fields: {
        averageLatency: { type: new GraphQLNonNull(GraphQLFloat) },
        tokensPerSecond: { type: new GraphQLNonNull(GraphQLFloat) },
        reliability: { type: new GraphQLNonNull(GraphQLFloat) },
        accuracy: { type: new GraphQLNonNull(GraphQLFloat) }
      }
    });

    // Plugin Types
      name: 'Plugin',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: GraphQLString },
        category: { type: new GraphQLNonNull(GraphQLString) },
        version: { type: new GraphQLNonNull(GraphQLString) },
        author: { type: new GraphQLNonNull(GraphQLString) },
        verified: { type: new GraphQLNonNull(GraphQLBoolean) },
        premium: { type: new GraphQLNonNull(GraphQLBoolean) },
        rating: { type: new GraphQLNonNull(GraphQLFloat) },
        downloads: { type: new GraphQLNonNull(GraphQLInt) },
        tags: { type: new GraphQLList(GraphQLString) }
      }
    });

    // Workflow Types
      name: 'Workflow',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: GraphQLString },
        status: { type: new GraphQLNonNull(GraphQLString) },
        nodes: { type: new GraphQLList(WorkflowNodeType) },
        edges: { type: new GraphQLList(WorkflowEdgeType) },
        createdAt: { type: new GraphQLNonNull(GraphQLString) },
        updatedAt: { type: new GraphQLNonNull(GraphQLString) }
      }
    });

      name: 'WorkflowNode',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        type: { type: new GraphQLNonNull(GraphQLString) },
        label: { type: new GraphQLNonNull(GraphQLString) },
        position: { type: PositionType },
        data: { type: GraphQLString },
        config: { type: GraphQLString }
      }
    });

      name: 'WorkflowEdge',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        source: { type: new GraphQLNonNull(GraphQLString) },
        target: { type: new GraphQLNonNull(GraphQLString) },
        sourceHandle: { type: GraphQLString },
        targetHandle: { type: GraphQLString },
        type: { type: GraphQLString },
        animated: { type: GraphQLBoolean }
      }
    });

      name: 'Position',
      fields: {
        x: { type: new GraphQLNonNull(GraphQLFloat) },
        y: { type: new GraphQLNonNull(GraphQLFloat) }
      }
    });

    // Execution Types
      name: 'Execution',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        workflowId: { type: new GraphQLNonNull(GraphQLString) },
        status: { type: new GraphQLNonNull(GraphQLString) },
        startedAt: { type: new GraphQLNonNull(GraphQLString) },
        completedAt: { type: GraphQLString },
        duration: { type: GraphQLInt },
        nodesExecuted: { type: new GraphQLList(GraphQLString) },
        errors: { type: new GraphQLList(GraphQLString) },
        result: { type: GraphQLString }
      }
    });

    // Input Types
      name: 'UserInput',
      fields: {
        email: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        avatar: { type: GraphQLString }
      }
    });

      name: 'SecretInput',
      fields: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: GraphQLString },
        type: { type: new GraphQLNonNull(GraphQLString) },
        value: { type: new GraphQLNonNull(GraphQLString) },
        tags: { type: new GraphQLList(GraphQLString) }
      }
    });

      name: 'LLMRequestInput',
      fields: {
        modelId: { type: new GraphQLNonNull(GraphQLString) },
        messages: { type: new GraphQLList(LLMMessageInputType) },
        temperature: { type: GraphQLFloat },
        maxTokens: { type: GraphQLInt },
        stream: { type: GraphQLBoolean }
      }
    });

      name: 'LLMMessageInput',
      fields: {
        role: { type: new GraphQLNonNull(GraphQLString) },
        content: { type: new GraphQLNonNull(GraphQLString) }
      }
    });

      name: 'WorkflowInput',
      fields: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: GraphQLString },
        nodes: { type: new GraphQLList(WorkflowNodeInputType) },
        edges: { type: new GraphQLList(WorkflowEdgeInputType) }
      }
    });

      name: 'WorkflowNodeInput',
      fields: {
        id: { type: GraphQLID },
        type: { type: new GraphQLNonNull(GraphQLString) },
        label: { type: new GraphQLNonNull(GraphQLString) },
        position: { type: PositionInputType },
        data: { type: GraphQLString },
        config: { type: GraphQLString }
      }
    });

      name: 'WorkflowEdgeInput',
      fields: {
        source: { type: new GraphQLNonNull(GraphQLString) },
        target: { type: new GraphQLNonNull(GraphQLString) },
        sourceHandle: { type: GraphQLString },
        targetHandle: { type: GraphQLString },
        type: { type: GraphQLString },
        animated: { type: GraphQLBoolean }
      }
    });

      name: 'PositionInput',
      fields: {
        x: { type: new GraphQLNonNull(GraphQLFloat) },
        y: { type: new GraphQLNonNull(GraphQLFloat) }
      }
    });

    // Response Types
      name: 'LLMResponse',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        content: { type: new GraphQLNonNull(GraphQLString) },
        finishReason: { type: new GraphQLNonNull(GraphQLString) },
        usage: { type: LLMUsageType },
        latency: { type: new GraphQLNonNull(GraphQLFloat) },
        cached: { type: new GraphQLNonNull(GraphQLBoolean) }
      }
    });

      name: 'LLMUsage',
      fields: {
        promptTokens: { type: new GraphQLNonNull(GraphQLInt) },
        completionTokens: { type: new GraphQLNonNull(GraphQLInt) },
        totalTokens: { type: new GraphQLNonNull(GraphQLInt) },
        cost: { type: new GraphQLNonNull(GraphQLFloat) },
        currency: { type: new GraphQLNonNull(GraphQLString) }
      }
    });

    // Mutation Response Types
      name: 'MutationResponse',
      fields: {
        success: { type: new GraphQLNonNull(GraphQLBoolean) },
        message: { type: GraphQLString },
        data: { type: GraphQLString }
      }
    });

    // Root Query
      name: 'Query',
      fields: {
        // User queries
        me: {
          type: UserType,
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            return context.services.rbac.getUser(context.userId);
          }
        },
        users: {
          type: new GraphQLList(UserType),
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            await this.checkPermission(context, 'users:read');
            return context.services.rbac.getUsers();
          }
        },
        user: {
          type: UserType,
          args: { id: { type: new GraphQLNonNull(GraphQLID) } },
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            await this.checkPermission(context, 'users:read');
            return context.services.rbac.getUser(args.id);
          }
        },

        // Role queries
        roles: {
          type: new GraphQLList(RoleType),
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            await this.checkPermission(context, 'roles:read');
            return context.services.rbac.getRoles();
          }
        },
        role: {
          type: RoleType,
          args: { id: { type: new GraphQLNonNull(GraphQLID) } },
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            await this.checkPermission(context, 'roles:read');
            return context.services.rbac.getRole(args.id);
          }
        },

        // Permission queries
        permissions: {
          type: new GraphQLList(PermissionType),
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            await this.checkPermission(context, 'permissions:read');
            return context.services.rbac.getPermissions();
          }
        },

        // Secret queries
        secrets: {
          type: new GraphQLList(SecretType),
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            await this.checkPermission(context, 'secrets:read');
            return context.services.secrets.getSecrets();
          }
        },
        secret: {
          type: SecretType,
          args: { id: { type: new GraphQLNonNull(GraphQLID) } },
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            await this.checkPermission(context, 'secrets:read');
            return context.services.secrets.getSecret(args.id, context.userId);
          }
        },

        // LLM queries
        llmProviders: {
          type: new GraphQLList(LLMProviderType),
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            return context.services.llm.getProviders();
          }
        },
        llmProvider: {
          type: LLMProviderType,
          args: { id: { type: new GraphQLNonNull(GraphQLID) } },
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            return context.services.llm.getProvider(args.id);
          }
        },
        llmModels: {
          type: new GraphQLList(LLMModelType),
          args: { providerId: { type: GraphQLID } },
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            return context.services.llm.getAvailableModels(args.providerId);
          }
        },

        // Plugin queries
        plugins: {
          type: new GraphQLList(PluginType),
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            return plugins;
          }
        },
        plugin: {
          type: PluginType,
          args: { id: { type: new GraphQLNonNull(GraphQLID) } },
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            return context.services.marketplace.getPluginDetails(args.id);
          }
        },

        // System queries
        health: {
          type: GraphQLString,
          resolve: () => 'OK'
        },
        version: {
          type: GraphQLString,
          resolve: () => '1.0.0'
        }
      }
    });

    // Root Mutation
      name: 'Mutation',
      fields: {
        // User mutations
        createUser: {
          type: UserType,
          args: { input: { type: new GraphQLNonNull(UserInputType) } },
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            await this.checkPermission(context, 'users:write');
            return context.services.rbac.createUser(args.input);
          }
        },
        updateUser: {
          type: UserType,
          args: { 
            id: { type: new GraphQLNonNull(GraphQLID) },
            input: { type: new GraphQLNonNull(UserInputType) }
          },
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            await this.checkPermission(context, 'users:write');
            return context.services.rbac.updateUser(args.id, args.input);
          }
        },
        deleteUser: {
          type: MutationResponseType,
          args: { id: { type: new GraphQLNonNull(GraphQLID) } },
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            await this.checkPermission(context, 'users:delete');
            return { success, message: success ? 'User deleted' : 'Failed to delete user' };
          }
        },

        // Role mutations
        assignRole: {
          type: MutationResponseType,
          args: { 
            userId: { type: new GraphQLNonNull(GraphQLID) },
            roleId: { type: new GraphQLNonNull(GraphQLID) }
          },
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            await this.checkPermission(context, 'roles:assign');
            return { success, message: success ? 'Role assigned' : 'Failed to assign role' };
          }
        },
        revokeRole: {
          type: MutationResponseType,
          args: { 
            userId: { type: new GraphQLNonNull(GraphQLID) },
            roleId: { type: new GraphQLNonNull(GraphQLID) }
          },
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            await this.checkPermission(context, 'roles:assign');
            return { success, message: success ? 'Role revoked' : 'Failed to revoke role' };
          }
        },

        // Secret mutations
        createSecret: {
          type: SecretType,
          args: { input: { type: new GraphQLNonNull(SecretInputType) } },
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            await this.checkPermission(context, 'secrets:write');
            return context.services.secrets.createSecret(args.input);
          }
        },
        updateSecret: {
          type: SecretType,
          args: { 
            id: { type: new GraphQLNonNull(GraphQLID) },
            input: { type: new GraphQLNonNull(SecretInputType) }
          },
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            await this.checkPermission(context, 'secrets:write');
            return context.services.secrets.updateSecret(args.id, args.input);
          }
        },
        deleteSecret: {
          type: MutationResponseType,
          args: { id: { type: new GraphQLNonNull(GraphQLID) } },
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            await this.checkPermission(context, 'secrets:delete');
            return { success, message: success ? 'Secret deleted' : 'Failed to delete secret' };
          }
        },
        rotateSecret: {
          type: MutationResponseType,
          args: { id: { type: new GraphQLNonNull(GraphQLID) } },
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            await this.checkPermission(context, 'secrets:write');
              strategy: 'immediate',
              validationSteps: [],
              rollbackOnFailure: true,
              notifyOnCompletion: true,
              notifications: []
            });
            return { success: true, message: 'Secret rotation started', data: jobId };
          }
        },

        // LLM mutations
        generateText: {
          type: LLMResponseType,
          args: { input: { type: new GraphQLNonNull(LLMRequestInputType) } },
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            await this.checkPermission(context, 'llm:use');
            const { _modelId, messages, temperature, maxTokens } = args.input;
            return context.services.llm.generateText(modelId, messages, {
              temperature,
              maxTokens
            });
          }
        },

        // Plugin mutations
        installPlugin: {
          type: MutationResponseType,
          args: { 
            id: { type: new GraphQLNonNull(GraphQLID) },
            version: { type: GraphQLString }
          },
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            await this.checkPermission(context, 'plugins:install');
            return { success, message: success ? 'Plugin installed' : 'Failed to install plugin' };
          }
        },
        uninstallPlugin: {
          type: MutationResponseType,
          args: { id: { type: new GraphQLNonNull(GraphQLID) } },
          resolve: async (parent: unknown, args: Record<string, unknown>, context: GraphQLContext) => {
            await this.checkPermission(context, 'plugins:uninstall');
            return { success, message: success ? 'Plugin uninstalled' : 'Failed to uninstall plugin' };
          }
        }
      }
    });

    // Root Subscription
      name: 'Subscription',
      fields: {
        workflowExecution: {
          type: ExecutionType,
          args: { workflowId: { type: new GraphQLNonNull(GraphQLID) } },
          subscribe: async (parent: unknown, args: Record<string, unknown>, context: GraphQLSubscriptionContext) => {
            await this.checkPermission(context, 'workflows:read');
            return context.pubsub.asyncIterator([`workflow_execution_${args.workflowId}`], clientId);
          }
        },
        userActivity: {
          type: UserType,
          subscribe: async (parent: unknown, args: Record<string, unknown>, context: GraphQLSubscriptionContext) => {
            await this.checkPermission(context, 'users:read');
            return context.pubsub.asyncIterator(['user_activity'], clientId);
          }
        },
        secretChanges: {
          type: SecretType,
          subscribe: async (parent: unknown, args: Record<string, unknown>, context: GraphQLSubscriptionContext) => {
            await this.checkPermission(context, 'secrets:read');
            return context.pubsub.asyncIterator(['secret_changes'], clientId);
          }
        },
        pluginEvents: {
          type: PluginType,
          subscribe: async (parent: unknown, args: Record<string, unknown>, context: GraphQLSubscriptionContext) => {
            return context.pubsub.asyncIterator(['plugin_events'], clientId);
          }
        }
      }
    });

    return new GraphQLSchema({
      query: RootQuery,
      mutation: RootMutation,
      subscription: RootSubscription
    });
  }

  private async checkPermission(context: GraphQLContext, permission: string): Promise<void> {
      context.userId,
      permission.split(':')[0],
      permission.split(':')[1]
    );
    
    if (!result.allowed) {
      throw new Error('Insufficient permissions');
    }
  }

  // Public API
  async execute(query: string, variables?: Record<string, unknown>, context?: Partial<GraphQLContext>): Promise<unknown> {
    
    if (validationErrors.length > 0) {
      throw new Error(`GraphQL validation error: ${validationErrors[0].message}`);
    }

    const fullContext: GraphQLContext = {
      userId: context?.userId || 'anonymous',
      organizationId: context?.organizationId || 'default',
      permissions: context?.permissions || [],
      services: {
        rbac: this.rbacService,
        secrets: this.secretsService,
        llm: this.llmService,
        marketplace: this.marketplaceService,
        plugins: this.pluginEngine
      },
      request: context?.request,
      response: context?.response
    };

    return execute({
      schema: this.schema,
      document,
      variableValues: variables,
      contextValue: fullContext
    });
  }

  async subscribe(query: string, variables?: Record<string, unknown>, context?: Partial<GraphQLContext>): Promise<unknown> {
    
    if (validationErrors.length > 0) {
      throw new Error(`GraphQL validation error: ${validationErrors[0].message}`);
    }

    const fullContext: GraphQLSubscriptionContext = {
      userId: context?.userId || 'anonymous',
      organizationId: context?.organizationId || 'default',
      permissions: context?.permissions || [],
      services: {
        rbac: this.rbacService,
        secrets: this.secretsService,
        llm: this.llmService,
        marketplace: this.marketplaceService,
        plugins: this.pluginEngine
      },
      request: context?.request,
      response: context?.response,
      pubsub: this.pubsub
    };

    return subscribe({
      schema: this.schema,
      document,
      variableValues: variables,
      contextValue: fullContext
    });
  }

  getSchema(): GraphQLSchema {
    return this.schema;
  }

  getSchemaSDL(): string {
    return printSchema(this.schema);
  }

  // Event publishing
  publishWorkflowExecution(workflowId: string, execution: unknown): void {
    this.pubsub.publish(`workflow_execution_${workflowId}`, execution);
  }

  publishUserActivity(user: unknown): void {
    this.pubsub.publish('user_activity', user);
  }

  publishSecretChanges(secret: unknown): void {
    this.pubsub.publish('secret_changes', secret);
  }

  publishPluginEvents(plugin: unknown): void {
    this.pubsub.publish('plugin_events', plugin);
  }

  // Introspection
  async introspect(): Promise<unknown> {
      query IntrospectionQuery {
        __schema {
          queryType { name }
          mutationType { name }
          subscriptionType { name }
          types {
            ...FullType
          }
          directives {
            name
            description
            locations
            args {
              ...InputValue
            }
          }
        }
      }

      fragment FullType on __Type {
        kind
        name
        description
        fields(includeDeprecated: true) {
          name
          description
          args {
            ...InputValue
          }
          type {
            ...TypeRef
          }
          isDeprecated
          deprecationReason
        }
        inputFields {
          ...InputValue
        }
        interfaces {
          ...TypeRef
        }
        enumValues(includeDeprecated: true) {
          name
          description
          isDeprecated
          deprecationReason
        }
        possibleTypes {
          ...TypeRef
        }
      }

      fragment InputValue on __InputValue {
        name
        description
        type { ...TypeRef }
        defaultValue
      }

      fragment TypeRef on __Type {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                    ofType {
                      kind
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    return this.execute(introspectionQuery);
  }

  // Middleware support
  addFieldResolver(typeName: string, fieldName: string, resolver: unknown): void {
    this.resolvers.set(key, resolver);
  }

  // Error handling
  formatError(error: Error): Record<string, unknown> {
    return {
      message: error.message,
      locations: (error as { locations?: unknown }).locations,
      path: (error as { path?: unknown }).path,
      extensions: {
        code: 'GRAPHQL_ERROR',
        timestamp: new Date().toISOString()
      }
    };
  }

  // MEMORY LEAK FIX: Rate limiting with size limits
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly MAX_RATE_LIMIT_ENTRIES = 10000;

  checkRateLimit(userId: string, limit: number = 100, window: number = 60000): boolean {
    
    // MEMORY LEAK FIX: Prevent unbounded growth of rate limit map
    if (this.rateLimitMap.size >= this.MAX_RATE_LIMIT_ENTRIES) {
      logger.warn('Rate limit map size limit reached, cleaning up expired entries');
      this.cleanupExpiredRateLimits();
      
      // If still at limit after cleanup, reject new entries
      if (this.rateLimitMap.size >= this.MAX_RATE_LIMIT_ENTRIES) {
        logger.error('Rate limit map still at capacity after cleanup, rejecting request');
        return false;
      }
    }
    

    if (!userLimit || now > userLimit.resetTime) {
      this.rateLimitMap.set(userId, { count: 1, resetTime: now + window });
      return true;
    }

    if (userLimit.count >= limit) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  // MEMORY LEAK FIX: Caching with size limits
  private cache: Map<string, { data: unknown; expiry: number; accessCount: number; lastAccessed: number }> = new Map();
  private readonly MAX_CACHE_ENTRIES = 5000;

  getCached(key: string): unknown {
    if (cached && Date.now() < cached.expiry) {
      // MEMORY LEAK FIX: Update access tracking for LRU
      cached.accessCount++;
      cached.lastAccessed = Date.now();
      return cached.data;
    }
    
    // MEMORY LEAK FIX: Remove expired entry immediately
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  setCached(key: string, data: unknown, ttl: number = 300000): void {
    
    // MEMORY LEAK FIX: Prevent unbounded cache growth
    if (this.cache.size >= this.MAX_CACHE_ENTRIES) {
      logger.warn('Cache size limit reached, cleaning up expired and LRU entries');
      this.cleanupExpiredCache();
      
      // If still at limit, remove least recently used entries
      if (this.cache.size >= this.MAX_CACHE_ENTRIES) {
          .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
          .slice(0, Math.floor(this.MAX_CACHE_ENTRIES * 0.1)); // Remove 10% oldest
        
        lruEntries.forEach(([key]) => this.cache.delete(key));
        logger.info(`Removed ${lruEntries.length} LRU cache entries`);
      }
    }
    
    this.cache.set(key, { 
      data, 
      expiry: now + ttl,
      accessCount: 0,
      lastAccessed: now
    });
  }

  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * MEMORY LEAK FIX: Proper cleanup and destruction
   */
  destroy(): void {
    logger.info('Destroying GraphQL service and cleaning up resources...');
    
    try {
      // Stop cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      
      // Clean up all active subscriptions
      logger.info(`Cleaning up ${this.activeSubscriptions.size} active subscriptions`);
      for (const [id, subscription] of this.activeSubscriptions) {
        try {
          // Remove from event subscriptions
          for (const event of subscription.events) {
            if (listeners) {
              listeners.delete(subscription.callback);
              if (listeners.size === 0) {
                this.subscriptions.delete(event);
              }
            }
          }
        } catch (cleanupError) {
          logger.error(`Error cleaning up subscription ${id}:`, cleanupError);
        }
      }
      
      // Clear all maps
      this.activeSubscriptions.clear();
      this.subscriptions.clear();
      this.cache.clear();
      this.rateLimitMap.clear();
      this.resolvers.clear();
      
      logger.info('GraphQL service destroyed successfully');
    } catch (error) {
      logger.error('Error during GraphQL service destruction:', error);
    }
  }
  
  /**
   * MEMORY LEAK FIX: Get service statistics for monitoring
   */
  getServiceStats(): {
    activeSubscriptions: number;
    subscriptionEvents: number;
    cacheSize: number;
    rateLimitEntries: number;
    resolverCount: number;
  } {
    return {
      activeSubscriptions: this.activeSubscriptions.size,
      subscriptionEvents: this.subscriptions.size,
      cacheSize: this.cache.size,
      rateLimitEntries: this.rateLimitMap.size,
      resolverCount: this.resolvers.size
    };
  }
  
  /**
   * MEMORY LEAK FIX: Force cleanup of subscriptions for a specific client
   */
  cleanupClientSubscriptions(clientId: string): void {
    const toRemove: string[] = [];
    
    for (const [id, subscription] of this.activeSubscriptions) {
      if (subscription.clientId === clientId) {
        // Remove from event subscriptions
        for (const event of subscription.events) {
          if (listeners) {
            listeners.delete(subscription.callback);
            if (listeners.size === 0) {
              this.subscriptions.delete(event);
            }
          }
        }
        toRemove.push(id);
      }
    }
    
    toRemove.forEach(id => this.activeSubscriptions.delete(id));
    
    if (toRemove.length > 0) {
      logger.info(`Cleaned up ${toRemove.length} subscriptions for client ${clientId}`);
    }
  }
}