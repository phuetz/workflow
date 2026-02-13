/**
 * Metadata Extractor
 * Extracts comprehensive metadata from workflows
 */

import type { WorkflowMetadata, VersionHistoryEntry } from '../types/workflowDocumentation';
import type { WorkflowNode, WorkflowEdge } from '../types/workflow';

export interface WorkflowData {
  id: string;
  name?: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata?: Record<string, any>;
  settings?: Record<string, any>;
  variables?: Record<string, any>;
}

export class MetadataExtractor {
  /**
   * Extract complete workflow metadata
   */
  extractMetadata(workflow: WorkflowData): WorkflowMetadata {
    return {
      id: workflow.id,
      name: this.extractName(workflow),
      description: this.extractDescription(workflow),
      version: this.extractVersion(workflow),
      author: this.extractAuthor(workflow),
      organization: this.extractOrganization(workflow),
      tags: this.extractTags(workflow),
      category: this.extractCategory(workflow),
      createdAt: this.extractCreatedAt(workflow),
      updatedAt: this.extractUpdatedAt(workflow),
      lastExecutedAt: this.extractLastExecutedAt(workflow),
      executionCount: this.extractExecutionCount(workflow),
      status: this.extractStatus(workflow),
    };
  }

  /**
   * Extract version history
   */
  extractVersionHistory(workflow: WorkflowData, previousVersions?: WorkflowData[]): VersionHistoryEntry[] {
    if (!previousVersions || previousVersions.length === 0) {
      return [
        {
          version: this.extractVersion(workflow),
          date: this.extractUpdatedAt(workflow),
          author: this.extractAuthor(workflow),
          changes: [
            {
              type: 'added',
              description: 'Initial version',
            },
          ],
        },
      ];
    }

    const history: VersionHistoryEntry[] = [];

    // Compare with previous versions
    previousVersions.forEach((prevVersion, index) => {
      const changes = this.compareVersions(prevVersion, workflow);
      if (changes.length > 0) {
        history.push({
          version: this.extractVersion(prevVersion),
          date: this.extractUpdatedAt(prevVersion),
          author: this.extractAuthor(prevVersion),
          changes,
        });
      }
    });

    return history.reverse(); // Most recent first
  }

  /**
   * Compare two workflow versions
   */
  private compareVersions(
    oldVersion: WorkflowData,
    newVersion: WorkflowData
  ): VersionHistoryEntry['changes'] {
    const changes: VersionHistoryEntry['changes'] = [];

    // Compare nodes
    const oldNodeIds = new Set(oldVersion.nodes.map((n) => n.id));
    const newNodeIds = new Set(newVersion.nodes.map((n) => n.id));

    // Added nodes
    const addedNodes = newVersion.nodes.filter((n) => !oldNodeIds.has(n.id));
    if (addedNodes.length > 0) {
      changes.push({
        type: 'added',
        description: `Added ${addedNodes.length} node(s)`,
        nodes: addedNodes.map((n) => n.id),
      });
    }

    // Removed nodes
    const removedNodes = oldVersion.nodes.filter((n) => !newNodeIds.has(n.id));
    if (removedNodes.length > 0) {
      changes.push({
        type: 'removed',
        description: `Removed ${removedNodes.length} node(s)`,
        nodes: removedNodes.map((n) => n.id),
      });
    }

    // Modified nodes
    const modifiedNodes = newVersion.nodes.filter((newNode) => {
      const oldNode = oldVersion.nodes.find((n) => n.id === newNode.id);
      if (!oldNode) return false;
      return JSON.stringify(oldNode.data.config) !== JSON.stringify(newNode.data.config);
    });

    if (modifiedNodes.length > 0) {
      changes.push({
        type: 'modified',
        description: `Modified ${modifiedNodes.length} node(s)`,
        nodes: modifiedNodes.map((n) => n.id),
      });
    }

    // Compare connections
    const oldEdgeCount = oldVersion.edges.length;
    const newEdgeCount = newVersion.edges.length;

    if (oldEdgeCount !== newEdgeCount) {
      changes.push({
        type: 'modified',
        description: `Updated connections (${oldEdgeCount} -> ${newEdgeCount})`,
      });
    }

    return changes;
  }

  /**
   * Extract workflow name
   */
  private extractName(workflow: WorkflowData): string {
    return (
      workflow.name ||
      workflow.metadata?.name ||
      workflow.settings?.name ||
      `Workflow ${workflow.id}`
    );
  }

  /**
   * Extract workflow description
   */
  private extractDescription(workflow: WorkflowData): string | undefined {
    return (
      workflow.description ||
      workflow.metadata?.description ||
      workflow.settings?.description
    );
  }

  /**
   * Extract version
   */
  private extractVersion(workflow: WorkflowData): string {
    return workflow.metadata?.version || workflow.settings?.version || '1.0.0';
  }

  /**
   * Extract author
   */
  private extractAuthor(workflow: WorkflowData): string | undefined {
    return workflow.metadata?.author || workflow.settings?.author;
  }

  /**
   * Extract organization
   */
  private extractOrganization(workflow: WorkflowData): string | undefined {
    return workflow.metadata?.organization || workflow.settings?.organization;
  }

  /**
   * Extract tags
   */
  private extractTags(workflow: WorkflowData): string[] {
    const tags = workflow.metadata?.tags || workflow.settings?.tags || [];
    return Array.isArray(tags) ? tags : [];
  }

  /**
   * Extract category
   */
  private extractCategory(workflow: WorkflowData): string | undefined {
    if (workflow.metadata?.category) return workflow.metadata.category;
    if (workflow.settings?.category) return workflow.settings.category;

    // Infer category from node types
    return this.inferCategory(workflow);
  }

  /**
   * Infer category from workflow content
   */
  private inferCategory(workflow: WorkflowData): string {
    const nodeTypes = workflow.nodes.map((n) => n.type.toLowerCase());

    // Check for common patterns
    if (nodeTypes.some((t) => t.includes('email'))) return 'Communication';
    if (nodeTypes.some((t) => t.includes('slack') || t.includes('teams'))) return 'Communication';
    if (nodeTypes.some((t) => t.includes('database') || t.includes('mysql') || t.includes('postgres')))
      return 'Data Processing';
    if (nodeTypes.some((t) => t.includes('webhook'))) return 'Integration';
    if (nodeTypes.some((t) => t.includes('schedule'))) return 'Automation';
    if (nodeTypes.some((t) => t.includes('api') || t.includes('http'))) return 'Integration';

    return 'General';
  }

  /**
   * Extract created date
   */
  private extractCreatedAt(workflow: WorkflowData): Date {
    const created = workflow.metadata?.createdAt || workflow.settings?.createdAt;
    return created ? new Date(created) : new Date();
  }

  /**
   * Extract updated date
   */
  private extractUpdatedAt(workflow: WorkflowData): Date {
    const updated = workflow.metadata?.updatedAt || workflow.settings?.updatedAt;
    return updated ? new Date(updated) : new Date();
  }

  /**
   * Extract last executed date
   */
  private extractLastExecutedAt(workflow: WorkflowData): Date | undefined {
    const executed = workflow.metadata?.lastExecutedAt || workflow.settings?.lastExecutedAt;
    return executed ? new Date(executed) : undefined;
  }

  /**
   * Extract execution count
   */
  private extractExecutionCount(workflow: WorkflowData): number | undefined {
    return workflow.metadata?.executionCount || workflow.settings?.executionCount;
  }

  /**
   * Extract status
   */
  private extractStatus(workflow: WorkflowData): 'active' | 'inactive' | 'draft' {
    const status = workflow.metadata?.status || workflow.settings?.status;
    if (status === 'active' || status === 'inactive' || status === 'draft') {
      return status;
    }

    // Infer status
    if (workflow.nodes.length === 0) return 'draft';
    if (this.extractLastExecutedAt(workflow)) return 'active';
    return 'draft';
  }

  /**
   * Extract custom metadata fields
   */
  extractCustomMetadata(workflow: WorkflowData): Record<string, any> {
    const custom: Record<string, any> = {};

    // Extract all metadata that's not in standard fields
    const standardFields = [
      'id',
      'name',
      'description',
      'version',
      'author',
      'organization',
      'tags',
      'category',
      'createdAt',
      'updatedAt',
      'lastExecutedAt',
      'executionCount',
      'status',
    ];

    if (workflow.metadata) {
      Object.entries(workflow.metadata).forEach(([key, value]) => {
        if (!standardFields.includes(key)) {
          custom[key] = value;
        }
      });
    }

    if (workflow.settings) {
      Object.entries(workflow.settings).forEach(([key, value]) => {
        if (!standardFields.includes(key) && !(key in custom)) {
          custom[key] = value;
        }
      });
    }

    return custom;
  }

  /**
   * Generate metadata summary
   */
  generateSummary(workflow: WorkflowData): string {
    const metadata = this.extractMetadata(workflow);
    const parts: string[] = [];

    parts.push(`Workflow: ${metadata.name}`);
    if (metadata.description) {
      parts.push(`Description: ${metadata.description}`);
    }
    parts.push(`Version: ${metadata.version}`);
    if (metadata.author) {
      parts.push(`Author: ${metadata.author}`);
    }
    parts.push(`Nodes: ${workflow.nodes.length}`);
    parts.push(`Connections: ${workflow.edges.length}`);
    if (metadata.tags.length > 0) {
      parts.push(`Tags: ${metadata.tags.join(', ')}`);
    }
    parts.push(`Status: ${metadata.status}`);
    parts.push(`Last Updated: ${metadata.updatedAt.toLocaleString()}`);

    return parts.join('\n');
  }
}

export default MetadataExtractor;
