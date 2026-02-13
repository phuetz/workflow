/**
 * TriggerBase - Base class for trigger node implementation
 * Provides common functionality for trigger nodes that start workflows
 */

import {
  INodeExecutionData,
  IDataObject,
  INodeTypeDescription,
  IExecutionContext,
  ICredentialDataDecryptedObject,
} from './NodeInterface';
import { NodeBase } from './NodeBase';

/**
 * Trigger mode types
 */
export enum TriggerMode {
  /** Poll for changes at regular intervals */
  POLL = 'poll',
  /** Listen for webhook events */
  WEBHOOK = 'webhook',
  /** Manual trigger only */
  MANUAL = 'manual',
  /** Schedule-based trigger */
  SCHEDULE = 'schedule',
  /** Event-driven trigger (WebSocket, SSE, etc.) */
  EVENT = 'event',
}

/**
 * Trigger configuration options
 */
export interface ITriggerOptions {
  /** Polling interval in milliseconds (for poll mode) */
  pollInterval?: number;
  /** Webhook path (for webhook mode) */
  webhookPath?: string;
  /** Schedule expression (for schedule mode) */
  scheduleExpression?: string;
  /** Maximum number of items to return per execution */
  maxItems?: number;
  /** Whether to emit initial data on start */
  emitOnStart?: boolean;
}

/**
 * Trigger execution result
 */
export interface ITriggerExecutionResult {
  /** The data to pass to the workflow */
  data: INodeExecutionData[][];
  /** Whether the trigger should continue listening */
  keepListening?: boolean;
  /** Cleanup function to call when trigger is stopped */
  closeFunction?: () => Promise<void>;
}

/**
 * Abstract base class for trigger nodes
 * Extend this class to create custom workflow triggers
 *
 * @example
 * ```typescript
 * export class MyCustomTrigger extends TriggerBase {
 *   description = {
 *     displayName: 'My Custom Trigger',
 *     name: 'myCustomTrigger',
 *     group: ['trigger'],
 *     version: 1,
 *     description: 'Triggers on custom events',
 *     // ... other description properties
 *   };
 *
 *   async trigger(this: IExecutionContext): Promise<ITriggerExecutionResult> {
 *     const items = await this.pollForChanges();
 *     return {
 *       data: [[...items]],
 *       keepListening: true,
 *     };
 *   }
 *
 *   private async pollForChanges(): Promise<INodeExecutionData[]> {
 *     // Implementation
 *     return [];
 *   }
 * }
 * ```
 */
export abstract class TriggerBase extends NodeBase {
  /**
   * Trigger mode - defaults to manual
   */
  protected triggerMode: TriggerMode = TriggerMode.MANUAL;

  /**
   * Trigger options
   */
  protected triggerOptions: ITriggerOptions = {};

  /**
   * Emit callback - set by the execution engine to receive trigger events
   */
  protected onEmit?: (data: INodeExecutionData[]) => void;

  /**
   * Set the emit callback for the trigger
   * @param callback - Function to call when trigger emits data
   */
  setEmitCallback(callback: (data: INodeExecutionData[]) => void): void {
    this.onEmit = callback;
  }

  /**
   * Emit data from the trigger to the workflow
   * @param items - Data items to emit
   */
  protected emit(items: INodeExecutionData[]): void {
    if (this.onEmit && items.length > 0) {
      this.onEmit(items);
    }
  }

  /**
   * Main trigger method - must be implemented by child classes
   * Called when the trigger is activated
   *
   * @param this - Execution context with helper methods
   * @returns Trigger execution result with data and control flags
   */
  abstract trigger(this: IExecutionContext): Promise<ITriggerExecutionResult>;

  /**
   * Execute method (required by NodeBase)
   * For trigger nodes, this delegates to the trigger method
   *
   * @param this - Execution context
   * @returns Array of output data
   */
  async execute(this: IExecutionContext): Promise<INodeExecutionData[][]> {
    // Store reference to trigger method from the class instance
    const triggerMethod = (this as any).constructor.prototype.trigger;
    const result = await triggerMethod.call(this);
    return result.data;
  }

  /**
   * Optional: Webhook handler for webhook-based triggers
   * Override this for webhook triggers
   *
   * @param this - Execution context
   * @returns Webhook response data
   */
  async webhook?(this: IExecutionContext): Promise<any>;

  /**
   * Optional: Poll handler for polling-based triggers
   * Override this for polling triggers
   *
   * @param this - Execution context
   * @returns Polled data
   */
  async poll?(this: IExecutionContext): Promise<INodeExecutionData[][]>;

  /**
   * Optional: Initialize the trigger
   * Called before the trigger starts listening
   *
   * @param this - Execution context
   */
  async initialize?(this: IExecutionContext): Promise<void>;

  /**
   * Optional: Cleanup when trigger is deactivated
   * Called when the workflow is deactivated or deleted
   *
   * @param this - Execution context
   */
  async cleanup?(this: IExecutionContext): Promise<void>;

  /**
   * Set trigger mode
   *
   * @param mode - The trigger mode to use
   */
  protected setTriggerMode(mode: TriggerMode): void {
    this.triggerMode = mode;
  }

  /**
   * Set trigger options
   *
   * @param options - Trigger configuration options
   */
  protected setTriggerOptions(options: ITriggerOptions): void {
    this.triggerOptions = { ...this.triggerOptions, ...options };
  }

  /**
   * Get trigger mode
   *
   * @returns Current trigger mode
   */
  getTriggerMode(): TriggerMode {
    return this.triggerMode;
  }

  /**
   * Get trigger options
   *
   * @returns Current trigger options
   */
  getTriggerOptions(): ITriggerOptions {
    return this.triggerOptions;
  }

  /**
   * Helper: Create webhook response
   *
   * @param statusCode - HTTP status code
   * @param body - Response body
   * @param headers - Response headers
   * @returns Webhook response object
   */
  protected createWebhookResponse(
    statusCode: number = 200,
    body: any = {},
    headers: Record<string, string> = {}
  ): any {
    return {
      statusCode,
      body,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
  }

  /**
   * Helper: Format data as workflow execution data
   *
   * @param items - Raw data items
   * @param pairedItem - Paired item information
   * @returns Formatted node execution data
   */
  protected formatAsExecutionData(
    items: IDataObject[],
    pairedItem?: { item: number }
  ): INodeExecutionData[] {
    return items.map((item, index) => ({
      json: item,
      pairedItem: pairedItem || { item: index },
    }));
  }

  /**
   * Helper: Emit trigger data
   * Creates a trigger result with the given data
   *
   * @param data - Data to emit
   * @param keepListening - Whether to keep trigger active
   * @param closeFunction - Optional cleanup function
   * @returns Trigger execution result
   */
  protected emitData(
    data: INodeExecutionData[][],
    keepListening: boolean = true,
    closeFunction?: () => Promise<void>
  ): ITriggerExecutionResult {
    return {
      data,
      keepListening,
      closeFunction,
    };
  }

  /**
   * Helper: Create a polling trigger
   * Sets up a trigger that polls at regular intervals
   *
   * @param pollFunction - Function to call on each poll
   * @param intervalMs - Polling interval in milliseconds
   * @returns Trigger execution result with cleanup
   */
  protected createPollingTrigger(
    pollFunction: () => Promise<INodeExecutionData[]>,
    intervalMs: number = 60000
  ): ITriggerExecutionResult {
    let intervalHandle: NodeJS.Timeout;
    let isActive = true;

    const poll = async () => {
      if (!isActive) return;

      try {
        const items = await pollFunction();
        if (items.length > 0) {
          // Emit items to the workflow
          this.emit(items);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }

      if (isActive) {
        intervalHandle = setTimeout(poll, intervalMs);
      }
    };

    // Start polling
    poll();

    return {
      data: [[]],
      keepListening: true,
      closeFunction: async () => {
        isActive = false;
        if (intervalHandle) {
          clearTimeout(intervalHandle);
        }
      },
    };
  }

  /**
   * Helper: Validate trigger configuration
   * Override to add custom validation
   *
   * @param config - Node configuration
   * @throws Error if configuration is invalid
   */
  protected validateConfig(config: IDataObject): void {
    // Default validation
    if (this.triggerMode === TriggerMode.POLL && !this.triggerOptions.pollInterval) {
      throw new Error('Poll interval is required for polling triggers');
    }

    if (this.triggerMode === TriggerMode.WEBHOOK && !this.triggerOptions.webhookPath) {
      throw new Error('Webhook path is required for webhook triggers');
    }

    if (this.triggerMode === TriggerMode.SCHEDULE && !this.triggerOptions.scheduleExpression) {
      throw new Error('Schedule expression is required for scheduled triggers');
    }
  }
}

/**
 * Webhook trigger helper class
 * Simplifies creation of webhook-based triggers
 */
export abstract class WebhookTriggerBase extends TriggerBase {
  constructor() {
    super();
    this.setTriggerMode(TriggerMode.WEBHOOK);
  }

  /**
   * Webhook handler - must be implemented
   */
  abstract webhook(this: IExecutionContext): Promise<any>;

  /**
   * Main trigger method for webhooks
   */
  async trigger(this: IExecutionContext): Promise<ITriggerExecutionResult> {
    // Webhook triggers don't emit on trigger() call
    // They emit when webhook endpoint is called
    return {
      data: [[]],
      keepListening: true,
    };
  }
}

/**
 * Polling trigger helper class
 * Simplifies creation of polling-based triggers
 */
export abstract class PollingTriggerBase extends TriggerBase {
  constructor(pollInterval: number = 60000) {
    super();
    this.setTriggerMode(TriggerMode.POLL);
    this.setTriggerOptions({ pollInterval });
  }

  /**
   * Poll handler - must be implemented
   */
  abstract poll(this: IExecutionContext): Promise<INodeExecutionData[][]>;

  /**
   * Main trigger method for polling
   */
  async trigger(this: IExecutionContext): Promise<ITriggerExecutionResult> {
    // Access class instance properties and methods
    const self = this as any;
    const pollInterval = self.triggerOptions?.pollInterval || 60000;
    const createPollingTrigger = self.createPollingTrigger || self.constructor.prototype.createPollingTrigger;
    const pollMethod = self.poll || self.constructor.prototype.poll;

    return createPollingTrigger.call(self, async () => {
      const results = await pollMethod.call(this);
      return results[0] || [];
    }, pollInterval);
  }
}

/**
 * Schedule trigger helper class
 * Simplifies creation of schedule-based triggers
 */
export abstract class ScheduleTriggerBase extends TriggerBase {
  constructor(scheduleExpression: string) {
    super();
    this.setTriggerMode(TriggerMode.SCHEDULE);
    this.setTriggerOptions({ scheduleExpression });
  }

  /**
   * Execute scheduled task - must be implemented
   */
  abstract executeSchedule(this: IExecutionContext): Promise<INodeExecutionData[][]>;

  /**
   * Main trigger method for schedules
   */
  async trigger(this: IExecutionContext): Promise<ITriggerExecutionResult> {
    // Access class instance method
    const self = this as any;
    const executeScheduleMethod = self.executeSchedule || self.constructor.prototype.executeSchedule;
    const data = await executeScheduleMethod.call(this);

    return {
      data,
      keepListening: true,
    };
  }
}

// Export types
export type { INodeExecutionData, IDataObject, IExecutionContext };
