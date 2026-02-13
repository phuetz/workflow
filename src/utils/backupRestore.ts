/**
 * Backup & Restore Utilities
 * Export and import workflows and application data
 */

import type { Node, Edge } from '@xyflow/react';

export interface WorkflowBackup {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  settings?: Record<string, any>;
  tags?: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface FullBackup {
  version: string;
  timestamp: string;
  workflows: WorkflowBackup[];
  credentials?: Array<{
    id: string;
    name: string;
    type: string;
    // Note: actual credential data is NOT exported for security
  }>;
  settings?: Record<string, any>;
  metadata: {
    appVersion: string;
    backupId: string;
    userId?: string;
    organizationId?: string;
  };
}

export interface BackupOptions {
  includeCredentials?: boolean; // Only exports credential metadata, not actual secrets
  includeSettings?: boolean;
  workflowIds?: string[]; // If specified, only backup these workflows
  compress?: boolean;
}

export interface RestoreOptions {
  overwrite?: boolean; // Overwrite existing workflows with same ID
  skipCredentials?: boolean;
  skipSettings?: boolean;
  workflowIdMapping?: Record<string, string>; // Map old IDs to new IDs
}

export interface RestoreResult {
  success: boolean;
  workflowsRestored: number;
  workflowsSkipped: number;
  errors: Array<{ workflow: string; error: string }>;
}

class BackupRestoreManager {
  private readonly BACKUP_VERSION = '2.0';

  /**
   * Export single workflow
   */
  exportWorkflow(workflow: WorkflowBackup): Blob {
    const data = JSON.stringify(workflow, null, 2);
    return new Blob([data], { type: 'application/json' });
  }

  /**
   * Export multiple workflows
   */
  exportWorkflows(workflows: WorkflowBackup[], options: BackupOptions = {}): Blob {
    const backup: FullBackup = {
      version: this.BACKUP_VERSION,
      timestamp: new Date().toISOString(),
      workflows: options.workflowIds
        ? workflows.filter(w => options.workflowIds!.includes(w.id))
        : workflows,
      metadata: {
        appVersion: import.meta.env.VITE_APP_VERSION || '2.0.0',
        backupId: this.generateBackupId(),
        userId: undefined, // Set by caller if needed
        organizationId: undefined
      }
    };

    if (options.includeSettings) {
      backup.settings = this.exportSettings();
    }

    if (options.includeCredentials) {
      backup.credentials = this.exportCredentialMetadata();
    }

    const data = JSON.stringify(backup, null, 2);

    if (options.compress) {
      return this.compressData(data);
    }

    return new Blob([data], { type: 'application/json' });
  }

  /**
   * Download backup file
   */
  downloadBackup(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Import workflow from file
   */
  async importWorkflowFromFile(file: File): Promise<WorkflowBackup> {
    const text = await file.text();
    const workflow = JSON.parse(text) as WorkflowBackup;

    // Validate workflow structure
    this.validateWorkflow(workflow);

    return workflow;
  }

  /**
   * Import full backup from file
   */
  async importBackupFromFile(file: File): Promise<FullBackup> {
    let text = await file.text();

    // Check if compressed
    if (file.name.endsWith('.gz')) {
      text = await this.decompressData(text);
    }

    const backup = JSON.parse(text) as FullBackup;

    // Validate backup
    this.validateBackup(backup);

    return backup;
  }

  /**
   * Restore workflows from backup
   */
  async restoreWorkflows(
    backup: FullBackup,
    options: RestoreOptions = {}
  ): Promise<RestoreResult> {
    const result: RestoreResult = {
      success: true,
      workflowsRestored: 0,
      workflowsSkipped: 0,
      errors: []
    };

    for (const workflow of backup.workflows) {
      try {
        // Generate new ID if mapping provided
        const newId = options.workflowIdMapping?.[workflow.id] || workflow.id;

        // Check if workflow exists
        const exists = await this.workflowExists(newId);

        if (exists && !options.overwrite) {
          result.workflowsSkipped++;
          continue;
        }

        // Restore workflow with new ID
        const restoredWorkflow = {
          ...workflow,
          id: newId
        };

        await this.saveWorkflow(restoredWorkflow);
        result.workflowsRestored++;
      } catch (error) {
        result.success = false;
        result.errors.push({
          workflow: workflow.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Restore settings if requested
    if (backup.settings && !options.skipSettings) {
      this.restoreSettings(backup.settings);
    }

    return result;
  }

  /**
   * Create automatic backup
   */
  async createAutoBackup(workflows: WorkflowBackup[]): Promise<void> {
    const backup = this.exportWorkflows(workflows, {
      includeCredentials: false,
      includeSettings: true,
      compress: true
    });

    // Store in IndexedDB
    await this.storeBackupInDB(backup);

    // Cleanup old backups (keep last 10)
    await this.cleanupOldBackups(10);
  }

  /**
   * Get backup history
   */
  async getBackupHistory(): Promise<Array<{
    id: string;
    timestamp: string;
    workflowCount: number;
    size: number;
  }>> {
    // Retrieve from IndexedDB
    const db = await this.openBackupDB();
    const transaction = db.transaction(['backups'], 'readonly');
    const store = transaction.objectStore('backups');
    const backups = await this.getAllFromStore(store);

    return backups.map(b => ({
      id: b.id,
      timestamp: b.timestamp,
      workflowCount: b.data.workflows?.length || 0,
      size: new Blob([JSON.stringify(b.data)]).size
    }));
  }

  /**
   * Export to different formats
   */
  exportToYAML(workflow: WorkflowBackup): string {
    // Simple YAML export (production would use a proper YAML library)
    const yaml = `
name: ${workflow.name}
version: ${workflow.version}
description: ${workflow.description || ''}
tags: [${workflow.tags?.join(', ') || ''}]

nodes:
${workflow.nodes.map(node => `  - id: ${node.id}
    type: ${node.type}
    position:
      x: ${node.position.x}
      y: ${node.position.y}
    data: ${JSON.stringify(node.data)}`).join('\n')}

edges:
${workflow.edges.map(edge => `  - id: ${edge.id}
    source: ${edge.source}
    target: ${edge.target}`).join('\n')}
`.trim();

    return yaml;
  }

  exportToMarkdown(workflow: WorkflowBackup): string {
    const md = `
# ${workflow.name}

${workflow.description || ''}

**Version:** ${workflow.version}
**Created:** ${workflow.createdAt}
**Updated:** ${workflow.updatedAt}
**Tags:** ${workflow.tags?.join(', ') || 'None'}

## Nodes (${workflow.nodes.length})

${workflow.nodes.map(node => `
### ${node.data?.label || node.type} (\`${node.id}\`)
- **Type:** ${node.type}
- **Position:** (${node.position.x}, ${node.position.y})
${node.data ? '- **Data:** ```json\n' + JSON.stringify(node.data, null, 2) + '\n```' : ''}
`).join('\n')}

## Connections (${workflow.edges.length})

${workflow.edges.map(edge => `- \`${edge.source}\` → \`${edge.target}\``).join('\n')}
`.trim();

    return md;
  }

  /**
   * Validate workflow structure
   */
  private validateWorkflow(workflow: any): void {
    if (!workflow.id || !workflow.name) {
      throw new Error('Invalid workflow: missing required fields (id, name)');
    }

    if (!Array.isArray(workflow.nodes)) {
      throw new Error('Invalid workflow: nodes must be an array');
    }

    if (!Array.isArray(workflow.edges)) {
      throw new Error('Invalid workflow: edges must be an array');
    }

    // Validate node structure
    for (const node of workflow.nodes) {
      if (!node.id || !node.type || !node.position) {
        throw new Error(`Invalid node structure: ${node.id || 'unknown'}`);
      }
    }

    // Validate edge structure
    for (const edge of workflow.edges) {
      if (!edge.id || !edge.source || !edge.target) {
        throw new Error(`Invalid edge structure: ${edge.id || 'unknown'}`);
      }
    }
  }

  /**
   * Validate backup structure
   */
  private validateBackup(backup: any): void {
    if (!backup.version || !backup.timestamp) {
      throw new Error('Invalid backup: missing version or timestamp');
    }

    if (!Array.isArray(backup.workflows)) {
      throw new Error('Invalid backup: workflows must be an array');
    }

    // Validate each workflow
    for (const workflow of backup.workflows) {
      this.validateWorkflow(workflow);
    }
  }

  /**
   * Generate unique backup ID
   */
  private generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export credential metadata (NOT actual secrets)
   */
  private exportCredentialMetadata(): any[] {
    // In production, this would fetch from the credential store
    // For security, we NEVER export actual credential data
    return [];
  }

  /**
   * Export application settings
   */
  private exportSettings(): Record<string, any> {
    // Export non-sensitive settings
    return {
      theme: localStorage.getItem('theme'),
      language: localStorage.getItem('language'),
      // Add other safe settings
    };
  }

  /**
   * Restore application settings
   */
  private restoreSettings(settings: Record<string, any>): void {
    if (settings.theme) localStorage.setItem('theme', settings.theme);
    if (settings.language) localStorage.setItem('language', settings.language);
  }

  /**
   * Check if workflow exists
   */
  private async workflowExists(id: string): Promise<boolean> {
    // In production, this would check the database
    return false;
  }

  /**
   * Save workflow
   */
  private async saveWorkflow(workflow: WorkflowBackup): Promise<void> {
    // In production, this would save to the database
    console.log('Saving workflow:', workflow.name);
  }

  /**
   * Compress data (placeholder - would use pako or similar in production)
   */
  private compressData(data: string): Blob {
    // In production, use actual compression library
    return new Blob([data], { type: 'application/gzip' });
  }

  /**
   * Decompress data (placeholder)
   */
  private async decompressData(data: string): Promise<string> {
    // In production, use actual decompression library
    return data;
  }

  /**
   * Open IndexedDB for backups
   */
  private async openBackupDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WorkflowBackups', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Store backup in IndexedDB
   */
  private async storeBackupInDB(backup: Blob): Promise<void> {
    const db = await this.openBackupDB();
    const text = await backup.text();
    const data = JSON.parse(text);

    const transaction = db.transaction(['backups'], 'readwrite');
    const store = transaction.objectStore('backups');

    const backupRecord = {
      id: this.generateBackupId(),
      timestamp: new Date().toISOString(),
      data
    };

    store.add(backupRecord);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get all records from IndexedDB store
   */
  private async getAllFromStore(store: IDBObjectStore): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cleanup old backups
   */
  private async cleanupOldBackups(keepCount: number): Promise<void> {
    const db = await this.openBackupDB();
    const transaction = db.transaction(['backups'], 'readwrite');
    const store = transaction.objectStore('backups');
    const backups = await this.getAllFromStore(store);

    // Sort by timestamp
    backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Delete old backups
    for (let i = keepCount; i < backups.length; i++) {
      store.delete(backups[i].id);
    }
  }
}

// Singleton instance
export const backupRestoreManager = new BackupRestoreManager();

/**
 * Quick export helpers
 */
export function downloadWorkflowAsJSON(workflow: WorkflowBackup) {
  const blob = backupRestoreManager.exportWorkflow(workflow);
  const filename = `${workflow.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
  backupRestoreManager.downloadBackup(blob, filename);
}

export function downloadWorkflowAsYAML(workflow: WorkflowBackup) {
  const yaml = backupRestoreManager.exportToYAML(workflow);
  const blob = new Blob([yaml], { type: 'text/yaml' });
  const filename = `${workflow.name.replace(/\s+/g, '_')}_${Date.now()}.yaml`;
  backupRestoreManager.downloadBackup(blob, filename);
}

export function downloadWorkflowAsMarkdown(workflow: WorkflowBackup) {
  const md = backupRestoreManager.exportToMarkdown(workflow);
  const blob = new Blob([md], { type: 'text/markdown' });
  const filename = `${workflow.name.replace(/\s+/g, '_')}_${Date.now()}.md`;
  backupRestoreManager.downloadBackup(blob, filename);
}

export function downloadFullBackup(workflows: WorkflowBackup[], options?: BackupOptions) {
  const blob = backupRestoreManager.exportWorkflows(workflows, options);
  const filename = `workflow_backup_${new Date().toISOString().split('T')[0]}.json`;
  backupRestoreManager.downloadBackup(blob, filename);
}
