/**
 * Advanced Testing Types
 * Comprehensive type definitions for contract, performance, load, and security testing
 */

// ==================== Contract Testing Types ====================

export interface ContractTest {
  id: string;
  name: string;
  description?: string;
  provider: ProviderContract;
  consumer: ConsumerContract;
  status: 'pending' | 'running' | 'passed' | 'failed';
  createdAt: number;
  updatedAt: number;
}

export interface ProviderContract {
  name: string;
  version: string;
  baseUrl: string;
  endpoints: ContractEndpoint[];
  metadata?: Record<string, any>;
}

export interface ConsumerContract {
  name: string;
  version: string;
  expectations: ContractExpectation[];
  metadata?: Record<string, any>;
}

export interface ContractEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  description?: string;
  requestSchema?: JSONSchema;
  responseSchema: JSONSchema;
  statusCode: number;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  examples: ContractExample[];
}

export interface ContractExpectation {
  endpoint: string;
  method: string;
  request?: any;
  expectedResponse: any;
  expectedStatusCode: number;
  description?: string;
}

export interface ContractExample {
  description?: string;
  request?: {
    headers?: Record<string, string>;
    body?: any;
    queryParams?: Record<string, string>;
  };
  response: {
    statusCode: number;
    headers?: Record<string, string>;
    body: any;
  };
}

export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'integer';
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  enum?: any[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  additionalProperties?: boolean | JSONSchema;
  description?: string;
  default?: any;
  examples?: any[];
}

export interface ContractVerificationResult {
  passed: boolean;
  contractId: string;
  timestamp: number;
  duration: number;
  results: EndpointVerificationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  breakingChanges: BreakingChange[];
}

export interface EndpointVerificationResult {
  endpoint: string;
  method: string;
  passed: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  duration: number;
}

export interface ValidationError {
  path: string;
  message: string;
  expected: any;
  actual: any;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  path: string;
  message: string;
  expected?: any;
  actual?: any;
}

export interface BreakingChange {
  type: 'removed_endpoint' | 'changed_response_schema' | 'changed_status_code' | 'removed_required_field' | 'changed_field_type';
  endpoint?: string;
  path: string;
  oldValue: any;
  newValue: any;
  severity: 'breaking' | 'non-breaking';
  message: string;
}

export interface PactFile {
  consumer: {
    name: string;
  };
  provider: {
    name: string;
  };
  interactions: PactInteraction[];
  metadata: {
    pactSpecification: {
      version: string;
    };
    generatedAt: string;
  };
}

export interface PactInteraction {
  description: string;
  providerState?: string;
  request: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: any;
    query?: Record<string, string>;
  };
  response: {
    status: number;
    headers?: Record<string, string>;
    body?: any;
  };
}

// ==================== Performance Testing Types ====================

export interface PerformanceTest {
  id: string;
  name: string;
  description?: string;
  load: LoadProfile;
  scenarios: PerformanceScenario[];
  criteria: SuccessCriteria;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
}

export interface LoadProfile {
  users: number;              // Concurrent virtual users
  rampUp: number;            // Ramp-up time in seconds
  duration: number;          // Test duration in seconds
  thinkTime: number;         // Think time between requests in ms
  stages?: LoadStage[];      // Multi-stage load profile
}

export interface LoadStage {
  duration: number;          // Stage duration in seconds
  target: number;            // Target number of users
  description?: string;
}

export interface PerformanceScenario {
  name: string;
  description?: string;
  weight: number;            // Percentage of users executing this scenario
  steps: ScenarioStep[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface ScenarioStep {
  name: string;
  action: 'http' | 'graphql' | 'websocket' | 'custom';
  config: HttpStepConfig | GraphQLStepConfig | WebSocketStepConfig | CustomStepConfig;
  assertions?: StepAssertion[];
  thinkTime?: number;        // Override default think time
}

export interface HttpStepConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  queryParams?: Record<string, string>;
}

export interface GraphQLStepConfig {
  url: string;
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

export interface WebSocketStepConfig {
  url: string;
  message: any;
  waitForResponse?: boolean;
}

export interface CustomStepConfig {
  execute: () => Promise<any>;
}

export interface StepAssertion {
  type: 'status' | 'response_time' | 'body_contains' | 'header' | 'custom';
  expected: any;
  message?: string;
}

export interface SuccessCriteria {
  avgResponseTime: number;   // Average response time in ms
  p95ResponseTime: number;   // 95th percentile in ms
  p99ResponseTime: number;   // 99th percentile in ms
  errorRate: number;         // Error rate percentage (0-100)
  throughput: number;        // Minimum requests per second
  customMetrics?: Record<string, number>;
}

export interface PerformanceResults {
  testId: string;
  passed: boolean;
  timestamp: number;
  duration: number;
  metrics: PerformanceMetrics;
  scenarios: ScenarioResults[];
  errors: PerformanceError[];
  report: PerformanceReport;
}

export interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  responseTime: {
    min: number;
    max: number;
    avg: number;
    median: number;
    p90: number;
    p95: number;
    p99: number;
  };
  throughput: number;        // Requests per second
  errorRate: number;         // Percentage
  dataTransferred: number;   // Bytes
}

export interface ScenarioResults {
  scenarioName: string;
  executions: number;
  successful: number;
  failed: number;
  avgDuration: number;
  metrics: PerformanceMetrics;
}

export interface PerformanceError {
  timestamp: number;
  scenario: string;
  step: string;
  error: string;
  statusCode?: number;
}

export interface PerformanceReport {
  summary: string;
  passedCriteria: string[];
  failedCriteria: string[];
  recommendations: string[];
  charts?: {
    responseTimeOverTime: DataPoint[];
    throughputOverTime: DataPoint[];
    errorRateOverTime: DataPoint[];
  };
}

export interface DataPoint {
  timestamp: number;
  value: number;
}

// ==================== Load Testing (k6) Types ====================

export interface K6Test {
  id: string;
  name: string;
  description?: string;
  script: string;           // k6 script content
  options: K6Options;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
}

export interface K6Options {
  vus?: number;             // Virtual users
  duration?: string;        // Duration (e.g., '30s', '5m')
  stages?: K6Stage[];       // Load stages
  thresholds?: Record<string, string[]>;
  scenarios?: Record<string, K6Scenario>;
  setupTimeout?: string;
  teardownTimeout?: string;
  noVUConnectionReuse?: boolean;
}

export interface K6Stage {
  duration: string;
  target: number;
}

export interface K6Scenario {
  executor: 'constant-vus' | 'ramping-vus' | 'constant-arrival-rate' | 'ramping-arrival-rate' | 'per-vu-iterations' | 'shared-iterations';
  startTime?: string;
  gracefulStop?: string;
  env?: Record<string, string>;
  tags?: Record<string, string>;
  vus?: number;
  duration?: string;
  stages?: K6Stage[];
  rate?: number;
  timeUnit?: string;
  preAllocatedVUs?: number;
  maxVUs?: number;
  iterations?: number;
}

export interface K6Results {
  testId: string;
  timestamp: number;
  duration: number;
  metrics: K6Metrics;
  checks: K6Check[];
  thresholds: K6ThresholdResult[];
  rootGroup: K6Group;
}

export interface K6Metrics {
  http_reqs: K6MetricData;
  http_req_duration: K6MetricData;
  http_req_blocked: K6MetricData;
  http_req_connecting: K6MetricData;
  http_req_tls_handshaking: K6MetricData;
  http_req_sending: K6MetricData;
  http_req_waiting: K6MetricData;
  http_req_receiving: K6MetricData;
  http_req_failed: K6MetricData;
  iterations: K6MetricData;
  vus: K6MetricData;
  vus_max: K6MetricData;
  data_received: K6MetricData;
  data_sent: K6MetricData;
  [key: string]: K6MetricData;
}

export interface K6MetricData {
  count?: number;
  rate?: number;
  avg?: number;
  min?: number;
  med?: number;
  max?: number;
  p90?: number;
  p95?: number;
  p99?: number;
  values?: Record<string, number>;
}

export interface K6Check {
  name: string;
  passes: number;
  fails: number;
}

export interface K6ThresholdResult {
  metric: string;
  threshold: string;
  passed: boolean;
  value?: number;
}

export interface K6Group {
  name: string;
  path: string;
  checks: K6Check[];
  groups: K6Group[];
}

// ==================== Security Testing Types ====================

export interface SecurityTest {
  id: string;
  name: string;
  description?: string;
  target: SecurityTarget;
  scanType: 'passive' | 'active' | 'full';
  owasp: OWASPChecks;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
}

export interface SecurityTarget {
  url: string;
  authentication?: {
    type: 'basic' | 'bearer' | 'apikey' | 'oauth2';
    credentials: Record<string, string>;
  };
  scope?: string[];         // URLs to include
  exclude?: string[];       // URLs to exclude
  maxDepth?: number;        // Spider depth
}

export interface OWASPChecks {
  injectionAttacks: boolean;           // A01:2021 - Injection
  brokenAuth: boolean;                 // A02:2021 - Broken Authentication
  sensitiveData: boolean;              // A03:2021 - Sensitive Data Exposure
  xxe: boolean;                        // A04:2021 - XML External Entities
  accessControl: boolean;              // A05:2021 - Broken Access Control
  securityMisconfig: boolean;          // A06:2021 - Security Misconfiguration
  xss: boolean;                        // A07:2021 - Cross-Site Scripting
  insecureDeserialization: boolean;    // A08:2021 - Insecure Deserialization
  knownVulnerabilities: boolean;       // A09:2021 - Using Components with Known Vulnerabilities
  logging: boolean;                    // A10:2021 - Insufficient Logging & Monitoring
}

export interface SecurityScanResults {
  testId: string;
  timestamp: number;
  duration: number;
  vulnerabilities: Vulnerability[];
  summary: SecuritySummary;
  owaspTop10: OWASPTop10Results;
  report: SecurityReport;
}

export interface Vulnerability {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  cweid: number;            // Common Weakness Enumeration ID
  wascid?: number;          // Web Application Security Consortium ID
  url: string;
  method?: string;
  evidence?: string;
  solution: string;
  reference: string[];
  instances: VulnerabilityInstance[];
  owaspCategory?: string;
}

export interface VulnerabilityInstance {
  uri: string;
  method: string;
  param?: string;
  attack?: string;
  evidence?: string;
}

export interface SecuritySummary {
  totalVulnerabilities: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  urlsScanned: number;
  passed: boolean;         // No critical or high vulnerabilities
}

export interface OWASPTop10Results {
  a01_injection: VulnerabilityCount;
  a02_broken_auth: VulnerabilityCount;
  a03_sensitive_data: VulnerabilityCount;
  a04_xxe: VulnerabilityCount;
  a05_access_control: VulnerabilityCount;
  a06_misconfig: VulnerabilityCount;
  a07_xss: VulnerabilityCount;
  a08_deserialization: VulnerabilityCount;
  a09_known_vulns: VulnerabilityCount;
  a10_logging: VulnerabilityCount;
}

export interface VulnerabilityCount {
  count: number;
  severity: Record<string, number>;
  vulnerabilities: Vulnerability[];
}

export interface SecurityReport {
  summary: string;
  criticalIssues: string[];
  recommendations: string[];
  complianceStatus: {
    pciDss: boolean;
    hipaa: boolean;
    gdpr: boolean;
  };
}

// ==================== Test Data Management Types ====================

export interface TestDataSchema {
  name: string;
  fields: TestDataField[];
  relationships?: DataRelationship[];
  constraints?: DataConstraint[];
}

export interface TestDataField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'phone' | 'address' | 'uuid' | 'enum' | 'custom';
  required?: boolean;
  unique?: boolean;
  format?: string;
  pattern?: string;
  min?: number;
  max?: number;
  enumValues?: any[];
  generator?: (faker: any) => any;
  description?: string;
}

export interface DataRelationship {
  field: string;
  references: {
    schema: string;
    field: string;
  };
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface DataConstraint {
  type: 'unique' | 'check' | 'foreign_key';
  fields: string[];
  expression?: string;
}

export interface TestData {
  schema: string;
  records: any[];
  metadata: {
    generatedAt: number;
    count: number;
    seed?: number;
  };
}

export interface AnonymizationRule {
  field: string;
  strategy: 'mask' | 'hash' | 'encrypt' | 'replace' | 'remove' | 'shuffle' | 'generalize';
  config?: {
    maskChar?: string;
    hashAlgorithm?: string;
    encryptionKey?: string;
    replacement?: any;
    generalizationLevel?: number;
  };
}

export interface PIIField {
  name: string;
  type: 'email' | 'phone' | 'ssn' | 'credit_card' | 'address' | 'name' | 'ip_address' | 'custom';
  detected: boolean;
  confidence: number;      // 0-1
}

// ==================== General Testing Types ====================

export interface TestRun {
  id: string;
  type: 'contract' | 'performance' | 'load' | 'security';
  testId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: number;
  completedAt?: number;
  duration?: number;
  results?: any;
  error?: string;
}

export interface TestReport {
  id: string;
  testRunId: string;
  type: 'contract' | 'performance' | 'load' | 'security';
  timestamp: number;
  summary: string;
  passed: boolean;
  metrics: Record<string, any>;
  details: any;
  recommendations: string[];
  artifacts?: TestArtifact[];
}

export interface TestArtifact {
  type: 'log' | 'screenshot' | 'video' | 'trace' | 'report' | 'data';
  name: string;
  path: string;
  size: number;
  createdAt: number;
}

export interface TestConfiguration {
  parallelExecution: boolean;
  maxConcurrency: number;
  timeout: number;
  retryOnFailure: boolean;
  maxRetries: number;
  environment: 'development' | 'staging' | 'production';
  notifications: NotificationConfig;
}

export interface NotificationConfig {
  enabled: boolean;
  channels: ('email' | 'slack' | 'webhook')[];
  recipients: string[];
  onSuccess?: boolean;
  onFailure?: boolean;
  webhookUrl?: string;
}

export interface TestingDashboardData {
  overview: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    runningTests: number;
    lastRunAt?: number;
  };
  contractTesting: {
    coverage: number;         // Percentage
    totalContracts: number;
    breakingChanges: number;
  };
  performanceTesting: {
    avgResponseTime: number;
    p95ResponseTime: number;
    throughput: number;
    errorRate: number;
  };
  loadTesting: {
    maxUsers: number;
    avgDuration: number;
    successRate: number;
  };
  securityTesting: {
    totalVulnerabilities: number;
    critical: number;
    high: number;
    lastScanAt?: number;
  };
  trends: {
    responseTime: DataPoint[];
    errorRate: DataPoint[];
    vulnerabilities: DataPoint[];
  };
}

// Note: All types are exported individually above using named exports.
// TypeScript types/interfaces cannot be exported as values in a default export object.
// Import them using named imports instead:
// import { ContractTest, PerformanceTest, etc. } from './testing';
