/**
 * SCIMHandler - SCIM 2.0 user provisioning handling
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  SCIMUser,
  FederationHubConfig,
  IdentityProvider,
  FederatedClaims,
} from './types';
import { IdentityMapper } from './IdentityMapper';

export class SCIMHandler extends EventEmitter {
  private config: FederationHubConfig;
  private identityMapper: IdentityMapper;

  constructor(config: FederationHubConfig, identityMapper: IdentityMapper) {
    super();
    this.config = config;
    this.identityMapper = identityMapper;
  }

  /**
   * Update configuration
   */
  updateConfig(config: FederationHubConfig): void {
    this.config = config;
  }

  /**
   * Handle SCIM user operations
   */
  async handleSCIMUser(
    action: 'create' | 'update' | 'delete' | 'get',
    user: Partial<SCIMUser>,
    provider: IdentityProvider
  ): Promise<SCIMUser | null> {
    if (!this.config.enableSCIM) {
      throw new Error('SCIM is not enabled');
    }

    switch (action) {
      case 'create':
        return this.createSCIMUser(user, provider);
      case 'update':
        return this.updateSCIMUser(user, provider);
      case 'delete':
        await this.deleteSCIMUser(user.id!, provider);
        return null;
      case 'get':
        return this.getSCIMUser(user.id!, provider);
      default:
        throw new Error(`Unknown SCIM action: ${action}`);
    }
  }

  private async createSCIMUser(
    user: Partial<SCIMUser>,
    provider: IdentityProvider
  ): Promise<SCIMUser> {
    const now = new Date().toISOString();
    const newUser: SCIMUser = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: crypto.randomUUID(),
      userName: user.userName || '',
      name: user.name,
      displayName: user.displayName,
      emails: user.emails,
      active: user.active ?? true,
      groups: user.groups,
      roles: user.roles,
      meta: {
        resourceType: 'User',
        created: now,
        lastModified: now,
        location: `${this.config.scimEndpoint}/Users/${user.id}`,
      },
    };

    const claims: FederatedClaims = {
      subject: newUser.id,
      issuer: provider.id,
      email: newUser.emails?.[0]?.value,
      name: newUser.displayName,
      issuedAt: new Date(),
      attributes: { scimUser: newUser },
    };

    await this.identityMapper.federateIdentity(provider, claims, {
      createIfNotExists: true,
    });

    this.emit('scimUserCreated', { userId: newUser.id, providerId: provider.id });

    return newUser;
  }

  private async updateSCIMUser(
    user: Partial<SCIMUser>,
    provider: IdentityProvider
  ): Promise<SCIMUser> {
    const now = new Date().toISOString();

    const updatedUser: SCIMUser = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: user.id || crypto.randomUUID(),
      userName: user.userName || '',
      name: user.name,
      displayName: user.displayName,
      emails: user.emails,
      active: user.active,
      groups: user.groups,
      roles: user.roles,
      meta: {
        resourceType: 'User',
        lastModified: now,
        location: `${this.config.scimEndpoint}/Users/${user.id}`,
      },
    };

    this.emit('scimUserUpdated', { userId: updatedUser.id, providerId: provider.id });

    return updatedUser;
  }

  private async deleteSCIMUser(
    userId: string,
    provider: IdentityProvider
  ): Promise<void> {
    const identity = this.identityMapper.findFederatedIdentity(provider.id, userId);
    if (identity) {
      await this.identityMapper.unlinkIdentity(identity.localUserId, identity.id);
    }

    this.emit('scimUserDeleted', { userId, providerId: provider.id });
  }

  private async getSCIMUser(
    userId: string,
    provider: IdentityProvider
  ): Promise<SCIMUser | null> {
    const identity = this.identityMapper.findFederatedIdentity(provider.id, userId);
    if (!identity) {
      return null;
    }

    const scimUser = identity.metadata.scimUser as SCIMUser | undefined;
    return scimUser || null;
  }
}
