/**
 * Hierarchical Agents Pattern
 *
 * Multi-level hierarchy with managers coordinating subordinate agents
 */

import { Agent, AgentInput, AgentOutput } from '../../types/agents';
import { InterAgentCommunication } from '../InterAgentCommunication';
import { AgenticPatternExecutor } from '../AgenticWorkflowEngine';
import { logger } from '../../services/SimpleLogger';

export class HierarchicalPattern implements AgenticPatternExecutor {
  constructor(private communication: InterAgentCommunication) {}

  async execute(
    agents: Agent[],
    input: AgentInput,
    options?: {
      maxIterations?: number;
      timeoutMs?: number;
      failurePolicy?: 'fail-fast' | 'continue' | 'retry';
    }
  ): Promise<AgentOutput> {
    logger.info(`Hierarchical pattern: Building hierarchy with ${agents.length} agents`);

    // Build hierarchy: first agent is top manager
    const hierarchy = this.buildHierarchy(agents);

    // Execute from top to bottom
    return this.executeHierarchy(hierarchy, input, options);
  }

  private buildHierarchy(agents: Agent[]): HierarchyNode {
    if (agents.length === 1) {
      return { agent: agents[0], subordinates: [] };
    }

    // Top manager
    const manager = agents[0];
    const remaining = agents.slice(1);

    // Split remaining agents into teams
    const teamSize = Math.ceil(remaining.length / 2);
    const subordinates = [];

    if (remaining.length > 0) {
      const team1 = remaining.slice(0, teamSize);
      if (team1.length > 0) {
        subordinates.push(this.buildHierarchy(team1));
      }

      const team2 = remaining.slice(teamSize);
      if (team2.length > 0) {
        subordinates.push(this.buildHierarchy(team2));
      }
    }

    return { agent: manager, subordinates };
  }

  private async executeHierarchy(
    node: HierarchyNode,
    input: AgentInput,
    options?: {
      maxIterations?: number;
      timeoutMs?: number;
      failurePolicy?: 'fail-fast' | 'continue' | 'retry';
    }
  ): Promise<AgentOutput> {
    // Execute subordinates first (bottom-up)
    const subordinateResults = await Promise.all(
      node.subordinates.map(sub => this.executeHierarchy(sub, input, options))
    );

    // Execute current agent with subordinate results
    const task = {
      id: `task_hierarchy_${node.agent.id}`,
      agentId: node.agent.id,
      type: 'execute' as const,
      input: {
        ...input,
        data: subordinateResults.length > 0
          ? {
              ...input.data as object,
              subordinateResults: subordinateResults.map(r => r.result),
            }
          : input.data,
        context: {
          ...input.context,
          hierarchyLevel: this.getLevel(node),
          subordinateCount: node.subordinates.length,
        },
      },
      status: 'pending' as const,
      priority: 'medium' as const,
      createdAt: new Date().toISOString(),
      metadata: { pattern: 'hierarchical' },
      retryCount: 0,
      maxRetries: 0,
    };

    const result = await node.agent.executeTask(task);

    return {
      ...result,
      metadata: {
        ...result.metadata,
        pattern: 'hierarchical',
        subordinateResults,
        iterations: 1,
        totalCost: 0,
        cacheHits: 0,
        parallelization: node.subordinates.length || 1,
      },
    };
  }

  private getLevel(node: HierarchyNode, level = 0): number {
    if (node.subordinates.length === 0) return level;
    return Math.max(...node.subordinates.map(sub => this.getLevel(sub, level + 1)));
  }
}

interface HierarchyNode {
  agent: Agent;
  subordinates: HierarchyNode[];
}
