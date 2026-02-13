/**
 * QuickBooks Sync Manager
 * Handles data synchronization between local and QuickBooks
 */

import { logger } from '../../services/SimpleLogger';
import type { APIClient } from './APIClient';
import type { QuickBooksConfig } from './types';

/**
 * Sync Manager for QuickBooks data synchronization
 */
export class SyncManager {
  private apiClient: APIClient;
  private config: QuickBooksConfig;

  constructor(apiClient: APIClient, config: QuickBooksConfig) {
    this.apiClient = apiClient;
    this.config = config;
  }

  public async syncEntity(entity: string): Promise<void> {
    // Implementation would perform actual sync
    logger.debug(`Syncing ${entity}...`);
  }

  public async syncAll(): Promise<void> {
    const entities = Object.entries(this.config.entities)
      .filter(([_, enabled]) => enabled)
      .map(([entity]) => entity);

    for (const entity of entities) {
      await this.syncEntity(entity);
    }
  }
}
