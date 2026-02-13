/**
 * Workflow Tables System - Types and Interfaces
 */

export interface Table {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  schema: TableSchema;
  settings: TableSettings;
  permissions: TablePermissions;
  indexes: Index[];
  relationships: Relationship[];
  triggers: TableTrigger[];
  views: View[];
  metadata: TableMetadata;
  stats: TableStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface TableSchema {
  columns: Column[];
  primaryKey: string;
  uniqueKeys?: string[];
  checkConstraints?: CheckConstraint[];
  defaultValues?: Record<string, any>;
  computedColumns?: ComputedColumn[];
}

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  dataType: DataType;
  nullable: boolean;
  unique?: boolean;
  defaultValue?: any;
  validation?: ValidationRule[];
  encryption?: boolean;
  searchable?: boolean;
  formula?: string;
  metadata?: ColumnMetadata;
}

export type ColumnType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'time'
  | 'email'
  | 'url'
  | 'phone'
  | 'currency'
  | 'percent'
  | 'rating'
  | 'select'
  | 'multiselect'
  | 'reference'
  | 'attachment'
  | 'json'
  | 'array'
  | 'formula'
  | 'autonumber'
  | 'barcode'
  | 'button';

export interface DataType {
  base: string;
  precision?: number;
  scale?: number;
  length?: number;
  enum?: string[];
}

export interface ValidationRule {
  type: ValidationType;
  constraint: any;
  message?: string;
}

export type ValidationType =
  | 'required'
  | 'min'
  | 'max'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'email'
  | 'url'
  | 'custom';

export interface ColumnMetadata {
  displayName?: string;
  description?: string;
  helpText?: string;
  placeholder?: string;
  format?: string;
  icon?: string;
  color?: string;
  width?: number;
  hidden?: boolean;
  readonly?: boolean;
}

export interface CheckConstraint {
  name: string;
  expression: string;
  message?: string;
}

export interface ComputedColumn {
  columnId: string;
  formula: string;
  dependencies: string[];
  cacheStrategy?: 'none' | 'lazy' | 'eager';
}

export interface TableSettings {
  auditLog: boolean;
  softDelete: boolean;
  versioning: boolean;
  fullTextSearch: boolean;
  caching: CacheConfig;
  pagination: PaginationConfig;
  export: ExportConfig;
  import: ImportConfig;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  strategy: 'memory' | 'redis' | 'hybrid';
}

export interface PaginationConfig {
  defaultLimit: number;
  maxLimit: number;
  cursorBased: boolean;
}

export interface ExportConfig {
  formats: ExportFormat[];
  maxRows: number;
  includeHeaders: boolean;
  includeMetadata: boolean;
}

export interface ImportConfig {
  formats: ImportFormat[];
  maxRows: number;
  validation: 'strict' | 'lenient';
  duplicateHandling: 'skip' | 'update' | 'error';
}

export type ExportFormat = 'csv' | 'excel' | 'json' | 'xml' | 'parquet';
export type ImportFormat = 'csv' | 'excel' | 'json' | 'xml';

export interface TablePermissions {
  owner: string;
  public: Permission;
  roles: RolePermission[];
  users: UserPermission[];
  apiKeys: ApiKeyPermission[];
}

export interface Permission {
  read: boolean;
  write: boolean;
  delete: boolean;
  admin: boolean;
}

export interface RolePermission extends Permission {
  roleId: string;
  conditions?: PermissionCondition[];
}

export interface UserPermission extends Permission {
  userId: string;
  conditions?: PermissionCondition[];
}

export interface ApiKeyPermission extends Permission {
  apiKeyId: string;
  rateLimit?: RateLimit;
}

export interface PermissionCondition {
  field: string;
  operator: string;
  value: any;
}

export interface RateLimit {
  requests: number;
  period: number;
}

export interface Index {
  id: string;
  name: string;
  columns: string[];
  type: IndexType;
  unique: boolean;
  sparse?: boolean;
  partial?: string;
}

export type IndexType = 'btree' | 'hash' | 'gin' | 'gist' | 'fulltext';

export interface Relationship {
  id: string;
  name: string;
  type: RelationType;
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  onDelete?: ReferentialAction;
  onUpdate?: ReferentialAction;
}

export type RelationType = 'one-to-one' | 'one-to-many' | 'many-to-many';
export type ReferentialAction = 'cascade' | 'restrict' | 'set-null' | 'no-action';

export interface TableTrigger {
  id: string;
  name: string;
  event: TriggerEvent;
  timing: TriggerTiming;
  condition?: string;
  action: TriggerAction;
  enabled: boolean;
}

export type TriggerEvent = 'insert' | 'update' | 'delete';
export type TriggerTiming = 'before' | 'after';

export interface TriggerAction {
  type: 'webhook' | 'workflow' | 'function' | 'notification';
  config: any;
}

export interface View {
  id: string;
  name: string;
  type: ViewType;
  query?: Query;
  filters?: Filter[];
  sort?: Sort[];
  groupBy?: string[];
  aggregations?: Aggregation[];
  columns?: string[];
  layout?: ViewLayout;
  shared: boolean;
  metadata?: ViewMetadata;
}

export type ViewType = 'table' | 'grid' | 'kanban' | 'calendar' | 'gallery' | 'form' | 'chart' | 'pivot';

export interface ViewLayout {
  type: ViewType;
  config: any;
}

export interface ViewMetadata {
  description?: string;
  icon?: string;
  color?: string;
  favorite?: boolean;
}

export interface Query {
  select?: string[];
  from: string;
  joins?: Join[];
  where?: Condition;
  groupBy?: string[];
  having?: Condition;
  orderBy?: Sort[];
  limit?: number;
  offset?: number;
}

export interface Join {
  type: 'inner' | 'left' | 'right' | 'full';
  table: string;
  on: string;
}

export interface Condition {
  operator: 'and' | 'or';
  conditions: (SimpleCondition | Condition)[];
}

export interface SimpleCondition {
  field: string;
  operator: ComparisonOperator;
  value: any;
}

export type ComparisonOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'like'
  | 'not like'
  | 'in'
  | 'not in'
  | 'between'
  | 'is null'
  | 'is not null';

export interface Filter {
  id: string;
  field: string;
  operator: ComparisonOperator;
  value: any;
  enabled: boolean;
}

export interface Sort {
  field: string;
  direction: 'asc' | 'desc';
  nullsFirst?: boolean;
}

export interface Aggregation {
  field: string;
  function: AggregateFunction;
  alias?: string;
}

export type AggregateFunction = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'stddev' | 'variance';

export interface TableMetadata {
  tags?: string[];
  category?: string;
  icon?: string;
  color?: string;
  workspace?: string;
  project?: string;
  custom?: Record<string, any>;
}

export interface TableStats {
  rowCount: number;
  sizeBytes: number;
  lastModified: Date;
  lastAccessed: Date;
  readCount: number;
  writeCount: number;
  indexCount: number;
  avgRowSize: number;
}

export interface Row {
  id: string;
  tableId: string;
  data: Record<string, any>;
  version?: number;
  createdAt: Date;
  createdBy?: string;
  updatedAt: Date;
  updatedBy?: string;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface BulkOperation {
  id: string;
  tableId: string;
  type: BulkOperationType;
  status: OperationStatus;
  progress: number;
  totalRows: number;
  processedRows: number;
  errors: OperationError[];
  startedAt: Date;
  completedAt?: Date;
}

export type BulkOperationType = 'insert' | 'update' | 'upsert' | 'delete' | 'import' | 'export';
export type OperationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface OperationError {
  row: number;
  field?: string;
  error: string;
}

export interface Transaction {
  id: string;
  operations: Operation[];
  status: TransactionStatus;
  isolation: IsolationLevel;
  startedAt: Date;
  committedAt?: Date;
  rolledBackAt?: Date;
}

export interface Operation {
  type: 'insert' | 'update' | 'delete';
  tableId: string;
  data: any;
  where?: Condition;
}

export type TransactionStatus = 'active' | 'committed' | 'rolled-back';
export type IsolationLevel = 'read-uncommitted' | 'read-committed' | 'repeatable-read' | 'serializable';

export interface TableAPI {
  // CRUD Operations
  create(tableId: string, data: any): Promise<Row>;
  read(tableId: string, id: string): Promise<Row | null>;
  update(tableId: string, id: string, data: any): Promise<Row>;
  delete(tableId: string, id: string): Promise<boolean>;

  // Bulk Operations
  bulkCreate(tableId: string, data: any[]): Promise<Row[]>;
  bulkUpdate(tableId: string, updates: Array<{id: string; data: any}>): Promise<Row[]>;
  bulkDelete(tableId: string, ids: string[]): Promise<number>;

  // Query Operations
  find(tableId: string, query: Query): Promise<Row[]>;
  findOne(tableId: string, query: Query): Promise<Row | null>;
  count(tableId: string, where?: Condition): Promise<number>;
  aggregate(tableId: string, aggregations: Aggregation[]): Promise<any>;

  // Relationships
  getRelated(tableId: string, id: string, relationship: string): Promise<Row[]>;
  associate(tableId: string, id: string, relationship: string, targetId: string): Promise<void>;
  dissociate(tableId: string, id: string, relationship: string, targetId: string): Promise<void>;
}

export interface TableMetrics {
  tables: number;
  totalRows: number;
  totalSize: number;
  operations: {
    reads: number;
    writes: number;
    deletes: number;
  };
  performance: {
    avgQueryTime: number;
    avgWriteTime: number;
    cacheHitRate: number;
  };
  topTables: Array<{
    tableId: string;
    name: string;
    rows: number;
    size: number;
  }>;
}

export interface CacheEntry {
  data: any;
  timestamp: number;
}

export interface TablesConfig {
  maxTables: number;
  maxRowsPerTable: number;
  maxRowSize: number;
  enableAudit: boolean;
  enableVersioning: boolean;
  enableFullTextSearch: boolean;
  storageEngine: string;
  cacheSize: number;
}
