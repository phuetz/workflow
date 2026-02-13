/**
 * AuthService Unit Tests
 * Tests for the authentication service - login, logout, token, permissions
 *
 * Task: T2.6 - Tests AuthService
 * Created: 2026-01-07
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock SimpleLogger before importing AuthService
vi.mock('../../services/SimpleLogger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = newStore;
    }
  };
})();

// Set up global localStorage mock
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Import AuthService after mocks are set up
// We need to create a fresh instance for each test
const createAuthService = async () => {
  // Clear the module cache to get a fresh instance
  vi.resetModules();
  const { authService } = await import('../../services/AuthService');
  return authService;
};

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Initial State Tests
  // ============================================
  describe('Initial State', () => {
    it('should start with no user when localStorage is empty', async () => {
      const authService = await createAuthService();
      expect(authService.getCurrentUser()).toBe('anonymous');
    });

    it('should start with no token when localStorage is empty', async () => {
      const authService = await createAuthService();
      expect(authService.getToken()).toBeNull();
    });

    it('should start with null user details when localStorage is empty', async () => {
      const authService = await createAuthService();
      expect(authService.getCurrentUserDetails()).toBeNull();
    });

    it('should load user from localStorage on initialization', async () => {
      const storedData = {
        user: {
          id: 'stored-user-123',
          email: 'stored@example.com',
          name: 'Stored User',
          roles: ['user', 'editor']
        },
        token: 'token_stored_abc123'
      };
      localStorageMock.setItem('auth_user', JSON.stringify(storedData));

      const authService = await createAuthService();

      expect(authService.getCurrentUser()).toBe('stored-user-123');
      expect(authService.getToken()).toBe('token_stored_abc123');
    });

    it('should handle corrupted localStorage data gracefully', async () => {
      const { logger } = await import('../../services/SimpleLogger');
      localStorageMock.setItem('auth_user', 'invalid-json-data');

      const authService = await createAuthService();

      expect(authService.getCurrentUser()).toBe('anonymous');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ============================================
  // Login Tests
  // ============================================
  describe('login', () => {
    it('should successfully login with email and password', async () => {
      const authService = await createAuthService();

      const result = await authService.login('test@example.com', 'password123');

      expect(result).toBe(true);
      expect(authService.getCurrentUser()).not.toBe('anonymous');
    });

    it('should set current user after login', async () => {
      const authService = await createAuthService();

      await authService.login('john@example.com', 'password');

      const userDetails = authService.getCurrentUserDetails();
      expect(userDetails).not.toBeNull();
      expect(userDetails?.email).toBe('john@example.com');
    });

    it('should derive name from email', async () => {
      const authService = await createAuthService();

      await authService.login('jane.doe@company.com', 'password');

      const userDetails = authService.getCurrentUserDetails();
      expect(userDetails?.name).toBe('jane.doe');
    });

    it('should generate a valid token after login', async () => {
      const authService = await createAuthService();

      await authService.login('test@example.com', 'password');

      const token = authService.getToken();
      expect(token).not.toBeNull();
      expect(token).toMatch(/^token_\d+_[a-z0-9]+$/);
    });

    it('should assign default user role', async () => {
      const authService = await createAuthService();

      await authService.login('test@example.com', 'password');

      const userDetails = authService.getCurrentUserDetails();
      expect(userDetails?.roles).toContain('user');
    });

    it('should persist login to localStorage', async () => {
      const authService = await createAuthService();

      await authService.login('persist@example.com', 'password');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'auth_user',
        expect.stringContaining('persist@example.com')
      );
    });

    it('should log successful login', async () => {
      const { logger } = await import('../../services/SimpleLogger');
      const authService = await createAuthService();

      await authService.login('test@example.com', 'password');

      expect(logger.info).toHaveBeenCalledWith(
        'User logged in',
        expect.objectContaining({ userId: expect.any(String) })
      );
    });

    it('should generate unique user IDs for each login', async () => {
      const authService = await createAuthService();

      await authService.login('user1@example.com', 'password');
      const userId1 = authService.getCurrentUser();

      authService.logout();

      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      await authService.login('user2@example.com', 'password');
      const userId2 = authService.getCurrentUser();

      expect(userId1).not.toBe(userId2);
    });
  });

  // ============================================
  // Logout Tests
  // ============================================
  describe('logout', () => {
    it('should clear current user on logout', async () => {
      const authService = await createAuthService();
      await authService.login('test@example.com', 'password');

      authService.logout();

      expect(authService.getCurrentUser()).toBe('anonymous');
    });

    it('should clear token on logout', async () => {
      const authService = await createAuthService();
      await authService.login('test@example.com', 'password');

      authService.logout();

      expect(authService.getToken()).toBeNull();
    });

    it('should clear user details on logout', async () => {
      const authService = await createAuthService();
      await authService.login('test@example.com', 'password');

      authService.logout();

      expect(authService.getCurrentUserDetails()).toBeNull();
    });

    it('should remove data from localStorage on logout', async () => {
      const authService = await createAuthService();
      await authService.login('test@example.com', 'password');

      authService.logout();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user');
    });

    it('should log logout event', async () => {
      const { logger } = await import('../../services/SimpleLogger');
      const authService = await createAuthService();
      await authService.login('test@example.com', 'password');

      authService.logout();

      expect(logger.info).toHaveBeenCalledWith('User logged out');
    });

    it('should handle logout when not logged in', async () => {
      const authService = await createAuthService();

      // Should not throw
      expect(() => authService.logout()).not.toThrow();
      expect(authService.getCurrentUser()).toBe('anonymous');
    });
  });

  // ============================================
  // getCurrentUser Tests
  // ============================================
  describe('getCurrentUser', () => {
    it('should return anonymous when not logged in', async () => {
      const authService = await createAuthService();
      expect(authService.getCurrentUser()).toBe('anonymous');
    });

    it('should return user ID when logged in', async () => {
      const authService = await createAuthService();
      await authService.login('test@example.com', 'password');

      const userId = authService.getCurrentUser();

      expect(userId).toMatch(/^user_\d+$/);
    });
  });

  // ============================================
  // getCurrentUserDetails Tests
  // ============================================
  describe('getCurrentUserDetails', () => {
    it('should return null when not logged in', async () => {
      const authService = await createAuthService();
      expect(authService.getCurrentUserDetails()).toBeNull();
    });

    it('should return complete user object when logged in', async () => {
      const authService = await createAuthService();
      await authService.login('complete@example.com', 'password');

      const user = authService.getCurrentUserDetails();

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email', 'complete@example.com');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('roles');
    });
  });

  // ============================================
  // getToken Tests
  // ============================================
  describe('getToken', () => {
    it('should return null when not logged in', async () => {
      const authService = await createAuthService();
      expect(authService.getToken()).toBeNull();
    });

    it('should return valid token when logged in', async () => {
      const authService = await createAuthService();
      await authService.login('test@example.com', 'password');

      const token = authService.getToken();

      expect(token).not.toBeNull();
      expect(typeof token).toBe('string');
    });

    it('should return token loaded from localStorage', async () => {
      const storedData = {
        user: { id: 'user-1', email: 'test@test.com', name: 'Test', roles: ['user'] },
        token: 'token_preexisting_123'
      };
      localStorageMock.setItem('auth_user', JSON.stringify(storedData));

      const authService = await createAuthService();

      expect(authService.getToken()).toBe('token_preexisting_123');
    });
  });

  // ============================================
  // hasPermission Tests
  // ============================================
  describe('hasPermission', () => {
    it('should return false when not logged in', async () => {
      const authService = await createAuthService();
      expect(authService.hasPermission('read')).toBe(false);
    });

    it('should return false for non-matching permission', async () => {
      const authService = await createAuthService();
      await authService.login('test@example.com', 'password');

      // Default role is 'user', not 'admin' or 'editor'
      expect(authService.hasPermission('editor')).toBe(false);
    });

    it('should return true when user has matching role', async () => {
      // Set up a user with specific roles
      const storedData = {
        user: { id: 'user-1', email: 'test@test.com', name: 'Test', roles: ['user', 'editor'] },
        token: 'token_123'
      };
      localStorageMock.setItem('auth_user', JSON.stringify(storedData));

      const authService = await createAuthService();

      expect(authService.hasPermission('editor')).toBe(true);
    });

    it('should return true for any permission when user is admin', async () => {
      const storedData = {
        user: { id: 'admin-1', email: 'admin@test.com', name: 'Admin', roles: ['admin'] },
        token: 'token_admin'
      };
      localStorageMock.setItem('auth_user', JSON.stringify(storedData));

      const authService = await createAuthService();

      expect(authService.hasPermission('anything')).toBe(true);
      expect(authService.hasPermission('delete')).toBe(true);
      expect(authService.hasPermission('manage_users')).toBe(true);
    });

    it('should check user role as permission', async () => {
      const authService = await createAuthService();
      await authService.login('test@example.com', 'password');

      // Default login gives 'user' role
      expect(authService.hasPermission('user')).toBe(true);
    });
  });

  // ============================================
  // verifyToken Tests
  // ============================================
  describe('verifyToken', () => {
    it('should return user for valid token format', async () => {
      const authService = await createAuthService();

      const user = await authService.verifyToken('token_123456_abc');

      expect(user).not.toBeNull();
      expect(user?.email).toBe('user@example.com');
    });

    it('should return null for invalid token format', async () => {
      const authService = await createAuthService();

      const user = await authService.verifyToken('invalid_token');

      expect(user).toBeNull();
    });

    it('should return null for empty token', async () => {
      const authService = await createAuthService();

      const user = await authService.verifyToken('');

      expect(user).toBeNull();
    });

    it('should return user with correct structure', async () => {
      const authService = await createAuthService();

      const user = await authService.verifyToken('token_valid_xyz');

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('roles');
    });

    it('should return user with user role', async () => {
      const authService = await createAuthService();

      const user = await authService.verifyToken('token_test_123');

      expect(user?.roles).toContain('user');
    });
  });

  // ============================================
  // Session Persistence Tests
  // ============================================
  describe('Session Persistence', () => {
    it('should persist session across service instances', async () => {
      // Login with first instance
      const authService1 = await createAuthService();
      await authService1.login('persistent@example.com', 'password');
      const originalUserId = authService1.getCurrentUser();

      // Create new instance (simulates page reload)
      const authService2 = await createAuthService();

      expect(authService2.getCurrentUser()).toBe(originalUserId);
    });

    it('should persist token across service instances', async () => {
      const authService1 = await createAuthService();
      await authService1.login('test@example.com', 'password');
      const originalToken = authService1.getToken();

      const authService2 = await createAuthService();

      expect(authService2.getToken()).toBe(originalToken);
    });

    it('should not persist after logout', async () => {
      const authService1 = await createAuthService();
      await authService1.login('test@example.com', 'password');
      authService1.logout();

      const authService2 = await createAuthService();

      expect(authService2.getCurrentUser()).toBe('anonymous');
      expect(authService2.getToken()).toBeNull();
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle special characters in email', async () => {
      const authService = await createAuthService();

      await authService.login('test+special@example.com', 'password');

      expect(authService.getCurrentUserDetails()?.email).toBe('test+special@example.com');
    });

    it('should handle very long email addresses', async () => {
      const authService = await createAuthService();
      const longEmail = 'a'.repeat(100) + '@example.com';

      await authService.login(longEmail, 'password');

      expect(authService.getCurrentUserDetails()?.email).toBe(longEmail);
    });

    it('should handle multiple sequential logins', async () => {
      const authService = await createAuthService();

      await authService.login('first@example.com', 'password');
      await authService.login('second@example.com', 'password');
      await authService.login('third@example.com', 'password');

      expect(authService.getCurrentUserDetails()?.email).toBe('third@example.com');
    });

    it('should handle login after logout', async () => {
      const authService = await createAuthService();

      await authService.login('first@example.com', 'password');
      authService.logout();
      await authService.login('second@example.com', 'password');

      expect(authService.getCurrentUserDetails()?.email).toBe('second@example.com');
      expect(authService.getToken()).not.toBeNull();
    });

    it('should handle concurrent permission checks', async () => {
      const storedData = {
        user: { id: 'user-1', email: 'test@test.com', name: 'Test', roles: ['user', 'editor', 'reviewer'] },
        token: 'token_123'
      };
      localStorageMock.setItem('auth_user', JSON.stringify(storedData));

      const authService = await createAuthService();

      // Check multiple permissions
      const results = ['user', 'editor', 'reviewer', 'admin', 'delete'].map(
        perm => authService.hasPermission(perm)
      );

      expect(results).toEqual([true, true, true, false, false]);
    });
  });

  // ============================================
  // Type Safety Tests
  // ============================================
  describe('Type Safety', () => {
    it('should return string from getCurrentUser', async () => {
      const authService = await createAuthService();
      expect(typeof authService.getCurrentUser()).toBe('string');

      await authService.login('test@example.com', 'password');
      expect(typeof authService.getCurrentUser()).toBe('string');
    });

    it('should return boolean from login', async () => {
      const authService = await createAuthService();
      const result = await authService.login('test@example.com', 'password');
      expect(typeof result).toBe('boolean');
    });

    it('should return boolean from hasPermission', async () => {
      const authService = await createAuthService();
      expect(typeof authService.hasPermission('read')).toBe('boolean');
    });

    it('should return Promise from verifyToken', async () => {
      const authService = await createAuthService();
      const result = authService.verifyToken('token_123');
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
