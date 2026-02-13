/**
 * Generic LDAP Group Mapper
 * Maps LDAP groups to application roles (works with OpenLDAP and AD)
 */

import { LDAPAuthProvider } from './LDAPAuthProvider';
import { GroupMappingRule, LDAPUser } from '../../types/ldap';
import { logger } from '../../services/SimpleLogger';

export class GroupMapper {
  private mappingRules: GroupMappingRule[] = [];

  constructor(private ldapProvider: LDAPAuthProvider) {}

  /**
   * Add mapping rule
   */
  addMapping(rule: GroupMappingRule): void {
    this.mappingRules.push(rule);
    this.sortMappingsByPriority();
  }

  /**
   * Set mapping rules
   */
  setMappings(rules: GroupMappingRule[]): void {
    this.mappingRules = [...rules];
    this.sortMappingsByPriority();
  }

  /**
   * Load from configuration
   */
  loadFromConfig(config: Record<string, string>): void {
    const rules: GroupMappingRule[] = Object.entries(config).map(([ldapGroup, appRole], index) => ({
      ldapGroup,
      appRole,
      priority: 100 - index,
    }));

    this.setMappings(rules);
  }

  /**
   * Map user to role
   */
  async mapUserToRole(user: LDAPUser): Promise<string> {
    const userGroups = user.groups || [];

    for (const rule of this.mappingRules) {
      if (this.groupMatches(rule.ldapGroup, userGroups, user.memberOf || [])) {
        if (!rule.condition || rule.condition(user)) {
          return rule.appRole;
        }
      }
    }

    return 'user'; // Default role
  }

  /**
   * Map user to multiple roles
   */
  async mapUserToRoles(user: LDAPUser): Promise<string[]> {
    const roles = new Set<string>();
    const userGroups = user.groups || [];

    for (const rule of this.mappingRules) {
      if (this.groupMatches(rule.ldapGroup, userGroups, user.memberOf || [])) {
        if (!rule.condition || rule.condition(user)) {
          roles.add(rule.appRole);
        }
      }
    }

    if (roles.size === 0) {
      roles.add('user');
    }

    return Array.from(roles);
  }

  /**
   * Check if group matches
   */
  private groupMatches(ruleGroup: string, groupNames: string[], groupDNs: string[]): boolean {
    // Check group names
    if (groupNames.some((name) => name.toLowerCase() === ruleGroup.toLowerCase())) {
      return true;
    }

    // Check group DNs
    for (const dn of groupDNs) {
      if (dn === ruleGroup) return true;

      const cnMatch = dn.match(/^CN=([^,]+)/i);
      if (cnMatch && cnMatch[1].toLowerCase() === ruleGroup.toLowerCase()) {
        return true;
      }
    }

    return false;
  }

  /**
   * Sort by priority
   */
  private sortMappingsByPriority(): void {
    this.mappingRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Get mappings
   */
  getMappings(): GroupMappingRule[] {
    return [...this.mappingRules];
  }
}
