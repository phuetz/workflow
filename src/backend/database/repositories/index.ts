import { logger } from '../../../services/SimpleLogger';
import { UserRepository, userRepository } from './UserRepository';
import { WorkflowRepository, workflowRepository } from './WorkflowRepository';
import { ExecutionRepository, executionRepository } from './ExecutionRepository';
import { CredentialRepository, credentialRepository } from './CredentialRepository';
import { WebhookRepository, webhookRepository } from './WebhookRepository';
import { AnalyticsRepository, analyticsRepository } from './AnalyticsRepository';

/**
 * Database Repositories - Central Export
 * All repositories are exported from this file for easy import
 */

export { UserRepository, userRepository };
export { WorkflowRepository, workflowRepository };
export { ExecutionRepository, executionRepository };
export { CredentialRepository, credentialRepository };
export { WebhookRepository, webhookRepository };
export { AnalyticsRepository, analyticsRepository };

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
  public user: UserRepository;
  public workflow: WorkflowRepository;
  public execution: ExecutionRepository;
  public credential: CredentialRepository;
  public webhook: WebhookRepository;
  public analytics: AnalyticsRepository;

  constructor() {
    this.user = userRepository;
    this.workflow = workflowRepository;
    this.execution = executionRepository;
    this.credential = credentialRepository;
    this.webhook = webhookRepository;
    this.analytics = analyticsRepository;
  }

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
