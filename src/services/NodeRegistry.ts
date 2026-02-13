/**
 * Node Registry Service
 * Manages integration nodes and marketplace
 *
 * This is the main orchestrator that delegates to specialized modules:
 * - CategoryManager: handles category organization
 * - NodeValidator: handles node validation
 * - MarketplaceManager: handles marketplace operations
 * - BuiltInNodes: provides built-in node definitions
 */

import { logger } from './SimpleLogger';
import { BaseService } from './BaseService';
import type {
  IntegrationNode,
  IntegrationCategory,
  INodeRegistry,
  ValidationResult,
  IntegrationMarketplace,
  MarketplaceFilters
} from './registry/types';
import { CategoryManager } from './registry/CategoryManager';
import { MarketplaceManager } from './registry/MarketplaceManager';
import { validateNode } from './registry/NodeValidator';
import { getAllBuiltInNodes } from './registry/BuiltInNodes';

export class NodeRegistryService extends BaseService implements INodeRegistry {
  private nodes: Map<string, IntegrationNode> = new Map();
  private categoryManager: CategoryManager;
  private marketplaceManager: MarketplaceManager;
  private installedPackages: Set<string> = new Set();

  constructor() {
    super('NodeRegistry', {
      enableCaching: true,
      cacheTimeoutMs: 600000 // 10 minutes
    });

    this.categoryManager = new CategoryManager();
    this.marketplaceManager = new MarketplaceManager(this.categoryManager);

    // Initialize with built-in nodes
    this.initializeBuiltInNodes();
  }

  /**
   * Initialize all built-in nodes
   */
  private async initializeBuiltInNodes(): Promise<void> {
    const builtInNodes = getAllBuiltInNodes();

    for (const node of builtInNodes) {
      this.register(node);
    }

    logger.info('Node registry initialized', {
      totalNodes: this.nodes.size,
      categories: this.categoryManager.getCategoryCount()
    });
  }

  /**
   * Register a new node in the registry
   */
  public register(node: IntegrationNode): void {
    const validation = this.validate(node);
    if (!validation.valid) {
      throw new Error(`Invalid node: ${validation.errors.join(', ')}`);
    }

    this.nodes.set(node.id, node);
    this.categoryManager.addNode(node);

    logger.info('Node registered', { nodeId: node.id, category: node.category });
  }

  /**
   * Unregister a node from the registry
   */
  public unregister(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    this.nodes.delete(nodeId);
    this.categoryManager.removeNode(nodeId, node.category);

    logger.info('Node unregistered', { nodeId });
  }

  /**
   * Get a node by ID
   */
  public get(nodeId: string): IntegrationNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Get all nodes in a category
   */
  public getByCategory(category: IntegrationCategory): IntegrationNode[] {
    return this.categoryManager.getByCategory(category);
  }

  /**
   * Search nodes by query string
   */
  public search(query: string): IntegrationNode[] {
    if (!query.trim()) return this.getAll();

    const lowerQuery = query.toLowerCase();
    return Array.from(this.nodes.values()).filter(node =>
      node.displayName.toLowerCase().includes(lowerQuery) ||
      node.description.toLowerCase().includes(lowerQuery) ||
      node.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get all registered nodes
   */
  public getAll(): IntegrationNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Install a node package
   */
  public async install(packageName: string): Promise<void> {
    this.installedPackages.add(packageName);
    logger.info('Package installed', { packageName });
  }

  /**
   * Uninstall a node package
   */
  public async uninstall(packageName: string): Promise<void> {
    this.installedPackages.delete(packageName);
    logger.info('Package uninstalled', { packageName });
  }

  /**
   * Update a node package
   */
  public async update(packageName: string): Promise<void> {
    logger.info('Package updated', { packageName });
  }

  /**
   * Validate a node configuration
   */
  public validate(node: IntegrationNode): ValidationResult {
    return validateNode(node);
  }

  /**
   * Get marketplace data with optional filters
   */
  public getMarketplace(filters?: MarketplaceFilters): IntegrationMarketplace {
    return this.marketplaceManager.buildMarketplace(this.getAll(), filters);
  }
}

// Export singleton instance
export const nodeRegistry = new NodeRegistryService();

// Re-export types and utilities from registry module
export type {
  IntegrationNode,
  IntegrationCategory,
  ValidationResult,
  IntegrationMarketplace,
  MarketplaceFilters
} from './registry/types';
export { CategoryManager } from './registry/CategoryManager';
export { MarketplaceManager } from './registry/MarketplaceManager';
export { NodeValidator, validateNode } from './registry/NodeValidator';
export {
  getAllBuiltInNodes,
  getUtilityNodes,
  getPriorityIntegrationNodes
} from './registry/BuiltInNodes';
