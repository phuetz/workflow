/**
 * GitLab Provider Implementation
 * Complete GitLab API integration
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

export class GitLabProvider implements IGitProvider {
  private config?: GitProviderConfig;
  private baseUrl: string = 'https://gitlab.com';
  private apiUrl: string = 'https://gitlab.com/api/v4';
  private token?: string;

  async initialize(config: GitProviderConfig): Promise<void> {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://gitlab.com';
    this.apiUrl = config.apiUrl || `${this.baseUrl}/api/v4`;

    if (config.credentials.token) {
      this.token = config.credentials.token;
    } else if (config.credentials.oauth2AccessToken) {
      this.token = config.credentials.oauth2AccessToken;
    } else {
      throw new Error('GitLab provider requires access token');
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

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.apiUrl}${endpoint}`;

    const headers: HeadersInit = {
      'PRIVATE-TOKEN': this.token!,
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`GitLab API Error: ${error.message || response.statusText}`);
    }

    return response.json() as T;
  }

  // Repository Operations
  async listRepositories(page: number = 1, perPage: number = 30): Promise<GitRepository[]> {
    const projects = await this.request<any[]>(`/projects?page=${page}&per_page=${perPage}&owned=true`);
    return projects.map(p => ({
      id: p.id.toString(),
      name: p.name,
      description: p.description,
      provider: 'gitlab' as GitProvider,
      remoteUrl: p.http_url_to_repo,
      localPath: '',
      defaultBranch: p.default_branch,
      currentBranch: p.default_branch,
      isClean: true,
      health: {
        status: 'healthy' as const,
        lastCheck: new Date(),
        issues: [],
        metrics: {
          totalCommits: 0,
          totalBranches: 0,
          totalTags: 0,
          diskUsage: 0,
        },
      },
      createdAt: new Date(p.created_at),
      updatedAt: new Date(p.last_activity_at),
    }));
  }

  async getRepository(owner: string, repo: string): Promise<GitRepository> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const project = await this.request<any>(`/projects/${projectId}`);
    return {
      id: project.id.toString(),
      name: project.name,
      description: project.description,
      provider: 'gitlab' as GitProvider,
      remoteUrl: project.http_url_to_repo,
      localPath: '',
      defaultBranch: project.default_branch,
      currentBranch: project.default_branch,
      isClean: true,
      health: {
        status: 'healthy',
        lastCheck: new Date(),
        issues: [],
        metrics: {
          totalCommits: 0,
          totalBranches: 0,
          totalTags: 0,
          diskUsage: 0,
        },
      },
      createdAt: new Date(project.created_at),
      updatedAt: new Date(project.last_activity_at),
    };
  }

  async createRepository(name: string, description?: string, isPrivate: boolean = false): Promise<GitRepository> {
    const project = await this.request<any>('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        visibility: isPrivate ? 'private' : 'public',
        initialize_with_readme: true,
      }),
    });
    return this.getRepository(project.namespace.full_path, project.path);
  }

  async forkRepository(owner: string, repo: string): Promise<GitRepository> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const project = await this.request<any>(`/projects/${projectId}/fork`, {
      method: 'POST',
    });
    return this.getRepository(project.namespace.full_path, project.path);
  }

  // Branch Operations
  async listBranches(owner: string, repo: string): Promise<GitBranch[]> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const branches = await this.request<any[]>(`/projects/${projectId}/repository/branches`);
    return branches.map(b => ({
      name: b.name,
      isDefault: b.default,
      isCurrent: false,
      isProtected: b.protected,
      ahead: 0,
      behind: 0,
    }));
  }

  async getBranch(owner: string, repo: string, branch: string): Promise<GitBranch> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const branchData = await this.request<any>(`/projects/${projectId}/repository/branches/${branch}`);
    return {
      name: branchData.name,
      isDefault: branchData.default,
      isCurrent: false,
      isProtected: branchData.protected,
      ahead: 0,
      behind: 0,
    };
  }

  async createBranch(owner: string, repo: string, branchName: string, from?: string): Promise<GitBranch> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const repository = await this.getRepository(owner, repo);
    const ref = from || repository.defaultBranch;

    await this.request<any>(`/projects/${projectId}/repository/branches`, {
      method: 'POST',
      body: JSON.stringify({
        branch: branchName,
        ref,
      }),
    });

    return this.getBranch(owner, repo, branchName);
  }

  async deleteBranch(owner: string, repo: string, branchName: string): Promise<void> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    await this.request<void>(`/projects/${projectId}/repository/branches/${branchName}`, {
      method: 'DELETE',
    });
  }

  async protectBranch(owner: string, repo: string, branchName: string): Promise<void> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    await this.request<void>(`/projects/${projectId}/protected_branches`, {
      method: 'POST',
      body: JSON.stringify({
        name: branchName,
        push_access_level: 40, // Maintainer
        merge_access_level: 40,
      }),
    });
  }

  // Commit Operations
  async getCommit(owner: string, repo: string, sha: string): Promise<GitCommit> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const commit = await this.request<any>(`/projects/${projectId}/repository/commits/${sha}`);
    return {
      hash: commit.id,
      shortHash: commit.short_id,
      author: {
        name: commit.author_name,
        email: commit.author_email,
        timestamp: new Date(commit.authored_date),
      },
      committer: {
        name: commit.committer_name,
        email: commit.committer_email,
        timestamp: new Date(commit.committed_date),
      },
      message: commit.title,
      body: commit.message,
      timestamp: new Date(commit.created_at),
      files: [],
      branch: '',
      parents: commit.parent_ids,
      stats: {
        additions: commit.stats?.additions || 0,
        deletions: commit.stats?.deletions || 0,
        total: commit.stats?.total || 0,
        filesChanged: 0,
      },
    };
  }

  async listCommits(owner: string, repo: string, branch?: string, limit: number = 30): Promise<GitCommit[]> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const params = new URLSearchParams();
    if (branch) params.append('ref_name', branch);
    params.append('per_page', limit.toString());

    const commits = await this.request<any[]>(`/projects/${projectId}/repository/commits?${params}`);
    const commitPromises = commits.map(c => this.getCommit(owner, repo, c.id));
    return Promise.all(commitPromises);
  }

  async compareCommits(owner: string, repo: string, base: string, head: string): Promise<{
    commits: GitCommit[];
    totalCommits: number;
  }> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const comparison = await this.request<any>(`/projects/${projectId}/repository/compare?from=${base}&to=${head}`);
    const commits = comparison.commits.map((c: any) => ({
      hash: c.id,
      shortHash: c.short_id,
      author: {
        name: c.author_name,
        email: c.author_email,
        timestamp: new Date(c.authored_date),
      },
      committer: {
        name: c.committer_name,
        email: c.committer_email,
        timestamp: new Date(c.committed_date),
      },
      message: c.title,
      body: c.message,
      timestamp: new Date(c.created_at),
      files: [],
      branch: '',
      parents: c.parent_ids,
      stats: {
        additions: 0,
        deletions: 0,
        total: 0,
        filesChanged: 0,
      },
    }));

    return {
      commits,
      totalCommits: commits.length,
    };
  }

  // Pull Request Operations (Merge Requests in GitLab)
  async createPullRequest(owner: string, repo: string, request: CreatePullRequestRequest): Promise<GitPullRequest> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const mr = await this.request<any>(`/projects/${projectId}/merge_requests`, {
      method: 'POST',
      body: JSON.stringify({
        source_branch: request.sourceBranch,
        target_branch: request.targetBranch,
        title: request.title,
        description: request.description,
      }),
    });

    return {
      id: mr.iid.toString(),
      number: mr.iid,
      title: mr.title,
      description: mr.description,
      state: mr.state === 'opened' ? 'open' : mr.state === 'merged' ? 'merged' : 'closed',
      sourceBranch: mr.source_branch,
      targetBranch: mr.target_branch,
      author: {
        id: mr.author.id.toString(),
        username: mr.author.username,
        email: '',
        name: mr.author.name,
        avatarUrl: mr.author.avatar_url,
      },
      reviewers: [],
      commits: mr.changes_count || 0,
      additions: 0,
      deletions: 0,
      changedFiles: mr.changes_count || 0,
      createdAt: new Date(mr.created_at),
      updatedAt: new Date(mr.updated_at),
      mergedAt: mr.merged_at ? new Date(mr.merged_at) : undefined,
      closedAt: mr.closed_at ? new Date(mr.closed_at) : undefined,
      url: mr.web_url,
    };
  }

  async getPullRequest(owner: string, repo: string, number: number): Promise<GitPullRequest> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const mr = await this.request<any>(`/projects/${projectId}/merge_requests/${number}`);
    return {
      id: mr.iid.toString(),
      number: mr.iid,
      title: mr.title,
      description: mr.description,
      state: mr.state === 'opened' ? 'open' : mr.state === 'merged' ? 'merged' : 'closed',
      sourceBranch: mr.source_branch,
      targetBranch: mr.target_branch,
      author: {
        id: mr.author.id.toString(),
        username: mr.author.username,
        email: '',
        name: mr.author.name,
        avatarUrl: mr.author.avatar_url,
      },
      reviewers: [],
      commits: mr.changes_count || 0,
      additions: 0,
      deletions: 0,
      changedFiles: mr.changes_count || 0,
      createdAt: new Date(mr.created_at),
      updatedAt: new Date(mr.updated_at),
      mergedAt: mr.merged_at ? new Date(mr.merged_at) : undefined,
      closedAt: mr.closed_at ? new Date(mr.closed_at) : undefined,
      url: mr.web_url,
    };
  }

  async listPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open'): Promise<GitPullRequest[]> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const stateMap = { open: 'opened', closed: 'closed', all: 'all' };
    const mrs = await this.request<any[]>(`/projects/${projectId}/merge_requests?state=${stateMap[state]}`);
    return mrs.map(mr => ({
      id: mr.iid.toString(),
      number: mr.iid,
      title: mr.title,
      description: mr.description,
      state: mr.state === 'opened' ? 'open' : mr.state === 'merged' ? 'merged' : 'closed',
      sourceBranch: mr.source_branch,
      targetBranch: mr.target_branch,
      author: {
        id: mr.author.id.toString(),
        username: mr.author.username,
        email: '',
        name: mr.author.name,
        avatarUrl: mr.author.avatar_url,
      },
      reviewers: [],
      commits: 0,
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      createdAt: new Date(mr.created_at),
      updatedAt: new Date(mr.updated_at),
      mergedAt: mr.merged_at ? new Date(mr.merged_at) : undefined,
      closedAt: mr.closed_at ? new Date(mr.closed_at) : undefined,
      url: mr.web_url,
    }));
  }

  async updatePullRequest(owner: string, repo: string, number: number, updates: Partial<CreatePullRequestRequest>): Promise<GitPullRequest> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const updateData: any = {};
    if (updates.title) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;

    await this.request<any>(`/projects/${projectId}/merge_requests/${number}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });

    return this.getPullRequest(owner, repo, number);
  }

  async mergePullRequest(owner: string, repo: string, number: number, strategy: 'merge' | 'squash' | 'rebase' = 'merge'): Promise<void> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    await this.request<void>(`/projects/${projectId}/merge_requests/${number}/merge`, {
      method: 'PUT',
      body: JSON.stringify({
        merge_when_pipeline_succeeds: false,
        squash: strategy === 'squash',
      }),
    });
  }

  async closePullRequest(owner: string, repo: string, number: number): Promise<void> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    await this.request<void>(`/projects/${projectId}/merge_requests/${number}`, {
      method: 'PUT',
      body: JSON.stringify({ state_event: 'close' }),
    });
  }

  async requestReview(owner: string, repo: string, number: number, reviewers: string[]): Promise<void> {
    // GitLab doesn't have the same reviewer system as GitHub
    // This would require user IDs, which we don't have from usernames
    throw new Error('GitLab reviewer requests require user IDs');
  }

  async submitReview(owner: string, repo: string, number: number, state: 'approved' | 'changes_requested' | 'commented', body?: string): Promise<PullRequestReview> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);

    if (state === 'approved') {
      await this.request<any>(`/projects/${projectId}/merge_requests/${number}/approve`, {
        method: 'POST',
      });
    }

    if (body) {
      await this.addPullRequestComment(owner, repo, number, body);
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
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const notes = await this.request<any[]>(`/projects/${projectId}/merge_requests/${number}/notes`);
    return notes.map(note => ({
      id: note.id.toString(),
      author: {
        id: note.author.id.toString(),
        username: note.author.username,
        email: '',
        name: note.author.name,
        avatarUrl: note.author.avatar_url,
      },
      body: note.body,
      createdAt: new Date(note.created_at),
      updatedAt: new Date(note.updated_at),
    }));
  }

  async addPullRequestComment(owner: string, repo: string, number: number, body: string): Promise<PullRequestComment> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const note = await this.request<any>(`/projects/${projectId}/merge_requests/${number}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });

    return {
      id: note.id.toString(),
      author: {
        id: note.author.id.toString(),
        username: note.author.username,
        email: '',
        name: note.author.name,
        avatarUrl: note.author.avatar_url,
      },
      body: note.body,
      createdAt: new Date(note.created_at),
      updatedAt: new Date(note.updated_at),
    };
  }

  // Release Operations (Tags in GitLab)
  async createRelease(owner: string, repo: string, tag: string, name: string, description: string, draft: boolean = false, prerelease: boolean = false): Promise<GitRelease> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const release = await this.request<any>(`/projects/${projectId}/releases`, {
      method: 'POST',
      body: JSON.stringify({
        tag_name: tag,
        name,
        description,
      }),
    });

    const currentUser = await this.getCurrentUser();
    return {
      id: release.tag_name,
      tagName: release.tag_name,
      name: release.name,
      description: release.description,
      commit: release.commit.id,
      draft,
      prerelease,
      createdAt: new Date(release.created_at),
      publishedAt: new Date(release.released_at),
      author: currentUser,
      assets: release.assets?.links || [],
    };
  }

  async getRelease(owner: string, repo: string, tag: string): Promise<GitRelease> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const release = await this.request<any>(`/projects/${projectId}/releases/${tag}`);
    const currentUser = await this.getCurrentUser();
    return {
      id: release.tag_name,
      tagName: release.tag_name,
      name: release.name,
      description: release.description,
      commit: release.commit.id,
      draft: false,
      prerelease: false,
      createdAt: new Date(release.created_at),
      publishedAt: new Date(release.released_at),
      author: currentUser,
      assets: [],
    };
  }

  async listReleases(owner: string, repo: string): Promise<GitRelease[]> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const releases = await this.request<any[]>(`/projects/${projectId}/releases`);
    const currentUser = await this.getCurrentUser();
    return releases.map(r => ({
      id: r.tag_name,
      tagName: r.tag_name,
      name: r.name,
      description: r.description,
      commit: r.commit.id,
      draft: false,
      prerelease: false,
      createdAt: new Date(r.created_at),
      publishedAt: new Date(r.released_at),
      author: currentUser,
      assets: [],
    }));
  }

  async deleteRelease(owner: string, repo: string, releaseId: string): Promise<void> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    await this.request<void>(`/projects/${projectId}/releases/${releaseId}`, {
      method: 'DELETE',
    });
  }

  // Webhook Operations
  async createWebhook(owner: string, repo: string, url: string, events: string[], secret?: string): Promise<GitWebhook> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const hook = await this.request<any>(`/projects/${projectId}/hooks`, {
      method: 'POST',
      body: JSON.stringify({
        url,
        push_events: events.includes('push'),
        merge_requests_events: events.includes('pull_request'),
        token: secret,
      }),
    });

    return {
      id: hook.id.toString(),
      url: hook.url,
      events,
      active: true,
      secret,
    };
  }

  async listWebhooks(owner: string, repo: string): Promise<GitWebhook[]> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const hooks = await this.request<any[]>(`/projects/${projectId}/hooks`);
    return hooks.map(h => ({
      id: h.id.toString(),
      url: h.url,
      events: [],
      active: true,
    }));
  }

  async deleteWebhook(owner: string, repo: string, webhookId: string): Promise<void> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    await this.request<void>(`/projects/${projectId}/hooks/${webhookId}`, {
      method: 'DELETE',
    });
  }

  // File Operations
  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const filePath = encodeURIComponent(path);
    const params = ref ? `?ref=${ref}` : '';
    const file = await this.request<any>(`/projects/${projectId}/repository/files/${filePath}${params}`);

    if (file.encoding === 'base64') {
      return Buffer.from(file.content, 'base64').toString('utf-8');
    }
    return file.content;
  }

  async updateFile(owner: string, repo: string, path: string, content: string, message: string, branch: string, sha?: string): Promise<GitCommit> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const filePath = encodeURIComponent(path);
    const encodedContent = Buffer.from(content).toString('base64');

    const result = await this.request<any>(`/projects/${projectId}/repository/files/${filePath}`, {
      method: sha ? 'PUT' : 'POST',
      body: JSON.stringify({
        branch,
        content: encodedContent,
        commit_message: message,
        encoding: 'base64',
      }),
    });

    return this.getCommit(owner, repo, result.commit_id || result.id);
  }

  async deleteFile(owner: string, repo: string, path: string, message: string, branch: string, sha: string): Promise<void> {
    const projectId = encodeURIComponent(`${owner}/${repo}`);
    const filePath = encodeURIComponent(path);
    await this.request<void>(`/projects/${projectId}/repository/files/${filePath}`, {
      method: 'DELETE',
      body: JSON.stringify({
        branch,
        commit_message: message,
      }),
    });
  }

  // User Operations
  async getCurrentUser(): Promise<GitProviderUser> {
    const user = await this.request<any>('/user');
    return {
      id: user.id.toString(),
      username: user.username,
      email: user.email || '',
      name: user.name,
      avatarUrl: user.avatar_url,
    };
  }

  async getUser(username: string): Promise<GitProviderUser> {
    const users = await this.request<any[]>(`/users?username=${username}`);
    if (users.length === 0) {
      throw new Error('User not found');
    }
    const user = users[0];
    return {
      id: user.id.toString(),
      username: user.username,
      email: user.email || '',
      name: user.name,
      avatarUrl: user.avatar_url,
    };
  }

  async searchUsers(query: string): Promise<GitProviderUser[]> {
    const users = await this.request<any[]>(`/users?search=${encodeURIComponent(query)}`);
    return users.map(u => ({
      id: u.id.toString(),
      username: u.username,
      email: '',
      name: u.name,
      avatarUrl: u.avatar_url,
    }));
  }
}
