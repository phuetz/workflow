/**
 * Multi-Factor Authentication Service
 * TOTP-based MFA implementation with backup codes
 */

import crypto from 'crypto';
import { logger } from '../../services/SimpleLogger';

interface MFAConfig {
  issuer: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: 6 | 8;
  window: number; // Time window in periods (30s each)
  backupCodesCount: number;
}

interface MFASecret {
  userId: string;
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  enabled: boolean;
  createdAt: Date;
  verifiedAt?: Date;
}

interface TOTPToken {
  code: string;
  timestamp: number;
  valid: boolean;
}

export class MFAService {
  private config: MFAConfig;
  private secrets: Map<string, MFASecret> = new Map(); // userId -> MFASecret
  private usedBackupCodes: Map<string, Set<string>> = new Map(); // userId -> used codes
  private readonly TIME_STEP = 30; // 30 seconds

  constructor(config: Partial<MFAConfig> = {}) {
    this.config = {
      issuer: config.issuer || 'Workflow Pro',
      algorithm: config.algorithm || 'SHA1',
      digits: config.digits || 6,
      window: config.window || 1, // Allow 1 period before/after
      backupCodesCount: config.backupCodesCount || 10
    };

    logger.info('MFAService initialized', {
      issuer: this.config.issuer,
      algorithm: this.config.algorithm,
      digits: this.config.digits
    });
  }

  /**
   * Generate MFA secret for user
   */
  async generateSecret(userId: string, userEmail: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    // Generate random secret (Base32 encoded)
    const secret = this.generateBase32Secret();

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Create QR code URL for authenticator apps
    const qrCodeUrl = this.generateQRCodeUrl(userEmail, secret);

    // Store secret (not enabled until verified)
    const mfaSecret: MFASecret = {
      userId,
      secret,
      qrCodeUrl,
      backupCodes,
      enabled: false,
      createdAt: new Date()
    };

    this.secrets.set(userId, mfaSecret);
    this.usedBackupCodes.set(userId, new Set());

    logger.info('MFA secret generated', { userId, email: userEmail });

    return {
      secret,
      qrCodeUrl,
      backupCodes
    };
  }

  /**
   * Verify TOTP code and enable MFA
   */
  async verifyAndEnable(userId: string, code: string): Promise<boolean> {
    const mfaSecret = this.secrets.get(userId);
    if (!mfaSecret) {
      throw new Error('MFA not configured for user');
    }

    const isValid = await this.verifyTOTP(userId, code);
    if (!isValid) {
      logger.warn('MFA verification failed', { userId });
      return false;
    }

    // Enable MFA
    mfaSecret.enabled = true;
    mfaSecret.verifiedAt = new Date();
    this.secrets.set(userId, mfaSecret);

    logger.info('MFA enabled for user', { userId });
    return true;
  }

  /**
   * Verify TOTP code
   */
  async verifyTOTP(userId: string, code: string): Promise<boolean> {
    const mfaSecret = this.secrets.get(userId);
    if (!mfaSecret) {
      logger.warn('MFA verification attempted for user without MFA', { userId });
      return false;
    }

    // Get current timestamp
    const currentTimestamp = Math.floor(Date.now() / 1000);

    // Check code within time window
    for (let i = -this.config.window; i <= this.config.window; i++) {
      const timestamp = currentTimestamp + (i * this.TIME_STEP);
      const expectedCode = this.generateTOTP(mfaSecret.secret, timestamp);

      if (this.constantTimeCompare(code, expectedCode)) {
        logger.info('TOTP verification successful', { userId });
        return true;
      }
    }

    logger.warn('TOTP verification failed', { userId, providedCode: code.substring(0, 2) + '****' });
    return false;
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const mfaSecret = this.secrets.get(userId);
    if (!mfaSecret || !mfaSecret.enabled) {
      return false;
    }

    const usedCodes = this.usedBackupCodes.get(userId) || new Set();

    // Check if code was already used
    if (usedCodes.has(code)) {
      logger.warn('Backup code already used', { userId });
      return false;
    }

    // Check if code is valid
    if (!mfaSecret.backupCodes.includes(code)) {
      logger.warn('Invalid backup code', { userId });
      return false;
    }

    // Mark code as used
    usedCodes.add(code);
    this.usedBackupCodes.set(userId, usedCodes);

    logger.info('Backup code verified', {
      userId,
      remainingCodes: mfaSecret.backupCodes.length - usedCodes.size
    });

    return true;
  }

  /**
   * Disable MFA for user
   */
  async disableMFA(userId: string): Promise<boolean> {
    if (!this.secrets.has(userId)) {
      return false;
    }

    this.secrets.delete(userId);
    this.usedBackupCodes.delete(userId);

    logger.info('MFA disabled for user', { userId });
    return true;
  }

  /**
   * Check if MFA is enabled for user
   */
  isMFAEnabled(userId: string): boolean {
    const mfaSecret = this.secrets.get(userId);
    return mfaSecret?.enabled || false;
  }

  /**
   * Get remaining backup codes
   */
  getRemainingBackupCodes(userId: string): number {
    const mfaSecret = this.secrets.get(userId);
    if (!mfaSecret) return 0;

    const usedCodes = this.usedBackupCodes.get(userId) || new Set();
    return mfaSecret.backupCodes.length - usedCodes.size;
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const mfaSecret = this.secrets.get(userId);
    if (!mfaSecret || !mfaSecret.enabled) {
      throw new Error('MFA not enabled for user');
    }

    const newBackupCodes = this.generateBackupCodes();
    mfaSecret.backupCodes = newBackupCodes;
    this.secrets.set(userId, mfaSecret);
    this.usedBackupCodes.set(userId, new Set());

    logger.info('Backup codes regenerated', { userId });
    return newBackupCodes;
  }

  /**
   * Get MFA status for user
   */
  getMFAStatus(userId: string): {
    enabled: boolean;
    verifiedAt?: Date;
    remainingBackupCodes: number;
  } {
    const mfaSecret = this.secrets.get(userId);
    if (!mfaSecret) {
      return { enabled: false, remainingBackupCodes: 0 };
    }

    return {
      enabled: mfaSecret.enabled,
      verifiedAt: mfaSecret.verifiedAt,
      remainingBackupCodes: this.getRemainingBackupCodes(userId)
    };
  }

  // Private helper methods

  /**
   * Generate Base32 encoded secret
   */
  private generateBase32Secret(length: number = 32): string {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bytes = crypto.randomBytes(length);
    let secret = '';

    for (let i = 0; i < length; i++) {
      secret += base32Chars[bytes[i] % 32];
    }

    return secret;
  }

  /**
   * Generate TOTP code
   */
  private generateTOTP(secret: string, timestamp: number): string {
    const counter = Math.floor(timestamp / this.TIME_STEP);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));

    // Decode Base32 secret
    const secretBuffer = this.base32Decode(secret);

    // Generate HMAC
    const hmac = crypto.createHmac(this.config.algorithm.toLowerCase(), secretBuffer);
    hmac.update(counterBuffer);
    const hash = hmac.digest();

    // Dynamic truncation
    const offset = hash[hash.length - 1] & 0x0f;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, this.config.digits);
    return otp.toString().padStart(this.config.digits, '0');
  }

  /**
   * Decode Base32 string
   */
  private base32Decode(encoded: string): Buffer {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    encoded = encoded.toUpperCase().replace(/=+$/, '');

    const bits: number[] = [];
    for (const char of encoded) {
      const index = base32Chars.indexOf(char);
      if (index === -1) {
        throw new Error('Invalid Base32 character');
      }

      const binary = index.toString(2).padStart(5, '0');
      bits.push(...binary.split('').map(Number));
    }

    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      const byte = bits.slice(i, i + 8);
      bytes.push(parseInt(byte.join(''), 2));
    }

    return Buffer.from(bytes);
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.config.backupCodesCount; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Generate QR code URL for authenticator apps
   */
  private generateQRCodeUrl(email: string, secret: string): string {
    const issuer = encodeURIComponent(this.config.issuer);
    const label = encodeURIComponent(`${this.config.issuer}:${email}`);
    const params = new URLSearchParams({
      secret,
      issuer: this.config.issuer,
      algorithm: this.config.algorithm,
      digits: this.config.digits.toString(),
      period: this.TIME_STEP.toString()
    });

    return `otpauth://totp/${label}?${params.toString()}`;
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Export MFA data for backup
   */
  async exportMFAData(userId: string): Promise<string | null> {
    const mfaSecret = this.secrets.get(userId);
    if (!mfaSecret) {
      return null;
    }

    const data = {
      userId: mfaSecret.userId,
      enabled: mfaSecret.enabled,
      createdAt: mfaSecret.createdAt,
      verifiedAt: mfaSecret.verifiedAt,
      remainingBackupCodes: this.getRemainingBackupCodes(userId)
    };

    return JSON.stringify(data, null, 2);
  }
}

// Singleton instance
export const mfaService = new MFAService();
