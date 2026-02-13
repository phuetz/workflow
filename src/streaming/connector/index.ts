/**
 * Stream Connector - Barrel Export
 *
 * Exports all platform-specific connectors and types
 */

// Types
export {
  PlatformClient,
  BatchProducer,
  ReconnectConfig,
  DEFAULT_RECONNECT_CONFIG,
  createInitialMetrics,
  handleReconnectWithBackoff,
  StreamConfig,
  StreamEvent,
  ThroughputMetrics,
} from './types';

// Platform Connectors
export { KafkaClient } from './KafkaConnector';
export { PulsarClient } from './PulsarConnector';
export { KinesisClient } from './KinesisConnector';
export { PubSubClient } from './PubSubConnector';
export { EventHubsClient } from './EventHubsConnector';
export { RedisStreamClient } from './RedisStreamConnector';
export { NatsClient } from './NatsConnector';
