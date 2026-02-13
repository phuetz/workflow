/**
 * Agent Customizer for AI Copilot Studio
 *
 * No-code agent customization providing:
 * 1. Skill selection and configuration
 * 2. Permission management
 * 3. Constraint definition
 * 4. Quick deployment (<30 seconds)
 * 5. Testing and validation
 */

import { AgentSkill, AgentConfiguration } from './types/copilot';
import { logger } from '../services/SimpleLogger';

/**
 * Agent customizer for no-code agent creation
 */
export class AgentCustomizer {
  private availableSkills: AgentSkill[];
  private configurations: Map<string, AgentConfiguration> = new Map();

  constructor() {
    this.availableSkills = this.initializeSkills();
  }

  /**
   * Get all available skills
   */
  getAvailableSkills(category?: AgentSkill['category']): AgentSkill[] {
    if (category) {
      return this.availableSkills.filter(s => s.category === category);
    }
    return this.availableSkills;
  }

  /**
   * Create new agent configuration
   */
  async createAgent(
    name: string,
    description: string,
    skillIds: string[]
  ): Promise<AgentConfiguration> {
    const id = this.generateId();

    // Validate skills
    const skills = this.availableSkills.filter(s => skillIds.includes(s.id));
    if (skills.length !== skillIds.length) {
      throw new Error('Some skills not found');
    }

    // Aggregate permissions
    const permissions = [...new Set(skills.flatMap(s => s.permissions))];

    const config: AgentConfiguration = {
      id,
      name,
      description,
      skills: skillIds,
      parameters: {},
      permissions,
      constraints: {},
      createdAt: new Date(),
      lastModified: new Date(),
      deploymentStatus: 'draft'
    };

    this.configurations.set(id, config);

    logger.info(`Created agent configuration: ${name} (${id})`);

    return config;
  }

  /**
   * Update agent configuration
   */
  async updateAgent(
    id: string,
    updates: Partial<AgentConfiguration>
  ): Promise<AgentConfiguration> {
    const config = this.configurations.get(id);

    if (!config) {
      throw new Error(`Agent configuration not found: ${id}`);
    }

    const updated = {
      ...config,
      ...updates,
      lastModified: new Date()
    };

    this.configurations.set(id, updated);

    logger.info(`Updated agent configuration: ${id}`);

    return updated;
  }

  /**
   * Configure skill parameters
   */
  async configureSkill(
    agentId: string,
    skillId: string,
    parameters: Record<string, any>
  ): Promise<void> {
    const config = this.configurations.get(agentId);

    if (!config) {
      throw new Error(`Agent configuration not found: ${agentId}`);
    }

    if (!config.skills.includes(skillId)) {
      throw new Error(`Skill ${skillId} not enabled for agent ${agentId}`);
    }

    config.parameters[skillId] = parameters;
    config.lastModified = new Date();

    this.configurations.set(agentId, config);

    logger.info(`Configured skill ${skillId} for agent ${agentId}`);
  }

  /**
   * Add constraint to agent
   */
  async addConstraint(
    agentId: string,
    constraint: keyof AgentConfiguration['constraints'],
    value: any
  ): Promise<void> {
    const config = this.configurations.get(agentId);

    if (!config) {
      throw new Error(`Agent configuration not found: ${agentId}`);
    }

    config.constraints[constraint] = value;
    config.lastModified = new Date();

    this.configurations.set(agentId, config);

    logger.info(`Added constraint ${constraint} to agent ${agentId}`);
  }

  /**
   * Test agent configuration
   */
  async testAgent(agentId: string): Promise<{
    success: boolean;
    errors: string[];
    warnings: string[];
    estimatedDeploymentTime: number;
  }> {
    const config = this.configurations.get(agentId);

    if (!config) {
      throw new Error(`Agent configuration not found: ${agentId}`);
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate skills
    if (config.skills.length === 0) {
      errors.push('Agent must have at least one skill');
    }

    // Validate permissions
    if (config.permissions.length === 0) {
      warnings.push('Agent has no permissions');
    }

    // Validate parameters
    for (const skillId of config.skills) {
      const skill = this.availableSkills.find(s => s.id === skillId);
      if (!skill) continue;

      const requiredParams = skill.parameters.filter(p => p.required);
      const configuredParams = config.parameters[skillId] || {};

      for (const param of requiredParams) {
        if (!(param.name in configuredParams)) {
          errors.push(`Missing required parameter: ${param.name} for skill ${skill.name}`);
        }
      }
    }

    // Estimate deployment time
    const estimatedDeploymentTime = 10 + config.skills.length * 3; // seconds

    // Update status
    if (errors.length === 0) {
      config.deploymentStatus = 'testing';
      this.configurations.set(agentId, config);
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
      estimatedDeploymentTime
    };
  }

  /**
   * Deploy agent
   */
  async deployAgent(agentId: string): Promise<{
    success: boolean;
    deploymentTime: number;
    agentUrl?: string;
    errors?: string[];
  }> {
    const startTime = Date.now();

    // Test first
    const testResult = await this.testAgent(agentId);

    if (!testResult.success) {
      return {
        success: false,
        deploymentTime: 0,
        errors: testResult.errors
      };
    }

    const config = this.configurations.get(agentId)!;

    // Simulate deployment
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate deployment delay

    // Update status
    config.deploymentStatus = 'deployed';
    config.lastModified = new Date();
    this.configurations.set(agentId, config);

    const deploymentTime = (Date.now() - startTime) / 1000;

    logger.info(`Deployed agent ${agentId} in ${deploymentTime}s`);

    return {
      success: true,
      deploymentTime,
      agentUrl: `/api/agents/${agentId}`
    };
  }

  /**
   * Get agent configuration
   */
  getAgent(agentId: string): AgentConfiguration | undefined {
    return this.configurations.get(agentId);
  }

  /**
   * List all agent configurations
   */
  listAgents(filter?: {
    status?: AgentConfiguration['deploymentStatus'];
  }): AgentConfiguration[] {
    let configs = Array.from(this.configurations.values());

    if (filter?.status) {
      configs = configs.filter(c => c.deploymentStatus === filter.status);
    }

    return configs;
  }

  /**
   * Delete agent configuration
   */
  async deleteAgent(agentId: string): Promise<void> {
    const config = this.configurations.get(agentId);

    if (!config) {
      throw new Error(`Agent configuration not found: ${agentId}`);
    }

    if (config.deploymentStatus === 'deployed') {
      throw new Error('Cannot delete deployed agent. Undeploy first.');
    }

    this.configurations.delete(agentId);

    logger.info(`Deleted agent configuration: ${agentId}`);
  }

  /**
   * Initialize available skills
   */
  private initializeSkills(): AgentSkill[] {
    return [
      // Workflow skills
      {
        id: 'workflow-creation',
        name: 'Workflow Creation',
        description: 'Create workflows from natural language',
        category: 'workflow',
        enabled: true,
        parameters: [],
        permissions: ['workflow:create'],
        costImpact: 'medium'
      },
      {
        id: 'workflow-optimization',
        name: 'Workflow Optimization',
        description: 'Optimize existing workflows for performance and cost',
        category: 'workflow',
        enabled: true,
        parameters: [],
        permissions: ['workflow:read', 'workflow:update'],
        costImpact: 'low'
      },

      // Data skills
      {
        id: 'data-transformation',
        name: 'Data Transformation',
        description: 'Transform and process data',
        category: 'data',
        enabled: true,
        parameters: [
          {
            name: 'transformationType',
            type: 'string',
            required: true,
            description: 'Type of transformation (map, filter, reduce, etc.)'
          }
        ],
        permissions: ['data:read', 'data:write'],
        costImpact: 'low'
      },
      {
        id: 'data-validation',
        name: 'Data Validation',
        description: 'Validate data against schemas',
        category: 'data',
        enabled: true,
        parameters: [],
        permissions: ['data:read'],
        costImpact: 'none'
      },

      // Integration skills
      {
        id: 'api-integration',
        name: 'API Integration',
        description: 'Connect to external APIs',
        category: 'integration',
        enabled: true,
        parameters: [
          {
            name: 'apiEndpoint',
            type: 'string',
            required: true,
            description: 'API endpoint URL'
          },
          {
            name: 'authMethod',
            type: 'string',
            required: false,
            defaultValue: 'none',
            description: 'Authentication method'
          }
        ],
        permissions: ['api:call'],
        costImpact: 'high'
      },
      {
        id: 'database-integration',
        name: 'Database Integration',
        description: 'Connect to databases',
        category: 'integration',
        enabled: true,
        parameters: [
          {
            name: 'databaseType',
            type: 'string',
            required: true,
            description: 'Database type (postgres, mysql, mongodb, etc.)'
          }
        ],
        permissions: ['database:read', 'database:write'],
        costImpact: 'medium'
      },

      // Analysis skills
      {
        id: 'log-analysis',
        name: 'Log Analysis',
        description: 'Analyze workflow logs',
        category: 'analysis',
        enabled: true,
        parameters: [],
        permissions: ['logs:read'],
        costImpact: 'low'
      },
      {
        id: 'performance-analysis',
        name: 'Performance Analysis',
        description: 'Analyze workflow performance',
        category: 'analysis',
        enabled: true,
        parameters: [],
        permissions: ['metrics:read'],
        costImpact: 'low'
      },

      // Automation skills
      {
        id: 'scheduling',
        name: 'Scheduling',
        description: 'Schedule workflow execution',
        category: 'automation',
        enabled: true,
        parameters: [
          {
            name: 'schedule',
            type: 'string',
            required: true,
            description: 'Cron expression or schedule description'
          }
        ],
        permissions: ['schedule:create'],
        costImpact: 'none'
      },
      {
        id: 'error-handling',
        name: 'Error Handling',
        description: 'Handle workflow errors',
        category: 'automation',
        enabled: true,
        parameters: [],
        permissions: ['workflow:update'],
        costImpact: 'none'
      }
    ];
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Singleton instance
 */
export const agentCustomizer = new AgentCustomizer();
