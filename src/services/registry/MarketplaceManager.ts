/**
 * Marketplace Manager
 * Handles marketplace functionality including filtering, sorting, and search
 */

import type {
  IntegrationNode,
  IntegrationMarketplace,
  MarketplaceFilters,
  IntegrationCategory
} from './types';
import { CategoryManager } from './CategoryManager';

/**
 * Manages marketplace operations
 */
export class MarketplaceManager {
  private categoryManager: CategoryManager;

  constructor(categoryManager: CategoryManager) {
    this.categoryManager = categoryManager;
  }

  /**
   * Build the marketplace data structure
   */
  buildMarketplace(
    allNodes: IntegrationNode[],
    filters?: MarketplaceFilters
  ): IntegrationMarketplace {
    let nodes = this.applyFilters(allNodes, filters);

    const popular = this.getPopularNodes(nodes);
    const recent = this.getRecentNodes(nodes);
    const featured = this.getFeaturedNodes(nodes);
    const categories = this.buildCategoryList(nodes);

    return {
      featured,
      categories,
      popular,
      recent,
      search: (query: string, searchFilters?: MarketplaceFilters) => {
        return this.searchNodes(allNodes, query, searchFilters);
      }
    };
  }

  /**
   * Apply filters to node list
   */
  private applyFilters(
    nodes: IntegrationNode[],
    filters?: MarketplaceFilters
  ): IntegrationNode[] {
    if (!filters) return nodes;

    let filtered = [...nodes];

    if (filters.category) {
      filtered = filtered.filter(n => n.category === filters.category);
    }
    if (filters.pricing) {
      filtered = filtered.filter(n => n.pricing === filters.pricing);
    }
    if (filters.minRating) {
      filtered = filtered.filter(n => n.rating >= filters.minRating!);
    }
    if (filters.tags?.length) {
      filtered = filtered.filter(n =>
        filters.tags!.some(tag => n.tags.includes(tag))
      );
    }

    return filtered;
  }

  /**
   * Get popular nodes sorted by popularity
   */
  private getPopularNodes(nodes: IntegrationNode[], limit = 10): IntegrationNode[] {
    return [...nodes]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }

  /**
   * Get recent nodes sorted by last update
   */
  private getRecentNodes(nodes: IntegrationNode[], limit = 10): IntegrationNode[] {
    return [...nodes]
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
      .slice(0, limit);
  }

  /**
   * Get featured nodes (high rating + high popularity)
   */
  private getFeaturedNodes(nodes: IntegrationNode[], limit = 6): IntegrationNode[] {
    return nodes
      .filter(n => n.rating >= 4.5 && n.popularity >= 500)
      .sort((a, b) => (b.rating * b.popularity) - (a.rating * a.popularity))
      .slice(0, limit);
  }

  /**
   * Build category list with metadata
   */
  private buildCategoryList(filteredNodes: IntegrationNode[]): Array<{
    name: IntegrationCategory;
    displayName: string;
    icon: string;
    count: number;
    nodes: IntegrationNode[];
  }> {
    const categoryMetadata = this.categoryManager.getCategoryMetadata();

    return categoryMetadata.map(cat => ({
      ...cat,
      nodes: cat.nodes.filter(n => filteredNodes.includes(n))
    }));
  }

  /**
   * Search nodes with optional filters
   */
  searchNodes(
    allNodes: IntegrationNode[],
    query: string,
    filters?: MarketplaceFilters
  ): IntegrationNode[] {
    if (!query.trim()) {
      return this.applyFilters(allNodes, filters);
    }

    const lowerQuery = query.toLowerCase();
    const searched = allNodes.filter(node =>
      node.displayName.toLowerCase().includes(lowerQuery) ||
      node.description.toLowerCase().includes(lowerQuery) ||
      node.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );

    return this.applyFilters(searched, filters);
  }
}
