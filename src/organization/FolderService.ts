/**
 * FolderService - Complete folder management with unlimited nesting
 * Handles CRUD operations, permissions, and tree operations
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Folder,
  FolderPermissions,
  CreateFolderParams,
  UpdateFolderParams,
  MoveFolderParams,
  FolderStats,
  OrganizationError,
} from '../types/organization';
import { logger } from '../services/SimpleLogger';

export class FolderService {
  private folders: Map<string, Folder> = new Map();
  private currentUserId: string = 'current-user'; // Replace with actual auth

  constructor() {
    this.loadFolders();
  }

  /**
   * Create a new folder
   */
  createFolder(params: CreateFolderParams): Folder {
    const {
      name,
      parentId = null,
      description = '',
      color = '#6366f1',
      icon = 'Folder',
    } = params;

    // Validate folder name
    if (!name || name.trim().length === 0) {
      throw new OrganizationError(
        'Folder name cannot be empty',
        'INVALID_OPERATION'
      );
    }

    // Check if parent exists
    if (parentId && !this.folders.has(parentId)) {
      throw new OrganizationError(
        `Parent folder ${parentId} not found`,
        'FOLDER_NOT_FOUND'
      );
    }

    // Check for duplicate names in same parent
    const siblings = Array.from(this.folders.values()).filter(
      (f) => f.parentId === parentId
    );
    if (siblings.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      throw new OrganizationError(
        `Folder "${name}" already exists in this location`,
        'FOLDER_ALREADY_EXISTS'
      );
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const parent = parentId ? this.folders.get(parentId) : null;
    const level = parent ? parent.level + 1 : 0;
    const path = parent ? `${parent.path}/${name}` : `/${name}`;

    const folder: Folder = {
      id,
      name: name.trim(),
      parentId,
      description,
      color,
      icon,
      createdAt: now,
      updatedAt: now,
      createdBy: this.currentUserId,
      path,
      level,
      workflowIds: [],
      permissions: this.getDefaultPermissions(),
      isExpanded: false,
      metadata: {},
    };

    this.folders.set(id, folder);
    this.saveFolders();

    logger.info(`Folder created: ${name} (${id})`, { folder });
    return folder;
  }

  /**
   * Get folder by ID
   */
  getFolder(folderId: string): Folder | null {
    return this.folders.get(folderId) || null;
  }

  /**
   * Get all folders
   */
  getAllFolders(): Folder[] {
    return Array.from(this.folders.values());
  }

  /**
   * Get root folders (no parent)
   */
  getRootFolders(): Folder[] {
    return Array.from(this.folders.values()).filter((f) => !f.parentId);
  }

  /**
   * Get child folders
   */
  getChildFolders(parentId: string): Folder[] {
    return Array.from(this.folders.values())
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get all descendants of a folder (recursive)
   */
  getDescendants(folderId: string): Folder[] {
    const descendants: Folder[] = [];
    const children = this.getChildFolders(folderId);

    for (const child of children) {
      descendants.push(child);
      descendants.push(...this.getDescendants(child.id));
    }

    return descendants;
  }

  /**
   * Get folder path as array of folders from root to target
   */
  getFolderPath(folderId: string): Folder[] {
    const path: Folder[] = [];
    let current = this.folders.get(folderId);

    while (current) {
      path.unshift(current);
      current = current.parentId ? this.folders.get(current.parentId) : undefined;
    }

    return path;
  }

  /**
   * Update folder
   */
  updateFolder(folderId: string, params: UpdateFolderParams): Folder {
    const folder = this.folders.get(folderId);
    if (!folder) {
      throw new OrganizationError(
        `Folder ${folderId} not found`,
        'FOLDER_NOT_FOUND'
      );
    }

    // Check permissions
    if (!this.canEdit(folder)) {
      throw new OrganizationError(
        'You do not have permission to edit this folder',
        'PERMISSION_DENIED'
      );
    }

    // Validate name if changing
    if (params.name && params.name !== folder.name) {
      const siblings = Array.from(this.folders.values()).filter(
        (f) => f.parentId === folder.parentId && f.id !== folderId
      );
      if (
        siblings.some(
          (f) => f.name.toLowerCase() === params.name!.toLowerCase()
        )
      ) {
        throw new OrganizationError(
          `Folder "${params.name}" already exists in this location`,
          'FOLDER_ALREADY_EXISTS'
        );
      }
    }

    const updatedFolder: Folder = {
      ...folder,
      ...params,
      updatedAt: new Date().toISOString(),
    };

    // Update path if name changed
    if (params.name && params.name !== folder.name) {
      const parent = folder.parentId ? this.folders.get(folder.parentId) : null;
      updatedFolder.path = parent
        ? `${parent.path}/${params.name}`
        : `/${params.name}`;

      // Update paths of all descendants
      this.updateDescendantPaths(folderId, updatedFolder.path);
    }

    this.folders.set(folderId, updatedFolder);
    this.saveFolders();

    logger.info(`Folder updated: ${folderId}`, { updates: params });
    return updatedFolder;
  }

  /**
   * Move folder to a new parent
   */
  moveFolder(params: MoveFolderParams): Folder {
    const { folderId, targetParentId } = params;

    const folder = this.folders.get(folderId);
    if (!folder) {
      throw new OrganizationError(
        `Folder ${folderId} not found`,
        'FOLDER_NOT_FOUND'
      );
    }

    // Check permissions
    if (!this.canEdit(folder)) {
      throw new OrganizationError(
        'You do not have permission to move this folder',
        'PERMISSION_DENIED'
      );
    }

    // Validate target parent exists
    if (targetParentId && !this.folders.get(targetParentId)) {
      throw new OrganizationError(
        `Target parent folder ${targetParentId} not found`,
        'FOLDER_NOT_FOUND'
      );
    }

    // Prevent moving to self or descendant (circular dependency)
    if (targetParentId === folderId) {
      throw new OrganizationError(
        'Cannot move folder into itself',
        'CIRCULAR_DEPENDENCY'
      );
    }

    const descendants = this.getDescendants(folderId);
    if (descendants.some((d) => d.id === targetParentId)) {
      throw new OrganizationError(
        'Cannot move folder into its own descendant',
        'CIRCULAR_DEPENDENCY'
      );
    }

    // Check for name conflict in target location
    const targetSiblings = Array.from(this.folders.values()).filter(
      (f) => f.parentId === targetParentId && f.id !== folderId
    );
    if (
      targetSiblings.some(
        (f) => f.name.toLowerCase() === folder.name.toLowerCase()
      )
    ) {
      throw new OrganizationError(
        `A folder named "${folder.name}" already exists in the target location`,
        'FOLDER_ALREADY_EXISTS'
      );
    }

    // Calculate new path and level
    const targetParent = targetParentId
      ? this.folders.get(targetParentId)
      : null;
    const newLevel = targetParent ? targetParent.level + 1 : 0;
    const newPath = targetParent
      ? `${targetParent.path}/${folder.name}`
      : `/${folder.name}`;

    const movedFolder: Folder = {
      ...folder,
      parentId: targetParentId,
      level: newLevel,
      path: newPath,
      updatedAt: new Date().toISOString(),
    };

    this.folders.set(folderId, movedFolder);

    // Update paths and levels of all descendants
    this.updateDescendantPaths(folderId, newPath);

    this.saveFolders();

    logger.info(`Folder moved: ${folderId} -> ${targetParentId}`, {
      from: folder.path,
      to: newPath,
    });

    return movedFolder;
  }

  /**
   * Delete folder and optionally its contents
   */
  deleteFolder(
    folderId: string,
    options: { recursive?: boolean; moveWorkflows?: boolean } = {}
  ): void {
    const { recursive = false, moveWorkflows = false } = options;

    const folder = this.folders.get(folderId);
    if (!folder) {
      throw new OrganizationError(
        `Folder ${folderId} not found`,
        'FOLDER_NOT_FOUND'
      );
    }

    // Check permissions
    if (!this.canDelete(folder)) {
      throw new OrganizationError(
        'You do not have permission to delete this folder',
        'PERMISSION_DENIED'
      );
    }

    const children = this.getChildFolders(folderId);

    // Check if folder has children
    if (children.length > 0 && !recursive) {
      throw new OrganizationError(
        'Folder is not empty. Use recursive option to delete all contents.',
        'INVALID_OPERATION'
      );
    }

    // Handle workflows in this folder
    if (folder.workflowIds.length > 0 && !moveWorkflows) {
      throw new OrganizationError(
        'Folder contains workflows. Move them first or use moveWorkflows option.',
        'INVALID_OPERATION'
      );
    }

    // Move workflows to parent if requested
    if (folder.workflowIds.length > 0 && moveWorkflows) {
      // This would integrate with workflow store to move workflows
      logger.info(
        `Moving ${folder.workflowIds.length} workflows from deleted folder to parent`
      );
    }

    // Delete recursively if requested
    if (recursive) {
      for (const child of children) {
        this.deleteFolder(child.id, { recursive: true, moveWorkflows });
      }
    }

    this.folders.delete(folderId);
    this.saveFolders();

    logger.info(`Folder deleted: ${folderId}`, { recursive, moveWorkflows });
  }

  /**
   * Add workflow to folder
   */
  addWorkflowToFolder(folderId: string, workflowId: string): void {
    const folder = this.folders.get(folderId);
    if (!folder) {
      throw new OrganizationError(
        `Folder ${folderId} not found`,
        'FOLDER_NOT_FOUND'
      );
    }

    if (!folder.workflowIds.includes(workflowId)) {
      folder.workflowIds.push(workflowId);
      folder.updatedAt = new Date().toISOString();
      this.saveFolders();
    }
  }

  /**
   * Remove workflow from folder
   */
  removeWorkflowFromFolder(folderId: string, workflowId: string): void {
    const folder = this.folders.get(folderId);
    if (!folder) {
      throw new OrganizationError(
        `Folder ${folderId} not found`,
        'FOLDER_NOT_FOUND'
      );
    }

    const index = folder.workflowIds.indexOf(workflowId);
    if (index > -1) {
      folder.workflowIds.splice(index, 1);
      folder.updatedAt = new Date().toISOString();
      this.saveFolders();
    }
  }

  /**
   * Move workflows between folders
   */
  moveWorkflows(
    workflowIds: string[],
    sourceFolderId: string | null,
    targetFolderId: string | null
  ): void {
    // Remove from source
    if (sourceFolderId) {
      const sourceFolder = this.folders.get(sourceFolderId);
      if (sourceFolder) {
        sourceFolder.workflowIds = sourceFolder.workflowIds.filter(
          (id) => !workflowIds.includes(id)
        );
        sourceFolder.updatedAt = new Date().toISOString();
      }
    }

    // Add to target
    if (targetFolderId) {
      const targetFolder = this.folders.get(targetFolderId);
      if (!targetFolder) {
        throw new OrganizationError(
          `Target folder ${targetFolderId} not found`,
          'FOLDER_NOT_FOUND'
        );
      }

      for (const workflowId of workflowIds) {
        if (!targetFolder.workflowIds.includes(workflowId)) {
          targetFolder.workflowIds.push(workflowId);
        }
      }
      targetFolder.updatedAt = new Date().toISOString();
    }

    this.saveFolders();
    logger.info(`Moved ${workflowIds.length} workflows to folder ${targetFolderId}`);
  }

  /**
   * Get folder statistics
   */
  getFolderStats(folderId: string, recursive: boolean = false): FolderStats {
    const folder = this.folders.get(folderId);
    if (!folder) {
      throw new OrganizationError(
        `Folder ${folderId} not found`,
        'FOLDER_NOT_FOUND'
      );
    }

    let workflowIds = [...folder.workflowIds];

    if (recursive) {
      const descendants = this.getDescendants(folderId);
      for (const desc of descendants) {
        workflowIds.push(...desc.workflowIds);
      }
    }

    // Remove duplicates
    workflowIds = [...new Set(workflowIds)];

    return {
      totalWorkflows: workflowIds.length,
      activeWorkflows: workflowIds.length, // Would check workflow status
      archivedWorkflows: 0,
      totalExecutions: 0, // Would aggregate from execution history
      lastActivity: folder.updatedAt,
      size: 0, // Would calculate based on workflow data
    };
  }

  /**
   * Search folders by name
   */
  searchFolders(query: string): Folder[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.folders.values()).filter((folder) =>
      folder.name.toLowerCase().includes(lowerQuery) ||
      folder.description?.toLowerCase().includes(lowerQuery) ||
      folder.path.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Toggle folder expansion state
   */
  toggleExpanded(folderId: string): void {
    const folder = this.folders.get(folderId);
    if (folder) {
      folder.isExpanded = !folder.isExpanded;
      this.saveFolders();
    }
  }

  /**
   * Expand all parent folders up to a specific folder
   */
  expandToFolder(folderId: string): void {
    const path = this.getFolderPath(folderId);
    for (const folder of path) {
      folder.isExpanded = true;
    }
    this.saveFolders();
  }

  // ============================================================================
  // Permission Helpers
  // ============================================================================

  private canRead(folder: Folder): boolean {
    if (!folder.permissions) return true;
    const userId = this.currentUserId;
    return (
      folder.permissions.isPublic ||
      folder.permissions.owner === userId ||
      folder.permissions.readers.includes(userId) ||
      folder.permissions.editors.includes(userId) ||
      folder.permissions.admins.includes(userId)
    );
  }

  private canEdit(folder: Folder): boolean {
    if (!folder.permissions) return true;
    const userId = this.currentUserId;
    return (
      folder.permissions.owner === userId ||
      folder.permissions.editors.includes(userId) ||
      folder.permissions.admins.includes(userId)
    );
  }

  private canDelete(folder: Folder): boolean {
    if (!folder.permissions) return true;
    const userId = this.currentUserId;
    return (
      folder.permissions.owner === userId ||
      folder.permissions.admins.includes(userId)
    );
  }

  private getDefaultPermissions(): FolderPermissions {
    return {
      owner: this.currentUserId,
      readers: [],
      editors: [],
      admins: [],
      isPublic: false,
      inheritFromParent: true,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private updateDescendantPaths(folderId: string, newParentPath: string): void {
    const descendants = this.getDescendants(folderId);
    const folder = this.folders.get(folderId);

    if (!folder) return;

    for (const descendant of descendants) {
      const relativePath = descendant.path.substring(folder.path.length);
      descendant.path = newParentPath + relativePath;
      descendant.level = descendant.path.split('/').length - 1;
    }
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  private loadFolders(): void {
    try {
      const stored = localStorage.getItem('workflow-folders');
      if (stored) {
        const folders = JSON.parse(stored) as Folder[];
        this.folders = new Map(folders.map((f) => [f.id, f]));
        logger.info(`Loaded ${this.folders.size} folders from storage`);
      }
    } catch (error) {
      logger.error('Failed to load folders:', error);
    }
  }

  private saveFolders(): void {
    try {
      const folders = Array.from(this.folders.values());
      localStorage.setItem('workflow-folders', JSON.stringify(folders));
    } catch (error) {
      logger.error('Failed to save folders:', error);
    }
  }

  /**
   * Export folders for backup or migration
   */
  exportFolders(): string {
    const folders = Array.from(this.folders.values());
    return JSON.stringify(folders, null, 2);
  }

  /**
   * Import folders from backup
   */
  importFolders(json: string): void {
    try {
      const folders = JSON.parse(json) as Folder[];
      this.folders = new Map(folders.map((f) => [f.id, f]));
      this.saveFolders();
      logger.info(`Imported ${this.folders.size} folders`);
    } catch (error) {
      logger.error('Failed to import folders:', error);
      throw new OrganizationError(
        'Failed to import folders',
        'INVALID_OPERATION',
        { error }
      );
    }
  }

  /**
   * Clear all folders (for testing)
   */
  clearAll(): void {
    this.folders.clear();
    this.saveFolders();
  }
}

// Singleton instance
export const folderService = new FolderService();
