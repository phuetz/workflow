/**
 * EvidenceCollector - Digital Forensics Evidence Collection System
 * Enterprise-grade orchestrator for workflow automation platform.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import type { EvidenceSource, EvidenceItem, EvidenceHashes, LegalHold, CollectionJob, CollectionProgress, CollectionOptions, CollectionSchedule, CollectionResult, CollectionError, LiveResponseData, LiveResponseOptions, PreservationOptions, CloudCollectionConfig, EvidenceCollectorConfig, HashAlgorithm, EvidenceType } from './collector/types';
import { MemoryCollector } from './collector/MemoryCollector';
import { DiskCollector } from './collector/DiskCollector';
import { NetworkCollector } from './collector/NetworkCollector';
import { CloudCollector } from './collector/CloudCollector';
import { ChainOfCustodyManager } from './collector/ChainOfCustody';

export * from './collector/types';

/**
 * Main evidence collector orchestrator class
 */
export class EvidenceCollector extends EventEmitter {
  private static instance: EvidenceCollector | null = null;
  private config: EvidenceCollectorConfig;
  private jobs: Map<string, CollectionJob> = new Map();
  private evidence: Map<string, EvidenceItem> = new Map();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private activeCollections: Set<string> = new Set();
  private initialized = false;

  // Specialized collectors
  private memoryCollector: MemoryCollector;
  private diskCollector: DiskCollector;
  private networkCollector: NetworkCollector;
  private cloudCollector: CloudCollector;
  private custodyManager: ChainOfCustodyManager;

  private constructor(config: EvidenceCollectorConfig) {
    super();
    this.config = config;
    this.memoryCollector = new MemoryCollector();
    this.diskCollector = new DiskCollector(config.storage);
    this.networkCollector = new NetworkCollector();
    this.cloudCollector = new CloudCollector();
    this.custodyManager = new ChainOfCustodyManager(() => this.generateId());
  }

  public static getInstance(config?: EvidenceCollectorConfig): EvidenceCollector {
    if (!EvidenceCollector.instance) {
      config = config || EvidenceCollector.getDefaultConfig();
      EvidenceCollector.instance = new EvidenceCollector(config);
    }
    return EvidenceCollector.instance;
  }

  public static resetInstance(): void {
    if (EvidenceCollector.instance) {
      EvidenceCollector.instance.shutdown();
      EvidenceCollector.instance = null;
    }
  }

  private static getDefaultConfig(): EvidenceCollectorConfig {
    return {
      storage: { backend: 'local', localPath: '/var/forensics/evidence' },
      defaultHashAlgorithms: ['sha256', 'md5'],
      maxConcurrentJobs: 5,
      jobTimeout: 3600000,
      retentionDays: 365,
      enableAuditLog: true,
      auditLogPath: '/var/forensics/audit.log',
    };
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.initializeStorage();
    this.startScheduler();
    this.initialized = true;
    this.logAudit('system', 'Evidence collector initialized');
  }

  private async initializeStorage(): Promise<void> {
    // Storage initialization handled by DiskCollector
  }

  private startScheduler(): void {
    setInterval(() => this.processScheduledJobs(), 60000);
  }

  private processScheduledJobs(): void {
    const now = new Date();
    this.jobs.forEach((job, jobId) => {
      if (job.schedule?.enabled && job.schedule.nextRunAt && job.schedule.nextRunAt <= now) {
        if (job.schedule.maxRuns && job.schedule.runCount >= job.schedule.maxRuns) {
          job.schedule.enabled = false;
          return;
        }
        this.executeJob(jobId).catch((error) => {
          this.emitError({
            timestamp: new Date(),
            code: 'SCHEDULED_JOB_FAILED',
            message: `Scheduled job ${jobId} failed: ${error.message}`,
            recoverable: true,
          });
        });
      }
    });
  }

  public async collectFromEndpoint(caseId: string, source: EvidenceSource, evidenceTypes: EvidenceType[], options: Partial<CollectionOptions> = {}): Promise<CollectionResult> {
    this.validateSource(source, 'endpoint');
    const mergedOptions = this.mergeOptions(options);
    const result: CollectionResult = { sourceId: source.id, evidenceItems: [], status: 'success', duration: 0, bytesCollected: 0, errors: [] };
    const startTime = Date.now();
    try {
      const connection = await this.connectToEndpoint(source);
      for (const evidenceType of evidenceTypes) {
        try {
          const item = await this.diskCollector.collectEvidenceType(caseId, source, evidenceType, connection, mergedOptions, () => this.generateId());
          if (item) { result.evidenceItems.push(item); result.bytesCollected += item.size; this.evidence.set(item.id, item); this.emit('evidence:collected', item); }
        } catch (error) {
          result.errors.push({ timestamp: new Date(), sourceId: source.id, evidenceType, code: 'COLLECTION_FAILED', message: error instanceof Error ? error.message : String(error), recoverable: true });
          result.status = 'partial';
        }
      }
      await this.disconnectFromEndpoint(connection);
    } catch (error) {
      result.status = 'failed';
      result.errors.push({ timestamp: new Date(), sourceId: source.id, code: 'CONNECTION_FAILED', message: error instanceof Error ? error.message : String(error), recoverable: false });
    }
    result.duration = Date.now() - startTime;
    this.logAudit('collection', `Collected from endpoint ${source.hostname}`, { caseId, sourceId: source.id, itemsCollected: result.evidenceItems.length });
    return result;
  }

  public async collectFromCloud(caseId: string, cloudConfig: CloudCollectionConfig, options: Partial<CollectionOptions> = {}): Promise<CollectionResult> {
    const mergedOptions = this.mergeOptions(options);
    const result: CollectionResult = { sourceId: `cloud_${cloudConfig.provider}_${cloudConfig.region}`, evidenceItems: [], status: 'success', duration: 0, bytesCollected: 0, errors: [] };
    const startTime = Date.now();
    try {
      const cloudClient = await this.cloudCollector.initializeCloudClient(cloudConfig);
      for (const resourceType of cloudConfig.resourceTypes) {
        try {
          const items = await this.cloudCollector.collectCloudResource(caseId, cloudConfig, resourceType, cloudClient, mergedOptions, () => this.generateId());
          for (const item of items) {
            item.storagePath = await this.diskCollector.storeEvidence(Buffer.from(''), item);
            result.evidenceItems.push(item); result.bytesCollected += item.size; this.evidence.set(item.id, item); this.emit('evidence:collected', item);
          }
        } catch (error) {
          result.errors.push({ timestamp: new Date(), sourceId: result.sourceId, code: 'CLOUD_COLLECTION_FAILED', message: error instanceof Error ? error.message : String(error), details: { resourceType }, recoverable: true });
          result.status = 'partial';
        }
      }
    } catch (error) {
      result.status = 'failed';
      result.errors.push({ timestamp: new Date(), sourceId: result.sourceId, code: 'CLOUD_INIT_FAILED', message: error instanceof Error ? error.message : String(error), recoverable: false });
    }
    result.duration = Date.now() - startTime;
    this.logAudit('collection', `Collected from cloud ${cloudConfig.provider}`, { caseId, provider: cloudConfig.provider });
    return result;
  }

  public async performLiveResponse(caseId: string, source: EvidenceSource, options: LiveResponseOptions = {}): Promise<LiveResponseData> {
    this.validateSource(source, 'endpoint');
    const response: LiveResponseData = { timestamp: new Date(), hostname: source.hostname || 'unknown' };
    const connection = await this.connectToEndpoint(source);
    try {
      if (options.collectMemory) response.memoryDump = await this.memoryCollector.collectMemoryDump(connection, options.memoryDumpType || 'full', options.targetProcessId);
      if (options.collectProcesses !== false) response.processList = await this.memoryCollector.collectProcessList(connection);
      if (options.collectNetworkConnections !== false) response.networkConnections = await this.networkCollector.collectNetworkConnections(connection);
      if (options.collectOpenFiles) response.openFiles = await this.memoryCollector.collectOpenFiles(connection);
      if (options.collectLoadedModules) response.loadedModules = await this.memoryCollector.collectLoadedModules(connection);
      if (options.collectSystemInfo !== false) response.systemInfo = await this.memoryCollector.collectSystemInfo(connection);
      if (options.collectServices) response.runningServices = await this.memoryCollector.collectServices(connection);
      if (options.collectScheduledTasks) response.scheduledTasks = await this.memoryCollector.collectScheduledTasks(connection);
      if (options.collectUserSessions) response.userSessions = await this.memoryCollector.collectUserSessions(connection);
      const evidenceItem = await this.createEvidenceFromLiveResponse(caseId, source, response);
      this.evidence.set(evidenceItem.id, evidenceItem);
      this.emit('evidence:collected', evidenceItem);
    } finally { await this.disconnectFromEndpoint(connection); }
    this.logAudit('live_response', `Live response performed on ${source.hostname}`, { caseId, sourceId: source.id });
    return response;
  }

  public async preserveEvidence(evidenceId: string, options: PreservationOptions = {}): Promise<EvidenceItem> {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) throw new Error(`Evidence not found: ${evidenceId}`);

    if (options.writeBlock !== false) await this.diskCollector.applyWriteBlocking(evidence);
    if (options.compress) await this.diskCollector.compressEvidence(evidence);
    if (options.encrypt && options.encryptionKey) await this.diskCollector.encryptEvidence(evidence, options.encryptionKey);
    if (options.targetStorage && options.targetPath) await this.diskCollector.transferEvidence(evidence, options.targetStorage, options.targetPath);

    this.custodyManager.addCustodyEntry(evidence, 'transferred', 'system', 'Evidence preserved with integrity protection', { previousHash: evidence.hashes.sha256, newHash: evidence.hashes.sha256 });
    this.emit('evidence:preserved', evidence);
    this.logAudit('preservation', `Evidence preserved: ${evidenceId}`);
    return evidence;
  }

  public async hashEvidence(evidenceId: string, algorithms: HashAlgorithm[] = ['sha256']): Promise<EvidenceHashes> {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) throw new Error(`Evidence not found: ${evidenceId}`);
    const data = await this.diskCollector.readEvidenceData(evidence);
    const hashes = await this.custodyManager.hashEvidence(evidence, data, algorithms);
    this.emit('evidence:verified', evidence);
    this.logAudit('verification', `Evidence verified: ${evidenceId}`, { algorithms, hashes });
    return hashes;
  }

  public async verifyEvidence(evidenceId: string): Promise<{ valid: boolean; originalHash: string; currentHash: string; algorithm: string; verifiedAt: Date }> {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) throw new Error(`Evidence not found: ${evidenceId}`);
    const data = await this.diskCollector.readEvidenceData(evidence);
    return this.custodyManager.verifyEvidence(evidence, data);
  }

  public async scheduleCollection(caseId: string, name: string, sources: EvidenceSource[], evidenceTypes: EvidenceType[], schedule: CollectionSchedule, options: Partial<CollectionOptions> = {}): Promise<CollectionJob> {
    const jobId = this.generateId();
    const job: CollectionJob = {
      id: jobId, caseId, name, description: `Scheduled collection: ${name}`, sources, evidenceTypes,
      status: 'pending',
      progress: { totalItems: sources.length * evidenceTypes.length, completedItems: 0, bytesCollected: 0, estimatedTotalBytes: 0, percentComplete: 0, currentPhase: 'scheduled', elapsedMs: 0 },
      options: this.mergeOptions(options),
      schedule: { ...schedule, nextRunAt: this.calculateNextRun(schedule.cronExpression, schedule.timezone), runCount: 0 },
      results: [], createdBy: 'system', createdAt: new Date(), errors: [],
    };
    this.jobs.set(jobId, job);
    this.emit('job:created', job);
    this.logAudit('scheduling', `Collection job scheduled: ${jobId}`, { name, caseId });
    return job;
  }

  public async executeJob(jobId: string): Promise<CollectionJob> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);
    if (this.activeCollections.size >= this.config.maxConcurrentJobs) throw new Error('Maximum concurrent jobs reached');

    this.activeCollections.add(jobId);
    job.status = 'collecting';
    job.startedAt = new Date();
    const startTime = Date.now();
    this.emit('job:started', job);

    try {
      for (const source of job.sources) {
        job.progress.currentItem = source.name;
        const result = await this.collectFromEndpoint(job.caseId, source, job.evidenceTypes, job.options);
        job.results.push(result);
        job.progress.completedItems += job.evidenceTypes.length;
        job.progress.bytesCollected += result.bytesCollected;
        job.progress.percentComplete = (job.progress.completedItems / job.progress.totalItems) * 100;
        job.progress.elapsedMs = Date.now() - startTime;
        this.emit('job:progress', job, job.progress);
      }
      job.status = 'completed';
      job.completedAt = new Date();
      if (job.schedule) {
        job.schedule.lastRunAt = new Date();
        job.schedule.runCount++;
        job.schedule.nextRunAt = this.calculateNextRun(job.schedule.cronExpression, job.schedule.timezone);
      }
      this.emit('job:completed', job);
    } catch (error) {
      job.status = 'failed';
      const collectionError: CollectionError = { timestamp: new Date(), code: 'JOB_EXECUTION_FAILED', message: error instanceof Error ? error.message : String(error), recoverable: false };
      job.errors.push(collectionError);
      this.emit('job:failed', job, collectionError);
    } finally {
      this.activeCollections.delete(jobId);
    }
    return job;
  }

  public async cancelJob(jobId: string): Promise<CollectionJob> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);
    job.status = 'cancelled';
    job.completedAt = new Date();
    if (this.scheduledJobs.has(jobId)) { clearTimeout(this.scheduledJobs.get(jobId)); this.scheduledJobs.delete(jobId); }
    this.activeCollections.delete(jobId);
    this.emit('job:cancelled', job);
    this.logAudit('cancellation', `Job cancelled: ${jobId}`);
    return job;
  }

  public async applyLegalHold(holdConfig: Omit<LegalHold, 'id' | 'isActive'>, evidenceIds: string[]): Promise<LegalHold> {
    const hold = this.custodyManager.applyLegalHold(holdConfig, this.evidence, evidenceIds);
    this.emit('legal_hold:applied', hold, evidenceIds);
    this.logAudit('legal_hold', `Legal hold applied: ${hold.id}`, { name: hold.name, evidenceCount: evidenceIds.length });
    return hold;
  }

  public async releaseLegalHold(holdId: string, releasedBy: string): Promise<void> {
    this.custodyManager.releaseLegalHold(holdId, releasedBy, this.evidence);
    const hold = this.custodyManager.getLegalHold(holdId);
    if (hold) this.emit('legal_hold:released', hold);
    this.logAudit('legal_hold', `Legal hold released: ${holdId}`, { releasedBy });
  }

  // Query methods
  public getEvidence(evidenceId: string): EvidenceItem | null { return this.evidence.get(evidenceId) || null; }
  public getEvidenceByCaseId(caseId: string): EvidenceItem[] { return Array.from(this.evidence.values()).filter(e => e.caseId === caseId); }
  public searchEvidenceByTags(tags: string[]): EvidenceItem[] { return Array.from(this.evidence.values()).filter(e => tags.some(tag => e.tags.includes(tag))); }
  public getJob(jobId: string): CollectionJob | null { return this.jobs.get(jobId) || null; }
  public getJobsByCaseId(caseId: string): CollectionJob[] { return Array.from(this.jobs.values()).filter(job => job.caseId === caseId); }
  public getCollectionStatus(jobId: string): CollectionProgress | null { return this.jobs.get(jobId)?.progress || null; }
  public getEvidenceUnderHold(holdId: string): EvidenceItem[] { return this.custodyManager.getEvidenceUnderHold(holdId, this.evidence); }
  public canDeleteEvidence(evidenceId: string): { canDelete: boolean; reason?: string } { return this.custodyManager.canDeleteEvidence(evidenceId, this.evidence); }
  public getLegalHold(holdId: string): LegalHold | null { return this.custodyManager.getLegalHold(holdId); }
  public getActiveLegalHolds(): LegalHold[] { return this.custodyManager.getActiveLegalHolds(); }
  public exportChainOfCustody(evidenceId: string) { return this.custodyManager.exportChainOfCustody(evidenceId, this.evidence); }

  public getStatistics(): { totalEvidence: number; totalJobs: number; activeJobs: number; activeLegalHolds: number; totalBytesCollected: number } {
    let totalBytes = 0;
    this.evidence.forEach((evidence) => { totalBytes += evidence.size; });
    return { totalEvidence: this.evidence.size, totalJobs: this.jobs.size, activeJobs: this.activeCollections.size, activeLegalHolds: this.getActiveLegalHolds().length, totalBytesCollected: totalBytes };
  }

  public shutdown(): void {
    this.scheduledJobs.forEach((timeout) => clearTimeout(timeout));
    this.scheduledJobs.clear();
    this.activeCollections.clear();
    this.removeAllListeners();
    this.initialized = false;
    this.logAudit('system', 'Evidence collector shut down');
  }

  // Private helpers
  private async connectToEndpoint(source: EvidenceSource): Promise<unknown> { return { connected: true, source }; }
  private async disconnectFromEndpoint(connection: unknown): Promise<void> { }
  private validateSource(source: EvidenceSource, expectedType: string): void {
    if (!source.id) throw new Error('Source ID is required');
    if (!['endpoint', 'server'].includes(source.type) && expectedType === 'endpoint') throw new Error(`Invalid source type: ${source.type}`);
  }

  private mergeOptions(options: Partial<CollectionOptions>): CollectionOptions {
    return {
      writeBlocking: options.writeBlocking ?? true, verifyHashes: options.verifyHashes ?? true, hashAlgorithms: options.hashAlgorithms ?? this.config.defaultHashAlgorithms,
      compression: options.compression ?? false, encryption: options.encryption ?? false, encryptionKey: options.encryptionKey,
      storageBackend: options.storageBackend ?? this.config.storage.backend, storagePath: options.storagePath ?? this.config.storage.localPath ?? '/var/forensics/evidence',
      maxConcurrent: options.maxConcurrent ?? 5, timeout: options.timeout ?? this.config.jobTimeout, retryAttempts: options.retryAttempts ?? 3,
      minimalFootprint: options.minimalFootprint ?? true, preserveTimestamps: options.preserveTimestamps ?? true, collectDeleted: options.collectDeleted ?? false, excludePatterns: options.excludePatterns ?? [],
    };
  }

  private calculateNextRun(cronExpression: string, timezone: string): Date { return new Date(Date.now() + 3600000); }
  private generateId(): string { return `ev_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`; }

  private async createEvidenceFromLiveResponse(caseId: string, source: EvidenceSource, response: LiveResponseData): Promise<EvidenceItem> {
    const id = this.generateId();
    const now = new Date();
    const data = Buffer.from(JSON.stringify(response, null, 2));
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    const evidence: EvidenceItem = {
      id, caseId, sourceId: source.id, type: 'file_artifact', name: `live_response_${source.hostname}_${now.toISOString()}`,
      description: `Live response data from ${source.hostname}`, size: data.length, path: `/evidence/${caseId}/${id}`, storagePath: '',
      storageBackend: this.config.storage.backend, hashes: { sha256: hash },
      metadata: { originalPath: 'memory', originalSize: data.length, acquisitionMethod: 'live_response', acquisitionTool: 'EvidenceCollector', acquisitionToolVersion: '1.0.0', sourceHostname: source.hostname, sourceIpAddress: source.ipAddress, mimeType: 'application/json', customFields: { collectionsIncluded: Object.keys(response).filter(k => k !== 'timestamp' && k !== 'hostname') } },
      chainOfCustody: [{ id: this.generateId(), timestamp: now, action: 'collected', actor: 'system', description: 'Live response data collected', newHash: hash }],
      collectedAt: now, collectedBy: 'system', verified: false, tags: ['live_response', source.type],
    };
    evidence.storagePath = await this.diskCollector.storeEvidence(data, evidence);
    return evidence;
  }

  private logAudit(action: string, message: string, details?: Record<string, unknown>): void {
    if (!this.config.enableAuditLog) return;
    console.log('[AUDIT]', JSON.stringify({ timestamp: new Date().toISOString(), action, message, details }));
  }

  private emitError(error: CollectionError): void {
    this.emit('error', error);
    this.logAudit('error', error.message, { code: error.code, details: error.details });
  }
}

export default EvidenceCollector;
