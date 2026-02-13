/**
 * Diff Generator
 * Generate visual and JSON diffs for workflows
 */

import {
  WorkflowDiff,
  VisualWorkflowDiff,
  DiffSummary,
  GitDiff,
  DiffHunk,
  DiffLine,
  WorkflowNode,
  WorkflowEdge,
  NodeModification,
  PropertyChange,
  SettingChange,
} from '../types/git';
import { WorkflowData } from './WorkflowSync';
import { logger } from '../backend/services/LogService';

export class DiffGenerator {
  /**
   * Generate complete workflow diff
   */
  async generateWorkflowDiff(
    workflowA: WorkflowData,
    workflowB: WorkflowData
  ): Promise<WorkflowDiff> {
    const gitDiff = this.generateGitDiff(workflowA, workflowB);
    const visualDiff = this.generateVisualDiff(workflowA, workflowB);
    const summary = this.generateSummary(visualDiff);

    return {
      workflowId: workflowB.id,
      workflowName: workflowB.name,
      gitDiff,
      visualDiff,
      summary,
    };
  }

  /**
   * Generate Git-style diff
   */
  private generateGitDiff(workflowA: WorkflowData, workflowB: WorkflowData): GitDiff {
    const aStr = JSON.stringify(workflowA, null, 2);
    const bStr = JSON.stringify(workflowB, null, 2);

    const aLines = aStr.split('\n');
    const bLines = bStr.split('\n');

    const hunks: DiffHunk[] = [];
    let currentHunk: DiffLine[] = [];
    let oldLineNum = 1;
    let newLineNum = 1;

    // Simplified diff algorithm (LCS-based)
    const diff = this.computeLineDiff(aLines, bLines);

    let hunkOldStart = 1;
    let hunkNewStart = 1;
    let oldCount = 0;
    let newCount = 0;

    for (let i = 0; i < diff.length; i++) {
      const line = diff[i];

      if (line.type === 'context') {
        if (currentHunk.length > 0 && i > 0 && diff[i - 1].type !== 'context') {
          // Start new hunk
          hunks.push({
            oldStart: hunkOldStart,
            oldLines: oldCount,
            newStart: hunkNewStart,
            newLines: newCount,
            lines: currentHunk,
          });

          currentHunk = [];
          oldCount = 0;
          newCount = 0;
          hunkOldStart = oldLineNum;
          hunkNewStart = newLineNum;
        }

        currentHunk.push({
          type: 'context',
          content: line.content,
          oldLineNumber: oldLineNum,
          newLineNumber: newLineNum,
        });

        oldLineNum++;
        newLineNum++;
        oldCount++;
        newCount++;
      } else if (line.type === 'deletion') {
        currentHunk.push({
          type: 'deletion',
          content: line.content,
          oldLineNumber: oldLineNum,
        });

        oldLineNum++;
        oldCount++;
      } else if (line.type === 'addition') {
        currentHunk.push({
          type: 'addition',
          content: line.content,
          newLineNumber: newLineNum,
        });

        newLineNum++;
        newCount++;
      }
    }

    // Add final hunk
    if (currentHunk.length > 0) {
      hunks.push({
        oldStart: hunkOldStart,
        oldLines: oldCount,
        newStart: hunkNewStart,
        newLines: newCount,
        lines: currentHunk,
      });
    }

    // Calculate stats
    let additions = 0;
    let deletions = 0;

    hunks.forEach(hunk => {
      hunk.lines.forEach(line => {
        if (line.type === 'addition') additions++;
        if (line.type === 'deletion') deletions++;
      });
    });

    return {
      file: `${workflowB.name}.json`,
      status: 'modified',
      hunks,
      stats: { additions, deletions },
      binary: false,
    };
  }

  /**
   * Compute line-by-line diff
   */
  private computeLineDiff(
    oldLines: string[],
    newLines: string[]
  ): Array<{ type: 'context' | 'addition' | 'deletion'; content: string }> {
    const diff: Array<{ type: 'context' | 'addition' | 'deletion'; content: string }> = [];

    // Simplified Myers diff algorithm
    const n = oldLines.length;
    const m = newLines.length;

    // Create LCS matrix
    const lcs: number[][] = Array(n + 1)
      .fill(0)
      .map(() => Array(m + 1).fill(0));

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          lcs[i][j] = lcs[i - 1][j - 1] + 1;
        } else {
          lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
        }
      }
    }

    // Backtrack to build diff
    let i = n;
    let j = m;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        diff.unshift({ type: 'context', content: oldLines[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
        diff.unshift({ type: 'addition', content: newLines[j - 1] });
        j--;
      } else if (i > 0) {
        diff.unshift({ type: 'deletion', content: oldLines[i - 1] });
        i--;
      }
    }

    return diff;
  }

  /**
   * Generate visual workflow diff
   */
  private generateVisualDiff(
    workflowA: WorkflowData,
    workflowB: WorkflowData
  ): VisualWorkflowDiff {
    // Compare nodes
    const nodesA = new Map(workflowA.nodes.map(n => [n.id, n]));
    const nodesB = new Map(workflowB.nodes.map(n => [n.id, n]));

    const nodesAdded: WorkflowNode[] = [];
    const nodesModified: NodeModification[] = [];
    const nodesDeleted: WorkflowNode[] = [];

    // Find added and modified nodes
    nodesB.forEach((node, id) => {
      if (!nodesA.has(id)) {
        nodesAdded.push(node);
      } else {
        const oldNode = nodesA.get(id)!;
        const changes = this.compareNodes(oldNode, node);
        if (changes.length > 0) {
          nodesModified.push({
            nodeId: id,
            nodeName: node.name || node.type,
            changes,
          });
        }
      }
    });

    // Find deleted nodes
    nodesA.forEach((node, id) => {
      if (!nodesB.has(id)) {
        nodesDeleted.push(node);
      }
    });

    // Compare edges
    const edgesA = new Set(workflowA.edges.map(e => `${e.source}-${e.target}`));
    const edgesB = new Set(workflowB.edges.map(e => `${e.source}-${e.target}`));

    const edgesAdded: WorkflowEdge[] = [];
    const edgesDeleted: WorkflowEdge[] = [];

    workflowB.edges.forEach(edge => {
      const key = `${edge.source}-${edge.target}`;
      if (!edgesA.has(key)) {
        edgesAdded.push(edge);
      }
    });

    workflowA.edges.forEach(edge => {
      const key = `${edge.source}-${edge.target}`;
      if (!edgesB.has(key)) {
        edgesDeleted.push(edge);
      }
    });

    // Compare settings
    const settingsChanged: SettingChange[] = [];

    if (workflowA.settings || workflowB.settings) {
      const settingsA = workflowA.settings || {};
      const settingsB = workflowB.settings || {};

      const allKeys = new Set([...Object.keys(settingsA), ...Object.keys(settingsB)]);

      allKeys.forEach(key => {
        if (JSON.stringify(settingsA[key]) !== JSON.stringify(settingsB[key])) {
          settingsChanged.push({
            setting: key,
            oldValue: settingsA[key],
            newValue: settingsB[key],
          });
        }
      });
    }

    return {
      nodesAdded,
      nodesModified,
      nodesDeleted,
      edgesAdded,
      edgesDeleted,
      settingsChanged,
    };
  }

  /**
   * Compare two nodes for changes
   */
  private compareNodes(oldNode: any, newNode: any): PropertyChange[] {
    const changes: PropertyChange[] = [];

    // Deep compare node data
    const compareObject = (path: string, oldObj: any, newObj: any) => {
      if (typeof oldObj !== 'object' || typeof newObj !== 'object') {
        if (oldObj !== newObj) {
          changes.push({ path, oldValue: oldObj, newValue: newObj });
        }
        return;
      }

      const allKeys = new Set([
        ...Object.keys(oldObj || {}),
        ...Object.keys(newObj || {}),
      ]);

      allKeys.forEach(key => {
        const newPath = path ? `${path}.${key}` : key;
        const oldVal = oldObj?.[key];
        const newVal = newObj?.[key];

        if (typeof oldVal === 'object' && typeof newVal === 'object') {
          compareObject(newPath, oldVal, newVal);
        } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changes.push({ path: newPath, oldValue: oldVal, newValue: newVal });
        }
      });
    };

    compareObject('', oldNode, newNode);

    return changes;
  }

  /**
   * Generate diff summary
   */
  private generateSummary(visualDiff: VisualWorkflowDiff): DiffSummary {
    const totalChanges =
      visualDiff.nodesAdded.length +
      visualDiff.nodesModified.length +
      visualDiff.nodesDeleted.length +
      visualDiff.edgesAdded.length +
      visualDiff.edgesDeleted.length +
      visualDiff.settingsChanged.length;

    const nodesChanged =
      visualDiff.nodesAdded.length +
      visualDiff.nodesModified.length +
      visualDiff.nodesDeleted.length;

    const edgesChanged = visualDiff.edgesAdded.length + visualDiff.edgesDeleted.length;

    let complexity: 'low' | 'medium' | 'high' = 'low';

    if (totalChanges > 10 || visualDiff.nodesDeleted.length > 3) {
      complexity = 'high';
    } else if (totalChanges > 5 || visualDiff.nodesModified.length > 2) {
      complexity = 'medium';
    }

    return {
      totalChanges,
      nodesChanged,
      edgesChanged,
      settingsChanged: visualDiff.settingsChanged.length,
      complexity,
    };
  }

  /**
   * Generate human-readable diff description
   */
  generateDescription(diff: WorkflowDiff): string {
    const lines: string[] = [];
    const { visualDiff, summary } = diff;

    lines.push(`Workflow: ${diff.workflowName}`);
    lines.push(`Total changes: ${summary.totalChanges}`);
    lines.push(`Complexity: ${summary.complexity}`);
    lines.push('');

    if (visualDiff.nodesAdded.length > 0) {
      lines.push(`Added nodes (${visualDiff.nodesAdded.length}):`);
      visualDiff.nodesAdded.forEach(node => {
        lines.push(`  + ${node.name || node.type} (${node.id})`);
      });
      lines.push('');
    }

    if (visualDiff.nodesModified.length > 0) {
      lines.push(`Modified nodes (${visualDiff.nodesModified.length}):`);
      visualDiff.nodesModified.forEach(mod => {
        lines.push(`  ~ ${mod.nodeName} (${mod.nodeId})`);
        mod.changes.forEach(change => {
          lines.push(`    - ${change.path}: ${JSON.stringify(change.oldValue)} → ${JSON.stringify(change.newValue)}`);
        });
      });
      lines.push('');
    }

    if (visualDiff.nodesDeleted.length > 0) {
      lines.push(`Deleted nodes (${visualDiff.nodesDeleted.length}):`);
      visualDiff.nodesDeleted.forEach(node => {
        lines.push(`  - ${node.name || node.type} (${node.id})`);
      });
      lines.push('');
    }

    if (visualDiff.edgesAdded.length > 0 || visualDiff.edgesDeleted.length > 0) {
      lines.push(`Connection changes:`);
      visualDiff.edgesAdded.forEach(edge => {
        lines.push(`  + ${edge.source} → ${edge.target}`);
      });
      visualDiff.edgesDeleted.forEach(edge => {
        lines.push(`  - ${edge.source} → ${edge.target}`);
      });
      lines.push('');
    }

    if (visualDiff.settingsChanged.length > 0) {
      lines.push(`Settings changed (${visualDiff.settingsChanged.length}):`);
      visualDiff.settingsChanged.forEach(change => {
        lines.push(`  ~ ${change.setting}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Compare workflow with Git version
   */
  async compareWithGit(
    workflow: WorkflowData,
    gitWorkflow: WorkflowData
  ): Promise<WorkflowDiff> {
    return this.generateWorkflowDiff(gitWorkflow, workflow);
  }
}

// Singleton instance
let diffGeneratorInstance: DiffGenerator | null = null;

export function getDiffGenerator(): DiffGenerator {
  if (!diffGeneratorInstance) {
    diffGeneratorInstance = new DiffGenerator();
  }
  return diffGeneratorInstance;
}
