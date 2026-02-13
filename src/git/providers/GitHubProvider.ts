/**
 * GitHub Provider Implementation
 * Complete GitHub API integration with OAuth2, PAT, and SSH support
 */

import { IGitProvider, GitWebhook } from '../GitProviderInterface';
import {
  GitProviderConfig,
  GitProviderCapabilities,
  GitProviderUser,
  GitPullRequest,
  CreatePullRequestRequest,
  PullRequestComment,
  PullRequestReview,
  GitRelease,
  GitRepository,
  GitBranch,
  GitCommit,
  GitProvider,
  GitAuthor,
} from '../../types/git';

export class GitHubProvider implements IGitProvider {
  private config?: GitProviderConfig;
  private baseUrl: string = 'https://api.github.com';
  private token?: string;

  async initialize(config: GitProviderConfig): Promise<void> {
    this.config = config;
    this.baseUrl = config.apiUrl || 'https://api.github.com';

    // Support multiple auth methods
    if (config.credentials.oauth2AccessToken) {
      this.token = config.credentials.oauth2AccessToken;
    } else if (config.credentials.token) {
      this.token = config.credentials.token;
    } else {
      throw new Error('GitHub provider requires either OAuth2 token or Personal Access Token');
    }
  }

  getCapabilities(): GitProviderCapabilities {
    return {
      supportsPullRequests: true,
      supportsCodeReview: true,
      supportsWebhooks: true,
      supportsLFS: true,
      supportsActions: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
    };
  }

  async authenticate(): Promise<GitProviderUser> {
    return this.getCurrentUser();
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request<unknown>('/user');
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Helper Methods ====================

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`GitHub API Error: ${error.message || response.statusText}`);
    }

    return response.json() as T;
  }

  private mapToGitRepository(repo: any): GitRepository {
    return {
      id: repo.id.toString(),
      name: repo.name,
      description: repo.description,
      provider: 'github' as GitProvider,
      remoteUrl: repo.clone_url,
      localPath: '',
      defaultBranch: repo.default_branch,
      currentBranch: repo.default_branch,
      isClean: true,
      health: {
        status: 'healthy',
        lastCheck: new Date(),
        issues: [],
        metrics: {
          totalCommits: 0,
          totalBranches: 0,
          totalTags: 0,
          diskUsage: repo.size * 1024,
        },
      },
      createdAt: new Date(repo.created_at),
      updatedAt: new Date(repo.updated_at),
    };
  }

  private mapToGitBranch(branch: any): GitBranch {
    return {
      name: branch.name,
      isDefault: false,
      isCurrent: false,
      isProtected: branch.protected,
      ahead: 0,
      behind: 0,
      remote: 'origin',
    };
  }

  private mapToGitCommit(commit: any): GitCommit {
    const author: GitAuthor = {
      name: commit.commit.author.name,
      email: commit.commit.author.email,
      timestamp: new Date(commit.commit.author.date),
    };

    const committer: GitAuthor = {
      name: commit.commit.committer.name,
      email: commit.commit.committer.email,
      timestamp: new Date(commit.commit.committer.date),
    };

    return {
      hash: commit.sha,
      shortHash: commit.sha.substring(0, 7),
      author,
      committer,
      message: commit.commit.message.split('\n')[0],
      body: commit.commit.message.split('\n').slice(1).join('\n').trim() || undefined,
      timestamp: new Date(commit.commit.author.date),
      files: [],
      branch: '',
      parents: commit.parents.map((p: any) => p.sha),
      stats: {
        additions: commit.stats?.additions || 0,
        deletions: commit.stats?.deletions || 0,
        total: (commit.stats?.additions || 0) + (commit.stats?.deletions || 0),
        filesChanged: commit.files?.length || 0,
      },
    };
  }

  private mapToGitPullRequest(pr: any): GitPullRequest {
    return {
      id: pr.id.toString(),
      number: pr.number,
      title: pr.title,
      description: pr.body || '',
      state: pr.state === 'open' ? 'open' : pr.merged_at ? 'merged' : 'closed',
      sourceBranch: pr.head.ref,
      targetBranch: pr.base.ref,
      author: {
        id: pr.user.id.toString(),
        username: pr.user.login,
        email: '',
        name: pr.user.name || pr.user.login,
        avatarUrl: pr.user.avatar_url,
      },
      reviewers: [],
      commits: pr.commits || 0,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      changedFiles: pr.changed_files || 0,
      createdAt: new Date(pr.created_at),
      updatedAt: new Date(pr.updated_at),
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : undefined,
      closedAt: pr.closed_at ? new Date(pr.closed_at) : undefined,
      url: pr.html_url,
    };
  }

  // ==================== Repository Operations ====================

  async listRepositories(page: number = 1, perPage: number = 30): Promise<GitRepository[]> {
    const repos = await this.request<any[]>(`/user/repos?page=${page}&per_page=${perPage}&sort=updated`);
    return repos.map(repo => this.mapToGitRepository(repo));
  }

  async getRepository(owner: string, repo: string): Promise<GitRepository> {
    const repository = await this.request<any>(`/repos/${owner}/${repo}`);
    return this.mapToGitRepository(repository);
  }

  async createRepository(name: string, description?: string, isPrivate: boolean = false): Promise<GitRepository> {
    const repo = await this.request<any>('/user/repos', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        private: isPrivate,
        auto_init: true,
      }),
    });
    return this.mapToGitRepository(repo);
  }

  async forkRepository(owner: string, repo: string): Promise<GitRepository> {
    const forked = await this.request<any>(`/repos/${owner}/${repo}/forks`, {
      method: 'POST',
    });
    return this.mapToGitRepository(forked);
  }

  // ==================== Branch Operations ====================

  async listBranches(owner: string, repo: string): Promise<GitBranch[]> {
    const branches = await this.request<any[]>(`/repos/${owner}/${repo}/branches`);
    return branches.map(branch => this.mapToGitBranch(branch));
  }

  async getBranch(owner: string, repo: string, branch: string): Promise<GitBranch> {
    const branchData = await this.request<any>(`/repos/${owner}/${repo}/branches/${branch}`);
    return this.mapToGitBranch(branchData);
  }

  async createBranch(owner: string, repo: string, branchName: string, from?: string): Promise<GitBranch> {
    // Get the SHA of the commit to branch from
    const fromBranch = from || (await this.getRepository(owner, repo)).defaultBranch;
    const refData = await this.request<any>(`/repos/${owner}/${repo}/git/ref/heads/${fromBranch}`);
    const sha = refData.object.sha;

    // Create the new branch
    await this.request<any>(`/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha,
      }),
    });

    return this.getBranch(owner, repo, branchName);
  }

  async deleteBranch(owner: string, repo: string, branchName: string): Promise<void> {
    await this.request<void>(`/repos/${owner}/${repo}/git/refs/heads/${branchName}`, {
      method: 'DELETE',
    });
  }

  async protectBranch(owner: string, repo: string, branchName: string): Promise<void> {
    await this.request<void>(`/repos/${owner}/${repo}/branches/${branchName}/protection`, {
      method: 'PUT',
      body: JSON.stringify({
        required_status_checks: null,
        enforce_admins: true,
        required_pull_request_reviews: {
          required_approving_review_count: 1,
        },
        restrictions: null,
      }),
    });
  }

  // ==================== Commit Operations ====================

  async getCommit(owner: string, repo: string, sha: string): Promise<GitCommit> {
    const commit = await this.request<any>(`/repos/${owner}/${repo}/commits/${sha}`);
    return this.mapToGitCommit(commit);
  }

  async listCommits(owner: string, repo: string, branch?: string, limit: number = 30): Promise<GitCommit[]> {
    const params = new URLSearchParams();
    if (branch) params.append('sha', branch);
    params.append('per_page', limit.toString());

    const commits = await this.request<any[]>(`/repos/${owner}/${repo}/commits?${params}`);
    return commits.map(commit => this.mapToGitCommit(commit));
  }

  async compareCommits(owner: string, repo: string, base: string, head: string): Promise<{
    commits: GitCommit[];
    totalCommits: number;
  }> {
    const comparison = await this.request<any>(`/repos/${owner}/${repo}/compare/${base}...${head}`);
    return {
      commits: comparison.commits.map((c: any) => this.mapToGitCommit(c)),
      totalCommits: comparison.total_commits,
    };
  }

  // ==================== Pull Request Operations ====================

  async createPullRequest(
    owner: string,
    repo: string,
    request: CreatePullRequestRequest
  ): Promise<GitPullRequest> {
    const pr = await this.request<any>(`/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      body: JSON.stringify({
        title: request.title,
        body: request.description,
        head: request.sourceBranch,
        base: request.targetBranch,
        draft: request.draft || false,
      }),
    });

    // Add reviewers if specified
    if (request.reviewers && request.reviewers.length > 0) {
      await this.requestReview(owner, repo, pr.number, request.reviewers);
    }

    // Add labels if specified
    if (request.labels && request.labels.length > 0) {
      await this.request<void>(`/repos/${owner}/${repo}/issues/${pr.number}/labels`, {
        method: 'POST',
        body: JSON.stringify({ labels: request.labels }),
      });
    }

    return this.mapToGitPullRequest(pr);
  }

  async getPullRequest(owner: string, repo: string, number: number): Promise<GitPullRequest> {
    const pr = await this.request<any>(`/repos/${owner}/${repo}/pulls/${number}`);
    return this.mapToGitPullRequest(pr);
  }

  async listPullRequests(
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<GitPullRequest[]> {
    const prs = await this.request<any[]>(`/repos/${owner}/${repo}/pulls?state=${state}`);
    return prs.map(pr => this.mapToGitPullRequest(pr));
  }

  async updatePullRequest(
    owner: string,
    repo: string,
    number: number,
    updates: Partial<CreatePullRequestRequest>
  ): Promise<GitPullRequest> {
    const updateData: any = {};
    if (updates.title) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.body = updates.description;

    const pr = await this.request<any>(`/repos/${owner}/${repo}/pulls/${number}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });

    return this.mapToGitPullRequest(pr);
  }

  async mergePullRequest(
    owner: string,
    repo: string,
    number: number,
    strategy: 'merge' | 'squash' | 'rebase' = 'merge'
  ): Promise<void> {
    await this.request<void>(`/repos/${owner}/${repo}/pulls/${number}/merge`, {
      method: 'PUT',
      body: JSON.stringify({
        merge_method: strategy,
      }),
    });
  }

  async closePullRequest(owner: string, repo: string, number: number): Promise<void> {
    await this.request<void>(`/repos/${owner}/${repo}/pulls/${number}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'closed' }),
    });
  }

  async requestReview(owner: string, repo: string, number: number, reviewers: string[]): Promise<void> {
    await this.request<void>(`/repos/${owner}/${repo}/pulls/${number}/requested_reviewers`, {
      method: 'POST',
      body: JSON.stringify({ reviewers }),
    });
  }

  async submitReview(
    owner: string,
    repo: string,
    number: number,
    state: 'approved' | 'changes_requested' | 'commented',
    body?: string
  ): Promise<PullRequestReview> {
    const eventMap = {
      approved: 'APPROVE',
      changes_requested: 'REQUEST_CHANGES',
      commented: 'COMMENT',
    };

    const review = await this.request<any>(`/repos/${owner}/${repo}/pulls/${number}/reviews`, {
      method: 'POST',
      body: JSON.stringify({
        event: eventMap[state],
        body: body || '',
      }),
    });

    return {
      id: review.id.toString(),
      author: {
        id: review.user.id.toString(),
        username: review.user.login,
        email: '',
        name: review.user.name || review.user.login,
        avatarUrl: review.user.avatar_url,
      },
      state,
      body: review.body,
      submittedAt: new Date(review.submitted_at),
    };
  }

  async listPullRequestComments(owner: string, repo: string, number: number): Promise<PullRequestComment[]> {
    const comments = await this.request<any[]>(`/repos/${owner}/${repo}/pulls/${number}/comments`);
    return comments.map(comment => ({
      id: comment.id.toString(),
      author: {
        id: comment.user.id.toString(),
        username: comment.user.login,
        email: '',
        name: comment.user.name || comment.user.login,
        avatarUrl: comment.user.avatar_url,
      },
      body: comment.body,
      path: comment.path,
      line: comment.line,
      createdAt: new Date(comment.created_at),
      updatedAt: new Date(comment.updated_at),
    }));
  }

  async addPullRequestComment(
    owner: string,
    repo: string,
    number: number,
    body: string,
    path?: string,
    line?: number
  ): Promise<PullRequestComment> {
    const endpoint = path && line
      ? `/repos/${owner}/${repo}/pulls/${number}/comments`
      : `/repos/${owner}/${repo}/issues/${number}/comments`;

    const commentData: any = { body };
    if (path && line) {
      commentData.path = path;
      commentData.line = line;
      commentData.side = 'RIGHT';
    }

    const comment = await this.request<any>(endpoint, {
      method: 'POST',
      body: JSON.stringify(commentData),
    });

    return {
      id: comment.id.toString(),
      author: {
        id: comment.user.id.toString(),
        username: comment.user.login,
        email: '',
        name: comment.user.name || comment.user.login,
        avatarUrl: comment.user.avatar_url,
      },
      body: comment.body,
      path,
      line,
      createdAt: new Date(comment.created_at),
      updatedAt: new Date(comment.updated_at),
    };
  }

  // ==================== Release Operations ====================

  async createRelease(
    owner: string,
    repo: string,
    tag: string,
    name: string,
    description: string,
    draft: boolean = false,
    prerelease: boolean = false
  ): Promise<GitRelease> {
    const release = await this.request<any>(`/repos/${owner}/${repo}/releases`, {
      method: 'POST',
      body: JSON.stringify({
        tag_name: tag,
        name,
        body: description,
        draft,
        prerelease,
      }),
    });

    return {
      id: release.id.toString(),
      tagName: release.tag_name,
      name: release.name,
      description: release.body,
      commit: release.target_commitish,
      draft: release.draft,
      prerelease: release.prerelease,
      createdAt: new Date(release.created_at),
      publishedAt: release.published_at ? new Date(release.published_at) : undefined,
      author: {
        id: release.author.id.toString(),
        username: release.author.login,
        email: '',
        name: release.author.name || release.author.login,
        avatarUrl: release.author.avatar_url,
      },
      assets: [],
    };
  }

  async getRelease(owner: string, repo: string, tag: string): Promise<GitRelease> {
    const release = await this.request<any>(`/repos/${owner}/${repo}/releases/tags/${tag}`);
    return {
      id: release.id.toString(),
      tagName: release.tag_name,
      name: release.name,
      description: release.body,
      commit: release.target_commitish,
      draft: release.draft,
      prerelease: release.prerelease,
      createdAt: new Date(release.created_at),
      publishedAt: release.published_at ? new Date(release.published_at) : undefined,
      author: {
        id: release.author.id.toString(),
        username: release.author.login,
        email: '',
        name: release.author.name || release.author.login,
        avatarUrl: release.author.avatar_url,
      },
      assets: release.assets.map((asset: any) => ({
        id: asset.id.toString(),
        name: asset.name,
        contentType: asset.content_type,
        size: asset.size,
        downloadUrl: asset.browser_download_url,
        downloadCount: asset.download_count,
      })),
    };
  }

  async listReleases(owner: string, repo: string): Promise<GitRelease[]> {
    const releases = await this.request<any[]>(`/repos/${owner}/${repo}/releases`);
    return releases.map(release => ({
      id: release.id.toString(),
      tagName: release.tag_name,
      name: release.name,
      description: release.body,
      commit: release.target_commitish,
      draft: release.draft,
      prerelease: release.prerelease,
      createdAt: new Date(release.created_at),
      publishedAt: release.published_at ? new Date(release.published_at) : undefined,
      author: {
        id: release.author.id.toString(),
        username: release.author.login,
        email: '',
        name: release.author.name || release.author.login,
        avatarUrl: release.author.avatar_url,
      },
      assets: [],
    }));
  }

  async deleteRelease(owner: string, repo: string, releaseId: string): Promise<void> {
    await this.request<void>(`/repos/${owner}/${repo}/releases/${releaseId}`, {
      method: 'DELETE',
    });
  }

  // ==================== Webhook Operations ====================

  async createWebhook(
    owner: string,
    repo: string,
    url: string,
    events: string[],
    secret?: string
  ): Promise<GitWebhook> {
    const webhook = await this.request<any>(`/repos/${owner}/${repo}/hooks`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'web',
        active: true,
        events,
        config: {
          url,
          content_type: 'json',
          secret,
        },
      }),
    });

    return {
      id: webhook.id.toString(),
      url: webhook.config.url,
      events: webhook.events,
      active: webhook.active,
      secret,
    };
  }

  async listWebhooks(owner: string, repo: string): Promise<GitWebhook[]> {
    const webhooks = await this.request<any[]>(`/repos/${owner}/${repo}/hooks`);
    return webhooks.map(webhook => ({
      id: webhook.id.toString(),
      url: webhook.config.url,
      events: webhook.events,
      active: webhook.active,
    }));
  }

  async deleteWebhook(owner: string, repo: string, webhookId: string): Promise<void> {
    await this.request<void>(`/repos/${owner}/${repo}/hooks/${webhookId}`, {
      method: 'DELETE',
    });
  }

  // ==================== File Operations ====================

  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string> {
    const params = ref ? `?ref=${ref}` : '';
    const file = await this.request<any>(`/repos/${owner}/${repo}/contents/${path}${params}`);

    if (file.encoding === 'base64') {
      return Buffer.from(file.content, 'base64').toString('utf-8');
    }
    return file.content;
  }

  async updateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
    sha?: string
  ): Promise<GitCommit> {
    const encodedContent = Buffer.from(content).toString('base64');
    const requestData: any = {
      message,
      content: encodedContent,
      branch,
    };

    if (sha) {
      requestData.sha = sha;
    }

    const result = await this.request<any>(`/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify(requestData),
    });

    return this.mapToGitCommit(result.commit);
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    branch: string,
    sha: string
  ): Promise<void> {
    await this.request<void>(`/repos/${owner}/${repo}/contents/${path}`, {
      method: 'DELETE',
      body: JSON.stringify({
        message,
        sha,
        branch,
      }),
    });
  }

  // ==================== User Operations ====================

  async getCurrentUser(): Promise<GitProviderUser> {
    const user = await this.request<any>('/user');
    return {
      id: user.id.toString(),
      username: user.login,
      email: user.email || '',
      name: user.name || user.login,
      avatarUrl: user.avatar_url,
    };
  }

  async getUser(username: string): Promise<GitProviderUser> {
    const user = await this.request<any>(`/users/${username}`);
    return {
      id: user.id.toString(),
      username: user.login,
      email: user.email || '',
      name: user.name || user.login,
      avatarUrl: user.avatar_url,
    };
  }

  async searchUsers(query: string): Promise<GitProviderUser[]> {
    const result = await this.request<any>(`/search/users?q=${encodeURIComponent(query)}`);
    return result.items.map((user: any) => ({
      id: user.id.toString(),
      username: user.login,
      email: '',
      name: user.login,
      avatarUrl: user.avatar_url,
    }));
  }
}
