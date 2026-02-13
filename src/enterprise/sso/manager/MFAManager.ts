/**
 * MFA Manager
 * Handles Multi-Factor Authentication challenges and verification
 */

import * as crypto from 'crypto';
import {
  MFAMethod,
  MFAChallenge,
  AuthenticationResult,
} from './types';

export class MFAManager {
  private challenges: Map<string, MFAChallenge> = new Map();

  /**
   * Generate a secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create MFA challenge
   */
  public createChallenge(
    userId: string,
    methods: MFAMethod[],
    expirationMs: number = 5 * 60 * 1000
  ): { challengeId: string; challenge: MFAChallenge } {
    const challengeId = this.generateSecureToken();
    const challenge: MFAChallenge = {
      userId,
      methods,
      expiresAt: new Date(Date.now() + expirationMs),
    };

    this.challenges.set(challengeId, challenge);

    return { challengeId, challenge };
  }

  /**
   * Get challenge by ID
   */
  public getChallenge(challengeId: string): MFAChallenge | undefined {
    return this.challenges.get(challengeId);
  }

  /**
   * Validate challenge
   */
  public validateChallenge(challengeId: string): { valid: boolean; error?: string; errorCode?: string } {
    const challenge = this.challenges.get(challengeId);

    if (!challenge) {
      return {
        valid: false,
        error: 'Invalid or expired MFA challenge',
        errorCode: 'INVALID_CHALLENGE',
      };
    }

    if (new Date() > challenge.expiresAt) {
      this.challenges.delete(challengeId);
      return {
        valid: false,
        error: 'MFA challenge expired',
        errorCode: 'CHALLENGE_EXPIRED',
      };
    }

    return { valid: true };
  }

  /**
   * Verify MFA method is allowed for challenge
   */
  public isMethodAllowed(challengeId: string, method: MFAMethod): boolean {
    const challenge = this.challenges.get(challengeId);
    return challenge ? challenge.methods.includes(method) : false;
  }

  /**
   * Verify MFA code
   * In production, this would integrate with a proper MFA service
   */
  public async verifyCode(
    _userId: string,
    _method: MFAMethod,
    code: string
  ): Promise<boolean> {
    // Simplified - in production integrate with MFA service
    // This would verify TOTP, SMS, email, push notifications, etc.
    return code.length === 6 && /^\d+$/.test(code);
  }

  /**
   * Complete MFA challenge
   */
  public async completeChallenge(
    challengeId: string,
    method: MFAMethod,
    code: string
  ): Promise<{ success: boolean; userId?: string; error?: string; errorCode?: string }> {
    // Validate challenge exists and not expired
    const validation = this.validateChallenge(challengeId);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        errorCode: validation.errorCode,
      };
    }

    const challenge = this.challenges.get(challengeId)!;

    // Check method is allowed
    if (!challenge.methods.includes(method)) {
      return {
        success: false,
        error: 'MFA method not allowed',
        errorCode: 'METHOD_NOT_ALLOWED',
      };
    }

    // Verify code
    const isValid = await this.verifyCode(challenge.userId, method, code);

    if (!isValid) {
      return {
        success: false,
        error: 'Invalid MFA code',
        errorCode: 'INVALID_MFA_CODE',
      };
    }

    // Remove challenge after successful verification
    this.challenges.delete(challengeId);

    return {
      success: true,
      userId: challenge.userId,
    };
  }

  /**
   * Delete challenge
   */
  public deleteChallenge(challengeId: string): boolean {
    return this.challenges.delete(challengeId);
  }

  /**
   * Clear expired challenges
   */
  public clearExpired(): number {
    const now = new Date();
    let count = 0;

    for (const [id, challenge] of this.challenges.entries()) {
      if (now > challenge.expiresAt) {
        this.challenges.delete(id);
        count++;
      }
    }

    return count;
  }

  /**
   * Get challenge count
   */
  public get size(): number {
    return this.challenges.size;
  }
}
