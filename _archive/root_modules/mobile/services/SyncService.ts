import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { SyncQueueItem } from '../types';
import ApiClient from './ApiClient';

const SYNC_QUEUE_KEY = 'sync_queue';
const LAST_SYNC_KEY = 'last_sync_time';
const BACKGROUND_SYNC_TASK = 'background-sync-task';

class SyncService {
  private syncInProgress = false;

  async initialize() {
    await this.registerBackgroundTask();
  }

  // Add item to sync queue
  async queueSync(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const queue = await this.getSyncQueue();
    const syncItem: SyncQueueItem = {
      ...item,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    queue.push(syncItem);
    await this.saveSyncQueue(queue);
  }

  // Get sync queue
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    try {
      const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return queueStr ? JSON.parse(queueStr) : [];
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  }

  // Save sync queue
  private async saveSyncQueue(queue: SyncQueueItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  // Process sync queue
  async processQueue(): Promise<void> {
    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return;
    }

    if (!ApiClient.getIsOnline()) {
      console.log('Device offline, skipping sync');
      return;
    }

    this.syncInProgress = true;

    try {
      const queue = await this.getSyncQueue();
      console.log(`Processing ${queue.length} sync items`);

      const remainingQueue: SyncQueueItem[] = [];

      for (const item of queue) {
        try {
          await this.processSyncItem(item);
          console.log(`Synced item ${item.id}`);
        } catch (error) {
          console.error(`Error syncing item ${item.id}:`, error);

          // Retry logic
          if (item.retryCount < 5) {
            remainingQueue.push({
              ...item,
              retryCount: item.retryCount + 1,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          } else {
            console.error(`Item ${item.id} failed after 5 retries, discarding`);
          }
        }
      }

      await this.saveSyncQueue(remainingQueue);
      await this.updateLastSyncTime();

      console.log(`Sync complete. ${remainingQueue.length} items remaining in queue`);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    const { type, entity, data } = item;

    if (entity === 'workflow') {
      if (type === 'create') {
        await ApiClient.post('/workflows', data);
      } else if (type === 'update') {
        const { id, ...updates } = data as { id: string };
        await ApiClient.put(`/workflows/${id}`, updates);
      } else if (type === 'delete') {
        const { id } = data as { id: string };
        await ApiClient.delete(`/workflows/${id}`);
      } else if (type === 'execute') {
        const { id, executeData } = data as { id: string; executeData?: unknown };
        await ApiClient.post(`/workflows/${id}/execute`, { data: executeData });
      }
    } else if (entity === 'execution') {
      if (type === 'delete') {
        const { id } = data as { id: string };
        await ApiClient.delete(`/executions/${id}`);
      }
    }
  }

  // Background sync task
  private async registerBackgroundTask() {
    try {
      // Define the background task
      TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
        try {
          console.log('Background sync task running');
          await this.processQueue();
          return BackgroundFetch.BackgroundFetchResult.NewData;
        } catch (error) {
          console.error('Background sync error:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });

      // Register the background fetch task
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('Background sync task registered');
    } catch (error) {
      console.error('Error registering background task:', error);
    }
  }

  async unregisterBackgroundTask() {
    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      console.log('Background sync task unregistered');
    } catch (error) {
      console.error('Error unregistering background task:', error);
    }
  }

  // Utilities
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async updateLastSyncTime(): Promise<void> {
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  }

  async getLastSyncTime(): Promise<string | null> {
    return AsyncStorage.getItem(LAST_SYNC_KEY);
  }

  async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
  }

  getQueueLength(): Promise<number> {
    return this.getSyncQueue().then((queue) => queue.length);
  }

  isSyncing(): boolean {
    return this.syncInProgress;
  }
}

export default new SyncService();
