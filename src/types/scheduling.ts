/**
 * Advanced Scheduling and Cron Types
 * Comprehensive scheduling system with timezone support, recurring patterns, and calendar integration
 */

export interface ScheduledWorkflow {
  id: string;
  workflowId: string;
  name: string;
  description?: string;
  schedule: Schedule;
  enabled: boolean;
  timezone: string;
  nextRun?: Date;
  lastRun?: Date;
  status: ScheduleStatus;
  metadata: ScheduleMetadata;
  executions: ScheduledExecution[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export type ScheduleStatus = 'active' | 'paused' | 'completed' | 'failed' | 'disabled';

export interface Schedule {
  type: ScheduleType;
  pattern: SchedulePattern;
  startDate: Date;
  endDate?: Date;
  exceptions?: ScheduleException[];
  overrides?: ScheduleOverride[];
}

export type ScheduleType = 'cron' | 'interval' | 'calendar' | 'custom' | 'one_time';

export interface SchedulePattern {
  cron?: CronExpression;
  interval?: IntervalPattern;
  calendar?: CalendarPattern;
  custom?: CustomPattern;
  oneTime?: Date;
}

export interface CronExpression {
  expression: string;
  seconds?: string; // 0-59
  minutes: string; // 0-59
  hours: string; // 0-23
  dayOfMonth: string; // 1-31
  month: string; // 1-12 or JAN-DEC
  dayOfWeek: string; // 0-7 or SUN-SAT
  year?: string; // 1970-2099
  description?: string;
}

export interface IntervalPattern {
  interval: number; // milliseconds
  unit: TimeUnit;
  startTime?: Date;
  allowConcurrent: boolean;
  maxConcurrent?: number;
}

export type TimeUnit = 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';

export interface CalendarPattern {
  type: CalendarType;
  workingDays: DayOfWeek[];
  holidays: Holiday[];
  businessHours: BusinessHours;
  events: CalendarEvent[];
}

export type CalendarType = 'business' | 'academic' | 'fiscal' | 'custom';

export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface Holiday {
  name: string;
  date: Date;
  recurring: boolean;
  observance?: 'actual' | 'nearest_weekday' | 'monday';
}

export interface BusinessHours {
  monday?: TimeRange;
  tuesday?: TimeRange;
  wednesday?: TimeRange;
  thursday?: TimeRange;
  friday?: TimeRange;
  saturday?: TimeRange;
  sunday?: TimeRange;
}

export interface TimeRange {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

export interface CalendarEvent {
  id: string;
  name: string;
  date: Date;
  duration: number; // minutes
  recurring?: RecurrenceRule;
  trigger: 'before' | 'after' | 'during';
  offset?: number; // minutes before/after event
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  count?: number;
  until?: Date;
  byDay?: DayOfWeek[];
  byMonth?: number[];
  byMonthDay?: number[];
  bySetPos?: number[];
}

export interface CustomPattern {
  name: string;
  description: string;
  generator: (context: ScheduleContext) => Date | null;
  validator?: (date: Date) => boolean;
}

export interface ScheduleContext {
  lastRun?: Date;
  runCount: number;
  metadata: Record<string, unknown>;
  timezone: string;
}

export interface ScheduleException {
  id: string;
  date: Date;
  reason: string;
  type: 'skip' | 'reschedule';
  rescheduleDate?: Date;
}

export interface ScheduleOverride {
  id: string;
  originalDate: Date;
  newDate: Date;
  reason: string;
  approved: boolean;
  approvedBy?: string;
}

export interface ScheduleMetadata {
  priority: 'low' | 'normal' | 'high' | 'critical';
  maxDuration?: number; // milliseconds
  timeout?: number; // milliseconds
  retryPolicy?: RetryPolicy;
  notifyOnFailure: boolean;
  notifyOnSuccess: boolean;
  notificationChannels: NotificationChannel[];
  tags: string[];
  category?: string;
  dependencies?: ScheduleDependency[];
}

export interface RetryPolicy {
  maxAttempts: number;
  delay: number;
  backoffMultiplier: number;
  maxDelay: number;
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, unknown>;
  recipients: string[];
}

export interface ScheduleDependency {
  type: 'workflow' | 'schedule' | 'external';
  id: string;
  condition: 'success' | 'completion' | 'failure';
  timeout?: number;
}

export interface ScheduledExecution {
  id: string;
  scheduleId: string;
  executionId: string;
  scheduledTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  status: ExecutionStatus;
  result?: ExecutionResult;
  error?: string;
  retryCount: number;
  metadata: Record<string, unknown>;
}

export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'skipped';

export interface ExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  duration: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    network: number;
  };
}

export interface ScheduleWindow {
  id: string;
  name: string;
  type: 'maintenance' | 'blackout' | 'preferred';
  startTime: Date;
  endTime: Date;
  recurring?: RecurrenceRule;
  affectedSchedules: string[]; // schedule IDs
  action: WindowAction;
  priority: number;
}

export type WindowAction = 'block' | 'delay' | 'force' | 'notify';

export interface ScheduleGroup {
  id: string;
  name: string;
  description?: string;
  schedules: string[]; // schedule IDs
  orchestration: OrchestrationRule;
  maxConcurrent?: number;
  priority: number;
  enabled: boolean;
}

export interface OrchestrationRule {
  type: 'sequential' | 'parallel' | 'dependency';
  dependencies?: Array<{
    from: string;
    to: string;
    condition: 'success' | 'completion';
  }>;
  errorHandling: 'stop_all' | 'continue' | 'skip_dependent';
}

export interface ScheduleConflict {
  id: string;
  type: ConflictType;
  schedules: string[];
  description: string;
  severity: 'low' | 'medium' | 'high';
  resolution?: ConflictResolution;
  detectedAt: Date;
  resolvedAt?: Date;
}

export type ConflictType = 'overlap' | 'resource' | 'dependency' | 'window_violation';

export interface ConflictResolution {
  strategy: 'delay' | 'skip' | 'force' | 'manual';
  details: string;
  appliedBy?: string;
}

export interface ScheduleAnalytics {
  scheduleId: string;
  timeRange: { start: Date; end: Date };
  metrics: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    skippedExecutions: number;
    averageDuration: number;
    onTimePercentage: number;
    reliability: number; // success rate
  };
  patterns: {
    peakHours: number[]; // hours of day
    peakDays: DayOfWeek[];
    failurePatterns: FailurePattern[];
  };
  predictions: {
    nextFailureRisk: number; // percentage
    estimatedNextDuration: number;
    resourceRequirements: {
      cpu: number;
      memory: number;
    };
  };
}

export interface FailurePattern {
  type: 'time_based' | 'resource_based' | 'dependency_based';
  description: string;
  occurrences: number;
  lastOccurrence: Date;
  recommendations: string[];
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  schedule: Schedule;
  metadata: ScheduleMetadata;
  popularity: number;
  tags: string[];
  createdBy: string;
  createdAt: Date;
}

export interface ScheduleValidation {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  nextRuns: Date[]; // next 10 predicted runs
  estimatedLoad: {
    peak: number;
    average: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  type: 'performance' | 'conflict' | 'resource';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SchedulingService {
  // Schedule Management
  createSchedule(schedule: Omit<ScheduledWorkflow, 'id' | 'executions' | 'createdAt' | 'updatedAt'>): Promise<ScheduledWorkflow>;
  updateSchedule(scheduleId: string, updates: Partial<ScheduledWorkflow>): Promise<void>;
  deleteSchedule(scheduleId: string): Promise<void>;
  getSchedule(scheduleId: string): Promise<ScheduledWorkflow | null>;
  listSchedules(filters?: ScheduleFilters): Promise<ScheduledWorkflow[]>;
  
  // Execution Control
  enableSchedule(scheduleId: string): Promise<void>;
  disableSchedule(scheduleId: string): Promise<void>;
  pauseSchedule(scheduleId: string, until?: Date): Promise<void>;
  resumeSchedule(scheduleId: string): Promise<void>;
  triggerSchedule(scheduleId: string, options?: TriggerOptions): Promise<ScheduledExecution>;
  
  // Schedule Validation and Prediction
  validateSchedule(schedule: Schedule): Promise<ScheduleValidation>;
  predictNextRuns(scheduleId: string, count: number): Promise<Date[]>;
  checkConflicts(scheduleId: string): Promise<ScheduleConflict[]>;
  
  // Group Management
  createScheduleGroup(group: Omit<ScheduleGroup, 'id'>): Promise<ScheduleGroup>;
  updateScheduleGroup(groupId: string, updates: Partial<ScheduleGroup>): Promise<void>;
  orchestrateGroup(groupId: string): Promise<void>;
  
  // Window Management
  createScheduleWindow(window: Omit<ScheduleWindow, 'id'>): Promise<ScheduleWindow>;
  getActiveWindows(date?: Date): Promise<ScheduleWindow[]>;
  checkWindowViolations(scheduleId: string, date: Date): Promise<boolean>;
  
  // Analytics and Monitoring
  getScheduleAnalytics(scheduleId: string, timeRange: { start: Date; end: Date }): Promise<ScheduleAnalytics>;
  getExecutionHistory(scheduleId: string, limit?: number): Promise<ScheduledExecution[]>;
  getScheduleHealth(scheduleId: string): Promise<{ health: number; issues: string[] }>;
  
  // Templates
  createScheduleTemplate(template: Omit<ScheduleTemplate, 'id' | 'popularity' | 'createdAt'>): Promise<ScheduleTemplate>;
  getScheduleTemplates(category?: string): Promise<ScheduleTemplate[]>;
  applyTemplate(templateId: string, workflowId: string): Promise<ScheduledWorkflow>;
  
  // Timezone Management
  convertToTimezone(date: Date, fromTz: string, toTz: string): Date;
  getSupportedTimezones(): string[];
  detectTimezone(): string;
  
  // Cron Helpers
  parseCronExpression(expression: string): CronExpression;
  validateCronExpression(expression: string): boolean;
  describeCronExpression(expression: string): string;
  generateCronExpression(pattern: Partial<CronExpression>): string;
}

export interface ScheduleFilters {
  workflowId?: string;
  status?: ScheduleStatus[];
  enabled?: boolean;
  timezone?: string;
  tags?: string[];
  category?: string;
  nextRunBefore?: Date;
  nextRunAfter?: Date;
  createdBy?: string;
}

export interface TriggerOptions {
  force?: boolean; // ignore windows and conflicts
  parameters?: Record<string, unknown>;
  skipDependencies?: boolean;
  notifyOnCompletion?: boolean;
}