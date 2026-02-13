import { EventEmitter } from 'events';

export interface ComplianceFramework {
  id: string;
  name: string;
  acronym: string;
  version: string;
  type: 'privacy' | 'security' | 'financial' | 'healthcare' | 'industry';
  jurisdiction: string[];
  description: string;
  requirements: ComplianceRequirement[];
  controls: ComplianceControl[];
  documentation: Array<{
    type: string;
    template: string;
    required: boolean;
  }>;
  certificationBody?: string;
  validityPeriod?: number; // months
  lastUpdated: Date;
  isActive: boolean;
}

export interface ComplianceRequirement {
  id: string;
  frameworkId: string;
  category: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: 'mandatory' | 'recommended' | 'optional';
  controls: string[]; // Control IDs
  evidence: Array<{
    type: 'document' | 'log' | 'configuration' | 'attestation';
    description: string;
    frequency?: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  }>;
  automationPossible: boolean;
  tags: string[];
}

export interface ComplianceControl {
  id: string;
  frameworkId: string;
  name: string;
  description: string;
  type: 'preventive' | 'detective' | 'corrective' | 'compensating';
  category: 'technical' | 'administrative' | 'physical';
  implementation: {
    status: 'not-started' | 'in-progress' | 'implemented' | 'verified';
    responsible: string;
    deadline?: Date;
    verifiedBy?: string;
    verifiedAt?: Date;
  };
  automation?: {
    enabled: boolean;
    script?: string;
    schedule?: string;
    lastRun?: Date;
    results?: unknown;
  };
  relatedRequirements: string[];
  testProcedures: string[];
}

export interface ComplianceAssessment {
  id: string;
  frameworkId: string;
  type: 'self-assessment' | 'internal-audit' | 'external-audit' | 'certification';
  status: 'planned' | 'in-progress' | 'completed' | 'failed';
  scope: {
    systems: string[];
    processes: string[];
    departments: string[];
    timeframe: { start: Date; end: Date };
  };
  findings: Array<{
    id: string;
    requirementId: string;
    status: 'compliant' | 'non-compliant' | 'partial' | 'not-applicable';
    evidence: Array<{
      type: string;
      location: string;
      collectedAt: Date;
      collectedBy: string;
    }>;
    gaps?: Array<{
      description: string;
      severity: 'critical' | 'major' | 'minor';
      remediation: string;
      deadline: Date;
    }>;
    notes?: string;
  }>;
  score: {
    overall: number;
    byCategory: { [category: string]: number };
  };
  auditor?: {
    name: string;
    organization: string;
    certification?: string;
  };
  report?: {
    generated: boolean;
    url?: string;
    signedBy?: string[];
  };
  createdAt: Date;
  completedAt?: Date;
}

export interface CompliancePolicy {
  id: string;
  name: string;
  type: 'privacy' | 'security' | 'acceptable-use' | 'data-retention' | 'incident-response' | 'custom';
  version: string;
  status: 'draft' | 'review' | 'approved' | 'active' | 'retired';
  content: {
    purpose: string;
    scope: string;
    policy: string;
    procedures: string[];
    responsibilities: Array<{
      role: string;
      duties: string[];
    }>;
  };
  metadata: {
    author: string;
    approvedBy?: string;
    effectiveDate?: Date;
    reviewDate?: Date;
    tags: string[];
  };
  relatedFrameworks: string[];
  attachments: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  acknowledgments: Array<{
    userId: string;
    acknowledgedAt: Date;
    version: string;
  }>;
}

export interface DataPrivacyRequest {
  id: string;
  type: 'access' | 'deletion' | 'portability' | 'rectification' | 'objection';
  subject: {
    id?: string;
    email: string;
    name: string;
    verified: boolean;
  };
  status: 'received' | 'verifying' | 'processing' | 'completed' | 'rejected';
  details: {
    description: string;
    dataCategories?: string[];
    justification?: string;
  };
  timeline: {
    receivedAt: Date;
    dueDate: Date;
    completedAt?: Date;
  };
  actions: Array<{
    type: string;
    timestamp: Date;
    performedBy: string;
    description: string;
    result?: unknown;
  }>;
  response?: {
    type: 'fulfilled' | 'partially-fulfilled' | 'rejected';
    reason?: string;
    data?: unknown;
    communicatedAt?: Date;
  };
}

export interface ComplianceEngineConfig {
  frameworks: ComplianceFramework[];
  automation: {
    enabled: boolean;
    scanInterval: number; // hours
    evidenceCollection: {
      sources: Array<{
        type: 'api' | 'database' | 'filesystem' | 'cloud';
        name: string;
        config: unknown;
      }>;
    };
  };
  notifications: {
    channels: Array<{
      type: 'email' | 'slack' | 'webhook';
      config: unknown;
    }>;
    triggers: {
      assessmentDue: number; // days before
      controlFailure: boolean;
      newRequirement: boolean;
      policyExpiry: number; // days before
    };
  };
  reporting: {
    templates: Array<{
      name: string;
      format: 'pdf' | 'html' | 'csv' | 'json';
      framework?: string;
    }>;
    storage: {
      provider: 'local' | 's3' | 'azure' | 'gcs';
      config: unknown;
      retention: number; // days
    };
  };
  integration: {
    siem?: {
      enabled: boolean;
      endpoint: string;
      apiKey: string;
    };
    ticketing?: {
      enabled: boolean;
      system: 'jira' | 'servicenow' | 'custom';
      config: unknown;
    };
  };
}

export class ComplianceEngine extends EventEmitter {
  private config: ComplianceEngineConfig;
  private frameworks: Map<string, ComplianceFramework> = new Map();
  private requirements: Map<string, ComplianceRequirement> = new Map();
  private controls: Map<string, ComplianceControl> = new Map();
  private assessments: Map<string, ComplianceAssessment> = new Map();
  private policies: Map<string, CompliancePolicy> = new Map();
  private privacyRequests: Map<string, DataPrivacyRequest> = new Map();
  private automationJobs: Map<string, unknown> = new Map();
  private isInitialized = false;

  constructor(config: ComplianceEngineConfig) {
    super();
    this.config = config;
  }

  public async initialize(): Promise<void> {
    try {
      // Load frameworks
      for (const framework of this.config.frameworks) {
        await this.loadFramework(framework);
      }

      // Initialize automation
      if (this.config.automation.enabled) {
        await this.initializeAutomation();
      }

      // Set up integrations
      await this.setupIntegrations();

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  public async loadFramework(framework: ComplianceFramework): Promise<void> {
    this.frameworks.set(framework.id, framework);
    
    // Load requirements
    for (const requirement of framework.requirements) {
      requirement.frameworkId = framework.id;
      this.requirements.set(requirement.id, requirement);
    }

    // Load controls
    for (const control of framework.controls) {
      control.frameworkId = framework.id;
      this.controls.set(control.id, control);
    }

    this.emit('frameworkLoaded', { framework });
  }

  public async createAssessment(
    frameworkId: string,
    type: ComplianceAssessment['type'],
    scope: ComplianceAssessment['scope']
  ): Promise<string> {
    const framework = this.frameworks.get(frameworkId);
    if (!framework) {
      throw new Error(`Framework not found: ${frameworkId}`);
    }

    const assessmentId = `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const assessment: ComplianceAssessment = {
      id: assessmentId,
      frameworkId,
      type,
      status: 'planned',
      scope,
      findings: [],
      score: {
        overall: 0,
        byCategory: {}
      },
      createdAt: new Date()
    };

    // Initialize findings for all requirements
    for (const requirement of framework.requirements) {
      assessment.findings.push({
        id: `finding_${requirement.id}`,
        requirementId: requirement.id,
        status: 'not-applicable',
        evidence: []
      });
    }

    this.assessments.set(assessmentId, assessment);
    this.emit('assessmentCreated', { assessment });
    
    return assessmentId;
  }

  public async startAssessment(assessmentId: string): Promise<void> {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    assessment.status = 'in-progress';
    
    // Start automated evidence collection
    if (this.config.automation.enabled) {
      await this.collectAutomatedEvidence(assessment);
    }

    this.emit('assessmentStarted', { assessmentId });
  }

  public async evaluateRequirement(
    assessmentId: string,
    requirementId: string,
    evaluation: {
      status: ComplianceAssessment['findings'][0]['status'];
      evidence?: ComplianceAssessment['findings'][0]['evidence'];
      gaps?: ComplianceAssessment['findings'][0]['gaps'];
      notes?: string;
    }
  ): Promise<void> {
    const assessment = this.assessments.get(assessmentId);
    if (!assessment) {
      throw new Error(`Assessment not found: ${assessmentId}`);
    }

    const finding = assessment.findings.find(f => f.requirementId === requirementId);
    if (!finding) {
      throw new Error(`Finding not found for requirement: ${requirementId}`);
    }

    // Update finding
    Object.assign(finding, evaluation);

    // Recalculate scores
    this.calculateAssessmentScore(assessment);

    this.emit('requirementEvaluated', { assessmentId, requirementId, evaluation });
  }

  public async implementControl(
    controlId: string,
    implementation: {
      responsible: string;
      deadline?: Date;
      automation?: ComplianceControl['automation'];
    }
  ): Promise<void> {
    const control = this.controls.get(controlId);
    if (!control) {
      throw new Error(`Control not found: ${controlId}`);
    }

    control.implementation = {
      status: 'in-progress',
      ...implementation
    };

    if (implementation.automation?.enabled) {
      control.automation = implementation.automation;
      await this.setupControlAutomation(control);
    }

    this.emit('controlImplemented', { control });
  }

  public async verifyControl(
    controlId: string,
    verifier: string,
    results: unknown
  ): Promise<void> {
    const control = this.controls.get(controlId);
    if (!control) {
      throw new Error(`Control not found: ${controlId}`);
    }

    control.implementation.status = 'verified';
    control.implementation.verifiedBy = verifier;
    control.implementation.verifiedAt = new Date();

    if (control.automation) {
      control.automation.results = results;
    }

    this.emit('controlVerified', { controlId, results });
  }

  public async createPolicy(
    policySpec: Omit<CompliancePolicy, 'id' | 'acknowledgments'>
  ): Promise<string> {
    const policyId = `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const policy: CompliancePolicy = {
      ...policySpec,
      id: policyId,
      acknowledgments: []
    };

    this.policies.set(policyId, policy);
    this.emit('policyCreated', { policy });
    
    return policyId;
  }

  public async approvePolicy(
    policyId: string,
    approver: string
  ): Promise<void> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    policy.status = 'approved';
    policy.metadata.approvedBy = approver;
    policy.metadata.effectiveDate = new Date();
    
    // Schedule review
    if (!policy.metadata.reviewDate) {
      const reviewDate = new Date();
      reviewDate.setFullYear(reviewDate.getFullYear() + 1);
      policy.metadata.reviewDate = reviewDate;
    }

    this.emit('policyApproved', { policyId, approver });
  }

  public async acknowledgePolicy(
    policyId: string,
    userId: string
  ): Promise<void> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    if (policy.status !== 'active') {
      throw new Error('Policy is not active');
    }

    const acknowledgment = {
      userId,
      acknowledgedAt: new Date(),
      version: policy.version
    };

    policy.acknowledgments.push(acknowledgment);
    
    this.emit('policyAcknowledged', { policyId, userId });
  }

  public async createPrivacyRequest(
    requestSpec: Omit<DataPrivacyRequest, 'id' | 'status' | 'timeline' | 'actions'>
  ): Promise<string> {
    const requestId = `privacy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + this.getPrivacyRequestDeadline(requestSpec.type));
    
    const request: DataPrivacyRequest = {
      ...requestSpec,
      id: requestId,
      status: 'received',
      timeline: {
        receivedAt: new Date(),
        dueDate
      },
      actions: [{
        type: 'received',
        timestamp: new Date(),
        performedBy: 'system',
        description: 'Privacy request received'
      }]
    };

    this.privacyRequests.set(requestId, request);
    
    // Send notification
    await this.notifyPrivacyRequest(request);
    
    this.emit('privacyRequestCreated', { request });
    return requestId;
  }

  public async processPrivacyRequest(
    requestId: string,
    action: {
      type: string;
      performedBy: string;
      description: string;
      result?: unknown;
    }
  ): Promise<void> {
    const request = this.privacyRequests.get(requestId);
    if (!request) {
      throw new Error(`Privacy request not found: ${requestId}`);
    }

    request.actions.push({
      ...action,
      timestamp: new Date()
    });

    // Update status based on action
    if (action.type === 'verify') {
      request.status = 'verifying';
    } else if (action.type === 'process') {
      request.status = 'processing';
    } else if (action.type === 'complete') {
      request.status = 'completed';
      request.timeline.completedAt = new Date();
    }

    this.emit('privacyRequestProcessed', { requestId, action });
  }

  public async generateComplianceReport(
    frameworkId: string,
    options: {
      format?: 'pdf' | 'html' | 'csv' | 'json';
      includeEvidence?: boolean;
      assessmentId?: string;
      dateRange?: { start: Date; end: Date };
    } = {}
  ): Promise<{
    reportId: string;
    url: string;
    metadata: unknown;
  }> {
    const framework = this.frameworks.get(frameworkId);
    if (!framework) {
      throw new Error(`Framework not found: ${frameworkId}`);
    }

    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Gather report data
    const reportData = await this.gatherReportData(framework, options);
    
    // Generate report
    const report = await this.renderReport(reportData, options.format || 'pdf');
    
    // Store report
    const url = await this.storeReport(report, reportId);
    
    const result = {
      reportId,
      url,
      metadata: {
        framework: framework.name,
        generatedAt: new Date(),
        coverage: reportData.coverage,
        score: reportData.score
      }
    };

    this.emit('reportGenerated', result);
    return result;
  }

  public async runComplianceScan(
    scope?: {
      frameworks?: string[];
      systems?: string[];
      automated?: boolean;
    }
  ): Promise<{
    scanId: string;
    findings: Array<{
      frameworkId: string;
      requirementId: string;
      status: string;
      evidence: unknown[];
      timestamp: Date;
    }>;
  }> {
    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const findings: unknown[] = [];

    const frameworksToScan = scope?.frameworks ? 
      scope.frameworks.map(id => this.frameworks.get(id)).filter(Boolean) :
      Array.from(this.frameworks.values());

    for (const framework of frameworksToScan) {
      if (!framework) continue;
      
      // Run automated checks
      if (scope?.automated !== false && this.config.automation.enabled) {
        const automatedFindings = await this.runAutomatedChecks(framework);
        findings.push(...automatedFindings);
      }
    }

    this.emit('complianceScanCompleted', { scanId, findings });
    return { scanId, findings };
  }

  public async scheduleAssessment(
    frameworkId: string,
    schedule: {
      frequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
      startDate: Date;
      type: ComplianceAssessment['type'];
      scope: ComplianceAssessment['scope'];
    }
  ): Promise<string> {
    const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create automation job
    const job = {
      id: scheduleId,
      frameworkId,
      schedule,
      nextRun: this.calculateNextRun(schedule.startDate, schedule.frequency),
      active: true
    };

    this.automationJobs.set(scheduleId, job);
    
    this.emit('assessmentScheduled', { scheduleId, job });
    return scheduleId;
  }

  public getFramework(id: string): ComplianceFramework | undefined {
    return this.frameworks.get(id);
  }

  public getFrameworks(): ComplianceFramework[] {
    return Array.from(this.frameworks.values());
  }

  public getAssessment(id: string): ComplianceAssessment | undefined {
    return this.assessments.get(id);
  }

  public getAssessments(frameworkId?: string): ComplianceAssessment[] {
    let assessments = Array.from(this.assessments.values());
    
    if (frameworkId) {
      assessments = assessments.filter(a => a.frameworkId === frameworkId);
    }
    
    return assessments;
  }

  public getPolicies(status?: CompliancePolicy['status']): CompliancePolicy[] {
    let policies = Array.from(this.policies.values());
    
    if (status) {
      policies = policies.filter(p => p.status === status);
    }
    
    return policies;
  }

  public getPrivacyRequests(status?: DataPrivacyRequest['status']): DataPrivacyRequest[] {
    let requests = Array.from(this.privacyRequests.values());
    
    if (status) {
      requests = requests.filter(r => r.status === status);
    }
    
    return requests;
  }

  public async shutdown(): Promise<void> {
    // Stop automation jobs
    for (const job of this.automationJobs.values()) {
      job.active = false;
    }

    this.isInitialized = false;
    this.emit('shutdown');
  }

  private async initializeAutomation(): Promise<void> {
    // Start automation scheduler
    setInterval(() => {
      this.runScheduledJobs();
    }, 3600000); // Check every hour

    // Start compliance monitoring
    setInterval(() => {
      this.runComplianceScan({ automated: true });
    }, this.config.automation.scanInterval * 3600000);
  }

  private async setupIntegrations(): Promise<void> {
    // Set up SIEM integration
    if (this.config.integration.siem?.enabled) {
      // Initialize SIEM connection
    }

    // Set up ticketing integration
    if (this.config.integration.ticketing?.enabled) {
      // Initialize ticketing system connection
    }
  }

  private async collectAutomatedEvidence(assessment: ComplianceAssessment): Promise<void> {
    const framework = this.frameworks.get(assessment.frameworkId);
    if (!framework) return;

    for (const finding of assessment.findings) {
      const requirement = this.requirements.get(finding.requirementId);
      if (!requirement || !requirement.automationPossible) continue;

      // Collect evidence from configured sources
      for (const source of this.config.automation.evidenceCollection.sources) {
        const evidence = await this.collectEvidenceFromSource(source, requirement);
        if (evidence) {
          finding.evidence.push(...evidence);
        }
      }
    }
  }

  private async collectEvidenceFromSource(source: unknown, requirement: ComplianceRequirement): Promise<unknown[]> {
    // Mock evidence collection
    return [{
      type: 'log',
      location: `${source.name}/logs/${requirement.id}`,
      collectedAt: new Date(),
      collectedBy: 'automation'
    }];
  }

  private calculateAssessmentScore(assessment: ComplianceAssessment): void {
    const framework = this.frameworks.get(assessment.frameworkId);
    if (!framework) return;

    let totalScore = 0;
    let totalWeight = 0;
    const categoryScores: { [key: string]: { score: number; weight: number } } = {};

    for (const finding of assessment.findings) {
      const requirement = this.requirements.get(finding.requirementId);
      if (!requirement) continue;

      const weight = this.getRequirementWeight(requirement);
      const score = this.getStatusScore(finding.status);

      totalScore += score * weight;
      totalWeight += weight;

      // Update category score
      if (!categoryScores[requirement.category]) {
        categoryScores[requirement.category] = { score: 0, weight: 0 };
      }
      categoryScores[requirement.category].score += score * weight;
      categoryScores[requirement.category].weight += weight;
    }

    // Calculate overall score
    assessment.score.overall = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;

    // Calculate category scores
    for (const [category, data] of Object.entries(categoryScores)) {
      assessment.score.byCategory[category] = data.weight > 0 ? 
        (data.score / data.weight) * 100 : 0;
    }
  }

  private getRequirementWeight(requirement: ComplianceRequirement): number {
    const weights = {
      critical: 10,
      high: 7,
      medium: 4,
      low: 1
    };
    return weights[requirement.priority];
  }

  private getStatusScore(status: string): number {
    const scores: { [key: string]: number } = {
      compliant: 1,
      partial: 0.5,
      'non-compliant': 0,
      'not-applicable': 1
    };
    return scores[status] || 0;
  }

  private async setupControlAutomation(control: ComplianceControl): Promise<void> {
    if (!control.automation?.enabled || !control.automation.script) return;

    // Schedule automated control execution
    const jobId = `control_${control.id}`;
    const job = {
      id: jobId,
      controlId: control.id,
      schedule: control.automation.schedule,
      script: control.automation.script,
      active: true
    };

    this.automationJobs.set(jobId, job);
  }

  private getPrivacyRequestDeadline(type: string): number {
    // Days to complete based on GDPR/CCPA
    const deadlines: { [key: string]: number } = {
      access: 30,
      deletion: 30,
      portability: 30,
      rectification: 30,
      objection: 21
    };
    return deadlines[type] || 30;
  }

  private async notifyPrivacyRequest(_request: DataPrivacyRequest): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Send notifications through configured channels
    for (const channel of this.config.notifications.channels) {
      if (channel.type === 'email') {
        // Send email notification
      } else if (channel.type === 'slack') {
        // Send Slack notification
      }
    }
  }

  private async gatherReportData(framework: ComplianceFramework, _options: unknown): Promise<unknown> { // eslint-disable-line @typescript-eslint/no-unused-vars
    const assessments = this.getAssessments(framework.id);
    const controls = Array.from(this.controls.values()).filter(c => c.frameworkId === framework.id);
    
    // Calculate compliance metrics
    const implementedControls = controls.filter(c => 
      c.implementation.status === 'implemented' || c.implementation.status === 'verified'
    );
    
    const coverage = controls.length > 0 ? 
      (implementedControls.length / controls.length) * 100 : 0;

    // Get latest assessment score
    const latestAssessment = assessments
      .filter(a => a.status === 'completed')
      .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())[0];

    return {
      framework,
      assessments,
      controls,
      coverage,
      score: latestAssessment?.score.overall || 0,
      findings: latestAssessment?.findings || []
    };
  }

  private async renderReport(data: unknown, _format: string): Promise<Buffer> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Mock report rendering
    const content = JSON.stringify(data, null, 2);
    return Buffer.from(content);
  }

  private async storeReport(report: Buffer, reportId: string): Promise<string> {
    // Mock report storage
    return `https://compliance-reports.example.com/${reportId}`;
  }

  private async runAutomatedChecks(framework: ComplianceFramework): Promise<unknown[]> {
    const findings = [];
    
    for (const requirement of framework.requirements) {
      if (!requirement.automationPossible) continue;
      
      // Run automated check
      const evidence = await this.collectAutomatedEvidence({
        findings: [{ requirementId: requirement.id }]
      } as { findings: Array<{ requirementId: string }> });
      
      findings.push({
        frameworkId: framework.id,
        requirementId: requirement.id,
        status: evidence.length > 0 ? 'compliant' : 'non-compliant',
        evidence,
        timestamp: new Date()
      });
    }
    
    return findings;
  }

  private calculateNextRun(startDate: Date, frequency: string): Date {
    const next = new Date(startDate);
    
    switch (frequency) {
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'semi-annual':
        next.setMonth(next.getMonth() + 6);
        break;
      case 'annual':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    
    return next;
  }

  private async runScheduledJobs(): Promise<void> {
    const now = new Date();
    
    for (const job of this.automationJobs.values()) {
      if (!job.active || !job.nextRun || job.nextRun > now) continue;
      
      try {
        if (job.frameworkId) {
          // Create scheduled assessment
          const assessmentId = await this.createAssessment(
            job.frameworkId,
            job.schedule.type,
            job.schedule.scope
          );
          await this.startAssessment(assessmentId);
          
          // Update next run
          job.nextRun = this.calculateNextRun(job.nextRun, job.schedule.frequency);
        } else if (job.controlId) {
          // Run control automation
          const control = this.controls.get(job.controlId);
          if (control?.automation) {
            // Execute automation script
            control.automation.lastRun = new Date();
          }
        }
      } catch (error) {
        this.emit('error', { type: 'automation', job, error });
      }
    }
  }
}