/**
 * ArchiveService - Workflow archiving with compression and lifecycle management
 * Handles soft delete, restoration, and auto-expiration
 */

import { v4 as uuidv4 } from 'uuid';
import pako from 'pako';
import {
  ArchivedWorkflow,
  ArchiveStats,
  ArchiveFilter,
  OrganizationError,
} from '../types/organization';
import { logger } from '../services/SimpleLogger';

export class ArchiveService {
  private archives: Map<string, ArchivedWorkflow> = new Map();
  private currentUserId: string = 'current-user'; // Replace with actual auth
  private readonly DEFAULT_RETENTION_DAYS = 30;

  constructor() {
    this.loadArchives();
    this.startAutoCleanup();
  }

  /**
   * Archive a workflow
   */
  archiveWorkflow(
    workflowId: string,
    workflowName: string,
    workflowData: unknown,
    options: {
      reason?: string;
      folderId?: string;
      tags?: string[];
    } = {}
  ): ArchivedWorkflow {
    const { reason, folderId, tags = [] } = options;

    // Serialize workflow data
    const jsonData = JSON.stringify(workflowData);
    const originalSize = new Blob([jsonData]).size;

    // Compress with pako
    const compressed = pako.deflate(jsonData, { level: 9 });
    const compressedData = btoa(
      String.fromCharCode.apply(null, Array.from(compressed))
    );
    const compressedSize = new Blob([compressedData]).size;

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + this.DEFAULT_RETENTION_DAYS);

    // Count nodes and edges
    let nodeCount = 0;
    let edgeCount = 0;
    if (
      typeof workflowData === 'object' &&
      workflowData !== null &&
      'nodes' in workflowData &&
      'edges' in workflowData
    ) {
      nodeCount = Array.isArray((workflowData as { nodes: unknown }).nodes)
        ? (workflowData as { nodes: unknown[] }).nodes.length
        : 0;
      edgeCount = Array.isArray((workflowData as { edges: unknown }).edges)
        ? (workflowData as { edges: unknown[] }).edges.length
        : 0;
    }

    const archive: ArchivedWorkflow = {
      id: uuidv4(),
      originalWorkflowId: workflowId,
      workflowName,
      workflowData: compressedData,
      archivedAt: now.toISOString(),
      archivedBy: this.currentUserId,
      reason,
      folderId,
      tags,
      metadata: {
        nodeCount,
        edgeCount,
        originalSize,
        compressedSize,
        compressionRatio: originalSize > 0 ? compressedSize / originalSize : 0,
      },
      expiresAt: expiresAt.toISOString(),
      isRestorable: true,
    };

    this.archives.set(archive.id, archive);
    this.saveArchives();

    logger.info(`Workflow archived: ${workflowName} (${archive.id})`, {
      originalSize,
      compressedSize,
      compressionRatio: archive.metadata.compressionRatio,
    });

    return archive;
  }

  /**
   * Archive multiple workflows (bulk operation)
   */
  archiveWorkflows(
    workflows: Array<{
      workflowId: string;
      workflowName: string;
      workflowData: unknown;
      folderId?: string;
      tags?: string[];
    }>,
    reason?: string
  ): ArchivedWorkflow[] {
    const archived: ArchivedWorkflow[] = [];

    for (const workflow of workflows) {
      try {
        const archive = this.archiveWorkflow(
          workflow.workflowId,
          workflow.workflowName,
          workflow.workflowData,
          {
            reason,
            folderId: workflow.folderId,
            tags: workflow.tags,
          }
        );
        archived.push(archive);
      } catch (error) {
        logger.error(`Failed to archive workflow ${workflow.workflowId}:`, error);
      }
    }

    return archived;
  }

  /**
   * Restore an archived workflow
   */
  restoreWorkflow(archiveId: string): unknown {
    const archive = this.archives.get(archiveId);
    if (!archive) {
      throw new OrganizationError(
        `Archive ${archiveId} not found`,
        'ARCHIVE_NOT_FOUND'
      );
    }

    if (!archive.isRestorable) {
      throw new OrganizationError(
        'This archive cannot be restored',
        'ARCHIVE_EXPIRED'
      );
    }

    try {
      // Decompress data
      const compressedBytes = Uint8Array.from(atob(archive.workflowData), (c) =>
        c.charCodeAt(0)
      );
      const decompressed = pako.inflate(compressedBytes, { to: 'string' });
      const workflowData = JSON.parse(decompressed);

      logger.info(`Workflow restored from archive: ${archive.workflowName} (${archiveId})`);

      return workflowData;
    } catch (error) {
      logger.error(`Failed to restore archive ${archiveId}:`, error);
      throw new OrganizationError(
        'Failed to decompress archive data',
        'INVALID_OPERATION',
        { error }
      );
    }
  }

  /**
   * Restore and remove from archive
   */
  restoreAndDelete(archiveId: string): unknown {
    const workflowData = this.restoreWorkflow(archiveId);
    this.deleteArchive(archiveId);
    return workflowData;
  }

  /**
   * Get archive by ID
   */
  getArchive(archiveId: string): ArchivedWorkflow | null {
    return this.archives.get(archiveId) || null;
  }

  /**
   * Get all archives
   */
  getAllArchives(): ArchivedWorkflow[] {
    return Array.from(this.archives.values()).sort(
      (a, b) =>
        new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()
    );
  }

  /**
   * Search archives with filters
   */
  searchArchives(filter: ArchiveFilter): ArchivedWorkflow[] {
    let results = this.getAllArchives();

    if (filter.dateFrom) {
      const fromDate = new Date(filter.dateFrom);
      results = results.filter(
        (a) => new Date(a.archivedAt) >= fromDate
      );
    }

    if (filter.dateTo) {
      const toDate = new Date(filter.dateTo);
      results = results.filter(
        (a) => new Date(a.archivedAt) <= toDate
      );
    }

    if (filter.archivedBy) {
      results = results.filter((a) => a.archivedBy === filter.archivedBy);
    }

    if (filter.folderId) {
      results = results.filter((a) => a.folderId === filter.folderId);
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter((a) =>
        filter.tags!.some((tag) => a.tags.includes(tag))
      );
    }

    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      results = results.filter(
        (a) =>
          a.workflowName.toLowerCase().includes(query) ||
          a.reason?.toLowerCase().includes(query)
      );
    }

    return results;
  }

  /**
   * Delete archive permanently
   */
  deleteArchive(archiveId: string): void {
    const archive = this.archives.get(archiveId);
    if (!archive) {
      throw new OrganizationError(
        `Archive ${archiveId} not found`,
        'ARCHIVE_NOT_FOUND'
      );
    }

    this.archives.delete(archiveId);
    this.saveArchives();

    logger.info(`Archive permanently deleted: ${archive.workflowName} (${archiveId})`);
  }

  /**
   * Delete multiple archives
   */
  deleteArchives(archiveIds: string[]): void {
    for (const id of archiveIds) {
      try {
        this.deleteArchive(id);
      } catch (error) {
        logger.error(`Failed to delete archive ${id}:`, error);
      }
    }
  }

  /**
   * Update archive expiration date
   */
  updateExpiration(archiveId: string, daysToAdd: number): void {
    const archive = this.archives.get(archiveId);
    if (!archive) {
      throw new OrganizationError(
        `Archive ${archiveId} not found`,
        'ARCHIVE_NOT_FOUND'
      );
    }

    const newExpiration = new Date(archive.expiresAt!);
    newExpiration.setDate(newExpiration.getDate() + daysToAdd);

    archive.expiresAt = newExpiration.toISOString();
    this.saveArchives();

    logger.info(
      `Archive expiration updated: ${archive.workflowName} (${archiveId})`,
      { newExpiration: archive.expiresAt }
    );
  }

  /**
   * Mark archive as non-restorable
   */
  markAsNonRestorable(archiveId: string): void {
    const archive = this.archives.get(archiveId);
    if (!archive) {
      throw new OrganizationError(
        `Archive ${archiveId} not found`,
        'ARCHIVE_NOT_FOUND'
      );
    }

    archive.isRestorable = false;
    this.saveArchives();
  }

  /**
   * Get archives expiring soon
   */
  getExpiringSoon(days: number = 7): ArchivedWorkflow[] {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);

    return this.getAllArchives().filter((a) => {
      if (!a.expiresAt) return false;
      const expiresAt = new Date(a.expiresAt);
      return expiresAt <= threshold && expiresAt > new Date();
    });
  }

  /**
   * Get expired archives
   */
  getExpired(): ArchivedWorkflow[] {
    const now = new Date();
    return this.getAllArchives().filter((a) => {
      if (!a.expiresAt) return false;
      return new Date(a.expiresAt) <= now;
    });
  }

  /**
   * Clean up expired archives
   */
  cleanupExpired(): number {
    const expired = this.getExpired();
    let cleaned = 0;

    for (const archive of expired) {
      try {
        this.deleteArchive(archive.id);
        cleaned++;
      } catch (error) {
        logger.error(`Failed to cleanup expired archive ${archive.id}:`, error);
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} expired archives`);
    }

    return cleaned;
  }

  /**
   * Get archive statistics
   */
  getStats(): ArchiveStats {
    const archives = this.getAllArchives();
    const total = archives.length;

    if (total === 0) {
      return {
        totalArchived: 0,
        totalSize: 0,
        compressedSize: 0,
        averageCompressionRatio: 0,
        oldestArchive: null,
        newestArchive: null,
        expiringSoon: 0,
      };
    }

    const totalSize = archives.reduce(
      (sum, a) => sum + a.metadata.originalSize,
      0
    );
    const compressedSize = archives.reduce(
      (sum, a) => sum + a.metadata.compressedSize,
      0
    );

    const sortedByDate = [...archives].sort(
      (a, b) =>
        new Date(a.archivedAt).getTime() - new Date(b.archivedAt).getTime()
    );

    return {
      totalArchived: total,
      totalSize,
      compressedSize,
      averageCompressionRatio: compressedSize / totalSize,
      oldestArchive: sortedByDate[0]?.archivedAt || null,
      newestArchive: sortedByDate[sortedByDate.length - 1]?.archivedAt || null,
      expiringSoon: this.getExpiringSoon().length,
    };
  }

  /**
   * Export archives for backup
   */
  exportArchives(): string {
    const archives = this.getAllArchives();
    return JSON.stringify(archives, null, 2);
  }

  /**
   * Import archives from backup
   */
  importArchives(json: string): void {
    try {
      const archives = JSON.parse(json) as ArchivedWorkflow[];
      for (const archive of archives) {
        this.archives.set(archive.id, archive);
      }
      this.saveArchives();
      logger.info(`Imported ${archives.length} archives`);
    } catch (error) {
      logger.error('Failed to import archives:', error);
      throw new OrganizationError(
        'Failed to import archives',
        'INVALID_OPERATION',
        { error }
      );
    }
  }

  // ============================================================================
  // Auto-cleanup
  // ============================================================================

  private startAutoCleanup(): void {
    // Run cleanup every 24 hours
    setInterval(
      () => {
        this.cleanupExpired();
      },
      24 * 60 * 60 * 1000
    );

    // Run initial cleanup after 1 minute
    setTimeout(() => {
      this.cleanupExpired();
    }, 60 * 1000);
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  private loadArchives(): void {
    try {
      const stored = localStorage.getItem('workflow-archives');
      if (stored) {
        const archives = JSON.parse(stored) as ArchivedWorkflow[];
        this.archives = new Map(archives.map((a) => [a.id, a]));
        logger.info(`Loaded ${this.archives.size} archives from storage`);
      }
    } catch (error) {
      logger.error('Failed to load archives:', error);
    }
  }

  private saveArchives(): void {
    try {
      const archives = this.getAllArchives();
      localStorage.setItem('workflow-archives', JSON.stringify(archives));
    } catch (error) {
      logger.error('Failed to save archives:', error);
    }
  }

  /**
   * Clear all archives (use with caution)
   */
  clearAll(): void {
    this.archives.clear();
    this.saveArchives();
    logger.warn('All archives cleared');
  }
}

// Singleton instance
export const archiveService = new ArchiveService();
