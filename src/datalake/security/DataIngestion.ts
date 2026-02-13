/**
 * Data Ingestion - Handles data ingestion, adapters, and provider-specific implementations
 */

import type {
  DataLakeConfig,
  DataLakeProvider,
  DataLakeAdapter,
  TableSchema,
  DataRecord,
  QueryRequest,
  QueryResult,
  QueryFilter,
  CatalogEntry,
  CompactionResult,
  StorageTier,
  TableStatistics,
  DataType,
} from './types';

// =============================================================================
// Base Data Lake Adapter
// =============================================================================

export class BaseDataLakeAdapter implements DataLakeAdapter {
  protected config: DataLakeConfig;
  protected initialized = false;

  constructor(config: DataLakeConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async createTable(schema: TableSchema): Promise<void> {
    this.ensureInitialized();
    console.log(`Creating table: ${schema.name}`);
  }

  async dropTable(tableName: string): Promise<void> {
    this.ensureInitialized();
    console.log(`Dropping table: ${tableName}`);
  }

  async insertData(_tableName: string, records: DataRecord[]): Promise<number> {
    this.ensureInitialized();
    return records.length;
  }

  async query(request: QueryRequest): Promise<QueryResult> {
    this.ensureInitialized();
    const startTime = Date.now();
    return {
      columns: request.columns || ['*'],
      rows: [],
      rowCount: 0,
      executionTime: Date.now() - startTime,
      bytesScanned: 0,
    };
  }

  async getTableInfo(tableName: string): Promise<CatalogEntry | null> {
    this.ensureInitialized();
    return {
      tableName,
      database: 'default',
      schema: {
        name: tableName,
        columns: [],
        partitionColumns: [],
        format: this.config.defaultFormat,
        compression: this.config.defaultCompression,
        properties: {},
      },
      location: '',
      format: this.config.defaultFormat,
      rowCount: 0,
      sizeBytes: 0,
      partitions: [],
      lastModified: new Date(),
      created: new Date(),
      owner: 'system',
      tags: [],
    };
  }

  async listTables(): Promise<string[]> {
    this.ensureInitialized();
    return [];
  }

  async compactPartitions(
    tableName: string,
    _partitions?: string[]
  ): Promise<CompactionResult> {
    this.ensureInitialized();
    return {
      tableName,
      partitionsProcessed: 0,
      filesCompacted: 0,
      originalSizeBytes: 0,
      compactedSizeBytes: 0,
      compressionRatio: 1.0,
      duration: 0,
    };
  }

  async setStorageTier(
    _tableName: string,
    _partition: string,
    _tier: StorageTier
  ): Promise<void> {
    this.ensureInitialized();
  }

  async deletePartitions(_tableName: string, partitions: string[]): Promise<number> {
    this.ensureInitialized();
    return partitions.length;
  }

  async getStorageCost(tableName: string): Promise<number> {
    this.ensureInitialized();
    const info = await this.getTableInfo(tableName);
    return info ? (info.sizeBytes / 1024 ** 3) * 0.023 : 0;
  }

  async analyzeTable(tableName: string): Promise<TableStatistics> {
    this.ensureInitialized();
    const info = await this.getTableInfo(tableName);
    return {
      totalRows: info?.rowCount || 0,
      totalSizeBytes: info?.sizeBytes || 0,
      averageRowSize: info && info.rowCount > 0 ? info.sizeBytes / info.rowCount : 0,
      partitionCount: info?.partitions.length || 0,
      lastAnalyzed: new Date(),
      columnStats: {},
    };
  }

  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Adapter not initialized');
    }
  }

  protected buildQuery(request: QueryRequest): string {
    const columns = request.columns?.join(', ') || '*';
    let sql = `SELECT ${columns} FROM ${request.table}`;

    if (request.filters?.length) {
      sql += ` WHERE ${request.filters.map(f => this.buildFilter(f)).join(' AND ')}`;
    }

    if (request.groupBy?.length) {
      sql += ` GROUP BY ${request.groupBy.join(', ')}`;
    }

    if (request.having) {
      sql += ` HAVING ${request.having}`;
    }

    if (request.orderBy?.length) {
      sql += ` ORDER BY ${request.orderBy
        .map(o => {
          let clause = `${o.column} ${o.direction.toUpperCase()}`;
          if (o.nullsFirst !== undefined) {
            clause += o.nullsFirst ? ' NULLS FIRST' : ' NULLS LAST';
          }
          return clause;
        })
        .join(', ')}`;
    }

    if (request.limit) sql += ` LIMIT ${request.limit}`;
    if (request.offset) sql += ` OFFSET ${request.offset}`;

    return sql;
  }

  protected buildFilter(f: QueryFilter): string {
    const ops: Record<string, string> = {
      eq: '=',
      ne: '!=',
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<=',
      like: 'LIKE',
    };

    if (f.operator === 'in') {
      return `${f.column} IN (${(f.value as unknown[]).map(v => `'${v}'`).join(', ')})`;
    }
    if (f.operator === 'between') {
      return `${f.column} BETWEEN '${f.value}' AND '${f.value2}'`;
    }
    if (f.operator === 'is_null') {
      return `${f.column} IS NULL`;
    }
    if (f.operator === 'is_not_null') {
      return `${f.column} IS NOT NULL`;
    }

    return `${f.column} ${ops[f.operator] || '='} '${f.value}'`;
  }

  protected mapDataType(type: DataType): string {
    const mapping: Record<DataType, string> = {
      string: 'STRING',
      int: 'INT',
      long: 'BIGINT',
      float: 'FLOAT',
      double: 'DOUBLE',
      boolean: 'BOOLEAN',
      timestamp: 'TIMESTAMP',
      date: 'DATE',
      binary: 'BINARY',
      decimal: 'DECIMAL(38,18)',
      array: 'ARRAY<STRING>',
      map: 'MAP<STRING,STRING>',
      struct: 'STRUCT<>',
    };
    return mapping[type] || 'STRING';
  }
}

// =============================================================================
// AWS Data Lake Adapter
// =============================================================================

export class AWSDataLakeAdapter extends BaseDataLakeAdapter {
  private readonly storageClassMap: Record<StorageTier, string> = {
    hot: 'STANDARD',
    warm: 'STANDARD_IA',
    cold: 'GLACIER',
    archive: 'DEEP_ARCHIVE',
  };

  async createTable(schema: TableSchema): Promise<void> {
    this.ensureInitialized();
    const columns = schema.columns
      .map(
        col =>
          `${col.name} ${this.mapDataType(col.type)}${col.nullable ? '' : ' NOT NULL'}`
      )
      .join(', ');

    const partitions =
      schema.partitionColumns.length > 0
        ? `PARTITIONED BY (${schema.partitionColumns.join(', ')})`
        : '';

    const _ddl = `
      CREATE EXTERNAL TABLE IF NOT EXISTS ${schema.name} (${columns})
      ${partitions}
      STORED AS ${schema.format.toUpperCase()}
      LOCATION 's3://${this.config.bucket}/${schema.name}/'
    `;
    console.log(`AWS: Creating table ${schema.name}`);
  }

  async getTableInfo(tableName: string): Promise<CatalogEntry | null> {
    const base = await super.getTableInfo(tableName);
    if (base) {
      base.location = `s3://${this.config.bucket}/${tableName}/`;
      base.database = this.config.catalog || 'default';
    }
    return base;
  }

  async setStorageTier(
    tableName: string,
    partition: string,
    tier: StorageTier
  ): Promise<void> {
    this.ensureInitialized();
    console.log(`AWS: Setting ${tableName}/${partition} to ${this.storageClassMap[tier]}`);
  }

  async getStorageCost(tableName: string): Promise<number> {
    const info = await this.getTableInfo(tableName);
    // AWS S3 Standard: $0.023 per GB
    return info ? (info.sizeBytes / 1024 ** 3) * 0.023 : 0;
  }
}

// =============================================================================
// Azure Data Lake Adapter
// =============================================================================

export class AzureDataLakeAdapter extends BaseDataLakeAdapter {
  private readonly accessTierMap: Record<StorageTier, string> = {
    hot: 'Hot',
    warm: 'Cool',
    cold: 'Cool',
    archive: 'Archive',
  };

  async getTableInfo(tableName: string): Promise<CatalogEntry | null> {
    const base = await super.getTableInfo(tableName);
    if (base) {
      base.location = `abfss://${this.config.container}@${this.config.credentials.accountId}.dfs.core.windows.net/${tableName}/`;
      base.database = this.config.container || 'default';
    }
    return base;
  }

  async setStorageTier(
    tableName: string,
    partition: string,
    tier: StorageTier
  ): Promise<void> {
    this.ensureInitialized();
    console.log(`Azure: Setting ${tableName}/${partition} to ${this.accessTierMap[tier]}`);
  }

  async getStorageCost(tableName: string): Promise<number> {
    const info = await this.getTableInfo(tableName);
    // Azure Blob Hot: $0.0184 per GB
    return info ? (info.sizeBytes / 1024 ** 3) * 0.0184 : 0;
  }
}

// =============================================================================
// GCP Data Lake Adapter
// =============================================================================

export class GCPDataLakeAdapter extends BaseDataLakeAdapter {
  async getTableInfo(tableName: string): Promise<CatalogEntry | null> {
    const base = await super.getTableInfo(tableName);
    if (base) {
      base.location = `bq://${this.config.credentials.projectId}/${this.config.dataset}/${tableName}`;
      base.format = 'parquet';
      base.database = this.config.dataset || 'default';
    }
    return base;
  }

  async setStorageTier(
    tableName: string,
    partition: string,
    tier: StorageTier
  ): Promise<void> {
    this.ensureInitialized();
    // BigQuery uses automatic tiering
    console.log(`GCP: BigQuery auto-tiers ${tableName}/${partition}, requested: ${tier}`);
  }

  async getStorageCost(tableName: string): Promise<number> {
    const info = await this.getTableInfo(tableName);
    // BigQuery: $0.02 per GB (active storage)
    return info ? (info.sizeBytes / 1024 ** 3) * 0.02 : 0;
  }
}

// =============================================================================
// Snowflake Data Lake Adapter
// =============================================================================

export class SnowflakeDataLakeAdapter extends BaseDataLakeAdapter {
  async getTableInfo(tableName: string): Promise<CatalogEntry | null> {
    const base = await super.getTableInfo(tableName);
    if (base) {
      base.location = `snowflake://${this.config.credentials.accountId}/${this.config.warehouse}/${tableName}`;
      base.database = this.config.warehouse || 'default';
    }
    return base;
  }

  async setStorageTier(
    _tableName: string,
    _partition: string,
    _tier: StorageTier
  ): Promise<void> {
    this.ensureInitialized();
    // Snowflake handles storage optimization automatically
  }

  async getStorageCost(tableName: string): Promise<number> {
    const info = await this.getTableInfo(tableName);
    // Snowflake: ~$23 per TB (compressed)
    return info ? (info.sizeBytes / 1024 ** 4) * 23 : 0;
  }
}

// =============================================================================
// Databricks Data Lake Adapter
// =============================================================================

export class DatabricksDataLakeAdapter extends BaseDataLakeAdapter {
  async getTableInfo(tableName: string): Promise<CatalogEntry | null> {
    const base = await super.getTableInfo(tableName);
    if (base) {
      base.location = `dbfs://${this.config.catalog}/${tableName}`;
      base.database = this.config.catalog || 'default';
    }
    return base;
  }

  async setStorageTier(
    _tableName: string,
    _partition: string,
    _tier: StorageTier
  ): Promise<void> {
    this.ensureInitialized();
    // Databricks relies on underlying cloud storage tiering
  }

  async compactPartitions(
    tableName: string,
    _partitions?: string[]
  ): Promise<CompactionResult> {
    this.ensureInitialized();
    // Delta Lake OPTIMIZE command
    console.log(`Databricks: Running OPTIMIZE on ${tableName}`);
    return {
      tableName,
      partitionsProcessed: 0,
      filesCompacted: 0,
      originalSizeBytes: 0,
      compactedSizeBytes: 0,
      compressionRatio: 1.0,
      duration: 0,
    };
  }

  async getStorageCost(tableName: string): Promise<number> {
    const info = await this.getTableInfo(tableName);
    // Databricks DBU costs vary
    return info ? (info.sizeBytes / 1024 ** 3) * 0.025 : 0;
  }
}

// =============================================================================
// Adapter Factory
// =============================================================================

export class AdapterFactory {
  static createAdapter(config: DataLakeConfig): DataLakeAdapter {
    const adapters: Record<
      DataLakeProvider,
      new (c: DataLakeConfig) => DataLakeAdapter
    > = {
      aws: AWSDataLakeAdapter,
      azure: AzureDataLakeAdapter,
      gcp: GCPDataLakeAdapter,
      snowflake: SnowflakeDataLakeAdapter,
      databricks: DatabricksDataLakeAdapter,
    };

    const AdapterClass = adapters[config.provider];
    if (!AdapterClass) {
      throw new Error(`Unsupported data lake provider: ${config.provider}`);
    }

    return new AdapterClass(config);
  }
}
