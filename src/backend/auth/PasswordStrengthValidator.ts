/**
 * Password Strength Validator
 *
 * Comprehensive password strength validation following OWASP guidelines:
 * - Minimum length enforcement
 * - Complexity requirements
 * - Common password detection
 * - Sequential/repeated character detection
 * - Dictionary word detection
 * - Personal information detection
 */

export interface PasswordStrengthResult {
  isValid: boolean;
  score: number;              // 0-100
  strength: 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';
  feedback: string[];
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    noCommonPassword: boolean;
    noSequential: boolean;
    noRepeated: boolean;
  };
  estimatedCrackTime: string;
}

export interface ValidationOptions {
  minLength?: number;
  maxLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  checkCommonPasswords?: boolean;
  checkSequential?: boolean;
  checkRepeated?: boolean;
  personalInfo?: string[];    // User email, name, etc. to block
}

export class PasswordStrengthValidator {
  private static instance: PasswordStrengthValidator;

  // Default validation options (OWASP recommended)
  private readonly defaultOptions: Required<Omit<ValidationOptions, 'personalInfo'>> = {
    minLength: 12,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    checkCommonPasswords: true,
    checkSequential: true,
    checkRepeated: true
  };

  // Top 1000 most common passwords (subset shown)
  private readonly commonPasswords: Set<string> = new Set([
    'password', '123456', '123456789', '12345678', '12345', '1234567',
    'password123', 'qwerty', 'abc123', '111111', '123123', 'admin',
    'letmein', 'welcome', 'monkey', '1234567890', 'password1', 'qwerty123',
    'dragon', 'master', 'login', 'princess', 'starwars', 'solo', 'sunshine',
    'iloveyou', 'trustno1', 'bailey', 'passw0rd', 'shadow', 'superman',
    'michael', 'football', 'baseball', 'jennifer', 'jordan', 'batman',
    'thomas', 'nicole', 'daniel', 'tigger', 'hannah', 'samsung', 'secret',
    'andrea', 'corvette', 'freedom', 'mustang', 'robert', 'shannon',
    'matthew', 'liverpool', 'cheese', 'computer', 'maverick', 'pokemon',
    'qwertyuiop', '1q2w3e4r', 'abc123456', 'killer', 'changeme', 'access',
    'whatever', 'family', 'dallas', 'charlie', 'jessica', 'pepper',
    // Add more as needed
  ]);

  // Common dictionary words to avoid
  private readonly dictionaryWords: Set<string> = new Set([
    'january', 'february', 'march', 'april', 'may', 'june', 'july',
    'august', 'september', 'october', 'november', 'december',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'spring', 'summer', 'autumn', 'winter', 'fall'
  ]);

  private constructor() {}

  public static getInstance(): PasswordStrengthValidator {
    if (!PasswordStrengthValidator.instance) {
      PasswordStrengthValidator.instance = new PasswordStrengthValidator();
    }
    return PasswordStrengthValidator.instance;
  }

  /**
   * Validate password strength
   */
  public validate(password: string, options?: ValidationOptions): PasswordStrengthResult {
    const opts = { ...this.defaultOptions, ...options };
    const feedback: string[] = [];
    let score = 0;

    // Check requirements
    const requirements = {
      minLength: password.length >= opts.minLength,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      noCommonPassword: !this.isCommonPassword(password.toLowerCase()),
      noSequential: !this.hasSequentialCharacters(password),
      noRepeated: !this.hasRepeatedCharacters(password)
    };

    // Length scoring (0-25 points)
    if (password.length < opts.minLength) {
      feedback.push(`Password must be at least ${opts.minLength} characters long`);
    } else if (password.length >= 16) {
      score += 25;
    } else if (password.length >= 12) {
      score += 20;
    } else {
      score += 15;
    }

    // Complexity scoring (0-40 points)
    let complexityCount = 0;
    if (requirements.hasUppercase) complexityCount++;
    if (requirements.hasLowercase) complexityCount++;
    if (requirements.hasNumber) complexityCount++;
    if (requirements.hasSpecialChar) complexityCount++;

    score += complexityCount * 10;

    // Character set diversity (0-15 points)
    const uniqueChars = new Set(password).size;
    score += Math.min(uniqueChars, 15);

    // Entropy bonus (0-20 points)
    const entropy = this.calculateEntropy(password);
    score += Math.min(Math.floor(entropy / 5), 20);

    // Deduct points for weaknesses
    if (this.isCommonPassword(password.toLowerCase())) {
      score -= 30;
      feedback.push('This is a commonly used password');
    }

    if (this.containsDictionaryWord(password.toLowerCase())) {
      score -= 10;
      feedback.push('Password contains common dictionary words');
    }

    if (this.hasSequentialCharacters(password)) {
      score -= 15;
      feedback.push('Avoid sequential characters (e.g., abc, 123)');
    }

    if (this.hasRepeatedCharacters(password)) {
      score -= 10;
      feedback.push('Avoid repeated characters (e.g., aaa, 111)');
    }

    if (this.hasKeyboardPattern(password)) {
      score -= 10;
      feedback.push('Avoid keyboard patterns (e.g., qwerty, asdf)');
    }

    // Check personal information
    if (options?.personalInfo) {
      if (this.containsPersonalInfo(password, options.personalInfo)) {
        score -= 20;
        feedback.push('Password should not contain personal information');
      }
    }

    // Ensure score is 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine strength
    let strength: PasswordStrengthResult['strength'];
    if (score >= 80) strength = 'very-strong';
    else if (score >= 60) strength = 'strong';
    else if (score >= 40) strength = 'fair';
    else if (score >= 20) strength = 'weak';
    else strength = 'very-weak';

    // Add requirement feedback
    if (opts.requireUppercase && !requirements.hasUppercase) {
      feedback.push('Include at least one uppercase letter');
    }
    if (opts.requireLowercase && !requirements.hasLowercase) {
      feedback.push('Include at least one lowercase letter');
    }
    if (opts.requireNumbers && !requirements.hasNumber) {
      feedback.push('Include at least one number');
    }
    if (opts.requireSpecialChars && !requirements.hasSpecialChar) {
      feedback.push('Include at least one special character (!@#$%^&*...)');
    }

    // Positive feedback
    if (feedback.length === 0 && score >= 60) {
      feedback.push('Strong password!');
    }

    // Estimate crack time
    const estimatedCrackTime = this.estimateCrackTime(entropy);

    // Determine if valid
    const isValid =
      requirements.minLength &&
      (!opts.requireUppercase || requirements.hasUppercase) &&
      (!opts.requireLowercase || requirements.hasLowercase) &&
      (!opts.requireNumbers || requirements.hasNumber) &&
      (!opts.requireSpecialChars || requirements.hasSpecialChar) &&
      (!opts.checkCommonPasswords || requirements.noCommonPassword) &&
      score >= 40; // Minimum score of 40 required

    return {
      isValid,
      score,
      strength,
      feedback,
      requirements,
      estimatedCrackTime
    };
  }

  /**
   * Check if password is in common password list
   */
  private isCommonPassword(password: string): boolean {
    return this.commonPasswords.has(password);
  }

  /**
   * Check if password contains dictionary words
   */
  private containsDictionaryWord(password: string): boolean {
    for (const word of this.dictionaryWords) {
      if (password.includes(word)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check for sequential characters (abc, 123, etc.)
   */
  private hasSequentialCharacters(password: string): boolean {
    for (let i = 0; i < password.length - 2; i++) {
      const char1 = password.charCodeAt(i);
      const char2 = password.charCodeAt(i + 1);
      const char3 = password.charCodeAt(i + 2);

      // Check for ascending sequence
      if (char2 === char1 + 1 && char3 === char2 + 1) {
        return true;
      }

      // Check for descending sequence
      if (char2 === char1 - 1 && char3 === char2 - 1) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check for repeated characters (aaa, 111, etc.)
   */
  private hasRepeatedCharacters(password: string): boolean {
    for (let i = 0; i < password.length - 2; i++) {
      if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check for keyboard patterns
   */
  private hasKeyboardPattern(password: string): boolean {
    const patterns = [
      'qwerty', 'asdfgh', 'zxcvbn',
      'qwertz', 'azerty',
      '1qaz2wsx', 'zaq12wsx'
    ];

    const lower = password.toLowerCase();
    return patterns.some(pattern => lower.includes(pattern));
  }

  /**
   * Check if password contains personal information
   */
  private containsPersonalInfo(password: string, personalInfo: string[]): boolean {
    const lower = password.toLowerCase();
    return personalInfo.some(info => {
      if (info.length < 3) return false; // Skip very short strings
      return lower.includes(info.toLowerCase());
    });
  }

  /**
   * Calculate password entropy (bits)
   */
  private calculateEntropy(password: string): number {
    let charsetSize = 0;

    if (/[a-z]/.test(password)) charsetSize += 26;
    if (/[A-Z]/.test(password)) charsetSize += 26;
    if (/[0-9]/.test(password)) charsetSize += 10;
    if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32; // Special chars

    return password.length * Math.log2(charsetSize);
  }

  /**
   * Estimate time to crack password
   */
  private estimateCrackTime(entropy: number): string {
    // Assume 1 billion guesses per second (modern GPU)
    const guessesPerSecond = 1_000_000_000;
    const combinations = Math.pow(2, entropy);
    const seconds = combinations / (2 * guessesPerSecond); // Divide by 2 for average

    if (seconds < 1) return 'Instant';
    if (seconds < 60) return `${Math.round(seconds)} seconds`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
    if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
    if (seconds < 31536000 * 100) return `${Math.round(seconds / 31536000)} years`;
    if (seconds < 31536000 * 1000000) return `${Math.round(seconds / (31536000 * 1000))} thousand years`;
    return 'Millions of years';
  }

  /**
   * Generate strong password suggestion
   */
  public generateStrongPassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const allChars = uppercase + lowercase + numbers + special;
    let password = '';

    // Ensure at least one of each required type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

// Singleton export
export function getPasswordStrengthValidator(): PasswordStrengthValidator {
  return PasswordStrengthValidator.getInstance();
}

export default getPasswordStrengthValidator;
