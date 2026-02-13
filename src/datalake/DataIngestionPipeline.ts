/**
 * Data Ingestion Pipeline for Workflow Automation Platform
 * Main orchestrator for unified ingestion from multiple streaming sources
 */

import { EventEmitter } from 'events';
import {
  PipelineConfig,
  PipelineMetrics,
  IngestionRecord,
  ProcessedRecord,
  Checkpoint,
  TransformationConfig,
  TransformationHandler,
} from './ingestion/types';
import { SourceConnector } from './ingestion/SourceConnector';
import { DataTransformer } from './ingestion/DataTransformer';
import { SchemaValidator } from './ingestion/SchemaValidator';
import { BatchProcessor } from './ingestion/BatchProcessor';
import { StreamProcessor } from './ingestion/StreamProcessor';
import { ErrorHandler } from './ingestion/ErrorHandler';

// Re-export types for backwards compatibility
export * from './ingestion/types';

export class DataIngestionPipeline extends EventEmitter {
  private static instance: DataIngestionPipeline | null = null;

  // Pipeline storage
  private pipelines: Map<string, PipelineConfig> = new Map();
  private activePipelines: Map<string, boolean> = new Map();
  private pipelineMetrics: Map<string, PipelineMetrics> = new Map();

  // Component modules
  private sourceConnector: SourceConnector;
  private dataTransformer: DataTransformer;
  private schemaValidator: SchemaValidator;
  private batchProcessor: BatchProcessor;
  private streamProcessor: StreamProcessor;
  private errorHandler: ErrorHandler;

  // Metrics collection interval
  private metricsCollectionInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.sourceConnector = new SourceConnector();
    this.dataTransformer = new DataTransformer();
    this.schemaValidator = new SchemaValidator();
    this.batchProcessor = new BatchProcessor();
    this.streamProcessor = new StreamProcessor();
    this.errorHandler = new ErrorHandler();
    this.initialize();
  }

  static getInstance(): DataIngestionPipeline {
    if (!DataIngestionPipeline.instance) {
      DataIngestionPipeline.instance = new DataIngestionPipeline();
    }
    return DataIngestionPipeline.instance;
  }

  static resetInstance(): void {
    if (DataIngestionPipeline.instance) {
      DataIngestionPipeline.instance.shutdown();
      DataIngestionPipeline.instance = null;
    }
  }

  private initialize(): void {
    this.setupEventForwarding();
    this.startMetricsCollection();
    this.emit('initialized', { timestamp: new Date() });
  }

  private setupEventForwarding(): void {
    // Forward events from sub-components
    this.sourceConnector.on('connected', (data) => this.emit('source:connected', data));
    this.sourceConnector.on('disconnected', (data) => this.emit('source:disconnected', data));
    this.sourceConnector.on('error', (data) => this.emit('source:error', data));

    this.streamProcessor.on('window:closed', (data) => this.emit('window:closed', data));
    this.streamProcessor.on('record:processed', (data) => this.emit('record:processed', data));

    this.batchProcessor.on('backpressure:drop', (data) => this.emit('backpressure:drop', data));
    this.batchProcessor.on('backpressure:overflow', (data) => this.emit('backpressure:overflow', data));
    this.batchProcessor.on('backpressure:pause', (data) => this.emit('backpressure:pause', data));
    this.batchProcessor.on('backpressure:resume', (data) => this.emit('backpressure:resume', data));
    this.batchProcessor.on('scaling:up', (data) => this.emit('scaling:up', data));
    this.batchProcessor.on('scaling:down', (data) => this.emit('scaling:down', data));

    this.errorHandler.on('dlq:record', (data) => this.emit('dlq:record', data));
    this.errorHandler.on('record:failed', (data) => this.emit('record:failed', data));
    this.errorHandler.on('record:error', (data) => this.emit('record:error', data));
    this.errorHandler.on('checkpoint:created', (data) => this.emit('checkpoint:created', data));
    this.errorHandler.on('checkpoint:persist', (data) => this.emit('checkpoint:persist', data));

    this.dataTransformer.on('handler:registered', (data) => this.emit('handler:registered', data));
  }

  async createPipeline(config: PipelineConfig): Promise<string> {
    this.validatePipelineConfig(config);

    this.pipelines.set(config.id, config);
    this.activePipelines.set(config.id, false);
    this.pipelineMetrics.set(config.id, this.createInitialMetrics(config.id));

    // Initialize components
    this.batchProcessor.initialize(config.id, config.scaling);
    this.streamProcessor.initialize(config.id);
    this.errorHandler.initialize(config.id);

    this.emit('pipeline:created', { pipelineId: config.id, config });
    return config.id;
  }

  async startIngestion(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) throw new Error(`Pipeline ${pipelineId} not found`);
    if (this.activePipelines.get(pipelineId)) throw new Error(`Pipeline ${pipelineId} is already running`);

    // Connect to sources
    for (const source of pipeline.sources) {
      if (source.enabled) {
        await this.sourceConnector.connect(pipelineId, source, (records) =>
          this.processRecords(pipelineId, records)
        );
      }
    }

    // Start checkpoint timer if periodic
    if (pipeline.checkpoint.strategy === 'periodic' && pipeline.checkpoint.intervalMs) {
      this.errorHandler.startCheckpointTimer(
        pipelineId,
        pipeline.checkpoint.intervalMs,
        () => this.checkpoint(pipelineId)
      );
    }

    // Start window timer if windowing enabled
    if (pipeline.windows) {
      this.streamProcessor.startWindowTimer(pipelineId, pipeline.windows, this.pipelineMetrics.get(pipelineId) || null);
    }

    const metrics = this.pipelineMetrics.get(pipelineId);
    if (metrics) metrics.startTime = new Date();

    this.activePipelines.set(pipelineId, true);
    this.emit('pipeline:started', { pipelineId, timestamp: new Date() });
  }

  async stopIngestion(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) throw new Error(`Pipeline ${pipelineId} not found`);
    if (!this.activePipelines.get(pipelineId)) return;

    await this.sourceConnector.disconnectAll(pipelineId, pipeline.sources);
    this.errorHandler.stopCheckpointTimer(pipelineId);
    this.streamProcessor.stopWindowTimer(pipelineId);

    await this.checkpoint(pipelineId);
    await this.flushBuffer(pipelineId);

    this.activePipelines.set(pipelineId, false);
    this.emit('pipeline:stopped', { pipelineId, timestamp: new Date() });
  }

  private async processRecords(pipelineId: string, records: IngestionRecord[]): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return;

    const metrics = this.pipelineMetrics.get(pipelineId) || null;

    // Handle backpressure
    if (this.batchProcessor.isPaused(pipelineId)) return;
    const shouldContinue = this.batchProcessor.handleBackpressure(
      pipelineId, pipeline.backpressure, records.length, metrics
    );
    if (!shouldContinue) return;

    if (metrics) metrics.recordsIngested += records.length;

    for (const record of records) {
      const startTime = Date.now();
      try {
        this.errorHandler.addPendingRecord(pipelineId, record);

        // Schema validation
        const source = pipeline.sources.find((s) => s.id === record.sourceId);
        if (source?.schema) {
          const validation = this.schemaValidator.validateSchema(record.value, source.schema);
          if (!validation.valid) {
            await this.errorHandler.handleQualityFailure(
              pipelineId, record, validation.errors, 'schema',
              pipeline.deadLetterQueue, metrics
            );
            continue;
          }
        }

        // Data quality checks
        const qualityResult = await this.schemaValidator.runQualityChecks(record, pipeline.qualityChecks);
        if (qualityResult.failed.some((f) => f.severity === 'error')) {
          await this.errorHandler.handleQualityFailure(
            pipelineId, record, qualityResult.failed, 'quality',
            pipeline.deadLetterQueue, metrics
          );
          continue;
        }

        // Transformations
        const transformedResult = await this.dataTransformer.applyTransformations(record, pipeline.transformations);

        if (transformedResult) {
          const recordsToProcess = Array.isArray(transformedResult) ? transformedResult : [transformedResult];
          for (const processedRecord of recordsToProcess) {
            await this.processTransformedRecord(pipelineId, processedRecord, pipeline, qualityResult);
          }
        }

        this.batchProcessor.trackLatency(pipelineId, Date.now() - startTime, metrics);

        if (pipeline.checkpoint.strategy === 'per-record') {
          await this.checkpoint(pipelineId);
        }

        this.errorHandler.removePendingRecord(pipelineId, record.id);
      } catch (error: any) {
        await this.errorHandler.handleProcessingError(
          pipelineId, record, error, pipeline.retryPolicy,
          pipeline.deadLetterQueue, metrics,
          (records) => this.processRecords(pipelineId, records)
        );
      }
    }

    if (pipeline.checkpoint.strategy === 'per-batch') {
      await this.checkpoint(pipelineId);
    }

    if (pipeline.scaling.enabled) {
      this.batchProcessor.checkAutoScaling(pipelineId, pipeline.scaling, metrics);
    }
  }

  private async processTransformedRecord(
    pipelineId: string,
    record: IngestionRecord,
    pipeline: PipelineConfig,
    qualityResult: { passed: any[]; failed: any[] }
  ): Promise<void> {
    const metrics = this.pipelineMetrics.get(pipelineId) || null;
    const enrichedRecord = await this.dataTransformer.applyEnrichments(record, pipeline.enrichments);

    if (pipeline.windows) {
      await this.streamProcessor.addToWindow(pipelineId, enrichedRecord, pipeline.windows, metrics);
    } else {
      const processedRecord: ProcessedRecord = {
        ...enrichedRecord,
        transformations: pipeline.transformations.map((t) => t.id),
        enrichments: pipeline.enrichments.map((e) => e.id),
        qualityFlags: [...qualityResult.passed, ...qualityResult.failed],
        processingTimeMs: Date.now() - enrichedRecord.timestamp.getTime(),
      };

      this.emit('record:processed', { pipelineId, record: processedRecord });
      if (metrics) metrics.recordsProcessed++;
    }
  }

  addTransformation(pipelineId: string, transformation: TransformationConfig): void {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) throw new Error(`Pipeline ${pipelineId} not found`);
    if (!transformation.id || !transformation.type) throw new Error('Transformation must have id and type');

    pipeline.transformations.push(transformation);
    pipeline.transformations.sort((a, b) => a.order - b.order);
    this.emit('transformation:added', { pipelineId, transformationId: transformation.id });
  }

  registerTransformationHandler(type: string, handler: TransformationHandler): void {
    this.dataTransformer.registerTransformationHandler(type, handler);
  }

  async checkpoint(pipelineId: string): Promise<Checkpoint> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) throw new Error(`Pipeline ${pipelineId} not found`);

    return this.errorHandler.createCheckpoint(
      pipelineId, pipeline,
      this.pipelineMetrics.get(pipelineId) || null,
      () => this.getSourceOffsets(pipelineId, pipeline),
      () => ({
        pendingRecords: this.errorHandler.getCheckpoints(pipelineId).length,
        bufferSize: this.batchProcessor.getBuffer(pipelineId).length,
        activeWindows: this.streamProcessor.getActiveWindowCount(pipelineId),
      })
    );
  }

  private getSourceOffsets(pipelineId: string, pipeline: PipelineConfig): Record<string, string> {
    const offsets: Record<string, string> = {};
    for (const source of pipeline.sources) {
      if (this.sourceConnector.isConnected(pipelineId, source.id)) {
        offsets[source.id] = `offset_${Date.now()}`;
      }
    }
    return offsets;
  }

  async handleBackpressure(pipelineId: string, incomingCount: number): Promise<boolean> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) return true;
    return this.batchProcessor.handleBackpressure(
      pipelineId, pipeline.backpressure, incomingCount,
      this.pipelineMetrics.get(pipelineId) || null
    );
  }

  private async flushBuffer(pipelineId: string): Promise<void> {
    const buffer = this.batchProcessor.clearBuffer(pipelineId);
    if (buffer.length > 0) {
      await this.processRecords(pipelineId, buffer);
    }
  }

  getMetrics(pipelineId: string): PipelineMetrics | null {
    return this.pipelineMetrics.get(pipelineId) || null;
  }

  getAllMetrics(): Map<string, PipelineMetrics> {
    return new Map(this.pipelineMetrics);
  }

  private createInitialMetrics(pipelineId: string): PipelineMetrics {
    return {
      pipelineId, startTime: new Date(),
      recordsIngested: 0, recordsProcessed: 0, recordsFailed: 0, recordsInDeadLetter: 0,
      avgLatencyMs: 0, p95LatencyMs: 0, p99LatencyMs: 0, throughputPerSecond: 0,
      backpressureEvents: 0, checkpointCount: 0,
      windowStats: { activeWindows: 0, closedWindows: 0, lateRecords: 0 },
      scalingStats: { currentInstances: 1, scaleUpEvents: 0, scaleDownEvents: 0 },
      errorBreakdown: {},
    };
  }

  private startMetricsCollection(): void {
    this.metricsCollectionInterval = setInterval(() => {
      this.pipelineMetrics.forEach((metrics, pipelineId) => {
        if (this.activePipelines.get(pipelineId)) {
          metrics.throughputPerSecond = this.batchProcessor.calculateCurrentThroughput(pipelineId, metrics);
          if (metrics.windowStats) {
            metrics.windowStats.activeWindows = this.streamProcessor.getActiveWindowCount(pipelineId);
          }
          this.emit('metrics:updated', { pipelineId, metrics });
        }
      });
    }, 5000);
  }

  private validatePipelineConfig(config: PipelineConfig): void {
    if (!config.id) throw new Error('Pipeline ID is required');
    if (!config.name) throw new Error('Pipeline name is required');
    if (!config.sources || config.sources.length === 0) {
      throw new Error('Pipeline must have at least one source');
    }
  }

  async shutdown(): Promise<void> {
    const pipelinesToStop: string[] = [];
    this.activePipelines.forEach((active, pipelineId) => {
      if (active) pipelinesToStop.push(pipelineId);
    });

    for (const pipelineId of pipelinesToStop) {
      await this.stopIngestion(pipelineId);
    }

    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
    }

    this.sourceConnector.shutdown();
    this.streamProcessor.shutdown();
    this.batchProcessor.shutdown();
    this.errorHandler.shutdown();
    this.dataTransformer.clearCaches();
    this.schemaValidator.clearCaches();

    this.emit('shutdown', { timestamp: new Date() });
  }
}

export const dataIngestionPipeline = DataIngestionPipeline.getInstance();
