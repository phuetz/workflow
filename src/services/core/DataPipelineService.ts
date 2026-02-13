/**
 * PLAN C PHASE 3 - Service Monolithique 3: Pipeline de Données
 * Unifie transformation, validation, sanitisation et traitement des données
 * REFACTORED: Utilise SharedPatterns pour éliminer les duplications
 */

import { logger } from '../SimpleLogger';
import cacheService from '../CacheService';
import { eventNotificationService } from '../EventNotificationService';
import * as zod from 'zod';
import { SecureExpressionEngineV2 } from '../../expressions/SecureExpressionEngineV2';

// Lazy-loaded DOMPurify using ES module dynamic import
let _domPurify: { sanitize: (str: string) => string } | null = null;
const getDOMPurify = async (): Promise<{ sanitize: (str: string) => string }> => {
  if (_domPurify) return _domPurify;
  try {
    const module = await import('isomorphic-dompurify');
    _domPurify = module.default || module;
    return _domPurify;
  } catch {
    _domPurify = { sanitize: (str: string) => str };
    return _domPurify;
  }
};
import {
  withErrorHandling,
  withRetry,
  withCache,
  processBatch,
  createValidator,
  validators,
  generateId
} from '../../utils/SharedPatterns';

// Types
export interface DataSchema {
  id: string;
  name: string;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'mixed';
  schema: zod.ZodSchema | Record<string, any>;
  validation: ValidationRule[];
  transformations?: TransformationRule[];
  metadata?: Record<string, any>;
}

export interface ValidationRule {
  field?: string;
  type: 'required' | 'type' | 'format' | 'range' | 'pattern' | 'custom';
  config: any;
  message?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface TransformationRule {
  type: 'map' | 'filter' | 'reduce' | 'sort' | 'group' | 'join' | 'pivot' | 'custom';
  config: any;
  order: number;
}

export interface PipelineDefinition {
  id: string;
  name: string;
  stages: PipelineStage[];
  inputSchema?: DataSchema;
  outputSchema?: DataSchema;
  errorHandling: ErrorHandlingStrategy;
  monitoring: boolean;
}

export interface PipelineStage {
  id: string;
  name: string;
  type: 'extract' | 'transform' | 'validate' | 'enrich' | 'load';
  processor: DataProcessor;
  config: Record<string, any>;
  retryPolicy?: RetryPolicy;
  timeout?: number;
}

export interface DataProcessor {
  process: (data: any, context: ProcessingContext) => Promise<any>;
  validate?: (data: any) => ValidationResult;
  transform?: (data: any, rules: TransformationRule[]) => any;
}

export interface ProcessingContext {
  pipelineId: string;
  stageId: string;
  executionId: string;
  variables: Record<string, any>;
  cache: Map<string, any>;
  metrics: ProcessingMetrics;
}

export interface ProcessingMetrics {
  recordsProcessed: number;
  recordsFailed: number;
  startTime: Date;
  endTime?: Date;
  throughput?: number;
  errors: Error[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  sanitizedData?: any;
}

export interface ValidationError {
  field: string;
  value: any;
  rule: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  maxDelay: number;
}

export type ErrorHandlingStrategy = 'fail-fast' | 'continue' | 'dead-letter' | 'retry';

/**
 * Service unifié de pipeline de données
 */
export class DataPipelineService {
  private static instance: DataPipelineService;
  
  // Configuration
  private readonly MAX_BATCH_SIZE = 1000;
  private readonly MAX_PIPELINE_DEPTH = 10;
  private readonly STREAM_BUFFER_SIZE = 100;
  
  // Storage
  private pipelines: Map<string, PipelineDefinition> = new Map();
  private schemas: Map<string, DataSchema> = new Map();
  private activeStreams: Map<string, ReadableStream> = new Map();
  private processingMetrics: Map<string, ProcessingMetrics> = new Map();
  
  // Built-in processors
  private processors: Map<string, DataProcessor> = new Map();
  private transformers: Map<string, Function> = new Map();
  private validators: Map<string, Function> = new Map();
  
  private constructor() {
    this.initialize();
  }
  
  static getInstance(): DataPipelineService {
    if (!DataPipelineService.instance) {
      DataPipelineService.instance = new DataPipelineService();
    }
    return DataPipelineService.instance;
  }
  
  private initialize(): void {
    // Register built-in processors
    this.registerBuiltInProcessors();
    
    // Register built-in transformers
    this.registerBuiltInTransformers();
    
    // Register built-in validators
    this.registerBuiltInValidators();
    
    logger.info('Data Pipeline Service initialized');
  }
  
  /**
   * Process data through a pipeline
   */
  async processPipeline(
    pipelineId: string,
    data: any,
    options?: {
      streaming?: boolean;
      batchSize?: number;
      parallel?: boolean;
      context?: Partial<ProcessingContext>;
    }
  ): Promise<any> {
    try {
      const pipeline = this.pipelines.get(pipelineId);
      
      if (!pipeline) {
        throw new Error(`Pipeline ${pipelineId} not found`);
      }
      
      // Create processing context
      const context = this.createProcessingContext(pipelineId, options?.context);
      
      // Validate input if schema defined
      if (pipeline.inputSchema) {
        const validation = await this.validateData(data, pipeline.inputSchema);
        if (!validation.valid) {
          throw new Error(`Input validation failed: ${validation.errors[0].message}`);
        }
        data = validation.sanitizedData || data;
      }
      
      // Process through stages
      let result = data;
      
      for (const stage of pipeline.stages) {
        try {
          context.stageId = stage.id;
          
          if (options?.streaming && Array.isArray(result)) {
            result = await this.processStreamingStage(result, stage, context, options.batchSize);
          } else {
            result = await this.processStage(result, stage, context);
          }
          
          // Update metrics
          this.updateMetrics(context);
          
        } catch (error) {
          result = await this.handleStageError(error, stage, pipeline, result, context);
          
          if (pipeline.errorHandling === 'fail-fast') {
            throw error;
          }
        }
      }
      
      // Validate output if schema defined
      if (pipeline.outputSchema) {
        const validation = await this.validateData(result, pipeline.outputSchema);
        if (!validation.valid) {
          throw new Error(`Output validation failed: ${validation.errors[0].message}`);
        }
        result = validation.sanitizedData || result;
      }
      
      // Finalize metrics
      context.metrics.endTime = new Date();
      context.metrics.throughput = this.calculateThroughput(context.metrics);
      
      logger.info(`Pipeline ${pipelineId} completed successfully`);
      
      return result;
      
    } catch (error) {
      logger.error(`Pipeline ${pipelineId} failed:`, error);
      throw error;
    }
  }
  
  /**
   * Validate data against schema
   */
  async validateData(
    data: any,
    schema: DataSchema | string
  ): Promise<ValidationResult> {
    try {
      const schemaObj = typeof schema === 'string' 
        ? this.schemas.get(schema) 
        : schema;
      
      if (!schemaObj) {
        throw new Error('Schema not found');
      }
      
      const result: ValidationResult = {
        valid: true,
        errors: [],
        warnings: []
      };
      
      // Sanitize data first
      result.sanitizedData = await this.sanitizeData(data, schemaObj);
      
      // Validate with Zod if available
      if (schemaObj.schema instanceof zod.ZodSchema) {
        try {
          schemaObj.schema.parse(result.sanitizedData);
        } catch (error: any) {
          if (error instanceof zod.ZodError) {
            result.valid = false;
            result.errors = error.errors.map(e => ({
              field: e.path.join('.'),
              value: data,
              rule: e.code,
              message: e.message
            }));
          }
        }
      }
      
      // Apply custom validation rules
      for (const rule of schemaObj.validation || []) {
        const validation = await this.applyValidationRule(result.sanitizedData, rule);
        
        if (!validation.valid) {
          if (rule.severity === 'error') {
            result.valid = false;
            result.errors.push(...validation.errors);
          } else if (rule.severity === 'warning') {
            result.warnings.push(...validation.warnings);
          }
        }
      }
      
      return result;
      
    } catch (error) {
      logger.error('Data validation failed:', error);
      return {
        valid: false,
        errors: [{
          field: '',
          value: data,
          rule: 'system',
          message: 'Validation system error'
        }],
        warnings: []
      };
    }
  }
  
  /**
   * Transform data using rules
   */
  async transformData(
    data: any,
    transformations: TransformationRule[] | string
  ): Promise<any> {
    try {
      const rules = typeof transformations === 'string'
        ? this.getTransformationRules(transformations)
        : transformations;
      
      // Sort rules by order
      const sortedRules = [...rules].sort((a, b) => a.order - b.order);
      
      let result = data;
      
      for (const rule of sortedRules) {
        const transformer = this.transformers.get(rule.type);
        
        if (transformer) {
          result = await transformer(result, rule.config);
        } else if (rule.type === 'custom' && rule.config.function) {
          result = await this.executeCustomTransform(result, rule.config.function);
        } else {
          logger.warn(`Unknown transformation type: ${rule.type}`);
        }
      }
      
      return result;
      
    } catch (error) {
      logger.error('Data transformation failed:', error);
      throw error;
    }
  }
  
  /**
   * Create a data pipeline
   */
  async createPipeline(definition: PipelineDefinition): Promise<void> {
    try {
      // Validate pipeline definition
      this.validatePipelineDefinition(definition);
      
      // Store pipeline
      this.pipelines.set(definition.id, definition);

      // Cache for quick access
      await cacheService.set(`pipeline:${definition.id}`, definition, 3600);

      logger.info(`Pipeline ${definition.id} created`);
      
    } catch (error) {
      logger.error('Failed to create pipeline:', error);
      throw error;
    }
  }
  
  /**
   * Stream processing for large datasets
   */
  async processStream(
    streamId: string,
    pipeline: string | PipelineDefinition,
    options?: {
      batchSize?: number;
      parallel?: boolean;
      onProgress?: (progress: number) => void;
    }
  ): Promise<void> {
    try {
      const pipelineObj = typeof pipeline === 'string'
        ? this.pipelines.get(pipeline)
        : pipeline;
      
      if (!pipelineObj) {
        throw new Error('Pipeline not found');
      }
      
      const stream = this.activeStreams.get(streamId);
      
      if (!stream) {
        throw new Error(`Stream ${streamId} not found`);
      }
      
      const reader = stream.getReader();
      const batchSize = options?.batchSize || this.MAX_BATCH_SIZE;
      let batch: any[] = [];
      let totalProcessed = 0;
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          batch.push(value);
          
          if (batch.length >= batchSize) {
            await this.processPipeline(pipelineObj.id, batch, {
              streaming: true,
              parallel: options?.parallel
            });
            
            totalProcessed += batch.length;
            batch = [];
            
            if (options?.onProgress) {
              options.onProgress(totalProcessed);
            }
          }
        }
        
        // Process remaining batch
        if (batch.length > 0) {
          await this.processPipeline(pipelineObj.id, batch, {
            streaming: true,
            parallel: options?.parallel
          });
          totalProcessed += batch.length;
        }
        
        logger.info(`Stream ${streamId} processing completed: ${totalProcessed} records`);
        
      } finally {
        reader.releaseLock();
        this.activeStreams.delete(streamId);
      }
      
    } catch (error) {
      logger.error(`Stream processing failed: ${streamId}`, error);
      throw error;
    }
  }
  
  /**
   * Register custom processor
   */
  registerProcessor(name: string, processor: DataProcessor): void {
    this.processors.set(name, processor);
    logger.info(`Processor ${name} registered`);
  }
  
  /**
   * Register custom transformer
   */
  registerTransformer(name: string, transformer: Function): void {
    this.transformers.set(name, transformer);
    logger.info(`Transformer ${name} registered`);
  }
  
  /**
   * Register custom validator
   */
  registerValidator(name: string, validator: Function): void {
    this.validators.set(name, validator);
    logger.info(`Validator ${name} registered`);
  }
  
  /**
   * Private helper methods
   */
  
  private async processStage(
    data: any,
    stage: PipelineStage,
    context: ProcessingContext
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Apply retry policy if defined
      if (stage.retryPolicy) {
        return await this.executeWithRetry(
          () => stage.processor.process(data, context),
          stage.retryPolicy
        );
      }
      
      // Execute with timeout if defined
      if (stage.timeout) {
        return await this.executeWithTimeout(
          stage.processor.process(data, context),
          stage.timeout
        );
      }
      
      // Normal execution
      return await stage.processor.process(data, context);
      
    } finally {
      const duration = Date.now() - startTime;

      eventNotificationService.emitEvent('pipeline.stage.complete', {
        pipelineId: context.pipelineId,
        stageId: stage.id,
        duration,
        recordsProcessed: context.metrics.recordsProcessed
      }, 'DataPipelineService');
    }
  }
  
  private async processStreamingStage(
    data: any[],
    stage: PipelineStage,
    context: ProcessingContext,
    batchSize?: number
  ): Promise<any[]> {
    const results: any[] = [];
    const batch = batchSize || this.MAX_BATCH_SIZE;
    
    for (let i = 0; i < data.length; i += batch) {
      const chunk = data.slice(i, i + batch);
      const processed = await this.processStage(chunk, stage, context);
      results.push(...(Array.isArray(processed) ? processed : [processed]));
    }
    
    return results;
  }
  
  private async sanitizeData(data: any, schema: DataSchema): Promise<any> {
    if (typeof data === 'string') {
      // Sanitize HTML/SQL injection
      const domPurify = await getDOMPurify();
      return domPurify.sanitize(data);
    }

    if (Array.isArray(data)) {
      return Promise.all(data.map(item => this.sanitizeData(item, schema)));
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};

      for (const [key, value] of Object.entries(data)) {
        // Remove potentially dangerous keys
        if (!key.startsWith('__') && !key.startsWith('$')) {
          sanitized[key] = await this.sanitizeData(value, schema);
        }
      }

      return sanitized;
    }

    return data;
  }
  
  private async applyValidationRule(
    data: any,
    rule: ValidationRule
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };
    
    const validator = this.validators.get(rule.type);
    
    if (validator) {
      const validation = await validator(data, rule.config);
      
      if (!validation.valid) {
        result.valid = false;
        result.errors.push({
          field: rule.field || '',
          value: data,
          rule: rule.type,
          message: rule.message || validation.message
        });
      }
    }
    
    return result;
  }
  
  private registerBuiltInProcessors(): void {
    // Extract processor
    this.processors.set('extract', {
      process: async (data, context) => {
        // Extract logic
        return data;
      }
    });
    
    // Transform processor
    this.processors.set('transform', {
      process: async (data, context) => {
        const rules = context.cache.get('transformationRules') || [];
        return this.transformData(data, rules);
      }
    });
    
    // Validate processor
    this.processors.set('validate', {
      process: async (data, context) => {
        const schema = context.cache.get('validationSchema');
        if (schema) {
          const result = await this.validateData(data, schema);
          if (!result.valid) {
            throw new Error(`Validation failed: ${result.errors[0].message}`);
          }
          return result.sanitizedData || data;
        }
        return data;
      }
    });
  }
  
  private registerBuiltInTransformers(): void {
    // Map transformer
    this.transformers.set('map', async (data: any[], config: any) => {
      if (!Array.isArray(data)) return data;
      return data.map(config.mapper || (x => x));
    });
    
    // Filter transformer
    this.transformers.set('filter', async (data: any[], config: any) => {
      if (!Array.isArray(data)) return data;
      return data.filter(config.predicate || (() => true));
    });
    
    // Sort transformer
    this.transformers.set('sort', async (data: any[], config: any) => {
      if (!Array.isArray(data)) return data;
      return [...data].sort(config.comparator);
    });
    
    // Group transformer
    this.transformers.set('group', async (data: any[], config: any) => {
      if (!Array.isArray(data)) return data;
      
      const grouped: Record<string, any[]> = {};
      
      for (const item of data) {
        const key = config.keySelector(item);
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(item);
      }
      
      return grouped;
    });
  }
  
  private registerBuiltInValidators(): void {
    // Required validator
    this.validators.set('required', async (data: any, config: any) => {
      const valid = data !== null && data !== undefined && data !== '';
      return {
        valid,
        message: valid ? '' : 'Field is required'
      };
    });
    
    // Type validator
    this.validators.set('type', async (data: any, config: any) => {
      const valid = typeof data === config.expectedType;
      return {
        valid,
        message: valid ? '' : `Expected type ${config.expectedType}, got ${typeof data}`
      };
    });
    
    // Pattern validator
    this.validators.set('pattern', async (data: any, config: any) => {
      const regex = new RegExp(config.pattern);
      const valid = regex.test(String(data));
      return {
        valid,
        message: valid ? '' : `Value does not match pattern ${config.pattern}`
      };
    });
  }
  
  private createProcessingContext(
    pipelineId: string,
    partial?: Partial<ProcessingContext>
  ): ProcessingContext {
    return {
      pipelineId,
      stageId: '',
      executionId: `exec_${Date.now()}`,
      variables: {},
      cache: new Map(),
      metrics: {
        recordsProcessed: 0,
        recordsFailed: 0,
        startTime: new Date(),
        errors: []
      },
      ...partial
    };
  }
  
  private updateMetrics(context: ProcessingContext): void {
    const metrics = this.processingMetrics.get(context.pipelineId) || context.metrics;
    
    metrics.recordsProcessed += context.metrics.recordsProcessed;
    metrics.recordsFailed += context.metrics.recordsFailed;
    metrics.errors.push(...context.metrics.errors);
    
    this.processingMetrics.set(context.pipelineId, metrics);
  }
  
  private calculateThroughput(metrics: ProcessingMetrics): number {
    if (!metrics.endTime) return 0;
    
    const duration = metrics.endTime.getTime() - metrics.startTime.getTime();
    if (duration === 0) return 0;
    
    return (metrics.recordsProcessed / duration) * 1000; // Records per second
  }
  
  private async handleStageError(
    error: any,
    stage: PipelineStage,
    pipeline: PipelineDefinition,
    data: any,
    context: ProcessingContext
  ): Promise<any> {
    context.metrics.errors.push(error);
    context.metrics.recordsFailed++;
    
    logger.error(`Stage ${stage.id} failed:`, error);
    
    switch (pipeline.errorHandling) {
      case 'retry':
        if (stage.retryPolicy) {
          return this.executeWithRetry(
            () => stage.processor.process(data, context),
            stage.retryPolicy
          );
        }
        throw error;
      
      case 'dead-letter':
        await this.sendToDeadLetter(data, error, context);
        return null;
      
      case 'continue':
        return data;
      
      default:
        throw error;
    }
  }
  
  private async executeWithRetry(
    fn: () => Promise<any>,
    policy: RetryPolicy
  ): Promise<any> {
    return await withRetry(
      fn,
      {
        maxAttempts: policy.maxAttempts,
        delay: 1000,
        strategy: 'exponential'
      }
    );
  }
  
  private async executeWithTimeout(
    promise: Promise<any>,
    timeout: number
  ): Promise<any> {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), timeout)
      )
    ]);
  }
  
  private async sendToDeadLetter(
    data: any,
    error: Error,
    context: ProcessingContext
  ): Promise<void> {
    await cacheService.set(
      `dead-letter:${context.pipelineId}:${Date.now()}`,
      { data, error: error.message, context },
      86400 // 24 hours in seconds
    );
  }
  
  private validatePipelineDefinition(definition: PipelineDefinition): void {
    if (!definition.id || !definition.name) {
      throw new Error('Pipeline must have id and name');
    }
    
    if (!definition.stages || definition.stages.length === 0) {
      throw new Error('Pipeline must have at least one stage');
    }
    
    if (definition.stages.length > this.MAX_PIPELINE_DEPTH) {
      throw new Error(`Pipeline depth exceeds maximum of ${this.MAX_PIPELINE_DEPTH}`);
    }
  }
  
  private getTransformationRules(id: string): TransformationRule[] {
    // Would fetch from storage
    return [];
  }
  
  private async executeCustomTransform(data: any, fn: string): Promise<any> {
    // SECURITY FIX: Use SecureExpressionEngineV2 instead of new Function()
    try {
      const result = SecureExpressionEngineV2.evaluateExpression(
        fn,
        { data, Math, Array, Object, String, Number, Boolean, JSON },
        { timeout: 5000 }
      );
      if (!result.success) {
        throw new Error(result.error || 'Custom transform evaluation failed');
      }
      return result.value;
    } catch (error) {
      logger.error('Custom transform failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dataPipelineService = DataPipelineService.getInstance();