/**
 * Semantic Layer & Data Fabric Type Definitions
 *
 * Complete type system for semantic data modeling, federated queries,
 * data mesh architecture, and data fabric orchestration.
 *
 * @module semantic/types
 */

// ============================================================================
// SEMANTIC MODEL TYPES
// ============================================================================

/**
 * Entity represents a business object in the semantic model
 * Examples: User, Order, Product, Customer, Invoice
 */
export interface Entity {
  id: string;
  name: string;
  displayName: string;
  description: string;

  // Physical mapping
  source: DataSourceReference;
  tableName: string;
  schema?: string;

  // Entity attributes
  attributes: Attribute[];

  // Relationships with other entities
  relationships: Relationship[];

  // Business metadata
  owner: string;
  tags: string[];

  // Governance
  accessLevel: AccessLevel;
  piiFields: string[];

  // Lifecycle
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

/**
 * Attribute represents a property of an entity
 */
export interface Attribute {
  id: string;
  name: string;
  displayName: string;
  description: string;

  // Data type
  dataType: DataType;

  // Physical mapping
  columnName: string;

  // Constraints
  nullable: boolean;
  unique: boolean;
  primaryKey: boolean;

  // Business logic
  format?: string;
  defaultValue?: any;
  validValues?: any[];

  // Classification
  isPII: boolean;
  classification: DataClassification;

  // Statistics
  distinctCount?: number;
  nullCount?: number;
  minValue?: any;
  maxValue?: any;
}

/**
 * Relationship between entities
 */
export interface Relationship {
  id: string;
  name: string;
  type: RelationshipType;

  // Entities
  fromEntity: string;
  toEntity: string;

  // Join condition
  fromAttribute: string;
  toAttribute: string;

  // Cardinality
  cardinality: Cardinality;

  // Behavior
  cascadeDelete?: boolean;
  cascadeUpdate?: boolean;
}

export enum RelationshipType {
  ONE_TO_ONE = 'one-to-one',
  ONE_TO_MANY = 'one-to-many',
  MANY_TO_ONE = 'many-to-one',
  MANY_TO_MANY = 'many-to-many'
}

export enum Cardinality {
  ZERO_OR_ONE = '0..1',
  EXACTLY_ONE = '1',
  ZERO_OR_MANY = '0..*',
  ONE_OR_MANY = '1..*'
}

/**
 * Metric represents a calculated business measure
 */
export interface Metric {
  id: string;
  name: string;
  displayName: string;
  description: string;

  // Calculation
  calculation: MetricCalculation;

  // Aggregation
  aggregation: AggregationType;

  // Format
  format: string;
  unit?: string;

  // Business metadata
  category: string;
  owner: string;
  tags: string[];
}

export interface MetricCalculation {
  type: 'simple' | 'derived' | 'custom';
  expression: string;
  dependencies: string[];
}

export enum AggregationType {
  SUM = 'sum',
  AVG = 'avg',
  COUNT = 'count',
  COUNT_DISTINCT = 'count_distinct',
  MIN = 'min',
  MAX = 'max',
  MEDIAN = 'median',
  PERCENTILE = 'percentile',
  STDDEV = 'stddev',
  VARIANCE = 'variance'
}

/**
 * Dimension for analytical queries
 */
export interface Dimension {
  id: string;
  name: string;
  displayName: string;
  description: string;

  // Type
  type: DimensionType;

  // Hierarchy
  hierarchy?: DimensionHierarchy;

  // Attributes
  attributes: string[];

  // Business metadata
  category: string;
  tags: string[];
}

export enum DimensionType {
  TIME = 'time',
  GEOGRAPHY = 'geography',
  CATEGORY = 'category',
  PRODUCT = 'product',
  CUSTOMER = 'customer',
  ORGANIZATION = 'organization',
  CUSTOM = 'custom'
}

export interface DimensionHierarchy {
  levels: HierarchyLevel[];
}

export interface HierarchyLevel {
  name: string;
  attribute: string;
  order: number;
}

// ============================================================================
// DATA SOURCE TYPES
// ============================================================================

export interface DataSourceReference {
  id: string;
  name: string;
  type: DataSourceType;
  connectionId: string;
}

export enum DataSourceType {
  // Relational databases
  POSTGRESQL = 'postgresql',
  MYSQL = 'mysql',
  MSSQL = 'mssql',
  ORACLE = 'oracle',
  MARIADB = 'mariadb',

  // NoSQL databases
  MONGODB = 'mongodb',
  CASSANDRA = 'cassandra',
  DYNAMODB = 'dynamodb',
  REDIS = 'redis',
  NEO4J = 'neo4j',

  // Data warehouses
  SNOWFLAKE = 'snowflake',
  BIGQUERY = 'bigquery',
  REDSHIFT = 'redshift',
  SYNAPSE = 'synapse',
  DATABRICKS = 'databricks',

  // Cloud storage
  S3 = 's3',
  GCS = 'gcs',
  AZURE_BLOB = 'azure_blob',

  // APIs
  REST_API = 'rest_api',
  GRAPHQL = 'graphql',

  // Other
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json',
  PARQUET = 'parquet'
}

export enum DataType {
  STRING = 'string',
  INTEGER = 'integer',
  DECIMAL = 'decimal',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATETIME = 'datetime',
  TIMESTAMP = 'timestamp',
  JSON = 'json',
  ARRAY = 'array',
  OBJECT = 'object',
  BINARY = 'binary'
}

export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted'
}

export enum AccessLevel {
  PUBLIC = 'public',
  TEAM = 'team',
  PRIVATE = 'private',
  RESTRICTED = 'restricted'
}

// ============================================================================
// DATA CATALOG TYPES
// ============================================================================

export interface CatalogEntry {
  id: string;
  name: string;
  fullyQualifiedName: string;
  type: CatalogEntryType;

  // Source
  dataSource: DataSourceReference;

  // Schema
  schema?: SchemaMetadata;

  // Metadata
  description: string;
  tags: string[];
  owner: string;

  // Lineage
  upstreamDependencies: string[];
  downstreamDependencies: string[];

  // Quality
  qualityScore: number;
  qualityMetrics: QualityMetrics;

  // Usage
  usageMetrics: UsageMetrics;

  // Governance
  classification: DataClassification;
  hasPII: boolean;
  retentionPolicy?: string;

  // Lifecycle
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
  discoveredAt: Date;
}

export enum CatalogEntryType {
  TABLE = 'table',
  VIEW = 'view',
  MATERIALIZED_VIEW = 'materialized_view',
  COLLECTION = 'collection',
  DATASET = 'dataset',
  API_ENDPOINT = 'api_endpoint',
  FILE = 'file',
  STREAM = 'stream'
}

export interface SchemaMetadata {
  columns: ColumnMetadata[];
  indexes: IndexMetadata[];
  constraints: ConstraintMetadata[];
  partitions?: PartitionMetadata[];
}

export interface ColumnMetadata {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  defaultValue?: any;
  description?: string;

  // Statistics
  distinctCount?: number;
  nullCount?: number;
  minValue?: any;
  maxValue?: any;
}

export interface IndexMetadata {
  name: string;
  columns: string[];
  unique: boolean;
  type: string;
}

export interface ConstraintMetadata {
  name: string;
  type: 'PRIMARY_KEY' | 'FOREIGN_KEY' | 'UNIQUE' | 'CHECK';
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
}

export interface PartitionMetadata {
  type: 'range' | 'list' | 'hash';
  columns: string[];
  partitions: number;
}

export interface QualityMetrics {
  completeness: number;
  accuracy: number;
  consistency: number;
  freshness: number;
  validity: number;

  // Detailed metrics
  totalRows: number;
  nullRows: number;
  duplicateRows: number;
  invalidRows: number;

  lastChecked: Date;
}

export interface UsageMetrics {
  queryCount: number;
  userCount: number;
  avgQueryTime: number;
  totalDataScanned: number;

  // Trends
  dailyQueries: number[];
  topUsers: string[];
  topQueries: string[];

  lastUpdated: Date;
}

// ============================================================================
// FEDERATED QUERY TYPES
// ============================================================================

export interface FederatedQuery {
  id: string;
  query: string;
  queryLanguage: QueryLanguage;

  // Sources involved
  dataSources: DataSourceReference[];

  // Execution plan
  executionPlan: QueryExecutionPlan;

  // Results
  results?: QueryResult;

  // Performance
  executionTime?: number;
  dataSizeScanned?: number;

  // Metadata
  createdBy: string;
  createdAt: Date;
}

export enum QueryLanguage {
  SQL = 'sql',
  MONGODB = 'mongodb',
  GRAPHQL = 'graphql',
  SEMANTIC = 'semantic'
}

export interface QueryExecutionPlan {
  steps: QueryStep[];
  estimatedCost: number;
  estimatedTime: number;
}

export interface QueryStep {
  id: string;
  type: QueryStepType;
  dataSource: DataSourceReference;
  operation: string;

  // Dependencies
  dependencies: string[];

  // Optimization
  pushDownFilters: string[];
  pushDownProjections: string[];

  // Estimated metrics
  estimatedRows: number;
  estimatedCost: number;
}

export enum QueryStepType {
  SCAN = 'scan',
  FILTER = 'filter',
  PROJECT = 'project',
  JOIN = 'join',
  AGGREGATE = 'aggregate',
  SORT = 'sort',
  LIMIT = 'limit',
  UNION = 'union',
  CACHE_LOOKUP = 'cache_lookup'
}

export interface QueryResult {
  columns: ResultColumn[];
  rows: any[][];

  // Metadata
  rowCount: number;
  executionTime: number;
  dataSizeScanned: number;

  // Caching
  cached: boolean;
  cacheHit?: boolean;
}

export interface ResultColumn {
  name: string;
  dataType: string;
  source?: string;
}

// ============================================================================
// DATA MESH TYPES
// ============================================================================

export interface DataDomain {
  id: string;
  name: string;
  displayName: string;
  description: string;

  // Ownership
  owner: Team;
  contributors: TeamMember[];

  // Data products
  dataProducts: DataProduct[];

  // APIs
  apis: DataAPI[];

  // Governance
  sla: ServiceLevelAgreement;
  policies: DataPolicy[];

  // Documentation
  documentation: string;
  usageExamples: string[];

  // Lifecycle
  status: DomainStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  email: string;
  slackChannel?: string;
}

export interface TeamMember {
  userId: string;
  name: string;
  role: string;
  permissions: string[];
}

export interface DataProduct {
  id: string;
  name: string;
  description: string;

  // Data
  datasets: string[];

  // Interface
  apiEndpoint: string;
  schema: any;

  // Quality
  qualityGuarantees: QualityGuarantee[];

  // SLA
  sla: ServiceLevelAgreement;

  // Versioning
  version: string;
  changelog: ChangelogEntry[];

  // Lifecycle
  status: 'development' | 'production' | 'deprecated';
}

export interface DataAPI {
  id: string;
  name: string;
  type: 'REST' | 'GraphQL' | 'gRPC';
  endpoint: string;

  // Schema
  schema: any;

  // Authentication
  authMethod: string;

  // Rate limiting
  rateLimit: RateLimit;

  // Documentation
  documentation: string;
  examples: APIExample[];
}

export interface ServiceLevelAgreement {
  availability: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  errorRate: number;
  freshnessMinutes: number;
}

export interface QualityGuarantee {
  metric: string;
  threshold: number;
  operator: '>' | '<' | '>=' | '<=' | '=';
}

export interface DataPolicy {
  id: string;
  type: 'access' | 'retention' | 'privacy' | 'quality';
  name: string;
  rules: PolicyRule[];
}

export interface PolicyRule {
  condition: string;
  action: string;
  enforced: boolean;
}

export interface RateLimit {
  requests: number;
  period: 'second' | 'minute' | 'hour' | 'day';
}

export interface APIExample {
  name: string;
  description: string;
  request: any;
  response: any;
}

export interface ChangelogEntry {
  version: string;
  date: Date;
  changes: string[];
  breaking: boolean;
}

export enum DomainStatus {
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
  ARCHIVED = 'archived'
}

// ============================================================================
// METADATA MANAGEMENT TYPES
// ============================================================================

export interface MetadataEntry {
  id: string;
  targetId: string;
  targetType: string;

  // Metadata types
  technical: TechnicalMetadata;
  business: BusinessMetadata;
  operational: OperationalMetadata;

  // Versioning
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TechnicalMetadata {
  schema: any;
  dataType: string;
  format?: string;
  encoding?: string;
  compression?: string;

  // Storage
  storageLocation: string;
  storageSize: number;

  // Statistics
  rowCount?: number;
  columnCount?: number;
}

export interface BusinessMetadata {
  displayName: string;
  description: string;
  businessTerms: string[];
  domain: string;
  category: string;
  tags: string[];

  // Ownership
  owner: string;
  steward: string;

  // Criticality
  businessCriticality: 'low' | 'medium' | 'high' | 'critical';
}

export interface OperationalMetadata {
  // Lifecycle
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;

  // Usage
  accessCount: number;
  avgAccessTime: number;

  // Quality
  lastQualityCheck?: Date;
  qualityScore?: number;

  // Lineage
  upstreamCount: number;
  downstreamCount: number;
}

// ============================================================================
// DATA FABRIC TYPES
// ============================================================================

export interface FabricRoute {
  id: string;
  name: string;

  // Routing rules
  source: RouteSource;
  destination: RouteDestination;

  // Conditions
  conditions: RouteCondition[];

  // Priority
  priority: number;

  // Optimization
  cachingStrategy: CachingStrategy;
  compressionEnabled: boolean;

  // Monitoring
  metrics: RouteMetrics;

  // Status
  enabled: boolean;
}

export interface RouteSource {
  type: 'query' | 'api' | 'stream';
  pattern: string;
}

export interface RouteDestination {
  dataSource: DataSourceReference;
  fallback?: DataSourceReference;
}

export interface RouteCondition {
  type: 'user' | 'time' | 'load' | 'cost' | 'custom';
  operator: string;
  value: any;
}

export interface CachingStrategy {
  enabled: boolean;
  ttl: number;
  invalidationRules: InvalidationRule[];
}

export interface InvalidationRule {
  type: 'time' | 'event' | 'manual';
  condition: string;
}

export interface RouteMetrics {
  requestCount: number;
  avgLatency: number;
  errorRate: number;
  cacheHitRate: number;
  dataSizeTransferred: number;
}

// ============================================================================
// SEMANTIC QUERY TYPES
// ============================================================================

export interface SemanticQuery {
  id: string;
  naturalLanguageQuery: string;

  // Parsed query
  parsedQuery: ParsedQuery;

  // Generated SQL
  generatedSQL?: string;

  // Execution
  executionPlan?: QueryExecutionPlan;
  results?: QueryResult;

  // Metadata
  confidence: number;
  createdBy: string;
  createdAt: Date;
}

export interface ParsedQuery {
  intent: QueryIntent;
  entities: string[];
  metrics: string[];
  dimensions: string[];
  filters: QueryFilter[];
  timeRange?: TimeRange;
  limit?: number;
}

export enum QueryIntent {
  RETRIEVE = 'retrieve',
  AGGREGATE = 'aggregate',
  COMPARE = 'compare',
  TREND = 'trend',
  RANK = 'rank',
  SEARCH = 'search'
}

export interface QueryFilter {
  field: string;
  operator: FilterOperator;
  value: any;
}

export enum FilterOperator {
  EQUALS = '=',
  NOT_EQUALS = '!=',
  GREATER_THAN = '>',
  LESS_THAN = '<',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN_OR_EQUAL = '<=',
  IN = 'in',
  NOT_IN = 'not_in',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with'
}

export interface TimeRange {
  start: Date;
  end: Date;
  granularity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
}
