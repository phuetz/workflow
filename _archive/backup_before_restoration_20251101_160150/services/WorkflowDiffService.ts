/**
 * Workflow Diff Service
 * Visual diff and comparison between workflow versions
 *
 * Features:
 * - Node-level diff (added, removed, modified)
 * - Edge-level diff
 * - Visual diff highlighting
 * - JSON diff view
 * - Side-by-side comparison
 * - Conflict detection
 */

import { logger } from './LoggingService';
import { WorkflowSnapshot } from './WorkflowVersioningService';
import * as diff from 'diff';

export interface NodeDiff {
  nodeId: string;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  oldNode?: unknown;
  newNode?: unknown;
  changes?: PropertyChange[];
}

export interface EdgeDiff {
  edgeId: string;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  oldEdge?: unknown;
  newEdge?: unknown;
  changes?: PropertyChange[];
}

export interface PropertyChange {
  property: string;
  oldValue: unknown;
  newValue: unknown;
  path: string[];
}

export interface WorkflowDiff {
  nodes: NodeDiff[];
  edges: EdgeDiff[];
  variables?: PropertyChange[];
  settings?: PropertyChange[];
  summary: DiffSummary;
}

export interface DiffSummary {
  nodesAdded: number;
  nodesRemoved: number;
  nodesModified: number;
  nodesUnchanged: number;
  edgesAdded: number;
  edgesRemoved: number;
  edgesModified: number;
  edgesUnchanged: number;
  totalChanges: number;
  hasConflicts: boolean;
  conflictCount: number;
}

export interface VisualDiffOptions {
  highlightColors?: {
    added: string;
    removed: string;
    modified: string;
    unchanged: string;
  };
  showUnchanged?: boolean;
  groupByType?: boolean;
}

export interface ComparisonResult {
  diff: WorkflowDiff;
  conflicts: Conflict[];
  recommendations: string[];
}

export interface Conflict {
  type: 'node' | 'edge' | 'variable' | 'setting';
  resourceId: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  resolutionOptions: ConflictResolution[];
}

export interface ConflictResolution {
  strategy: 'keep-old' | 'keep-new' | 'manual-merge' | 'custom';
  description: string;
  preview?: unknown;
}

export class WorkflowDiffService {
  private defaultColors = {
    added: '#22c55e',
    removed: '#ef4444',
    modified: '#f59e0b',
    unchanged: '#6b7280'
  };

  constructor() {
    logger.info('WorkflowDiffService initialized');
  }

  /**
   * Compare two workflow snapshots
   */
  async compareSnapshots(
    oldSnapshot: WorkflowSnapshot,
    newSnapshot: WorkflowSnapshot,
    options?: VisualDiffOptions
  ): Promise<ComparisonResult> {
    try {
      logger.info('Comparing workflow snapshots', {
        oldId: oldSnapshot.id,
        newId: newSnapshot.id
      });

      // Compare nodes
      const nodeDiffs = this.compareNodes(oldSnapshot.nodes, newSnapshot.nodes);

      // Compare edges
      const edgeDiffs = this.compareEdges(oldSnapshot.edges, newSnapshot.edges);

      // Compare variables
      const variableDiffs = this.compareObjects(
        oldSnapshot.variables || {},
        newSnapshot.variables || {}
      );

      // Compare settings
      const settingDiffs = this.compareObjects(
        oldSnapshot.settings || {},
        newSnapshot.settings || {}
      );

      // Create diff object
      const diff: WorkflowDiff = {
        nodes: nodeDiffs,
        edges: edgeDiffs,
        variables: variableDiffs,
        settings: settingDiffs,
        summary: this.calculateSummary(nodeDiffs, edgeDiffs)
      };

      // Detect conflicts
      const conflicts = this.detectConflicts(diff);

      // Generate recommendations
      const recommendations = this.generateRecommendations(diff, conflicts);

      return {
        diff,
        conflicts,
        recommendations
      };
    } catch (error) {
      logger.error('Failed to compare snapshots', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate visual diff HTML for UI rendering
   */
  async generateVisualDiff(
    diff: WorkflowDiff,
    options?: VisualDiffOptions
  ): Promise<string> {
    const colors = options?.highlightColors || this.defaultColors;
    const showUnchanged = options?.showUnchanged ?? false;

    let html = '<div class="workflow-diff">\n';

    // Nodes section
    html += '  <div class="diff-section">\n';
    html += '    <h3>Nodes</h3>\n';

    for (const nodeDiff of diff.nodes) {
      if (!showUnchanged && nodeDiff.type === 'unchanged') continue;

      const color = colors[nodeDiff.type];
      html += `    <div class="diff-item" style="border-left: 4px solid ${color};">\n`;
      html += `      <span class="diff-type">${nodeDiff.type.toUpperCase()}</span>\n`;
      html += `      <span class="diff-id">${nodeDiff.nodeId}</span>\n`;

      if (nodeDiff.changes && nodeDiff.changes.length > 0) {
        html += '      <ul class="diff-changes">\n';
        for (const change of nodeDiff.changes) {
          html += `        <li>${change.property}: ${JSON.stringify(change.oldValue)} → ${JSON.stringify(change.newValue)}</li>\n`;
        }
        html += '      </ul>\n';
      }

      html += '    </div>\n';
    }

    html += '  </div>\n';

    // Edges section
    html += '  <div class="diff-section">\n';
    html += '    <h3>Edges</h3>\n';

    for (const edgeDiff of diff.edges) {
      if (!showUnchanged && edgeDiff.type === 'unchanged') continue;

      const color = colors[edgeDiff.type];
      html += `    <div class="diff-item" style="border-left: 4px solid ${color};">\n`;
      html += `      <span class="diff-type">${edgeDiff.type.toUpperCase()}</span>\n`;
      html += `      <span class="diff-id">${edgeDiff.edgeId}</span>\n`;
      html += '    </div>\n';
    }

    html += '  </div>\n';
    html += '</div>\n';

    return html;
  }

  /**
   * Generate side-by-side JSON diff
   */
  async generateJsonDiff(
    oldSnapshot: WorkflowSnapshot,
    newSnapshot: WorkflowSnapshot
  ): Promise<string> {
    const oldJson = JSON.stringify(oldSnapshot, null, 2);
    const newJson = JSON.stringify(newSnapshot, null, 2);

    const patches = diff.createPatch(
      'workflow.json',
      oldJson,
      newJson,
      'Old Version',
      'New Version'
    );

    return patches;
  }

  /**
   * Generate unified diff (like git diff)
   */
  async generateUnifiedDiff(
    oldSnapshot: WorkflowSnapshot,
    newSnapshot: WorkflowSnapshot
  ): Promise<string> {
    const oldJson = JSON.stringify(oldSnapshot, null, 2);
    const newJson = JSON.stringify(newSnapshot, null, 2);

    const changes = diff.diffLines(oldJson, newJson);

    let result = '';
    for (const change of changes) {
      const prefix = change.added ? '+' : change.removed ? '-' : ' ';
      const lines = change.value.split('\n');

      for (const line of lines) {
        if (line) {
          result += `${prefix} ${line}\n`;
        }
      }
    }

    return result;
  }

  /**
   * Get diff statistics
   */
  async getDiffStats(diff: WorkflowDiff): Promise<{
    additions: number;
    deletions: number;
    modifications: number;
    unchanged: number;
    totalChanges: number;
    changePercentage: number;
  }> {
    const additions = diff.summary.nodesAdded + diff.summary.edgesAdded;
    const deletions = diff.summary.nodesRemoved + diff.summary.edgesRemoved;
    const modifications = diff.summary.nodesModified + diff.summary.edgesModified;
    const unchanged = diff.summary.nodesUnchanged + diff.summary.edgesUnchanged;

    const totalElements = additions + deletions + modifications + unchanged;
    const totalChanges = additions + deletions + modifications;
    const changePercentage = totalElements > 0 ? (totalChanges / totalElements) * 100 : 0;

    return {
      additions,
      deletions,
      modifications,
      unchanged,
      totalChanges,
      changePercentage
    };
  }

  /**
   * Merge two snapshots with conflict resolution
   */
  async mergeSnapshots(
    baseSnapshot: WorkflowSnapshot,
    snapshot1: WorkflowSnapshot,
    snapshot2: WorkflowSnapshot,
    strategy: 'ours' | 'theirs' | 'manual' = 'manual'
  ): Promise<{
    merged: WorkflowSnapshot;
    conflicts: Conflict[];
  }> {
    logger.info('Merging snapshots', {
      base: baseSnapshot.id,
      snapshot1: snapshot1.id,
      snapshot2: snapshot2.id,
      strategy
    });

    // Compare both snapshots with base
    const diff1 = await this.compareSnapshots(baseSnapshot, snapshot1);
    const diff2 = await this.compareSnapshots(baseSnapshot, snapshot2);

    // Detect conflicts
    const conflicts = this.detectMergeConflicts(diff1.diff, diff2.diff);

    // Merge based on strategy
    const merged: WorkflowSnapshot = {
      ...baseSnapshot,
      nodes: [],
      edges: [],
      variables: {},
      settings: {}
    };

    if (strategy === 'ours') {
      merged.nodes = snapshot1.nodes;
      merged.edges = snapshot1.edges;
      merged.variables = snapshot1.variables;
      merged.settings = snapshot1.settings;
    } else if (strategy === 'theirs') {
      merged.nodes = snapshot2.nodes;
      merged.edges = snapshot2.edges;
      merged.variables = snapshot2.variables;
      merged.settings = snapshot2.settings;
    } else {
      // Manual merge - prefer non-conflicting changes
      merged.nodes = this.mergeNodes(
        baseSnapshot.nodes,
        snapshot1.nodes,
        snapshot2.nodes
      );
      merged.edges = this.mergeEdges(
        baseSnapshot.edges,
        snapshot1.edges,
        snapshot2.edges
      );
    }

    return { merged, conflicts };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Compare nodes between two snapshots
   */
  private compareNodes(oldNodes: unknown[], newNodes: unknown[]): NodeDiff[] {
    const diffs: NodeDiff[] = [];

    const oldNodesMap = new Map(
      oldNodes.map((n: any) => [n.id, n])
    );
    const newNodesMap = new Map(
      newNodes.map((n: any) => [n.id, n])
    );

    // Find added and modified nodes
    for (const [id, newNode] of newNodesMap) {
      const oldNode = oldNodesMap.get(id);

      if (!oldNode) {
        diffs.push({
          nodeId: id,
          type: 'added',
          newNode
        });
      } else {
        const changes = this.detectPropertyChanges(oldNode, newNode);

        diffs.push({
          nodeId: id,
          type: changes.length > 0 ? 'modified' : 'unchanged',
          oldNode,
          newNode,
          changes
        });
      }
    }

    // Find removed nodes
    for (const [id, oldNode] of oldNodesMap) {
      if (!newNodesMap.has(id)) {
        diffs.push({
          nodeId: id,
          type: 'removed',
          oldNode
        });
      }
    }

    return diffs;
  }

  /**
   * Compare edges between two snapshots
   */
  private compareEdges(oldEdges: unknown[], newEdges: unknown[]): EdgeDiff[] {
    const diffs: EdgeDiff[] = [];

    const oldEdgesMap = new Map(
      oldEdges.map((e: any) => [e.id, e])
    );
    const newEdgesMap = new Map(
      newEdges.map((e: any) => [e.id, e])
    );

    // Find added and modified edges
    for (const [id, newEdge] of newEdgesMap) {
      const oldEdge = oldEdgesMap.get(id);

      if (!oldEdge) {
        diffs.push({
          edgeId: id,
          type: 'added',
          newEdge
        });
      } else {
        const changes = this.detectPropertyChanges(oldEdge, newEdge);

        diffs.push({
          edgeId: id,
          type: changes.length > 0 ? 'modified' : 'unchanged',
          oldEdge,
          newEdge,
          changes
        });
      }
    }

    // Find removed edges
    for (const [id, oldEdge] of oldEdgesMap) {
      if (!newEdgesMap.has(id)) {
        diffs.push({
          edgeId: id,
          type: 'removed',
          oldEdge
        });
      }
    }

    return diffs;
  }

  /**
   * Compare objects (for variables, settings)
   */
  private compareObjects(
    oldObj: Record<string, unknown>,
    newObj: Record<string, unknown>
  ): PropertyChange[] {
    const changes: PropertyChange[] = [];

    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of allKeys) {
      const oldValue = oldObj[key];
      const newValue = newObj[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          property: key,
          oldValue,
          newValue,
          path: [key]
        });
      }
    }

    return changes;
  }

  /**
   * Detect property changes between two objects
   */
  private detectPropertyChanges(
    oldObj: any,
    newObj: any,
    path: string[] = []
  ): PropertyChange[] {
    const changes: PropertyChange[] = [];

    if (typeof oldObj !== 'object' || typeof newObj !== 'object') {
      if (oldObj !== newObj) {
        changes.push({
          property: path.join('.'),
          oldValue: oldObj,
          newValue: newObj,
          path
        });
      }
      return changes;
    }

    const allKeys = new Set([
      ...Object.keys(oldObj || {}),
      ...Object.keys(newObj || {})
    ]);

    for (const key of allKeys) {
      const oldValue = oldObj?.[key];
      const newValue = newObj?.[key];

      if (typeof oldValue === 'object' && typeof newValue === 'object') {
        changes.push(
          ...this.detectPropertyChanges(oldValue, newValue, [...path, key])
        );
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          property: key,
          oldValue,
          newValue,
          path: [...path, key]
        });
      }
    }

    return changes;
  }

  /**
   * Calculate diff summary
   */
  private calculateSummary(
    nodeDiffs: NodeDiff[],
    edgeDiffs: EdgeDiff[]
  ): DiffSummary {
    const summary: DiffSummary = {
      nodesAdded: nodeDiffs.filter(d => d.type === 'added').length,
      nodesRemoved: nodeDiffs.filter(d => d.type === 'removed').length,
      nodesModified: nodeDiffs.filter(d => d.type === 'modified').length,
      nodesUnchanged: nodeDiffs.filter(d => d.type === 'unchanged').length,
      edgesAdded: edgeDiffs.filter(d => d.type === 'added').length,
      edgesRemoved: edgeDiffs.filter(d => d.type === 'removed').length,
      edgesModified: edgeDiffs.filter(d => d.type === 'modified').length,
      edgesUnchanged: edgeDiffs.filter(d => d.type === 'unchanged').length,
      totalChanges: 0,
      hasConflicts: false,
      conflictCount: 0
    };

    summary.totalChanges =
      summary.nodesAdded +
      summary.nodesRemoved +
      summary.nodesModified +
      summary.edgesAdded +
      summary.edgesRemoved +
      summary.edgesModified;

    return summary;
  }

  /**
   * Detect conflicts in diff
   */
  private detectConflicts(diff: WorkflowDiff): Conflict[] {
    const conflicts: Conflict[] = [];

    // Check for orphaned edges (edges pointing to removed nodes)
    const removedNodeIds = new Set(
      diff.nodes.filter(d => d.type === 'removed').map(d => d.nodeId)
    );

    for (const edgeDiff of diff.edges) {
      if (edgeDiff.type !== 'removed') {
        const edge = edgeDiff.newEdge as any;
        if (
          edge &&
          (removedNodeIds.has(edge.source) || removedNodeIds.has(edge.target))
        ) {
          conflicts.push({
            type: 'edge',
            resourceId: edgeDiff.edgeId,
            description: `Edge ${edgeDiff.edgeId} connects to removed node`,
            severity: 'high',
            resolutionOptions: [
              {
                strategy: 'keep-old',
                description: 'Restore the removed node'
              },
              {
                strategy: 'keep-new',
                description: 'Remove the orphaned edge'
              }
            ]
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect merge conflicts between two diffs
   */
  private detectMergeConflicts(
    diff1: WorkflowDiff,
    diff2: WorkflowDiff
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    // Find nodes modified in both diffs
    const modifiedNodes1 = new Set(
      diff1.nodes.filter(d => d.type === 'modified').map(d => d.nodeId)
    );
    const modifiedNodes2 = new Set(
      diff2.nodes.filter(d => d.type === 'modified').map(d => d.nodeId)
    );

    for (const nodeId of modifiedNodes1) {
      if (modifiedNodes2.has(nodeId)) {
        conflicts.push({
          type: 'node',
          resourceId: nodeId,
          description: `Node ${nodeId} modified in both versions`,
          severity: 'medium',
          resolutionOptions: [
            { strategy: 'keep-old', description: 'Keep version 1 changes' },
            { strategy: 'keep-new', description: 'Keep version 2 changes' },
            { strategy: 'manual-merge', description: 'Manually merge changes' }
          ]
        });
      }
    }

    return conflicts;
  }

  /**
   * Generate recommendations based on diff
   */
  private generateRecommendations(
    diff: WorkflowDiff,
    conflicts: Conflict[]
  ): string[] {
    const recommendations: string[] = [];

    if (diff.summary.nodesRemoved > 0) {
      recommendations.push(
        `${diff.summary.nodesRemoved} node(s) removed. Verify workflow logic is intact.`
      );
    }

    if (diff.summary.edgesRemoved > 0) {
      recommendations.push(
        `${diff.summary.edgesRemoved} connection(s) removed. Check for broken flows.`
      );
    }

    if (conflicts.length > 0) {
      recommendations.push(
        `${conflicts.length} conflict(s) detected. Review and resolve before merging.`
      );
    }

    if (diff.summary.nodesAdded > 10) {
      recommendations.push(
        'Large number of nodes added. Consider reviewing performance impact.'
      );
    }

    return recommendations;
  }

  /**
   * Merge nodes from three snapshots
   */
  private mergeNodes(
    baseNodes: unknown[],
    nodes1: unknown[],
    nodes2: unknown[]
  ): unknown[] {
    const merged: unknown[] = [];
    const processedIds = new Set<string>();

    // Process nodes from both versions
    for (const node of [...nodes1, ...nodes2]) {
      const nodeId = (node as any).id;

      if (processedIds.has(nodeId)) continue;

      const baseNode = baseNodes.find((n: any) => n.id === nodeId);
      const node1 = nodes1.find((n: any) => n.id === nodeId);
      const node2 = nodes2.find((n: any) => n.id === nodeId);

      // If both modified, take the later one (or implement smart merge)
      if (node1 && node2) {
        merged.push(node2); // Prefer node2 in case of conflict
      } else {
        merged.push(node1 || node2 || baseNode);
      }

      processedIds.add(nodeId);
    }

    return merged;
  }

  /**
   * Merge edges from three snapshots
   */
  private mergeEdges(
    baseEdges: unknown[],
    edges1: unknown[],
    edges2: unknown[]
  ): unknown[] {
    const merged: unknown[] = [];
    const processedIds = new Set<string>();

    for (const edge of [...edges1, ...edges2]) {
      const edgeId = (edge as any).id;

      if (processedIds.has(edgeId)) continue;

      const edge1 = edges1.find((e: any) => e.id === edgeId);
      const edge2 = edges2.find((e: any) => e.id === edgeId);

      if (edge1 && edge2) {
        merged.push(edge2);
      } else {
        merged.push(edge1 || edge2);
      }

      processedIds.add(edgeId);
    }

    return merged;
  }
}

// Singleton instance
let diffServiceInstance: WorkflowDiffService | null = null;

export function getDiffService(): WorkflowDiffService {
  if (!diffServiceInstance) {
    diffServiceInstance = new WorkflowDiffService();
  }
  return diffServiceInstance;
}

export function initializeDiffService(): WorkflowDiffService {
  if (diffServiceInstance) {
    logger.warn('Diff service already initialized');
    return diffServiceInstance;
  }

  diffServiceInstance = new WorkflowDiffService();
  return diffServiceInstance;
}
