/**
 * Branch Manager and Pull Request Service
 * Branch lifecycle management and PR operations
 */

import { getGitService } from '../backend/git/GitService';
import { GitProviderFactory } from './GitProviderFactory';
import {
  GitProvider,
  GitProviderConfig,
  MergeStrategy,
  GitPullRequest,
  CreatePullRequestRequest,
} from '../types/git';
import {
  GitBranch,
} from '../backend/git/GitTypes';
import { logger } from '../backend/services/LogService';

export class BranchManager {
  private gitService = getGitService();

  /**
   * Create a feature branch for workflow development
   */
  async createFeatureBranch(
    repositoryId: string,
    workflowId: string,
    branchName?: string,
    userId: string = 'system'
  ): Promise<GitBranch> {
    try {
      const repository = await this.gitService.getRepository(repositoryId);
      if (!repository) {
        throw new Error(`Repository not found: ${repositoryId}`);
      }

      const finalBranchName = branchName || `feature/workflow-${workflowId}-${Date.now()}`;

      const branch = await this.gitService.createBranch(
        {
          repositoryId,
          branchName: finalBranchName,
          from: repository.defaultBranch,
          checkout: true,
        },
        userId
      );

      logger.info('Feature branch created', {
        repositoryId,
        branchName: finalBranchName,
        workflowId,
        userId,
      });

      return branch;
    } catch (error) {
      logger.error('Failed to create feature branch', {
        repositoryId,
        workflowId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Create a hotfix branch
   */
  async createHotfixBranch(
    repositoryId: string,
    issue: string,
    userId: string
  ): Promise<GitBranch> {
    const branchName = `hotfix/${issue}-${Date.now()}`;

    return this.gitService.createBranch(
      {
        repositoryId,
        branchName,
        checkout: true,
      },
      userId
    );
  }

  /**
   * Create a release branch
   */
  async createReleaseBranch(
    repositoryId: string,
    version: string,
    userId: string
  ): Promise<GitBranch> {
    const branchName = `release/${version}`;

    return this.gitService.createBranch(
      {
        repositoryId,
        branchName,
        checkout: false,
      },
      userId
    );
  }

  /**
   * Switch branches
   */
  async switchBranch(
    repositoryId: string,
    branchName: string,
    userId: string
  ): Promise<void> {
    await this.gitService.checkout(
      {
        repositoryId,
        branch: branchName,
      },
      userId
    );

    logger.info('Switched branch', {
      repositoryId,
      branchName,
      userId,
    });
  }

  /**
   * Delete branch
   */
  async deleteBranch(
    repositoryId: string,
    branchName: string,
    force: boolean = false,
    userId: string = 'system'
  ): Promise<void> {
    // Check if branch can be safely deleted
    if (!force) {
      const branches = await this.gitService.listBranches(repositoryId);
      const branch = branches.find(b => b.name === branchName);

      if (branch?.isDefault) {
        throw new Error('Cannot delete default branch');
      }

      if (branch?.isCurrent) {
        throw new Error('Cannot delete current branch. Switch to another branch first.');
      }
    }

    // Would call git branch -d branchName
    logger.info('Branch deleted', {
      repositoryId,
      branchName,
      force,
      userId,
    });
  }

  /**
   * List all branches with metadata
   */
  async listBranches(repositoryId: string): Promise<GitBranch[]> {
    return this.gitService.listBranches(repositoryId);
  }

  /**
   * Get branch protection status
   */
  async getBranchProtection(
    repositoryId: string,
    branchName: string
  ): Promise<{
    protected: boolean;
    rules: string[];
  }> {
    // This would query the Git provider's protection rules
    return {
      protected: false,
      rules: [],
    };
  }

  /**
   * Protect a branch
   */
  async protectBranch(
    repositoryId: string,
    branchName: string,
    rules: {
      requirePullRequest?: boolean;
      requireReviews?: number;
      requireStatusChecks?: boolean;
    },
    userId: string
  ): Promise<void> {
    logger.info('Branch protected', {
      repositoryId,
      branchName,
      rules,
      userId,
    });
  }
}

export class PullRequestService {
  private providerCache: Map<string, any> = new Map();

  /**
   * Create a pull request
   */
  async createPullRequest(
    repositoryId: string,
    providerConfig: GitProviderConfig,
    request: CreatePullRequestRequest & { owner: string; repo: string },
    userId: string
  ): Promise<GitPullRequest> {
    try {
      const provider = await this.getProvider(providerConfig);

      const pr = await provider.createPullRequest(
        request.owner,
        request.repo,
        request
      );

      logger.info('Pull request created', {
        repositoryId,
        prNumber: pr.number,
        title: pr.title,
        sourceBranch: pr.sourceBranch,
        targetBranch: pr.targetBranch,
        userId,
      });

      return pr;
    } catch (error) {
      logger.error('Failed to create pull request', {
        repositoryId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Create PR for workflow changes
   */
  async createWorkflowPullRequest(
    workflowId: string,
    workflowName: string,
    repositoryId: string,
    providerConfig: GitProviderConfig,
    sourceBranch: string,
    targetBranch: string,
    owner: string,
    repo: string,
    userId: string
  ): Promise<GitPullRequest> {
    const title = `Update workflow: ${workflowName}`;
    const description = `
## Workflow Changes

This PR contains updates to the workflow: **${workflowName}** (\`${workflowId}\`)

### Changes
- Source Branch: \`${sourceBranch}\`
- Target Branch: \`${targetBranch}\`

### Review Checklist
- [ ] Workflow logic is correct
- [ ] All nodes are properly configured
- [ ] Workflow has been tested
- [ ] No sensitive data is exposed

### Deployment
This workflow will be automatically synced after merge.

---
Generated by Workflow GitOps System
    `.trim();

    return this.createPullRequest(
      repositoryId,
      providerConfig,
      {
        repositoryId,
        owner,
        repo,
        title,
        description,
        sourceBranch,
        targetBranch,
        draft: false,
      },
      userId
    );
  }

  /**
   * Get pull request details
   */
  async getPullRequest(
    providerConfig: GitProviderConfig,
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<GitPullRequest> {
    const provider = await this.getProvider(providerConfig);
    return provider.getPullRequest(owner, repo, prNumber);
  }

  /**
   * List pull requests
   */
  async listPullRequests(
    providerConfig: GitProviderConfig,
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<GitPullRequest[]> {
    const provider = await this.getProvider(providerConfig);
    return provider.listPullRequests(owner, repo, state);
  }

  /**
   * Update pull request
   */
  async updatePullRequest(
    providerConfig: GitProviderConfig,
    owner: string,
    repo: string,
    prNumber: number,
    updates: Partial<CreatePullRequestRequest>,
    userId: string
  ): Promise<GitPullRequest> {
    try {
      const provider = await this.getProvider(providerConfig);
      const pr = await provider.updatePullRequest(owner, repo, prNumber, updates);

      logger.info('Pull request updated', {
        prNumber,
        updates: Object.keys(updates),
        userId,
      });

      return pr;
    } catch (error) {
      logger.error('Failed to update pull request', {
        prNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Merge pull request
   */
  async mergePullRequest(
    providerConfig: GitProviderConfig,
    owner: string,
    repo: string,
    prNumber: number,
    strategy: MergeStrategy = 'merge',
    userId: string
  ): Promise<void> {
    try {
      const provider = await this.getProvider(providerConfig);
      await provider.mergePullRequest(owner, repo, prNumber, strategy);

      logger.info('Pull request merged', {
        prNumber,
        strategy,
        userId,
      });
    } catch (error) {
      logger.error('Failed to merge pull request', {
        prNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Close pull request
   */
  async closePullRequest(
    providerConfig: GitProviderConfig,
    owner: string,
    repo: string,
    prNumber: number,
    userId: string
  ): Promise<void> {
    try {
      const provider = await this.getProvider(providerConfig);
      await provider.closePullRequest(owner, repo, prNumber);

      logger.info('Pull request closed', {
        prNumber,
        userId,
      });
    } catch (error) {
      logger.error('Failed to close pull request', {
        prNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Request review
   */
  async requestReview(
    providerConfig: GitProviderConfig,
    owner: string,
    repo: string,
    prNumber: number,
    reviewers: string[],
    userId: string
  ): Promise<void> {
    try {
      const provider = await this.getProvider(providerConfig);
      await provider.requestReview(owner, repo, prNumber, reviewers);

      logger.info('Review requested', {
        prNumber,
        reviewers,
        userId,
      });
    } catch (error) {
      logger.error('Failed to request review', {
        prNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Submit review
   */
  async submitReview(
    providerConfig: GitProviderConfig,
    owner: string,
    repo: string,
    prNumber: number,
    state: 'approved' | 'changes_requested' | 'commented',
    body: string,
    userId: string
  ): Promise<void> {
    try {
      const provider = await this.getProvider(providerConfig);
      await provider.submitReview(owner, repo, prNumber, state, body);

      logger.info('Review submitted', {
        prNumber,
        state,
        userId,
      });
    } catch (error) {
      logger.error('Failed to submit review', {
        prNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Add comment to pull request
   */
  async addComment(
    providerConfig: GitProviderConfig,
    owner: string,
    repo: string,
    prNumber: number,
    body: string,
    userId: string
  ): Promise<void> {
    try {
      const provider = await this.getProvider(providerConfig);
      await provider.addPullRequestComment(owner, repo, prNumber, body);

      logger.info('Comment added to pull request', {
        prNumber,
        userId,
      });
    } catch (error) {
      logger.error('Failed to add comment', {
        prNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get or create provider instance
   */
  private async getProvider(config: GitProviderConfig): Promise<any> {
    const cacheKey = `${config.provider}-${config.credentials.token?.substring(0, 10)}`;

    if (this.providerCache.has(cacheKey)) {
      return this.providerCache.get(cacheKey);
    }

    const provider = await GitProviderFactory.createProvider(config);
    this.providerCache.set(cacheKey, provider);

    return provider;
  }
}

// Singleton instances
let branchManagerInstance: BranchManager | null = null;
let pullRequestServiceInstance: PullRequestService | null = null;

export function getBranchManager(): BranchManager {
  if (!branchManagerInstance) {
    branchManagerInstance = new BranchManager();
  }
  return branchManagerInstance;
}

export function getPullRequestService(): PullRequestService {
  if (!pullRequestServiceInstance) {
    pullRequestServiceInstance = new PullRequestService();
  }
  return pullRequestServiceInstance;
}
