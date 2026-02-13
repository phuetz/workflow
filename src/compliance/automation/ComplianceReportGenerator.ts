/**
 * ComplianceReportGenerator
 * Automated compliance report generation with multiple formats, scheduling, and distribution
 * Supports executive summaries, detailed assessments, gap analysis, and certification packages
 */

import { EventEmitter } from 'events';
import { ComplianceFramework } from '../../types/compliance';

// Re-export types for backward compatibility
export * from './report/types';

// Import managers
import {
  ReportType,
  ReportFormat,
  ScheduleFrequency,
  StakeholderView,
  ReportTemplate,
  ReportSchedule,
  GeneratedReport,
  CertificationPackage,
  ExecutiveDashboard,
  ReportPeriod,
  ReportFilter,
  DistributionRecipient,
  HistoricalTrendData,
  ReportComparison,
  ReportGenerationOptions,
  ScheduleOptions,
  CertificationPackageOptions,
  DashboardOptions,
  EvidencePackageOptions,
} from './report/types';

import { DataCollector } from './report/DataCollector';
import { ReportFormatter } from './report/ReportFormatter';
import { ReportDistributor } from './report/ReportDistributor';
import { ScheduleManager } from './report/ScheduleManager';
import { TemplateManager } from './report/TemplateManager';
import { CertificationManager } from './report/CertificationManager';
import { DashboardManager } from './report/DashboardManager';
import { ReportComparator } from './report/ReportComparator';
import { ContentGenerator } from './report/ContentGenerator';

/**
 * ComplianceReportGenerator - Main orchestrator for compliance report generation
 */
export class ComplianceReportGenerator extends EventEmitter {
  private static instance: ComplianceReportGenerator;

  private generatedReports: Map<string, GeneratedReport> = new Map();

  // Managers
  private readonly dataCollector: DataCollector;
  private readonly formatter: ReportFormatter;
  private readonly distributor: ReportDistributor;
  private readonly scheduleManager: ScheduleManager;
  private readonly templateManager: TemplateManager;
  private readonly certificationManager: CertificationManager;
  private readonly dashboardManager: DashboardManager;
  private readonly reportComparator: ReportComparator;
  private readonly contentGenerator: ContentGenerator;

  private constructor() {
    super();

    // Initialize managers
    this.dataCollector = new DataCollector();
    this.formatter = new ReportFormatter();
    this.distributor = new ReportDistributor();
    this.scheduleManager = new ScheduleManager();
    this.templateManager = new TemplateManager();
    this.certificationManager = new CertificationManager();
    this.dashboardManager = new DashboardManager();
    this.reportComparator = new ReportComparator(this.generatedReports);
    this.contentGenerator = new ContentGenerator();

    // Setup event forwarding
    this.setupEventForwarding();

    // Initialize defaults and start scheduler
    this.templateManager.initializeDefaultTemplates();
    this.startScheduler();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ComplianceReportGenerator {
    if (!ComplianceReportGenerator.instance) {
      ComplianceReportGenerator.instance = new ComplianceReportGenerator();
    }
    return ComplianceReportGenerator.instance;
  }

  // ============================================================================
  // Report Generation
  // ============================================================================

  /**
   * Generate a compliance report
   */
  async generateReport(options: ReportGenerationOptions): Promise<GeneratedReport> {
    const reportId = this.generateId('report');
    const startTime = Date.now();

    this.emit('report:generation_started', { reportId, options });

    try {
      const template = options.templateId
        ? this.templateManager.getTemplate(options.templateId)
        : this.templateManager.getDefaultTemplate(options.reportType);

      const stakeholderView = options.stakeholderView || StakeholderView.EXECUTIVE;

      // Generate report content
      const content = await this.contentGenerator.generateReportContent(
        options.reportType,
        options.frameworks,
        options.period,
        stakeholderView,
        options.filters,
        options.includeEvidence,
        options.includeRecommendations
      );

      // Format the report
      const { filePath, fileSize } = await this.formatter.formatReport(
        content,
        options.format,
        template?.branding
      );

      const report: GeneratedReport = {
        id: reportId,
        templateId: options.templateId,
        reportType: options.reportType,
        format: options.format,
        frameworks: options.frameworks,
        stakeholderView,
        period: options.period,
        generatedAt: new Date(),
        generatedBy: options.generatedBy,
        status: 'completed',
        filePath,
        fileSize,
        downloadUrl: this.formatter.generateDownloadUrl(reportId, options.format),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        content,
      };

      this.generatedReports.set(reportId, report);

      const generationTime = Date.now() - startTime;
      this.emit('report:generation_completed', { reportId, generationTime, format: options.format });

      return report;
    } catch (error) {
      const failedReport: GeneratedReport = {
        id: reportId,
        reportType: options.reportType,
        format: options.format,
        frameworks: options.frameworks,
        stakeholderView: options.stakeholderView || StakeholderView.EXECUTIVE,
        period: options.period,
        generatedAt: new Date(),
        generatedBy: options.generatedBy,
        status: 'failed',
        content: { title: 'Failed Report' },
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      };

      this.generatedReports.set(reportId, failedReport);
      this.emit('report:generation_failed', { reportId, error });
      throw error;
    }
  }

  // ============================================================================
  // Scheduling
  // ============================================================================

  async scheduleReport(options: ScheduleOptions): Promise<ReportSchedule> {
    return this.scheduleManager.scheduleReport(options);
  }

  async updateSchedule(
    scheduleId: string,
    updates: Partial<Omit<ReportSchedule, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<ReportSchedule> {
    return this.scheduleManager.updateSchedule(scheduleId, updates);
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    return this.scheduleManager.deleteSchedule(scheduleId);
  }

  getSchedules(): ReportSchedule[] {
    return this.scheduleManager.getSchedules();
  }

  stopScheduler(): void {
    this.scheduleManager.stopScheduler();
  }

  // ============================================================================
  // Distribution
  // ============================================================================

  async distributeReport(
    report: GeneratedReport,
    recipients: DistributionRecipient[]
  ): Promise<{ success: string[]; failed: string[] }> {
    const results = await this.distributor.distributeReport(report, recipients);

    if (results.success.length > 0) {
      const updatedReport = this.generatedReports.get(report.id);
      if (updatedReport) {
        updatedReport.status = 'distributed';
      }
    }

    return results;
  }

  // ============================================================================
  // Template Management
  // ============================================================================

  async createTemplate(options: Parameters<typeof this.templateManager.createTemplate>[0]): Promise<ReportTemplate> {
    return this.templateManager.createTemplate(options);
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<Omit<ReportTemplate, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<ReportTemplate> {
    return this.templateManager.updateTemplate(templateId, updates);
  }

  async deleteTemplate(templateId: string): Promise<void> {
    return this.templateManager.deleteTemplate(templateId);
  }

  getTemplates(): ReportTemplate[] {
    return this.templateManager.getTemplates();
  }

  // ============================================================================
  // Historical Analysis
  // ============================================================================

  async getHistoricalTrends(
    frameworks: ComplianceFramework[],
    periodCount: number = 12,
    periodType: 'month' | 'quarter' | 'year' = 'month'
  ): Promise<HistoricalTrendData[]> {
    return this.reportComparator.getHistoricalTrends(frameworks, periodCount, periodType);
  }

  async compareReports(baseReportId: string, compareReportId: string): Promise<ReportComparison> {
    return this.reportComparator.compareReports(baseReportId, compareReportId);
  }

  // ============================================================================
  // Certification Package
  // ============================================================================

  async generateCertificationPackage(options: CertificationPackageOptions): Promise<CertificationPackage> {
    return this.certificationManager.generateCertificationPackage(options);
  }

  async updateCertificationStatus(
    packageId: string,
    status: CertificationPackage['status'],
    updatedBy: string,
    details?: string
  ): Promise<CertificationPackage> {
    return this.certificationManager.updateCertificationStatus(packageId, status, updatedBy, details);
  }

  async exportEvidencePackage(options: EvidencePackageOptions): Promise<GeneratedReport> {
    const evidenceSection = this.dataCollector.generateEvidenceSection(
      [options.framework],
      options.period || this.scheduleManager.calculateReportPeriod(ScheduleFrequency.QUARTERLY)
    );

    const report = await this.generateReport({
      reportType: ReportType.EVIDENCE_PACKAGE,
      frameworks: [options.framework],
      format: options.format,
      period: options.period || this.scheduleManager.calculateReportPeriod(ScheduleFrequency.QUARTERLY),
      generatedBy: options.generatedBy,
      includeEvidence: true,
    });

    report.content.evidence = evidenceSection;
    return report;
  }

  // ============================================================================
  // Executive Dashboard
  // ============================================================================

  async createExecutiveDashboard(options: DashboardOptions): Promise<ExecutiveDashboard> {
    return this.dashboardManager.createExecutiveDashboard(options);
  }

  async getDashboardData(dashboardId: string): Promise<Record<string, unknown>> {
    return this.dashboardManager.getDashboardData(dashboardId);
  }

  // ============================================================================
  // Public Getters
  // ============================================================================

  getReport(reportId: string): GeneratedReport | undefined {
    return this.generatedReports.get(reportId);
  }

  getReports(): GeneratedReport[] {
    return Array.from(this.generatedReports.values());
  }

  getCertificationPackage(packageId: string): CertificationPackage | undefined {
    return this.certificationManager.getCertificationPackage(packageId);
  }

  getCertificationPackages(): CertificationPackage[] {
    return this.certificationManager.getCertificationPackages();
  }

  getDashboard(dashboardId: string): ExecutiveDashboard | undefined {
    return this.dashboardManager.getDashboard(dashboardId);
  }

  getDashboards(): ExecutiveDashboard[] {
    return this.dashboardManager.getDashboards();
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private startScheduler(): void {
    this.scheduleManager.startScheduler(async (scheduleId, schedule) => {
      const template = this.templateManager.getTemplate(schedule.templateId);

      for (const format of schedule.formats) {
        const report = await this.generateReport({
          reportType: template?.reportType || ReportType.EXECUTIVE_SUMMARY,
          frameworks: schedule.frameworks,
          format,
          period: this.scheduleManager.calculateReportPeriod(schedule.frequency),
          templateId: schedule.templateId,
          generatedBy: 'scheduler',
        });

        await this.distributeReport(report, schedule.recipients);
      }
    });
  }

  private setupEventForwarding(): void {
    // Forward events from child managers
    const managers = [
      this.formatter,
      this.distributor,
      this.scheduleManager,
      this.templateManager,
      this.certificationManager,
      this.dashboardManager,
      this.reportComparator,
    ];

    for (const manager of managers) {
      if (manager instanceof EventEmitter) {
        const originalEmit = manager.emit.bind(manager);
        manager.emit = (event: string, ...args: unknown[]) => {
          this.emit(event, ...args);
          return originalEmit(event, ...args);
        };
      }
    }
  }
}

// Export singleton instance
export default ComplianceReportGenerator.getInstance();
