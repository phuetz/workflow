/**
 * Password Breach Checker - Have I Been Pwned Integration
 *
 * Checks passwords against the Have I Been Pwned database of breached passwords
 * Uses k-anonymity model to protect password privacy:
 * - Only sends first 5 characters of SHA-1 hash
 * - Compares remaining hash suffix locally
 * - Never sends actual password over network
 *
 * API: https://haveibeenpwned.com/API/v3
 */

import axios from 'axios';
import * as crypto from 'crypto';

export interface BreachCheckResult {
  isBreached: boolean;
  breachCount: number;        // Number of times password appeared in breaches
  severity: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

export class PasswordBreachChecker {
  private static instance: PasswordBreachChecker;

  private readonly apiUrl = 'https://api.pwnedpasswords.com/range/';
  private readonly userAgent = 'WorkflowPlatform-PasswordChecker/1.0';

  // Cache for API responses (5 minute TTL)
  private cache: Map<string, { data: string; timestamp: number }> = new Map();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): PasswordBreachChecker {
    if (!PasswordBreachChecker.instance) {
      PasswordBreachChecker.instance = new PasswordBreachChecker();
    }
    return PasswordBreachChecker.instance;
  }

  /**
   * Check if password has been exposed in data breaches
   * Uses k-anonymity to protect privacy
   */
  public async checkPassword(password: string): Promise<BreachCheckResult> {
    if (!password || password.length === 0) {
      throw new Error('Password cannot be empty');
    }

    try {
      // Step 1: Hash the password with SHA-1
      const hash = this.sha1Hash(password).toUpperCase();

      // Step 2: Split hash into prefix (first 5 chars) and suffix (remaining)
      const hashPrefix = hash.substring(0, 5);
      const hashSuffix = hash.substring(5);

      // Step 3: Query API with hash prefix
      const response = await this.queryHIBPAPI(hashPrefix);

      // Step 4: Search for hash suffix in response
      const breachCount = this.findHashInResponse(hashSuffix, response);

      // Step 5: Determine severity
      const severity = this.determineSeverity(breachCount);

      // Step 6: Generate recommendation
      const recommendation = this.getRecommendation(breachCount);

      return {
        isBreached: breachCount > 0,
        breachCount,
        severity,
        recommendation
      };

    } catch (error) {
      // On error, fail open (allow password but log warning)
      console.error('Password breach check failed:', error);

      return {
        isBreached: false,
        breachCount: 0,
        severity: 'safe',
        recommendation: 'Unable to verify password safety. Please choose a strong, unique password.'
      };
    }
  }

  /**
   * Batch check multiple passwords
   */
  public async checkPasswords(passwords: string[]): Promise<Map<string, BreachCheckResult>> {
    const results = new Map<string, BreachCheckResult>();

    // Check passwords concurrently with rate limiting
    const batchSize = 5;
    for (let i = 0; i < passwords.length; i += batchSize) {
      const batch = passwords.slice(i, i + batchSize);
      const promises = batch.map(async (password) => {
        const result = await this.checkPassword(password);
        results.set(password, result);
      });

      await Promise.all(promises);

      // Rate limit: wait 100ms between batches
      if (i + batchSize < passwords.length) {
        await this.sleep(100);
      }
    }

    return results;
  }

  /**
   * Generate SHA-1 hash of password
   */
  private sha1Hash(password: string): string {
    return crypto.createHash('sha1').update(password).digest('hex');
  }

  /**
   * Query Have I Been Pwned API
   */
  private async queryHIBPAPI(hashPrefix: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(hashPrefix);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const response = await axios.get(`${this.apiUrl}${hashPrefix}`, {
        headers: {
          'User-Agent': this.userAgent,
          'Add-Padding': 'true' // Request padded response for additional privacy
        },
        timeout: 5000 // 5 second timeout
      });

      const data = response.data;

      // Cache the response
      this.cache.set(hashPrefix, {
        data,
        timestamp: Date.now()
      });

      // Clean up old cache entries
      this.cleanCache();

      return data;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timeout. Please check your internet connection.');
        }
      }
      throw error;
    }
  }

  /**
   * Find hash suffix in API response and return breach count
   */
  private findHashInResponse(hashSuffix: string, response: string): number {
    const lines = response.split('\n');

    for (const line of lines) {
      const [suffix, count] = line.split(':');

      if (suffix.trim() === hashSuffix) {
        return parseInt(count.trim(), 10);
      }
    }

    return 0; // Not found = not breached
  }

  /**
   * Determine severity based on breach count
   */
  private determineSeverity(breachCount: number): BreachCheckResult['severity'] {
    if (breachCount === 0) return 'safe';
    if (breachCount < 10) return 'low';
    if (breachCount < 100) return 'medium';
    if (breachCount < 1000) return 'high';
    return 'critical';
  }

  /**
   * Get recommendation based on breach count
   */
  private getRecommendation(breachCount: number): string {
    if (breachCount === 0) {
      return 'Password not found in known breaches. However, always use unique passwords.';
    }

    if (breachCount < 10) {
      return `This password has been seen ${breachCount} time(s) in data breaches. Consider using a different password.`;
    }

    if (breachCount < 100) {
      return `⚠️ This password has been seen ${breachCount} times in data breaches. Choose a different password immediately.`;
    }

    if (breachCount < 1000) {
      return `🚨 This password has been seen ${breachCount} times in data breaches. This password is highly compromised. Use a unique password.`;
    }

    return `🔥 This password has been seen ${breachCount.toLocaleString()} times in data breaches! This is an extremely common password. Never use this password.`;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, value] of this.cache) {
      if (now - value.timestamp > this.cacheTTL) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // Could be tracked with counters
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if API is available
   */
  public async healthCheck(): Promise<boolean> {
    try {
      // Use a known hash prefix for testing
      const testPrefix = '00000'; // Hash of "password" starts with this
      await this.queryHIBPAPI(testPrefix);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Singleton export
export function getPasswordBreachChecker(): PasswordBreachChecker {
  return PasswordBreachChecker.getInstance();
}

export default getPasswordBreachChecker;
