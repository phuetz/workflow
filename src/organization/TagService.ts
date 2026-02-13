/**
 * TagService - Workflow tagging with autocomplete and management
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Tag,
  WorkflowTag,
  CreateTagParams,
  UpdateTagParams,
  OrganizationError,
} from '../types/organization';
import { logger } from '../services/SimpleLogger';

export class TagService {
  private tags: Map<string, Tag> = new Map();
  private workflowTags: WorkflowTag[] = [];
  private currentUserId: string = 'current-user';

  constructor() {
    this.loadTags();
    this.initializeDefaultTags();
  }

  /**
   * Create a new tag
   */
  createTag(params: CreateTagParams): Tag {
    const { name, color, description, category } = params;

    // Check if tag already exists (case-insensitive)
    const existing = Array.from(this.tags.values()).find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    );

    if (existing) {
      throw new OrganizationError(
        `Tag "${name}" already exists`,
        'TAG_ALREADY_EXISTS'
      );
    }

    const tag: Tag = {
      id: uuidv4(),
      name: name.trim(),
      color,
      description,
      category,
      createdAt: new Date().toISOString(),
      createdBy: this.currentUserId,
      usageCount: 0,
    };

    this.tags.set(tag.id, tag);
    this.saveTags();

    logger.info(`Tag created: ${name} (${tag.id})`);
    return tag;
  }

  /**
   * Get tag by ID
   */
  getTag(tagId: string): Tag | null {
    return this.tags.get(tagId) || null;
  }

  /**
   * Get tag by name (case-insensitive)
   */
  getTagByName(name: string): Tag | null {
    return (
      Array.from(this.tags.values()).find(
        (t) => t.name.toLowerCase() === name.toLowerCase()
      ) || null
    );
  }

  /**
   * Get all tags
   */
  getAllTags(): Tag[] {
    return Array.from(this.tags.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  /**
   * Get tags by category
   */
  getTagsByCategory(category: string): Tag[] {
    return Array.from(this.tags.values())
      .filter((t) => t.category === category)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get popular tags (by usage count)
   */
  getPopularTags(limit: number = 10): Tag[] {
    return Array.from(this.tags.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Update tag
   */
  updateTag(tagId: string, params: UpdateTagParams): Tag {
    const tag = this.tags.get(tagId);
    if (!tag) {
      throw new OrganizationError(`Tag ${tagId} not found`, 'TAG_NOT_FOUND');
    }

    // Check for name conflict if renaming
    if (params.name && params.name !== tag.name) {
      const existing = Array.from(this.tags.values()).find(
        (t) =>
          t.id !== tagId && t.name.toLowerCase() === params.name!.toLowerCase()
      );
      if (existing) {
        throw new OrganizationError(
          `Tag "${params.name}" already exists`,
          'TAG_ALREADY_EXISTS'
        );
      }
    }

    const updatedTag: Tag = {
      ...tag,
      ...params,
    };

    this.tags.set(tagId, updatedTag);
    this.saveTags();

    logger.info(`Tag updated: ${tagId}`, { updates: params });
    return updatedTag;
  }

  /**
   * Delete tag
   */
  deleteTag(tagId: string): void {
    const tag = this.tags.get(tagId);
    if (!tag) {
      throw new OrganizationError(`Tag ${tagId} not found`, 'TAG_NOT_FOUND');
    }

    // Remove from all workflows
    this.workflowTags = this.workflowTags.filter((wt) => wt.tagId !== tagId);

    this.tags.delete(tagId);
    this.saveTags();

    logger.info(`Tag deleted: ${tag.name} (${tagId})`);
  }

  /**
   * Add tag to workflow
   */
  addTagToWorkflow(workflowId: string, tagId: string): void {
    const tag = this.tags.get(tagId);
    if (!tag) {
      throw new OrganizationError(`Tag ${tagId} not found`, 'TAG_NOT_FOUND');
    }

    // Check if already tagged
    const existing = this.workflowTags.find(
      (wt) => wt.workflowId === workflowId && wt.tagId === tagId
    );

    if (!existing) {
      this.workflowTags.push({
        workflowId,
        tagId,
        addedAt: new Date().toISOString(),
        addedBy: this.currentUserId,
      });

      // Update usage count
      tag.usageCount++;
      this.saveTags();
    }
  }

  /**
   * Remove tag from workflow
   */
  removeTagFromWorkflow(workflowId: string, tagId: string): void {
    const index = this.workflowTags.findIndex(
      (wt) => wt.workflowId === workflowId && wt.tagId === tagId
    );

    if (index > -1) {
      this.workflowTags.splice(index, 1);

      // Update usage count
      const tag = this.tags.get(tagId);
      if (tag && tag.usageCount > 0) {
        tag.usageCount--;
      }

      this.saveTags();
    }
  }

  /**
   * Get tags for a workflow
   */
  getWorkflowTags(workflowId: string): Tag[] {
    const tagIds = this.workflowTags
      .filter((wt) => wt.workflowId === workflowId)
      .map((wt) => wt.tagId);

    return tagIds
      .map((id) => this.tags.get(id))
      .filter((tag): tag is Tag => tag !== undefined);
  }

  /**
   * Get workflows with a specific tag
   */
  getWorkflowsWithTag(tagId: string): string[] {
    return this.workflowTags
      .filter((wt) => wt.tagId === tagId)
      .map((wt) => wt.workflowId);
  }

  /**
   * Get workflows with any of the specified tags (OR operation)
   */
  getWorkflowsWithAnyTag(tagIds: string[]): string[] {
    const workflowIds = new Set<string>();
    for (const wt of this.workflowTags) {
      if (tagIds.includes(wt.tagId)) {
        workflowIds.add(wt.workflowId);
      }
    }
    return Array.from(workflowIds);
  }

  /**
   * Get workflows with all of the specified tags (AND operation)
   */
  getWorkflowsWithAllTags(tagIds: string[]): string[] {
    if (tagIds.length === 0) return [];

    const workflowCounts = new Map<string, number>();

    for (const wt of this.workflowTags) {
      if (tagIds.includes(wt.tagId)) {
        workflowCounts.set(
          wt.workflowId,
          (workflowCounts.get(wt.workflowId) || 0) + 1
        );
      }
    }

    return Array.from(workflowCounts.entries())
      .filter(([, count]) => count === tagIds.length)
      .map(([workflowId]) => workflowId);
  }

  /**
   * Get workflows without any of the specified tags (NOT operation)
   */
  getWorkflowsWithoutTags(
    allWorkflowIds: string[],
    tagIds: string[]
  ): string[] {
    const taggedWorkflows = new Set(this.getWorkflowsWithAnyTag(tagIds));
    return allWorkflowIds.filter((id) => !taggedWorkflows.has(id));
  }

  /**
   * Autocomplete tag names
   */
  autocompleteTags(query: string, limit: number = 10): Tag[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.tags.values())
      .filter((tag) => tag.name.toLowerCase().includes(lowerQuery))
      .sort((a, b) => {
        // Prioritize exact prefix matches
        const aStartsWith = a.name.toLowerCase().startsWith(lowerQuery);
        const bStartsWith = b.name.toLowerCase().startsWith(lowerQuery);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        // Then by usage count
        if (a.usageCount !== b.usageCount) {
          return b.usageCount - a.usageCount;
        }

        // Finally alphabetically
        return a.name.localeCompare(b.name);
      })
      .slice(0, limit);
  }

  /**
   * Suggest tags for a workflow based on name and content
   */
  suggestTags(workflowName: string, workflowContent?: string): Tag[] {
    const text = `${workflowName} ${workflowContent || ''}`.toLowerCase();
    const suggestions: Array<{ tag: Tag; score: number }> = [];

    for (const tag of this.tags.values()) {
      const tagName = tag.name.toLowerCase();
      const tagWords = tagName.split(/\s+/);

      let score = 0;

      // Exact name match
      if (text.includes(tagName)) {
        score += 10;
      }

      // Word matches
      for (const word of tagWords) {
        if (text.includes(word)) {
          score += 5;
        }
      }

      // Boost popular tags slightly
      score += Math.min(tag.usageCount / 10, 2);

      if (score > 0) {
        suggestions.push({ tag, score });
      }
    }

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s) => s.tag);
  }

  /**
   * Merge tags (combine two tags into one)
   */
  mergeTags(sourceTagId: string, targetTagId: string): void {
    const sourceTag = this.tags.get(sourceTagId);
    const targetTag = this.tags.get(targetTagId);

    if (!sourceTag || !targetTag) {
      throw new OrganizationError('Source or target tag not found', 'TAG_NOT_FOUND');
    }

    // Move all workflows from source to target
    for (const wt of this.workflowTags) {
      if (wt.tagId === sourceTagId) {
        wt.tagId = targetTagId;
      }
    }

    // Remove duplicates
    const seen = new Set<string>();
    this.workflowTags = this.workflowTags.filter((wt) => {
      const key = `${wt.workflowId}-${wt.tagId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Update usage count
    targetTag.usageCount += sourceTag.usageCount;

    // Delete source tag
    this.tags.delete(sourceTagId);
    this.saveTags();

    logger.info(`Tags merged: ${sourceTag.name} -> ${targetTag.name}`);
  }

  /**
   * Get tag statistics
   */
  getTagStats() {
    return {
      totalTags: this.tags.size,
      totalTaggings: this.workflowTags.length,
      avgTagsPerWorkflow: this.getAvgTagsPerWorkflow(),
      mostUsedTag: this.getMostUsedTag(),
      leastUsedTags: this.getLeastUsedTags(),
    };
  }

  private getAvgTagsPerWorkflow(): number {
    const workflowIds = new Set(this.workflowTags.map((wt) => wt.workflowId));
    if (workflowIds.size === 0) return 0;
    return this.workflowTags.length / workflowIds.size;
  }

  private getMostUsedTag(): Tag | null {
    return (
      Array.from(this.tags.values()).sort(
        (a, b) => b.usageCount - a.usageCount
      )[0] || null
    );
  }

  private getLeastUsedTags(): Tag[] {
    return Array.from(this.tags.values())
      .filter((t) => t.usageCount === 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  private loadTags(): void {
    try {
      const tagsData = localStorage.getItem('workflow-tags');
      const workflowTagsData = localStorage.getItem('workflow-tag-assignments');

      if (tagsData) {
        const tags = JSON.parse(tagsData) as Tag[];
        this.tags = new Map(tags.map((t) => [t.id, t]));
      }

      if (workflowTagsData) {
        this.workflowTags = JSON.parse(workflowTagsData);
      }

      logger.info(
        `Loaded ${this.tags.size} tags and ${this.workflowTags.length} tag assignments`
      );
    } catch (error) {
      logger.error('Failed to load tags:', error);
    }
  }

  private saveTags(): void {
    try {
      const tags = Array.from(this.tags.values());
      localStorage.setItem('workflow-tags', JSON.stringify(tags));
      localStorage.setItem(
        'workflow-tag-assignments',
        JSON.stringify(this.workflowTags)
      );
    } catch (error) {
      logger.error('Failed to save tags:', error);
    }
  }

  private initializeDefaultTags(): void {
    const defaultTags = [
      { name: 'Production', color: '#ef4444', category: 'Environment' },
      { name: 'Development', color: '#3b82f6', category: 'Environment' },
      { name: 'Testing', color: '#f59e0b', category: 'Environment' },
      { name: 'Critical', color: '#dc2626', category: 'Priority' },
      { name: 'Important', color: '#f97316', category: 'Priority' },
      { name: 'Low Priority', color: '#9ca3af', category: 'Priority' },
      { name: 'Marketing', color: '#ec4899', category: 'Department' },
      { name: 'Sales', color: '#10b981', category: 'Department' },
      { name: 'Finance', color: '#8b5cf6', category: 'Department' },
      { name: 'Automated', color: '#06b6d4', category: 'Type' },
      { name: 'Manual', color: '#64748b', category: 'Type' },
    ];

    for (const tagData of defaultTags) {
      if (!this.getTagByName(tagData.name)) {
        try {
          this.createTag(tagData);
        } catch (error) {
          // Tag might already exist
        }
      }
    }
  }

  /**
   * Export tags
   */
  exportTags(): string {
    return JSON.stringify(
      {
        tags: Array.from(this.tags.values()),
        workflowTags: this.workflowTags,
      },
      null,
      2
    );
  }

  /**
   * Import tags
   */
  importTags(json: string): void {
    try {
      const data = JSON.parse(json);
      if (data.tags) {
        this.tags = new Map(data.tags.map((t: Tag) => [t.id, t]));
      }
      if (data.workflowTags) {
        this.workflowTags = data.workflowTags;
      }
      this.saveTags();
      logger.info(
        `Imported ${this.tags.size} tags and ${this.workflowTags.length} assignments`
      );
    } catch (error) {
      logger.error('Failed to import tags:', error);
      throw new OrganizationError(
        'Failed to import tags',
        'INVALID_OPERATION',
        { error }
      );
    }
  }

  /**
   * Clear all tags (for testing)
   */
  clearAll(): void {
    this.tags.clear();
    this.workflowTags = [];
    this.saveTags();
  }
}

// Singleton instance
export const tagService = new TagService();
