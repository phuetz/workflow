import { logger } from '../../../services/LoggingService';
/**
 * Database Repositories - Central Export
 * All repositories are exported from this file for easy import
 */

export { UserRepository, userRepository } from './UserRepository';
export { WorkflowRepository, workflowRepository } from './WorkflowRepository';
export { ExecutionRepository, executionRepository } from './ExecutionRepository';
export { CredentialRepository, credentialRepository } from './CredentialRepository';
export { WebhookRepository, webhookRepository } from './WebhookRepository';
export { AnalyticsRepository, analyticsRepository } from './AnalyticsRepository';

// Export types
export type {
  CreateUserInput,
  UpdateUserInput,
  UserFilter,
} from './UserRepository';

export type {
  CreateWorkflowInput,
  UpdateWorkflowInput,
  WorkflowFilter,
} from './WorkflowRepository';

export type {
  CreateExecutionInput,
  UpdateExecutionInput,
  CreateNodeExecutionInput,
  UpdateNodeExecutionInput,
  ExecutionWithNodes,
} from './ExecutionRepository';

export type {
  CreateCredentialInput,
  UpdateCredentialInput,
  DecryptedCredential,
} from './CredentialRepository';

export type {
  CreateWebhookInput,
  UpdateWebhookInput,
  CreateWebhookEventInput,
  UpdateWebhookEventInput,
  WebhookWithEvents,
} from './WebhookRepository';

export type {
  CreateWorkflowAnalyticsInput,
  CreateSystemMetricsInput,
  CreateAuditLogInput,
  CreateNotificationInput,
} from './AnalyticsRepository';

/**
 * Repository Manager
 * Provides centralized access to all repositories
 */
export class RepositoryManager {
  constructor(
    public user = userRepository,
    public workflow = workflowRepository,
    public execution = executionRepository,
    public credential = credentialRepository,
    public webhook = webhookRepository,
    public analytics = analyticsRepository
  ) {}

  /**
   * Health check for all repositories
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const checks = {
      database: false,
      user: false,
      workflow: false,
      execution: false,
      credential: false,
      webhook: false,
      analytics: false,
    };

    try {
      // Database connectivity
      const { checkDatabaseHealth } = await import('../prisma');
      checks.database = await checkDatabaseHealth();

      // Individual repository checks
      checks.user = (await this.user.count()) >= 0;
      checks.workflow = (await this.workflow.getStatistics()).total >= 0;
      checks.execution = (await this.execution.getStatistics()).total >= 0;
      checks.credential = (await this.credential.getStatistics()).total >= 0;
      checks.webhook = true; // Simple check
      checks.analytics = true; // Simple check
    } catch (error) {
      logger.error('Repository health check failed:', error);
    }

    return checks;
  }
}

// Singleton instance
export const repositoryManager = new RepositoryManager();
export default repositoryManager;
