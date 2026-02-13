/**
 * Agent Identity Manager - Agent IAM System
 * Complete identity and access management for AI agents
 */

import { EventEmitter } from 'events';
import type {
  AgentIdentity,
  AgentPermission,
  AgentCredential,
} from './types/governance';

/**
 * Agent Identity Manager - Manages agent identities, permissions, and credentials
 */
export class AgentIdentityManager extends EventEmitter {
  private identities: Map<string, AgentIdentity> = new Map();
  private credentials: Map<string, AgentCredential[]> = new Map();
  private rolePermissions: Map<string, string[]> = new Map();

  constructor() {
    super();
    this.initializeDefaultRoles();

    // Cleanup expired credentials periodically
    setInterval(() => this.cleanupExpiredCredentials(), 60 * 60 * 1000); // Hourly
  }

  // ============================================================================
  // Identity Management
  // ============================================================================

  /**
   * Register a new agent identity
   */
  registerAgent(identity: Omit<AgentIdentity, 'id' | 'createdAt' | 'updatedAt'>): AgentIdentity {
    const agent: AgentIdentity = {
      ...identity,
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
    };

    this.identities.set(agent.id, agent);
    this.emit('agent:registered', { agentId: agent.id, agent });

    return agent;
  }

  /**
   * Update agent identity
   */
  updateAgent(agentId: string, updates: Partial<AgentIdentity>): void {
    const agent = this.identities.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const updated = {
      ...agent,
      ...updates,
      updatedAt: new Date(),
    };

    this.identities.set(agentId, updated);
    this.emit('agent:updated', { agentId, agent: updated });
  }

  /**
   * Suspend agent
   */
  suspendAgent(agentId: string, reason?: string): void {
    this.updateAgent(agentId, { status: 'suspended' });
    this.emit('agent:suspended', { agentId, reason });
  }

  /**
   * Revoke agent access
   */
  revokeAgent(agentId: string, reason?: string): void {
    this.updateAgent(agentId, { status: 'revoked' });
    this.revokeAllCredentials(agentId);
    this.emit('agent:revoked', { agentId, reason });
  }

  /**
   * Get agent identity
   */
  getAgent(agentId: string): AgentIdentity | undefined {
    return this.identities.get(agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents(): AgentIdentity[] {
    return Array.from(this.identities.values());
  }

  /**
   * Get agents by status
   */
  getAgentsByStatus(status: AgentIdentity['status']): AgentIdentity[] {
    return this.getAllAgents().filter(a => a.status === status);
  }

  // ============================================================================
  // Permission Management
  // ============================================================================

  /**
   * Initialize default roles
   */
  private initializeDefaultRoles(): void {
    this.rolePermissions.set('admin', [
      'workflow:create', 'workflow:read', 'workflow:update', 'workflow:delete', 'workflow:execute',
      'credential:create', 'credential:read', 'credential:update', 'credential:delete',
      'agent:create', 'agent:read', 'agent:update', 'agent:delete',
      'system:admin',
    ]);

    this.rolePermissions.set('developer', [
      'workflow:create', 'workflow:read', 'workflow:update', 'workflow:execute',
      'credential:read', 'credential:use',
      'agent:read',
    ]);

    this.rolePermissions.set('executor', [
      'workflow:read', 'workflow:execute',
      'credential:use',
    ]);

    this.rolePermissions.set('viewer', [
      'workflow:read',
      'agent:read',
    ]);
  }

  /**
   * Grant permission to agent
   */
  grantPermission(
    agentId: string,
    resource: string,
    actions: string[],
    grantedBy: string,
    scope: 'global' | 'team' | 'user' = 'global',
    constraints?: Record<string, any>,
    expiresAt?: Date
  ): void {
    const agent = this.identities.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const permission: AgentPermission = {
      resource,
      actions,
      scope,
      constraints,
      grantedAt: new Date(),
      grantedBy,
      expiresAt,
    };

    agent.permissions.push(permission);
    this.updateAgent(agentId, { permissions: agent.permissions });

    this.emit('permission:granted', { agentId, permission });
  }

  /**
   * Revoke permission
   */
  revokePermission(agentId: string, resource: string, actions: string[]): void {
    const agent = this.identities.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.permissions = agent.permissions.filter(
      p => !(p.resource === resource && actions.every(a => p.actions.includes(a)))
    );

    this.updateAgent(agentId, { permissions: agent.permissions });
    this.emit('permission:revoked', { agentId, resource, actions });
  }

  /**
   * Check if agent has permission
   */
  hasPermission(agentId: string, resource: string, action: string): boolean {
    const agent = this.identities.get(agentId);
    if (!agent || agent.status !== 'active') return false;

    // Check direct permissions
    for (const perm of agent.permissions) {
      if (perm.resource === resource && perm.actions.includes(action)) {
        // Check expiration
        if (perm.expiresAt && perm.expiresAt < new Date()) continue;
        return true;
      }
    }

    // Check role permissions
    for (const role of agent.roles) {
      const rolePerms = this.rolePermissions.get(role) || [];
      const permKey = `${resource}:${action}`;
      if (rolePerms.includes(permKey) || rolePerms.includes('system:admin')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get agent permissions
   */
  getPermissions(agentId: string): AgentPermission[] {
    const agent = this.identities.get(agentId);
    return agent?.permissions || [];
  }

  /**
   * Assign role to agent
   */
  assignRole(agentId: string, role: string): void {
    const agent = this.identities.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (!agent.roles.includes(role)) {
      agent.roles.push(role);
      this.updateAgent(agentId, { roles: agent.roles });
      this.emit('role:assigned', { agentId, role });
    }
  }

  /**
   * Remove role from agent
   */
  removeRole(agentId: string, role: string): void {
    const agent = this.identities.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.roles = agent.roles.filter(r => r !== role);
    this.updateAgent(agentId, { roles: agent.roles });
    this.emit('role:removed', { agentId, role });
  }

  // ============================================================================
  // Credential Management
  // ============================================================================

  /**
   * Issue credential to agent
   */
  issueCredential(
    agentId: string,
    type: AgentCredential['type'],
    expiresAt?: Date,
    rotationPolicy?: AgentCredential['rotationPolicy']
  ): AgentCredential {
    const agent = this.identities.get(agentId);
    if (!agent || agent.status !== 'active') {
      throw new Error(`Agent ${agentId} not found or not active`);
    }

    const credential: AgentCredential = {
      id: `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      type,
      credential: this.generateCredential(type),
      createdAt: new Date(),
      expiresAt,
      rotationPolicy,
    };

    let creds = this.credentials.get(agentId) || [];
    creds.push(credential);
    this.credentials.set(agentId, creds);

    this.emit('credential:issued', { agentId, credentialId: credential.id, type });

    return credential;
  }

  /**
   * Generate credential value
   */
  private generateCredential(type: AgentCredential['type']): string {
    const prefix = {
      api_key: 'ak_',
      certificate: 'cert_',
      oauth_token: 'oauth_',
      jwt: 'jwt_',
    };

    const randomString = Array.from({ length: 32 }, () =>
      Math.random().toString(36)[2]
    ).join('');

    return (prefix[type] || 'cred_') + randomString;
  }

  /**
   * Rotate credential
   */
  rotateCredential(credentialId: string): AgentCredential {
    for (const [agentId, creds] of this.credentials.entries()) {
      const index = creds.findIndex(c => c.id === credentialId);
      if (index !== -1) {
        const old = creds[index];

        // Issue new credential
        const newCred = this.issueCredential(
          agentId,
          old.type,
          old.expiresAt,
          old.rotationPolicy
        );

        // Remove old credential
        creds.splice(index, 1);
        this.credentials.set(agentId, creds);

        this.emit('credential:rotated', { agentId, oldId: credentialId, newId: newCred.id });

        return newCred;
      }
    }

    throw new Error(`Credential ${credentialId} not found`);
  }

  /**
   * Revoke credential
   */
  revokeCredential(credentialId: string): void {
    for (const [agentId, creds] of this.credentials.entries()) {
      const filtered = creds.filter(c => c.id !== credentialId);
      if (filtered.length !== creds.length) {
        this.credentials.set(agentId, filtered);
        this.emit('credential:revoked', { agentId, credentialId });
        return;
      }
    }

    throw new Error(`Credential ${credentialId} not found`);
  }

  /**
   * Revoke all credentials for agent
   */
  revokeAllCredentials(agentId: string): void {
    const creds = this.credentials.get(agentId) || [];
    const count = creds.length;

    this.credentials.delete(agentId);
    this.emit('credentials:revoked_all', { agentId, count });
  }

  /**
   * Get credentials for agent
   */
  getCredentials(agentId: string): AgentCredential[] {
    return this.credentials.get(agentId) || [];
  }

  /**
   * Cleanup expired credentials
   */
  private cleanupExpiredCredentials(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [agentId, creds] of this.credentials.entries()) {
      const valid = creds.filter(c => !c.expiresAt || c.expiresAt > now);

      if (valid.length !== creds.length) {
        cleaned += creds.length - valid.length;
        this.credentials.set(agentId, valid);
      }
    }

    if (cleaned > 0) {
      this.emit('credentials:cleaned', { count: cleaned });
    }
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get statistics
   */
  getStatistics() {
    const agents = this.getAllAgents();
    const byStatus = {
      active: agents.filter(a => a.status === 'active').length,
      suspended: agents.filter(a => a.status === 'suspended').length,
      revoked: agents.filter(a => a.status === 'revoked').length,
    };

    let totalCredentials = 0;
    for (const creds of this.credentials.values()) {
      totalCredentials += creds.length;
    }

    return {
      totalAgents: agents.length,
      agentsByStatus: byStatus,
      totalCredentials,
      totalRoles: this.rolePermissions.size,
    };
  }
}

/**
 * Singleton instance
 */
export const agentIdentityManager = new AgentIdentityManager();
