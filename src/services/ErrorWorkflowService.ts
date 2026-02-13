/**
 * Error Workflow Service
 * Manages global error workflows and error workflow triggers
 *
 * Features:
 * - Global error workflow execution on node failure
 * - Error context passing to error workflows
 * - Error workflow templates
 * - Error workflow configuration and management
 */

import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { logger } from '../services/SimpleLogger';
import { ErrorOutputData } from '../execution/ErrorOutputHandler';

export interface ErrorWorkflowContext {
  failedNodeId: string;
  failedNodeType: string;
  failedNodeName: string;
  originalInput?: Record<string, unknown>;
  errorDetails: {
    message: string;
    code?: string;
    stack?: string;
    timestamp: number;
  };
  executionId: string;
  workflowId: string;
  attemptNumber?: number;
  retryInfo?: {
    attempts: number;
    totalRetryTime: number;
  };
}

export interface ErrorWorkflowConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  workflowId: string;
  trigger: {
    type: 'all' | 'specific_nodes' | 'error_codes' | 'node_types';
    nodeIds?: string[];
    errorCodes?: string[];
    nodeTypes?: string[];
  };
  priority: number; // Higher priority executes first
  async: boolean; // Execute asynchronously
  maxExecutionTime?: number;
}

export interface ErrorWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'notification' | 'logging' | 'recovery' | 'escalation';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: string[];
}

export class ErrorWorkflowService {
  private errorWorkflows: Map<string, ErrorWorkflowConfig> = new Map();
  private executionHistory: Map<string, ErrorWorkflowExecution[]> = new Map();
  private templates: ErrorWorkflowTemplate[] = [];

  constructor() {
    this.initializeTemplates();
    logger.info('ErrorWorkflowService initialized');
  }

  /**
   * Register an error workflow
   */
  registerErrorWorkflow(config: ErrorWorkflowConfig): void {
    this.errorWorkflows.set(config.id, config);
    logger.info(`Error workflow registered: ${config.name} (${config.id})`);
  }

  /**
   * Unregister an error workflow
   */
  unregisterErrorWorkflow(workflowId: string): void {
    this.errorWorkflows.delete(workflowId);
    logger.info(`Error workflow unregistered: ${workflowId}`);
  }

  /**
   * Trigger error workflows based on error context
   */
  async triggerErrorWorkflows(
    context: ErrorWorkflowContext
  ): Promise<ErrorWorkflowExecution[]> {
    const executions: ErrorWorkflowExecution[] = [];

    // Find matching error workflows
    const matchingWorkflows = this.findMatchingWorkflows(context);

    if (matchingWorkflows.length === 0) {
      logger.info(`No error workflows matched for node ${context.failedNodeId}`);
      return executions;
    }

    logger.info(`Triggering ${matchingWorkflows.length} error workflows for node ${context.failedNodeId}`);

    // Sort by priority
    matchingWorkflows.sort((a, b) => b.priority - a.priority);

    // Execute workflows
    for (const workflow of matchingWorkflows) {
      try {
        const execution = await this.executeErrorWorkflow(workflow, context);
        executions.push(execution);

        // Store in history
        if (!this.executionHistory.has(workflow.id)) {
          this.executionHistory.set(workflow.id, []);
        }
        this.executionHistory.get(workflow.id)!.push(execution);

        // Limit history size
        const history = this.executionHistory.get(workflow.id)!;
        if (history.length > 100) {
          history.shift();
        }
      } catch (error) {
        logger.error(`Error executing error workflow ${workflow.name}:`, error);
        executions.push({
          workflowId: workflow.id,
          workflowName: workflow.name,
          status: 'failed',
          startTime: Date.now(),
          endTime: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error',
          context
        });
      }
    }

    return executions;
  }

  /**
   * Find workflows that match the error context
   */
  private findMatchingWorkflows(context: ErrorWorkflowContext): ErrorWorkflowConfig[] {
    const matching: ErrorWorkflowConfig[] = [];

    for (const workflow of this.errorWorkflows.values()) {
      if (!workflow.enabled) continue;

      const matches = this.doesWorkflowMatch(workflow, context);
      if (matches) {
        matching.push(workflow);
      }
    }

    return matching;
  }

  /**
   * Check if workflow matches error context
   */
  private doesWorkflowMatch(
    workflow: ErrorWorkflowConfig,
    context: ErrorWorkflowContext
  ): boolean {
    const { trigger } = workflow;

    switch (trigger.type) {
      case 'all':
        return true;

      case 'specific_nodes':
        return trigger.nodeIds?.includes(context.failedNodeId) || false;

      case 'error_codes':
        return trigger.errorCodes?.includes(context.errorDetails.code || '') || false;

      case 'node_types':
        return trigger.nodeTypes?.includes(context.failedNodeType) || false;

      default:
        return false;
    }
  }

  /**
   * Execute an error workflow
   */
  private async executeErrorWorkflow(
    workflow: ErrorWorkflowConfig,
    context: ErrorWorkflowContext
  ): Promise<ErrorWorkflowExecution> {
    const startTime = Date.now();

    logger.info(`Executing error workflow: ${workflow.name}`);

    try {
      // Prepare workflow input data
      const inputData = this.prepareErrorWorkflowInput(context);

      // Execute workflow (this would integrate with WorkflowExecutor)
      // For now, we'll simulate execution
      const result = await this.simulateWorkflowExecution(workflow, inputData);

      const endTime = Date.now();

      return {
        workflowId: workflow.id,
        workflowName: workflow.name,
        status: result.success ? 'success' : 'failed',
        startTime,
        endTime,
        duration: endTime - startTime,
        result: result.data,
        error: result.error,
        context
      };
    } catch (error) {
      const endTime = Date.now();

      return {
        workflowId: workflow.id,
        workflowName: workflow.name,
        status: 'failed',
        startTime,
        endTime,
        duration: endTime - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        context
      };
    }
  }

  /**
   * Prepare input data for error workflow
   */
  private prepareErrorWorkflowInput(context: ErrorWorkflowContext): Record<string, unknown> {
    return {
      error: {
        nodeId: context.failedNodeId,
        nodeType: context.failedNodeType,
        nodeName: context.failedNodeName,
        message: context.errorDetails.message,
        code: context.errorDetails.code,
        stack: context.errorDetails.stack,
        timestamp: context.errorDetails.timestamp
      },
      originalInput: context.originalInput,
      execution: {
        executionId: context.executionId,
        workflowId: context.workflowId,
        attemptNumber: context.attemptNumber
      },
      retry: context.retryInfo,
      metadata: {
        triggeredAt: Date.now(),
        source: 'error_workflow_service'
      }
    };
  }

  /**
   * Simulate workflow execution (placeholder for actual integration)
   */
  private async simulateWorkflowExecution(
    workflow: ErrorWorkflowConfig,
    inputData: Record<string, unknown>
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    // This would integrate with the actual WorkflowExecutor
    // For now, return a simulated success
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            message: 'Error workflow executed successfully',
            input: inputData
          }
        });
      }, 100);
    });
  }

  /**
   * Get error workflow by ID
   */
  getErrorWorkflow(workflowId: string): ErrorWorkflowConfig | undefined {
    return this.errorWorkflows.get(workflowId);
  }

  /**
   * Get all error workflows
   */
  getAllErrorWorkflows(): ErrorWorkflowConfig[] {
    return Array.from(this.errorWorkflows.values());
  }

  /**
   * Get execution history for a workflow
   */
  getExecutionHistory(workflowId: string): ErrorWorkflowExecution[] {
    return this.executionHistory.get(workflowId) || [];
  }

  /**
   * Get all templates
   */
  getTemplates(): ErrorWorkflowTemplate[] {
    return this.templates;
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): ErrorWorkflowTemplate | undefined {
    return this.templates.find(t => t.id === templateId);
  }

  /**
   * Create workflow from template
   */
  createFromTemplate(
    templateId: string,
    config: Partial<ErrorWorkflowConfig>
  ): ErrorWorkflowConfig | null {
    const template = this.getTemplate(templateId);
    if (!template) {
      logger.error(`Template ${templateId} not found`);
      return null;
    }

    const workflowConfig: ErrorWorkflowConfig = {
      id: config.id || `error-workflow-${Date.now()}`,
      name: config.name || template.name,
      description: config.description || template.description,
      enabled: config.enabled ?? true,
      workflowId: config.workflowId || '',
      trigger: config.trigger || {
        type: 'all'
      },
      priority: config.priority ?? 50,
      async: config.async ?? true
    };

    return workflowConfig;
  }

  /**
   * Initialize error workflow templates
   */
  private initializeTemplates(): void {
    // Template 1: Slack Notification
    this.templates.push({
      id: 'slack-notification',
      name: 'Slack Error Notification',
      description: 'Send error notification to Slack channel',
      category: 'notification',
      nodes: [
        {
          id: 'trigger',
          type: 'webhook',
          position: { x: 100, y: 100 },
          data: {
            id: 'trigger',
            type: 'webhook',
            label: 'Error Trigger',
            icon: 'AlertTriangle',
            color: 'bg-red-500',
            inputs: 0,
            outputs: 1,
            position: { x: 100, y: 100 }
          }
        },
        {
          id: 'format-message',
          type: 'function',
          position: { x: 300, y: 100 },
          data: {
            id: 'format-message',
            type: 'function',
            label: 'Format Slack Message',
            icon: 'Code',
            color: 'bg-purple-500',
            inputs: 1,
            outputs: 1,
            position: { x: 300, y: 100 },
            config: {
              code: `
                return {
                  text: \`🚨 *Workflow Error Alert*\`,
                  blocks: [
                    {
                      type: "section",
                      text: {
                        type: "mrkdwn",
                        text: \`*Error in Node:* \${input.error.nodeName} (\${input.error.nodeType})\`
                      }
                    },
                    {
                      type: "section",
                      fields: [
                        { type: "mrkdwn", text: \`*Message:*\\n\${input.error.message}\` },
                        { type: "mrkdwn", text: \`*Workflow:*\\n\${input.execution.workflowId}\` },
                        { type: "mrkdwn", text: \`*Execution:*\\n\${input.execution.executionId}\` },
                        { type: "mrkdwn", text: \`*Time:*\\n\${new Date(input.error.timestamp).toLocaleString()}\` }
                      ]
                    }
                  ]
                };
              `
            }
          }
        },
        {
          id: 'send-slack',
          type: 'slack',
          position: { x: 500, y: 100 },
          data: {
            id: 'send-slack',
            type: 'slack',
            label: 'Send to Slack',
            icon: 'MessageSquare',
            color: 'bg-purple-600',
            inputs: 1,
            outputs: 1,
            position: { x: 500, y: 100 }
          }
        }
      ],
      edges: [
        {
          id: 'e1',
          source: 'trigger',
          target: 'format-message',
          sourceHandle: 'output',
          targetHandle: 'input'
        },
        {
          id: 'e2',
          source: 'format-message',
          target: 'send-slack',
          sourceHandle: 'output',
          targetHandle: 'input'
        }
      ],
      variables: ['SLACK_WEBHOOK_URL', 'SLACK_CHANNEL']
    });

    // Template 2: Jira Ticket Creation
    this.templates.push({
      id: 'jira-ticket',
      name: 'Create Jira Ticket',
      description: 'Create a Jira issue for the error',
      category: 'escalation',
      nodes: [
        {
          id: 'trigger',
          type: 'webhook',
          position: { x: 100, y: 100 },
          data: {
            id: 'trigger',
            type: 'webhook',
            label: 'Error Trigger',
            icon: 'AlertTriangle',
            color: 'bg-red-500',
            inputs: 0,
            outputs: 1,
            position: { x: 100, y: 100 }
          }
        },
        {
          id: 'format-ticket',
          type: 'function',
          position: { x: 300, y: 100 },
          data: {
            id: 'format-ticket',
            type: 'function',
            label: 'Format Jira Ticket',
            icon: 'Code',
            color: 'bg-purple-500',
            inputs: 1,
            outputs: 1,
            position: { x: 300, y: 100 },
            config: {
              code: `
                return {
                  fields: {
                    project: { key: "WORKFLOW" },
                    summary: \`Error in \${input.error.nodeName}: \${input.error.message}\`,
                    description: \`
                      h2. Workflow Error

                      *Node:* \${input.error.nodeName} (\${input.error.nodeType})
                      *Error:* \${input.error.message}
                      *Execution ID:* \${input.execution.executionId}
                      *Workflow ID:* \${input.execution.workflowId}
                      *Timestamp:* \${new Date(input.error.timestamp).toLocaleString()}

                      h3. Stack Trace
                      {code}\${input.error.stack}{code}
                    \`,
                    issuetype: { name: "Bug" },
                    priority: { name: "High" },
                    labels: ["workflow-error", "automated"]
                  }
                };
              `
            }
          }
        },
        {
          id: 'create-jira',
          type: 'jira',
          position: { x: 500, y: 100 },
          data: {
            id: 'create-jira',
            type: 'jira',
            label: 'Create Jira Issue',
            icon: 'CheckSquare',
            color: 'bg-blue-600',
            inputs: 1,
            outputs: 1,
            position: { x: 500, y: 100 }
          }
        }
      ],
      edges: [
        {
          id: 'e1',
          source: 'trigger',
          target: 'format-ticket',
          sourceHandle: 'output',
          targetHandle: 'input'
        },
        {
          id: 'e2',
          source: 'format-ticket',
          target: 'create-jira',
          sourceHandle: 'output',
          targetHandle: 'input'
        }
      ],
      variables: ['JIRA_API_TOKEN', 'JIRA_DOMAIN', 'JIRA_PROJECT_KEY']
    });

    // Template 3: Email Alert
    this.templates.push({
      id: 'email-alert',
      name: 'Email Error Alert',
      description: 'Send error notification via email',
      category: 'notification',
      nodes: [
        {
          id: 'trigger',
          type: 'webhook',
          position: { x: 100, y: 100 },
          data: {
            id: 'trigger',
            type: 'webhook',
            label: 'Error Trigger',
            icon: 'AlertTriangle',
            color: 'bg-red-500',
            inputs: 0,
            outputs: 1,
            position: { x: 100, y: 100 }
          }
        },
        {
          id: 'format-email',
          type: 'function',
          position: { x: 300, y: 100 },
          data: {
            id: 'format-email',
            type: 'function',
            label: 'Format Email',
            icon: 'Code',
            color: 'bg-purple-500',
            inputs: 1,
            outputs: 1,
            position: { x: 300, y: 100 },
            config: {
              code: `
                return {
                  subject: \`[ERROR] Workflow Failure: \${input.error.nodeName}\`,
                  html: \`
                    <h2>Workflow Error Notification</h2>
                    <table>
                      <tr><td><strong>Node:</strong></td><td>\${input.error.nodeName} (\${input.error.nodeType})</td></tr>
                      <tr><td><strong>Error:</strong></td><td>\${input.error.message}</td></tr>
                      <tr><td><strong>Workflow ID:</strong></td><td>\${input.execution.workflowId}</td></tr>
                      <tr><td><strong>Execution ID:</strong></td><td>\${input.execution.executionId}</td></tr>
                      <tr><td><strong>Time:</strong></td><td>\${new Date(input.error.timestamp).toLocaleString()}</td></tr>
                    </table>
                    <h3>Stack Trace</h3>
                    <pre>\${input.error.stack}</pre>
                  \`
                };
              `
            }
          }
        },
        {
          id: 'send-email',
          type: 'email',
          position: { x: 500, y: 100 },
          data: {
            id: 'send-email',
            type: 'email',
            label: 'Send Email',
            icon: 'Mail',
            color: 'bg-red-500',
            inputs: 1,
            outputs: 1,
            position: { x: 500, y: 100 }
          }
        }
      ],
      edges: [
        {
          id: 'e1',
          source: 'trigger',
          target: 'format-email',
          sourceHandle: 'output',
          targetHandle: 'input'
        },
        {
          id: 'e2',
          source: 'format-email',
          target: 'send-email',
          sourceHandle: 'output',
          targetHandle: 'input'
        }
      ],
      variables: ['EMAIL_TO', 'EMAIL_FROM', 'SMTP_HOST']
    });

    // Template 4: Database Logging
    this.templates.push({
      id: 'database-logging',
      name: 'Log to Database',
      description: 'Store error details in database',
      category: 'logging',
      nodes: [
        {
          id: 'trigger',
          type: 'webhook',
          position: { x: 100, y: 100 },
          data: {
            id: 'trigger',
            type: 'webhook',
            label: 'Error Trigger',
            icon: 'AlertTriangle',
            color: 'bg-red-500',
            inputs: 0,
            outputs: 1,
            position: { x: 100, y: 100 }
          }
        },
        {
          id: 'insert-db',
          type: 'postgres',
          position: { x: 300, y: 100 },
          data: {
            id: 'insert-db',
            type: 'postgres',
            label: 'Insert Error Log',
            icon: 'Database',
            color: 'bg-indigo-600',
            inputs: 1,
            outputs: 1,
            position: { x: 300, y: 100 },
            config: {
              operation: 'insert',
              table: 'error_logs',
              data: {
                workflow_id: '{{ $execution.workflowId }}',
                execution_id: '{{ $execution.executionId }}',
                node_id: '{{ $error.nodeId }}',
                node_type: '{{ $error.nodeType }}',
                error_message: '{{ $error.message }}',
                error_code: '{{ $error.code }}',
                stack_trace: '{{ $error.stack }}',
                original_input: '{{ $originalInput }}',
                timestamp: '{{ $error.timestamp }}'
              }
            }
          }
        }
      ],
      edges: [
        {
          id: 'e1',
          source: 'trigger',
          target: 'insert-db',
          sourceHandle: 'output',
          targetHandle: 'input'
        }
      ],
      variables: ['DATABASE_URL']
    });

    // Template 5: PagerDuty Alert
    this.templates.push({
      id: 'pagerduty-alert',
      name: 'Trigger PagerDuty',
      description: 'Create PagerDuty incident for critical errors',
      category: 'escalation',
      nodes: [
        {
          id: 'trigger',
          type: 'webhook',
          position: { x: 100, y: 100 },
          data: {
            id: 'trigger',
            type: 'webhook',
            label: 'Error Trigger',
            icon: 'AlertTriangle',
            color: 'bg-red-500',
            inputs: 0,
            outputs: 1,
            position: { x: 100, y: 100 }
          }
        },
        {
          id: 'format-pagerduty',
          type: 'function',
          position: { x: 300, y: 100 },
          data: {
            id: 'format-pagerduty',
            type: 'function',
            label: 'Format PagerDuty Event',
            icon: 'Code',
            color: 'bg-purple-500',
            inputs: 1,
            outputs: 1,
            position: { x: 300, y: 100 },
            config: {
              code: `
                return {
                  routing_key: process.env.PAGERDUTY_ROUTING_KEY,
                  event_action: "trigger",
                  payload: {
                    summary: \`Workflow Error: \${input.error.nodeName}\`,
                    severity: "error",
                    source: "workflow-automation",
                    custom_details: {
                      node_id: input.error.nodeId,
                      node_type: input.error.nodeType,
                      error_message: input.error.message,
                      workflow_id: input.execution.workflowId,
                      execution_id: input.execution.executionId
                    }
                  }
                };
              `
            }
          }
        },
        {
          id: 'send-pagerduty',
          type: 'httpRequest',
          position: { x: 500, y: 100 },
          data: {
            id: 'send-pagerduty',
            type: 'httpRequest',
            label: 'Send to PagerDuty',
            icon: 'Send',
            color: 'bg-green-600',
            inputs: 1,
            outputs: 1,
            position: { x: 500, y: 100 },
            config: {
              method: 'POST',
              url: 'https://events.pagerduty.com/v2/enqueue',
              body: '{{ $json }}',
              headers: {
                'Content-Type': 'application/json'
              }
            }
          }
        }
      ],
      edges: [
        {
          id: 'e1',
          source: 'trigger',
          target: 'format-pagerduty',
          sourceHandle: 'output',
          targetHandle: 'input'
        },
        {
          id: 'e2',
          source: 'format-pagerduty',
          target: 'send-pagerduty',
          sourceHandle: 'output',
          targetHandle: 'input'
        }
      ],
      variables: ['PAGERDUTY_ROUTING_KEY']
    });

    logger.info(`Initialized ${this.templates.length} error workflow templates`);
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalWorkflows: number;
    enabledWorkflows: number;
    totalExecutions: number;
    successRate: number;
  } {
    let totalExecutions = 0;
    let successfulExecutions = 0;

    this.executionHistory.forEach(executions => {
      executions.forEach(exec => {
        totalExecutions++;
        if (exec.status === 'success') {
          successfulExecutions++;
        }
      });
    });

    const enabledWorkflows = Array.from(this.errorWorkflows.values()).filter(
      w => w.enabled
    ).length;

    return {
      totalWorkflows: this.errorWorkflows.size,
      enabledWorkflows,
      totalExecutions,
      successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0
    };
  }
}

export interface ErrorWorkflowExecution {
  workflowId: string;
  workflowName: string;
  status: 'success' | 'failed' | 'timeout';
  startTime: number;
  endTime: number;
  duration?: number;
  result?: unknown;
  error?: string;
  context: ErrorWorkflowContext;
}

// Export singleton instance
export const errorWorkflowService = new ErrorWorkflowService();
