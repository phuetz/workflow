/**
 * Group Sync
 * Handles attribute mapping and role synchronization from IdP groups
 */

import { EventEmitter } from 'events';
import {
  SSOProviderConfig,
  AuditEventType,
} from './types';

export class GroupSync {
  private eventEmitter: EventEmitter;

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;
  }

  /**
   * Map attributes from IdP to local user
   */
  public mapAttributes(
    provider: SSOProviderConfig,
    idpAttributes: Record<string, unknown>
  ): Record<string, unknown> {
    const mapping = provider.attributeMapping;
    const result: Record<string, unknown> = {};

    // Map standard attributes
    if (mapping.userId && idpAttributes[mapping.userId]) {
      result.id = idpAttributes[mapping.userId];
    }
    if (mapping.email && idpAttributes[mapping.email]) {
      result.email = idpAttributes[mapping.email];
    }
    if (mapping.firstName && idpAttributes[mapping.firstName]) {
      result.firstName = idpAttributes[mapping.firstName];
    }
    if (mapping.lastName && idpAttributes[mapping.lastName]) {
      result.lastName = idpAttributes[mapping.lastName];
    }
    if (mapping.displayName && idpAttributes[mapping.displayName]) {
      result.displayName = idpAttributes[mapping.displayName];
    }
    if (mapping.groups && idpAttributes[mapping.groups]) {
      const groups = idpAttributes[mapping.groups];
      result.groups = Array.isArray(groups) ? groups : [groups];
    }
    if (mapping.department && idpAttributes[mapping.department]) {
      result.department = idpAttributes[mapping.department];
    }
    if (mapping.title && idpAttributes[mapping.title]) {
      result.title = idpAttributes[mapping.title];
    }
    if (mapping.phone && idpAttributes[mapping.phone]) {
      result.phone = idpAttributes[mapping.phone];
    }
    if (mapping.avatar && idpAttributes[mapping.avatar]) {
      result.avatar = idpAttributes[mapping.avatar];
    }
    if (mapping.locale && idpAttributes[mapping.locale]) {
      result.locale = idpAttributes[mapping.locale];
    }
    if (mapping.timezone && idpAttributes[mapping.timezone]) {
      result.timezone = idpAttributes[mapping.timezone];
    }

    // Map custom attributes
    if (mapping.customAttributes) {
      for (const [localKey, idpKey] of Object.entries(mapping.customAttributes)) {
        if (idpAttributes[idpKey]) {
          result[localKey] = idpAttributes[idpKey];
        }
      }
    }

    this.emitAuditEvent('attribute_sync', provider.id, true, {
      mappedAttributes: Object.keys(result),
    });

    return result;
  }

  /**
   * Synchronize roles from IdP groups
   */
  public syncRoles(
    provider: SSOProviderConfig,
    idpGroups: string[]
  ): { roles: string[]; permissions: string[] } {
    const roles: Set<string> = new Set();
    const permissions: Set<string> = new Set();

    // Sort role mappings by priority (higher first)
    const sortedMappings = [...provider.roleMapping].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    );

    for (const mapping of sortedMappings) {
      // Check if user belongs to the IdP group
      const matchesGroup = idpGroups.some((group) => {
        // Support wildcards and regex patterns
        if (mapping.idpGroup.includes('*')) {
          const pattern = new RegExp('^' + mapping.idpGroup.replace(/\*/g, '.*') + '$');
          return pattern.test(group);
        }
        return group === mapping.idpGroup;
      });

      if (matchesGroup) {
        roles.add(mapping.localRole);
        if (mapping.permissions) {
          mapping.permissions.forEach((p) => permissions.add(p));
        }
      }
    }

    this.emitAuditEvent('role_sync', provider.id, true, {
      idpGroups,
      assignedRoles: Array.from(roles),
    });

    return {
      roles: Array.from(roles),
      permissions: Array.from(permissions),
    };
  }

  /**
   * Emit audit event
   */
  private emitAuditEvent(
    eventType: AuditEventType,
    providerId: string,
    success: boolean,
    details: Record<string, unknown>
  ): void {
    this.eventEmitter.emit('audit:request', {
      eventType,
      providerId,
      success,
      details,
    });
  }
}
