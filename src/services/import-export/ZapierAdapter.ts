/**
 * Zapier Format Adapter
 * Handles conversion between internal format and Zapier format
 */

import type { WorkflowExport, WorkflowNode, WorkflowEdge, FormatConverter } from './types';

// Zapier specific types
interface ZapierTrigger {
  id: string;
  type: string;
  options: Record<string, unknown>;
}

interface ZapierAction {
  id: string;
  type: string;
  options: Record<string, unknown>;
}

interface ZapierWorkflow {
  name: string;
  description?: string;
  triggers: ZapierTrigger[];
  actions: ZapierAction[];
  enabled: boolean;
  zap_meta?: Record<string, unknown>;
}

export class ZapierAdapter {
  /**
   * Creates the Zapier format converter
   */
  createConverter(): FormatConverter {
    return {
      fromFormat: 'json',
      toFormat: 'zapier',
      convert: (data) => this.convertToZapierFormat(data as WorkflowExport),
      validate: (data) => this.validateZapierFormat(data)
    };
  }

  /**
   * Creates the Zapier to JSON converter
   */
  createReverseConverter(): FormatConverter {
    return {
      fromFormat: 'zapier',
      toFormat: 'json',
      convert: (data) => this.convertFromZapierFormat(data as ZapierWorkflow),
      validate: (data) => this.validateZapierFormat(data)
    };
  }

  /**
   * Converts internal workflow format to Zapier format
   */
  convertToZapierFormat(workflow: WorkflowExport): ZapierWorkflow {
    const triggers = workflow.nodes.filter(n => this.isTriggerNode(n.type));
    const actions = workflow.nodes.filter(n => !this.isTriggerNode(n.type));

    return {
      name: workflow.name,
      description: workflow.description,
      triggers: triggers.map(t => ({
        id: t.id,
        type: this.mapToZapierType(t.type),
        options: t.data as Record<string, unknown>
      })),
      actions: actions.map(a => ({
        id: a.id,
        type: this.mapToZapierType(a.type),
        options: a.data as Record<string, unknown>
      })),
      enabled: true,
      zap_meta: {
        exportedFrom: 'workflow-platform',
        version: workflow.version
      }
    };
  }

  /**
   * Converts Zapier format to internal workflow format
   */
  convertFromZapierFormat(zapierWorkflow: ZapierWorkflow): WorkflowExport {
    const nodes: WorkflowNode[] = [];
    const edges: WorkflowEdge[] = [];

    // Convert triggers
    zapierWorkflow.triggers.forEach((trigger, index) => {
      nodes.push({
        id: trigger.id,
        type: this.mapFromZapierType(trigger.type, true),
        position: { x: 100, y: 100 + index * 150 },
        data: {
          label: trigger.type,
          ...trigger.options
        }
      });
    });

    // Convert actions and create edges
    let prevId = zapierWorkflow.triggers[0]?.id;
    zapierWorkflow.actions.forEach((action, index) => {
      nodes.push({
        id: action.id,
        type: this.mapFromZapierType(action.type, false),
        position: { x: 400 + index * 300, y: 100 },
        data: {
          label: action.type,
          ...action.options
        }
      });

      // Create edge from previous node
      if (prevId) {
        edges.push({
          id: `${prevId}-${action.id}`,
          source: prevId,
          target: action.id,
          sourceHandle: 'output',
          targetHandle: 'input'
        });
      }
      prevId = action.id;
    });

    return {
      id: `imported-${Date.now()}`,
      name: zapierWorkflow.name,
      description: zapierWorkflow.description || '',
      version: '1.0.0',
      exportedAt: new Date(),
      exportedBy: 'zapier-import',
      format: 'json',
      metadata: {
        workflowId: '',
        executionId: '',
        startTime: new Date()
      },
      nodes,
      edges,
      checksum: ''
    };
  }

  /**
   * Validates Zapier format
   */
  validateZapierFormat(data: unknown): boolean {
    const obj = data as { triggers?: unknown; actions?: unknown; zap_meta?: unknown };
    return !!(obj && (obj.triggers || obj.actions || obj.zap_meta));
  }

  /**
   * Checks if a node type is a trigger
   */
  private isTriggerNode(type: string): boolean {
    const triggerTypes = [
      'trigger', 'webhook', 'schedule', 'email-trigger', 'file-trigger',
      'cron', 'manual', 'poll', 'event'
    ];
    return triggerTypes.some(t => type.toLowerCase().includes(t));
  }

  /**
   * Maps internal type to Zapier type
   */
  private mapToZapierType(type: string): string {
    const typeMap: Record<string, string> = {
      'webhook': 'webhooks',
      'schedule': 'schedule',
      'email': 'email',
      'slack': 'slack',
      'http': 'webhooks',
      'google-sheets': 'google_sheets',
      'google-drive': 'google_drive',
      'dropbox': 'dropbox',
      'github': 'github',
      'gmail': 'gmail',
      'mailchimp': 'mailchimp',
      'stripe': 'stripe',
      'salesforce': 'salesforce',
      'hubspot': 'hubspot',
      'trello': 'trello',
      'asana': 'asana',
      'jira': 'jira',
      'notion': 'notion',
      'airtable': 'airtable'
    };

    return typeMap[type.toLowerCase()] || type;
  }

  /**
   * Maps Zapier type to internal type
   */
  private mapFromZapierType(type: string, isTrigger: boolean): string {
    const typeMap: Record<string, string> = {
      'webhooks': 'webhook',
      'schedule': 'schedule',
      'email': 'email',
      'slack': 'slack',
      'google_sheets': 'google-sheets',
      'google_drive': 'google-drive',
      'dropbox': 'dropbox',
      'github': 'github',
      'gmail': 'gmail',
      'mailchimp': 'mailchimp',
      'stripe': 'stripe',
      'salesforce': 'salesforce',
      'hubspot': 'hubspot',
      'trello': 'trello',
      'asana': 'asana',
      'jira': 'jira',
      'notion': 'notion',
      'airtable': 'airtable'
    };

    const mappedType = typeMap[type.toLowerCase()] || type;
    return isTrigger && !mappedType.includes('trigger') ? `${mappedType}-trigger` : mappedType;
  }
}

export const zapierAdapter = new ZapierAdapter();
