/**
 * Password Hashing and Verification Service
 * Secure password handling with bcrypt
 *
 * SECURITY IMPROVEMENTS:
 * - Migrated from crypto.scrypt to bcryptjs for industry-standard security
 * - bcrypt includes automatic salt generation (no need to store separately)
 * - Resistant to GPU attacks and rainbow tables
 * - Automatic cost factor adjustment (12 rounds = ~250ms on modern hardware)
 * - Backward compatibility with legacy scrypt hashes during migration
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { logger } from '../../services/LoggingService';

export class PasswordService {
  // SECURITY: 12 rounds provides strong security (2^12 = 4096 iterations)
  // Each additional round doubles the computation time
  private readonly saltRounds: number = 12;
  private readonly minLength: number = 8;
  private readonly maxLength: number = 128;

  /**
   * Hash a password using bcrypt
   * @param password Plain text password to hash
   * @returns Promise<string> Bcrypt hash with embedded salt
   * @throws Error if password validation fails
   */
  async hashPassword(password: string): Promise<string> {
    this.validatePassword(password);

    try {
      // bcrypt.hash automatically generates a salt and includes it in the hash
      // Format: $2a$12$[22 char salt][31 char hash]
      const hash = await bcrypt.hash(password, this.saltRounds);
      return hash;
    } catch (error) {
      logger.error('Password hashing failed:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify a password against a hash
   * Supports both new bcrypt hashes and legacy scrypt hashes for backward compatibility
   *
   * @param password Plain text password to verify
   * @param hash Stored password hash (bcrypt or legacy scrypt format)
   * @returns Promise<boolean> True if password matches hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      // Detect hash format and use appropriate verification method
      if (this.isBcryptHash(hash)) {
        // New bcrypt hash - use bcrypt.compare
        return await bcrypt.compare(password, hash);
      } else if (this.isScryptHash(hash)) {
        // Legacy scrypt hash (format: "salt:hash") - maintain backward compatibility
        logger.warn('Legacy scrypt hash detected - consider migrating to bcrypt');
        return await this.verifyScryptPassword(password, hash);
      } else {
        // Unknown hash format
        logger.error('Unknown password hash format');
        return false;
      }
    } catch (error) {
      // SECURITY: Don't expose error details to prevent information leakage
      logger.error('Password verification failed:', error);
      return false;
    }
  }

  /**
   * Check if a password hash needs to be rehashed
   * Returns true if:
   * - Hash uses old algorithm (scrypt)
   * - Hash uses fewer rounds than current setting
   *
   * @param hash Stored password hash
   * @returns boolean True if hash should be regenerated
   */
  needsRehash(hash: string): boolean {
    try {
      // Legacy scrypt hashes always need rehashing
      if (this.isScryptHash(hash)) {
        return true;
      }

      // Check if it's a bcrypt hash
      if (!this.isBcryptHash(hash)) {
        // Unknown format, needs rehashing
        return true;
      }

      // Extract cost factor from bcrypt hash
      // Format: $2a$12$... where 12 is the cost factor
      const rounds = parseInt(hash.split('$')[2]);

      // Rehash if using fewer rounds than current setting
      return rounds < this.saltRounds;
    } catch (error) {
      logger.error('Error checking if hash needs rehash:', error);
      // On error, assume it needs rehashing for safety
      return true;
    }
  }

  /**
   * Detect if hash is in bcrypt format
   * @param hash Hash string to check
   * @returns boolean True if hash is bcrypt format
   */
  private isBcryptHash(hash: string): boolean {
    // Bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost factor
    return /^\$2[aby]\$\d{2}\$/.test(hash);
  }

  /**
   * Detect if hash is in legacy scrypt format
   * @param hash Hash string to check
   * @returns boolean True if hash is scrypt format
   */
  private isScryptHash(hash: string): boolean {
    // Legacy scrypt format: "salt:hash" (both hex strings)
    return hash.includes(':') && hash.split(':').length === 2;
  }

  /**
   * Verify password against legacy scrypt hash
   * DEPRECATED: Only for backward compatibility during migration
   *
   * @param password Plain text password
   * @param hash Legacy scrypt hash in "salt:hash" format
   * @returns Promise<boolean> True if password matches
   */
  private async verifyScryptPassword(password: string, hash: string): Promise<boolean> {
    try {
      const [salt, key] = hash.split(':');

      return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(key === derivedKey.toString('hex'));
        });
      });
    } catch (error) {
      logger.error('Legacy scrypt verification error:', error);
      return false;
    }
  }

  /**
   * Generate a secure random password
   * @param length Desired password length (default: 16)
   * @returns string Cryptographically secure random password
   */
  generateSecurePassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const randomBytes = crypto.randomBytes(length);
    let password = '';

    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length];
    }

    return password;
  }

  /**
   * Validate password strength
   * Enforces minimum security requirements
   * @param password Password to validate
   * @throws Error if password doesn't meet requirements
   */
  validatePassword(password: string): void {
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a string');
    }

    if (password.length < this.minLength) {
      throw new Error(`Password must be at least ${this.minLength} characters long`);
    }

    if (password.length > this.maxLength) {
      throw new Error(`Password must be no more than ${this.maxLength} characters long`);
    }

    // Check complexity - require at least 3 of 4 character types
    let complexity = 0;
    if (/[a-z]/.test(password)) complexity++; // lowercase
    if (/[A-Z]/.test(password)) complexity++; // uppercase
    if (/[0-9]/.test(password)) complexity++; // numbers
    if (/[^a-zA-Z0-9]/.test(password)) complexity++; // special characters

    if (complexity < 3) {
      throw new Error('Password must contain at least 3 of: lowercase, uppercase, numbers, special characters');
    }
  }

  /**
   * Check if password has been pwned using Have I Been Pwned API
   * Uses k-anonymity model - only sends first 5 chars of SHA-1 hash
   * @param password Password to check
   * @returns Promise<boolean> True if password found in breach database
   */
  async checkPasswordPwned(password: string): Promise<boolean> {
    try {
      // Hash the password with SHA-1
      const hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
      const prefix = hash.substring(0, 5);
      const suffix = hash.substring(5);

      // Call Have I Been Pwned API (k-anonymity model)
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      const data = await response.text();

      // Check if hash suffix appears in response
      return data.includes(suffix);
    } catch (error) {
      logger.error('Error checking pwned password:', error);
      // Fail open - don't block on API failure
      return false;
    }
  }

  /**
   * Generate password reset token
   */
  generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash reset token for storage
   */
  hashResetToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

// Singleton instance
export const passwordService = new PasswordService();