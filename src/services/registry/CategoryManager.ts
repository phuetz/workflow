/**
 * Category Manager
 * Handles category organization and metadata for integration nodes
 */

import type { IntegrationNode, IntegrationCategory } from './types';
import { CATEGORY_DISPLAY_NAMES, CATEGORY_ICONS } from './types';

/**
 * Manages node categories and their organization
 */
export class CategoryManager {
  private categories: Map<IntegrationCategory, IntegrationNode[]> = new Map();

  /**
   * Add a node to its category
   */
  addNode(node: IntegrationNode): void {
    const categoryNodes = this.categories.get(node.category) || [];
    categoryNodes.push(node);
    this.categories.set(node.category, categoryNodes);
  }

  /**
   * Remove a node from its category
   */
  removeNode(nodeId: string, category: IntegrationCategory): void {
    const categoryNodes = this.categories.get(category) || [];
    const filtered = categoryNodes.filter(n => n.id !== nodeId);
    this.categories.set(category, filtered);
  }

  /**
   * Get all nodes in a category
   */
  getByCategory(category: IntegrationCategory): IntegrationNode[] {
    return this.categories.get(category) || [];
  }

  /**
   * Get all categories
   */
  getAllCategories(): IntegrationCategory[] {
    return Array.from(this.categories.keys());
  }

  /**
   * Get category count
   */
  getCategoryCount(): number {
    return this.categories.size;
  }

  /**
   * Get display name for a category
   */
  getDisplayName(category: IntegrationCategory): string {
    return CATEGORY_DISPLAY_NAMES[category] || category;
  }

  /**
   * Get icon for a category
   */
  getIcon(category: IntegrationCategory): string {
    return CATEGORY_ICONS[category] || 'circle';
  }

  /**
   * Get category metadata with node counts
   */
  getCategoryMetadata(): Array<{
    name: IntegrationCategory;
    displayName: string;
    icon: string;
    count: number;
    nodes: IntegrationNode[];
  }> {
    return Array.from(this.categories.keys()).map(name => {
      const nodes = this.categories.get(name) || [];
      return {
        name,
        displayName: this.getDisplayName(name),
        icon: this.getIcon(name),
        count: nodes.length,
        nodes
      };
    });
  }

  /**
   * Clear all categories
   */
  clear(): void {
    this.categories.clear();
  }
}
