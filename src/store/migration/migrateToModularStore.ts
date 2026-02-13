/**
 * PLAN C PHASE 3 - Migration Utility
 * Helps migrate from monolithic workflowStore to modular architecture
 */

import { logger } from '../../services/SimpleLogger';
import { useWorkflowStore } from '../workflowStore';

export interface LegacyStoreData {
  nodes?: any[];
  edges?: any[];
  selectedNode?: any;
  selectedEdge?: any;
  isExecuting?: boolean;
  executionResults?: Record<string, any>;
  executionErrors?: Record<string, any>;
  nodeExecutionData?: Record<string, any>;
  nodeExecutionStatus?: Record<string, any>;
  currentExecutingNode?: string | null;
  workflowName?: string;
  workflowDescription?: string;
  currentWorkflowId?: string | null;
  isSaved?: boolean;
  lastSaved?: number | null;
  darkMode?: boolean;
  debugMode?: boolean;
  globalVariables?: Record<string, any>;
  credentials?: Record<string, any>;
  webhookEndpoints?: Record<string, any>;
  currentEnvironment?: string;
  environments?: Record<string, any>;
}

/**
 * Migration utility class
 */
export class StoreMigrator {
  /**
   * Migrate data from legacy store format to new modular stores
   */
  static async migrate(legacyData: LegacyStoreData): Promise<void> {
    logger.info('Starting migration to modular store architecture...');

    try {
      // Migrate node data
      this.migrateNodeData(legacyData);

      // Migrate execution data
      this.migrateExecutionData(legacyData);

      // Migrate UI data
      this.migrateUIData(legacyData);

      // Migrate metadata
      this.migrateMetadata(legacyData);

      logger.info('Migration completed successfully');
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate node-related data
   */
  private static migrateNodeData(data: LegacyStoreData): void {
    const store = useWorkflowStore.getState() as any;

    if (data.nodes) {
      store.setNodes(data.nodes);
      logger.debug(`Migrated ${data.nodes.length} nodes`);
    }

    if (data.edges) {
      store.setEdges(data.edges);
      logger.debug(`Migrated ${data.edges.length} edges`);
    }

    if (data.selectedNode) {
      store.setSelectedNode(data.selectedNode);
    }

    if (data.selectedEdge) {
      store.setSelectedEdge(data.selectedEdge);
    }
  }

  /**
   * Migrate execution-related data
   */
  private static migrateExecutionData(data: LegacyStoreData): void {
    const store = useWorkflowStore.getState() as any;

    if (data.isExecuting !== undefined) {
      store.setIsExecuting(data.isExecuting);
    }

    if (data.currentExecutingNode) {
      store.setCurrentExecutingNode(data.currentExecutingNode);
    }

    if (data.executionResults) {
      Object.entries(data.executionResults).forEach(([nodeId, result]) => {
        store.setExecutionResult(nodeId, result as any);
      });
      logger.debug(`Migrated ${Object.keys(data.executionResults).length} execution results`);
    }

    if (data.executionErrors) {
      Object.entries(data.executionErrors).forEach(([nodeId, error]) => {
        store.setExecutionError(nodeId, error);
      });
      logger.debug(`Migrated ${Object.keys(data.executionErrors).length} execution errors`);
    }

    if (data.nodeExecutionData) {
      Object.entries(data.nodeExecutionData).forEach(([nodeId, nodeData]) => {
        store.setNodeExecutionData(nodeId, nodeData as any);
      });
    }

    if (data.nodeExecutionStatus) {
      Object.entries(data.nodeExecutionStatus).forEach(([nodeId, status]) => {
        store.setNodeStatus(nodeId, status as any);
      });
    }
  }

  /**
   * Migrate UI-related data
   */
  private static migrateUIData(data: LegacyStoreData): void {
    const store = useWorkflowStore.getState() as any;

    if (data.darkMode !== undefined) {
      if (data.darkMode) {
        store.toggleDarkMode(); // Toggle if it was true
      }
    }

    if (data.debugMode !== undefined) {
      if (data.debugMode) {
        store.toggleDebugMode(); // Toggle if it was true
      }
    }
  }

  /**
   * Migrate metadata and workflow information
   */
  private static migrateMetadata(data: LegacyStoreData): void {
    const store = useWorkflowStore.getState() as any;

    if (data.currentWorkflowId) {
      store.setCurrentWorkflowId(data.currentWorkflowId);
    }

    if (data.workflowName) {
      store.setWorkflowName(data.workflowName);
    }

    if (data.workflowDescription) {
      store.setWorkflowDescription(data.workflowDescription);
    }

    if (data.globalVariables) {
      Object.entries(data.globalVariables).forEach(([key, value]) => {
        store.setGlobalVariable(key, {
          key,
          value,
          type: typeof value as any,
          scope: 'global'
        });
      });
      logger.debug(`Migrated ${Object.keys(data.globalVariables).length} global variables`);
    }

    if (data.credentials) {
      Object.entries(data.credentials).forEach(([service, creds]) => {
        store.updateCredentials(service, creds as any);
      });
      logger.debug(`Migrated ${Object.keys(data.credentials).length} credentials`);
    }

    if (data.webhookEndpoints) {
      Object.entries(data.webhookEndpoints).forEach(([id, webhook]) => {
        store.registerWebhook({ id, ...webhook as any });
      });
    }

    if (data.currentEnvironment) {
      store.setCurrentEnvironment(data.currentEnvironment);
    }

    if (data.environments) {
      Object.entries(data.environments).forEach(([name, env]) => {
        store.addEnvironment(name, env as any);
      });
    }

    if (data.isSaved !== undefined) {
      if (data.isSaved) {
        store.markAsSaved();
      } else {
        store.markAsDirty();
      }
    }
  }

  /**
   * Export current state from legacy store
   */
  static exportLegacyState(): LegacyStoreData {
    // This would be implemented to read from the old store
    // For now, returning empty object as placeholder
    const legacyStateKey = 'workflow-storage';

    try {
      const storedData = localStorage.getItem(legacyStateKey);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        return parsed.state || parsed;
      }
    } catch (error) {
      logger.error('Failed to read legacy state:', error);
    }

    return {};
  }

  /**
   * Backup legacy data before migration
   */
  static backupLegacyData(): void {
    const legacyData = this.exportLegacyState();
    const backupKey = `workflow-storage-backup-${Date.now()}`;

    try {
      localStorage.setItem(backupKey, JSON.stringify(legacyData));
      logger.info(`Legacy data backed up to ${backupKey}`);
    } catch (error) {
      logger.error('Failed to backup legacy data:', error);
    }
  }

  /**
   * Perform full migration with backup
   */
  static async performMigration(): Promise<void> {
    logger.info('=== Starting Store Migration ===');

    // Step 1: Backup existing data
    this.backupLegacyData();

    // Step 2: Export legacy state
    const legacyData = this.exportLegacyState();

    // Step 3: Migrate to new stores
    await this.migrate(legacyData);

    // Step 4: Verify migration
    const success = await this.verifyMigration(legacyData);

    if (success) {
      logger.info('=== Migration Completed Successfully ===');

      // Optional: Clear old storage
      // localStorage.removeItem('workflow-storage');
    } else {
      logger.error('=== Migration Verification Failed ===');
      throw new Error('Migration verification failed');
    }
  }

  /**
   * Verify that migration was successful
   */
  private static async verifyMigration(originalData: LegacyStoreData): Promise<boolean> {
    const store = useWorkflowStore.getState() as any;

    let verificationPassed = true;

    // Verify nodes
    if (originalData.nodes) {
      const migratedNodesCount = store.nodes.length;
      const originalNodesCount = originalData.nodes.length;

      if (migratedNodesCount !== originalNodesCount) {
        logger.error(`Node count mismatch: ${migratedNodesCount} vs ${originalNodesCount}`);
        verificationPassed = false;
      }
    }

    // Verify edges
    if (originalData.edges) {
      const migratedEdgesCount = store.edges.length;
      const originalEdgesCount = originalData.edges.length;

      if (migratedEdgesCount !== originalEdgesCount) {
        logger.error(`Edge count mismatch: ${migratedEdgesCount} vs ${originalEdgesCount}`);
        verificationPassed = false;
      }
    }

    // Verify workflow metadata
    if (originalData.workflowName && store.workflowName !== originalData.workflowName) {
      logger.error(`Workflow name mismatch: ${store.workflowName} vs ${originalData.workflowName}`);
      verificationPassed = false;
    }

    return verificationPassed;
  }

  /**
   * Rollback migration if needed
   */
  static async rollbackMigration(): Promise<void> {
    logger.info('Rolling back migration...');

    // Find the latest backup
    const backupKeys = Object.keys(localStorage)
      .filter(key => key.startsWith('workflow-storage-backup-'))
      .sort()
      .reverse();

    if (backupKeys.length === 0) {
      logger.error('No backup found for rollback');
      throw new Error('No backup available');
    }

    const latestBackup = backupKeys[0];
    const backupData = localStorage.getItem(latestBackup);

    if (backupData) {
      // Restore to legacy store location
      localStorage.setItem('workflow-storage', backupData);

      // Clear new stores
      localStorage.removeItem('node-storage');
      localStorage.removeItem('execution-storage');
      localStorage.removeItem('ui-storage');
      localStorage.removeItem('workflow-metadata-storage');

      logger.info('Migration rolled back successfully');
    } else {
      logger.error('Failed to read backup data');
      throw new Error('Backup data corrupted');
    }
  }
}

/**
 * Migration status checker
 */
export class MigrationStatus {
  private static MIGRATION_FLAG_KEY = 'store-migration-completed';

  static isMigrated(): boolean {
    return localStorage.getItem(this.MIGRATION_FLAG_KEY) === 'true';
  }

  static markAsMigrated(): void {
    localStorage.setItem(this.MIGRATION_FLAG_KEY, 'true');
  }

  static resetMigrationFlag(): void {
    localStorage.removeItem(this.MIGRATION_FLAG_KEY);
  }
}

/**
 * Auto-migration on app startup
 */
export async function initializeStores(): Promise<void> {
  if (!MigrationStatus.isMigrated()) {
    logger.info('Detected unmigrated store, starting migration...');

    try {
      await StoreMigrator.performMigration();
      MigrationStatus.markAsMigrated();
    } catch (error) {
      logger.error('Auto-migration failed:', error);
      // App can still function with legacy store
    }
  } else {
    logger.info('Store already migrated, skipping migration');
  }
}
