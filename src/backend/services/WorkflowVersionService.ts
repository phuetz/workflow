/**
 * Workflow Version Service
 * Provides real Git-like versioning backed by Prisma WorkflowVersion model.
 * Supports: commits, branches, diffs, rollback, tags.
 */

import { prisma } from '../database/prisma';
import { Prisma } from '@prisma/client';
import { logger } from '../../services/SimpleLogger';
import * as crypto from 'crypto';

interface VersionDiff {
  nodesAdded: string[];
  nodesRemoved: string[];
  nodesModified: string[];
  edgesAdded: string[];
  edgesRemoved: string[];
  summary: string;
}

export class WorkflowVersionService {
  /**
   * Create a new version (commit) for a workflow on a given branch.
   */
  async commit(
    workflowId: string,
    branch: string,
    message: string,
    userId: string
  ): Promise<{ id: string; version: number; branch: string }> {
    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);

    // Get latest version number on this branch
    const latest = await prisma.workflowVersion.findFirst({
      where: { workflowId, branch },
      orderBy: { version: 'desc' },
      select: { version: true, nodes: true, edges: true },
    });

    const nextVersion = (latest?.version || 0) + 1;
    const nodes = workflow.nodes as Prisma.InputJsonValue;
    const edges = workflow.edges as Prisma.InputJsonValue;

    // Calculate checksum
    const content = JSON.stringify({ nodes, edges });
    const checksum = crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);

    // Calculate delta from previous version
    let delta: string | null = null;
    if (latest) {
      const diff = this.calculateDiff(
        latest.nodes as any[] || [],
        latest.edges as any[] || [],
        workflow.nodes as any[] || [],
        workflow.edges as any[] || []
      );
      delta = JSON.stringify(diff);
    }

    const version = await prisma.workflowVersion.create({
      data: {
        workflowId,
        version: nextVersion,
        branch,
        commitMessage: message,
        nodes,
        edges,
        variables: (workflow.variables || {}) as Prisma.InputJsonValue,
        settings: (workflow.settings || {}) as Prisma.InputJsonValue,
        metadata: {} as Prisma.InputJsonValue,
        delta,
        size: content.length,
        checksum,
        tags: [],
        parentVersion: latest?.version || null,
        baseBranch: branch === 'main' ? null : 'main',
        createdBy: userId,
      },
    });

    logger.info('Workflow version created', { workflowId, branch, version: nextVersion, checksum });

    return { id: version.id, version: nextVersion, branch };
  }

  /**
   * List all versions for a workflow, optionally filtered by branch.
   */
  async listVersions(workflowId: string, branch?: string, limit = 50) {
    const where: Prisma.WorkflowVersionWhereInput = { workflowId };
    if (branch) where.branch = branch;

    return prisma.workflowVersion.findMany({
      where,
      orderBy: { version: 'desc' },
      take: limit,
      select: {
        id: true,
        version: true,
        branch: true,
        commitMessage: true,
        checksum: true,
        size: true,
        tags: true,
        createdAt: true,
        createdBy: true,
        parentVersion: true,
      },
    });
  }

  /**
   * List all branches for a workflow.
   */
  async listBranches(workflowId: string) {
    const branches = await prisma.workflowVersion.findMany({
      where: { workflowId },
      distinct: ['branch'],
      select: { branch: true },
    });

    const result = [];
    for (const { branch } of branches) {
      const latest = await prisma.workflowVersion.findFirst({
        where: { workflowId, branch },
        orderBy: { version: 'desc' },
        select: { version: true, commitMessage: true, createdAt: true, createdBy: true },
      });
      result.push({
        name: branch,
        latestVersion: latest?.version || 0,
        lastCommit: latest?.commitMessage || '',
        updatedAt: latest?.createdAt,
        updatedBy: latest?.createdBy,
      });
    }

    return result;
  }

  /**
   * Create a new branch from an existing branch at a specific version.
   */
  async createBranch(workflowId: string, newBranch: string, fromBranch: string, userId: string) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_\-\/]*$/.test(newBranch)) {
      throw new Error('Invalid branch name');
    }

    // Check if branch already exists
    const existing = await prisma.workflowVersion.findFirst({
      where: { workflowId, branch: newBranch },
    });
    if (existing) throw new Error(`Branch "${newBranch}" already exists`);

    // Get latest version on source branch
    const sourceVersion = await prisma.workflowVersion.findFirst({
      where: { workflowId, branch: fromBranch },
      orderBy: { version: 'desc' },
    });

    if (!sourceVersion) throw new Error(`Source branch "${fromBranch}" not found`);

    // Create first version on new branch (copy from source)
    const version = await prisma.workflowVersion.create({
      data: {
        workflowId,
        version: 1,
        branch: newBranch,
        commitMessage: `Branch created from ${fromBranch} v${sourceVersion.version}`,
        nodes: sourceVersion.nodes as Prisma.InputJsonValue,
        edges: sourceVersion.edges as Prisma.InputJsonValue,
        variables: sourceVersion.variables as Prisma.InputJsonValue,
        settings: sourceVersion.settings as Prisma.InputJsonValue,
        metadata: {} as Prisma.InputJsonValue,
        size: sourceVersion.size,
        checksum: sourceVersion.checksum,
        tags: [],
        baseBranch: fromBranch,
        createdBy: userId,
      },
    });

    logger.info('Branch created', { workflowId, branch: newBranch, fromBranch });
    return { branch: newBranch, version: version.id };
  }

  /**
   * Get diff between two versions.
   */
  async getDiff(workflowId: string, fromVersion: number, toVersion: number, branch = 'main'): Promise<VersionDiff> {
    const from = await prisma.workflowVersion.findFirst({
      where: { workflowId, branch, version: fromVersion },
    });
    const to = await prisma.workflowVersion.findFirst({
      where: { workflowId, branch, version: toVersion },
    });

    if (!from || !to) throw new Error('Version not found');

    return this.calculateDiff(
      from.nodes as any[] || [],
      from.edges as any[] || [],
      to.nodes as any[] || [],
      to.edges as any[] || []
    );
  }

  /**
   * Rollback a workflow to a specific version.
   */
  async rollback(workflowId: string, targetVersion: number, branch: string, userId: string) {
    const version = await prisma.workflowVersion.findFirst({
      where: { workflowId, branch, version: targetVersion },
    });

    if (!version) throw new Error(`Version ${targetVersion} not found on branch ${branch}`);

    // Update the workflow to the old version's content
    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        nodes: version.nodes as Prisma.InputJsonValue,
        edges: version.edges as Prisma.InputJsonValue,
        variables: version.variables as Prisma.InputJsonValue,
        settings: version.settings as Prisma.InputJsonValue,
      },
    });

    // Create a new commit recording the rollback
    const result = await this.commit(workflowId, branch, `Rollback to v${targetVersion}`, userId);

    logger.info('Workflow rolled back', { workflowId, targetVersion, newVersion: result.version });
    return result;
  }

  /**
   * Tag a specific version.
   */
  async tag(workflowId: string, version: number, branch: string, tag: string) {
    const v = await prisma.workflowVersion.findFirst({
      where: { workflowId, branch, version },
    });
    if (!v) throw new Error('Version not found');

    await prisma.workflowVersion.update({
      where: { id: v.id },
      data: { tags: [...v.tags, tag] },
    });

    return { version, tag };
  }

  /**
   * Merge a branch into another.
   */
  async merge(workflowId: string, sourceBranch: string, targetBranch: string, userId: string) {
    const sourceLatest = await prisma.workflowVersion.findFirst({
      where: { workflowId, branch: sourceBranch },
      orderBy: { version: 'desc' },
    });

    if (!sourceLatest) throw new Error(`Source branch "${sourceBranch}" not found`);

    // Apply source's content to target workflow
    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        nodes: sourceLatest.nodes as Prisma.InputJsonValue,
        edges: sourceLatest.edges as Prisma.InputJsonValue,
        variables: sourceLatest.variables as Prisma.InputJsonValue,
        settings: sourceLatest.settings as Prisma.InputJsonValue,
      },
    });

    // Create merge commit on target branch
    const result = await this.commit(
      workflowId,
      targetBranch,
      `Merge ${sourceBranch} into ${targetBranch}`,
      userId
    );

    // Update merge metadata
    await prisma.workflowVersion.update({
      where: { id: result.id },
      data: {
        mergeInfo: {
          sourceBranch,
          sourceVersion: sourceLatest.version,
          targetBranch,
        } as Prisma.InputJsonValue,
      },
    });

    logger.info('Branch merged', { workflowId, sourceBranch, targetBranch });
    return result;
  }

  private calculateDiff(
    oldNodes: any[],
    oldEdges: any[],
    newNodes: any[],
    newEdges: any[]
  ): VersionDiff {
    const oldNodeIds = new Set((oldNodes || []).map((n: any) => n.id));
    const newNodeIds = new Set((newNodes || []).map((n: any) => n.id));
    const oldEdgeIds = new Set((oldEdges || []).map((e: any) => e.id));
    const newEdgeIds = new Set((newEdges || []).map((e: any) => e.id));

    const nodesAdded = [...newNodeIds].filter(id => !oldNodeIds.has(id));
    const nodesRemoved = [...oldNodeIds].filter(id => !newNodeIds.has(id));

    // Modified = in both but different
    const nodesModified: string[] = [];
    for (const id of newNodeIds) {
      if (oldNodeIds.has(id)) {
        const oldNode = (oldNodes || []).find((n: any) => n.id === id);
        const newNode = (newNodes || []).find((n: any) => n.id === id);
        if (JSON.stringify(oldNode) !== JSON.stringify(newNode)) {
          nodesModified.push(id);
        }
      }
    }

    const edgesAdded = [...newEdgeIds].filter(id => !oldEdgeIds.has(id));
    const edgesRemoved = [...oldEdgeIds].filter(id => !newEdgeIds.has(id));

    const changes = nodesAdded.length + nodesRemoved.length + nodesModified.length + edgesAdded.length + edgesRemoved.length;
    const summary = `${changes} change(s): +${nodesAdded.length} nodes, -${nodesRemoved.length} nodes, ~${nodesModified.length} modified, +${edgesAdded.length}/-${edgesRemoved.length} edges`;

    return { nodesAdded, nodesRemoved, nodesModified, edgesAdded, edgesRemoved, summary };
  }
}

export const workflowVersionService = new WorkflowVersionService();
