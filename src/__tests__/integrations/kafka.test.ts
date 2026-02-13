/**
 * Comprehensive tests for Kafka Integration Modules
 * Tests KafkaProducer, KafkaConsumer, KafkaAdmin, and supporting classes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  KafkaProducer,
  KafkaTransaction,
  KafkaStreamProcessor,
  KafkaTopologyBuilder,
  KafkaStreamNode,
  KafkaTable,
  KafkaGlobalTable,
  KafkaStreamImpl,
  KafkaGroupedStream,
  KafkaTimeWindowedStream
} from '../../integrations/kafka/KafkaProducer';
import {
  KafkaConsumer,
  SchemaRegistryClient,
  MonitoringService,
  HealthChecker
} from '../../integrations/kafka/KafkaConsumer';
import {
  KafkaAdminClient,
  ClusterManager,
  TopicManager,
  ConsumerGroupManager
} from '../../integrations/kafka/KafkaAdmin';
import type {
  ProducerConfig,
  ConsumerConfig,
  StreamConfig,
  ProducerRecord,
  TopicConfig
} from '../../integrations/kafka/types';

// Mock logger
vi.mock('../../services/SimpleLogger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('Kafka Integration', () => {
  // ============================================================================
  // KAFKA PRODUCER TESTS
  // ============================================================================

  describe('KafkaProducer', () => {
    let producer: KafkaProducer;
    const producerConfig: ProducerConfig = {
      id: 'test-producer',
      name: 'Test Producer',
      kafka: {
        clientId: 'test-client',
        brokers: ['localhost:9092']
      }
    };

    beforeEach(() => {
      producer = new KafkaProducer(producerConfig);
    });

    it('should create a producer instance', () => {
      expect(producer).toBeInstanceOf(KafkaProducer);
    });

    it('should connect successfully', async () => {
      await expect(producer.connect()).resolves.toBeUndefined();
    });

    it('should send a single message', async () => {
      const record: ProducerRecord = {
        topic: 'test-topic',
        messages: [{ value: 'test-message' }]
      };

      const results = await producer.send(record);

      expect(results).toHaveLength(1);
      expect(results[0].topicName).toBe('test-topic');
      expect(results[0].errorCode).toBe(0);
      expect(results[0].partition).toBe(0);
    });

    it('should send multiple messages', async () => {
      const record: ProducerRecord = {
        topic: 'test-topic',
        messages: [
          { value: 'message-1' },
          { value: 'message-2' },
          { value: 'message-3' }
        ]
      };

      const results = await producer.send(record);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.topicName).toBe('test-topic');
        expect(result.errorCode).toBe(0);
      });
    });

    it('should send messages with partition specified', async () => {
      const record: ProducerRecord = {
        topic: 'test-topic',
        messages: [{ value: 'test-message', partition: 5 }]
      };

      const results = await producer.send(record);

      expect(results[0].partition).toBe(5);
    });

    it('should send batch of records', async () => {
      const records: ProducerRecord[] = [
        { topic: 'topic-1', messages: [{ value: 'msg-1' }] },
        { topic: 'topic-2', messages: [{ value: 'msg-2' }] }
      ];

      const results = await producer.sendBatch(records);

      expect(results).toHaveLength(2);
      expect(results[0][0].topicName).toBe('topic-1');
      expect(results[1][0].topicName).toBe('topic-2');
    });

    it('should create a transaction', async () => {
      const transaction = await producer.transaction();

      expect(transaction).toBeInstanceOf(KafkaTransaction);
      expect(transaction.isActive()).toBe(true);
    });

    it('should disconnect successfully', async () => {
      await expect(producer.disconnect()).resolves.toBeUndefined();
    });
  });

  // ============================================================================
  // KAFKA TRANSACTION TESTS
  // ============================================================================

  describe('KafkaTransaction', () => {
    let transaction: KafkaTransaction;

    beforeEach(() => {
      transaction = new KafkaTransaction();
    });

    it('should start as active', () => {
      expect(transaction.isActive()).toBe(true);
    });

    it('should send messages in transaction', async () => {
      const record: ProducerRecord = {
        topic: 'test-topic',
        messages: [{ value: 'test-message' }]
      };

      await expect(transaction.send(record)).resolves.toBeUndefined();
    });

    it('should send offsets in transaction', async () => {
      const offsets = { 'test-topic': { 0: '100' } };

      await expect(
        transaction.sendOffsets(offsets, 'test-group')
      ).resolves.toBeUndefined();
    });

    it('should commit transaction', async () => {
      await transaction.commit();

      expect(transaction.isActive()).toBe(false);
    });

    it('should abort transaction', async () => {
      await transaction.abort();

      expect(transaction.isActive()).toBe(false);
    });

    it('should throw error on send after commit', async () => {
      await transaction.commit();

      const record: ProducerRecord = {
        topic: 'test-topic',
        messages: [{ value: 'test-message' }]
      };

      await expect(transaction.send(record)).rejects.toThrow(
        'Transaction is not active'
      );
    });

    it('should throw error on commit after abort', async () => {
      await transaction.abort();

      await expect(transaction.commit()).rejects.toThrow(
        'Transaction is not active'
      );
    });

    it('should throw error on sendOffsets after commit', async () => {
      await transaction.commit();

      await expect(
        transaction.sendOffsets({}, 'test-group')
      ).rejects.toThrow('Transaction is not active');
    });
  });

  // ============================================================================
  // KAFKA CONSUMER TESTS
  // ============================================================================

  describe('KafkaConsumer', () => {
    let consumer: KafkaConsumer;
    const consumerConfig: ConsumerConfig = {
      id: 'test-consumer',
      name: 'Test Consumer',
      groupId: 'test-group',
      kafka: {
        clientId: 'test-client',
        brokers: ['localhost:9092']
      },
      topics: ['test-topic']
    };

    beforeEach(() => {
      consumer = new KafkaConsumer(consumerConfig);
    });

    it('should create a consumer instance', () => {
      expect(consumer).toBeInstanceOf(KafkaConsumer);
    });

    it('should connect successfully', async () => {
      await expect(consumer.connect()).resolves.toBeUndefined();
    });

    it('should subscribe to topics', async () => {
      await expect(consumer.subscribe(['topic-1', 'topic-2'])).resolves.toBeUndefined();
    });

    it('should subscribe to topic pattern', async () => {
      await expect(
        consumer.subscribe({ type: 'regex', pattern: 'test-.*' })
      ).resolves.toBeUndefined();
    });

    it('should run with message handler', async () => {
      const handler = {
        eachMessage: vi.fn()
      };

      await consumer.run(handler);

      expect(consumer.isRunning()).toBe(true);
    });

    it('should pause consumption', async () => {
      await expect(
        consumer.pause([{ topic: 'test-topic', partitions: [0, 1] }])
      ).resolves.toBeUndefined();
    });

    it('should resume consumption', async () => {
      await expect(
        consumer.resume([{ topic: 'test-topic', partitions: [0, 1] }])
      ).resolves.toBeUndefined();
    });

    it('should seek to offset', async () => {
      await expect(
        consumer.seek({ topic: 'test-topic', partition: 0, offset: '100' })
      ).resolves.toBeUndefined();
    });

    it('should disconnect successfully', async () => {
      await consumer.run({ eachMessage: vi.fn() });
      await consumer.disconnect();

      expect(consumer.isRunning()).toBe(false);
    });
  });

  // ============================================================================
  // SCHEMA REGISTRY CLIENT TESTS
  // ============================================================================

  describe('SchemaRegistryClient', () => {
    let schemaRegistry: SchemaRegistryClient;

    beforeEach(() => {
      schemaRegistry = new SchemaRegistryClient();
      schemaRegistry.configure({
        url: 'http://localhost:8081'
      });
    });

    it('should register a schema', async () => {
      const schema = {
        subject: 'test-subject',
        schema: '{"type":"record","name":"Test","fields":[]}'
      };

      const id = await schemaRegistry.register(schema);

      expect(id).toBe(1);
    });

    it('should get schema by ID', async () => {
      const schema = {
        subject: 'test-subject',
        schema: '{"type":"record"}'
      };

      const id = await schemaRegistry.register(schema);
      const retrieved = await schemaRegistry.getById(id);

      expect(retrieved.subject).toBe('test-subject');
      expect(retrieved.id).toBe(id);
    });

    it('should throw error for non-existent schema ID', async () => {
      await expect(schemaRegistry.getById(999)).rejects.toThrow(
        'Schema 999 not found'
      );
    });

    it('should get latest schema for subject', async () => {
      await schemaRegistry.register({ subject: 'test-subject', schema: 'v1' });
      await schemaRegistry.register({ subject: 'test-subject', schema: 'v2' });

      const latest = await schemaRegistry.getLatest('test-subject');

      expect(latest.schema).toBe('v2');
    });

    it('should throw error for non-existent subject', async () => {
      await expect(schemaRegistry.getLatest('unknown')).rejects.toThrow(
        'No schemas found for subject unknown'
      );
    });

    it('should check compatibility', async () => {
      const result = await schemaRegistry.checkCompatibility(
        'test-subject',
        '{"type":"record"}'
      );

      expect(result).toBe(true);
    });

    it('should evolve schema', async () => {
      const id = await schemaRegistry.evolve(
        'test-subject',
        '{"type":"record"}',
        'BACKWARD'
      );

      expect(id).toBeGreaterThan(0);
    });

    it('should get all versions for subject', async () => {
      await schemaRegistry.register({ subject: 'test-subject', schema: 'v1' });
      await schemaRegistry.register({ subject: 'test-subject', schema: 'v2' });

      const versions = await schemaRegistry.getAllVersions('test-subject');

      expect(versions).toEqual([1, 2]);
    });

    it('should delete subject', async () => {
      await schemaRegistry.register({ subject: 'test-subject', schema: 'v1' });
      await schemaRegistry.deleteSubject('test-subject');

      const versions = await schemaRegistry.getAllVersions('test-subject');
      expect(versions).toEqual([]);
    });
  });

  // ============================================================================
  // KAFKA ADMIN CLIENT TESTS
  // ============================================================================

  describe('KafkaAdminClient', () => {
    let admin: KafkaAdminClient;

    beforeEach(() => {
      admin = new KafkaAdminClient();
    });

    it('should create topics', async () => {
      const topics: TopicConfig[] = [
        { topic: 'topic-1', numPartitions: 3 },
        { topic: 'topic-2', numPartitions: 5 }
      ];

      await admin.createTopics(topics);
      const list = await admin.listTopics();

      expect(list).toContain('topic-1');
      expect(list).toContain('topic-2');
    });

    it('should delete topics', async () => {
      await admin.createTopics([{ topic: 'to-delete' }]);
      await admin.deleteTopics(['to-delete']);

      const list = await admin.listTopics();
      expect(list).not.toContain('to-delete');
    });

    it('should list topics', async () => {
      await admin.createTopics([{ topic: 'test-topic' }]);

      const topics = await admin.listTopics();

      expect(Array.isArray(topics)).toBe(true);
    });

    it('should describe topics', async () => {
      const descriptions = await admin.describeTopics(['test-topic']);

      expect(descriptions).toHaveLength(1);
      expect(descriptions[0].name).toBe('test-topic');
      expect(descriptions[0].partitions).toBeDefined();
    });

    it('should create partitions', async () => {
      await expect(
        admin.createPartitions([{ topic: 'test-topic', count: 10 }])
      ).resolves.toBeUndefined();
    });

    it('should describe cluster', async () => {
      const cluster = await admin.describeCluster();

      expect(cluster.clusterId).toBe('cluster-1');
      expect(cluster.brokers).toHaveLength(3);
      expect(cluster.controller).toBe(1);
    });

    it('should describe configs', async () => {
      const configs = await admin.describeConfigs([
        { type: 'topic', name: 'test-topic' }
      ]);

      expect(configs).toHaveLength(1);
      expect(configs[0].resources).toBeDefined();
    });

    it('should alter configs', async () => {
      await expect(
        admin.alterConfigs([
          {
            type: 'topic',
            name: 'test-topic',
            configEntries: [{ name: 'retention.ms', value: '604800000' }]
          }
        ])
      ).resolves.toBeUndefined();
    });

    it('should list consumer groups', async () => {
      const groups = await admin.listConsumerGroups();

      expect(Array.isArray(groups)).toBe(true);
    });

    it('should describe consumer groups', async () => {
      const descriptions = await admin.describeConsumerGroups(['test-group']);

      expect(descriptions).toHaveLength(1);
      expect(descriptions[0].groupId).toBe('test-group');
      expect(descriptions[0].state).toBe('Stable');
    });

    it('should delete consumer groups', async () => {
      await expect(
        admin.deleteConsumerGroups(['test-group'])
      ).resolves.toBeUndefined();
    });

    it('should list offsets', async () => {
      const offsets = await admin.listOffsets([
        { topic: 'test-topic', partition: 0 }
      ]);

      expect(offsets).toHaveLength(1);
      expect(offsets[0].topic).toBe('test-topic');
      expect(offsets[0].partition).toBe(0);
    });

    it('should alter consumer group offsets', async () => {
      await expect(
        admin.alterConsumerGroupOffsets('test-group', {
          'test-topic': { 0: '100' }
        })
      ).resolves.toBeUndefined();
    });

    it('should get topic metadata', async () => {
      await admin.createTopics([{ topic: 'test-topic' }]);
      const metadata = await admin.getTopicMetadata('test-topic');

      expect(metadata).not.toBeNull();
      expect(metadata?.name).toBe('test-topic');
    });

    it('should return null for non-existent topic metadata', async () => {
      const metadata = await admin.getTopicMetadata('non-existent');

      expect(metadata).toBeNull();
    });

    it('should increase partitions', async () => {
      await expect(
        admin.increasePartitions('test-topic', 10)
      ).resolves.toBeUndefined();
    });

    it('should reset consumer group offsets', async () => {
      await expect(
        admin.resetConsumerGroupOffsets('test-group', 'test-topic', {
          to: 'earliest'
        })
      ).resolves.toBeUndefined();
    });
  });

  // ============================================================================
  // CLUSTER MANAGER TESTS
  // ============================================================================

  describe('ClusterManager', () => {
    let clusterManager: ClusterManager;

    beforeEach(() => {
      clusterManager = new ClusterManager();
    });

    it('should get cluster info', async () => {
      const info = await clusterManager.getClusterInfo();

      expect(info.clusterId).toBeDefined();
      expect(info.brokers).toBeDefined();
    });

    it('should get broker count', async () => {
      const count = await clusterManager.getBrokerCount();

      expect(count).toBe(3);
    });

    it('should get topic count', async () => {
      const count = await clusterManager.getTopicCount();

      expect(typeof count).toBe('number');
    });

    it('should get controller broker', async () => {
      const controller = await clusterManager.getControllerBroker();

      expect(controller).toBe(1);
    });

    it('should check cluster health', async () => {
      const isHealthy = await clusterManager.isClusterHealthy();

      expect(isHealthy).toBe(true);
    });
  });

  // ============================================================================
  // TOPIC MANAGER TESTS
  // ============================================================================

  describe('TopicManager', () => {
    let topicManager: TopicManager;

    beforeEach(() => {
      topicManager = new TopicManager();
    });

    it('should create a topic', async () => {
      await expect(
        topicManager.createTopic('new-topic', 3, 2)
      ).resolves.toBeUndefined();
    });

    it('should delete a topic', async () => {
      await expect(
        topicManager.deleteTopic('test-topic')
      ).resolves.toBeUndefined();
    });

    it('should check if topic exists', async () => {
      await topicManager.createTopic('existing-topic');

      const exists = await topicManager.topicExists('existing-topic');
      expect(exists).toBe(true);
    });

    it('should get topic partition count', async () => {
      const count = await topicManager.getTopicPartitionCount('test-topic');

      expect(typeof count).toBe('number');
    });

    it('should list all topics', async () => {
      const topics = await topicManager.listAllTopics();

      expect(Array.isArray(topics)).toBe(true);
    });
  });

  // ============================================================================
  // CONSUMER GROUP MANAGER TESTS
  // ============================================================================

  describe('ConsumerGroupManager', () => {
    let groupManager: ConsumerGroupManager;

    beforeEach(() => {
      groupManager = new ConsumerGroupManager();
    });

    it('should list groups', async () => {
      const groups = await groupManager.listGroups();

      expect(Array.isArray(groups)).toBe(true);
    });

    it('should describe a group', async () => {
      const description = await groupManager.describeGroup('test-group');

      expect(description?.groupId).toBe('test-group');
    });

    it('should delete a group', async () => {
      await expect(
        groupManager.deleteGroup('test-group')
      ).resolves.toBeUndefined();
    });

    it('should get group state', async () => {
      const state = await groupManager.getGroupState('test-group');

      expect(state).toBe('Stable');
    });

    it('should get member count', async () => {
      const count = await groupManager.getMemberCount('test-group');

      expect(typeof count).toBe('number');
    });
  });

  // ============================================================================
  // STREAM PROCESSOR TESTS
  // ============================================================================

  describe('KafkaStreamProcessor', () => {
    let processor: KafkaStreamProcessor;
    const streamConfig: StreamConfig = {
      id: 'test-stream',
      name: 'Test Stream',
      kafka: {
        clientId: 'test-client',
        brokers: ['localhost:9092']
      },
      applicationId: 'test-app',
      topology: new KafkaTopologyBuilder(),
      processing: {
        guarantee: 'exactly_once'
      }
    };

    beforeEach(() => {
      processor = new KafkaStreamProcessor(streamConfig);
    });

    it('should start processing', async () => {
      await processor.start();

      expect(processor.isRunning()).toBe(true);
    });

    it('should stop processing', async () => {
      await processor.start();
      await processor.stop();

      expect(processor.isRunning()).toBe(false);
    });

    it('should process records', async () => {
      await processor.start();

      await expect(
        processor.process({
          key: 'test-key',
          value: 'test-value',
          timestamp: Date.now()
        })
      ).resolves.toBeUndefined();
    });
  });

  // ============================================================================
  // TOPOLOGY BUILDER TESTS
  // ============================================================================

  describe('KafkaTopologyBuilder', () => {
    let builder: KafkaTopologyBuilder;

    beforeEach(() => {
      builder = new KafkaTopologyBuilder();
    });

    it('should create source node', () => {
      const source = builder.source(['topic-1', 'topic-2']);

      expect(source).toBeInstanceOf(KafkaStreamNode);
      expect(source.type).toBe('source');
    });

    it('should create processor node', () => {
      const processor = builder.processor(
        'processor-1',
        {
          init: vi.fn(),
          process: vi.fn(),
          close: vi.fn()
        },
        ['source']
      );

      expect(processor).toBeInstanceOf(KafkaStreamNode);
      expect(processor.type).toBe('processor');
    });

    it('should create sink node', () => {
      const sink = builder.sink('output-topic', ['processor']);

      expect(sink).toBeInstanceOf(KafkaStreamNode);
      expect(sink.type).toBe('sink');
    });

    it('should create branch nodes', () => {
      const branches = builder.branch(
        (key, value) => value !== null,
        ['branch-1', 'branch-2']
      );

      expect(branches).toHaveLength(2);
    });

    it('should merge streams', () => {
      const node1 = builder.source(['topic-1']);
      const node2 = builder.source(['topic-2']);

      const merged = builder.merge([node1, node2]);

      expect(merged).toBeInstanceOf(KafkaStreamNode);
    });

    it('should create table', () => {
      const table = builder.table('table-topic');

      expect(table).toBeInstanceOf(KafkaTable);
    });

    it('should create global table', () => {
      const globalTable = builder.globalTable('global-topic');

      expect(globalTable).toBeInstanceOf(KafkaGlobalTable);
      expect(globalTable.queryableStoreName).toBeDefined();
    });
  });

  // ============================================================================
  // KAFKA TABLE TESTS
  // ============================================================================

  describe('KafkaTable', () => {
    let table: KafkaTable;

    beforeEach(() => {
      table = new KafkaTable('test-table');
    });

    it('should filter table', () => {
      const filtered = table.filter((key, value) => value !== null);

      expect(filtered).toBeInstanceOf(KafkaTable);
      expect(filtered.name).toContain('filtered');
    });

    it('should map values', () => {
      const mapped = table.mapValues((value) => value);

      expect(mapped).toBeInstanceOf(KafkaTable);
      expect(mapped.name).toContain('mapped');
    });

    it('should join tables', () => {
      const other = new KafkaTable('other-table');
      const joined = table.join(other, (v1, v2) => ({ ...v1 as object, ...v2 as object }));

      expect(joined).toBeInstanceOf(KafkaTable);
      expect(joined.name).toContain('joined');
    });

    it('should left join tables', () => {
      const other = new KafkaTable('other-table');
      const joined = table.leftJoin(other, (v1, v2) => v1);

      expect(joined).toBeInstanceOf(KafkaTable);
      expect(joined.name).toContain('leftJoined');
    });

    it('should aggregate table', () => {
      const aggregated = table.aggregate(
        () => 0,
        (key, value, agg) => (agg as number) + 1
      );

      expect(aggregated).toBeInstanceOf(KafkaTable);
      expect(aggregated.name).toContain('aggregated');
    });

    it('should convert to stream', () => {
      const stream = table.toStream();

      expect(stream).toBeInstanceOf(KafkaStreamImpl);
    });
  });

  // ============================================================================
  // KAFKA STREAM IMPL TESTS
  // ============================================================================

  describe('KafkaStreamImpl', () => {
    let stream: KafkaStreamImpl;

    beforeEach(() => {
      stream = new KafkaStreamImpl('test-stream');
    });

    it('should filter stream', () => {
      const filtered = stream.filter((key, value) => value !== null);

      expect(filtered).toBeInstanceOf(KafkaStreamImpl);
    });

    it('should map stream', () => {
      const mapped = stream.map((key, value) => [key, value]);

      expect(mapped).toBeInstanceOf(KafkaStreamImpl);
    });

    it('should flatMap stream', () => {
      const flatMapped = stream.flatMap((key, value) => [[key, value]]);

      expect(flatMapped).toBeInstanceOf(KafkaStreamImpl);
    });

    it('should branch stream', () => {
      const branches = stream.branch([
        (key, value) => value !== null,
        (key, value) => value === null
      ]);

      expect(branches).toHaveLength(2);
    });

    it('should merge streams', () => {
      const other = new KafkaStreamImpl('other-stream');
      const merged = stream.merge(other);

      expect(merged).toBeInstanceOf(KafkaStreamImpl);
    });

    it('should peek at stream', () => {
      const peeked = stream.peek((key, value) => {});

      expect(peeked).toBe(stream);
    });

    it('should group by key', () => {
      const grouped = stream.groupByKey();

      expect(grouped).toBeInstanceOf(KafkaGroupedStream);
    });

    it('should group by selector', () => {
      const grouped = stream.groupBy((key, value) => key);

      expect(grouped).toBeInstanceOf(KafkaGroupedStream);
    });
  });

  // ============================================================================
  // MONITORING SERVICE TESTS
  // ============================================================================

  describe('MonitoringService', () => {
    let monitoring: MonitoringService;
    let metrics: any;

    beforeEach(() => {
      metrics = {
        errors: { totalErrors: 0 }
      };
      monitoring = new MonitoringService(metrics);
    });

    it('should record producer events', () => {
      monitoring.recordProducerEvent({ topic: 'test', count: 1 });
      // No throw expected
    });

    it('should record consumer events', () => {
      monitoring.recordConsumerEvent({ topic: 'test', count: 1 });
      // No throw expected
    });

    it('should record stream events', () => {
      monitoring.recordStreamEvent({ streamId: 'test' });
      // No throw expected
    });

    it('should record errors and increment counter', () => {
      monitoring.recordError(new Error('Test error'));

      expect(metrics.errors.totalErrors).toBe(1);
    });

    it('should collect metrics', () => {
      monitoring.collectMetrics();
      // No throw expected
    });
  });

  // ============================================================================
  // HEALTH CHECKER TESTS
  // ============================================================================

  describe('HealthChecker', () => {
    let healthChecker: HealthChecker;

    beforeEach(() => {
      healthChecker = new HealthChecker();
    });

    it('should check system health', async () => {
      const mockSystem = {
        getProducers: () => new Map([['p1', {}]]),
        getConsumers: () => new Map([['c1', {}]]),
        getStreams: () => new Map([['s1', {}]])
      };

      const health = await healthChecker.checkHealth(mockSystem);

      expect(health.status).toBe('healthy');
      expect(health.producers).toBe(1);
      expect(health.consumers).toBe(1);
      expect(health.streams).toBe(1);
      expect(health.timestamp).toBeDefined();
    });

    it('should return healthy status for empty system', async () => {
      const mockSystem = {
        getProducers: () => new Map(),
        getConsumers: () => new Map(),
        getStreams: () => new Map()
      };

      const health = await healthChecker.checkHealth(mockSystem);

      expect(health.status).toBe('healthy');
      expect(health.producers).toBe(0);
    });
  });

  // ============================================================================
  // KAFKA GROUPED STREAM TESTS
  // ============================================================================

  describe('KafkaGroupedStream', () => {
    let grouped: KafkaGroupedStream;

    beforeEach(() => {
      grouped = new KafkaGroupedStream('test-grouped');
    });

    it('should count grouped stream', () => {
      const counted = grouped.count();

      expect(counted).toBeInstanceOf(KafkaTable);
    });

    it('should reduce grouped stream', () => {
      const reduced = grouped.reduce((v1, v2) => v1);

      expect(reduced).toBeInstanceOf(KafkaTable);
    });

    it('should aggregate grouped stream', () => {
      const aggregated = grouped.aggregate(
        () => 0,
        (key, value, agg) => (agg as number) + 1
      );

      expect(aggregated).toBeInstanceOf(KafkaTable);
    });

    it('should window grouped stream', () => {
      const windowed = grouped.windowedBy({ size: 60000 });

      expect(windowed).toBeInstanceOf(KafkaTimeWindowedStream);
    });
  });

  // ============================================================================
  // KAFKA TIME WINDOWED STREAM TESTS
  // ============================================================================

  describe('KafkaTimeWindowedStream', () => {
    let windowed: KafkaTimeWindowedStream;

    beforeEach(() => {
      windowed = new KafkaTimeWindowedStream('test-windowed');
    });

    it('should count windowed stream', () => {
      const counted = windowed.count();

      expect(counted).toBeInstanceOf(KafkaTable);
    });

    it('should reduce windowed stream', () => {
      const reduced = windowed.reduce((v1, v2) => v1);

      expect(reduced).toBeInstanceOf(KafkaTable);
    });

    it('should aggregate windowed stream', () => {
      const aggregated = windowed.aggregate(
        () => 0,
        (key, value, agg) => (agg as number) + 1
      );

      expect(aggregated).toBeInstanceOf(KafkaTable);
    });
  });

  // ============================================================================
  // KAFKA STREAM NODE TESTS
  // ============================================================================

  describe('KafkaStreamNode', () => {
    it('should process records', async () => {
      const node = new KafkaStreamNode('test-node', 'processor');

      await expect(
        node.process({ key: 'key', value: 'value', timestamp: Date.now() })
      ).resolves.toBeUndefined();
    });

    it('should forward records', () => {
      const node = new KafkaStreamNode('test-node', 'processor');

      expect(() =>
        node.forward({ key: 'key', value: 'value', timestamp: Date.now() }, 'next')
      ).not.toThrow();
    });
  });
});
