/**
 * FolderTree - Efficient tree data structure for folder hierarchy
 * Optimized for large folder trees with fast operations
 */

import { Folder, FolderTreeNode } from '../types/organization';
import { folderService } from './FolderService';

export class FolderTree {
  private root: FolderTreeNode[] = [];
  private nodeMap: Map<string, FolderTreeNode> = new Map();

  constructor() {
    this.buildTree();
  }

  /**
   * Build tree from flat folder list
   */
  buildTree(): void {
    const folders = folderService.getAllFolders();
    this.nodeMap.clear();
    this.root = [];

    // Create nodes for all folders
    for (const folder of folders) {
      const node: FolderTreeNode = {
        folder,
        children: [],
        parent: null,
      };
      this.nodeMap.set(folder.id, node);
    }

    // Build parent-child relationships
    for (const node of this.nodeMap.values()) {
      if (node.folder.parentId) {
        const parent = this.nodeMap.get(node.folder.parentId);
        if (parent) {
          parent.children.push(node);
          node.parent = parent;
        } else {
          // Orphaned folder - add to root
          this.root.push(node);
        }
      } else {
        this.root.push(node);
      }
    }

    // Sort children alphabetically
    this.sortChildren();
  }

  /**
   * Get root nodes
   */
  getRootNodes(): FolderTreeNode[] {
    return this.root;
  }

  /**
   * Get node by folder ID
   */
  getNode(folderId: string): FolderTreeNode | null {
    return this.nodeMap.get(folderId) || null;
  }

  /**
   * Get all nodes as flat array
   */
  getAllNodes(): FolderTreeNode[] {
    return Array.from(this.nodeMap.values());
  }

  /**
   * Get children of a node
   */
  getChildren(folderId: string): FolderTreeNode[] {
    const node = this.nodeMap.get(folderId);
    return node ? node.children : [];
  }

  /**
   * Get parent of a node
   */
  getParent(folderId: string): FolderTreeNode | null {
    const node = this.nodeMap.get(folderId);
    return node?.parent || null;
  }

  /**
   * Get all ancestors of a node (from root to parent)
   */
  getAncestors(folderId: string): FolderTreeNode[] {
    const ancestors: FolderTreeNode[] = [];
    let current = this.getParent(folderId);

    while (current) {
      ancestors.unshift(current);
      current = current.parent;
    }

    return ancestors;
  }

  /**
   * Get all descendants of a node (depth-first)
   */
  getDescendants(folderId: string): FolderTreeNode[] {
    const node = this.nodeMap.get(folderId);
    if (!node) return [];

    const descendants: FolderTreeNode[] = [];
    const stack = [...node.children];

    while (stack.length > 0) {
      const current = stack.pop()!;
      descendants.push(current);
      stack.push(...current.children);
    }

    return descendants;
  }

  /**
   * Get all siblings of a node
   */
  getSiblings(folderId: string): FolderTreeNode[] {
    const node = this.nodeMap.get(folderId);
    if (!node) return [];

    const parent = node.parent;
    if (!parent) {
      return this.root.filter((n) => n.folder.id !== folderId);
    }

    return parent.children.filter((n) => n.folder.id !== folderId);
  }

  /**
   * Get depth of a node
   */
  getDepth(folderId: string): number {
    const node = this.nodeMap.get(folderId);
    if (!node) return -1;

    let depth = 0;
    let current = node.parent;

    while (current) {
      depth++;
      current = current.parent;
    }

    return depth;
  }

  /**
   * Get total number of descendants
   */
  getDescendantCount(folderId: string): number {
    return this.getDescendants(folderId).length;
  }

  /**
   * Check if a node is ancestor of another
   */
  isAncestor(ancestorId: string, descendantId: string): boolean {
    const ancestors = this.getAncestors(descendantId);
    return ancestors.some((n) => n.folder.id === ancestorId);
  }

  /**
   * Check if a node is descendant of another
   */
  isDescendant(descendantId: string, ancestorId: string): boolean {
    return this.isAncestor(ancestorId, descendantId);
  }

  /**
   * Find lowest common ancestor of two nodes
   */
  findLowestCommonAncestor(
    folderId1: string,
    folderId2: string
  ): FolderTreeNode | null {
    const ancestors1 = new Set(
      this.getAncestors(folderId1).map((n) => n.folder.id)
    );
    const ancestors2 = this.getAncestors(folderId2);

    for (let i = ancestors2.length - 1; i >= 0; i--) {
      if (ancestors1.has(ancestors2[i].folder.id)) {
        return ancestors2[i];
      }
    }

    return null;
  }

  /**
   * Traverse tree depth-first (pre-order)
   */
  traverseDepthFirst(
    callback: (node: FolderTreeNode, depth: number) => void,
    startNodeId?: string
  ): void {
    const startNodes = startNodeId
      ? [this.nodeMap.get(startNodeId)]
      : this.root;

    const traverse = (node: FolderTreeNode | undefined, depth: number) => {
      if (!node) return;
      callback(node, depth);
      for (const child of node.children) {
        traverse(child, depth + 1);
      }
    };

    for (const node of startNodes) {
      traverse(node, 0);
    }
  }

  /**
   * Traverse tree breadth-first
   */
  traverseBreadthFirst(
    callback: (node: FolderTreeNode, depth: number) => void,
    startNodeId?: string
  ): void {
    const startNodes = startNodeId
      ? [this.nodeMap.get(startNodeId)]
      : this.root;

    const queue: Array<{ node: FolderTreeNode; depth: number }> = [];
    for (const node of startNodes) {
      if (node) queue.push({ node, depth: 0 });
    }

    while (queue.length > 0) {
      const { node, depth } = queue.shift()!;
      callback(node, depth);

      for (const child of node.children) {
        queue.push({ node: child, depth: depth + 1 });
      }
    }
  }

  /**
   * Filter nodes by predicate
   */
  filter(
    predicate: (node: FolderTreeNode) => boolean
  ): FolderTreeNode[] {
    const results: FolderTreeNode[] = [];
    this.traverseDepthFirst((node) => {
      if (predicate(node)) {
        results.push(node);
      }
    });
    return results;
  }

  /**
   * Find node by predicate
   */
  find(
    predicate: (node: FolderTreeNode) => boolean
  ): FolderTreeNode | null {
    let result: FolderTreeNode | null = null;

    this.traverseDepthFirst((node) => {
      if (!result && predicate(node)) {
        result = node;
      }
    });

    return result;
  }

  /**
   * Get flattened tree with indentation info
   */
  flatten(expandedIds?: Set<string>): Array<{
    node: FolderTreeNode;
    depth: number;
    isExpanded: boolean;
    hasChildren: boolean;
  }> {
    const flattened: Array<{
      node: FolderTreeNode;
      depth: number;
      isExpanded: boolean;
      hasChildren: boolean;
    }> = [];

    const traverse = (node: FolderTreeNode, depth: number) => {
      const isExpanded = expandedIds
        ? expandedIds.has(node.folder.id)
        : node.folder.isExpanded || false;

      flattened.push({
        node,
        depth,
        isExpanded,
        hasChildren: node.children.length > 0,
      });

      if (isExpanded) {
        for (const child of node.children) {
          traverse(child, depth + 1);
        }
      }
    };

    for (const root of this.root) {
      traverse(root, 0);
    }

    return flattened;
  }

  /**
   * Get visible nodes (respecting expansion state)
   */
  getVisibleNodes(): FolderTreeNode[] {
    const visible: FolderTreeNode[] = [];

    const traverse = (node: FolderTreeNode) => {
      visible.push(node);
      if (node.folder.isExpanded) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    for (const root of this.root) {
      traverse(root);
    }

    return visible;
  }

  /**
   * Sort children of all nodes
   */
  sortChildren(
    compareFn?: (a: FolderTreeNode, b: FolderTreeNode) => number
  ): void {
    const defaultCompare = (a: FolderTreeNode, b: FolderTreeNode) =>
      a.folder.name.localeCompare(b.folder.name);

    const compare = compareFn || defaultCompare;

    this.traverseDepthFirst((node) => {
      node.children.sort(compare);
    });

    this.root.sort(compare);
  }

  /**
   * Calculate tree statistics
   */
  getStatistics(): {
    totalFolders: number;
    maxDepth: number;
    avgDepth: number;
    totalWorkflows: number;
    rootFolders: number;
    emptyFolders: number;
  } {
    let totalFolders = 0;
    let maxDepth = 0;
    let totalDepth = 0;
    let totalWorkflows = 0;
    let emptyFolders = 0;

    this.traverseDepthFirst((node, depth) => {
      totalFolders++;
      maxDepth = Math.max(maxDepth, depth);
      totalDepth += depth;
      totalWorkflows += node.folder.workflowIds.length;
      if (node.children.length === 0 && node.folder.workflowIds.length === 0) {
        emptyFolders++;
      }
    });

    return {
      totalFolders,
      maxDepth,
      avgDepth: totalFolders > 0 ? totalDepth / totalFolders : 0,
      totalWorkflows,
      rootFolders: this.root.length,
      emptyFolders,
    };
  }

  /**
   * Search folders by name (case-insensitive)
   */
  search(query: string): FolderTreeNode[] {
    const lowerQuery = query.toLowerCase();
    return this.filter(
      (node) =>
        node.folder.name.toLowerCase().includes(lowerQuery) ||
        node.folder.description?.toLowerCase().includes(lowerQuery) ||
        node.folder.path.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get path from root to node as array of nodes
   */
  getPath(folderId: string): FolderTreeNode[] {
    const node = this.nodeMap.get(folderId);
    if (!node) return [];

    const path: FolderTreeNode[] = [node];
    let current = node.parent;

    while (current) {
      path.unshift(current);
      current = current.parent;
    }

    return path;
  }

  /**
   * Move node to new parent (updates tree structure)
   */
  moveNode(folderId: string, newParentId: string | null): void {
    const node = this.nodeMap.get(folderId);
    if (!node) return;

    // Remove from old parent
    if (node.parent) {
      const index = node.parent.children.indexOf(node);
      if (index > -1) {
        node.parent.children.splice(index, 1);
      }
    } else {
      const index = this.root.indexOf(node);
      if (index > -1) {
        this.root.splice(index, 1);
      }
    }

    // Add to new parent
    if (newParentId) {
      const newParent = this.nodeMap.get(newParentId);
      if (newParent) {
        newParent.children.push(node);
        node.parent = newParent;
      }
    } else {
      this.root.push(node);
      node.parent = null;
    }

    this.sortChildren();
  }

  /**
   * Clone a subtree
   */
  cloneSubtree(folderId: string): FolderTreeNode | null {
    const node = this.nodeMap.get(folderId);
    if (!node) return null;

    const clone = (original: FolderTreeNode): FolderTreeNode => {
      const clonedNode: FolderTreeNode = {
        folder: { ...original.folder },
        children: [],
        parent: null,
      };

      for (const child of original.children) {
        const clonedChild = clone(child);
        clonedChild.parent = clonedNode;
        clonedNode.children.push(clonedChild);
      }

      return clonedNode;
    };

    return clone(node);
  }

  /**
   * Rebuild tree (refresh from service)
   */
  rebuild(): void {
    this.buildTree();
  }

  /**
   * Clear tree
   */
  clear(): void {
    this.root = [];
    this.nodeMap.clear();
  }
}

// Singleton instance
export const folderTree = new FolderTree();
