/**
 * Messaging Patterns (10 patterns)
 * Communication and message passing patterns
 */

import type { PatternDefinition } from '../../types/patterns';
import {
  createPatternDefinition,
  createPatternStructure,
  createEdgePattern,
  PatternConstraints,
} from '../PatternDefinition';

export const CHAIN_OF_RESPONSIBILITY: PatternDefinition = createPatternDefinition({
  id: 'chain-of-responsibility',
  name: 'Chain of Responsibility',
  category: 'messaging',
  complexity: 'intermediate',
  description:
    'Pass requests along a chain of handlers where each handler decides to process or pass it to the next',
  problem: 'Need to process a request through multiple handlers without coupling sender to receivers',
  solution: 'Create a linear chain of processing nodes where each can handle or forward the request',
  benefits: [
    'Decouples senders from receivers',
    'Flexible request handling',
    'Easy to add new handlers',
    'Single responsibility principle',
  ],
  tradeoffs: [
    'Request might not be handled',
    'Can be hard to debug',
    'Performance overhead from chain traversal',
  ],
  useCases: [
    'Request validation pipeline',
    'Authentication and authorization',
    'Event processing',
    'Logging and monitoring',
  ],
  tags: ['messaging', 'sequential', 'decoupling', 'pipeline'],
  structure: createPatternStructure({
    minNodes: 3,
    maxNodes: 10,
    requiredNodeTypes: ['filter', 'switch'],
    optionalNodeTypes: ['http-request', 'function'],
    requiredEdges: [
      createEdgePattern('handler', 'handler', 'sequential'),
      createEdgePattern('handler', 'next', 'conditional'),
    ],
    topology: 'linear',
    constraints: [PatternConstraints.nodeCount(3, 10)],
  }),
  examples: [],
  antiPatterns: ['god-workflow', 'no-error-handling'],
  relatedPatterns: ['pipeline', 'decorator'],
  documentation: 'Each node in the chain can process the request or pass it to the next handler.',
});

export const EVENT_DRIVEN: PatternDefinition = createPatternDefinition({
  id: 'event-driven',
  name: 'Event-Driven Architecture',
  category: 'messaging',
  complexity: 'advanced',
  description: 'Components communicate through events, promoting loose coupling and scalability',
  problem: 'Need to build scalable, loosely coupled systems that react to events',
  solution:
    'Use triggers and webhooks to emit events, with multiple subscribers reacting asynchronously',
  benefits: [
    'Loose coupling between components',
    'High scalability',
    'Real-time processing',
    'Easy to add new event handlers',
  ],
  tradeoffs: [
    'Complex debugging',
    'Eventual consistency',
    'Event ordering challenges',
    'Increased infrastructure complexity',
  ],
  useCases: [
    'Real-time notifications',
    'Microservices communication',
    'IoT data processing',
    'User activity tracking',
  ],
  tags: ['messaging', 'async', 'scalability', 'decoupling'],
  structure: createPatternStructure({
    minNodes: 3,
    requiredNodeTypes: ['webhook', 'trigger'],
    optionalNodeTypes: ['http-request', 'email', 'slack'],
    requiredEdges: [createEdgePattern('trigger', 'handler', 'parallel')],
    topology: 'star',
    constraints: [PatternConstraints.requiresNodeType('webhook')],
  }),
  examples: [],
  antiPatterns: ['tight-coupling', 'synchronous-everywhere'],
  relatedPatterns: ['pub-sub', 'observer', 'saga'],
  documentation: 'Events trigger multiple independent workflows that can execute in parallel.',
});

export const PUB_SUB: PatternDefinition = createPatternDefinition({
  id: 'pub-sub',
  name: 'Publish-Subscribe',
  category: 'messaging',
  complexity: 'intermediate',
  description: 'Publishers send messages to channels, subscribers receive messages from channels',
  problem: 'Need to broadcast messages to multiple interested parties without tight coupling',
  solution:
    'Use message broker pattern where publishers send to topics and subscribers listen to topics',
  benefits: [
    'Complete decoupling of publishers and subscribers',
    'Dynamic subscriber addition',
    'Scalable message distribution',
    'Filter-based subscriptions',
  ],
  tradeoffs: [
    'Message delivery guarantees',
    'Increased latency',
    'Requires message broker',
    'Complex error handling',
  ],
  useCases: [
    'News feeds and updates',
    'Chat applications',
    'Stock price updates',
    'Notification systems',
  ],
  tags: ['messaging', 'broker', 'async', 'broadcast'],
  structure: createPatternStructure({
    minNodes: 3,
    requiredNodeTypes: ['webhook', 'http-request'],
    optionalNodeTypes: ['kafka', 'pubsub', 'sns'],
    requiredEdges: [createEdgePattern('publisher', 'subscriber', 'parallel')],
    topology: 'star',
    constraints: [PatternConstraints.nodeCount(3)],
  }),
  examples: [],
  antiPatterns: ['point-to-point-everywhere'],
  relatedPatterns: ['event-driven', 'observer', 'message-queue'],
  documentation: 'Central topic distributes messages to multiple subscribers.',
});

export const REQUEST_REPLY: PatternDefinition = createPatternDefinition({
  id: 'request-reply',
  name: 'Request-Reply',
  category: 'messaging',
  complexity: 'beginner',
  description: 'Send a request and wait for a response in a synchronous or asynchronous manner',
  problem: 'Need bidirectional communication where sender expects a response',
  solution: 'Use HTTP request/response pattern with correlation IDs for async replies',
  benefits: [
    'Simple to understand',
    'Direct communication',
    'Built-in acknowledgment',
    'Easy to implement',
  ],
  tradeoffs: ['Tight coupling', 'Blocking operation', 'Timeout handling needed', 'Less scalable'],
  useCases: ['API calls', 'Database queries', 'RPC calls', 'Validation requests'],
  tags: ['messaging', 'sync', 'bidirectional', 'simple'],
  structure: createPatternStructure({
    minNodes: 2,
    maxNodes: 3,
    requiredNodeTypes: ['http-request'],
    optionalNodeTypes: ['filter', 'set'],
    requiredEdges: [createEdgePattern('request', 'process', 'sequential')],
    topology: 'linear',
    constraints: [PatternConstraints.nodeCount(2, 3)],
  }),
  examples: [],
  antiPatterns: ['blocking-everywhere', 'no-timeout'],
  relatedPatterns: ['api-gateway', 'adapter'],
  documentation: 'Simple request-response pattern for synchronous communication.',
});

export const MESSAGE_QUEUE: PatternDefinition = createPatternDefinition({
  id: 'message-queue',
  name: 'Message Queue',
  category: 'messaging',
  complexity: 'intermediate',
  description: 'Use queues to buffer messages between producers and consumers asynchronously',
  problem: 'Need to decouple producers from consumers and handle varying processing rates',
  solution: 'Implement queue-based messaging with producers enqueuing and consumers dequeuing',
  benefits: [
    'Load leveling',
    'Decoupled components',
    'Guaranteed delivery',
    'Peak load handling',
  ],
  tradeoffs: [
    'Increased complexity',
    'Latency from queuing',
    'Requires queue infrastructure',
    'Message ordering challenges',
  ],
  useCases: [
    'Background job processing',
    'Order processing',
    'Email sending',
    'Batch operations',
  ],
  tags: ['messaging', 'async', 'queue', 'buffering'],
  structure: createPatternStructure({
    minNodes: 3,
    requiredNodeTypes: ['webhook'],
    optionalNodeTypes: ['sqs', 'rabbitmq', 'redis'],
    requiredEdges: [createEdgePattern('producer', 'queue', 'sequential')],
    topology: 'linear',
    constraints: [PatternConstraints.nodeCount(3)],
  }),
  examples: [],
  antiPatterns: ['synchronous-everywhere', 'no-dead-letter-queue'],
  relatedPatterns: ['async-messaging', 'work-queue'],
  documentation: 'Queue buffers messages between producers and consumers.',
});

export const PIPES_AND_FILTERS: PatternDefinition = createPatternDefinition({
  id: 'pipes-and-filters',
  name: 'Pipes and Filters',
  category: 'messaging',
  complexity: 'intermediate',
  description: 'Process data through a series of independent processing steps (filters)',
  problem: 'Need to process data through multiple transformation stages',
  solution: 'Chain filters together with pipes carrying data between them',
  benefits: [
    'Modular design',
    'Reusable filters',
    'Easy to add/remove filters',
    'Parallel processing possible',
  ],
  tradeoffs: [
    'Overhead from data passing',
    'Complex error handling',
    'Debugging difficulties',
    'Performance considerations',
  ],
  useCases: [
    'Data transformation pipelines',
    'ETL processes',
    'Image processing',
    'Log processing',
  ],
  tags: ['messaging', 'pipeline', 'transformation', 'modular'],
  structure: createPatternStructure({
    minNodes: 3,
    requiredNodeTypes: ['filter', 'set'],
    optionalNodeTypes: ['function', 'transform'],
    requiredEdges: [createEdgePattern('filter', 'filter', 'sequential')],
    topology: 'linear',
    constraints: [PatternConstraints.nodeCount(3)],
  }),
  examples: [],
  antiPatterns: ['monolithic-transformation', 'data-coupling'],
  relatedPatterns: ['chain-of-responsibility', 'decorator'],
  documentation: 'Data flows through independent filters connected by pipes.',
});

export const CONTENT_BASED_ROUTER: PatternDefinition = createPatternDefinition({
  id: 'content-based-router',
  name: 'Content-Based Router',
  category: 'messaging',
  complexity: 'intermediate',
  description: 'Route messages to different destinations based on message content',
  problem: 'Need to route messages to different handlers based on their content',
  solution: 'Use switch or if nodes to inspect message content and route accordingly',
  benefits: [
    'Flexible routing logic',
    'Decoupled routing',
    'Easy to add new routes',
    'Content-aware processing',
  ],
  tradeoffs: [
    'Complex routing logic',
    'Performance overhead',
    'Maintenance of routing rules',
    'Testing complexity',
  ],
  useCases: [
    'Order routing by type',
    'Alert routing by severity',
    'Request routing by region',
    'Priority-based routing',
  ],
  tags: ['messaging', 'routing', 'conditional', 'dynamic'],
  structure: createPatternStructure({
    minNodes: 3,
    requiredNodeTypes: ['switch', 'if'],
    optionalNodeTypes: ['filter', 'http-request'],
    requiredEdges: [createEdgePattern('router', 'handler', 'conditional')],
    topology: 'branching',
    constraints: [PatternConstraints.requiresNodeType('switch')],
  }),
  examples: [],
  antiPatterns: ['hardcoded-routing', 'god-workflow'],
  relatedPatterns: ['message-filter', 'dynamic-router'],
  documentation: 'Routes messages based on content inspection.',
});

export const MESSAGE_TRANSLATOR: PatternDefinition = createPatternDefinition({
  id: 'message-translator',
  name: 'Message Translator',
  category: 'messaging',
  complexity: 'beginner',
  description: 'Transform messages from one format to another to enable communication',
  problem: 'Need to integrate systems with different data formats',
  solution: 'Use transformation nodes to convert between formats',
  benefits: [
    'System interoperability',
    'Format independence',
    'Reusable transformations',
    'Clear separation of concerns',
  ],
  tradeoffs: [
    'Transformation overhead',
    'Maintenance of mappings',
    'Version compatibility',
    'Data loss potential',
  ],
  useCases: [
    'API response transformation',
    'Database format conversion',
    'Protocol translation',
    'Legacy system integration',
  ],
  tags: ['messaging', 'transformation', 'integration', 'format'],
  structure: createPatternStructure({
    minNodes: 2,
    requiredNodeTypes: ['set', 'function'],
    optionalNodeTypes: ['json-transform', 'xml-transform'],
    requiredEdges: [createEdgePattern('input', 'transform', 'sequential')],
    topology: 'linear',
    constraints: [PatternConstraints.nodeCount(2)],
  }),
  examples: [],
  antiPatterns: ['no-validation', 'lossy-transformation'],
  relatedPatterns: ['adapter', 'facade'],
  documentation: 'Converts messages between different formats.',
});

export const SCATTER_GATHER: PatternDefinition = createPatternDefinition({
  id: 'scatter-gather',
  name: 'Scatter-Gather',
  category: 'messaging',
  complexity: 'advanced',
  description: 'Broadcast request to multiple recipients and aggregate responses',
  problem: 'Need to query multiple sources and combine results',
  solution: 'Split request to multiple handlers in parallel, then merge results',
  benefits: [
    'Parallel processing',
    'Faster response times',
    'Comprehensive results',
    'Fault tolerance',
  ],
  tradeoffs: [
    'Complex aggregation logic',
    'Timeout handling',
    'Partial failure handling',
    'Increased resource usage',
  ],
  useCases: [
    'Price comparison',
    'Multi-database queries',
    'Parallel API calls',
    'Distributed search',
  ],
  tags: ['messaging', 'parallel', 'aggregation', 'fan-out'],
  structure: createPatternStructure({
    minNodes: 4,
    requiredNodeTypes: ['split', 'merge'],
    optionalNodeTypes: ['http-request', 'aggregate'],
    requiredEdges: [
      createEdgePattern('split', 'handler', 'parallel'),
      createEdgePattern('handler', 'merge', 'sequential'),
    ],
    topology: 'dag',
    constraints: [PatternConstraints.nodeCount(4)],
  }),
  examples: [],
  antiPatterns: ['sequential-when-parallel-possible', 'no-timeout'],
  relatedPatterns: ['fan-out-fan-in', 'aggregator'],
  documentation: 'Broadcasts to multiple handlers and aggregates responses.',
});

export const CORRELATION_IDENTIFIER: PatternDefinition = createPatternDefinition({
  id: 'correlation-identifier',
  name: 'Correlation Identifier',
  category: 'messaging',
  complexity: 'intermediate',
  description: 'Track related messages using a unique identifier across the system',
  problem: 'Need to correlate requests and responses in async systems',
  solution: 'Add correlation ID to messages and use it to match related messages',
  benefits: [
    'Request tracking',
    'Distributed tracing',
    'Easier debugging',
    'Audit trail',
  ],
  tradeoffs: [
    'ID generation overhead',
    'Storage requirements',
    'Propagation complexity',
    'ID collision handling',
  ],
  useCases: [
    'Distributed tracing',
    'Request tracking',
    'Async request-reply',
    'Audit logging',
  ],
  tags: ['messaging', 'tracking', 'tracing', 'correlation'],
  structure: createPatternStructure({
    minNodes: 2,
    requiredNodeTypes: ['set', 'function'],
    optionalNodeTypes: ['http-request'],
    requiredEdges: [createEdgePattern('generate-id', 'use-id', 'sequential')],
    topology: 'linear',
    constraints: [PatternConstraints.nodeCount(2)],
  }),
  examples: [],
  antiPatterns: ['no-tracking', 'missing-correlation-id'],
  relatedPatterns: ['request-reply', 'message-queue'],
  documentation: 'Uses correlation IDs to track related messages.',
});

/**
 * All messaging patterns
 */
export const MESSAGING_PATTERNS: PatternDefinition[] = [
  CHAIN_OF_RESPONSIBILITY,
  EVENT_DRIVEN,
  PUB_SUB,
  REQUEST_REPLY,
  MESSAGE_QUEUE,
  PIPES_AND_FILTERS,
  CONTENT_BASED_ROUTER,
  MESSAGE_TRANSLATOR,
  SCATTER_GATHER,
  CORRELATION_IDENTIFIER,
];
