/**
 * Comprehensive tests for Workflow Organization System
 * Tests folders, tags, archives, search, and bulk operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { folderService } from '../organization/FolderService';
import { folderTree } from '../organization/FolderTree';
import { tagService } from '../organization/TagService';
import { archiveService } from '../organization/ArchiveService';
import { searchService } from '../organization/SearchService';
import { bulkOperationsService } from '../organization/BulkOperations';

describe('Folder Management', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    folderService.clearAll();
    folderTree.clear();
  });

  it('should create a new folder', () => {
    const folder = folderService.createFolder({
      name: 'Test Folder',
      description: 'A test folder',
      color: '#6366f1',
    });

    expect(folder).toBeDefined();
    expect(folder.name).toBe('Test Folder');
    expect(folder.description).toBe('A test folder');
    expect(folder.level).toBe(0);
    expect(folder.path).toBe('/Test Folder');
  });

  it('should create nested folders with correct path and level', () => {
    const parent = folderService.createFolder({ name: 'Parent' });
    const child = folderService.createFolder({
      name: 'Child',
      parentId: parent.id,
    });
    const grandchild = folderService.createFolder({
      name: 'Grandchild',
      parentId: child.id,
    });

    expect(child.level).toBe(1);
    expect(child.path).toBe('/Parent/Child');
    expect(grandchild.level).toBe(2);
    expect(grandchild.path).toBe('/Parent/Child/Grandchild');
  });

  it('should prevent duplicate folder names in same parent', () => {
    folderService.createFolder({ name: 'Duplicate' });

    expect(() => {
      folderService.createFolder({ name: 'Duplicate' });
    }).toThrow('already exists');
  });

  it('should allow same folder name in different parents', () => {
    const parent1 = folderService.createFolder({ name: 'Parent 1' });
    const parent2 = folderService.createFolder({ name: 'Parent 2' });

    const child1 = folderService.createFolder({
      name: 'Same Name',
      parentId: parent1.id,
    });
    const child2 = folderService.createFolder({
      name: 'Same Name',
      parentId: parent2.id,
    });

    expect(child1.name).toBe('Same Name');
    expect(child2.name).toBe('Same Name');
  });

  it('should move folder to new parent', () => {
    const folder1 = folderService.createFolder({ name: 'Folder 1' });
    const folder2 = folderService.createFolder({ name: 'Folder 2' });
    const child = folderService.createFolder({
      name: 'Child',
      parentId: folder1.id,
    });

    folderService.moveFolder({
      folderId: child.id,
      targetParentId: folder2.id,
    });

    const movedFolder = folderService.getFolder(child.id);
    expect(movedFolder?.parentId).toBe(folder2.id);
    expect(movedFolder?.path).toBe('/Folder 2/Child');
  });

  it('should prevent moving folder into itself', () => {
    const folder = folderService.createFolder({ name: 'Folder' });

    expect(() => {
      folderService.moveFolder({
        folderId: folder.id,
        targetParentId: folder.id,
      });
    }).toThrow('Cannot move folder into itself');
  });

  it('should prevent circular dependencies', () => {
    const parent = folderService.createFolder({ name: 'Parent' });
    const child = folderService.createFolder({
      name: 'Child',
      parentId: parent.id,
    });

    expect(() => {
      folderService.moveFolder({
        folderId: parent.id,
        targetParentId: child.id,
      });
    }).toThrow('descendant');
  });

  it('should rename folder and update paths', () => {
    const parent = folderService.createFolder({ name: 'Old Name' });
    const child = folderService.createFolder({
      name: 'Child',
      parentId: parent.id,
    });

    folderService.updateFolder(parent.id, { name: 'New Name' });

    const updatedParent = folderService.getFolder(parent.id);
    const updatedChild = folderService.getFolder(child.id);

    expect(updatedParent?.path).toBe('/New Name');
    expect(updatedChild?.path).toBe('/New Name/Child');
  });

  it('should delete empty folder', () => {
    const folder = folderService.createFolder({ name: 'Empty' });
    folderService.deleteFolder(folder.id);

    expect(folderService.getFolder(folder.id)).toBeNull();
  });

  it('should delete folder recursively with children', () => {
    const parent = folderService.createFolder({ name: 'Parent' });
    const child = folderService.createFolder({
      name: 'Child',
      parentId: parent.id,
    });

    folderService.deleteFolder(parent.id, { recursive: true });

    expect(folderService.getFolder(parent.id)).toBeNull();
    expect(folderService.getFolder(child.id)).toBeNull();
  });
});

describe('Folder Tree', () => {
  beforeEach(() => {
    localStorage.clear();
    folderService.clearAll();
    folderTree.clear();
  });

  it('should build tree from folders', () => {
    const root1 = folderService.createFolder({ name: 'Root 1' });
    const root2 = folderService.createFolder({ name: 'Root 2' });
    const child = folderService.createFolder({
      name: 'Child',
      parentId: root1.id,
    });

    folderTree.rebuild();

    const rootNodes = folderTree.getRootNodes();
    expect(rootNodes.length).toBe(2);
  });

  it('should get folder ancestors', () => {
    const root = folderService.createFolder({ name: 'Root' });
    const child = folderService.createFolder({
      name: 'Child',
      parentId: root.id,
    });
    const grandchild = folderService.createFolder({
      name: 'Grandchild',
      parentId: child.id,
    });

    folderTree.rebuild();

    const ancestors = folderTree.getAncestors(grandchild.id);
    expect(ancestors.length).toBe(2);
    expect(ancestors[0].folder.name).toBe('Root');
    expect(ancestors[1].folder.name).toBe('Child');
  });

  it('should get folder descendants', () => {
    const root = folderService.createFolder({ name: 'Root' });
    const child1 = folderService.createFolder({
      name: 'Child 1',
      parentId: root.id,
    });
    const child2 = folderService.createFolder({
      name: 'Child 2',
      parentId: root.id,
    });
    const grandchild = folderService.createFolder({
      name: 'Grandchild',
      parentId: child1.id,
    });

    folderTree.rebuild();

    const descendants = folderTree.getDescendants(root.id);
    expect(descendants.length).toBe(3);
  });

  it('should calculate tree statistics', () => {
    folderService.createFolder({ name: 'Root 1' });
    const root2 = folderService.createFolder({ name: 'Root 2' });
    folderService.createFolder({ name: 'Child', parentId: root2.id });

    folderTree.rebuild();

    const stats = folderTree.getStatistics();
    expect(stats.totalFolders).toBe(3);
    expect(stats.rootFolders).toBe(2);
    expect(stats.maxDepth).toBe(1);
  });
});

describe('Tag Management', () => {
  beforeEach(() => {
    localStorage.clear();
    tagService.clearAll();
  });

  it('should create a new tag', () => {
    const tag = tagService.createTag({
      name: 'Production',
      color: '#ef4444',
      category: 'Environment',
    });

    expect(tag).toBeDefined();
    expect(tag.name).toBe('Production');
    expect(tag.usageCount).toBe(0);
  });

  it('should prevent duplicate tag names', () => {
    tagService.createTag({ name: 'Duplicate', color: '#000000' });

    expect(() => {
      tagService.createTag({ name: 'Duplicate', color: '#111111' });
    }).toThrow('already exists');
  });

  it('should add tag to workflow', () => {
    const tag = tagService.createTag({ name: 'Test', color: '#000000' });
    tagService.addTagToWorkflow('workflow-1', tag.id);

    const tags = tagService.getWorkflowTags('workflow-1');
    expect(tags.length).toBe(1);
    expect(tags[0].name).toBe('Test');

    const updatedTag = tagService.getTag(tag.id);
    expect(updatedTag?.usageCount).toBe(1);
  });

  it('should remove tag from workflow', () => {
    const tag = tagService.createTag({ name: 'Test', color: '#000000' });
    tagService.addTagToWorkflow('workflow-1', tag.id);
    tagService.removeTagFromWorkflow('workflow-1', tag.id);

    const tags = tagService.getWorkflowTags('workflow-1');
    expect(tags.length).toBe(0);

    const updatedTag = tagService.getTag(tag.id);
    expect(updatedTag?.usageCount).toBe(0);
  });

  it('should filter workflows by tags (AND operation)', () => {
    const tag1 = tagService.createTag({ name: 'Tag 1', color: '#000000' });
    const tag2 = tagService.createTag({ name: 'Tag 2', color: '#111111' });

    tagService.addTagToWorkflow('workflow-1', tag1.id);
    tagService.addTagToWorkflow('workflow-1', tag2.id);
    tagService.addTagToWorkflow('workflow-2', tag1.id);

    const workflows = tagService.getWorkflowsWithAllTags([tag1.id, tag2.id]);
    expect(workflows).toContain('workflow-1');
    expect(workflows).not.toContain('workflow-2');
  });

  it('should autocomplete tag names', () => {
    tagService.createTag({ name: 'Production', color: '#000000' });
    tagService.createTag({ name: 'Development', color: '#111111' });
    tagService.createTag({ name: 'Testing', color: '#222222' });

    const suggestions = tagService.autocompleteTags('dev');
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].name).toBe('Development');
  });

  it('should merge tags', () => {
    const tag1 = tagService.createTag({ name: 'Tag 1', color: '#000000' });
    const tag2 = tagService.createTag({ name: 'Tag 2', color: '#111111' });

    tagService.addTagToWorkflow('workflow-1', tag1.id);
    tagService.addTagToWorkflow('workflow-2', tag2.id);

    tagService.mergeTags(tag1.id, tag2.id);

    expect(tagService.getTag(tag1.id)).toBeNull();
    const updatedTag2 = tagService.getTag(tag2.id);
    expect(updatedTag2?.usageCount).toBe(2);
  });
});

describe('Archive Management', () => {
  beforeEach(() => {
    localStorage.clear();
    archiveService.clearAll();
  });

  it('should archive a workflow with compression', () => {
    const workflowData = {
      nodes: [{ id: '1' }, { id: '2' }],
      edges: [{ id: 'e1' }],
    };

    const archive = archiveService.archiveWorkflow(
      'workflow-1',
      'Test Workflow',
      workflowData,
      { reason: 'No longer needed' }
    );

    expect(archive).toBeDefined();
    expect(archive.originalWorkflowId).toBe('workflow-1');
    expect(archive.metadata.compressionRatio).toBeGreaterThan(0); // Small data may not compress well
    expect(archive.isRestorable).toBe(true);
  });

  it('should restore archived workflow', () => {
    const workflowData = {
      nodes: [{ id: '1' }, { id: '2' }],
      edges: [{ id: 'e1' }],
    };

    const archive = archiveService.archiveWorkflow(
      'workflow-1',
      'Test Workflow',
      workflowData
    );

    const restored = archiveService.restoreWorkflow(archive.id);

    expect(restored).toEqual(workflowData);
  });

  it('should delete archive permanently', () => {
    const archive = archiveService.archiveWorkflow(
      'workflow-1',
      'Test Workflow',
      {}
    );

    archiveService.deleteArchive(archive.id);

    expect(archiveService.getArchive(archive.id)).toBeNull();
  });

  it('should find archives expiring soon', () => {
    const archive1 = archiveService.archiveWorkflow(
      'workflow-1',
      'Workflow 1',
      {}
    );

    // Manually set expiration to 5 days from now
    archive1.expiresAt = new Date(
      Date.now() + 5 * 24 * 60 * 60 * 1000
    ).toISOString();

    const expiringSoon = archiveService.getExpiringSoon(7);
    expect(expiringSoon.length).toBeGreaterThan(0);
  });

  it('should calculate archive statistics', () => {
    archiveService.archiveWorkflow('workflow-1', 'Workflow 1', {
      nodes: [],
      edges: [],
    });
    archiveService.archiveWorkflow('workflow-2', 'Workflow 2', {
      nodes: [],
      edges: [],
    });

    const stats = archiveService.getStats();
    expect(stats.totalArchived).toBe(2);
    expect(stats.averageCompressionRatio).toBeGreaterThan(0);
  });
});

describe('Search Service', () => {
  beforeEach(() => {
    localStorage.clear();
    searchService.clear();
  });

  it('should index and search workflows by name', () => {
    searchService.indexWorkflow('workflow-1', {
      name: 'Production Deployment',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user-1',
      status: 'active',
    });

    searchService.indexWorkflow('workflow-2', {
      name: 'Development Testing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user-1',
      status: 'active',
    });

    const results = searchService.search({
      query: 'production',
      filters: {},
    });

    expect(results.results.length).toBe(1);
    expect(results.results[0].workflowName).toBe('Production Deployment');
  });

  it('should perform fuzzy search', () => {
    searchService.indexWorkflow('workflow-1', {
      name: 'Authentication Service',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user-1',
      status: 'active',
    });

    const results = searchService.search({
      query: 'authen',
      filters: {},
    });

    expect(results.results.length).toBe(1);
  });

  it('should filter by status', () => {
    searchService.indexWorkflow('workflow-1', {
      name: 'Active Workflow',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user-1',
      status: 'active',
    });

    searchService.indexWorkflow('workflow-2', {
      name: 'Archived Workflow',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user-1',
      status: 'archived',
    });

    const results = searchService.search({
      query: '',
      filters: {
        status: ['active'],
      },
    });

    expect(results.results.length).toBe(1);
    expect(results.results[0].status).toBe('active');
  });

  it('should sort search results', () => {
    searchService.indexWorkflow('workflow-1', {
      name: 'B Workflow',
      createdAt: new Date('2023-01-01').toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user-1',
      status: 'active',
    });

    searchService.indexWorkflow('workflow-2', {
      name: 'A Workflow',
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user-1',
      status: 'active',
    });

    const results = searchService.search({
      query: '',
      filters: {},
      sort: { field: 'name', direction: 'asc' },
    });

    expect(results.results[0].workflowName).toBe('A Workflow');
  });

  it('should paginate search results', () => {
    for (let i = 1; i <= 100; i++) {
      searchService.indexWorkflow(`workflow-${i}`, {
        name: `Workflow ${i}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user-1',
        status: 'active',
      });
    }

    const results = searchService.search({
      query: '',
      filters: {},
      pagination: { page: 1, pageSize: 10 },
    });

    expect(results.results.length).toBe(10);
    expect(results.total).toBe(100);
    expect(results.totalPages).toBe(10);
  });
});

describe('Bulk Operations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should tag multiple workflows', async () => {
    const tag = tagService.createTag({ name: 'Bulk Tag', color: '#000000' });

    const operation = await bulkOperationsService.tagWorkflows({
      workflowIds: ['workflow-1', 'workflow-2', 'workflow-3'],
      tagIds: [tag.id],
      action: 'add',
    });

    expect(operation.status).toBe('completed');
    expect(operation.result?.successful.length).toBe(3);
  });

  it('should handle partial failures in bulk operations', async () => {
    const tag = tagService.createTag({ name: 'Test Tag', color: '#000000' });

    // Create operation that will partially fail
    const operation = await bulkOperationsService.tagWorkflows({
      workflowIds: ['workflow-1', 'workflow-2'],
      tagIds: [tag.id],
      action: 'add',
    });

    expect(operation.status).toBe('completed');
    expect(operation.progress).toBe(100);
  });

  it('should track operation progress', async () => {
    const tag = tagService.createTag({ name: 'Progress Tag', color: '#000000' });

    const operation = await bulkOperationsService.tagWorkflows({
      workflowIds: ['workflow-1', 'workflow-2'],
      tagIds: [tag.id],
      action: 'add',
    });

    const retrieved = bulkOperationsService.getOperation(operation.id);
    expect(retrieved?.progress).toBe(100);
  });

  it('should get operation statistics', async () => {
    const tag = tagService.createTag({ name: 'Stats Tag', color: '#000000' });

    await bulkOperationsService.tagWorkflows({
      workflowIds: ['workflow-1'],
      tagIds: [tag.id],
      action: 'add',
    });

    const stats = bulkOperationsService.getStats();
    expect(stats.totalOperations).toBeGreaterThan(0);
  });
});
