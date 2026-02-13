/** Linear API Types - GraphQL API */
export interface LinearCredentials { apiKey: string; teamId?: string; }
export type LinearOperation = 'createIssue' | 'updateIssue' | 'getIssue' | 'searchIssues' | 'createProject' | 'getProject' | 'addComment' | 'getTeam' | 'getUsers' | 'updateIssueStatus';
export interface LinearResponse<T = any> { ok: boolean; data?: T; error?: string; }
export interface LinearIssue { id: string; identifier: string; title: string; description?: string; priority: number; state: LinearWorkflowState; assignee?: LinearUser; createdAt: string; updatedAt: string; url: string; }
export interface LinearWorkflowState { id: string; name: string; color: string; type: string; }
export interface LinearUser { id: string; name: string; email: string; avatarUrl?: string; }
export interface LinearProject { id: string; name: string; description?: string; state: string; startDate?: string; targetDate?: string; }
