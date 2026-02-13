/**
 * Active Directory Group Mapper
 * Maps AD groups to application roles with nested group support
 */

import { ActiveDirectoryProvider } from './ActiveDirectoryProvider';
import { GroupMappingRule, LDAPUser } from '../../types/ldap';
import { logger } from '../../services/SimpleLogger';
import { Role } from '../../backend/auth/RBACService';

export class ADGroupMapper {
  private mappingRules: GroupMappingRule[] = [];
  private groupCache: Map<string, string[]> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

  constructor(private adProvider: ActiveDirectoryProvider) {}

  /**
   * Add mapping rule
   */
  addMapping(rule: GroupMappingRule): void {
    this.mappingRules.push(rule);
    this.sortMappingsByPriority();

    logger.debug('Group mapping added', {
      ldapGroup: rule.ldapGroup,
      appRole: rule.appRole,
      priority: rule.priority,
    });
  }

  /**
   * Add multiple mapping rules
   */
  addMappings(rules: GroupMappingRule[]): void {
    this.mappingRules.push(...rules);
    this.sortMappingsByPriority();

    logger.info('Group mappings added', { count: rules.length });
  }

  /**
   * Set mapping rules (replace existing)
   */
  setMappings(rules: GroupMappingRule[]): void {
    this.mappingRules = [...rules];
    this.sortMappingsByPriority();

    logger.info('Group mappings set', { count: rules.length });
  }

  /**
   * Load mappings from configuration
   */
  loadMappingsFromConfig(mappingConfig: Record<string, string>): void {
    const rules: GroupMappingRule[] = Object.entries(mappingConfig).map(
      ([ldapGroup, appRole], index) => ({
        ldapGroup,
        appRole,
        priority: 100 - index, // Higher priority for first entries
      })
    );

    this.setMappings(rules);
  }

  /**
   * Map user groups to application role
   */
  async mapUserToRole(user: LDAPUser): Promise<string> {
    try {
      // Get all user groups (including nested)
      const allGroups = await this.getAllUserGroups(user);

      logger.debug('Mapping user to role', {
        username: user.username,
        groups: allGroups.length,
      });

      // Find matching role based on mapping rules
      for (const rule of this.mappingRules) {
        if (this.groupMatches(rule.ldapGroup, allGroups)) {
          // Check additional condition if provided
          if (rule.condition && !rule.condition(user)) {
            continue;
          }

          logger.info('User mapped to role', {
            username: user.username,
            group: rule.ldapGroup,
            role: rule.appRole,
          });

          return rule.appRole;
        }
      }

      // No matching group found, return default role
      logger.info('No matching group found, using default role', {
        username: user.username,
      });

      return 'user'; // Default role
    } catch (error) {
      logger.error('Failed to map user to role', {
        username: user.username,
        error: error instanceof Error ? error.message : String(error),
      });

      return 'user'; // Default role on error
    }
  }

  /**
   * Map user groups to multiple roles
   */
  async mapUserToRoles(user: LDAPUser): Promise<string[]> {
    try {
      const allGroups = await this.getAllUserGroups(user);
      const roles = new Set<string>();

      for (const rule of this.mappingRules) {
        if (this.groupMatches(rule.ldapGroup, allGroups)) {
          if (!rule.condition || rule.condition(user)) {
            roles.add(rule.appRole);
          }
        }
      }

      // If no roles found, add default
      if (roles.size === 0) {
        roles.add('user');
      }

      logger.info('User mapped to roles', {
        username: user.username,
        roles: Array.from(roles),
      });

      return Array.from(roles);
    } catch (error) {
      logger.error('Failed to map user to roles', {
        username: user.username,
        error: error instanceof Error ? error.message : String(error),
      });

      return ['user'];
    }
  }

  /**
   * Get all user groups (including nested)
   */
  private async getAllUserGroups(user: LDAPUser): Promise<string[]> {
    const cacheKey = user.dn;

    // Check cache
    if (this.groupCache.has(cacheKey)) {
      const cached = this.groupCache.get(cacheKey)!;
      logger.debug('Using cached groups', { username: user.username, groups: cached.length });
      return cached;
    }

    // Get nested groups from AD provider
    const nestedGroups = await this.adProvider.getNestedGroups(user.username);

    // Combine direct and nested groups
    const allGroups = [...new Set([...(user.memberOf || []), ...nestedGroups])];

    // Cache the result
    this.groupCache.set(cacheKey, allGroups);

    // Schedule cache cleanup
    setTimeout(() => {
      this.groupCache.delete(cacheKey);
    }, this.cacheExpiry);

    logger.debug('Retrieved all user groups', {
      username: user.username,
      directGroups: user.memberOf?.length || 0,
      nestedGroups: nestedGroups.length,
      totalGroups: allGroups.length,
    });

    return allGroups;
  }

  /**
   * Check if group matches
   */
  private groupMatches(ruleGroup: string, userGroups: string[]): boolean {
    // Support both DN and CN matching
    for (const userGroup of userGroups) {
      // Exact match
      if (userGroup === ruleGroup) {
        return true;
      }

      // Extract CN from DN and compare
      const cnMatch = userGroup.match(/^CN=([^,]+)/i);
      if (cnMatch && cnMatch[1].toLowerCase() === ruleGroup.toLowerCase()) {
        return true;
      }

      // Check if rule group is contained in user group DN
      if (userGroup.toLowerCase().includes(ruleGroup.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sort mappings by priority (highest first)
   */
  private sortMappingsByPriority(): void {
    this.mappingRules.sort((a, b) => {
      const priorityA = a.priority || 0;
      const priorityB = b.priority || 0;
      return priorityB - priorityA;
    });
  }

  /**
   * Get mapping for specific group
   */
  getMappingForGroup(groupDN: string): string | null {
    for (const rule of this.mappingRules) {
      if (this.groupMatches(rule.ldapGroup, [groupDN])) {
        return rule.appRole;
      }
    }

    return null;
  }

  /**
   * Get all mappings
   */
  getMappings(): GroupMappingRule[] {
    return [...this.mappingRules];
  }

  /**
   * Clear all mappings
   */
  clearMappings(): void {
    this.mappingRules = [];
    logger.info('Group mappings cleared');
  }

  /**
   * Clear group cache
   */
  clearCache(): void {
    this.groupCache.clear();
    logger.debug('Group cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.groupCache.size,
      keys: Array.from(this.groupCache.keys()),
    };
  }

  /**
   * Create default AD group mappings
   */
  static createDefaultMappings(): GroupMappingRule[] {
    return [
      {
        ldapGroup: 'Domain Admins',
        appRole: Role.SUPER_ADMIN,
        priority: 1000,
      },
      {
        ldapGroup: 'Administrators',
        appRole: Role.ADMIN,
        priority: 900,
      },
      {
        ldapGroup: 'IT Department',
        appRole: Role.ADMIN,
        priority: 800,
      },
      {
        ldapGroup: 'Managers',
        appRole: Role.MANAGER,
        priority: 700,
      },
      {
        ldapGroup: 'Developers',
        appRole: Role.DEVELOPER,
        priority: 600,
      },
      {
        ldapGroup: 'Engineering',
        appRole: Role.DEVELOPER,
        priority: 590,
      },
      {
        ldapGroup: 'Users',
        appRole: Role.USER,
        priority: 500,
      },
      {
        ldapGroup: 'Domain Users',
        appRole: Role.USER,
        priority: 400,
      },
      {
        ldapGroup: 'Guests',
        appRole: Role.GUEST,
        priority: 100,
      },
    ];
  }

  /**
   * Validate mapping rules
   */
  validateMappings(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.mappingRules.length === 0) {
      errors.push('No group mappings defined');
    }

    const groupsSeen = new Set<string>();
    for (const rule of this.mappingRules) {
      if (!rule.ldapGroup) {
        errors.push('Mapping rule missing ldapGroup');
      }

      if (!rule.appRole) {
        errors.push(`Mapping rule for ${rule.ldapGroup} missing appRole`);
      }

      if (groupsSeen.has(rule.ldapGroup)) {
        logger.warn('Duplicate mapping for group', { group: rule.ldapGroup });
      }

      groupsSeen.add(rule.ldapGroup);
    }

    if (errors.length > 0) {
      logger.error('Group mapping validation failed', { errors });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Factory function
export function createADGroupMapper(adProvider: ActiveDirectoryProvider): ADGroupMapper {
  return new ADGroupMapper(adProvider);
}
