/**
 * User Provisioner
 * Handles JIT (Just-In-Time) user provisioning and user management
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  SSOProviderConfig,
  SSOUser,
  SAMLResponse,
  OIDCClaims,
} from './types';
import { GroupSync } from './GroupSync';

export class UserProvisioner {
  private users: Map<string, SSOUser> = new Map();
  private eventEmitter: EventEmitter;
  private groupSync: GroupSync;

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;
    this.groupSync = new GroupSync(eventEmitter);
  }

  /**
   * Generate a secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Provision user just-in-time
   */
  public async jitProvisionUser(
    provider: SSOProviderConfig,
    attributes: Record<string, unknown>
  ): Promise<SSOUser> {
    const jitConfig = provider.jitProvisioning;
    if (!jitConfig?.enabled) {
      throw new Error('JIT provisioning not enabled');
    }

    const userId = this.generateSecureToken();
    const now = new Date();

    const user: SSOUser = {
      id: userId,
      externalId: String(attributes.externalId || attributes.id),
      providerId: provider.id,
      email: String(attributes.email || ''),
      firstName: attributes.firstName as string | undefined,
      lastName: attributes.lastName as string | undefined,
      displayName: attributes.displayName as string | undefined,
      groups: (attributes.groups as string[]) || [],
      roles: [jitConfig.defaultRole],
      permissions: [],
      department: attributes.department as string | undefined,
      title: attributes.title as string | undefined,
      phone: attributes.phone as string | undefined,
      avatar: attributes.avatar as string | undefined,
      locale: attributes.locale as string | undefined,
      timezone: attributes.timezone as string | undefined,
      customAttributes: {},
      mfaVerified: false,
      createdAt: now,
      updatedAt: now,
      provisionedVia: 'jit',
      status: jitConfig.autoActivate ? 'active' : 'pending',
    };

    // Sync roles from groups if enabled
    if (jitConfig.syncGroups && user.groups.length > 0) {
      const { roles, permissions } = this.groupSync.syncRoles(provider, user.groups);
      user.roles = roles.length > 0 ? roles : [jitConfig.defaultRole];
      user.permissions = permissions;
    }

    // Store user
    this.users.set(user.id, user);

    this.eventEmitter.emit('user:provisioned', { user, provider: provider.id });

    return user;
  }

  /**
   * Map SAML attributes to user
   */
  public async mapSAMLAttributesToUser(
    provider: SSOProviderConfig,
    response: SAMLResponse
  ): Promise<SSOUser> {
    const mappedAttributes = this.groupSync.mapAttributes(
      provider,
      response.attributes as Record<string, unknown>
    );

    // Check if user exists
    const existingUser = this.getUserByExternalId(response.nameId, provider.id);

    if (existingUser) {
      // Update existing user
      existingUser.email = (mappedAttributes.email as string) || existingUser.email;
      existingUser.firstName = (mappedAttributes.firstName as string) || existingUser.firstName;
      existingUser.lastName = (mappedAttributes.lastName as string) || existingUser.lastName;
      existingUser.displayName = (mappedAttributes.displayName as string) || existingUser.displayName;
      existingUser.groups = (mappedAttributes.groups as string[]) || existingUser.groups;
      existingUser.lastLogin = new Date();
      existingUser.updatedAt = new Date();

      // Sync roles
      if (provider.jitProvisioning?.syncGroups && existingUser.groups.length > 0) {
        const { roles, permissions } = this.groupSync.syncRoles(provider, existingUser.groups);
        existingUser.roles = roles;
        existingUser.permissions = permissions;
      }

      this.users.set(existingUser.id, existingUser);
      return existingUser;
    }

    // JIT provision new user
    return this.jitProvisionUser(provider, {
      externalId: response.nameId,
      ...mappedAttributes,
    });
  }

  /**
   * Map OIDC claims to user
   */
  public async mapOIDCClaimsToUser(
    provider: SSOProviderConfig,
    claims: OIDCClaims,
    _accessToken: string
  ): Promise<SSOUser> {
    const mappedAttributes = this.groupSync.mapAttributes(
      provider,
      claims as unknown as Record<string, unknown>
    );

    // Check if user exists
    const existingUser = this.getUserByExternalId(claims.sub, provider.id);

    if (existingUser) {
      existingUser.email = claims.email || (mappedAttributes.email as string) || existingUser.email;
      existingUser.firstName = claims.given_name || (mappedAttributes.firstName as string) || existingUser.firstName;
      existingUser.lastName = claims.family_name || (mappedAttributes.lastName as string) || existingUser.lastName;
      existingUser.displayName = claims.name || (mappedAttributes.displayName as string) || existingUser.displayName;
      existingUser.avatar = claims.picture || existingUser.avatar;
      existingUser.groups = claims.groups || (mappedAttributes.groups as string[]) || existingUser.groups;
      existingUser.lastLogin = new Date();
      existingUser.updatedAt = new Date();

      if (provider.jitProvisioning?.syncGroups && existingUser.groups.length > 0) {
        const { roles, permissions } = this.groupSync.syncRoles(provider, existingUser.groups);
        existingUser.roles = roles;
        existingUser.permissions = permissions;
      }

      this.users.set(existingUser.id, existingUser);
      return existingUser;
    }

    return this.jitProvisionUser(provider, {
      externalId: claims.sub,
      email: claims.email,
      firstName: claims.given_name,
      lastName: claims.family_name,
      displayName: claims.name,
      avatar: claims.picture,
      groups: claims.groups,
      locale: claims.locale,
      ...mappedAttributes,
    });
  }

  /**
   * Get user by ID
   */
  public getUser(userId: string): SSOUser | undefined {
    return this.users.get(userId);
  }

  /**
   * Get user by external ID
   */
  public getUserByExternalId(externalId: string, providerId: string): SSOUser | undefined {
    return Array.from(this.users.values()).find(
      (u) => u.externalId === externalId && u.providerId === providerId
    );
  }

  /**
   * Get all users
   */
  public getAllUsers(): SSOUser[] {
    return Array.from(this.users.values());
  }

  /**
   * Update user
   */
  public updateUser(userId: string, updates: Partial<SSOUser>): SSOUser | undefined {
    const user = this.users.get(userId);
    if (!user) {
      return undefined;
    }

    const updatedUser: SSOUser = {
      ...user,
      ...updates,
      id: user.id, // Prevent ID change
      updatedAt: new Date(),
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  /**
   * Deactivate user
   */
  public deactivateUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }

    user.status = 'inactive';
    user.updatedAt = new Date();
    this.users.set(userId, user);

    return true;
  }

  /**
   * Set user MFA verified status
   */
  public setMfaVerified(userId: string, verified: boolean): void {
    const user = this.users.get(userId);
    if (user) {
      user.mfaVerified = verified;
      this.users.set(userId, user);
    }
  }

  /**
   * Store user
   */
  public storeUser(user: SSOUser): void {
    this.users.set(user.id, user);
  }

  /**
   * Get users count
   */
  public get size(): number {
    return this.users.size;
  }

  /**
   * Get group sync instance for attribute/role mapping
   */
  public getGroupSync(): GroupSync {
    return this.groupSync;
  }
}
