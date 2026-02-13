/**
 * Log Filter
 * Advanced log filtering and sampling rules
 */

import { EventEmitter } from 'events';
import { StreamedLog } from './LogStreamer';

export interface FilterRule {
  id: string;
  name: string;
  type: 'level' | 'category' | 'field' | 'regex' | 'rate' | 'sample';
  action: 'include' | 'exclude';
  config: FilterConfig;
  enabled: boolean;
  priority?: number;
}

export interface FilterConfig {
  // Level filter
  levels?: string[];
  minLevel?: string;

  // Category filter
  categories?: string[];

  // Field filter
  field?: string;
  operator?: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'matches' | 'exists';
  value?: any;

  // Regex filter
  pattern?: string;
  flags?: string;

  // Rate limiting
  maxPerSecond?: number;
  maxPerMinute?: number;
  maxPerHour?: number;

  // Sampling
  sampleRate?: number; // 0-1, where 1 is 100%
  sampleLevels?: string[];
}

export interface FilterStats {
  totalProcessed: number;
  included: number;
  excluded: number;
  sampled: number;
  rateLimited: number;
}

export class LogFilter extends EventEmitter {
  private rules: Map<string, FilterRule> = new Map();
  private stats: Map<string, FilterStats> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private sampleCounters: Map<string, number> = new Map();

  constructor() {
    super();
  }

  /**
   * Add filter rule
   */
  addRule(rule: Omit<FilterRule, 'id'>): FilterRule {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullRule: FilterRule = { ...rule, id };

    this.rules.set(id, fullRule);
    this.stats.set(id, {
      totalProcessed: 0,
      included: 0,
      excluded: 0,
      sampled: 0,
      rateLimited: 0,
    });

    // Initialize rate limiter if needed
    if (rule.type === 'rate') {
      this.rateLimiters.set(id, new RateLimiter(rule.config));
    }

    this.emit('rule:added', fullRule);
    return fullRule;
  }

  /**
   * Remove filter rule
   */
  removeRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    this.rules.delete(ruleId);
    this.stats.delete(ruleId);
    this.rateLimiters.delete(ruleId);
    this.sampleCounters.delete(ruleId);

    this.emit('rule:removed', rule);
  }

  /**
   * Update filter rule
   */
  updateRule(ruleId: string, updates: Partial<FilterRule>): FilterRule {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found`);
    }

    const updated = { ...rule, ...updates, id: ruleId };
    this.rules.set(ruleId, updated);

    this.emit('rule:updated', updated);
    return updated;
  }

  /**
   * Get all rules
   */
  getRules(): FilterRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Apply filters to log
   */
  filter(log: StreamedLog): boolean {
    const applicableRules = this.getApplicableRules();

    for (const rule of applicableRules) {
      const ruleStats = this.stats.get(rule.id)!;
      ruleStats.totalProcessed++;

      const matches = this.matchesRule(log, rule);

      if (rule.action === 'include' && !matches) {
        ruleStats.excluded++;
        this.emit('log:excluded', { log, rule });
        return false;
      }

      if (rule.action === 'exclude' && matches) {
        ruleStats.excluded++;
        this.emit('log:excluded', { log, rule });
        return false;
      }
    }

    // If we get here, log passes all filters
    return true;
  }

  /**
   * Check if log matches rule
   */
  private matchesRule(log: StreamedLog, rule: FilterRule): boolean {
    switch (rule.type) {
      case 'level':
        return this.matchesLevel(log, rule.config);

      case 'category':
        return this.matchesCategory(log, rule.config);

      case 'field':
        return this.matchesField(log, rule.config);

      case 'regex':
        return this.matchesRegex(log, rule.config);

      case 'rate':
        return this.passesRateLimit(rule.id, rule.config);

      case 'sample':
        return this.passesSampling(rule.id, log, rule.config);

      default:
        return true;
    }
  }

  /**
   * Check level filter
   */
  private matchesLevel(log: StreamedLog, config: FilterConfig): boolean {
    if (config.levels) {
      return config.levels.includes(log.level);
    }

    if (config.minLevel) {
      const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
      const logLevel = levels.indexOf(log.level);
      const minLevel = levels.indexOf(config.minLevel);
      return logLevel >= minLevel;
    }

    return true;
  }

  /**
   * Check category filter
   */
  private matchesCategory(log: StreamedLog, config: FilterConfig): boolean {
    if (!config.categories || !log.category) {
      return false;
    }

    return config.categories.includes(log.category);
  }

  /**
   * Check field filter
   */
  private matchesField(log: StreamedLog, config: FilterConfig): boolean {
    if (!config.field) {
      return false;
    }

    const value = this.getNestedValue(log, config.field);

    if (config.operator === 'exists') {
      return value !== undefined && value !== null;
    }

    if (value === undefined || value === null) {
      return false;
    }

    switch (config.operator) {
      case 'eq':
        return value === config.value;
      case 'ne':
        return value !== config.value;
      case 'gt':
        return value > config.value;
      case 'lt':
        return value < config.value;
      case 'gte':
        return value >= config.value;
      case 'lte':
        return value <= config.value;
      case 'contains':
        return String(value).includes(String(config.value));
      case 'matches':
        const regex = new RegExp(config.value);
        return regex.test(String(value));
      default:
        return false;
    }
  }

  /**
   * Check regex filter
   */
  private matchesRegex(log: StreamedLog, config: FilterConfig): boolean {
    if (!config.pattern) {
      return false;
    }

    const regex = new RegExp(config.pattern, config.flags);
    return regex.test(log.message);
  }

  /**
   * Check rate limit
   */
  private passesRateLimit(ruleId: string, config: FilterConfig): boolean {
    const limiter = this.rateLimiters.get(ruleId);
    if (!limiter) {
      return true;
    }

    const allowed = limiter.tryAcquire();
    if (!allowed) {
      const stats = this.stats.get(ruleId)!;
      stats.rateLimited++;
    }

    return allowed;
  }

  /**
   * Check sampling
   */
  private passesSampling(ruleId: string, log: StreamedLog, config: FilterConfig): boolean {
    if (!config.sampleRate) {
      return true;
    }

    // Check if level should be sampled
    if (config.sampleLevels && !config.sampleLevels.includes(log.level)) {
      return true;
    }

    // Apply sampling rate
    const counter = this.sampleCounters.get(ruleId) || 0;
    const shouldSample = counter % Math.ceil(1 / config.sampleRate) === 0;
    this.sampleCounters.set(ruleId, counter + 1);

    if (shouldSample) {
      const stats = this.stats.get(ruleId)!;
      stats.sampled++;
    }

    return shouldSample;
  }

  /**
   * Get applicable rules
   */
  private getApplicableRules(): FilterRule[] {
    return Array.from(this.rules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Get statistics
   */
  getStats(ruleId?: string): FilterStats | Map<string, FilterStats> {
    if (ruleId) {
      const stats = this.stats.get(ruleId);
      if (!stats) {
        throw new Error(`Rule ${ruleId} not found`);
      }
      return { ...stats };
    }

    return new Map(this.stats);
  }

  /**
   * Reset statistics
   */
  resetStats(ruleId?: string): void {
    if (ruleId) {
      const stats = this.stats.get(ruleId);
      if (stats) {
        stats.totalProcessed = 0;
        stats.included = 0;
        stats.excluded = 0;
        stats.sampled = 0;
        stats.rateLimited = 0;
      }
    } else {
      for (const stats of Array.from(this.stats.values())) {
        stats.totalProcessed = 0;
        stats.included = 0;
        stats.excluded = 0;
        stats.sampled = 0;
        stats.rateLimited = 0;
      }
    }

    this.emit('stats:reset', { ruleId });
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Shutdown filter
   */
  shutdown(): void {
    this.rules.clear();
    this.stats.clear();
    this.rateLimiters.clear();
    this.sampleCounters.clear();
    this.removeAllListeners();
  }
}

/**
 * Rate Limiter
 */
class RateLimiter {
  private counters: Map<string, number> = new Map();
  private config: FilterConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: FilterConfig) {
    this.config = config;
    this.startCleanup();
  }

  tryAcquire(): boolean {
    const now = Date.now();

    // Check per-second limit
    if (this.config.maxPerSecond) {
      const key = `s_${Math.floor(now / 1000)}`;
      const count = this.counters.get(key) || 0;
      if (count >= this.config.maxPerSecond) {
        return false;
      }
      this.counters.set(key, count + 1);
    }

    // Check per-minute limit
    if (this.config.maxPerMinute) {
      const key = `m_${Math.floor(now / 60000)}`;
      const count = this.counters.get(key) || 0;
      if (count >= this.config.maxPerMinute) {
        return false;
      }
      this.counters.set(key, count + 1);
    }

    // Check per-hour limit
    if (this.config.maxPerHour) {
      const key = `h_${Math.floor(now / 3600000)}`;
      const count = this.counters.get(key) || 0;
      if (count >= this.config.maxPerHour) {
        return false;
      }
      this.counters.set(key, count + 1);
    }

    return true;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const cutoff = now - 3600000; // Keep last hour

      for (const [key] of Array.from(this.counters.entries())) {
        const timestamp = parseInt(key.split('_')[1]) * 1000;
        if (timestamp < cutoff) {
          this.counters.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }

  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.counters.clear();
  }
}
