/**
 * Metric Registry
 * Registry for managing evaluation metrics
 */

import type {
  MetricType,
  MetricConfig,
  RegisteredMetric,
  EvaluationInput,
  MetricResult,
  EvaluationContext,
} from '../types/evaluation';

/**
 * MetricRegistry - Register and manage evaluation metrics
 */
export class MetricRegistry {
  private metrics: Map<MetricType, RegisteredMetric>;

  constructor() {
    this.metrics = new Map();
  }

  /**
   * Register a new metric
   */
  register(metric: RegisteredMetric): void {
    if (this.metrics.has(metric.type)) {
      throw new Error(`Metric type ${metric.type} is already registered`);
    }

    // Validate metric structure
    if (!metric.type || !metric.name || !metric.executor) {
      throw new Error('Invalid metric: type, name, and executor are required');
    }

    this.metrics.set(metric.type, metric);
  }

  /**
   * Unregister a metric
   */
  unregister(type: MetricType): boolean {
    return this.metrics.delete(type);
  }

  /**
   * Get a metric by type
   */
  get(type: MetricType): RegisteredMetric | undefined {
    return this.metrics.get(type);
  }

  /**
   * Get all registered metrics
   */
  getAll(): RegisteredMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metric executor
   */
  getExecutor(
    type: MetricType
  ): ((input: EvaluationInput, output: unknown, config: MetricConfig, context?: EvaluationContext) => Promise<MetricResult>) | undefined {
    return this.metrics.get(type)?.executor;
  }

  /**
   * Get metric validator
   */
  getValidator(type: MetricType): ((config: MetricConfig) => boolean) | undefined {
    return this.metrics.get(type)?.validator;
  }

  /**
   * Check if metric type is registered
   */
  has(type: MetricType): boolean {
    return this.metrics.has(type);
  }

  /**
   * Get metric types
   */
  getTypes(): MetricType[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Get default config for a metric type
   */
  getDefaultConfig(type: MetricType): Partial<MetricConfig> | undefined {
    return this.metrics.get(type)?.defaultConfig;
  }

  /**
   * Create a metric config with defaults
   */
  createConfig(type: MetricType, overrides?: Partial<MetricConfig>): MetricConfig | null {
    const metric = this.metrics.get(type);
    if (!metric) return null;

    const id = `metric-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      type,
      name: metric.name,
      description: metric.description,
      enabled: true,
      weight: 1,
      ...metric.defaultConfig,
      ...overrides,
    } as MetricConfig;
  }

  /**
   * Validate a metric config
   */
  validate(config: MetricConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if metric type exists
    const metric = this.metrics.get(config.type);
    if (!metric) {
      errors.push(`Unknown metric type: ${config.type}`);
      return { valid: false, errors };
    }

    // Basic validation
    if (!config.id || config.id.trim() === '') {
      errors.push('Metric ID is required');
    }

    if (!config.name || config.name.trim() === '') {
      errors.push('Metric name is required');
    }

    if (config.weight !== undefined && (config.weight < 0 || config.weight > 1)) {
      errors.push('Metric weight must be between 0 and 1');
    }

    if (config.threshold !== undefined && (config.threshold < 0 || config.threshold > 1)) {
      errors.push('Metric threshold must be between 0 and 1');
    }

    // Use metric-specific validator
    try {
      if (!metric.validator(config)) {
        errors.push(`Metric validation failed for ${config.type}`);
      }
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get metric info
   */
  getInfo(type: MetricType): { name: string; description: string; type: MetricType } | null {
    const metric = this.metrics.get(type);
    if (!metric) return null;

    return {
      type: metric.type,
      name: metric.name,
      description: metric.description,
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Get registry size
   */
  size(): number {
    return this.metrics.size;
  }
}

export default MetricRegistry;
