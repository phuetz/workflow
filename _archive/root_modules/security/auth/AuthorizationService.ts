/**
 * Authorization Service
 * Role-based access control (RBAC) and attribute-based access control (ABAC)
 */

import { EventEmitter } from 'events';

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  inheritsFrom: string[];
  isSystemRole: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: AccessCondition[];
  description: string;
  isSystemPermission: boolean;
  createdAt: Date;
}

export interface AccessCondition {
  attribute: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith';
  value: unknown;
  logicalOperator?: 'AND' | 'OR';
}

export interface AccessContext {
  userId: string;
  roles: string[];
  permissions: string[];
  attributes: Record<string, unknown>;
  resource: string;
  action: string;
  environment: {
    timestamp: Date;
    ipAddress: string;
    userAgent: string;
    location?: string;
    device?: string;
  };
  resourceAttributes?: Record<string, unknown>;
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  effect: 'ALLOW' | 'DENY';
  subjects: string[]; // roles or user IDs
  resources: string[];
  actions: string[];
  conditions?: AccessCondition[];
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccessDecision {
  allowed: boolean;
  reason: string;
  matchedRules: string[];
  effectivePermissions: string[];
  warnings?: string[];
}

export interface ResourceGroup {
  id: string;
  name: string;
  description: string;
  resources: string[];
  parentGroup?: string;
  metadata: Record<string, unknown>;
}

export interface AccessRequest {
  subject: string; // user ID or role
  resource: string;
  action: string;
  context?: Record<string, unknown>;
}

export class AuthorizationService extends EventEmitter {
  private roles: Map<string, Role> = new Map();
  private permissions: Map<string, Permission> = new Map();
  private policies: Map<string, PolicyRule> = new Map();
  private resourceGroups: Map<string, ResourceGroup> = new Map();
  private userRoles: Map<string, string[]> = new Map(); // userId -> roleIds
  private roleCache: Map<string, string[]> = new Map(); // roleId -> all inherited permissions
  
  constructor() {
    super();
    this.initializeSystemRoles();
    this.initializeSystemPermissions();
  }
  
  private initializeSystemRoles(): void {
    const systemRoles: Role[] = [
      {
        id: 'system-admin',
        name: 'System Administrator',
        description: 'Full system access',
        permissions: ['*'],
        inheritsFrom: [],
        isSystemRole: true,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'workflow-admin',
        name: 'Workflow Administrator',
        description: 'Full workflow management access',
        permissions: [
          'workflow:create',
          'workflow:read',
          'workflow:update',
          'workflow:delete',
          'workflow:execute',
          'workflow:share'
        ],
        inheritsFrom: [],
        isSystemRole: true,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'workflow-editor',
        name: 'Workflow Editor',
        description: 'Create and edit workflows',
        permissions: [
          'workflow:create',
          'workflow:read',
          'workflow:update',
          'workflow:execute'
        ],
        inheritsFrom: [],
        isSystemRole: true,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'workflow-viewer',
        name: 'Workflow Viewer',
        description: 'View and execute workflows',
        permissions: [
          'workflow:read',
          'workflow:execute'
        ],
        inheritsFrom: [],
        isSystemRole: true,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'user',
        name: 'User',
        description: 'Basic user access',
        permissions: [
          'profile:read',
          'profile:update'
        ],
        inheritsFrom: [],
        isSystemRole: true,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    for (const role of systemRoles) {
      this.roles.set(role.id, role);
    }
  }
  
  private initializeSystemPermissions(): void {
    const systemPermissions: Permission[] = [
      // System permissions
      { id: 'system:admin', name: 'System Administration', resource: 'system', action: '*', description: 'Full system access', isSystemPermission: true, createdAt: new Date() },
      
      // User management
      { id: 'user:create', name: 'Create User', resource: 'user', action: 'create', description: 'Create new users', isSystemPermission: true, createdAt: new Date() },
      { id: 'user:read', name: 'Read User', resource: 'user', action: 'read', description: 'View user information', isSystemPermission: true, createdAt: new Date() },
      { id: 'user:update', name: 'Update User', resource: 'user', action: 'update', description: 'Update user information', isSystemPermission: true, createdAt: new Date() },
      { id: 'user:delete', name: 'Delete User', resource: 'user', action: 'delete', description: 'Delete users', isSystemPermission: true, createdAt: new Date() },
      
      // Workflow management
      { id: 'workflow:create', name: 'Create Workflow', resource: 'workflow', action: 'create', description: 'Create new workflows', isSystemPermission: true, createdAt: new Date() },
      { id: 'workflow:read', name: 'Read Workflow', resource: 'workflow', action: 'read', description: 'View workflows', isSystemPermission: true, createdAt: new Date() },
      { id: 'workflow:update', name: 'Update Workflow', resource: 'workflow', action: 'update', description: 'Modify workflows', isSystemPermission: true, createdAt: new Date() },
      { id: 'workflow:delete', name: 'Delete Workflow', resource: 'workflow', action: 'delete', description: 'Delete workflows', isSystemPermission: true, createdAt: new Date() },
      { id: 'workflow:execute', name: 'Execute Workflow', resource: 'workflow', action: 'execute', description: 'Run workflows', isSystemPermission: true, createdAt: new Date() },
      { id: 'workflow:share', name: 'Share Workflow', resource: 'workflow', action: 'share', description: 'Share workflows with others', isSystemPermission: true, createdAt: new Date() },
      
      // Profile management
      { id: 'profile:read', name: 'Read Profile', resource: 'profile', action: 'read', description: 'View own profile', isSystemPermission: true, createdAt: new Date() },
      { id: 'profile:update', name: 'Update Profile', resource: 'profile', action: 'update', description: 'Update own profile', isSystemPermission: true, createdAt: new Date() },
      
      // API access
      { id: 'api:read', name: 'API Read', resource: 'api', action: 'read', description: 'Read API access', isSystemPermission: true, createdAt: new Date() },
      { id: 'api:write', name: 'API Write', resource: 'api', action: 'write', description: 'Write API access', isSystemPermission: true, createdAt: new Date() },
      { id: 'api:admin', name: 'API Admin', resource: 'api', action: 'admin', description: 'API administration', isSystemPermission: true, createdAt: new Date() }
    ];
    
    for (const permission of systemPermissions) {
      this.permissions.set(permission.id, permission);
    }
  }
  
  // Role Management
  
  public async createRole(roleData: {
    name: string;
    description: string;
    permissions: string[];
    inheritsFrom?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<Role> {
    const role: Role = {
      id: `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: roleData.name,
      description: roleData.description,
      permissions: roleData.permissions,
      inheritsFrom: roleData.inheritsFrom || [],
      isSystemRole: false,
      metadata: roleData.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Validate permissions exist
    for (const permissionId of role.permissions) {
      if (permissionId !== '*' && !this.permissions.has(permissionId)) {
        throw new Error(`Permission ${permissionId} does not exist`);
      }
    }
    
    // Validate inherited roles exist
    for (const parentRoleId of role.inheritsFrom) {
      if (!this.roles.has(parentRoleId)) {
        throw new Error(`Parent role ${parentRoleId} does not exist`);
      }
    }
    
    this.roles.set(role.id, role);
    this.invalidateRoleCache();
    
    this.emit('roleCreated', {
      roleId: role.id,
      name: role.name,
      permissions: role.permissions
    });
    
    return role;
  }
  
  public async updateRole(
    roleId: string,
    updates: Partial<Pick<Role, 'name' | 'description' | 'permissions' | 'inheritsFrom' | 'metadata'>>
  ): Promise<Role> {
    const role = this.roles.get(roleId);
    
    if (!role) {
      throw new Error('Role not found');
    }
    
    if (role.isSystemRole && (updates.permissions || updates.inheritsFrom)) {
      throw new Error('Cannot modify permissions of system roles');
    }
    
    // Validate permissions if updating
    if (updates.permissions) {
      for (const permissionId of updates.permissions) {
        if (permissionId !== '*' && !this.permissions.has(permissionId)) {
          throw new Error(`Permission ${permissionId} does not exist`);
        }
      }
    }
    
    // Validate inherited roles if updating
    if (updates.inheritsFrom) {
      for (const parentRoleId of updates.inheritsFrom) {
        if (!this.roles.has(parentRoleId)) {
          throw new Error(`Parent role ${parentRoleId} does not exist`);
        }
      }
    }
    
    Object.assign(role, updates, { updatedAt: new Date() });
    this.invalidateRoleCache();
    
    this.emit('roleUpdated', {
      roleId,
      updates
    });
    
    return role;
  }
  
  public async deleteRole(roleId: string): Promise<void> {
    const role = this.roles.get(roleId);
    
    if (!role) {
      throw new Error('Role not found');
    }
    
    if (role.isSystemRole) {
      throw new Error('Cannot delete system roles');
    }
    
    // Check if role is assigned to any users
    const usersWithRole = Array.from(this.userRoles.entries())
      .filter(([_userId, roles]) => roles.includes(roleId)); // eslint-disable-line @typescript-eslint/no-unused-vars
    
    if (usersWithRole.length > 0) {
      throw new Error('Cannot delete role that is assigned to users');
    }
    
    // Check if role is inherited by other roles
    const childRoles = Array.from(this.roles.values())
      .filter(r => r.inheritsFrom.includes(roleId));
    
    if (childRoles.length > 0) {
      throw new Error('Cannot delete role that is inherited by other roles');
    }
    
    this.roles.delete(roleId);
    this.invalidateRoleCache();
    
    this.emit('roleDeleted', { roleId });
  }
  
  // Permission Management
  
  public async createPermission(permissionData: {
    name: string;
    resource: string;
    action: string;
    conditions?: AccessCondition[];
    description: string;
  }): Promise<Permission> {
    const permission: Permission = {
      id: `${permissionData.resource}:${permissionData.action}`,
      name: permissionData.name,
      resource: permissionData.resource,
      action: permissionData.action,
      conditions: permissionData.conditions,
      description: permissionData.description,
      isSystemPermission: false,
      createdAt: new Date()
    };
    
    if (this.permissions.has(permission.id)) {
      throw new Error('Permission already exists');
    }
    
    this.permissions.set(permission.id, permission);
    
    this.emit('permissionCreated', {
      permissionId: permission.id,
      resource: permission.resource,
      action: permission.action
    });
    
    return permission;
  }
  
  public async deletePermission(permissionId: string): Promise<void> {
    const permission = this.permissions.get(permissionId);
    
    if (!permission) {
      throw new Error('Permission not found');
    }
    
    if (permission.isSystemPermission) {
      throw new Error('Cannot delete system permissions');
    }
    
    // Remove from all roles
    for (const role of this.roles.values()) {
      if (role.permissions.includes(permissionId)) {
        role.permissions = role.permissions.filter(p => p !== permissionId);
        role.updatedAt = new Date();
      }
    }
    
    this.permissions.delete(permissionId);
    this.invalidateRoleCache();
    
    this.emit('permissionDeleted', { permissionId });
  }
  
  // User Role Assignment
  
  public async assignRolesToUser(userId: string, roleIds: string[]): Promise<void> {
    // Validate roles exist
    for (const roleId of roleIds) {
      if (!this.roles.has(roleId)) {
        throw new Error(`Role ${roleId} does not exist`);
      }
    }
    
    this.userRoles.set(userId, roleIds);
    
    this.emit('userRolesAssigned', {
      userId,
      roleIds
    });
  }
  
  public async removeRolesFromUser(userId: string, roleIds: string[]): Promise<void> {
    const currentRoles = this.userRoles.get(userId) || [];
    const updatedRoles = currentRoles.filter(roleId => !roleIds.includes(roleId));
    
    this.userRoles.set(userId, updatedRoles);
    
    this.emit('userRolesRemoved', {
      userId,
      roleIds
    });
  }
  
  public getUserRoles(userId: string): string[] {
    return this.userRoles.get(userId) || [];
  }
  
  public getUserPermissions(userId: string): string[] {
    const roleIds = this.getUserRoles(userId);
    const permissions = new Set<string>();
    
    for (const roleId of roleIds) {
      const rolePermissions = this.getRoleEffectivePermissions(roleId);
      for (const permission of rolePermissions) {
        permissions.add(permission);
      }
    }
    
    return Array.from(permissions);
  }
  
  private getRoleEffectivePermissions(roleId: string): string[] {
    // Check cache first
    if (this.roleCache.has(roleId)) {
      return this.roleCache.get(roleId)!;
    }
    
    const role = this.roles.get(roleId);
    if (!role) {
      return [];
    }
    
    const permissions = new Set<string>(role.permissions);
    
    // Add inherited permissions
    for (const parentRoleId of role.inheritsFrom) {
      const parentPermissions = this.getRoleEffectivePermissions(parentRoleId);
      for (const permission of parentPermissions) {
        permissions.add(permission);
      }
    }
    
    const effectivePermissions = Array.from(permissions);
    this.roleCache.set(roleId, effectivePermissions);
    
    return effectivePermissions;
  }
  
  private invalidateRoleCache(): void {
    this.roleCache.clear();
  }
  
  // Access Control
  
  public async checkAccess(context: AccessContext): Promise<AccessDecision> {
    const userPermissions = this.getUserPermissions(context.userId);
    const matchedRules: string[] = [];
    const warnings: string[] = [];
    
    // Check wildcard permission
    if (userPermissions.includes('*')) {
      return {
        allowed: true,
        reason: 'User has wildcard permission',
        matchedRules: [],
        effectivePermissions: userPermissions
      };
    }
    
    // Check direct permission
    const requiredPermission = `${context.resource}:${context.action}`;
    const hasDirectPermission = userPermissions.includes(requiredPermission);
    
    if (hasDirectPermission) {
      // Check conditions if any
      const permission = this.permissions.get(requiredPermission);
      if (permission?.conditions) {
        const conditionResult = this.evaluateConditions(permission.conditions, context);
        if (!conditionResult.satisfied) {
          return {
            allowed: false,
            reason: `Permission denied: ${conditionResult.reason}`,
            matchedRules,
            effectivePermissions: userPermissions,
            warnings
          };
        }
      }
      
      return {
        allowed: true,
        reason: 'User has required permission',
        matchedRules,
        effectivePermissions: userPermissions
      };
    }
    
    // Check policy rules
    const applicablePolicies = Array.from(this.policies.values())
      .filter(policy => policy.isActive)
      .filter(policy => this.policyApplies(policy, context))
      .sort((a, b) => b.priority - a.priority); // Higher priority first
    
    let finalDecision = false;
    let finalReason = 'No applicable permissions or policies found';
    
    for (const policy of applicablePolicies) {
      matchedRules.push(policy.id);
      
      if (policy.conditions) {
        const conditionResult = this.evaluateConditions(policy.conditions, context);
        if (!conditionResult.satisfied) {
          continue; // Skip this policy
        }
      }
      
      if (policy.effect === 'ALLOW') {
        finalDecision = true;
        finalReason = `Access allowed by policy: ${policy.name}`;
        break; // First ALLOW policy wins
      } else if (policy.effect === 'DENY') {
        finalDecision = false;
        finalReason = `Access denied by policy: ${policy.name}`;
        break; // DENY policies are definitive
      }
    }
    
    return {
      allowed: finalDecision,
      reason: finalReason,
      matchedRules,
      effectivePermissions: userPermissions,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  private policyApplies(policy: PolicyRule, context: AccessContext): boolean {
    // Check subjects (roles or user IDs)
    const userRoles = this.getUserRoles(context.userId);
    const hasSubject = policy.subjects.some(subject => 
      subject === context.userId || userRoles.includes(subject)
    );
    
    if (!hasSubject) {
      return false;
    }
    
    // Check resources
    const resourceMatches = policy.resources.some(resource => 
      resource === '*' || 
      resource === context.resource ||
      this.resourceGroupContains(resource, context.resource)
    );
    
    if (!resourceMatches) {
      return false;
    }
    
    // Check actions
    const actionMatches = policy.actions.some(action => 
      action === '*' || action === context.action
    );
    
    return actionMatches;
  }
  
  private resourceGroupContains(groupId: string, resource: string): boolean {
    const group = this.resourceGroups.get(groupId);
    if (!group) {
      return false;
    }
    
    return group.resources.includes(resource);
  }
  
  private evaluateConditions(
    conditions: AccessCondition[],
    context: AccessContext
  ): { satisfied: boolean; reason: string } {
    for (const condition of conditions) {
      const attributeValue = this.getAttributeValue(condition.attribute, context);
      
      if (!this.evaluateCondition(condition, attributeValue)) {
        return {
          satisfied: false,
          reason: `Condition failed: ${condition.attribute} ${condition.operator} ${condition.value}`
        };
      }
    }
    
    return { satisfied: true, reason: 'All conditions satisfied' };
  }
  
  private getAttributeValue(attribute: string, context: AccessContext): unknown {
    // Support dot notation for nested attributes
    const parts = attribute.split('.');
    let value: unknown = context;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }
  
  private evaluateCondition(condition: AccessCondition, attributeValue: unknown): boolean {
    switch (condition.operator) {
      case 'eq':
        return attributeValue === condition.value;
      case 'ne':
        return attributeValue !== condition.value;
      case 'gt':
        return attributeValue > condition.value;
      case 'gte':
        return attributeValue >= condition.value;
      case 'lt':
        return attributeValue < condition.value;
      case 'lte':
        return attributeValue <= condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(attributeValue);
      case 'nin':
        return Array.isArray(condition.value) && !condition.value.includes(attributeValue);
      case 'contains':
        return typeof attributeValue === 'string' && attributeValue.includes(condition.value);
      case 'startsWith':
        return typeof attributeValue === 'string' && attributeValue.startsWith(condition.value);
      case 'endsWith':
        return typeof attributeValue === 'string' && attributeValue.endsWith(condition.value);
      default:
        return false;
    }
  }
  
  // Policy Management
  
  public async createPolicy(policyData: {
    name: string;
    description: string;
    effect: 'ALLOW' | 'DENY';
    subjects: string[];
    resources: string[];
    actions: string[];
    conditions?: AccessCondition[];
    priority?: number;
  }): Promise<PolicyRule> {
    const policy: PolicyRule = {
      id: `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: policyData.name,
      description: policyData.description,
      effect: policyData.effect,
      subjects: policyData.subjects,
      resources: policyData.resources,
      actions: policyData.actions,
      conditions: policyData.conditions,
      priority: policyData.priority || 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.policies.set(policy.id, policy);
    
    this.emit('policyCreated', {
      policyId: policy.id,
      name: policy.name,
      effect: policy.effect
    });
    
    return policy;
  }
  
  public async updatePolicy(
    policyId: string,
    updates: Partial<Pick<PolicyRule, 'name' | 'description' | 'effect' | 'subjects' | 'resources' | 'actions' | 'conditions' | 'priority' | 'isActive'>>
  ): Promise<PolicyRule> {
    const policy = this.policies.get(policyId);
    
    if (!policy) {
      throw new Error('Policy not found');
    }
    
    Object.assign(policy, updates, { updatedAt: new Date() });
    
    this.emit('policyUpdated', {
      policyId,
      updates
    });
    
    return policy;
  }
  
  public async deletePolicy(policyId: string): Promise<void> {
    const policy = this.policies.get(policyId);
    
    if (!policy) {
      throw new Error('Policy not found');
    }
    
    this.policies.delete(policyId);
    
    this.emit('policyDeleted', { policyId });
  }
  
  // Resource Group Management
  
  public async createResourceGroup(groupData: {
    name: string;
    description: string;
    resources: string[];
    parentGroup?: string;
    metadata?: Record<string, unknown>;
  }): Promise<ResourceGroup> {
    const group: ResourceGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: groupData.name,
      description: groupData.description,
      resources: groupData.resources,
      parentGroup: groupData.parentGroup,
      metadata: groupData.metadata || {}
    };
    
    this.resourceGroups.set(group.id, group);
    
    this.emit('resourceGroupCreated', {
      groupId: group.id,
      name: group.name,
      resources: group.resources
    });
    
    return group;
  }
  
  // Utility Methods
  
  public hasPermission(userId: string, resource: string, action: string): boolean {
    const context: AccessContext = {
      userId,
      roles: this.getUserRoles(userId),
      permissions: this.getUserPermissions(userId),
      attributes: {},
      resource,
      action,
      environment: {
        timestamp: new Date(),
        ipAddress: '0.0.0.0',
        userAgent: 'system'
      }
    };
    
    const decision = this.checkAccess(context);
    return decision.allowed;
  }
  
  public async bulkCheckAccess(requests: AccessRequest[]): Promise<AccessDecision[]> {
    const decisions: AccessDecision[] = [];
    
    for (const request of requests) {
      const context: AccessContext = {
        userId: request.subject,
        roles: this.getUserRoles(request.subject),
        permissions: this.getUserPermissions(request.subject),
        attributes: request.context || {},
        resource: request.resource,
        action: request.action,
        environment: {
          timestamp: new Date(),
          ipAddress: '0.0.0.0',
          userAgent: 'system'
        }
      };
      
      const decision = await this.checkAccess(context);
      decisions.push(decision);
    }
    
    return decisions;
  }
  
  // Public API
  
  public getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }
  
  public getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }
  
  public getPermission(permissionId: string): Permission | undefined {
    return this.permissions.get(permissionId);
  }
  
  public getAllPermissions(): Permission[] {
    return Array.from(this.permissions.values());
  }
  
  public getPolicy(policyId: string): PolicyRule | undefined {
    return this.policies.get(policyId);
  }
  
  public getAllPolicies(): PolicyRule[] {
    return Array.from(this.policies.values());
  }
  
  public getResourceGroup(groupId: string): ResourceGroup | undefined {
    return this.resourceGroups.get(groupId);
  }
  
  public getAllResourceGroups(): ResourceGroup[] {
    return Array.from(this.resourceGroups.values());
  }
  
  public getStats(): {
    totalRoles: number;
    totalPermissions: number;
    totalPolicies: number;
    totalResourceGroups: number;
    usersWithRoles: number;
  } {
    return {
      totalRoles: this.roles.size,
      totalPermissions: this.permissions.size,
      totalPolicies: this.policies.size,
      totalResourceGroups: this.resourceGroups.size,
      usersWithRoles: this.userRoles.size
    };
  }
}