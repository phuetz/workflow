/**
 * Password Hashing Service using Argon2id
 *
 * Provides secure password hashing using Argon2id algorithm
 * - Winner of the Password Hashing Competition (2015)
 * - Resistant to GPU and side-channel attacks
 * - OWASP recommended for password storage
 *
 * Configuration follows OWASP recommendations:
 * - Memory: 64 MB (65536 KB)
 * - Iterations: 3
 * - Parallelism: 4
 * - Hash length: 32 bytes
 */

import * as argon2 from 'argon2';

export interface HashOptions {
  memoryCost?: number;      // Memory usage in KB (default: 65536 = 64MB)
  timeCost?: number;         // Number of iterations (default: 3)
  parallelism?: number;      // Degree of parallelism (default: 4)
  hashLength?: number;       // Hash output length (default: 32)
}

export interface PasswordHashResult {
  hash: string;
  algorithm: 'argon2id';
  memoryCost: number;
  timeCost: number;
  parallelism: number;
  hashLength: number;
}

export class PasswordHashingService {
  private static instance: PasswordHashingService;

  // OWASP recommended defaults for Argon2id
  private readonly defaultOptions: Required<HashOptions> = {
    memoryCost: 65536,    // 64 MB
    timeCost: 3,          // 3 iterations
    parallelism: 4,       // 4 threads
    hashLength: 32        // 32 bytes (256 bits)
  };

  private constructor() {}

  public static getInstance(): PasswordHashingService {
    if (!PasswordHashingService.instance) {
      PasswordHashingService.instance = new PasswordHashingService();
    }
    return PasswordHashingService.instance;
  }

  /**
   * Hash a password using Argon2id
   */
  public async hash(password: string, options?: HashOptions): Promise<string> {
    if (!password || password.length === 0) {
      throw new Error('Password cannot be empty');
    }

    // Validate password length (max 128 characters to prevent DoS)
    if (password.length > 128) {
      throw new Error('Password is too long (max 128 characters)');
    }

    const finalOptions = { ...this.defaultOptions, ...options };

    try {
      const hash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: finalOptions.memoryCost,
        timeCost: finalOptions.timeCost,
        parallelism: finalOptions.parallelism,
        hashLength: finalOptions.hashLength
      });

      return hash;
    } catch (error) {
      throw new Error(`Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify a password against a hash
   */
  public async verify(hash: string, password: string): Promise<boolean> {
    if (!hash || !password) {
      return false;
    }

    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      // If verification fails due to invalid hash format, return false
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Check if a hash needs to be rehashed (parameters changed)
   */
  public needsRehash(hash: string, options?: HashOptions): boolean {
    const finalOptions = { ...this.defaultOptions, ...options };

    try {
      return argon2.needsRehash(hash, {
        memoryCost: finalOptions.memoryCost,
        timeCost: finalOptions.timeCost,
        parallelism: finalOptions.parallelism,
        version: 0x13 // Argon2 version 1.3
      });
    } catch (error) {
      // If we can't determine, assume it needs rehash to be safe
      return true;
    }
  }

  /**
   * Get hash information (for debugging/auditing)
   */
  public async getHashInfo(hash: string): Promise<PasswordHashResult | null> {
    try {
      // Argon2 hashes have format: $argon2id$v=19$m=65536,t=3,p=4$...
      const parts = hash.split('$');

      if (parts.length < 4 || !parts[1].startsWith('argon2')) {
        return null;
      }

      const algorithm = parts[1] as 'argon2id';
      const params = parts[3].split(',');

      const memoryCost = parseInt(params[0].split('=')[1]);
      const timeCost = parseInt(params[1].split('=')[1]);
      const parallelism = parseInt(params[2].split('=')[1]);

      return {
        hash,
        algorithm,
        memoryCost,
        timeCost,
        parallelism,
        hashLength: 32 // Standard for Argon2
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Estimate time to hash with given parameters (for tuning)
   */
  public async benchmarkHash(password: string = 'test-password', options?: HashOptions): Promise<number> {
    const startTime = Date.now();
    await this.hash(password, options);
    return Date.now() - startTime;
  }

  /**
   * Get recommended options based on target hash time
   * @param targetMs Target time in milliseconds (default: 500ms)
   */
  public async getRecommendedOptions(targetMs: number = 500): Promise<HashOptions> {
    const testPassword = 'benchmark-test-password-12345';

    // Start with minimal options
    const options: HashOptions = {
      memoryCost: 16384,  // 16 MB
      timeCost: 2,
      parallelism: 2,
      hashLength: 32
    };

    let currentTime = await this.benchmarkHash(testPassword, options);

    // If too fast, increase parameters
    while (currentTime < targetMs && options.timeCost! < 10) {
      if (currentTime < targetMs / 2) {
        options.memoryCost = Math.min(options.memoryCost! * 2, 131072); // Max 128 MB
        options.timeCost!++;
      } else {
        options.timeCost!++;
      }

      currentTime = await this.benchmarkHash(testPassword, options);
    }

    // If too slow, decrease parameters
    while (currentTime > targetMs && options.timeCost! > 2) {
      options.timeCost!--;
      currentTime = await this.benchmarkHash(testPassword, options);
    }

    return options;
  }
}

// Singleton export
export function getPasswordHashingService(): PasswordHashingService {
  return PasswordHashingService.getInstance();
}

// Default export for backwards compatibility
export default getPasswordHashingService;
