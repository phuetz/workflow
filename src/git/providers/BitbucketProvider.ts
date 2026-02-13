/**
 * Bitbucket Provider Implementation
 * Bitbucket Cloud API integration
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
} from '../../types/git';

export class BitbucketProvider implements IGitProvider {
  private config?: GitProviderConfig;
  private baseUrl: string = 'https://api.bitbucket.org/2.0';
  private token?: string;
  private username?: string;

  async initialize(config: GitProviderConfig): Promise<void> {
    this.config = config;
    this.baseUrl = config.apiUrl || 'https://api.bitbucket.org/2.0';
    this.token = config.credentials.token || config.credentials.oauth2AccessToken;
    this.username = config.credentials.username;

    if (!this.token) {
      throw new Error('Bitbucket provider requires access token');
    }
  }

  getCapabilities(): GitProviderCapabilities {
    return {
      supportsPullRequests: true,
      supportsCodeReview: true,
      supportsWebhooks: true,
      supportsLFS: true,
      supportsActions: false,
      maxFileSize: 100 * 1024 * 1024,
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

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      throw new Error(`Bitbucket API Error: ${response.statusText}`);
    }
    return response.json() as T;
  }

  async listRepositories(page: number = 1, perPage: number = 30): Promise<GitRepository[]> {
    const result = await this.request<any>(`/repositories/${this.username}?page=${page}&pagelen=${perPage}`);
    return result.values.map((r: any) => ({
      id: r.uuid,
      name: r.name,
      description: r.description,
      provider: 'bitbucket' as GitProvider,
      remoteUrl: r.links.clone.find((l: any) => l.name === 'https').href,
      localPath: '',
      defaultBranch: r.mainbranch?.name || 'main',
      currentBranch: r.mainbranch?.name || 'main',
      isClean: true,
      health: {
        status: 'healthy' as const,
        lastCheck: new Date(),
        issues: [],
        metrics: {
          totalCommits: 0,
          totalBranches: 0,
          totalTags: 0,
          diskUsage: r.size,
        },
      },
      createdAt: new Date(r.created_on),
      updatedAt: new Date(r.updated_on),
    }));
  }

  async getRepository(owner: string, repo: string): Promise<GitRepository> {
    const r = await this.request<any>(`/repositories/${owner}/${repo}`);
    return {
      id: r.uuid,
      name: r.name,
      description: r.description,
      provider: 'bitbucket',
      remoteUrl: r.links.clone.find((l: any) => l.name === 'https').href,
      localPath: '',
      defaultBranch: r.mainbranch?.name || 'main',
      currentBranch: r.mainbranch?.name || 'main',
      isClean: true,
      health: {
        status: 'healthy',
        lastCheck: new Date(),
        issues: [],
        metrics: {
          totalCommits: 0,
          totalBranches: 0,
          totalTags: 0,
          diskUsage: r.size,
        },
      },
      createdAt: new Date(r.created_on),
      updatedAt: new Date(r.updated_on),
    };
  }

  async createRepository(name: string, description?: string, isPrivate: boolean = false): Promise<GitRepository> {
    const r = await this.request<any>(`/repositories/${this.username}/${name}`, {
      method: 'POST',
      body: JSON.stringify({
        scm: 'git',
        is_private: isPrivate,
        description,
      }),
    });
    return this.getRepository(this.username!, name);
  }

  async forkRepository(owner: string, repo: string): Promise<GitRepository> {
    const r = await this.request<any>(`/repositories/${owner}/${repo}/forks`, {
      method: 'POST',
    });
    return this.getRepository(r.owner.username, r.slug);
  }

  async listBranches(owner: string, repo: string): Promise<GitBranch[]> {
    const result = await this.request<any>(`/repositories/${owner}/${repo}/refs/branches`);
    return result.values.map((b: any) => ({
      name: b.name,
      isDefault: b.default_merge_strategy !== undefined,
      isCurrent: false,
      ahead: 0,
      behind: 0,
    }));
  }

  async getBranch(owner: string, repo: string, branch: string): Promise<GitBranch> {
    const b = await this.request<any>(`/repositories/${owner}/${repo}/refs/branches/${branch}`);
    return {
      name: b.name,
      isDefault: false,
      isCurrent: false,
      ahead: 0,
      behind: 0,
    };
  }

  async createBranch(owner: string, repo: string, branchName: string, from?: string): Promise<GitBranch> {
    throw new Error('Bitbucket API does not support direct branch creation via REST API');
  }

  async deleteBranch(owner: string, repo: string, branchName: string): Promise<void> {
    await this.request<void>(`/repositories/${owner}/${repo}/refs/branches/${branchName}`, {
      method: 'DELETE',
    });
  }

  async protectBranch(owner: string, repo: string, branchName: string): Promise<void> {
    throw new Error('Branch protection in Bitbucket requires repository settings API');
  }

  async getCommit(owner: string, repo: string, sha: string): Promise<GitCommit> {
    const c = await this.request<any>(`/repositories/${owner}/${repo}/commit/${sha}`);
    return {
      hash: c.hash,
      shortHash: c.hash.substring(0, 7),
      author: {
        name: c.author.user?.display_name || c.author.raw,
        email: '',
        timestamp: new Date(c.date),
      },
      committer: {
        name: c.author.user?.display_name || c.author.raw,
        email: '',
        timestamp: new Date(c.date),
      },
      message: c.message.split('\n')[0],
      body: c.message.split('\n').slice(1).join('\n').trim(),
      timestamp: new Date(c.date),
      files: [],
      branch: '',
      parents: c.parents.map((p: any) => p.hash),
      stats: {
        additions: 0,
        deletions: 0,
        total: 0,
        filesChanged: 0,
      },
    };
  }

  async listCommits(owner: string, repo: string, branch?: string, limit: number = 30): Promise<GitCommit[]> {
    const path = branch ? `/${branch}` : '';
    const result = await this.request<any>(`/repositories/${owner}/${repo}/commits${path}?pagelen=${limit}`);
    return result.values.map((c: any) => ({
      hash: c.hash,
      shortHash: c.hash.substring(0, 7),
      author: {
        name: c.author.user?.display_name || c.author.raw,
        email: '',
        timestamp: new Date(c.date),
      },
      committer: {
        name: c.author.user?.display_name || c.author.raw,
        email: '',
        timestamp: new Date(c.date),
      },
      message: c.message.split('\n')[0],
      body: c.message.split('\n').slice(1).join('\n').trim(),
      timestamp: new Date(c.date),
      files: [],
      branch: '',
      parents: c.parents?.map((p: any) => p.hash) || [],
      stats: {
        additions: 0,
        deletions: 0,
        total: 0,
        filesChanged: 0,
      },
    }));
  }

  async compareCommits(owner: string, repo: string, base: string, head: string): Promise<{
    commits: GitCommit[];
    totalCommits: number;
  }> {
    const result = await this.request<any>(`/repositories/${owner}/${repo}/commits/?include=${head}&exclude=${base}`);
    const commits = result.values.map((c: any) => ({
      hash: c.hash,
      shortHash: c.hash.substring(0, 7),
      author: {
        name: c.author.user?.display_name || c.author.raw,
        email: '',
      },
      committer: {
        name: c.author.user?.display_name || c.author.raw,
        email: '',
      },
      message: c.message,
      timestamp: new Date(c.date),
      files: [],
      branch: '',
      parents: [],
      stats: {
        additions: 0,
        deletions: 0,
        total: 0,
        filesChanged: 0,
      },
    }));

    return { commits, totalCommits: commits.length };
  }

  async createPullRequest(owner: string, repo: string, request: CreatePullRequestRequest): Promise<GitPullRequest> {
    const pr = await this.request<any>(`/repositories/${owner}/${repo}/pullrequests`, {
      method: 'POST',
      body: JSON.stringify({
        title: request.title,
        description: request.description,
        source: { branch: { name: request.sourceBranch } },
        destination: { branch: { name: request.targetBranch } },
      }),
    });

    return {
      id: pr.id.toString(),
      number: pr.id,
      title: pr.title,
      description: pr.description || '',
      state: pr.state === 'OPEN' ? 'open' : pr.state === 'MERGED' ? 'merged' : 'closed',
      sourceBranch: pr.source.branch.name,
      targetBranch: pr.destination.branch.name,
      author: {
        id: pr.author.uuid,
        username: pr.author.username,
        email: '',
        name: pr.author.display_name,
        avatarUrl: pr.author.links?.avatar?.href,
      },
      reviewers: [],
      commits: 0,
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      createdAt: new Date(pr.created_on),
      updatedAt: new Date(pr.updated_on),
      url: pr.links.html.href,
    };
  }

  async getPullRequest(owner: string, repo: string, number: number): Promise<GitPullRequest> {
    const pr = await this.request<any>(`/repositories/${owner}/${repo}/pullrequests/${number}`);
    return {
      id: pr.id.toString(),
      number: pr.id,
      title: pr.title,
      description: pr.description || '',
      state: pr.state === 'OPEN' ? 'open' : pr.state === 'MERGED' ? 'merged' : 'closed',
      sourceBranch: pr.source.branch.name,
      targetBranch: pr.destination.branch.name,
      author: {
        id: pr.author.uuid,
        username: pr.author.username,
        email: '',
        name: pr.author.display_name,
        avatarUrl: pr.author.links?.avatar?.href,
      },
      reviewers: [],
      commits: 0,
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      createdAt: new Date(pr.created_on),
      updatedAt: new Date(pr.updated_on),
      url: pr.links.html.href,
    };
  }

  async listPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<GitPullRequest[]> {
    const stateMap = { open: 'OPEN', closed: 'MERGED,DECLINED,SUPERSEDED', all: undefined };
    const stateParam = stateMap[state] ? `?state=${stateMap[state]}` : '';
    const result = await this.request<any>(`/repositories/${owner}/${repo}/pullrequests${stateParam}`);
    return result.values.map((pr: any) => ({
      id: pr.id.toString(),
      number: pr.id,
      title: pr.title,
      description: pr.description || '',
      state: pr.state === 'OPEN' ? 'open' : pr.state === 'MERGED' ? 'merged' : 'closed',
      sourceBranch: pr.source.branch.name,
      targetBranch: pr.destination.branch.name,
      author: {
        id: pr.author.uuid,
        username: pr.author.username,
        email: '',
        name: pr.author.display_name,
        avatarUrl: pr.author.links?.avatar?.href,
      },
      reviewers: [],
      commits: 0,
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      createdAt: new Date(pr.created_on),
      updatedAt: new Date(pr.updated_on),
      url: pr.links.html.href,
    }));
  }

  async updatePullRequest(owner: string, repo: string, number: number, updates: Partial<CreatePullRequestRequest>): Promise<GitPullRequest> {
    const updateData: any = {};
    if (updates.title) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;

    await this.request<any>(`/repositories/${owner}/${repo}/pullrequests/${number}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });

    return this.getPullRequest(owner, repo, number);
  }

  async mergePullRequest(owner: string, repo: string, number: number, strategy: 'merge' | 'squash' | 'rebase' = 'merge'): Promise<void> {
    const strategyMap = { merge: 'merge_commit', squash: 'squash', rebase: 'fast_forward' };
    await this.request<void>(`/repositories/${owner}/${repo}/pullrequests/${number}/merge`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'pullrequest_merge',
        merge_strategy: strategyMap[strategy],
      }),
    });
  }

  async closePullRequest(owner: string, repo: string, number: number): Promise<void> {
    await this.request<void>(`/repositories/${owner}/${repo}/pullrequests/${number}/decline`, {
      method: 'POST',
    });
  }

  async requestReview(owner: string, repo: string, number: number, reviewers: string[]): Promise<void> {
    throw new Error('Bitbucket reviewer requests require different API');
  }

  async submitReview(owner: string, repo: string, number: number, state: 'approved' | 'changes_requested' | 'commented', body?: string): Promise<PullRequestReview> {
    if (state === 'approved') {
      await this.request<any>(`/repositories/${owner}/${repo}/pullrequests/${number}/approve`, {
        method: 'POST',
      });
    }

    const currentUser = await this.getCurrentUser();
    return {
      id: Date.now().toString(),
      author: currentUser,
      state,
      body: body || '',
      submittedAt: new Date(),
    };
  }

  async listPullRequestComments(owner: string, repo: string, number: number): Promise<PullRequestComment[]> {
    const result = await this.request<any>(`/repositories/${owner}/${repo}/pullrequests/${number}/comments`);
    return result.values.map((c: any) => ({
      id: c.id.toString(),
      author: {
        id: c.user.uuid,
        username: c.user.username,
        email: '',
        name: c.user.display_name,
        avatarUrl: c.user.links?.avatar?.href,
      },
      body: c.content.raw,
      createdAt: new Date(c.created_on),
      updatedAt: new Date(c.updated_on),
    }));
  }

  async addPullRequestComment(owner: string, repo: string, number: number, body: string): Promise<PullRequestComment> {
    const c = await this.request<any>(`/repositories/${owner}/${repo}/pullrequests/${number}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        content: { raw: body },
      }),
    });

    return {
      id: c.id.toString(),
      author: {
        id: c.user.uuid,
        username: c.user.username,
        email: '',
        name: c.user.display_name,
        avatarUrl: c.user.links?.avatar?.href,
      },
      body: c.content.raw,
      createdAt: new Date(c.created_on),
      updatedAt: new Date(c.updated_on),
    };
  }

  // Bitbucket doesn't have releases in the same way
  async createRelease(): Promise<GitRelease> { throw new Error('Not supported'); }
  async getRelease(): Promise<GitRelease> { throw new Error('Not supported'); }
  async listReleases(): Promise<GitRelease[]> { return []; }
  async deleteRelease(): Promise<void> { throw new Error('Not supported'); }

  async createWebhook(owner: string, repo: string, url: string, events: string[], secret?: string): Promise<GitWebhook> {
    const hook = await this.request<any>(`/repositories/${owner}/${repo}/hooks`, {
      method: 'POST',
      body: JSON.stringify({
        description: 'Workflow webhook',
        url,
        active: true,
        events,
      }),
    });

    return {
      id: hook.uuid,
      url: hook.url,
      events: hook.events,
      active: hook.active,
      secret,
    };
  }

  async listWebhooks(owner: string, repo: string): Promise<GitWebhook[]> {
    const result = await this.request<any>(`/repositories/${owner}/${repo}/hooks`);
    return result.values.map((h: any) => ({
      id: h.uuid,
      url: h.url,
      events: h.events,
      active: h.active,
    }));
  }

  async deleteWebhook(owner: string, repo: string, webhookId: string): Promise<void> {
    await this.request<void>(`/repositories/${owner}/${repo}/hooks/${webhookId}`, {
      method: 'DELETE',
    });
  }

  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string> {
    const branch = ref || 'main';
    const response = await fetch(`https://api.bitbucket.org/2.0/repositories/${owner}/${repo}/src/${branch}/${path}`, {
      headers: { 'Authorization': `Bearer ${this.token}` },
    });
    return response.text();
  }

  async updateFile(): Promise<GitCommit> { throw new Error('File operations require different API'); }
  async deleteFile(): Promise<void> { throw new Error('File operations require different API'); }

  async getCurrentUser(): Promise<GitProviderUser> {
    const user = await this.request<any>('/user');
    return {
      id: user.uuid,
      username: user.username,
      email: user.email || '',
      name: user.display_name,
      avatarUrl: user.links?.avatar?.href,
    };
  }

  async getUser(username: string): Promise<GitProviderUser> {
    const user = await this.request<any>(`/users/${username}`);
    return {
      id: user.uuid,
      username: user.username,
      email: '',
      name: user.display_name,
      avatarUrl: user.links?.avatar?.href,
    };
  }

  async searchUsers(query: string): Promise<GitProviderUser[]> {
    throw new Error('Bitbucket user search requires team context');
  }
}
