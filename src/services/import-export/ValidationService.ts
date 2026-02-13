/**
 * Validation Service
 * Handles validation of import/export data
 */

import type {
  WorkflowExport,
  ValidationOptions,
  ImportError,
  ImportWarning,
  WorkflowNode,
  ValidationResult
} from './types';
import { useWorkflowStore } from '../../store/workflowStore';

// Known built-in node types
const BUILT_IN_TYPES = new Set([
  // Triggers
  'trigger', 'webhook', 'schedule', 'email-trigger', 'file-trigger',
  // Actions
  'http', 'email', 'slack', 'discord', 'teams',
  // Data Processing
  'filter', 'transform', 'merge', 'split', 'aggregate', 'sort',
  // Logic
  'if', 'switch', 'loop', 'wait', 'code', 'function',
  // Databases
  'postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch',
  // Cloud
  'aws', 's3', 'lambda', 'sqs', 'dynamodb',
  'gcp', 'azure', 'cloudflare',
  // AI/ML
  'openai', 'anthropic', 'google-ai', 'azure-openai',
  // CRM
  'salesforce', 'hubspot', 'pipedrive', 'zendesk',
  // Project Management
  'jira', 'asana', 'monday', 'clickup', 'linear',
  // Files & Documents
  'google-drive', 'dropbox', 'onedrive', 'pdf', 'csv',
  // Utility
  'start', 'end', 'note', 'comment', 'subworkflow'
]);

// Credential field mappings for known types
const CREDENTIAL_FIELD_MAP: Record<string, string[]> = {
  // API Services
  openai: ['apiKey'],
  anthropic: ['apiKey'],
  'google-ai': ['apiKey'],
  stripe: ['apiKey', 'webhookSecret'],
  twilio: ['accountSid', 'authToken'],
  sendgrid: ['apiKey'],
  mailchimp: ['apiKey'],

  // OAuth Services
  google: ['clientId', 'clientSecret', 'refreshToken'],
  github: ['accessToken'],
  gitlab: ['accessToken'],
  bitbucket: ['username', 'appPassword'],
  slack: ['botToken', 'signingSecret'],
  discord: ['botToken'],
  teams: ['clientId', 'clientSecret', 'tenantId'],

  // Cloud Providers
  aws: ['accessKeyId', 'secretAccessKey', 'region'],
  gcp: ['projectId', 'serviceAccountKey'],
  azure: ['subscriptionId', 'tenantId', 'clientId', 'clientSecret'],
  cloudflare: ['apiToken', 'accountId'],

  // Databases
  postgres: ['host', 'port', 'database', 'user', 'password'],
  mysql: ['host', 'port', 'database', 'user', 'password'],
  mongodb: ['connectionString'],
  redis: ['host', 'port', 'password'],
  elasticsearch: ['host', 'port', 'username', 'password'],

  // CRM & Business
  salesforce: ['clientId', 'clientSecret', 'refreshToken', 'instanceUrl'],
  hubspot: ['apiKey'],
  zendesk: ['subdomain', 'email', 'apiToken'],
  intercom: ['accessToken'],

  // Project Management
  jira: ['host', 'email', 'apiToken'],
  asana: ['accessToken'],
  monday: ['apiKey'],
  clickup: ['apiKey'],
  linear: ['apiKey'],

  // Payment
  paypal: ['clientId', 'clientSecret', 'sandbox'],
  square: ['accessToken', 'locationId'],

  // Communication
  telegram: ['botToken'],
  whatsapp: ['accountSid', 'authToken', 'from'],
  sms: ['accountSid', 'authToken', 'from']
};

export class ValidationService {
  /**
   * Validates import data against the specified options
   */
  async validateImportData(
    data: WorkflowExport,
    options: ValidationOptions
  ): Promise<ValidationResult> {
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];

    // Validate structure
    if (!data.nodes || !Array.isArray(data.nodes)) {
      errors.push({
        type: 'invalid_format',
        message: 'Invalid workflow structure: missing nodes array'
      });
    }

    if (!data.edges || !Array.isArray(data.edges)) {
      errors.push({
        type: 'invalid_format',
        message: 'Invalid workflow structure: missing edges array'
      });
    }

    // Validate node types
    if (options.validateNodeTypes && data.nodes) {
      data.nodes.forEach(node => {
        if (!this.isNodeTypeAvailable(node.type)) {
          warnings.push({
            type: 'missing_optional_field',
            message: `Node type ${node.type} is not available`,
            nodeId: node.id,
            suggestion: 'Install the required integration package'
          });
        }
      });
    }

    // Validate connections
    if (options.validateConnections && data.nodes && data.edges) {
      const nodeIds = new Set(data.nodes.map(n => n.id));
      data.edges.forEach(edge => {
        if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
          errors.push({
            type: 'invalid_connection',
            message: 'Edge references non-existent node',
            field: `${edge.source} -> ${edge.target}`
          });
        }
      });
    }

    return { errors, warnings };
  }

  /**
   * Checks if a node type is available in the current environment
   */
  isNodeTypeAvailable(nodeType: string): boolean {
    // Check built-in types
    if (BUILT_IN_TYPES.has(nodeType.toLowerCase())) {
      return true;
    }

    // Check custom/plugin node types
    if (nodeType.startsWith('custom-') || nodeType.startsWith('plugin-')) {
      const store = useWorkflowStore.getState();
      const customNodes = (store as unknown as { customNodes?: Record<string, unknown> }).customNodes;
      return customNodes ? nodeType in customNodes : false;
    }

    // Default to true for unknown types (may be loaded dynamically)
    return true;
  }

  /**
   * Gets the required fields for a credential type
   */
  getCredentialFields(type: string): string[] {
    return CREDENTIAL_FIELD_MAP[type.toLowerCase()] || ['apiKey', 'apiSecret'];
  }

  /**
   * Extracts unique credential types from nodes
   */
  extractCredentialTypes(nodes: WorkflowNode[]): Set<string> {
    const credentialTypes = new Set<string>();
    nodes.forEach(node => {
      const credentials = (node.data as unknown as { credentials?: Record<string, unknown> }).credentials;
      if (credentials) {
        Object.keys(credentials).forEach(type => credentialTypes.add(type));
      }
    });
    return credentialTypes;
  }
}

export const validationService = new ValidationService();
