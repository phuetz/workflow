/**
 * Data Lineage & Observability Type Definitions
 * Comprehensive types for tracking data flow, transformations, and compliance
 */

import { WorkflowNode, WorkflowEdge } from './workflow';

/**
 * Unique identifier for lineage entities
 */
export type LineageId = string;
export type NodeId = string;
export type ExecutionId = string;
export type TransformationId = string;

/**
 * Data Source Types
 */
export enum DataSourceType {
  DATABASE = 'database',
  API = 'api',
  FILE = 'file',
  STREAM = 'stream',
  CACHE = 'cache',
  WEBHOOK = 'webhook',
  MANUAL = 'manual',
  COMPUTED = 'computed',
  EXTERNAL = 'external'
}

/**
 * Transformation operation types
 */
export enum TransformationType {
  MAP = 'map',
  FILTER = 'filter',
  REDUCE = 'reduce',
  AGGREGATE = 'aggregate',
  JOIN = 'join',
  SPLIT = 'split',
  MERGE = 'merge',
  ENRICH = 'enrich',
  VALIDATE = 'validate',
  SANITIZE = 'sanitize',
  ENCRYPT = 'encrypt',
  DECRYPT = 'decrypt',
  CUSTOM = 'custom'
}

/**
 * Compliance frameworks
 */
export enum ComplianceFramework {
  GDPR = 'gdpr',
  HIPAA = 'hipaa',
  PCI_DSS = 'pci-dss',
  SOC2 = 'soc2',
  ISO27001 = 'iso27001',
  CCPA = 'ccpa'
}

/**
 * Data sensitivity levels
 */
export enum DataSensitivity {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  PII = 'pii',
  PHI = 'phi',
  PCI = 'pci'
}

/**
 * Data Source metadata
 */
export interface DataSource {
  id: LineageId;
  type: DataSourceType;
  name: string;
  description?: string;
  location: string; // URI, path, or identifier
  schema?: Record<string, unknown>;
  metadata: {
    createdAt: string;
    updatedAt: string;
    owner?: string;
    tags?: string[];
    sensitivity?: DataSensitivity;
    retentionPolicy?: string;
    complianceFrameworks?: ComplianceFramework[];
  };
}

/**
 * Data Transformation record
 */
export interface DataTransformation {
  id: TransformationId;
  type: TransformationType;
  nodeId: NodeId;
  executionId: ExecutionId;
  timestamp: string;

  // Input/Output tracking
  inputs: DataLineageNode[];
  outputs: DataLineageNode[];

  // Transformation details
  operation: {
    name: string;
    description?: string;
    code?: string;
    expression?: string;
    parameters?: Record<string, unknown>;
  };

  // Performance metrics
  metrics: {
    duration: number;
    inputRecords: number;
    outputRecords: number;
    bytesProcessed: number;
    cpuTimeMs?: number;
    memoryUsageMB?: number;
  };

  // Quality metrics
  quality: {
    dataQualityScore?: number;
    validationErrors?: number;
    duplicatesRemoved?: number;
    nullsHandled?: number;
  };

  // Compliance tracking
  compliance: {
    frameworks: ComplianceFramework[];
    auditTrail: boolean;
    encryptionApplied: boolean;
    piiDetected: boolean;
    consentVerified?: boolean;
  };
}

/**
 * Data Lineage Node - represents a data point in the lineage graph
 */
export interface DataLineageNode {
  id: LineageId;
  nodeId: NodeId;
  executionId: ExecutionId;
  timestamp: string;

  // Data characteristics
  dataSource: DataSource;
  dataSnapshot?: {
    schema: Record<string, string>; // field -> type
    sampleData?: unknown[];
    recordCount: number;
    size: number; // bytes
    checksum?: string;
  };

  // Lineage relationships
  upstreamNodes: LineageId[];
  downstreamNodes: LineageId[];
  transformations: TransformationId[];

  // Metadata
  metadata: {
    nodeName: string;
    nodeType: string;
    workflowId: string;
    version?: string;
    tags?: string[];
  };
}

/**
 * Data Lineage Edge - represents data flow between nodes
 */
export interface DataLineageEdge {
  id: LineageId;
  sourceNodeId: LineageId;
  targetNodeId: LineageId;
  executionId: ExecutionId;
  timestamp: string;

  // Flow characteristics
  dataFlow: {
    recordsTransferred: number;
    bytesTransferred: number;
    duration: number;
    throughput: number; // records/sec
  };

  // Transformation applied
  transformation?: TransformationId;

  // Metadata
  metadata: {
    edgeLabel?: string;
    condition?: string;
    branchType?: 'default' | 'error' | 'conditional';
  };
}

/**
 * Complete Lineage Graph
 */
export interface LineageGraph {
  id: string;
  workflowId: string;
  executionId: ExecutionId;
  timestamp: string;

  // Graph structure
  nodes: Map<LineageId, DataLineageNode>;
  edges: Map<LineageId, DataLineageEdge>;
  transformations: Map<TransformationId, DataTransformation>;

  // Root sources and sinks
  sources: LineageId[]; // Entry points
  sinks: LineageId[]; // Exit points

  // Metadata
  metadata: {
    totalNodes: number;
    totalEdges: number;
    totalTransformations: number;
    depth: number; // Max depth of the graph
    complexity: number; // Complexity metric
  };
}

/**
 * Impact Analysis Result
 */
export interface ImpactAnalysisResult {
  targetNodeId: LineageId;
  impactType: 'upstream' | 'downstream' | 'bidirectional';
  timestamp: string;

  // Affected entities
  affectedNodes: {
    nodeId: LineageId;
    distance: number; // Hops from target
    impact: 'direct' | 'indirect';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }[];

  affectedDataSources: DataSource[];
  affectedTransformations: TransformationId[];

  // Risk assessment
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: string[];
    mitigationStrategies: string[];
    estimatedDowntime?: number;
    estimatedDataLoss?: number;
  };

  // Compliance impact
  complianceImpact: {
    affectedFrameworks: ComplianceFramework[];
    breachRisk: boolean;
    requiredActions: string[];
  };
}

/**
 * Data Provenance record
 */
export interface DataProvenance {
  dataId: LineageId;
  timestamp: string;

  // Origin tracking
  origin: {
    source: DataSource;
    originalTimestamp: string;
    creator?: string;
    purpose?: string;
  };

  // Complete transformation history
  transformationChain: TransformationId[];

  // All nodes that touched this data
  processingNodes: {
    nodeId: LineageId;
    timestamp: string;
    operation: string;
    changes?: string[];
  }[];

  // Audit trail
  auditTrail: {
    accessLog: {
      timestamp: string;
      actor: string;
      action: string;
      justification?: string;
    }[];
    modifications: {
      timestamp: string;
      field: string;
      oldValue?: unknown;
      newValue?: unknown;
      reason?: string;
    }[];
  };

  // Compliance
  compliance: {
    consentObtained: boolean;
    consentTimestamp?: string;
    retentionExpiry?: string;
    deletionScheduled?: boolean;
    frameworks: ComplianceFramework[];
  };
}

/**
 * OpenTelemetry Span for distributed tracing
 */
export interface OTelSpan {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  kind: 'INTERNAL' | 'SERVER' | 'CLIENT' | 'PRODUCER' | 'CONSUMER';

  // Timing
  startTime: string;
  endTime?: string;
  duration?: number;

  // Attributes
  attributes: Record<string, string | number | boolean>;

  // Events
  events: {
    timestamp: string;
    name: string;
    attributes?: Record<string, unknown>;
  }[];

  // Status
  status: {
    code: 'OK' | 'ERROR' | 'UNSET';
    message?: string;
  };

  // Links to other traces
  links?: {
    traceId: string;
    spanId: string;
    attributes?: Record<string, unknown>;
  }[];
}

/**
 * Distributed Trace
 */
export interface DistributedTrace {
  traceId: string;
  workflowId: string;
  executionId: ExecutionId;
  timestamp: string;

  // Spans in this trace
  spans: Map<string, OTelSpan>;

  // Trace metadata
  metadata: {
    serviceName: string;
    serviceVersion: string;
    environment: string;
    totalDuration: number;
    spanCount: number;
  };

  // Root span
  rootSpan: string;
}

/**
 * Compliance Audit Record
 */
export interface ComplianceAudit {
  id: string;
  timestamp: string;
  framework: ComplianceFramework;

  // Audit scope
  scope: {
    workflowId?: string;
    executionId?: ExecutionId;
    nodeIds?: NodeId[];
    dataSourceIds?: LineageId[];
  };

  // Findings
  findings: {
    compliant: boolean;
    violations: {
      severity: 'info' | 'warning' | 'error' | 'critical';
      rule: string;
      description: string;
      affectedEntities: string[];
      remediation: string;
    }[];
    warnings: string[];
    recommendations: string[];
  };

  // Evidence
  evidence: {
    auditTrails: string[];
    screenshots?: string[];
    logs?: string[];
    attestations?: string[];
  };

  // Auditor info
  auditor: {
    name: string;
    role: string;
    timestamp: string;
  };
}

/**
 * GDPR-specific types
 */
export interface GDPRDataSubjectRequest {
  id: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  timestamp: string;

  // Subject information
  subject: {
    id: string;
    email?: string;
    identifiers: Record<string, string>;
  };

  // Request details
  scope: {
    dataCategories?: string[];
    timePeriod?: { start: string; end: string };
    systems?: string[];
  };

  // Processing
  status: 'pending' | 'in-progress' | 'completed' | 'rejected';
  deadline: string;
  completedAt?: string;

  // Results
  results?: {
    dataFound: LineageId[];
    actionsPerformed: string[];
    evidence: string[];
  };
}

/**
 * HIPAA PHI tracking
 */
export interface HIPAAPHIRecord {
  id: string;
  timestamp: string;

  // PHI identification
  phiElements: {
    type: string; // Name, SSN, Medical Record Number, etc.
    field: string;
    encrypted: boolean;
    masked: boolean;
  }[];

  // Access control
  accessControl: {
    minimumRole: string;
    authorizedUsers: string[];
    auditRequired: boolean;
  };

  // Breach notification
  breachNotification: {
    enabled: boolean;
    recipients: string[];
    threshold: number;
  };
}

/**
 * PCI-DSS cardholder data
 */
export interface PCIDSSCardholderData {
  id: string;
  timestamp: string;

  // Cardholder data elements
  dataElements: {
    type: 'PAN' | 'CVV' | 'PIN' | 'Track';
    field: string;
    encrypted: boolean;
    tokenized: boolean;
    truncated: boolean;
  }[];

  // Storage compliance
  storage: {
    encrypted: boolean;
    encryptionMethod?: string;
    keyManagement: string;
    retentionDays: number;
  };

  // Transmission security
  transmission: {
    tlsRequired: boolean;
    tlsVersion?: string;
    certificateValidation: boolean;
  };
}

/**
 * Lineage Query Options
 */
export interface LineageQueryOptions {
  // Filters
  workflowId?: string;
  executionId?: ExecutionId;
  nodeIds?: NodeId[];
  timeRange?: { start: string; end: string };

  // Depth control
  maxDepth?: number;
  direction?: 'upstream' | 'downstream' | 'both';

  // Data filters
  dataSourceTypes?: DataSourceType[];
  transformationTypes?: TransformationType[];
  complianceFrameworks?: ComplianceFramework[];

  // Include options
  includeTransformations?: boolean;
  includeMetrics?: boolean;
  includeCompliance?: boolean;
  includeSnapshots?: boolean;

  // Pagination
  limit?: number;
  offset?: number;
}

/**
 * Lineage Statistics
 */
export interface LineageStatistics {
  timestamp: string;
  period: { start: string; end: string };

  // Volume metrics
  totalNodes: number;
  totalEdges: number;
  totalTransformations: number;
  totalDataSources: number;

  // Data volume
  totalRecordsProcessed: number;
  totalBytesProcessed: number;

  // Performance
  averageTransformationTime: number;
  averageThroughput: number;

  // Compliance
  complianceScore: number;
  violationCount: number;
  auditTrailCoverage: number;

  // Quality
  dataQualityScore: number;
  errorRate: number;

  // Top entities
  topDataSources: { id: string; usage: number }[];
  topTransformations: { id: string; usage: number }[];
  mostComplexWorkflows: { id: string; complexity: number }[];
}

/**
 * Lineage Visualization Options
 */
export interface LineageVisualizationOptions {
  layout: 'hierarchical' | 'force-directed' | 'dagre' | 'sankey' | 'circular';
  orientation: 'horizontal' | 'vertical';

  // Display options
  showMetrics: boolean;
  showTransformations: boolean;
  showCompliance: boolean;
  highlightCriticalPath: boolean;

  // Filtering
  collapseDepth?: number;
  hideNodeTypes?: string[];
  focusNodeId?: LineageId;

  // Styling
  colorBy?: 'status' | 'sensitivity' | 'compliance' | 'performance';
  nodeSize?: 'fixed' | 'by-volume' | 'by-complexity';

  // Interaction
  enableZoom: boolean;
  enablePan: boolean;
  enableSelection: boolean;
  enableTooltips: boolean;
}

/**
 * Export types
 */
export type LineageExportFormat = 'json' | 'csv' | 'graphml' | 'cypher' | 'sparql';

export interface LineageExport {
  format: LineageExportFormat;
  timestamp: string;
  graph: LineageGraph;
  metadata: Record<string, unknown>;
}
