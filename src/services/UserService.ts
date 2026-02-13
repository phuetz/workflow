import { EventEmitter } from 'events';
import { logger } from './SimpleLogger';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  plan: 'free' | 'pro' | 'enterprise';
  role: 'user' | 'admin' | 'owner';
  createdAt: string;
  lastLogin: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      workflow: boolean;
    };
  };
}

class UserService extends EventEmitter {
  private currentUser: User | null = null;
  private authToken: string | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    // Skip localStorage in Node.js backend environment
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('currentUser');

      if (token && userData) {
        this.authToken = token;
        this.currentUser = JSON.parse(userData);
        this.emit('userLoaded', this.currentUser);
        this.startTokenRefresh();
      }
    } catch (error) {
      logger.error('Failed to load user from storage:', error);
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      this.authToken = data.tokens.accessToken;
      this.currentUser = data.user;

      // Store in localStorage (browser only)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('authToken', this.authToken);
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        localStorage.setItem('refreshToken', data.tokens.refreshToken);
      }

      this.emit('login', this.currentUser);
      this.startTokenRefresh();
      
      return { success: true, user: this.currentUser };
    } catch (error: any) {
      logger.error('Login error:', error);
      return { success: false, error: error.message || 'Network error. Please try again.' };
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.authToken) {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        });
      }
    } catch (error) {
      logger.error('Logout error:', error);
    } finally {
      this.clearSession();
      this.emit('logout');
    }
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      await response.json(); // Response data not needed
      return await this.login(userData.email, userData.password);
    } catch (error: any) {
      logger.error('Registration error:', error);
      return { success: false, error: error.message || 'Network error. Please try again.' };
    }
  }

  async updateProfile(updates: Partial<User>): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`/api/users/${this.currentUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Update failed');
      }

      const updatedUser = await response.json();
      this.currentUser = updatedUser;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      }

      this.emit('profileUpdated', this.currentUser);
      
      return { success: true };
    } catch (error: any) {
      logger.error('Profile update error:', error);
      return { success: false, error: error.message || 'Network error. Please try again.' };
    }
  }

  async refreshToken(): Promise<boolean> {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.authToken = data.accessToken;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('authToken', this.authToken);
      }

      return true;
    } catch (error) {
      logger.error('Token refresh error:', error);
      this.clearSession();
      this.emit('sessionExpired');
      return false;
    }
  }

  private startTokenRefresh(): void {
    // Refresh token every 15 minutes
    this.refreshTimer = setInterval(() => {
      this.refreshToken();
    }, 15 * 60 * 1000);
  }

  private clearSession(): void {
    this.currentUser = null;
    this.authToken = null;

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('refreshToken');
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  isAuthenticated(): boolean {
    return !!this.authToken && !!this.currentUser;
  }

  hasRole(role: string): boolean {
    return this.currentUser?.role === role;
  }

  hasPlan(plan: string): boolean {
    if (!this.currentUser) return false;

    const planLevels: Record<string, number> = { free: 1, pro: 2, enterprise: 3 };
    const userPlanLevel = planLevels[this.currentUser.plan] || 0;
    const requiredPlanLevel = planLevels[plan] || 0;

    return userPlanLevel >= requiredPlanLevel;
  }

  // Get user initials for avatar
  getInitials(): string {
    if (!this.currentUser?.name) return '?';
    return this.currentUser.name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // Get a default user for development/demo purposes
  getDefaultUser(): User {
    return {
      id: 'user_default',
      name: 'Guest User',
      email: 'guest@workflow-editor.com',
      color: '#3b82f6',
      plan: 'free',
      role: 'user',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      preferences: {
        theme: 'system',
        language: 'en',
        timezone: 'UTC',
        notifications: {
          email: true,
          push: true,
          workflow: true
        }
      }
    };
  }

  // Initialize with demo user if no real user is logged in
  async initializeDemoUser(): Promise<void> {
    if (!this.currentUser) {
      this.currentUser = this.getDefaultUser();
      this.emit('userLoaded', this.currentUser);
    }
  }
}

export const userService = new UserService();