/**
 * Kafka Integration Module
 * Barrel export for all Kafka integration components
 */

// Export types
export * from './types'

// Export producer classes
export {
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
} from './KafkaProducer'

// Export consumer classes
export {
  KafkaConsumer,
  SchemaRegistryClient,
  MonitoringService,
  HealthChecker
} from './KafkaConsumer'

// Export admin classes
export {
  KafkaAdminClient,
  ClusterManager,
  TopicManager,
  ConsumerGroupManager
} from './KafkaAdmin'
