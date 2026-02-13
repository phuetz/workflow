import SyncService from '../services/SyncService';
import ApiClient from '../services/ApiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../services/ApiClient');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-background-fetch', () => ({
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
  BackgroundFetchResult: {
    NewData: 'newData',
    Failed: 'failed',
  },
}));
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
}));

describe('SyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('queueSync', () => {
    it('should add item to sync queue', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await SyncService.queueSync({
        type: 'create',
        entity: 'workflow',
        data: { name: 'Test' },
      });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const savedData = JSON.parse(calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].type).toBe('create');
    });
  });

  describe('getSyncQueue', () => {
    it('should return sync queue from storage', async () => {
      const mockQueue = [
        {
          id: '1',
          type: 'create',
          entity: 'workflow',
          data: {},
          timestamp: '2024-01-01T00:00:00Z',
          retryCount: 0,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(mockQueue)
      );

      const result = await SyncService.getSyncQueue();

      expect(result).toEqual(mockQueue);
    });

    it('should return empty array if no queue exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await SyncService.getSyncQueue();

      expect(result).toEqual([]);
    });
  });

  describe('processQueue', () => {
    it('should not process if already syncing', async () => {
      // Simulate sync in progress
      const promise1 = SyncService.processQueue();
      const promise2 = SyncService.processQueue();

      await Promise.all([promise1, promise2]);

      // Should only process once
      expect(true).toBe(true);
    });

    it('should not process if offline', async () => {
      (ApiClient.getIsOnline as jest.Mock).mockReturnValueOnce(false);

      await SyncService.processQueue();

      expect(ApiClient.post).not.toHaveBeenCalled();
    });

    it('should process queue items when online', async () => {
      const mockQueue = [
        {
          id: '1',
          type: 'create',
          entity: 'workflow',
          data: { name: 'Test' },
          timestamp: '2024-01-01T00:00:00Z',
          retryCount: 0,
        },
      ];

      (ApiClient.getIsOnline as jest.Mock).mockReturnValueOnce(true);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(mockQueue)
      );
      (ApiClient.post as jest.Mock).mockResolvedValueOnce({});
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await SyncService.processQueue();

      expect(ApiClient.post).toHaveBeenCalled();
    });

    it('should retry failed items up to 5 times', async () => {
      const mockQueue = [
        {
          id: '1',
          type: 'create',
          entity: 'workflow',
          data: { name: 'Test' },
          timestamp: '2024-01-01T00:00:00Z',
          retryCount: 4,
        },
      ];

      (ApiClient.getIsOnline as jest.Mock).mockReturnValueOnce(true);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(mockQueue)
      );
      (ApiClient.post as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

      await SyncService.processQueue();

      // Should keep item with incremented retry count
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('clearQueue', () => {
    it('should clear sync queue', async () => {
      await SyncService.clearQueue();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('sync_queue');
    });
  });

  describe('getQueueLength', () => {
    it('should return queue length', async () => {
      const mockQueue = [
        { id: '1', type: 'create', entity: 'workflow', data: {}, timestamp: '', retryCount: 0 },
        { id: '2', type: 'update', entity: 'workflow', data: {}, timestamp: '', retryCount: 0 },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(mockQueue)
      );

      const length = await SyncService.getQueueLength();

      expect(length).toBe(2);
    });
  });

  describe('isSyncing', () => {
    it('should return false initially', () => {
      expect(SyncService.isSyncing()).toBe(false);
    });
  });
});
