import { EventEmitter } from 'events';
import { ComplianceFramework, ComplianceRequirement, ComplianceControl } from '../core/ComplianceEngine';

export interface GDPRDataMapping {
  id: string;
  dataCategory: 'personal' | 'sensitive' | 'criminal' | 'biometric' | 'health' | 'genetic';
  dataType: string;
  description: string;
  sources: Array<{
    system: string;
    database?: string;
    table?: string;
    fields?: string[];
  }>;
  processing: Array<{
    purpose: string;
    legalBasis: 'consent' | 'contract' | 'legal-obligation' | 'vital-interests' | 'public-task' | 'legitimate-interests';
    retention: {
      period: number;
      unit: 'days' | 'months' | 'years';
      justification: string;
    };
    recipients: Array<{
      name: string;
      type: 'internal' | 'processor' | 'third-party' | 'international';
      country?: string;
      safeguards?: string;
    }>;
  }>;
  subjects: {
    categories: string[];
    volume?: number;
    specialCategories?: string[];
  };
  security: {
    encryption: boolean;
    pseudonymization: boolean;
    accessControls: string[];
    backups: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface GDPRProcessingActivity {
  id: string;
  name: string;
  description: string;
  controller: {
    name: string;
    contact: string;
    representative?: string;
  };
  dpo?: {
    name: string;
    contact: string;
  };
  jointControllers?: Array<{
    name: string;
    responsibilities: string;
  }>;
  purposes: string[];
  dataCategories: string[];
  dataSubjects: string[];
  recipients: Array<{
    name: string;
    category: string;
    location: string;
  }>;
  transfers: Array<{
    country: string;
    mechanism: 'adequacy' | 'sccs' | 'bcrs' | 'derogation';
    details: string;
  }>;
  retention: Array<{
    dataCategory: string;
    period: string;
    criteria: string;
  }>;
  security: {
    technical: string[];
    organizational: string[];
  };
  dpia?: {
    required: boolean;
    conducted: boolean;
    lastUpdated?: Date;
    outcome?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface GDPRConsent {
  id: string;
  subjectId: string;
  purposes: Array<{
    id: string;
    name: string;
    description: string;
    granted: boolean;
    timestamp: Date;
  }>;
  method: 'explicit' | 'implicit';
  withdrawable: boolean;
  version: string;
  language: string;
  collectedAt: Date;
  expiresAt?: Date;
  withdrawn?: {
    timestamp: Date;
    reason?: string;
  };
}

export interface GDPRBreach {
  id: string;
  detectedAt: Date;
  reportedAt?: Date;
  type: 'confidentiality' | 'integrity' | 'availability';
  severity: 'low' | 'medium' | 'high';
  description: string;
  dataCategories: string[];
  affectedSubjects: {
    count: number;
    categories: string[];
    identified: boolean;
  };
  consequences: {
    likely: string[];
    severity: 'low' | 'medium' | 'high';
  };
  measures: {
    taken: string[];
    proposed: string[];
  };
  notification: {
    authority: {
      required: boolean;
      completed: boolean;
      reference?: string;
    };
    subjects: {
      required: boolean;
      completed: boolean;
      method?: string;
      count?: number;
    };
  };
  investigation: {
    status: 'open' | 'ongoing' | 'closed';
    findings?: string;
    rootCause?: string;
  };
}

export interface GDPRDPIA {
  id: string;
  processingActivity: string;
  status: 'draft' | 'in-progress' | 'review' | 'approved' | 'rejected';
  necessity: {
    purpose: string;
    proportionality: string;
    assessment: string;
  };
  risks: Array<{
    id: string;
    description: string;
    likelihood: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    category: string;
    mitigations: Array<{
      measure: string;
      effectiveness: 'low' | 'medium' | 'high';
      implemented: boolean;
    }>;
  }>;
  consultation: {
    stakeholders: string[];
    dpoOpinion?: string;
    subjectViews?: string;
  };
  supervisoryAuthority: {
    consultationRequired: boolean;
    consulted: boolean;
    response?: string;
  };
  approval: {
    approvedBy?: string;
    approvedAt?: Date;
    conditions?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export class GDPRCompliance extends EventEmitter {
  private dataMappings: Map<string, GDPRDataMapping> = new Map();
  private processingActivities: Map<string, GDPRProcessingActivity> = new Map();
  private consents: Map<string, GDPRConsent> = new Map();
  private breaches: Map<string, GDPRBreach> = new Map();
  private dpias: Map<string, GDPRDPIA> = new Map();
  private framework: ComplianceFramework;

  constructor() {
    super();
    this.framework = this.createGDPRFramework();
  }

  public getFramework(): ComplianceFramework {
    return this.framework;
  }

  public async createDataMapping(
    mappingSpec: Omit<GDPRDataMapping, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const id = `mapping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const mapping: GDPRDataMapping = {
      ...mappingSpec,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.dataMappings.set(id, mapping);
    this.emit('dataMappingCreated', { mapping });
    
    return id;
  }

  public async recordProcessingActivity(
    activitySpec: Omit<GDPRProcessingActivity, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const id = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const activity: GDPRProcessingActivity = {
      ...activitySpec,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.processingActivities.set(id, activity);
    this.emit('processingActivityRecorded', { activity });
    
    return id;
  }

  public async recordConsent(
    consentSpec: Omit<GDPRConsent, 'id' | 'collectedAt'>
  ): Promise<string> {
    const id = `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const consent: GDPRConsent = {
      ...consentSpec,
      id,
      collectedAt: new Date()
    };

    this.consents.set(id, consent);
    this.emit('consentRecorded', { consent });
    
    return id;
  }

  public async withdrawConsent(
    consentId: string,
    reason?: string
  ): Promise<void> {
    const consent = this.consents.get(consentId);
    if (!consent) {
      throw new Error(`Consent not found: ${consentId}`);
    }

    consent.withdrawn = {
      timestamp: new Date(),
      reason
    };

    this.emit('consentWithdrawn', { consentId, reason });
  }

  public async reportBreach(
    breachSpec: Omit<GDPRBreach, 'id'>
  ): Promise<string> {
    const id = `breach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const breach: GDPRBreach = {
      ...breachSpec,
      id
    };

    this.breaches.set(id, breach);
    
    // Check notification requirements
    const notificationDeadline = new Date(breach.detectedAt);
    notificationDeadline.setHours(notificationDeadline.getHours() + 72);
    
    if (this.requiresAuthorityNotification(breach)) {
      breach.notification.authority.required = true;
      this.emit('breachNotificationRequired', { 
        breach, 
        deadline: notificationDeadline,
        type: 'authority' 
      });
    }

    if (this.requiresSubjectNotification(breach)) {
      breach.notification.subjects.required = true;
      this.emit('breachNotificationRequired', { 
        breach,
        type: 'subjects' 
      });
    }

    this.emit('breachReported', { breach });
    return id;
  }

  public async createDPIA(
    dpiaSpec: Omit<GDPRDPIA, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): Promise<string> {
    const id = `dpia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const dpia: GDPRDPIA = {
      ...dpiaSpec,
      id,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.dpias.set(id, dpia);
    this.emit('dpiaCreated', { dpia });
    
    return id;
  }

  public async assessRisk(
    dpiaId: string,
    risk: GDPRDPIA['risks'][0]
  ): Promise<void> {
    const dpia = this.dpias.get(dpiaId);
    if (!dpia) {
      throw new Error(`DPIA not found: ${dpiaId}`);
    }

    dpia.risks.push(risk);
    dpia.updatedAt = new Date();
    
    // Calculate overall risk level
    const overallRisk = this.calculateOverallRisk(dpia.risks);
    
    // Check if supervisory authority consultation is required
    if (overallRisk === 'high' && !dpia.supervisoryAuthority.consultationRequired) {
      dpia.supervisoryAuthority.consultationRequired = true;
      this.emit('dpiaHighRisk', { dpiaId, requiresConsultation: true });
    }

    this.emit('riskAssessed', { dpiaId, risk });
  }

  public async generateArticle30Record(): Promise<{
    controller: {
      name: string;
      contact: string;
      representative?: string;
    };
    processingActivities: GDPRProcessingActivity[];
    lastUpdated: Date;
  }> {
    const record = {
      controller: {
        name: 'Organization Name',
        contact: 'privacy@example.com',
        dpo: {
          name: 'DPO Name',
          contact: 'dpo@example.com'
        }
      },
      processingActivities: Array.from(this.processingActivities.values()),
      lastUpdated: new Date()
    };

    this.emit('article30Generated', { record });
    return record;
  }

  public async checkLawfulBasis(
    purpose: string,
    dataCategory: string
  ): Promise<{
    valid: boolean;
    basis?: string;
    requirements?: string[];
  }> {
    // Check if we have valid lawful basis for processing
    const activities = Array.from(this.processingActivities.values());
    
    for (const activity of activities) {
      if (activity.purposes.includes(purpose) && 
          activity.dataCategories.includes(dataCategory)) {
        
        const processing = Array.from(this.dataMappings.values())
          .find(m => m.dataCategory === dataCategory)
          ?.processing.find(p => p.purpose === purpose);
        
        if (processing) {
          return {
            valid: true,
            basis: processing.legalBasis,
            requirements: this.getLegalBasisRequirements(processing.legalBasis)
          };
        }
      }
    }

    return { valid: false };
  }

  public async getRetentionSchedule(): Promise<Array<{
    dataCategory: string;
    retention: string;
    deletionDate?: Date;
  }>> {
    const schedule: Array<{
      dataCategory: string;
      retention: string;
      deletionDate?: Date;
    }> = [];
    
    for (const mapping of this.dataMappings.values()) {
      for (const processing of mapping.processing) {
        schedule.push({
          dataCategory: mapping.dataType,
          retention: `${processing.retention.period} ${processing.retention.unit}`,
          deletionDate: this.calculateDeletionDate(
            mapping.createdAt,
            processing.retention.period,
            processing.retention.unit
          )
        });
      }
    }

    return schedule;
  }

  public getDataMappings(): GDPRDataMapping[] {
    return Array.from(this.dataMappings.values());
  }

  public getProcessingActivities(): GDPRProcessingActivity[] {
    return Array.from(this.processingActivities.values());
  }

  public getBreaches(status?: string): GDPRBreach[] {
    let breaches = Array.from(this.breaches.values());
    
    if (status) {
      breaches = breaches.filter(b => b.investigation.status === status);
    }
    
    return breaches;
  }

  public getDPIAs(status?: GDPRDPIA['status']): GDPRDPIA[] {
    let dpias = Array.from(this.dpias.values());
    
    if (status) {
      dpias = dpias.filter(d => d.status === status);
    }
    
    return dpias;
  }

  private createGDPRFramework(): ComplianceFramework {
    return {
      id: 'gdpr',
      name: 'General Data Protection Regulation',
      acronym: 'GDPR',
      version: '2016/679',
      type: 'privacy',
      jurisdiction: ['EU', 'EEA'],
      description: 'EU regulation on data protection and privacy',
      requirements: this.createGDPRRequirements(),
      controls: this.createGDPRControls(),
      documentation: [
        { type: 'privacy-policy', template: 'gdpr-privacy-policy', required: true },
        { type: 'cookie-policy', template: 'gdpr-cookie-policy', required: true },
        { type: 'dpia-template', template: 'gdpr-dpia', required: false },
        { type: 'breach-register', template: 'gdpr-breach-register', required: true },
        { type: 'ropa', template: 'gdpr-article-30', required: true }
      ],
      certificationBody: 'European Data Protection Board',
      lastUpdated: new Date('2018-05-25'),
      isActive: true
    };
  }

  private createGDPRRequirements(): ComplianceRequirement[] {
    return [
      {
        id: 'gdpr-req-1',
        frameworkId: 'gdpr',
        category: 'Lawfulness of Processing',
        title: 'Lawful Basis',
        description: 'Processing must have a lawful basis under Article 6',
        priority: 'critical',
        type: 'mandatory',
        controls: ['gdpr-ctrl-1', 'gdpr-ctrl-2'],
        evidence: [
          { type: 'document', description: 'Lawful basis assessment' },
          { type: 'document', description: 'Processing records' }
        ],
        automationPossible: false,
        tags: ['article-6', 'lawful-basis']
      },
      {
        id: 'gdpr-req-2',
        frameworkId: 'gdpr',
        category: 'Data Subject Rights',
        title: 'Right of Access',
        description: 'Provide data subjects access to their personal data',
        priority: 'critical',
        type: 'mandatory',
        controls: ['gdpr-ctrl-3', 'gdpr-ctrl-4'],
        evidence: [
          { type: 'log', description: 'Access request logs', frequency: 'continuous' },
          { type: 'document', description: 'Access request procedures' }
        ],
        automationPossible: true,
        tags: ['article-15', 'subject-rights']
      },
      {
        id: 'gdpr-req-3',
        frameworkId: 'gdpr',
        category: 'Security',
        title: 'Security of Processing',
        description: 'Implement appropriate technical and organizational measures',
        priority: 'critical',
        type: 'mandatory',
        controls: ['gdpr-ctrl-5', 'gdpr-ctrl-6', 'gdpr-ctrl-7'],
        evidence: [
          { type: 'configuration', description: 'Security configurations', frequency: 'monthly' },
          { type: 'document', description: 'Security policies' }
        ],
        automationPossible: true,
        tags: ['article-32', 'security']
      }
    ];
  }

  private createGDPRControls(): ComplianceControl[] {
    return [
      {
        id: 'gdpr-ctrl-1',
        frameworkId: 'gdpr',
        name: 'Consent Management',
        description: 'Implement consent collection and management system',
        type: 'preventive',
        category: 'technical',
        implementation: {
          status: 'not-started',
          responsible: ''
        },
        relatedRequirements: ['gdpr-req-1'],
        testProcedures: ['Verify consent collection UI', 'Test consent withdrawal']
      },
      {
        id: 'gdpr-ctrl-2',
        frameworkId: 'gdpr',
        name: 'Processing Records',
        description: 'Maintain records of processing activities',
        type: 'detective',
        category: 'administrative',
        implementation: {
          status: 'not-started',
          responsible: ''
        },
        relatedRequirements: ['gdpr-req-1'],
        testProcedures: ['Review processing records', 'Verify completeness']
      },
      {
        id: 'gdpr-ctrl-3',
        frameworkId: 'gdpr',
        name: 'Subject Access Portal',
        description: 'Provide automated data subject access portal',
        type: 'preventive',
        category: 'technical',
        implementation: {
          status: 'not-started',
          responsible: ''
        },
        automation: {
          enabled: true,
          script: 'checkAccessRequests',
          schedule: '0 */6 * * *' // Every 6 hours
        },
        relatedRequirements: ['gdpr-req-2'],
        testProcedures: ['Test access request submission', 'Verify data export']
      }
    ];
  }

  private requiresAuthorityNotification(breach: GDPRBreach): boolean {
    // GDPR requires notification unless unlikely to result in risk
    return breach.severity !== 'low' || 
           breach.type === 'confidentiality' ||
           breach.affectedSubjects.count > 0;
  }

  private requiresSubjectNotification(breach: GDPRBreach): boolean {
    // Required if high risk to rights and freedoms
    return breach.severity === 'high' && 
           breach.consequences.severity === 'high' &&
           breach.affectedSubjects.identified;
  }

  private calculateOverallRisk(risks: GDPRDPIA['risks']): 'low' | 'medium' | 'high' {
    if (risks.length === 0) return 'low';
    
    const hasHighRisk = risks.some(r => 
      r.likelihood === 'high' && r.impact === 'high' &&
      !r.mitigations.some(m => m.effectiveness === 'high' && m.implemented)
    );
    
    if (hasHighRisk) return 'high';
    
    const hasMediumRisk = risks.some(r => 
      (r.likelihood === 'medium' || r.impact === 'medium') &&
      !r.mitigations.some(m => m.implemented)
    );
    
    return hasMediumRisk ? 'medium' : 'low';
  }

  private getLegalBasisRequirements(basis: string): string[] {
    const requirements: { [key: string]: string[] } = {
      consent: [
        'Freely given, specific, informed and unambiguous',
        'Clear affirmative action',
        'Withdrawable at any time',
        'Separate consent for different purposes'
      ],
      contract: [
        'Processing necessary for contract performance',
        'Processing necessary for pre-contractual steps'
      ],
      'legal-obligation': [
        'Clear legal obligation exists',
        'Processing necessary for compliance'
      ],
      'legitimate-interests': [
        'Legitimate interests assessment completed',
        'Balancing test performed',
        'Privacy notice updated'
      ]
    };
    
    return requirements[basis] || [];
  }

  private calculateDeletionDate(
    startDate: Date,
    period: number,
    unit: string
  ): Date {
    const date = new Date(startDate);
    
    switch (unit) {
      case 'days':
        date.setDate(date.getDate() + period);
        break;
      case 'months':
        date.setMonth(date.getMonth() + period);
        break;
      case 'years':
        date.setFullYear(date.getFullYear() + period);
        break;
    }
    
    return date;
  }
}