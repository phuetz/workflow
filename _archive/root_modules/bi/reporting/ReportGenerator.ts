import { EventEmitter } from 'events';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'executive' | 'operational' | 'analytical' | 'compliance' | 'financial' | 'custom';
  format: 'pdf' | 'excel' | 'word' | 'powerpoint' | 'html' | 'csv';
  structure: {
    header?: {
      logo?: string;
      title: string;
      subtitle?: string;
      metadata?: Array<{
        label: string;
        value: string;
      }>;
    };
    sections: Array<{
      id: string;
      type: 'text' | 'chart' | 'table' | 'image' | 'kpi' | 'pagebreak';
      title?: string;
      content?: unknown;
      style?: unknown;
      dataBinding?: {
        source: string;
        query?: string;
        transform?: string;
      };
      conditional?: {
        show?: string;
        highlight?: Array<{
          condition: string;
          style: unknown;
        }>;
      };
    }>;
    footer?: {
      pageNumbers?: boolean;
      timestamp?: boolean;
      confidentiality?: string;
      customText?: string;
    };
  };
  style: {
    theme: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
    fonts: {
      heading: string;
      body: string;
      mono: string;
    };
    spacing: {
      margins: number;
      padding: number;
      lineHeight: number;
    };
  };
  parameters: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'select';
    label: string;
    required: boolean;
    defaultValue?: unknown;
    options?: unknown[];
  }>;
  scheduling?: {
    enabled: boolean;
    cron: string;
    timezone: string;
    recipients: Array<{
      email: string;
      name: string;
      format?: string;
    }>;
  };
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface ReportGeneration {
  id: string;
  templateId: string;
  parameters: { [key: string]: unknown };
  format: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  output?: {
    url: string;
    size: number;
    pages?: number;
  };
  error?: string;
  startTime: Date;
  endTime?: Date;
  requestedBy: string;
}

export interface ReportDistribution {
  id: string;
  reportId: string;
  method: 'email' | 'slack' | 'teams' | 'sftp' | 'api' | 'storage';
  recipients: Array<{
    address: string;
    name?: string;
    status: 'pending' | 'sent' | 'failed';
    error?: string;
    sentAt?: Date;
  }>;
  options?: {
    subject?: string;
    body?: string;
    attachmentName?: string;
    encryption?: boolean;
    password?: string;
  };
  status: 'pending' | 'distributing' | 'completed' | 'partial' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export interface ReportSchedule {
  id: string;
  name: string;
  templateId: string;
  parameters: { [key: string]: unknown };
  schedule: {
    cron: string;
    timezone: string;
    startDate?: Date;
    endDate?: Date;
  };
  distribution: {
    method: string;
    recipients: unknown[];
    options?: unknown;
  };
  lastRun?: {
    timestamp: Date;
    status: string;
    reportId?: string;
    error?: string;
  };
  nextRun?: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportGeneratorConfig {
  templates: ReportTemplate[];
  engines: {
    pdf: {
      engine: 'puppeteer' | 'wkhtmltopdf' | 'pdfkit';
      options?: unknown;
    };
    excel: {
      engine: 'exceljs' | 'xlsx';
      options?: unknown;
    };
    word: {
      engine: 'docx' | 'pandoc';
      options?: unknown;
    };
  };
  storage: {
    provider: 'local' | 's3' | 'azure' | 'gcs';
    config: unknown;
    retention: {
      days: number;
      archiveAfterDays?: number;
    };
  };
  distribution: {
    email: {
      provider: string;
      config: unknown;
    };
    slack?: {
      token: string;
    };
    teams?: {
      webhook: string;
    };
  };
  processing: {
    maxConcurrent: number;
    timeout: number;
    retries: number;
  };
  security: {
    encryptReports: boolean;
    watermark?: {
      enabled: boolean;
      text: string;
    };
    allowedFormats: string[];
    maxReportSize: number;
  };
}

export class ReportGenerator extends EventEmitter {
  private config: ReportGeneratorConfig;
  private templates: Map<string, ReportTemplate> = new Map();
  private generations: Map<string, ReportGeneration> = new Map();
  private schedules: Map<string, ReportSchedule> = new Map();
  private distributions: Map<string, ReportDistribution> = new Map();
  private generationQueue: Array<{ id: string; priority: number }> = [];
  private activeGenerations = 0;
  private schedulerInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(config: ReportGeneratorConfig) {
    super();
    this.config = config;
  }

  public async initialize(): Promise<void> {
    try {
      // Load templates
      for (const template of this.config.templates) {
        this.templates.set(template.id, template);
      }

      // Initialize report engines
      await this.initializeEngines();

      // Start scheduler
      this.startScheduler();

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  public async createTemplate(templateSpec: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<string> {
    const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const template: ReportTemplate = {
      ...templateSpec,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    // Validate template
    this.validateTemplate(template);

    this.templates.set(id, template);
    this.emit('templateCreated', { template });
    
    return id;
  }

  public async generateReport(
    templateId: string,
    parameters: { [key: string]: unknown },
    options: {
      format?: string;
      priority?: number;
      async?: boolean;
      requestedBy?: string;
    } = {}
  ): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const generationId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const generation: ReportGeneration = {
      id: generationId,
      templateId,
      parameters,
      format: options.format || template.format,
      status: 'pending',
      progress: 0,
      startTime: new Date(),
      requestedBy: options.requestedBy || 'system'
    };

    this.generations.set(generationId, generation);
    this.emit('reportGenerationQueued', { generation });

    if (options.async) {
      // Add to queue
      this.generationQueue.push({ id: generationId, priority: options.priority || 1 });
      this.processGenerationQueue();
      return generationId;
    } else {
      // Generate synchronously
      await this.performGeneration(generationId);
      return generationId;
    }
  }

  public async scheduleReport(scheduleSpec: Omit<ReportSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const schedule: ReportSchedule = {
      ...scheduleSpec,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Calculate next run
    schedule.nextRun = this.calculateNextRun(schedule.schedule);

    this.schedules.set(id, schedule);
    this.emit('scheduleCreated', { schedule });
    
    return id;
  }

  public async distributeReport(
    reportId: string,
    distributionSpec: Omit<ReportDistribution, 'id' | 'reportId' | 'createdAt' | 'status'>
  ): Promise<string> {
    const generation = this.generations.get(reportId);
    if (!generation) {
      throw new Error(`Report not found: ${reportId}`);
    }

    if (generation.status !== 'completed') {
      throw new Error(`Report generation not completed: ${reportId}`);
    }

    const distributionId = `dist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const distribution: ReportDistribution = {
      ...distributionSpec,
      id: distributionId,
      reportId,
      status: 'pending',
      createdAt: new Date()
    };

    this.distributions.set(distributionId, distribution);
    this.emit('distributionQueued', { distribution });

    // Start distribution
    this.performDistribution(distributionId);
    
    return distributionId;
  }

  public async getReportStatus(generationId: string): Promise<ReportGeneration> {
    const generation = this.generations.get(generationId);
    if (!generation) {
      throw new Error(`Report generation not found: ${generationId}`);
    }
    return generation;
  }

  public async getReportUrl(generationId: string): Promise<string> {
    const generation = this.generations.get(generationId);
    if (!generation) {
      throw new Error(`Report generation not found: ${generationId}`);
    }

    if (generation.status !== 'completed') {
      throw new Error(`Report not yet generated: ${generationId}`);
    }

    if (!generation.output?.url) {
      throw new Error(`Report URL not available: ${generationId}`);
    }

    return generation.output.url;
  }

  public async updateTemplate(
    templateId: string,
    updates: Partial<Omit<ReportTemplate, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    Object.assign(template, updates, {
      updatedAt: new Date(),
      version: template.version + 1
    });

    this.validateTemplate(template);
    this.emit('templateUpdated', { templateId, updates });
  }

  public async deleteTemplate(templateId: string): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Check if template is used in schedules
    const activeSchedules = Array.from(this.schedules.values()).filter(
      s => s.templateId === templateId && s.isActive
    );

    if (activeSchedules.length > 0) {
      throw new Error(`Template is used in ${activeSchedules.length} active schedules`);
    }

    this.templates.delete(templateId);
    this.emit('templateDeleted', { templateId });
  }

  public async pauseSchedule(scheduleId: string): Promise<void> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    schedule.isActive = false;
    schedule.updatedAt = new Date();
    
    this.emit('schedulePaused', { scheduleId });
  }

  public async resumeSchedule(scheduleId: string): Promise<void> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    schedule.isActive = true;
    schedule.nextRun = this.calculateNextRun(schedule.schedule);
    schedule.updatedAt = new Date();
    
    this.emit('scheduleResumed', { scheduleId });
  }

  public getTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  public getSchedules(): ReportSchedule[] {
    return Array.from(this.schedules.values());
  }

  public getGenerations(filter?: { status?: string; templateId?: string }): ReportGeneration[] {
    let generations = Array.from(this.generations.values());
    
    if (filter?.status) {
      generations = generations.filter(g => g.status === filter.status);
    }
    
    if (filter?.templateId) {
      generations = generations.filter(g => g.templateId === filter.templateId);
    }
    
    return generations;
  }

  public async shutdown(): Promise<void> {
    this.isInitialized = false;
    
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    
    this.emit('shutdown');
  }

  private async initializeEngines(): Promise<void> {
    // Mock engine initialization
    // In real implementation would initialize PDF, Excel, etc. engines
  }

  private startScheduler(): void {
    this.schedulerInterval = setInterval(() => {
      this.checkScheduledReports();
    }, 60000); // Check every minute
  }

  private validateTemplate(template: ReportTemplate): void {
    // Validate format is supported
    if (!this.config.security.allowedFormats.includes(template.format)) {
      throw new Error(`Unsupported format: ${template.format}`);
    }

    // Validate structure
    if (!template.structure.sections || template.structure.sections.length === 0) {
      throw new Error('Template must have at least one section');
    }

    // Validate parameters
    for (const param of template.parameters || []) {
      if (param.required && param.defaultValue === undefined) {
        throw new Error(`Required parameter ${param.name} must have a default value`);
      }
    }
  }

  private async performGeneration(generationId: string): Promise<void> {
    const generation = this.generations.get(generationId);
    if (!generation) return;

    generation.status = 'generating';
    this.activeGenerations++;
    this.emit('reportGenerationStarted', { generationId });

    try {
      const template = this.templates.get(generation.templateId)!;
      
      // Validate parameters
      const validatedParams = this.validateParameters(template, generation.parameters);
      
      // Collect data
      const data = await this.collectReportData(template, validatedParams);
      generation.progress = 30;
      
      // Render report
      const rendered = await this.renderReport(template, data, generation.format);
      generation.progress = 70;
      
      // Save report
      const output = await this.saveReport(rendered, generation);
      generation.progress = 90;
      
      // Apply security features
      if (this.config.security.encryptReports) {
        await this.encryptReport(output.url);
      }
      
      if (this.config.security.watermark?.enabled) {
        await this.applyWatermark(output.url);
      }
      
      generation.output = output;
      generation.status = 'completed';
      generation.progress = 100;
      generation.endTime = new Date();
      
      this.emit('reportGenerationCompleted', { generationId, output });
    } catch (error) {
      generation.status = 'failed';
      generation.error = error.message;
      generation.endTime = new Date();
      
      this.emit('error', { type: 'generation', generationId, error });
    } finally {
      this.activeGenerations--;
      this.processGenerationQueue();
    }
  }

  private async performDistribution(distributionId: string): Promise<void> {
    const distribution = this.distributions.get(distributionId);
    if (!distribution) return;

    distribution.status = 'distributing';
    this.emit('distributionStarted', { distributionId });

    try {
      const generation = this.generations.get(distribution.reportId)!;
      
      let successCount = 0;
      let failCount = 0;
      
      for (const recipient of distribution.recipients) {
        try {
          await this.sendToRecipient(
            generation,
            distribution.method,
            recipient,
            distribution.options
          );
          
          recipient.status = 'sent';
          recipient.sentAt = new Date();
          successCount++;
        } catch (error) {
          recipient.status = 'failed';
          recipient.error = error.message;
          failCount++;
        }
      }
      
      if (failCount === 0) {
        distribution.status = 'completed';
      } else if (successCount > 0) {
        distribution.status = 'partial';
      } else {
        distribution.status = 'failed';
      }
      
      distribution.completedAt = new Date();
      
      this.emit('distributionCompleted', { distributionId, successCount, failCount });
    } catch (error) {
      distribution.status = 'failed';
      this.emit('error', { type: 'distribution', distributionId, error });
    }
  }

  private validateParameters(template: ReportTemplate, parameters: unknown): unknown {
    const validated: unknown = {};
    
    for (const param of template.parameters || []) {
      const value = parameters[param.name] ?? param.defaultValue;
      
      if (param.required && value === undefined) {
        throw new Error(`Missing required parameter: ${param.name}`);
      }
      
      validated[param.name] = value;
    }
    
    return validated;
  }

  private async collectReportData(template: ReportTemplate, parameters: unknown): Promise<unknown> {
    const data: unknown = { parameters };
    
    // Mock data collection
    for (const section of template.structure.sections) {
      if (section.dataBinding?.source) {
        data[section.id] = await this.fetchSectionData(section.dataBinding, parameters);
      }
    }
    
    return data;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async fetchSectionData(dataBinding: unknown, parameters: unknown): Promise<unknown> {
    // Mock data fetching
    return {
      revenue: 1250000,
      growth: 0.15,
      customers: 5420,
      satisfaction: 0.92
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async renderReport(template: ReportTemplate, data: unknown, format: string): Promise<Buffer> {
    // Mock report rendering
    const content = JSON.stringify({ template: template.name, data }, null, 2);
    return Buffer.from(content);
  }

  private async saveReport(content: Buffer, generation: ReportGeneration): Promise<unknown> {
    // Mock report saving
    const filename = `${generation.id}.${generation.format}`;
    const url = `https://storage.example.com/reports/${filename}`;
    
    return {
      url,
      size: content.length,
      pages: generation.format === 'pdf' ? Math.ceil(content.length / 3000) : undefined
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async encryptReport(url: string): Promise<void> {
    // Mock encryption
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async applyWatermark(url: string): Promise<void> {
    // Mock watermark application
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async sendToRecipient(generation: unknown, method: string, recipient: unknown, options: unknown): Promise<void> {
    // Mock distribution
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private calculateNextRun(schedule: unknown): Date {
    // Mock next run calculation
    // In real implementation would use cron parser
    const next = new Date();
    next.setHours(next.getHours() + 24);
    return next;
  }

  private async checkScheduledReports(): Promise<void> {
    const now = new Date();
    
    for (const schedule of this.schedules.values()) {
      if (!schedule.isActive || !schedule.nextRun || schedule.nextRun > now) {
        continue;
      }
      
      // Generate report
      try {
        const generationId = await this.generateReport(
          schedule.templateId,
          schedule.parameters,
          { async: true, requestedBy: `schedule:${schedule.id}` }
        );
        
        schedule.lastRun = {
          timestamp: now,
          status: 'success',
          reportId: generationId
        };
        
        // Queue distribution
        setTimeout(async () => {
          const generation = this.generations.get(generationId);
          if (generation?.status === 'completed') {
            await this.distributeReport(generationId, schedule.distribution);
          }
        }, 5000);
      } catch (error) {
        schedule.lastRun = {
          timestamp: now,
          status: 'failed',
          error: error.message
        };
      }
      
      // Calculate next run
      schedule.nextRun = this.calculateNextRun(schedule.schedule);
      schedule.updatedAt = new Date();
    }
  }

  private processGenerationQueue(): void {
    if (this.activeGenerations >= this.config.processing.maxConcurrent || this.generationQueue.length === 0) {
      return;
    }
    
    const { id } = this.generationQueue.shift()!;
    this.performGeneration(id);
  }
}