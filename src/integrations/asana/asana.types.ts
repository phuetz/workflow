/**
 * Asana API Types
 * REST API v1.0
 */

export interface AsanaCredentials {
  accessToken: string;
  workspaceGid?: string;
}

export type AsanaOperation =
  | 'createTask'
  | 'updateTask'
  | 'getTask'
  | 'deleteTask'
  | 'searchTasks'
  | 'createProject'
  | 'getProject'
  | 'updateProject'
  | 'addComment'
  | 'getTags'
  | 'getUsers'
  | 'getTeams';

export interface AsanaResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface AsanaTask {
  gid: string;
  resource_type: 'task';
  name: string;
  notes?: string;
  html_notes?: string;
  completed: boolean;
  assignee?: AsanaUser | null;
  assignee_status?: 'inbox' | 'upcoming' | 'later' | 'today';
  completed_at?: string | null;
  created_at: string;
  due_on?: string | null;
  due_at?: string | null;
  followers?: AsanaUser[];
  hearted?: boolean;
  hearts?: any[];
  modified_at: string;
  num_hearts: number;
  projects?: AsanaProject[];
  parent?: AsanaTask | null;
  permalink_url: string;
  tags?: AsanaTag[];
  workspace: AsanaWorkspace;
  custom_fields?: AsanaCustomField[];
}

export interface AsanaProject {
  gid: string;
  resource_type: 'project';
  name: string;
  archived: boolean;
  color?: string;
  created_at: string;
  current_status?: any;
  due_date?: string | null;
  due_on?: string | null;
  html_notes?: string;
  members?: AsanaUser[];
  modified_at: string;
  notes?: string;
  public: boolean;
  start_on?: string | null;
  workspace: AsanaWorkspace;
  owner?: AsanaUser;
  team?: AsanaTeam;
  permalink_url: string;
}

export interface AsanaUser {
  gid: string;
  resource_type: 'user';
  name: string;
  email?: string;
  photo?: { image_21x21?: string; image_27x27?: string; image_36x36?: string; image_60x60?: string; image_128x128?: string };
  workspaces?: AsanaWorkspace[];
}

export interface AsanaWorkspace {
  gid: string;
  resource_type: 'workspace';
  name: string;
  is_organization?: boolean;
  email_domains?: string[];
}

export interface AsanaTeam {
  gid: string;
  resource_type: 'team';
  name: string;
  organization: AsanaWorkspace;
  permalink_url: string;
}

export interface AsanaTag {
  gid: string;
  resource_type: 'tag';
  name: string;
  color?: string;
  workspace: AsanaWorkspace;
}

export interface AsanaCustomField {
  gid: string;
  resource_type: 'custom_field';
  name: string;
  description?: string;
  type: 'text' | 'number' | 'enum' | 'multi_enum' | 'date' | 'people';
  enum_value?: any;
  enum_options?: any[];
  number_value?: number;
  text_value?: string;
  display_value?: string;
}

export interface AsanaComment {
  gid: string;
  resource_type: 'story';
  created_at: string;
  created_by: AsanaUser;
  text: string;
  html_text: string;
  type: string;
  is_pinned: boolean;
}
