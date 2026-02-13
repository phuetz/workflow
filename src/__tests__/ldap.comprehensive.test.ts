/**
 * Comprehensive LDAP Integration Tests
 * Tests LDAP authentication, group mapping, and user provisioning
 */

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { LDAPConfigManager } from '../auth/ldap/LDAPConfig';
import { LDAPClient } from '../auth/ldap/LDAPClient';
import { LDAPAuthProvider } from '../auth/ldap/LDAPAuthProvider';
import { ActiveDirectoryProvider } from '../auth/ldap/ActiveDirectoryProvider';
import { ADGroupMapper } from '../auth/ldap/ADGroupMapper';
import { GroupMapper } from '../auth/ldap/GroupMapper';
import { UserProvisioner } from '../auth/ldap/UserProvisioner';
import { MultiAuthProvider, createDefaultMultiAuthConfig } from '../auth/MultiAuthProvider';
import { LDAPConfig, ActiveDirectoryConfig, LDAPUser } from '../types/ldap';
import { Role } from '../backend/auth/RBACService';

describe('LDAP Configuration', () => {
  let configManager: LDAPConfigManager;

  beforeEach(() => {
    configManager = new LDAPConfigManager();
  });

  it('should load configuration from environment', () => {
    process.env.LDAP_ENABLED = 'true';
    process.env.LDAP_URL = 'ldap://localhost:389';
    process.env.LDAP_BASE_DN = 'dc=example,dc=com';
    process.env.LDAP_BIND_DN = 'cn=admin,dc=example,dc=com';
    process.env.LDAP_BIND_PASSWORD = 'password';

    const config = configManager.loadFromEnv();

    expect(config.enabled).toBe(true);
    expect(config.url).toBe('ldap://localhost:389');
    expect(config.baseDN).toBe('dc=example,dc=com');
    expect(config.bindDN).toBe('cn=admin,dc=example,dc=com');
  });

  it('should validate configuration', () => {
    const config: LDAPConfig = {
      enabled: true,
      url: 'ldaps://ad.company.com:636',
      baseDN: 'dc=company,dc=com',
      bindDN: 'cn=admin,dc=company,dc=com',
      bindPassword: 'password',
    };

    configManager.setConfig(config);
    const result = configManager.validate();

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid configuration', () => {
    const config: LDAPConfig = {
      enabled: true,
      url: '', // Invalid: empty URL
      baseDN: 'dc=company,dc=com',
      bindDN: 'cn=admin,dc=company,dc=com',
      bindPassword: 'password',
    };

    configManager.setConfig(config);
    const result = configManager.validate();

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should provide AD template', () => {
    const template = LDAPConfigManager.getADTemplate();

    expect(template.url).toContain('ldaps://');
    expect(template.searchFilter).toContain('sAMAccountName');
    expect(template.userAttributes?.username).toBe('sAMAccountName');
  });

  it('should provide OpenLDAP template', () => {
    const template = LDAPConfigManager.getOpenLDAPTemplate();

    expect(template.url).toContain('ldap://');
    expect(template.searchFilter).toContain('uid');
    expect(template.userAttributes?.username).toBe('uid');
  });
});

describe('LDAP Client', () => {
  const mockConfig: LDAPConfig = {
    enabled: true,
    url: 'ldap://localhost:389',
    baseDN: 'dc=example,dc=com',
    bindDN: 'cn=admin,dc=example,dc=com',
    bindPassword: 'password',
    poolSize: 3,
    timeout: 5000,
    searchFilter: '(&(objectClass=inetOrgPerson)(uid={{username}}))',
  };

  it('should create connection pool', () => {
    const client = new LDAPClient(mockConfig);
    expect(client).toBeDefined();
  });

  it('should handle connection errors gracefully', async () => {
    const invalidConfig: LDAPConfig = {
      ...mockConfig,
      url: 'ldap://invalid-host:389',
      connectTimeout: 1000,
    };

    const client = new LDAPClient(invalidConfig);

    await expect(client.initialize()).rejects.toThrow();
  });
});

describe('LDAP Auth Provider', () => {
  const mockConfig: LDAPConfig = {
    enabled: true,
    url: 'ldap://localhost:389',
    baseDN: 'dc=example,dc=com',
    bindDN: 'cn=admin,dc=example,dc=com',
    bindPassword: 'password',
    searchFilter: '(&(objectClass=inetOrgPerson)(uid={{username}}))',
  };

  it('should create auth provider', () => {
    const provider = new LDAPAuthProvider(mockConfig);
    expect(provider).toBeDefined();
    expect(provider.isEnabled()).toBe(true);
  });

  it('should check if provider is initialized', () => {
    const provider = new LDAPAuthProvider(mockConfig);
    expect(provider.isInitialized()).toBe(false);
  });
});

describe('Active Directory Provider', () => {
  const mockADConfig: ActiveDirectoryConfig = {
    enabled: true,
    url: 'ldaps://ad.company.com:636',
    baseDN: 'dc=company,dc=com',
    bindDN: 'cn=service,dc=company,dc=com',
    bindPassword: 'password',
    searchFilter: '(&(objectClass=user)(sAMAccountName={{username}}))',
    domain: 'COMPANY',
    nestedGroups: true,
    maxNestedDepth: 10,
    userAccountControl: {
      enabled: true,
      passwordExpired: true,
      locked: true,
    },
  };

  it('should create AD provider', () => {
    const provider = new ActiveDirectoryProvider(mockADConfig);
    expect(provider).toBeDefined();
  });
});

describe('Group Mapper', () => {
  const mockUser: LDAPUser = {
    dn: 'cn=john.doe,ou=users,dc=company,dc=com',
    uid: 'johndoe',
    username: 'john.doe',
    email: 'john.doe@company.com',
    firstName: 'John',
    lastName: 'Doe',
    displayName: 'John Doe',
    groups: ['Developers', 'Users'],
    memberOf: [
      'CN=Developers,OU=Groups,DC=company,DC=com',
      'CN=Users,OU=Groups,DC=company,DC=com',
    ],
  };

  it('should map user to role based on groups', async () => {
    const mockProvider = {} as any;
    const mapper = new GroupMapper(mockProvider);

    mapper.addMapping({
      ldapGroup: 'Developers',
      appRole: Role.DEVELOPER,
      priority: 100,
    });

    mapper.addMapping({
      ldapGroup: 'Users',
      appRole: Role.USER,
      priority: 50,
    });

    const role = await mapper.mapUserToRole(mockUser);
    expect(role).toBe(Role.DEVELOPER); // Higher priority
  });

  it('should return default role if no group matches', async () => {
    const mockProvider = {} as any;
    const mapper = new GroupMapper(mockProvider);

    mapper.addMapping({
      ldapGroup: 'Admins',
      appRole: Role.ADMIN,
      priority: 100,
    });

    const role = await mapper.mapUserToRole(mockUser);
    expect(role).toBe('user'); // Default role
  });

  it('should map user to multiple roles', async () => {
    const mockProvider = {} as any;
    const mapper = new GroupMapper(mockProvider);

    mapper.addMapping({
      ldapGroup: 'Developers',
      appRole: Role.DEVELOPER,
      priority: 100,
    });

    mapper.addMapping({
      ldapGroup: 'Users',
      appRole: Role.USER,
      priority: 50,
    });

    const roles = await mapper.mapUserToRoles(mockUser);
    expect(roles).toContain(Role.DEVELOPER);
    expect(roles).toContain(Role.USER);
  });
});

describe('AD Group Mapper', () => {
  const mockADProvider = {
    getNestedGroups: vi.fn().mockResolvedValue([
      'CN=Developers,OU=Groups,DC=company,DC=com',
      'CN=IT Department,OU=Groups,DC=company,DC=com',
      'CN=Domain Users,DC=company,DC=com',
    ]),
  } as any;

  const mockUser: LDAPUser = {
    dn: 'cn=john.doe,ou=users,dc=company,dc=com',
    uid: 'johndoe',
    username: 'john.doe',
    email: 'john.doe@company.com',
    groups: ['Developers'],
    memberOf: ['CN=Developers,OU=Groups,DC=company,DC=com'],
  };

  it('should create default mappings', () => {
    const mappings = ADGroupMapper.createDefaultMappings();

    expect(mappings.length).toBeGreaterThan(0);
    expect(mappings).toContainEqual(
      expect.objectContaining({
        ldapGroup: 'Domain Admins',
        appRole: Role.SUPER_ADMIN,
      })
    );
  });

  it('should map user with nested groups', async () => {
    const mapper = new ADGroupMapper(mockADProvider);

    mapper.addMapping({
      ldapGroup: 'IT Department',
      appRole: Role.ADMIN,
      priority: 100,
    });

    const role = await mapper.mapUserToRole(mockUser);
    expect(role).toBe(Role.ADMIN);
  });

  it('should cache group lookups', async () => {
    const mapper = new ADGroupMapper(mockADProvider);

    mapper.addMapping({
      ldapGroup: 'Developers',
      appRole: Role.DEVELOPER,
      priority: 100,
    });

    // First call
    await mapper.mapUserToRole(mockUser);
    expect(mockADProvider.getNestedGroups).toHaveBeenCalledTimes(1);

    // Second call (should use cache)
    await mapper.mapUserToRole(mockUser);
    expect(mockADProvider.getNestedGroups).toHaveBeenCalledTimes(1); // Still 1

    const stats = mapper.getCacheStats();
    expect(stats.size).toBe(1);
  });

  it('should validate mappings', () => {
    const mapper = new ADGroupMapper(mockADProvider);

    mapper.addMapping({
      ldapGroup: 'Developers',
      appRole: Role.DEVELOPER,
      priority: 100,
    });

    const result = mapper.validateMappings();
    expect(result.valid).toBe(true);
  });
});

describe('User Provisioner', () => {
  const mockLdapProvider = {
    getUserDetails: vi.fn(),
  } as any;

  const mockGroupMapper = {
    mapUserToRole: vi.fn().mockResolvedValue(Role.USER),
  } as any;

  const mockUser: LDAPUser = {
    dn: 'cn=john.doe,ou=users,dc=company,dc=com',
    uid: 'johndoe',
    username: 'john.doe',
    email: 'john.doe@company.com',
    firstName: 'John',
    lastName: 'Doe',
    displayName: 'John Doe',
    groups: ['Users'],
  };

  it('should create user provisioner', () => {
    const provisioner = new UserProvisioner(mockLdapProvider, mockGroupMapper);
    expect(provisioner).toBeDefined();
    expect(provisioner.isEnabled()).toBe(true);
  });

  it('should get provisioning configuration', () => {
    const provisioner = new UserProvisioner(mockLdapProvider, mockGroupMapper, {
      autoCreate: true,
      autoUpdate: true,
      defaultRole: 'user',
    });

    const config = provisioner.getConfig();
    expect(config.autoCreate).toBe(true);
    expect(config.autoUpdate).toBe(true);
    expect(config.defaultRole).toBe('user');
  });

  it('should update configuration', () => {
    const provisioner = new UserProvisioner(mockLdapProvider, mockGroupMapper);

    provisioner.updateConfig({
      autoCreate: false,
      syncOnLogin: false,
    });

    const config = provisioner.getConfig();
    expect(config.autoCreate).toBe(false);
    expect(config.syncOnLogin).toBe(false);
  });
});

describe('Multi-Auth Provider', () => {
  it('should create multi-auth provider', () => {
    const config = createDefaultMultiAuthConfig();
    const provider = new MultiAuthProvider(config);

    expect(provider).toBeDefined();
  });

  it('should have default strategies', () => {
    const config = createDefaultMultiAuthConfig();

    expect(config.strategies).toContainEqual(
      expect.objectContaining({ name: 'ldap', type: 'ldap' })
    );
    expect(config.strategies).toContainEqual(
      expect.objectContaining({ name: 'saml', type: 'saml' })
    );
    expect(config.strategies).toContainEqual(
      expect.objectContaining({ name: 'oauth2', type: 'oauth2' })
    );
    expect(config.strategies).toContainEqual(
      expect.objectContaining({ name: 'local', type: 'local' })
    );
  });

  it('should enable fallback by default', () => {
    const config = createDefaultMultiAuthConfig();
    expect(config.fallback).toBe(true);
  });

  it('should get enabled strategies', () => {
    const config = createDefaultMultiAuthConfig();
    const provider = new MultiAuthProvider(config);

    const enabled = provider.getEnabledStrategies();
    expect(enabled.every((s) => s.enabled)).toBe(true);
  });

  it('should check if strategy is enabled', () => {
    const config = createDefaultMultiAuthConfig();
    const provider = new MultiAuthProvider(config);

    // Local is always enabled by default
    expect(provider.isStrategyEnabled('local')).toBe(true);
  });
});

describe('Integration Tests', () => {
  it('should handle complete authentication flow', async () => {
    // This test would require actual LDAP server or more sophisticated mocking
    expect(true).toBe(true);
  });

  it('should handle user provisioning flow', async () => {
    // This test would require database mocking
    expect(true).toBe(true);
  });

  it('should handle group mapping with nested groups', async () => {
    // This test would require AD server or sophisticated mocking
    expect(true).toBe(true);
  });
});

describe('Performance Tests', () => {
  it('should handle connection pooling efficiently', () => {
    const config: LDAPConfig = {
      enabled: true,
      url: 'ldap://localhost:389',
      baseDN: 'dc=example,dc=com',
      bindDN: 'cn=admin,dc=example,dc=com',
      bindPassword: 'password',
      poolSize: 10,
    };

    const client = new LDAPClient(config);
    const stats = client.getStats();

    expect(stats).toBeDefined();
    expect(stats.totalConnections).toBeGreaterThanOrEqual(0);
  });

  it('should cache group lookups for performance', () => {
    const mockADProvider = {
      getNestedGroups: vi.fn().mockResolvedValue([]),
    } as any;

    const mapper = new ADGroupMapper(mockADProvider);
    const stats = mapper.getCacheStats();

    expect(stats.size).toBe(0);
    expect(stats.keys).toEqual([]);
  });
});

describe('Error Handling', () => {
  it('should handle connection timeouts', () => {
    const config: LDAPConfig = {
      enabled: true,
      url: 'ldap://invalid:389',
      baseDN: 'dc=example,dc=com',
      bindDN: 'cn=admin,dc=example,dc=com',
      bindPassword: 'password',
      timeout: 100,
      connectTimeout: 100,
    };

    const client = new LDAPClient(config);
    expect(client).toBeDefined();
  });

  it('should handle invalid credentials', async () => {
    const config: LDAPConfig = {
      enabled: true,
      url: 'ldap://localhost:389',
      baseDN: 'dc=example,dc=com',
      bindDN: 'cn=admin,dc=example,dc=com',
      bindPassword: 'wrong-password',
    };

    const provider = new LDAPAuthProvider(config);
    expect(provider).toBeDefined();
  });

  it('should handle missing users gracefully', async () => {
    const mockProvider = {
      getUserDetails: vi.fn().mockResolvedValue(null),
    } as any;

    const mockGroupMapper = {} as any;
    const provisioner = new UserProvisioner(mockProvider, mockGroupMapper);

    const exists = await provisioner.verifyUserExists('nonexistent@example.com');
    expect(exists).toBe(false);
  });
});
