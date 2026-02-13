/**
 * Access Control
 * Handles permission checks for vault operations
 */

import { Secret, SecretPermissions } from './types';

export type PermissionAction = 'read' | 'write' | 'delete';

export class AccessControl {
  private adminIdentifiers: string[];

  constructor(adminIdentifiers: string[] = ['admin']) {
    this.adminIdentifiers = adminIdentifiers;
  }

  /**
   * Check if a user has a specific permission on a secret
   */
  public hasPermission(
    secret: Secret,
    userId: string,
    action: PermissionAction
  ): boolean {
    // Admin bypass
    if (this.isAdmin(userId)) {
      return true;
    }

    const permissions = secret.permissions[action];
    return permissions.includes(userId) || permissions.includes('*');
  }

  /**
   * Check if a user is an admin
   */
  public isAdmin(userId: string): boolean {
    // Check if userId contains any admin identifier
    return this.adminIdentifiers.some(identifier =>
      userId.includes(identifier)
    );
  }

  /**
   * Add admin identifier
   */
  public addAdminIdentifier(identifier: string): void {
    if (!this.adminIdentifiers.includes(identifier)) {
      this.adminIdentifiers.push(identifier);
    }
  }

  /**
   * Remove admin identifier
   */
  public removeAdminIdentifier(identifier: string): void {
    const index = this.adminIdentifiers.indexOf(identifier);
    if (index !== -1) {
      this.adminIdentifiers.splice(index, 1);
    }
  }

  /**
   * Get default permissions for a user
   */
  public static getDefaultPermissions(userId: string): SecretPermissions {
    return {
      read: [userId],
      write: [userId],
      delete: [userId]
    };
  }

  /**
   * Merge permissions
   */
  public static mergePermissions(
    base: SecretPermissions,
    override: Partial<SecretPermissions>
  ): SecretPermissions {
    return {
      read: override.read || base.read,
      write: override.write || base.write,
      delete: override.delete || base.delete
    };
  }

  /**
   * Check if user can access secret (read permission + not expired)
   */
  public canAccess(secret: Secret, userId: string): boolean {
    // Check read permission
    if (!this.hasPermission(secret, userId, 'read')) {
      return false;
    }

    // Check expiration
    if (secret.metadata.expiresAt && new Date() > secret.metadata.expiresAt) {
      return false;
    }

    return true;
  }

  /**
   * Validate permission action
   */
  public validateAction(action: string): action is PermissionAction {
    return ['read', 'write', 'delete'].includes(action);
  }
}
