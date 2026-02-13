import { EventEmitter } from 'events';

export interface Project {
  id: string;
  name: string;
  description: string;
  type: 'software' | 'marketing' | 'design' | 'research' | 'operations';
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'archived';
  team: Array<{
    userId: string;
    name: string;
    role: 'owner' | 'manager' | 'member' | 'viewer';
    department?: string;
    allocation: number; // Percentage
    joinedAt: Date;
  }>;
  timeline: {
    startDate: Date;
    endDate: Date;
    milestones: Array<{
      id: string;
      name: string;
      date: Date;
      status: 'pending' | 'in-progress' | 'completed' | 'delayed';
      deliverables: string[];
      dependencies: string[];
    }>;
  };
  tasks: Task[];
  sprints?: Sprint[];
  budget?: {
    allocated: number;
    spent: number;
    currency: string;
    categories: Array<{
      name: string;
      allocated: number;
      spent: number;
    }>;
  };
  resources: Array<{
    id: string;
    type: 'document' | 'asset' | 'tool' | 'service';
    name: string;
    url?: string;
    permissions: string[];
  }>;
  settings: {
    methodology: 'agile' | 'waterfall' | 'kanban' | 'hybrid';
    visibility: 'private' | 'team' | 'organization' | 'public';
    notifications: {
      email: boolean;
      slack: boolean;
      inApp: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  type: 'feature' | 'bug' | 'improvement' | 'research' | 'documentation';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'todo' | 'in-progress' | 'review' | 'testing' | 'done' | 'cancelled';
  assignees: string[];
  reporter: string;
  labels: string[];
  estimatedHours?: number;
  actualHours?: number;
  dueDate?: Date;
  completedDate?: Date;
  blockedBy: string[];
  blocks: string[];
  subtasks: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedBy: string;
    uploadedAt: Date;
  }>;
  comments: TaskComment[];
  activity: Array<{
    type: string;
    userId: string;
    timestamp: Date;
    details: unknown;
  }>;
  customFields?: { [key: string]: unknown };
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  text: string;
  mentions: string[];
  attachments?: string[];
  reactions: Array<{
    userId: string;
    emoji: string;
  }>;
  edited: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  startDate: Date;
  endDate: Date;
  status: 'planning' | 'active' | 'completed';
  tasks: string[]; // Task IDs
  capacity: {
    total: number;
    allocated: number;
    completed: number;
  };
  velocity?: number;
  retrospective?: {
    whatWentWell: string[];
    whatCouldBeImproved: string[];
    actionItems: Array<{
      item: string;
      owner: string;
      completed: boolean;
    }>;
  };
}

export interface ProjectBoard {
  id: string;
  projectId: string;
  name: string;
  type: 'kanban' | 'scrum' | 'custom';
  columns: Array<{
    id: string;
    name: string;
    limit?: number;
    color?: string;
    tasks: string[]; // Task IDs
    automations?: Array<{
      trigger: string;
      action: string;
      config: unknown;
    }>;
  }>;
  swimlanes?: Array<{
    id: string;
    name: string;
    criteria: unknown;
  }>;
  filters: Array<{
    id: string;
    name: string;
    criteria: unknown;
    isActive: boolean;
  }>;
  view: 'board' | 'list' | 'timeline' | 'calendar';
}

export interface ProjectReport {
  id: string;
  projectId: string;
  type: 'status' | 'progress' | 'burndown' | 'velocity' | 'resource' | 'custom';
  name: string;
  period: {
    start: Date;
    end: Date;
  };
  data: {
    metrics: { [key: string]: number };
    charts: Array<{
      type: string;
      data: unknown;
      config: unknown;
    }>;
    insights: string[];
  };
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  };
  generatedAt: Date;
}

export interface ProjectManagementConfig {
  features: {
    sprints: boolean;
    boards: boolean;
    ganttChart: boolean;
    timeTracking: boolean;
    budgeting: boolean;
    resourceManagement: boolean;
    reporting: boolean;
    automation: boolean;
  };
  integrations: {
    git: {
      enabled: boolean;
      provider: 'github' | 'gitlab' | 'bitbucket';
      config: unknown;
    };
    communication: {
      slack?: { webhookUrl: string };
      teams?: { webhookUrl: string };
      email?: { smtp: unknown };
    };
    calendar: {
      enabled: boolean;
      provider: 'google' | 'outlook' | 'apple';
    };
  };
  customFields: Array<{
    name: string;
    type: 'text' | 'number' | 'date' | 'select' | 'multiselect';
    options?: string[];
    required: boolean;
    projects?: string[]; // Specific projects or all
  }>;
  templates: Array<{
    id: string;
    name: string;
    type: string;
    structure: unknown;
  }>;
  permissions: {
    createProjects: string[]; // Role names
    deleteProjects: string[];
    manageTeam: string[];
    editTasks: string[];
  };
}

export class ProjectManagement extends EventEmitter {
  private config: ProjectManagementConfig;
  private projects: Map<string, Project> = new Map();
  private tasks: Map<string, Task> = new Map();
  private sprints: Map<string, Sprint> = new Map();
  private boards: Map<string, ProjectBoard> = new Map();
  private reports: Map<string, ProjectReport> = new Map();
  private automationRules: Map<string, unknown> = new Map();
  private isInitialized = false;

  constructor(config: ProjectManagementConfig) {
    super();
    this.config = config;
  }

  public async initialize(): Promise<void> {
    try {
      // Initialize integrations
      if (this.config.integrations.git.enabled) {
        await this.initializeGitIntegration();
      }

      // Load templates
      await this.loadTemplates();

      // Start automation engine
      if (this.config.features.automation) {
        this.startAutomationEngine();
      }

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  public async createProject(
    projectSpec: Omit<Project, 'id' | 'tasks' | 'sprints' | 'createdAt' | 'updatedAt'>,
    creatorId: string,
    templateId?: string
  ): Promise<string> {
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const project: Project = {
      ...projectSpec,
      id: projectId,
      tasks: [],
      sprints: this.config.features.sprints ? [] : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Apply template if specified
    if (templateId) {
      await this.applyProjectTemplate(project, templateId);
    }

    // Add creator to team
    if (!project.team.find(m => m.userId === creatorId)) {
      project.team.push({
        userId: creatorId,
        name: 'Project Creator',
        role: 'owner',
        allocation: 100,
        joinedAt: new Date()
      });
    }

    this.projects.set(projectId, project);

    // Create default board
    if (this.config.features.boards) {
      await this.createBoard(projectId, {
        name: 'Main Board',
        type: project.settings.methodology === 'agile' ? 'scrum' : 'kanban'
      });
    }

    this.emit('projectCreated', { project });
    return projectId;
  }

  public async createTask(
    projectId: string,
    taskSpec: Omit<Task, 'id' | 'projectId' | 'comments' | 'activity' | 'createdAt' | 'updatedAt'>,
    creatorId: string
  ): Promise<string> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task: Task = {
      ...taskSpec,
      id: taskId,
      projectId,
      comments: [],
      activity: [{
        type: 'created',
        userId: creatorId,
        timestamp: new Date(),
        details: {}
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate custom fields
    if (task.customFields) {
      this.validateCustomFields(task.customFields, projectId);
    }

    this.tasks.set(taskId, task);
    project.tasks.push(task);
    project.updatedAt = new Date();

    // Auto-assign to sprint if active
    if (project.sprints) {
      const activeSprint = project.sprints.find(s => 
        this.sprints.get(s.id)?.status === 'active'
      );
      if (activeSprint) {
        await this.addTaskToSprint(taskId, activeSprint.id);
      }
    }

    // Send notifications
    await this.notifyTaskCreated(task);

    this.emit('taskCreated', { projectId, task });
    return taskId;
  }

  public async updateTask(
    taskId: string,
    updates: Partial<Task>,
    userId: string
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const previousStatus = task.status;
    const previousAssignees = [...task.assignees];

    // Apply updates
    Object.assign(task, updates, {
      updatedAt: new Date()
    });

    // Record activity
    task.activity.push({
      type: 'updated',
      userId,
      timestamp: new Date(),
      details: { updates }
    });

    // Update project
    const project = this.projects.get(task.projectId);
    if (project) {
      project.updatedAt = new Date();
    }

    // Handle status change
    if (updates.status && updates.status !== previousStatus) {
      await this.handleTaskStatusChange(task, previousStatus, updates.status);
    }

    // Handle assignee changes
    if (updates.assignees) {
      await this.handleAssigneeChanges(task, previousAssignees, updates.assignees);
    }

    // Run automations
    await this.runTaskAutomations(task, 'update');

    this.emit('taskUpdated', { taskId, updates });
  }

  public async createSprint(
    projectId: string,
    sprintSpec: Omit<Sprint, 'id' | 'projectId' | 'tasks' | 'capacity'>
  ): Promise<string> {
    const project = this.projects.get(projectId);
    if (!project || !project.sprints) {
      throw new Error('Sprints not enabled for this project');
    }

    const sprintId = `sprint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const sprint: Sprint = {
      ...sprintSpec,
      id: sprintId,
      projectId,
      tasks: [],
      capacity: {
        total: this.calculateSprintCapacity(project, sprintSpec.startDate, sprintSpec.endDate),
        allocated: 0,
        completed: 0
      }
    };

    this.sprints.set(sprintId, sprint);
    project.sprints.push(sprint);
    project.updatedAt = new Date();

    this.emit('sprintCreated', { projectId, sprint });
    return sprintId;
  }

  public async addTaskToSprint(taskId: string, sprintId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    const sprint = this.sprints.get(sprintId);
    
    if (!task || !sprint) {
      throw new Error('Task or sprint not found');
    }

    if (sprint.tasks.includes(taskId)) {
      return; // Already in sprint
    }

    sprint.tasks.push(taskId);
    
    // Update capacity
    if (task.estimatedHours) {
      sprint.capacity.allocated += task.estimatedHours;
    }

    // Record activity
    task.activity.push({
      type: 'added_to_sprint',
      userId: 'system',
      timestamp: new Date(),
      details: { sprintId }
    });

    this.emit('taskAddedToSprint', { taskId, sprintId });
  }

  public async createBoard(
    projectId: string,
    boardSpec: {
      name: string;
      type: ProjectBoard['type'];
      columns?: Array<{ name: string; limit?: number }>;
    }
  ): Promise<string> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const boardId = `board_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const board: ProjectBoard = {
      id: boardId,
      projectId,
      name: boardSpec.name,
      type: boardSpec.type,
      columns: boardSpec.columns ? boardSpec.columns.map(col => ({
        id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: col.name,
        limit: col.limit,
        tasks: []
      })) : this.getDefaultColumns(boardSpec.type),
      filters: [],
      view: 'board'
    };

    this.boards.set(boardId, board);
    
    // Distribute existing tasks
    await this.distributeTasksToBoard(board, project.tasks);
    
    this.emit('boardCreated', { projectId, board });
    return boardId;
  }

  public async moveTask(
    boardId: string,
    taskId: string,
    fromColumnId: string,
    toColumnId: string,
    position?: number
  ): Promise<void> {
    const board = this.boards.get(boardId);
    const task = this.tasks.get(taskId);
    
    if (!board || !task) {
      throw new Error('Board or task not found');
    }

    const fromColumn = board.columns.find(c => c.id === fromColumnId);
    const toColumn = board.columns.find(c => c.id === toColumnId);
    
    if (!fromColumn || !toColumn) {
      throw new Error('Column not found');
    }

    // Check column limit
    if (toColumn.limit && toColumn.tasks.length >= toColumn.limit) {
      throw new Error('Column limit reached');
    }

    // Remove from source column
    const taskIndex = fromColumn.tasks.indexOf(taskId);
    if (taskIndex >= 0) {
      fromColumn.tasks.splice(taskIndex, 1);
    }

    // Add to target column
    if (position !== undefined && position >= 0 && position <= toColumn.tasks.length) {
      toColumn.tasks.splice(position, 0, taskId);
    } else {
      toColumn.tasks.push(taskId);
    }

    // Update task status based on column
    const statusMapping = this.getColumnStatusMapping(board.type);
    const newStatus = statusMapping[toColumn.name];
    if (newStatus && newStatus !== task.status) {
      await this.updateTask(taskId, { status: newStatus }, 'system');
    }

    // Run column automations
    if (toColumn.automations) {
      await this.runColumnAutomations(task, toColumn.automations);
    }

    this.emit('taskMoved', { boardId, taskId, fromColumnId, toColumnId });
  }

  public async addComment(
    taskId: string,
    userId: string,
    text: string,
    mentions?: string[],
    attachments?: string[]
  ): Promise<string> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const comment: TaskComment = {
      id: commentId,
      taskId,
      userId,
      text,
      mentions: mentions || [],
      attachments,
      reactions: [],
      edited: false,
      createdAt: new Date()
    };

    task.comments.push(comment);
    task.updatedAt = new Date();

    // Record activity
    task.activity.push({
      type: 'commented',
      userId,
      timestamp: new Date(),
      details: { commentId }
    });

    // Notify mentioned users
    if (mentions && mentions.length > 0) {
      await this.notifyMentionedUsers(task, comment);
    }

    this.emit('commentAdded', { taskId, comment });
    return commentId;
  }

  public async generateReport(
    projectId: string,
    type: ProjectReport['type'],
    options: {
      period?: { start: Date; end: Date };
      filters?: unknown;
      includeSubprojects?: boolean;
    } = {}
  ): Promise<string> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const reportData = await this.calculateReportData(project, type, options);
    
    const report: ProjectReport = {
      id: reportId,
      projectId,
      type,
      name: `${project.name} - ${type} Report`,
      period: options.period || {
        start: project.timeline.startDate,
        end: new Date()
      },
      data: reportData,
      generatedAt: new Date()
    };

    this.reports.set(reportId, report);
    
    this.emit('reportGenerated', { projectId, report });
    return reportId;
  }

  public async trackTime(
    taskId: string,
    userId: string,
    hours: number,
    date?: Date,
    description?: string
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (!this.config.features.timeTracking) {
      throw new Error('Time tracking not enabled');
    }

    // Update actual hours
    task.actualHours = (task.actualHours || 0) + hours;

    // Record activity
    task.activity.push({
      type: 'time_tracked',
      userId,
      timestamp: new Date(),
      details: {
        hours,
        date: date || new Date(),
        description
      }
    });

    task.updatedAt = new Date();

    // Update sprint capacity if applicable
    const sprint = this.findTaskSprint(task);
    if (sprint) {
      sprint.capacity.completed += hours;
    }

    this.emit('timeTracked', { taskId, userId, hours });
  }

  public async createAutomation(
    projectId: string,
    automation: {
      name: string;
      trigger: {
        type: 'task_created' | 'task_updated' | 'status_changed' | 'comment_added' | 'time';
        conditions?: unknown;
      };
      actions: Array<{
        type: 'update_field' | 'assign_user' | 'send_notification' | 'create_task' | 'webhook';
        config: unknown;
      }>;
      enabled: boolean;
    }
  ): Promise<string> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    if (!this.config.features.automation) {
      throw new Error('Automation not enabled');
    }

    const automationId = `automation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.automationRules.set(automationId, {
      ...automation,
      id: automationId,
      projectId
    });

    this.emit('automationCreated', { projectId, automationId });
    return automationId;
  }

  public getProject(id: string): Project | undefined {
    return this.projects.get(id);
  }

  public getProjects(filters?: {
    status?: Project['status'];
    type?: Project['type'];
    userId?: string;
  }): Project[] {
    let projects = Array.from(this.projects.values());
    
    if (filters?.status) {
      projects = projects.filter(p => p.status === filters.status);
    }
    
    if (filters?.type) {
      projects = projects.filter(p => p.type === filters.type);
    }
    
    if (filters?.userId) {
      projects = projects.filter(p => 
        p.team.some(m => m.userId === filters.userId)
      );
    }
    
    return projects;
  }

  public getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  public getProjectTasks(projectId: string, filters?: unknown): Task[] {
    const project = this.projects.get(projectId);
    if (!project) return [];
    
    let tasks = project.tasks;
    
    if (filters?.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }
    
    if (filters?.assignee) {
      tasks = tasks.filter(t => t.assignees.includes(filters.assignee));
    }
    
    if (filters?.priority) {
      tasks = tasks.filter(t => t.priority === filters.priority);
    }
    
    return tasks;
  }

  public async shutdown(): Promise<void> {
    // Save all projects
    for (const project of this.projects.values()) {
      await this.saveProject(project);
    }

    this.isInitialized = false;
    this.emit('shutdown');
  }

  private async initializeGitIntegration(): Promise<void> {
    // Mock Git integration initialization
  }

  private async loadTemplates(): Promise<void> {
    // Mock template loading
  }

  private startAutomationEngine(): void {
    // Start checking for automation triggers
    setInterval(() => {
      this.processAutomations();
    }, 60000); // Check every minute
  }

  private async applyProjectTemplate(project: Project, templateId: string): Promise<void> {
    const template = this.config.templates.find(t => t.id === templateId);
    if (!template) return;
    
    // Apply template structure
    // Mock implementation
  }

  private validateCustomFields(fields: unknown, projectId: string): void {
    for (const field of this.config.customFields) {
      if (field.required && (!field.projects || field.projects.includes(projectId))) {
        if (!(field.name in fields)) {
          throw new Error(`Required field missing: ${field.name}`);
        }
      }
    }
  }

  private calculateSprintCapacity(project: Project, startDate: Date, endDate: Date): number {
    // Calculate based on team allocation and working days
    const workingDays = this.getWorkingDays(startDate, endDate);
    const totalAllocation = project.team.reduce((sum, member) => sum + member.allocation, 0);
    return workingDays * 8 * (totalAllocation / 100); // 8 hours per day
  }

  private getWorkingDays(startDate: Date, endDate: Date): number {
    // Simple calculation - excludes weekends
    let count = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  private async notifyTaskCreated(task: Task): Promise<void> {
    // Send notifications based on project settings
    const project = this.projects.get(task.projectId);
    if (!project) return;
    
    if (project.settings.notifications.slack && this.config.integrations.communication.slack) {
      // Send Slack notification
    }
    
    if (project.settings.notifications.email) {
      // Send email notification
    }
  }

  private async handleTaskStatusChange(task: Task, oldStatus: string, newStatus: string): Promise<void> {
    // Handle status-specific logic
    if (newStatus === 'done' && !task.completedDate) {
      task.completedDate = new Date();
    } else if (newStatus !== 'done' && task.completedDate) {
      task.completedDate = undefined;
    }
    
    // Update sprint progress
    const sprint = this.findTaskSprint(task);
    if (sprint && task.estimatedHours) {
      if (newStatus === 'done') {
        sprint.capacity.completed += task.estimatedHours;
      } else if (oldStatus === 'done') {
        sprint.capacity.completed -= task.estimatedHours;
      }
    }
  }

  private async handleAssigneeChanges(task: Task, oldAssignees: string[], newAssignees: string[]): Promise<void> {
    const added = newAssignees.filter(a => !oldAssignees.includes(a));
    const _removed = oldAssignees.filter(a => !newAssignees.includes(a)); // eslint-disable-line @typescript-eslint/no-unused-vars
    
    // Notify new assignees
    for (const userId of added) {
      await this.notifyAssignment(task, userId);
    }
  }

  private async runTaskAutomations(task: Task, trigger: string): Promise<void> {
    const automations = Array.from(this.automationRules.values()).filter(a => 
      a.projectId === task.projectId && 
      a.enabled && 
      a.trigger.type === trigger
    );
    
    for (const automation of automations) {
      if (this.checkAutomationConditions(task, automation.trigger.conditions)) {
        await this.executeAutomationActions(task, automation.actions);
      }
    }
  }

  private checkAutomationConditions(_task: Task, _conditions: unknown): boolean { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Check if task matches automation conditions
    return true; // Mock implementation
  }

  private async executeAutomationActions(task: Task, actions: unknown[]): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case 'update_field':
          await this.updateTask(task.id, action.config.updates, 'automation');
          break;
        case 'assign_user':
          await this.updateTask(task.id, { 
            assignees: [...task.assignees, action.config.userId] 
          }, 'automation');
          break;
        case 'send_notification':
          // Send notification
          break;
      }
    }
  }

  private getDefaultColumns(boardType: string): unknown[] {
    const columns: { [key: string]: string[] } = {
      kanban: ['To Do', 'In Progress', 'Review', 'Done'],
      scrum: ['Backlog', 'Sprint', 'In Progress', 'Testing', 'Done']
    };
    
    return (columns[boardType] || columns.kanban).map(name => ({
      id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      tasks: []
    }));
  }

  private async distributeTasksToBoard(board: ProjectBoard, tasks: Task[]): Promise<void> {
    // Distribute tasks to columns based on status
    const statusColumnMap = this.getStatusColumnMapping(board.type);
    
    for (const task of tasks) {
      const columnName = statusColumnMap[task.status];
      const column = board.columns.find(c => c.name === columnName);
      if (column) {
        column.tasks.push(task.id);
      }
    }
  }

  private getColumnStatusMapping(boardType: string): { [column: string]: Task['status'] } {
    const mappings: { [type: string]: unknown } = {
      kanban: {
        'To Do': 'todo',
        'In Progress': 'in-progress',
        'Review': 'review',
        'Done': 'done'
      },
      scrum: {
        'Backlog': 'todo',
        'Sprint': 'todo',
        'In Progress': 'in-progress',
        'Testing': 'testing',
        'Done': 'done'
      }
    };
    
    return mappings[boardType] || mappings.kanban;
  }

  private getStatusColumnMapping(boardType: string): { [status: string]: string } {
    const mapping = this.getColumnStatusMapping(boardType);
    return Object.entries(mapping).reduce((acc, [col, status]) => {
      acc[status] = col;
      return acc;
    }, {} as { [key: string]: string });
  }

  private async runColumnAutomations(task: Task, automations: unknown[]): Promise<void> {
    for (const automation of automations) {
      if (automation.trigger === 'entered') {
        await this.executeAutomationActions(task, [automation.action]);
      }
    }
  }

  private async notifyMentionedUsers(task: Task, comment: TaskComment): Promise<void> {
    for (const userId of comment.mentions) {
      // Send notification
      this.emit('userMentioned', { taskId: task.id, commentId: comment.id, userId });
    }
  }

  private async notifyAssignment(task: Task, userId: string): Promise<void> {
    // Send assignment notification
    this.emit('taskAssigned', { taskId: task.id, userId });
  }

  private findTaskSprint(task: Task): Sprint | undefined {
    const project = this.projects.get(task.projectId);
    if (!project?.sprints) return undefined;
    
    for (const sprintData of project.sprints) {
      const sprint = this.sprints.get(sprintData.id);
      if (sprint?.tasks.includes(task.id)) {
        return sprint;
      }
    }
    
    return undefined;
  }

  private async calculateReportData(project: Project, type: string, options: unknown): Promise<unknown> {
    // Mock report data calculation
    const metrics: unknown = {
      totalTasks: project.tasks.length,
      completedTasks: project.tasks.filter(t => t.status === 'done').length,
      inProgressTasks: project.tasks.filter(t => t.status === 'in-progress').length,
      teamSize: project.team.length
    };
    
    const charts = [];
    const insights = [];
    
    switch (type) {
      case 'burndown':
        charts.push({
          type: 'line',
          data: this.generateBurndownData(project, options.period),
          config: {}
        });
        insights.push('Project is on track to complete on time');
        break;
      
      case 'velocity':
        if (project.sprints) {
          charts.push({
            type: 'bar',
            data: this.generateVelocityData(project),
            config: {}
          });
          insights.push('Team velocity is improving over time');
        }
        break;
    }
    
    return { metrics, charts, insights };
  }

  private generateBurndownData(_project: Project, _period?: unknown): unknown { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Mock burndown data
    return {
      labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'],
      datasets: [{
        label: 'Remaining Work',
        data: [100, 80, 65, 45, 30]
      }]
    };
  }

  private generateVelocityData(project: Project): unknown {
    // Mock velocity data
    return {
      labels: project.sprints?.map(s => s.name) || [],
      datasets: [{
        label: 'Story Points',
        data: [21, 25, 28, 32, 35]
      }]
    };
  }

  private async saveProject(project: Project): Promise<void> {
    // Mock project save
    this.emit('projectSaved', { projectId: project.id });
  }

  private async processAutomations(): Promise<void> {
    // Check time-based automations
    const timeAutomations = Array.from(this.automationRules.values()).filter(a => 
      a.enabled && a.trigger.type === 'time'
    );
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const automation of timeAutomations) {
      // Process time-based automation
    }
  }
}