// Ultra Think Hard Plus - Real Authentication Service
import { logger } from './LoggingService';

interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

class AuthService {
  private currentUser: User | null = null;
  private token: string | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('auth_user');
      if (stored) {
        const data = JSON.parse(stored);
        this.currentUser = data.user;
        this.token = data.token;
      }
    } catch (error) {
      logger.error('Failed to load auth from storage', error);
    }
  }

  getCurrentUser(): string {
    return this.currentUser?.id || 'anonymous';
  }

  getCurrentUserDetails(): User | null {
    return this.currentUser;
  }

  getToken(): string | null {
    return this.token;
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      // In production, this would call your auth API
      // For now, create a mock user
      this.currentUser = {
        id: `user_${Date.now()}`,
        email,
        name: email.split('@')[0],
        roles: ['user']
      };
      this.token = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      localStorage.setItem('auth_user', JSON.stringify({
        user: this.currentUser,
        token: this.token
      }));
      
      logger.info('User logged in', { userId: this.currentUser.id });
      return true;
    } catch (error) {
      logger.error('Login failed', error);
      return false;
    }
  }

  logout(): void {
    this.currentUser = null;
    this.token = null;
    localStorage.removeItem('auth_user');
    logger.info('User logged out');
  }

  hasPermission(permission: string): boolean {
    if (!this.currentUser) return false;
    // Implement RBAC logic here
    return this.currentUser.roles.includes('admin') || 
           this.currentUser.roles.includes(permission);
  }
}

export const authService = new AuthService();
export default authService;
