/** ClickUp Types - REST API v2 */

export interface ClickUpCredentials {
  apiToken: string;
  teamId?: string;
}

export type ClickUpOperation =
  | 'createTask'
  | 'updateTask'
  | 'getTask'
  | 'deleteTask'
  | 'createList'
  | 'getList'
  | 'createFolder'
  | 'getFolder'
  | 'createComment'
  | 'getTasks'
  | 'getSpaces'
  | 'createSpace';

export interface ClickUpResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface ClickUpTask {
  id: string;
  custom_id?: string | null;
  name: string;
  text_content?: string;
  description?: string;
  status: ClickUpStatus;
  orderindex?: string;
  date_created?: string;
  date_updated?: string;
  date_closed?: string | null;
  creator?: ClickUpUser;
  assignees?: ClickUpUser[];
  watchers?: ClickUpUser[];
  checklists?: any[];
  tags?: ClickUpTag[];
  parent?: string | null;
  priority?: ClickUpPriority | null;
  due_date?: string | null;
  start_date?: string | null;
  time_estimate?: number | null;
  time_spent?: number;
  list?: { id: string; name: string };
  folder?: { id: string; name: string };
  space?: { id: string };
  url: string;
}

export interface ClickUpStatus {
  id?: string;
  status: string;
  color: string;
  orderindex?: number;
  type: string;
}

export interface ClickUpPriority {
  id: string;
  priority: string;
  color: string;
  orderindex: string;
}

export interface ClickUpUser {
  id: number;
  username: string;
  email?: string;
  color?: string;
  profilePicture?: string;
}

export interface ClickUpTag {
  name: string;
  tag_fg?: string;
  tag_bg?: string;
}

export interface ClickUpList {
  id: string;
  name: string;
  orderindex?: number;
  content?: string;
  status?: ClickUpStatus;
  priority?: ClickUpPriority;
  assignee?: ClickUpUser | null;
  task_count?: number;
  due_date?: string | null;
  start_date?: string | null;
  folder?: { id: string; name: string };
  space?: { id: string; name: string };
  archived?: boolean;
}

export interface ClickUpFolder {
  id: string;
  name: string;
  orderindex?: number;
  override_statuses?: boolean;
  hidden?: boolean;
  space?: { id: string; name: string };
  task_count?: string;
  lists?: ClickUpList[];
}

export interface ClickUpSpace {
  id: string;
  name: string;
  private?: boolean;
  statuses?: ClickUpStatus[];
  multiple_assignees?: boolean;
  features?: {
    due_dates?: { enabled: boolean };
    time_tracking?: { enabled: boolean };
    tags?: { enabled: boolean };
    time_estimates?: { enabled: boolean };
    checklists?: { enabled: boolean };
    custom_fields?: { enabled: boolean };
    remap_dependencies?: { enabled: boolean };
    dependency_warning?: { enabled: boolean };
    portfolios?: { enabled: boolean };
  };
}

export interface ClickUpComment {
  id: string;
  comment_text?: string;
  comment?: Array<{ text: string }>;
  user?: ClickUpUser;
  resolved?: boolean;
  assignee?: ClickUpUser;
  assigned_by?: ClickUpUser;
  reactions?: any[];
  date?: string;
}

export interface ClickUpCreateTaskInput {
  list_id: string;
  name: string;
  description?: string;
  assignees?: number[];
  tags?: string[];
  status?: string;
  priority?: number;
  due_date?: number;
  due_date_time?: boolean;
  time_estimate?: number;
  start_date?: number;
  start_date_time?: boolean;
  notify_all?: boolean;
  parent?: string;
  links_to?: string;
}

export interface ClickUpUpdateTaskInput {
  name?: string;
  description?: string;
  status?: string;
  priority?: number;
  due_date?: number;
  due_date_time?: boolean;
  start_date?: number;
  start_date_time?: boolean;
  assignees?: {
    add?: number[];
    rem?: number[];
  };
}
