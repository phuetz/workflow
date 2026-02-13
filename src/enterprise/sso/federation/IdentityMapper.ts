/**
 * IdentityMapper - Handles identity mapping and claims transformation
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  FederatedIdentity,
  FederatedClaims,
  IdentityProvider,
  ClaimsMappingRule,
  ClaimCondition,
  ValidationResult,
  ValidationError,
  FederatedUser,
} from './types';

export class IdentityMapper extends EventEmitter {
  private federatedIdentities: Map<string, FederatedIdentity> = new Map();
  private identityLinks: Map<string, string[]> = new Map(); // localUserId -> federatedIdentityIds

  /**
   * Federate an identity from an external provider
   */
  async federateIdentity(
    provider: IdentityProvider,
    externalClaims: FederatedClaims,
    options?: {
      linkToLocalUser?: string;
      createIfNotExists?: boolean;
    }
  ): Promise<FederatedIdentity> {
    // Transform claims according to mapping rules
    const transformedClaims = await this.transformClaims(
      externalClaims,
      provider.claimsMapping
    );

    // Check for existing federated identity
    let federatedIdentity = this.findFederatedIdentity(
      provider.id,
      externalClaims.subject
    );

    if (federatedIdentity) {
      federatedIdentity.claims = transformedClaims;
      federatedIdentity.lastLoginAt = new Date();
      federatedIdentity.metadata = {
        ...federatedIdentity.metadata,
        lastUpdated: new Date(),
      };

      this.emit('federatedIdentityUpdated', {
        identityId: federatedIdentity.id,
        providerId: provider.id,
        subject: externalClaims.subject,
      });
    } else {
      const localUserId = options?.linkToLocalUser ||
        (options?.createIfNotExists ? crypto.randomUUID() : undefined);

      if (!localUserId) {
        throw new Error(
          'No local user to link to and createIfNotExists is false'
        );
      }

      federatedIdentity = {
        id: crypto.randomUUID(),
        localUserId,
        externalUserId: externalClaims.subject,
        providerId: provider.id,
        providerName: provider.name,
        claims: transformedClaims,
        linkedAt: new Date(),
        lastLoginAt: new Date(),
        status: 'active',
        metadata: {
          createdAt: new Date(),
          protocol: provider.type,
        },
      };

      this.federatedIdentities.set(federatedIdentity.id, federatedIdentity);

      const existingLinks = this.identityLinks.get(localUserId) || [];
      existingLinks.push(federatedIdentity.id);
      this.identityLinks.set(localUserId, existingLinks);

      this.emit('federatedIdentityCreated', {
        identityId: federatedIdentity.id,
        providerId: provider.id,
        localUserId,
        subject: externalClaims.subject,
      });
    }

    return federatedIdentity;
  }

  /**
   * Transform claims according to mapping rules
   */
  async transformClaims(
    sourceClaims: FederatedClaims,
    mappingRules: ClaimsMappingRule[]
  ): Promise<FederatedClaims> {
    const transformedClaims: FederatedClaims = {
      subject: sourceClaims.subject,
      issuer: sourceClaims.issuer,
      audience: sourceClaims.audience,
      issuedAt: sourceClaims.issuedAt,
      expiresAt: sourceClaims.expiresAt,
      notBefore: sourceClaims.notBefore,
      attributes: {},
    };

    const sourceAttributes = {
      subject: sourceClaims.subject,
      issuer: sourceClaims.issuer,
      email: sourceClaims.email,
      name: sourceClaims.name,
      givenName: sourceClaims.givenName,
      familyName: sourceClaims.familyName,
      groups: sourceClaims.groups,
      roles: sourceClaims.roles,
      permissions: sourceClaims.permissions,
      ...sourceClaims.attributes,
    };

    for (const rule of mappingRules) {
      try {
        const sourceValue = this.getNestedValue(sourceAttributes, rule.sourceClaimType);

        if (rule.condition && !this.evaluateCondition(sourceValue, rule.condition)) {
          if (rule.required && rule.defaultValue === undefined) {
            throw new Error(`Required claim '${rule.sourceClaimType}' does not meet condition`);
          }
          continue;
        }

        let targetValue: unknown = await this.applyTransformation(
          sourceValue,
          rule,
          sourceAttributes
        );

        if (targetValue === undefined || targetValue === null) {
          if (rule.required && rule.defaultValue === undefined) {
            throw new Error(`Required claim '${rule.sourceClaimType}' is missing`);
          }
          targetValue = rule.defaultValue;
        }

        this.setNestedValue(
          transformedClaims as unknown as Record<string, unknown>,
          rule.targetClaimType,
          targetValue
        );
      } catch (error) {
        if (rule.required) {
          throw error;
        }
      }
    }

    // Copy standard claims that weren't mapped
    this.copyUnmappedClaims(transformedClaims, sourceClaims);

    return transformedClaims;
  }

  /**
   * Link identities across providers
   */
  async linkIdentities(
    localUserId: string,
    federatedIdentityIds: string[]
  ): Promise<void> {
    for (const identityId of federatedIdentityIds) {
      const identity = this.federatedIdentities.get(identityId);
      if (!identity) {
        throw new Error(`Federated identity not found: ${identityId}`);
      }
      identity.localUserId = localUserId;
    }

    const existingLinks = this.identityLinks.get(localUserId) || [];
    const uniqueLinks = new Set([...existingLinks, ...federatedIdentityIds]);
    const newLinks = Array.from(uniqueLinks);
    this.identityLinks.set(localUserId, newLinks);

    this.emit('identitiesLinked', {
      localUserId,
      federatedIdentityIds,
      totalLinks: newLinks.length,
    });
  }

  /**
   * Unlink an identity
   */
  async unlinkIdentity(
    localUserId: string,
    federatedIdentityId: string
  ): Promise<void> {
    const identity = this.federatedIdentities.get(federatedIdentityId);
    if (!identity) {
      throw new Error(`Federated identity not found: ${federatedIdentityId}`);
    }

    if (identity.localUserId !== localUserId) {
      throw new Error('Identity is not linked to the specified user');
    }

    const links = this.identityLinks.get(localUserId) || [];
    const updatedLinks = links.filter(id => id !== federatedIdentityId);
    this.identityLinks.set(localUserId, updatedLinks);

    identity.status = 'revoked';

    this.emit('identityUnlinked', {
      localUserId,
      federatedIdentityId,
    });
  }

  /**
   * Validate claims against provider configuration
   */
  async validateClaims(
    claims: FederatedClaims,
    provider: IdentityProvider,
    allowedClockSkew: number
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!claims.subject) {
      errors.push({ code: 'MISSING_SUBJECT', message: 'Subject claim is required' });
    }

    if (!claims.issuer) {
      errors.push({ code: 'MISSING_ISSUER', message: 'Issuer claim is required' });
    }

    if (claims.issuer && claims.issuer !== provider.config.entityId) {
      errors.push({
        code: 'ISSUER_MISMATCH',
        message: `Issuer '${claims.issuer}' does not match provider '${provider.config.entityId}'`,
      });
    }

    const now = new Date();

    if (claims.notBefore && claims.notBefore.getTime() > now.getTime() + allowedClockSkew) {
      errors.push({ code: 'TOKEN_NOT_YET_VALID', message: 'Token is not yet valid' });
    }

    if (claims.expiresAt && claims.expiresAt.getTime() < now.getTime() - allowedClockSkew) {
      errors.push({ code: 'TOKEN_EXPIRED', message: 'Token has expired' });
    }

    return {
      valid: errors.length === 0,
      claims,
      errors,
      warnings,
    };
  }

  /**
   * Build federated user from claims
   */
  buildFederatedUser(
    claims: FederatedClaims,
    federatedIdentity?: FederatedIdentity
  ): FederatedUser {
    return {
      id: federatedIdentity?.localUserId || crypto.randomUUID(),
      email: claims.email || '',
      username: claims.email || claims.subject,
      firstName: claims.givenName,
      lastName: claims.familyName,
      displayName: claims.name,
      role: this.determineRole(claims),
      permissions: claims.permissions || [],
      groups: claims.groups || [],
      attributes: claims.attributes,
      federatedIdentities: federatedIdentity ? [federatedIdentity.id] : [],
    };
  }

  /**
   * Find federated identity by provider and external user ID
   */
  findFederatedIdentity(
    providerId: string,
    externalUserId: string
  ): FederatedIdentity | undefined {
    return Array.from(this.federatedIdentities.values()).find(
      i => i.providerId === providerId && i.externalUserId === externalUserId
    );
  }

  /**
   * Get federated identity by ID
   */
  getFederatedIdentity(identityId: string): FederatedIdentity | undefined {
    return this.federatedIdentities.get(identityId);
  }

  /**
   * Get all identities for a provider
   */
  getIdentitiesByProvider(providerId: string): FederatedIdentity[] {
    return Array.from(this.federatedIdentities.values())
      .filter(i => i.providerId === providerId);
  }

  /**
   * Revoke identities by provider IDs
   */
  revokeIdentitiesByProviders(providerIds: Set<string>): void {
    const identities = Array.from(this.federatedIdentities.values());
    for (const identity of identities) {
      if (providerIds.has(identity.providerId)) {
        identity.status = 'revoked';
      }
    }
  }

  /**
   * Get total count
   */
  getTotalCount(): number {
    return this.federatedIdentities.size;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.federatedIdentities.clear();
    this.identityLinks.clear();
  }

  private determineRole(claims: FederatedClaims): string {
    if (claims.roles && claims.roles.length > 0) {
      if (claims.roles.includes('admin') || claims.roles.includes('administrator')) {
        return 'admin';
      }
      if (claims.roles.includes('user')) {
        return 'user';
      }
    }

    if (claims.groups && claims.groups.length > 0) {
      if (claims.groups.some(g => g.toLowerCase().includes('admin'))) {
        return 'admin';
      }
    }

    return 'user';
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private setNestedValue(
    obj: Record<string, unknown>,
    path: string,
    value: unknown
  ): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        (current as Record<string, unknown>)[part] = {};
      }
      current = (current as Record<string, unknown>)[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  private evaluateCondition(value: unknown, condition: ClaimCondition): boolean {
    switch (condition.type) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return typeof value === 'string' && value.includes(condition.value || '');
      case 'regex':
        return typeof value === 'string' && new RegExp(condition.value || '').test(value);
      case 'exists':
        return value !== undefined && value !== null;
      case 'notExists':
        return value === undefined || value === null;
      default:
        return true;
    }
  }

  private async applyTransformation(
    value: unknown,
    rule: ClaimsMappingRule,
    context: Record<string, unknown>
  ): Promise<unknown> {
    switch (rule.transformation.type) {
      case 'passthrough':
        return value;

      case 'map': {
        const mapping = rule.transformation.config.mapping as Record<string, unknown>;
        if (!mapping) return value;
        const stringValue = String(value);
        return mapping[stringValue] ?? rule.transformation.config.default ?? value;
      }

      case 'regex': {
        if (typeof value !== 'string') return value;
        const pattern = rule.transformation.config.pattern as string;
        const replacement = rule.transformation.config.replacement as string;
        if (!pattern) return value;
        return value.replace(new RegExp(pattern, 'g'), replacement || '');
      }

      case 'script': {
        const script = rule.transformation.config.script as string;
        switch (script) {
          case 'toLowerCase':
            return typeof value === 'string' ? value.toLowerCase() : value;
          case 'toUpperCase':
            return typeof value === 'string' ? value.toUpperCase() : value;
          case 'trim':
            return typeof value === 'string' ? value.trim() : value;
          case 'extractDomain':
            if (typeof value === 'string' && value.includes('@')) {
              return value.split('@')[1];
            }
            return value;
          case 'joinGroups':
            if (Array.isArray(value)) {
              return value.join(',');
            }
            return value;
          default:
            return value;
        }
      }

      case 'lookup':
        return value;

      default:
        return value;
    }
  }

  private copyUnmappedClaims(target: FederatedClaims, source: FederatedClaims): void {
    if (!target.email && source.email) target.email = source.email;
    if (!target.name && source.name) target.name = source.name;
    if (!target.givenName && source.givenName) target.givenName = source.givenName;
    if (!target.familyName && source.familyName) target.familyName = source.familyName;
    if (!target.groups && source.groups) target.groups = [...source.groups];
    if (!target.roles && source.roles) target.roles = [...source.roles];
    if (!target.permissions && source.permissions) target.permissions = [...source.permissions];
  }
}
