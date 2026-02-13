import { NodeType } from '../../types/workflow';

export const DATABASE_NODES: Record<string, NodeType> = {
  mysql: {
      type: 'mysql',
      label: 'MySQL',
      icon: 'Database',
      color: 'bg-blue-800',
      category: 'database',
      inputs: 1,
      outputs: 1,
      description: 'MySQL database operations'
    },
  postgres: {
      type: 'postgres',
      label: 'PostgreSQL',
      icon: 'Database',
      color: 'bg-blue-900',
      category: 'database',
      inputs: 1,
      outputs: 1,
      description: 'PostgreSQL operations'
    },
  mongodb: {
      type: 'mongodb',
      label: 'MongoDB',
      icon: 'Database',
      color: 'bg-green-700',
      category: 'database',
      inputs: 1,
      outputs: 1,
      description: 'MongoDB operations'
    },
  redis: {
      type: 'redis',
      label: 'Redis',
      icon: 'Database',
      color: 'bg-red-800',
      category: 'database',
      inputs: 1,
      outputs: 1,
      description: 'Redis cache operations'
    },
  oracle: {
      type: 'oracle',
      label: 'Oracle Database',
      icon: 'Database',
      color: 'bg-red-700',
      category: 'database',
      inputs: 1,
      outputs: 1,
      description: 'Oracle database operations'
    },
  sqlserver: {
      type: 'sqlserver',
      label: 'Microsoft SQL Server',
      icon: 'Database',
      color: 'bg-blue-800',
      category: 'database',
      inputs: 1,
      outputs: 1,
      description: 'SQL Server database operations'
    },
  snowflake: {
      type: 'snowflake',
      label: 'Snowflake',
      icon: 'Snowflake',
      color: 'bg-cyan-600',
      category: 'database',
      inputs: 1,
      outputs: 1,
      description: 'Snowflake cloud data warehouse'
    },
  bigquery: {
      type: 'bigquery',
      label: 'Google BigQuery',
      icon: 'Database',
      color: 'bg-blue-600',
      category: 'database',
      inputs: 1,
      outputs: 1,
      description: 'BigQuery analytics database'
    },
  elasticsearch: {
      type: 'elasticsearch',
      label: 'Elasticsearch',
      icon: 'Search',
      color: 'bg-yellow-500',
      category: 'database',
      inputs: 1,
      outputs: 1,
      description: 'Elasticsearch search and analytics'
    },
  amazonRDS: {
      type: 'amazonRDS',
      label: 'Amazon RDS',
      icon: 'Database',
      color: 'bg-orange-600',
      category: 'database',
      inputs: 1,
      outputs: 1,
      description: 'Amazon RDS managed databases'
    },
  cassandra: {
      type: 'cassandra',
      label: 'Apache Cassandra',
      icon: 'Database',
      color: 'bg-gray-700',
      category: 'database',
      inputs: 1,
      outputs: 1,
      description: 'Cassandra NoSQL database'
    },
  kafka: {
      type: 'kafka',
      label: 'Apache Kafka',
      icon: 'Layers',
      color: 'bg-gray-900',
      category: 'database',
      inputs: 1,
      outputs: 1,
      description: 'Apache Kafka event streaming'
    },
  clickhouse: {
      type: 'clickhouse',
      label: 'ClickHouse',
      icon: 'Database',
      color: 'bg-yellow-500',
      category: 'database',
      inputs: 1,
      outputs: 1,
      description: 'ClickHouse analytics database'
    },
  databricks: {
      type: 'databricks',
      label: 'Databricks',
      icon: 'Cpu',
      color: 'bg-red-600',
      category: 'database',
      inputs: 1,
      outputs: 1,
      description: 'Databricks data platform'
    },
  redshift: { type: 'redshift', label: 'Amazon Redshift', icon: 'Database', color: 'bg-red-600', category: 'database', inputs: 1, outputs: 1, description: 'AWS data warehouse' },
    timescaledb: { type: 'timescaledb', label: 'TimescaleDB', icon: 'Database', color: 'bg-green-600', category: 'database', inputs: 1, outputs: 1, description: 'Time-series DB' },
  influxdb: { type: 'influxdb', label: 'InfluxDB', icon: 'Database', color: 'bg-purple-600', category: 'database', inputs: 1, outputs: 1, description: 'Time-series DB' },
    prometheus: { type: 'prometheus', label: 'Prometheus', icon: 'Activity', color: 'bg-orange-600', category: 'database', inputs: 1, outputs: 1, description: 'Metrics monitoring' },
  neo4j: { type: 'neo4j', label: 'Neo4j', icon: 'Network', color: 'bg-green-600', category: 'database', inputs: 1, outputs: 1, description: 'Graph database' },
    arangodb: { type: 'arangodb', label: 'ArangoDB', icon: 'Database', color: 'bg-purple-600', category: 'database', inputs: 1, outputs: 1, description: 'Multi-model DB' },
  cockroachdb: { type: 'cockroachdb', label: 'CockroachDB', icon: 'Database', color: 'bg-blue-600', category: 'database', inputs: 1, outputs: 1, description: 'Distributed SQL' },
    scylladb: { type: 'scylladb', label: 'ScyllaDB', icon: 'Database', color: 'bg-teal-600', category: 'database', inputs: 1, outputs: 1, description: 'NoSQL database' },
  yugabytedb: { type: 'yugabytedb', label: 'YugabyteDB', icon: 'Database', color: 'bg-orange-600', category: 'database', inputs: 1, outputs: 1, description: 'Distributed SQL' },
    faunadb: { type: 'faunadb', label: 'FaunaDB', icon: 'Database', color: 'bg-violet-600', category: 'database', inputs: 1, outputs: 1, description: 'Serverless DB' },
  planetscale: { type: 'planetscale', label: 'PlanetScale', icon: 'Database', color: 'bg-black', category: 'database', inputs: 1, outputs: 1, description: 'MySQL serverless' },
    neon: { type: 'neon', label: 'Neon', icon: 'Database', color: 'bg-green-600', category: 'database', inputs: 1, outputs: 1, description: 'Serverless Postgres' },
  cloudspanner: { type: 'cloudspanner', label: 'Cloud Spanner', icon: 'Database', color: 'bg-blue-600', category: 'database', inputs: 1, outputs: 1, description: 'Google distributed SQL' },
    orientdb: { type: 'orientdb', label: 'OrientDB', icon: 'Database', color: 'bg-pink-600', category: 'database', inputs: 1, outputs: 1, description: 'Multi-model DB' },
  surrealdb: { type: 'surrealdb', label: 'SurrealDB', icon: 'Database', color: 'bg-cyan-600', category: 'database', inputs: 1, outputs: 1, description: 'Multi-model DB' }
};
