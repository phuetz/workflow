/**
 * Update Timestamp Service
 * Tracks last update times for various components and data
 */

import React from 'react';
import { eventNotificationService } from './EventNotificationService';
import { logger } from './LoggingService';

export interface TimestampInfo {
  component: string;
  timestamp: Date;
  updateType: string;
  details?: unknown;
}

export class UpdateTimestampService {
  private timestamps: Map<string, TimestampInfo> = new Map();
  private listeners: Map<string, Set<(info: TimestampInfo) => void>> = new Map();
  private globalListeners: Set<(component: string, info: TimestampInfo) => void> = new Set();

  constructor() {
    this.initializeService();
  }

  private initializeService(): void {
    // Load saved timestamps from localStorage
    try {
      const saved = localStorage.getItem('update_timestamps');
      if (saved) {
        const data = JSON.parse(saved);
        Object.entries(data).forEach(([key, value]: [string, Record<string, unknown>]) => {
          this.timestamps.set(key, {
            ...value as TimestampInfo,
            timestamp: new Date(value.timestamp as string)
          });
        });
      }
    } catch (error) {
      logger.error('Failed to load timestamps:', error);
    }

    // Listen to various events to track updates
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Track workflow updates
    eventNotificationService.on('event', (eventData) => {
      switch (eventData.type) {
        case 'workflow_saved':
          this.updateTimestamp('workflow', 'saved', { workflowId: eventData.data.workflowId });
          break;
        case 'workflow_execution_completed':
          this.updateTimestamp('workflow_execution', 'completed', { 
            workflowId: eventData.data.workflowId,
            success: eventData.data.success 
          });
          break;
        case 'node_configuration_updated':
          this.updateTimestamp('node_config', 'updated', { nodeId: eventData.data.nodeId });
          break;
        case 'test_execution_completed':
          this.updateTimestamp('test_execution', 'completed', { testId: eventData.data.testId });
          break;
        case 'app_installed':
          this.updateTimestamp('marketplace', 'app_installed', { appId: eventData.data.appId });
          break;
        case 'credential_saved':
          this.updateTimestamp('credentials', 'saved', { credentialId: eventData.data.credentialId });
          break;
        case 'schedule_updated':
          this.updateTimestamp('schedule', 'updated', { scheduleId: eventData.data.scheduleId });
          break;
      }
    });
  }

  // Update timestamp for a component
  updateTimestamp(component: string, updateType: string = 'update', details?: unknown): void {
    const info: TimestampInfo = {
      component,
      timestamp: new Date(),
      updateType,
      details
    };

    this.timestamps.set(component, info);
    this.persistTimestamps();
    this.notifyListeners(component, info);
  }

  // Get last update time for a component
  getLastUpdate(component: string): Date | null {
    const info = this.timestamps.get(component);
    return info ? info.timestamp : null;
  }

  // Get last update info for a component
  getLastUpdateInfo(component: string): TimestampInfo | null {
    return this.timestamps.get(component) || null;
  }

  // Get formatted time string for display
  getFormattedLastUpdate(component: string, locale?: string): string {
    const info = this.timestamps.get(component);
    if (!info) return 'Never';

    const now = new Date();
    const diff = now.getTime() - info.timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    // Less than 1 minute
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than 1 hour
    if (diff < 3600000) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    
    // Less than 24 hours
    if (diff < 86400000) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    // Less than 7 days
    if (diff < 604800000) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    
    // Default to locale date/time
    return info.timestamp.toLocaleString(locale);
  }

  // Get relative time with auto-refresh
  getRelativeTime(component: string): { text: string; nextUpdate: number } {
    const info = this.timestamps.get(component);
    if (!info) {
      return { text: 'Never', nextUpdate: 60000 };
    }

    const now = new Date();
    const diff = now.getTime() - info.timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (diff < 60000) {
      // Update every second for first minute
      return { text: 'Just now', nextUpdate: 1000 };
    }
    
    if (diff < 3600000) {
      // Update every minute for first hour
      return { 
        text: `${minutes} minute${minutes > 1 ? 's' : ''} ago`, 
        nextUpdate: 60000 
      };
    }
    
    if (diff < 86400000) {
      // Update every hour for first day
      return { 
        text: `${hours} hour${hours > 1 ? 's' : ''} ago`, 
        nextUpdate: 3600000 
      };
    }
    
    // Update daily after that
    return { 
      text: days < 7 ? `${days} day${days > 1 ? 's' : ''} ago` : info.timestamp.toLocaleString(), 
      nextUpdate: 86400000 
    };
  }

  // Subscribe to updates for a specific component
  subscribe(component: string, listener: (info: TimestampInfo) => void): () => void {
    if (!this.listeners.has(component)) {
      this.listeners.set(component, new Set());
    }
    
    this.listeners.get(component)!.add(listener);
    
    // Immediately notify with current value if exists
    const currentInfo = this.timestamps.get(component);
    if (currentInfo) {
      listener(currentInfo);
    }
    
    return () => {
      const listeners = this.listeners.get(component);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(component);
        }
      }
    };
  }

  // Subscribe to all updates
  subscribeToAll(listener: (component: string, info: TimestampInfo) => void): () => void {
    this.globalListeners.add(listener);
    
    // Notify with all current values
    this.timestamps.forEach((info, component) => {
      listener(component, info);
    });
    
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  // Get all timestamps
  getAllTimestamps(): Map<string, TimestampInfo> {
    return new Map(this.timestamps);
  }

  // Clear timestamps for a component
  clearTimestamp(component: string): void {
    this.timestamps.delete(component);
    this.persistTimestamps();
  }

  // Clear all timestamps
  clearAllTimestamps(): void {
    this.timestamps.clear();
    this.persistTimestamps();
  }

  // Get components with recent updates
  getRecentUpdates(maxAge: number = 3600000): TimestampInfo[] {
    const results: TimestampInfo[] = [];
    const now = new Date();
    
    this.timestamps.forEach((info) => {
      if (now.getTime() - info.timestamp.getTime() <= maxAge) {
        results.push(info);
      }
    });
    
    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private notifyListeners(component: string, info: TimestampInfo): void {
    // Notify component-specific listeners
    const componentListeners = this.listeners.get(component);
    if (componentListeners) {
      componentListeners.forEach(listener => {
        try {
          listener(info);
        } catch (error) {
          logger.error('Error in timestamp listener:', error);
        }
      });
    }
    
    // Notify global listeners
    this.globalListeners.forEach(listener => {
      try {
        listener(component, info);
      } catch (error) {
        logger.error('Error in global timestamp listener:', error);
      }
    });
  }

  private persistTimestamps(): void {
    try {
      const data: Record<string, Record<string, unknown>> = {};
      this.timestamps.forEach((info, key) => {
        data[key] = {
          ...info,
          timestamp: info.timestamp.toISOString()
        };
      });
      localStorage.setItem('update_timestamps', JSON.stringify(data));
    } catch (error) {
      logger.error('Failed to persist timestamps:', error);
    }
  }
}

// Singleton instance
export const updateTimestampService = new UpdateTimestampService();

// React hook for using timestamps
export function useUpdateTimestamp(component?: string): { workflowLastUpdate: string } {
  const [timestamp, setTimestamp] = React.useState(() => 
    updateTimestampService.getFormattedLastUpdate(component || 'workflow')
  );
  const [updateTimer, setUpdateTimer] = React.useState<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const componentKey = component || 'workflow';
    
    // Subscribe to timestamp updates
    const unsubscribe = updateTimestampService.subscribe(componentKey, (info) => {
      setTimestamp(updateTimestampService.getFormattedLastUpdate(componentKey));
    });

    // Set up auto-refresh for relative times
    const refreshTimestamp = () => {
      const { text, nextUpdate } = updateTimestampService.getRelativeTime(componentKey);
      setTimestamp(text);
      
      // Schedule next update
      if (updateTimer) clearTimeout(updateTimer);
      const timer = setTimeout(refreshTimestamp, nextUpdate);
      setUpdateTimer(timer);
    };

    refreshTimestamp();

    return () => {
      unsubscribe();
      if (updateTimer) clearTimeout(updateTimer);
    };
  }, [component, updateTimer]);

  return { workflowLastUpdate: timestamp };
}