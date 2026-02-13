import { EventEmitter } from 'events';
import { userService } from './UserService';

export interface ActivityEvent {
  id: string;
  action: string;
  user: string;
  userId: string;
  timestamp: string;
  icon: string;
  details?: unknown;
  category: 'workflow' | 'node' | 'execution' | 'integration' | 'system' | 'user';
}

class ActivityService extends EventEmitter {
  private activities: ActivityEvent[] = [];
  private maxActivities = 1000;

  constructor() {
    super();
    this.subscribeToEvents();
  }

  private subscribeToEvents(): void {
    // Listen to workflow store events
    if (typeof window !== 'undefined') {
      // Browser environment - we'll hook into store changes
      this.setupStoreListeners();
    }
  }

  private setupStoreListeners(): void {
    // This would be called from the store when actions happen
    // For now, we'll provide methods that components can call
  }

  logActivity(
    action: string,
    category: ActivityEvent['category'],
    icon: string,
    details?: unknown
  ): void {
    const currentUser = userService.getCurrentUser();
    const activity: ActivityEvent = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      user: currentUser?.name || 'System',
      userId: currentUser?.id || 'system',
      timestamp: new Date().toISOString(),
      icon,
      category,
      details
    };

    this.activities.unshift(activity);
    
    // Trim old activities
    if (this.activities.length > this.maxActivities) {
      this.activities = this.activities.slice(0, this.maxActivities);
    }

    this.emit('activityLogged', activity);
  }

  // Convenience methods for common activities
  logWorkflowCreated(workflowName: string): void {
    this.logActivity(
      `Created workflow "${workflowName}"`,
      'workflow',
      'Plus',
      { workflowName }
    );
  }

  logWorkflowUpdated(workflowName: string): void {
    this.logActivity(
      `Updated workflow "${workflowName}"`,
      'workflow',
      'Edit',
      { workflowName }
    );
  }

  logWorkflowExecuted(workflowName: string, status: 'success' | 'error'): void {
    this.logActivity(
      `Executed workflow "${workflowName}" - ${status}`,
      'execution',
      status === 'success' ? 'CheckCircle' : 'AlertCircle',
      { workflowName, status }
    );
  }

  logWorkflowImported(workflowName: string, nodeCount: number): void {
    this.logActivity(
      `Imported workflow "${workflowName}" with ${nodeCount} nodes`,
      'workflow',
      'Upload',
      { workflowName, nodeCount }
    );
  }

  logNodeAdded(nodeType: string, nodeLabel?: string): void {
    this.logActivity(
      `Added ${nodeLabel || nodeType} node`,
      'node',
      'Plus',
      { nodeType, nodeLabel }
    );
  }

  logNodeConfigured(nodeType: string, nodeLabel?: string): void {
    this.logActivity(
      `Configured ${nodeLabel || nodeType} node`,
      'node',
      'Settings',
      { nodeType, nodeLabel }
    );
  }

  logNodeDeleted(nodeType: string, nodeLabel?: string): void {
    this.logActivity(
      `Deleted ${nodeLabel || nodeType} node`,
      'node',
      'Trash',
      { nodeType, nodeLabel }
    );
  }

  logIntegrationAdded(integration: string): void {
    this.logActivity(
      `Added ${integration} integration`,
      'integration',
      'Link',
      { integration }
    );
  }

  logSystemBackup(): void {
    this.logActivity(
      'System backup completed',
      'system',
      'Archive',
      { timestamp: new Date().toISOString() }
    );
  }

  logUserLogin(userName: string): void {
    this.logActivity(
      `${userName} logged in`,
      'user',
      'LogIn',
      { userName }
    );
  }

  logUserLogout(userName: string): void {
    this.logActivity(
      `${userName} logged out`,
      'user',
      'LogOut',
      { userName }
    );
  }

  getRecentActivities(limit: number = 10): ActivityEvent[] {
    return this.activities.slice(0, limit);
  }

  getActivitiesByCategory(category: ActivityEvent['category'], limit?: number): ActivityEvent[] {
    const filtered = this.activities.filter(a => a.category === category);
    return limit ? filtered.slice(0, limit) : filtered;
  }

  getActivitiesByUser(userId: string, limit?: number): ActivityEvent[] {
    const filtered = this.activities.filter(a => a.userId === userId);
    return limit ? filtered.slice(0, limit) : filtered;
  }

  getActivitiesInTimeRange(startTime: Date, endTime: Date): ActivityEvent[] {
    return this.activities.filter(a => {
      const activityTime = new Date(a.timestamp);
      return activityTime >= startTime && activityTime <= endTime;
    });
  }

  formatTimestamp(timestamp: string): string {
    const activityTime = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - activityTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return activityTime.toLocaleDateString();
  }

  clearActivities(): void {
    this.activities = [];
    this.emit('activitiesCleared');
  }

  exportActivities(): string {
    return JSON.stringify(this.activities, null, 2);
  }
}

export const activityService = new ActivityService();