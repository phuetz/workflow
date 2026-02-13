/**
 * Workflow Factory
 * Generate test workflows with realistic data
 */

import { PrismaClient, Workflow, WorkflowStatus } from '@prisma/client';
import { NodeData, EdgeData } from '../../src/types/workflow';

const prisma = new PrismaClient();

export interface WorkflowFactoryOptions {
  name?: string;
  description?: string;
  userId?: string;
  teamId?: string;
  nodes?: NodeData[];
  edges?: EdgeData[];
  status?: WorkflowStatus;
  tags?: string[];
  category?: string;
  version?: number;
  settings?: Record<string, unknown>;
}

export class WorkflowFactory {
  private static counter = 0;

  static async create(userId: string, options: WorkflowFactoryOptions = {}): Promise<Workflow> {
    WorkflowFactory.counter++;

    const workflow = await prisma.workflow.create({
      data: {
        name: options.name || `Test Workflow ${WorkflowFactory.counter}`,
        description: options.description || 'Test workflow created by factory',
        userId,
        teamId: options.teamId,
        nodes: options.nodes || WorkflowFactory.getDefaultNodes(),
        edges: options.edges || WorkflowFactory.getDefaultEdges(),
        status: options.status || WorkflowStatus.DRAFT,
        tags: options.tags || ['test'],
        category: options.category || 'test',
        version: options.version || 1,
        settings: options.settings || {}
      }
    });

    return workflow;
  }

  static async createMany(userId: string, count: number, options: WorkflowFactoryOptions = {}): Promise<Workflow[]> {
    const workflows: Workflow[] = [];
    for (let i = 0; i < count; i++) {
      workflows.push(await WorkflowFactory.create(userId, options));
    }
    return workflows;
  }

  static async createActive(userId: string, options: WorkflowFactoryOptions = {}): Promise<Workflow> {
    return WorkflowFactory.create(userId, {
      ...options,
      status: WorkflowStatus.ACTIVE
    });
  }

  static async createDraft(userId: string, options: WorkflowFactoryOptions = {}): Promise<Workflow> {
    return WorkflowFactory.create(userId, {
      ...options,
      status: WorkflowStatus.DRAFT
    });
  }

  static async createPaused(userId: string, options: WorkflowFactoryOptions = {}): Promise<Workflow> {
    return WorkflowFactory.create(userId, {
      ...options,
      status: WorkflowStatus.PAUSED
    });
  }

  static async createArchived(userId: string, options: WorkflowFactoryOptions = {}): Promise<Workflow> {
    return WorkflowFactory.create(userId, {
      ...options,
      status: WorkflowStatus.ARCHIVED
    });
  }

  static async createComplex(userId: string, options: WorkflowFactoryOptions = {}): Promise<Workflow> {
    return WorkflowFactory.create(userId, {
      ...options,
      nodes: WorkflowFactory.getComplexNodes(),
      edges: WorkflowFactory.getComplexEdges()
    });
  }

  static getDefaultNodes(): NodeData[] {
    return [
      {
        id: 'node-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Start',
          nodeType: 'manual',
          config: {}
        }
      },
      {
        id: 'node-2',
        type: 'action',
        position: { x: 300, y: 100 },
        data: {
          label: 'Log',
          nodeType: 'log',
          config: {
            message: 'Test log message'
          }
        }
      }
    ];
  }

  static getDefaultEdges(): EdgeData[] {
    return [
      {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        type: 'default'
      }
    ];
  }

  static getComplexNodes(): NodeData[] {
    return [
      {
        id: 'node-1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Webhook Trigger',
          nodeType: 'webhook',
          config: {
            path: '/webhook/test',
            method: 'POST'
          }
        }
      },
      {
        id: 'node-2',
        type: 'filter',
        position: { x: 300, y: 100 },
        data: {
          label: 'Filter',
          nodeType: 'filter',
          config: {
            condition: '{{$input.value}} > 10'
          }
        }
      },
      {
        id: 'node-3',
        type: 'transform',
        position: { x: 500, y: 50 },
        data: {
          label: 'Transform Data',
          nodeType: 'json-transform',
          config: {
            transformation: 'return { ...data, processed: true }'
          }
        }
      },
      {
        id: 'node-4',
        type: 'action',
        position: { x: 700, y: 50 },
        data: {
          label: 'Send Email',
          nodeType: 'email',
          config: {
            to: 'test@example.com',
            subject: 'Test Email',
            body: 'Test body'
          }
        }
      },
      {
        id: 'node-5',
        type: 'action',
        position: { x: 500, y: 150 },
        data: {
          label: 'Log Error',
          nodeType: 'log',
          config: {
            message: 'Error occurred',
            level: 'error'
          }
        }
      }
    ];
  }

  static getComplexEdges(): EdgeData[] {
    return [
      {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        type: 'default'
      },
      {
        id: 'edge-2',
        source: 'node-2',
        target: 'node-3',
        type: 'success',
        label: 'True'
      },
      {
        id: 'edge-3',
        source: 'node-2',
        target: 'node-5',
        type: 'error',
        label: 'False'
      },
      {
        id: 'edge-4',
        source: 'node-3',
        target: 'node-4',
        type: 'default'
      }
    ];
  }

  static resetCounter(): void {
    WorkflowFactory.counter = 0;
  }
}
