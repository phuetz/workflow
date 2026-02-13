# Node Reference Documentation

Complete reference for all workflow nodes in the platform.

## Table of Contents

- [Cloud Platforms](#cloud-platforms)
  - [AWS](#aws)
  - [Google Cloud](#google-cloud)
  - [Azure](#azure)
- [Databases](#databases)
- [Communication](#communication)
- [Data Processing](#data-processing)
- [Integration Categories](#integration-categories)

---

## Cloud Platforms

### AWS

#### AWS Lambda
**Category:** Cloud / Serverless
**Type:** `lambda`, `awsLambda`

Execute serverless functions on AWS Lambda.

**Operations:**
- **Invoke Function**: Call a Lambda function synchronously or asynchronously
- **Create Function**: Deploy a new Lambda function
- **Update Function Code**: Update function code
- **Delete Function**: Remove a Lambda function
- **List Functions**: Get all Lambda functions in region
- **Get Configuration**: Retrieve function configuration
- **Update Configuration**: Modify function settings

**Configuration:**
- `functionName` (required): Lambda function name or ARN
- `invocationType`: `RequestResponse` (sync), `Event` (async), or `DryRun`
- `payload`: JSON payload to pass to function
- `qualifier`: Version or alias (default: `$LATEST`)

**Authentication:** AWS Access Key ID, Secret Access Key, Region

**Example:**
```json
{
  "operation": "invoke",
  "functionName": "my-function",
  "invocationType": "RequestResponse",
  "payload": "{\"userId\": \"123\", \"action\": \"process\"}"
}
```

**Best Practices:**
- Use IAM roles with minimal required permissions
- Implement retry logic for transient failures
- Monitor invocation errors and throttling
- Use environment variables for configuration

---

#### AWS SQS
**Category:** Cloud / Messaging
**Type:** `sqs`, `awsSQS`

Amazon Simple Queue Service for reliable message queuing.

**Operations:**
- **Send Message**: Add message to queue
- **Send Message Batch**: Send up to 10 messages at once
- **Receive Message**: Pull messages from queue
- **Delete Message**: Remove processed message
- **Delete Message Batch**: Remove multiple messages
- **Change Message Visibility**: Extend processing time
- **Purge Queue**: Delete all messages
- **Get Queue Attributes**: Get queue metadata
- **Create/Delete Queue**: Queue lifecycle management

**Configuration:**
- `queueUrl` (required): Full SQS queue URL
- `messageBody`: Message content (max 256 KB)
- `delaySeconds`: Delay delivery (0-900 seconds)
- `messageGroupId`: For FIFO queues (ordering)
- `maxMessages`: Messages to receive (1-10)
- `visibilityTimeout`: Processing time (0-43200 seconds)
- `waitTimeSeconds`: Long polling (0-20 seconds)

**Authentication:** AWS Access Key ID, Secret Access Key, Region

**Queue Types:**
- **Standard Queue**: At-least-once delivery, best-effort ordering
- **FIFO Queue**: Exactly-once delivery, strict ordering (requires messageGroupId)

**Best Practices:**
- Use long polling (waitTimeSeconds=20) for cost efficiency
- Implement dead letter queues for failed messages
- Set appropriate visibility timeout based on processing time
- Use batch operations for high throughput

---

#### AWS SNS
**Category:** Cloud / Pub/Sub
**Type:** `sns`, `awsSNS`

Amazon Simple Notification Service for pub/sub messaging.

**Operations:**
- **Publish Message**: Send message to topic or endpoint
- **Create Topic**: Create new SNS topic
- **Delete Topic**: Remove SNS topic
- **Subscribe**: Subscribe endpoint to topic
- **Unsubscribe**: Remove subscription
- **List Topics/Subscriptions**: Discovery

**Configuration:**
- `topicArn`: Topic Amazon Resource Name
- `targetArn`: For direct mobile push
- `phoneNumber`: For direct SMS (E.164 format)
- `message`: Message content (max 256 KB)
- `subject`: Email subject line
- `messageStructure`: `string` or `json` (protocol-specific)

**Supported Protocols:**
- HTTP/HTTPS endpoints
- Email/Email-JSON
- SMS
- SQS queues
- AWS Lambda functions
- Mobile push (iOS, Android)

**Best Practices:**
- Use message filtering to reduce unnecessary deliveries
- Implement retry logic in subscribers
- Monitor failed deliveries
- Use VPC endpoints for private communication

---

#### AWS DynamoDB
**Category:** Database / NoSQL
**Type:** `dynamodb`, `awsDynamoDB`

Amazon DynamoDB - serverless NoSQL database.

**Operations:**
- **Put Item**: Create or replace item
- **Get Item**: Retrieve item by key
- **Update Item**: Modify item attributes
- **Delete Item**: Remove item
- **Query**: Efficient partition key search
- **Scan**: Full table scan (use sparingly)
- **Batch Get/Write**: Bulk operations
- **Create/Delete Table**: Table management

**Configuration:**
- `tableName` (required): DynamoDB table name
- `key`: Primary key in DynamoDB format
- `item`: Document with type descriptors
- `conditionExpression`: Conditional operations
- `consistentRead`: Strong consistency (higher cost)

**Data Types:**
- `S`: String
- `N`: Number
- `B`: Binary
- `BOOL`: Boolean
- `NULL`: Null
- `M`: Map (object)
- `L`: List (array)
- `SS`, `NS`, `BS`: Sets

**Best Practices:**
- Design partition key for even distribution
- Use sparse indexes for queries
- Enable point-in-time recovery
- Use DynamoDB Streams for event-driven architectures
- Implement exponential backoff for throttled requests

---

### Google Cloud

#### Google Cloud Storage
**Category:** Cloud / Object Storage
**Type:** `cloudStorage`, `gcs`, `googleCloudStorage`

Object storage for Google Cloud Platform.

**Operations:**
- **Upload Object**: Store file in bucket
- **Download Object**: Retrieve file
- **Delete Object**: Remove file
- **List Objects**: Browse bucket contents
- **Get Metadata**: File properties
- **Copy/Move Object**: File management
- **Create/Delete Bucket**: Bucket lifecycle

**Configuration:**
- `bucketName` (required): GCS bucket name
- `objectName`: Object path (supports folders with /)
- `fileData`: Content to upload
- `contentType`: MIME type
- `makePublic`: Public accessibility flag

**Storage Classes:**
- **Standard**: Frequent access
- **Nearline**: Once per month access
- **Coldline**: Once per quarter access
- **Archive**: Long-term archival

**Best Practices:**
- Use lifecycle policies for cost optimization
- Enable versioning for important data
- Implement signed URLs for temporary access
- Use customer-managed encryption keys (CMEK)

---

#### Google Cloud Pub/Sub
**Category:** Cloud / Messaging
**Type:** `pubsub`, `googlePubSub`

Messaging and event streaming service.

**Operations:**
- **Publish Message**: Send to topic
- **Pull Messages**: Receive from subscription
- **Create/Delete Topic**: Topic management
- **Create/Delete Subscription**: Subscription management
- **List Topics/Subscriptions**: Discovery

**Configuration:**
- `topicName`: Full topic path (projects/PROJECT/topics/TOPIC)
- `subscriptionName`: Full subscription path
- `message`: Message payload (max 10 MB)
- `attributes`: Message metadata for filtering
- `orderingKey`: For ordered delivery

**Subscription Types:**
- **Pull**: Consumer pulls messages
- **Push**: Pub/Sub pushes to HTTP endpoint

**Best Practices:**
- Use ordering keys for message sequencing
- Implement idempotent message processing
- Set appropriate acknowledgment deadlines
- Use dead letter topics for failed messages
- Enable message retention for replay

---

#### Google BigQuery
**Category:** Data Warehouse / Analytics
**Type:** `bigquery`, `googleBigQuery`

Serverless data warehouse for analytics.

**Operations:**
- **Run Query**: Execute SQL query
- **Insert Rows**: Streaming insert
- **Get Rows**: Retrieve data
- **Create/Delete Table**: Table management
- **Create/Delete Dataset**: Dataset management
- **List Datasets/Tables**: Discovery

**Configuration:**
- `projectId` (required): GCP project ID
- `datasetId`: Dataset identifier
- `tableId`: Table identifier
- `query`: Standard SQL query
- `useLegacySql`: Legacy SQL mode (not recommended)
- `maxResults`: Result limit (1-100,000)

**Query Best Practices:**
- Use `LIMIT` clauses to control costs
- Query partitioned tables with partition filters
- Use clustered columns in WHERE clauses
- Avoid `SELECT *`, specify columns
- Cache query results when possible

**Cost Optimization:**
- Use partitioned and clustered tables
- Query only necessary columns
- Use BI Engine for frequent queries
- Set query cost controls

---

### Azure

#### Azure Blob Storage
**Category:** Cloud / Object Storage
**Type:** `blobStorage`, `azureBlobStorage`

Object storage for Microsoft Azure.

**Operations:**
- **Upload Blob**: Store file
- **Download Blob**: Retrieve file
- **Delete Blob**: Remove file
- **List Blobs**: Browse container
- **Get Properties**: Blob metadata
- **Copy Blob**: Duplicate file
- **Create/Delete Container**: Container management

**Configuration:**
- `containerName` (required): Container name (lowercase)
- `blobName`: Blob path
- `blobContent`: Content to upload
- `blobType`: `BlockBlob`, `AppendBlob`, or `PageBlob`
- `contentType`: MIME type

**Blob Types:**
- **Block Blob**: General purpose (up to 190.7 TB)
- **Append Blob**: Optimized for append operations (logs)
- **Page Blob**: Random read/write (VHD files)

**Access Tiers:**
- **Hot**: Frequent access
- **Cool**: Infrequent access (30 days)
- **Archive**: Rare access (180 days)

**Best Practices:**
- Use lifecycle management for tier transitions
- Enable soft delete for data protection
- Implement Azure CDN for global distribution
- Use SAS tokens for secure, limited access

---

#### Azure Service Bus
**Category:** Cloud / Messaging
**Type:** `serviceBus`, `azureServiceBus`

Enterprise messaging service.

**Operations:**
- **Send Message**: Add to queue/topic
- **Receive Message**: Pull from queue/subscription
- **Peek Message**: View without removing
- **Create/Delete Queue/Topic**: Entity management

**Configuration:**
- `entityType`: `queue` or `topic`
- `entityName` (required): Queue or topic name
- `message`: Message body
- `sessionId`: For session-based ordering
- `timeToLive`: Message expiration (seconds)

**Features:**
- **Queues**: Point-to-point messaging
- **Topics**: Pub/sub with subscriptions
- **Sessions**: Guaranteed ordering
- **Dead Letter Queue**: Automatic failed message handling
- **Transactions**: ACID guarantees

**Tiers:**
- **Standard**: Shared infrastructure, 256 KB messages
- **Premium**: Dedicated, 1-100 MB messages

**Best Practices:**
- Use sessions for ordered processing
- Implement duplicate detection
- Set appropriate message TTL
- Monitor dead letter queues
- Use batch operations for throughput

---

#### Azure Cosmos DB
**Category:** Database / NoSQL
**Type:** `cosmosdb`, `azureCosmosDB`

Globally distributed multi-model database.

**Operations:**
- **Create Document**: Insert new document
- **Read Document**: Retrieve by ID
- **Update Document**: Modify document
- **Delete Document**: Remove document
- **Query Documents**: SQL-like queries
- **Create/Delete Container**: Container management

**Configuration:**
- `databaseId` (required): Database name
- `containerId` (required): Container name
- `document`: JSON document with `id` field
- `partitionKey`: Partition key value
- `query`: CosmosDB SQL query

**APIs:**
- **SQL (Core)**: Native JSON API
- **MongoDB**: MongoDB wire protocol
- **Cassandra**: CQL API
- **Gremlin**: Graph database
- **Table**: Key-value API

**Consistency Levels:**
1. **Strong**: Linearizability guarantee
2. **Bounded Staleness**: Prefix consistency with lag
3. **Session**: Read your own writes
4. **Consistent Prefix**: No out-of-order reads
5. **Eventual**: Lowest latency, no order guarantee

**Best Practices:**
- Choose partition key with high cardinality
- Use point reads over queries when possible
- Implement appropriate consistency level
- Enable automatic failover
- Monitor RU (Request Unit) consumption

---

## Databases

### MongoDB
**Category:** Database / NoSQL
**Type:** `mongodb`

Document-oriented NoSQL database.

**Operations:**
- **Insert One/Many**: Create documents
- **Find One/Many**: Retrieve documents
- **Update One/Many**: Modify documents
- **Delete One/Many**: Remove documents
- **Aggregate**: Complex data processing
- **Count Documents**: Count matching documents

**Configuration:**
- `database` (required): Database name
- `collection` (required): Collection name
- `document`: Document(s) to insert
- `filter`: Query filter
- `update`: Update operations
- `options`: Query options (limit, sort, projection)

**Query Operators:**
- **Comparison**: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`
- **Logical**: `$and`, `$or`, `$not`, `$nor`
- **Element**: `$exists`, `$type`
- **Array**: `$all`, `$elemMatch`, `$size`
- **Update**: `$set`, `$unset`, `$inc`, `$push`, `$pull`

**Best Practices:**
- Create indexes on frequently queried fields
- Use projection to return only needed fields
- Implement pagination with skip/limit
- Use aggregation pipeline for complex queries
- Enable replica sets for high availability

---

### MySQL
**Category:** Database / SQL
**Type:** `mysql`

Relational database management system.

**Operations:**
- **Execute Query**: Run any SQL query
- **Insert**: Add new rows
- **Update**: Modify existing rows
- **Delete**: Remove rows

**Configuration:**
- `query` (required): SQL query with placeholders (?)
- `parameters`: Array of values for placeholders

**Authentication:** Host, port, username, password, database

**Security:**
- ⚠️ **Always use parameterized queries**
- Never concatenate user input into SQL
- Use placeholders (?) to prevent SQL injection
- Grant minimum required database privileges

**Best Practices:**
- Use transactions for multi-step operations
- Create indexes on WHERE/JOIN columns
- Implement connection pooling
- Use EXPLAIN to optimize queries
- Enable query caching for read-heavy workloads

---

### Redis
**Category:** Database / Cache
**Type:** `redis`

In-memory data structure store.

**Operations:**

**String Operations:**
- `get`, `set`, `del`, `incr`, `decr`

**Hash Operations:**
- `hget`, `hset`, `hgetall`, `hdel`

**List Operations:**
- `lpush`, `rpush`, `lpop`, `rpop`, `lrange`

**Set Operations:**
- `sadd`, `smembers`, `sismember`

**Advanced:**
- `keys`, `exists`, `ttl`, `expire`

**Configuration:**
- `key` (required): Redis key
- `value`: Value to store
- `field`: Hash field name
- `expire`: Auto-expiration (seconds)

**Data Structures:**
- **Strings**: Simple key-value
- **Lists**: Ordered collections
- **Sets**: Unordered unique collections
- **Hashes**: Field-value maps
- **Sorted Sets**: Ordered by score

**Best Practices:**
- Set TTL on cache entries
- Use hash data structures for objects
- Avoid large keys (memory fragmentation)
- Use pipelining for multiple commands
- Enable persistence (RDB or AOF) for durability

---

### Elasticsearch
**Category:** Database / Search
**Type:** `elasticsearch`

Distributed search and analytics engine.

**Operations:**
- **Search**: Full-text search
- **Index Document**: Add/update document
- **Get Document**: Retrieve by ID
- **Update Document**: Partial update
- **Delete Document**: Remove document
- **Bulk Operation**: Batch operations
- **Create/Delete Index**: Index management

**Configuration:**
- `index` (required): Index name (lowercase)
- `documentId`: Document identifier
- `query`: Elasticsearch Query DSL
- `document`: Document to index

**Common Query Types:**
```json
{
  "match": {"field": "search term"},
  "term": {"field": "exact value"},
  "range": {"date": {"gte": "2024-01-01"}},
  "bool": {
    "must": [...],
    "filter": [...],
    "should": [...],
    "must_not": [...]
  }
}
```

**Best Practices:**
- Use `filter` context (cacheable) over `must`
- Define explicit mappings for indexes
- Use index aliases for zero-downtime updates
- Implement pagination with search_after
- Monitor cluster health and shard distribution

---

## Communication

### Mailgun
**Category:** Communication / Email
**Type:** `mailgun`

Email service for developers.

**Operations:**
- **Send Email**: Deliver email via SMTP or API
- **Get Events**: Retrieve delivery events
- **Validate Email**: Check email validity
- **Mailing Lists**: Manage email lists

**Configuration:**
- `from` (required): Sender email (verified domain)
- `to` (required): Recipient email(s)
- `subject` (required): Email subject
- `text`: Plain text body
- `html`: HTML body
- `cc`, `bcc`: Carbon copy recipients

**Features:**
- 99.99% uptime SLA
- Email validation API
- Detailed analytics and tracking
- Webhook events (opens, clicks, bounces)
- Template support with variables

**Best Practices:**
- Provide both text and HTML versions
- Use verified domain for better deliverability
- Monitor bounce and complaint rates
- Implement proper unsubscribe handling
- Use template variables for personalization
- Respect SPF, DKIM, and DMARC policies

---

## Data Processing

### Filter
**Category:** Data Processing
**Type:** `filter`

Filter data based on conditions.

**Conditions:**
- Equal, not equal
- Greater than, less than
- Contains, not contains
- Exists, not exists
- Regex match
- Custom JavaScript

### Sort
**Category:** Data Processing
**Type:** `sort`

Sort data by field(s).

**Options:**
- Single or multiple fields
- Ascending/descending order
- Custom comparator

### Merge
**Category:** Data Processing
**Type:** `merge`

Combine data from multiple branches.

**Modes:**
- Append: Combine arrays
- Merge: Combine objects
- Wait: Wait for all inputs

### Aggregate
**Category:** Data Processing
**Type:** `aggregate`

Aggregate and group data.

**Aggregations:**
- Sum, average, min, max
- Count, count distinct
- Group by field(s)

---

## Expression Language

All text fields support expressions using `{{ }}` syntax:

**Access Input Data:**
```
{{ $json.fieldName }}
{{ $json.nested.field }}
{{ $json.array[0] }}
```

**Built-in Functions:**
```
{{ $now() }}              // Current timestamp
{{ $today() }}            // Today's date
{{ $uuid() }}             // Generate UUID
{{ $randomInt(1, 100) }} // Random integer
```

**String Operations:**
```
{{ $json.name.toUpperCase() }}
{{ $json.email.toLowerCase() }}
{{ $json.text.trim() }}
{{ $json.text.substring(0, 10) }}
```

**Math Operations:**
```
{{ $json.price * 1.1 }}
{{ Math.round($json.value) }}
{{ Math.max($json.a, $json.b) }}
```

**Conditional:**
```
{{ $json.status === 'active' ? 'Yes' : 'No' }}
```

---

## Security Best Practices

### Credentials Management
- Store all API keys in Credentials Manager
- Use environment variables for configuration
- Rotate credentials regularly
- Use service accounts with minimal permissions

### Data Protection
- Enable encryption at rest and in transit
- Implement field-level encryption for sensitive data
- Use VPC/private endpoints when available
- Audit credential access regularly

### Error Handling
- Never expose credentials in error messages
- Log errors without sensitive data
- Implement retry logic with exponential backoff
- Use dead letter queues for failed operations

---

## Performance Optimization

### Batch Operations
- Use batch APIs when processing multiple items
- Implement concurrency limits
- Use connection pooling for databases

### Caching
- Cache frequently accessed data in Redis
- Use CDN for static content
- Implement query result caching

### Monitoring
- Track execution time metrics
- Monitor rate limiting and throttling
- Set up alerts for failures
- Use distributed tracing

---

## Support

For questions or issues:
- **Documentation**: Full docs at `/docs`
- **GitHub Issues**: Bug reports and feature requests
- **Community**: Discord server for discussions
- **Enterprise**: 24/7 support for enterprise customers

---

**Last Updated:** 2025-01-18
**Version:** 2.0.0
