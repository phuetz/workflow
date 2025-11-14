/**
 * Wait Node
 * Pause workflow execution for time delays or external events (n8n-like)
 */

export type WaitMode =
  | 'fixedDelay'
  | 'specificDate'
  | 'webhook'
  | 'formSubmission'
  | 'approval'
  | 'condition';

export interface WaitConfig {
  mode: WaitMode;

  // Fixed delay
  delay?: {
    amount: number;
    unit: 'seconds' | 'minutes' | 'hours' | 'days';
  };

  // Specific date
  date?: string | Date;

  // Webhook
  webhook?: {
    path: string;
    httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
    responseMode: 'onReceived' | 'lastBeforeExecution';
    responseData?: any;
  };

  // Form submission
  form?: {
    fields: FormField[];
    submitButtonText?: string;
    title?: string;
    description?: string;
  };

  // Approval
  approval?: {
    approvers: string[];
    requireAll?: boolean;
    message?: string;
    timeout?: number;
  };

  // Condition
  condition?: {
    expression: string;
    checkInterval?: number; // Check every X seconds
    timeout?: number; // Max wait time
  };

  // Resume options
  resume?: {
    timeout?: number; // Max wait time in ms
    timeoutBehavior?: 'error' | 'continue' | 'skip';
    onTimeout?: any; // Data to pass on timeout
  };
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

export interface WaitExecution {
  id: string;
  workflowId: string;
  executionId: string;
  nodeId: string;
  config: WaitConfig;
  status: 'waiting' | 'resumed' | 'timeout' | 'cancelled';
  createdAt: string;
  resumeAt?: string;
  resumedAt?: string;
  resumeData?: any;
  resumeUrl?: string;
  approvals?: Array<{
    approver: string;
    decision: 'approved' | 'rejected';
    timestamp: string;
    comment?: string;
  }>;
}

class WaitNodeManager {
  private waitingExecutions: Map<string, WaitExecution> = new Map();
  private checkInterval?: NodeJS.Timeout;

  constructor() {
    this.startTimeoutChecker();
    this.loadFromStorage();
  }

  /**
   * Start waiting
   */
  async wait(
    workflowId: string,
    executionId: string,
    nodeId: string,
    config: WaitConfig
  ): Promise<WaitExecution> {
    const waitId = this.generateWaitId();

    const execution: WaitExecution = {
      id: waitId,
      workflowId,
      executionId,
      nodeId,
      config,
      status: 'waiting',
      createdAt: new Date().toISOString(),
      resumeUrl: this.generateResumeUrl(waitId)
    };

    // Calculate resume time for time-based waits
    if (config.mode === 'fixedDelay' && config.delay) {
      const resumeAt = this.calculateResumeTime(config.delay);
      execution.resumeAt = resumeAt.toISOString();
    } else if (config.mode === 'specificDate' && config.date) {
      execution.resumeAt = new Date(config.date).toISOString();
    }

    this.waitingExecutions.set(waitId, execution);
    this.saveToStorage();

    return execution;
  }

  /**
   * Resume execution
   */
  async resume(waitId: string, data?: any): Promise<WaitExecution> {
    const execution = this.waitingExecutions.get(waitId);

    if (!execution) {
      throw new Error(`Wait execution not found: ${waitId}`);
    }

    if (execution.status !== 'waiting') {
      throw new Error(`Execution already ${execution.status}`);
    }

    execution.status = 'resumed';
    execution.resumedAt = new Date().toISOString();
    execution.resumeData = data;

    this.waitingExecutions.set(waitId, execution);
    this.saveToStorage();

    return execution;
  }

  /**
   * Cancel waiting
   */
  async cancel(waitId: string): Promise<void> {
    const execution = this.waitingExecutions.get(waitId);

    if (!execution) {
      throw new Error(`Wait execution not found: ${waitId}`);
    }

    execution.status = 'cancelled';
    this.waitingExecutions.set(waitId, execution);
    this.saveToStorage();
  }

  /**
   * Handle approval
   */
  async handleApproval(
    waitId: string,
    approver: string,
    decision: 'approved' | 'rejected',
    comment?: string
  ): Promise<WaitExecution> {
    const execution = this.waitingExecutions.get(waitId);

    if (!execution) {
      throw new Error(`Wait execution not found: ${waitId}`);
    }

    if (!execution.approvals) {
      execution.approvals = [];
    }

    execution.approvals.push({
      approver,
      decision,
      timestamp: new Date().toISOString(),
      comment
    });

    // Check if all approvals are in
    if (execution.config.approval) {
      const { approvers, requireAll } = execution.config.approval;
      const approvedCount = execution.approvals.filter(a => a.decision === 'approved').length;
      const rejectedCount = execution.approvals.filter(a => a.decision === 'rejected').length;

      if (requireAll) {
        // Need all approvers
        if (approvedCount === approvers.length) {
          return this.resume(waitId, { approved: true, approvals: execution.approvals });
        } else if (rejectedCount > 0) {
          return this.resume(waitId, { approved: false, approvals: execution.approvals });
        }
      } else {
        // Need at least one approval
        if (approvedCount > 0) {
          return this.resume(waitId, { approved: true, approvals: execution.approvals });
        } else if (execution.approvals.length === approvers.length) {
          return this.resume(waitId, { approved: false, approvals: execution.approvals });
        }
      }
    }

    this.waitingExecutions.set(waitId, execution);
    this.saveToStorage();

    return execution;
  }

  /**
   * Check for timeouts
   */
  private async checkTimeouts(): Promise<void> {
    const now = Date.now();

    for (const [waitId, execution] of this.waitingExecutions) {
      if (execution.status !== 'waiting') continue;

      // Check time-based resume
      if (execution.resumeAt) {
        const resumeTime = new Date(execution.resumeAt).getTime();
        if (now >= resumeTime) {
          await this.resume(waitId, { timeout: false });
        }
      }

      // Check timeout
      if (execution.config.resume?.timeout) {
        const createdTime = new Date(execution.createdAt).getTime();
        const timeoutTime = createdTime + execution.config.resume.timeout;

        if (now >= timeoutTime) {
          execution.status = 'timeout';

          if (execution.config.resume.timeoutBehavior === 'continue') {
            await this.resume(waitId, execution.config.resume.onTimeout || { timeout: true });
          }

          this.waitingExecutions.set(waitId, execution);
          this.saveToStorage();
        }
      }
    }
  }

  /**
   * Get waiting execution
   */
  getExecution(waitId: string): WaitExecution | undefined {
    return this.waitingExecutions.get(waitId);
  }

  /**
   * List waiting executions
   */
  listWaiting(filters?: {
    workflowId?: string;
    executionId?: string;
    status?: WaitExecution['status'];
  }): WaitExecution[] {
    let executions = Array.from(this.waitingExecutions.values());

    if (filters?.workflowId) {
      executions = executions.filter(e => e.workflowId === filters.workflowId);
    }

    if (filters?.executionId) {
      executions = executions.filter(e => e.executionId === filters.executionId);
    }

    if (filters?.status) {
      executions = executions.filter(e => e.status === filters.status);
    }

    return executions.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Calculate resume time from delay
   */
  private calculateResumeTime(delay: WaitConfig['delay']): Date {
    if (!delay) return new Date();

    const now = new Date();
    let ms = 0;

    switch (delay.unit) {
      case 'seconds':
        ms = delay.amount * 1000;
        break;
      case 'minutes':
        ms = delay.amount * 60 * 1000;
        break;
      case 'hours':
        ms = delay.amount * 60 * 60 * 1000;
        break;
      case 'days':
        ms = delay.amount * 24 * 60 * 60 * 1000;
        break;
    }

    return new Date(now.getTime() + ms);
  }

  /**
   * Generate wait ID
   */
  private generateWaitId(): string {
    return `wait_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate resume URL
   */
  private generateResumeUrl(waitId: string): string {
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:3000';
    return `${baseUrl}/api/workflows/resume/${waitId}`;
  }

  /**
   * Start timeout checker
   */
  private startTimeoutChecker(): void {
    this.checkInterval = setInterval(() => {
      this.checkTimeouts();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Stop timeout checker
   */
  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const data = Array.from(this.waitingExecutions.entries());
        localStorage.setItem('wait-executions', JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save wait executions:', error);
      }
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem('wait-executions');
        if (stored) {
          const data = JSON.parse(stored);
          this.waitingExecutions = new Map(data);
        }
      } catch (error) {
        console.error('Failed to load wait executions:', error);
      }
    }
  }

  /**
   * Clear completed executions
   */
  clearCompleted(): void {
    for (const [waitId, execution] of this.waitingExecutions) {
      if (execution.status !== 'waiting') {
        this.waitingExecutions.delete(waitId);
      }
    }
    this.saveToStorage();
  }
}

// Singleton instance
export const waitNodeManager = new WaitNodeManager();

/**
 * Wait Node Type Definition
 */
export const WaitNodeType = {
  type: 'wait',
  category: 'Flow Control',
  label: 'Wait',
  icon: '⏱️',
  color: '#9333ea',
  description: 'Pause execution for time or external event',

  inputs: [
    { name: 'input', type: 'any', required: true }
  ],

  outputs: [
    { name: 'output', type: 'any' }
  ],

  settings: [
    {
      key: 'mode',
      label: 'Wait Mode',
      type: 'select',
      default: 'fixedDelay',
      options: [
        { label: 'Fixed Delay', value: 'fixedDelay' },
        { label: 'Specific Date', value: 'specificDate' },
        { label: 'Webhook', value: 'webhook' },
        { label: 'Form Submission', value: 'formSubmission' },
        { label: 'Approval', value: 'approval' },
        { label: 'Condition', value: 'condition' }
      ]
    },
    {
      key: 'delayAmount',
      label: 'Delay Amount',
      type: 'number',
      default: 1,
      showIf: (config: any) => config.mode === 'fixedDelay'
    },
    {
      key: 'delayUnit',
      label: 'Delay Unit',
      type: 'select',
      default: 'minutes',
      options: [
        { label: 'Seconds', value: 'seconds' },
        { label: 'Minutes', value: 'minutes' },
        { label: 'Hours', value: 'hours' },
        { label: 'Days', value: 'days' }
      ],
      showIf: (config: any) => config.mode === 'fixedDelay'
    },
    {
      key: 'date',
      label: 'Resume Date & Time',
      type: 'datetime',
      showIf: (config: any) => config.mode === 'specificDate'
    },
    {
      key: 'webhookPath',
      label: 'Webhook Path',
      type: 'text',
      placeholder: '/resume/{{$execution.id}}',
      showIf: (config: any) => config.mode === 'webhook'
    },
    {
      key: 'approvers',
      label: 'Approvers (emails)',
      type: 'text',
      placeholder: 'user1@example.com, user2@example.com',
      showIf: (config: any) => config.mode === 'approval'
    },
    {
      key: 'requireAllApprovals',
      label: 'Require All Approvals',
      type: 'boolean',
      default: false,
      showIf: (config: any) => config.mode === 'approval'
    },
    {
      key: 'timeoutMinutes',
      label: 'Timeout (minutes)',
      type: 'number',
      default: 0,
      description: '0 = no timeout'
    }
  ],

  execute: async (config: any, inputs: any, context: any) => {
    const waitConfig: WaitConfig = {
      mode: config.mode,
      resume: {
        timeout: config.timeoutMinutes ? config.timeoutMinutes * 60 * 1000 : undefined,
        timeoutBehavior: 'continue'
      }
    };

    // Configure based on mode
    switch (config.mode) {
      case 'fixedDelay':
        waitConfig.delay = {
          amount: config.delayAmount,
          unit: config.delayUnit
        };
        break;

      case 'specificDate':
        waitConfig.date = config.date;
        break;

      case 'webhook':
        waitConfig.webhook = {
          path: config.webhookPath,
          httpMethod: 'POST',
          responseMode: 'onReceived'
        };
        break;

      case 'approval':
        waitConfig.approval = {
          approvers: config.approvers.split(',').map((e: string) => e.trim()),
          requireAll: config.requireAllApprovals,
          message: config.approvalMessage
        };
        break;
    }

    // Start waiting
    const execution = await waitNodeManager.wait(
      context.workflowId,
      context.executionId,
      context.nodeId,
      waitConfig
    );

    // Return wait info
    return [{
      json: {
        waitId: execution.id,
        mode: config.mode,
        resumeUrl: execution.resumeUrl,
        resumeAt: execution.resumeAt,
        status: 'waiting'
      }
    }];
  }
};

/**
 * Resume execution endpoint helper
 */
export async function handleResumeRequest(
  waitId: string,
  data?: any
): Promise<WaitExecution> {
  return waitNodeManager.resume(waitId, data);
}

/**
 * Approval form component helper
 */
export function generateApprovalForm(execution: WaitExecution): string {
  const { approval } = execution.config;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Approval Required</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          .approval-form { background: #f9fafb; padding: 30px; border-radius: 8px; }
          button { padding: 12px 24px; margin: 10px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; }
          .approve { background: #10b981; color: white; }
          .reject { background: #ef4444; color: white; }
        </style>
      </head>
      <body>
        <div class="approval-form">
          <h1>Approval Required</h1>
          <p>${approval?.message || 'Please review and approve or reject this workflow execution.'}</p>
          <div>
            <button class="approve" onclick="handleDecision('approved')">Approve</button>
            <button class="reject" onclick="handleDecision('rejected')">Reject</button>
          </div>
        </div>
        <script>
          function handleDecision(decision) {
            fetch('${execution.resumeUrl}', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ decision })
            }).then(() => {
              document.body.innerHTML = '<h1>Thank you for your response!</h1>';
            });
          }
        </script>
      </body>
    </html>
  `;
}
