/** Jira Types - REST API v3 */

export interface JiraCredentials {
  domain: string; // e.g., "yourcompany.atlassian.net"
  email: string;
  apiToken: string;
}

export type JiraOperation =
  | 'createIssue'
  | 'updateIssue'
  | 'getIssue'
  | 'deleteIssue'
  | 'searchIssues'
  | 'addComment'
  | 'getComments'
  | 'transitionIssue'
  | 'getTransitions'
  | 'assignIssue'
  | 'getProjects'
  | 'createProject';

export interface JiraResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: JiraIssueFields;
}

export interface JiraIssueFields {
  summary: string;
  description?: any; // ADF (Atlassian Document Format) or string
  issuetype: JiraIssueType;
  project: JiraProject;
  priority?: JiraPriority;
  status: JiraStatus;
  assignee?: JiraUser | null;
  reporter?: JiraUser;
  created?: string;
  updated?: string;
  resolutiondate?: string | null;
  labels?: string[];
  components?: Array<{ id: string; name: string }>;
  customfield_?: any; // Custom fields have dynamic names
  [key: string]: any;
}

export interface JiraIssueType {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  subtask?: boolean;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey?: string;
  simplified?: boolean;
  style?: string;
  isPrivate?: boolean;
}

export interface JiraPriority {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface JiraStatus {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  statusCategory?: {
    id: number;
    key: string;
    colorName: string;
    name: string;
  };
}

export interface JiraUser {
  accountId: string;
  emailAddress?: string;
  displayName: string;
  avatarUrls?: {
    '48x48': string;
    '24x24': string;
    '16x16': string;
    '32x32': string;
  };
  active?: boolean;
}

export interface JiraComment {
  id: string;
  self: string;
  body: any; // ADF format
  author?: JiraUser;
  created?: string;
  updated?: string;
  visibility?: {
    type: string;
    value: string;
  };
}

export interface JiraTransition {
  id: string;
  name: string;
  to: JiraStatus;
  hasScreen?: boolean;
  isGlobal?: boolean;
  isInitial?: boolean;
  isConditional?: boolean;
}

export interface JiraSearchRequest {
  jql: string;
  startAt?: number;
  maxResults?: number;
  fields?: string[];
  expand?: string[];
}

export interface JiraSearchResponse {
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

export interface JiraCreateIssueInput {
  fields: {
    project: { key: string } | { id: string };
    issuetype: { id: string } | { name: string };
    summary: string;
    description?: any;
    priority?: { id: string } | { name: string };
    labels?: string[];
    assignee?: { accountId: string };
    parent?: { key: string } | { id: string };
    components?: Array<{ id: string }>;
    [key: string]: any;
  };
}

export interface JiraUpdateIssueInput {
  fields?: {
    summary?: string;
    description?: any;
    priority?: { id: string } | { name: string };
    labels?: string[];
    assignee?: { accountId: string } | null;
    [key: string]: any;
  };
  update?: {
    [fieldName: string]: Array<{ add?: any; set?: any; remove?: any }>;
  };
}
