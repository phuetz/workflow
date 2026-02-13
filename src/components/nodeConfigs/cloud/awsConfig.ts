import { NodeConfigDefinition } from '../../../types/nodeConfig';

export const awsConfig: NodeConfigDefinition = {
  fields: [
    // Authentication Configuration
    {
      label: 'Authentication Method',
      field: 'authMethod',
      type: 'select',
      options: [
        { value: 'access_key', label: 'Access Key (IAM User)' },
        { value: 'assume_role', label: 'Assume Role (STS)' },
        { value: 'instance_profile', label: 'EC2 Instance Profile' },
        { value: 'ecs_task_role', label: 'ECS Task Role' }
      ],
      required: true,
      defaultValue: 'access_key'
    },
    {
      label: 'Access Key ID',
      field: 'accessKeyId',
      type: 'text',
      placeholder: 'AKIAIOSFODNN7EXAMPLE',
      required: function() { return this.authMethod === 'access_key'; },
      validation: (value) => {
        if (value && typeof value === 'string' && !/^AKIA[0-9A-Z]{16}$/.test(value)) {
          return 'Invalid Access Key ID format';
        }
        return null;
      }
    },
    {
      label: 'Secret Access Key',
      field: 'secretAccessKey',
      type: 'password',
      placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      required: function() { return this.authMethod === 'access_key'; },
      validation: (value) => {
        if (value && typeof value === 'string' && value.length !== 40) {
          return 'Secret Access Key should be 40 characters';
        }
        return null;
      }
    },
    {
      label: 'Role ARN',
      field: 'roleArn',
      type: 'text',
      placeholder: 'arn:aws:iam::123456789012:role/MyRole',
      required: function() { return this.authMethod === 'assume_role'; },
      validation: (value) => {
        if (value && typeof value === 'string' && !/^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/.test(value)) {
          return 'Invalid Role ARN format';
        }
        return null;
      }
    },
    {
      label: 'Session Name',
      field: 'sessionName',
      type: 'text',
      placeholder: 'workflow-session',
      required: function() { return this.authMethod === 'assume_role'; },
      validation: (value) => {
        if (value && typeof value === 'string' && !/^[\w+=,.@-]+$/.test(value)) {
          return 'Invalid session name format';
        }
        return null;
      }
    },
    {
      label: 'AWS Region',
      field: 'region',
      type: 'select',
      options: [
        { value: 'us-east-1', label: 'US East (N. Virginia)' },
        { value: 'us-east-2', label: 'US East (Ohio)' },
        { value: 'us-west-1', label: 'US West (N. California)' },
        { value: 'us-west-2', label: 'US West (Oregon)' },
        { value: 'eu-west-1', label: 'EU (Ireland)' },
        { value: 'eu-central-1', label: 'EU (Frankfurt)' },
        { value: 'eu-north-1', label: 'EU (Stockholm)' },
        { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
        { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
        { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
        { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
        { value: 'sa-east-1', label: 'South America (São Paulo)' },
        { value: 'ca-central-1', label: 'Canada (Central)' },
        { value: 'me-south-1', label: 'Middle East (Bahrain)' },
        { value: 'af-south-1', label: 'Africa (Cape Town)' }
      ],
      required: true,
      defaultValue: 'us-east-1'
    },

    // Service Selection
    {
      label: 'AWS Service',
      field: 'service',
      type: 'select',
      options: [
        { value: 's3', label: 'S3 (Simple Storage Service)' },
        { value: 'ec2', label: 'EC2 (Elastic Compute Cloud)' },
        { value: 'lambda', label: 'Lambda (Serverless Functions)' },
        { value: 'dynamodb', label: 'DynamoDB (NoSQL Database)' },
        { value: 'rds', label: 'RDS (Relational Database Service)' },
        { value: 'sqs', label: 'SQS (Simple Queue Service)' },
        { value: 'sns', label: 'SNS (Simple Notification Service)' },
        { value: 'ses', label: 'SES (Simple Email Service)' },
        { value: 'cloudwatch', label: 'CloudWatch (Monitoring)' },
        { value: 'iam', label: 'IAM (Identity and Access Management)' },
        { value: 'kms', label: 'KMS (Key Management Service)' },
        { value: 'secretsmanager', label: 'Secrets Manager' },
        { value: 'eventbridge', label: 'EventBridge' },
        { value: 'ecs', label: 'ECS (Elastic Container Service)' },
        { value: 'eks', label: 'EKS (Elastic Kubernetes Service)' },
        { value: 'stepfunctions', label: 'Step Functions' },
        { value: 'athena', label: 'Athena (Query Service)' },
        { value: 'glue', label: 'Glue (ETL Service)' },
        { value: 'kinesis', label: 'Kinesis (Streaming Data)' },
        { value: 'apigateway', label: 'API Gateway' }
      ],
      required: true
    },

    // Operation based on service
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      options: function() {
        switch (this.service) {
          case 's3':
            return [
              { value: 'list_buckets', label: 'List Buckets' },
              { value: 'create_bucket', label: 'Create Bucket' },
              { value: 'delete_bucket', label: 'Delete Bucket' },
              { value: 'list_objects', label: 'List Objects' },
              { value: 'get_object', label: 'Get Object' },
              { value: 'put_object', label: 'Put Object' },
              { value: 'delete_object', label: 'Delete Object' },
              { value: 'copy_object', label: 'Copy Object' },
              { value: 'generate_presigned_url', label: 'Generate Presigned URL' },
              { value: 'multipart_upload', label: 'Multipart Upload' },
              { value: 'set_bucket_policy', label: 'Set Bucket Policy' },
              { value: 'get_bucket_policy', label: 'Get Bucket Policy' },
              { value: 'set_bucket_cors', label: 'Set Bucket CORS' },
              { value: 'enable_versioning', label: 'Enable Versioning' },
              { value: 'set_lifecycle', label: 'Set Lifecycle Rules' }
            ];
          case 'ec2':
            return [
              { value: 'describe_instances', label: 'Describe Instances' },
              { value: 'run_instances', label: 'Run Instances' },
              { value: 'terminate_instances', label: 'Terminate Instances' },
              { value: 'stop_instances', label: 'Stop Instances' },
              { value: 'start_instances', label: 'Start Instances' },
              { value: 'reboot_instances', label: 'Reboot Instances' },
              { value: 'create_snapshot', label: 'Create Snapshot' },
              { value: 'create_image', label: 'Create AMI' },
              { value: 'describe_images', label: 'Describe AMIs' },
              { value: 'create_security_group', label: 'Create Security Group' },
              { value: 'authorize_security_group', label: 'Authorize Security Group' },
              { value: 'create_key_pair', label: 'Create Key Pair' },
              { value: 'allocate_address', label: 'Allocate Elastic IP' },
              { value: 'associate_address', label: 'Associate Elastic IP' }
            ];
          case 'lambda':
            return [
              { value: 'list_functions', label: 'List Functions' },
              { value: 'create_function', label: 'Create Function' },
              { value: 'update_function', label: 'Update Function' },
              { value: 'delete_function', label: 'Delete Function' },
              { value: 'invoke', label: 'Invoke Function' },
              { value: 'invoke_async', label: 'Invoke Async' },
              { value: 'get_function', label: 'Get Function' },
              { value: 'update_function_configuration', label: 'Update Configuration' },
              { value: 'list_versions', label: 'List Versions' },
              { value: 'publish_version', label: 'Publish Version' },
              { value: 'create_alias', label: 'Create Alias' },
              { value: 'update_alias', label: 'Update Alias' },
              { value: 'add_permission', label: 'Add Permission' },
              { value: 'create_event_source_mapping', label: 'Create Event Source Mapping' }
            ];
          case 'dynamodb':
            return [
              { value: 'list_tables', label: 'List Tables' },
              { value: 'create_table', label: 'Create Table' },
              { value: 'delete_table', label: 'Delete Table' },
              { value: 'describe_table', label: 'Describe Table' },
              { value: 'put_item', label: 'Put Item' },
              { value: 'get_item', label: 'Get Item' },
              { value: 'update_item', label: 'Update Item' },
              { value: 'delete_item', label: 'Delete Item' },
              { value: 'query', label: 'Query' },
              { value: 'scan', label: 'Scan' },
              { value: 'batch_get_item', label: 'Batch Get Item' },
              { value: 'batch_write_item', label: 'Batch Write Item' },
              { value: 'create_backup', label: 'Create Backup' },
              { value: 'restore_backup', label: 'Restore Backup' },
              { value: 'enable_streams', label: 'Enable Streams' }
            ];
          case 'sqs':
            return [
              { value: 'list_queues', label: 'List Queues' },
              { value: 'create_queue', label: 'Create Queue' },
              { value: 'delete_queue', label: 'Delete Queue' },
              { value: 'send_message', label: 'Send Message' },
              { value: 'send_message_batch', label: 'Send Message Batch' },
              { value: 'receive_message', label: 'Receive Message' },
              { value: 'delete_message', label: 'Delete Message' },
              { value: 'delete_message_batch', label: 'Delete Message Batch' },
              { value: 'change_message_visibility', label: 'Change Message Visibility' },
              { value: 'get_queue_attributes', label: 'Get Queue Attributes' },
              { value: 'set_queue_attributes', label: 'Set Queue Attributes' },
              { value: 'purge_queue', label: 'Purge Queue' }
            ];
          case 'sns':
            return [
              { value: 'list_topics', label: 'List Topics' },
              { value: 'create_topic', label: 'Create Topic' },
              { value: 'delete_topic', label: 'Delete Topic' },
              { value: 'publish', label: 'Publish Message' },
              { value: 'publish_batch', label: 'Publish Batch' },
              { value: 'subscribe', label: 'Subscribe' },
              { value: 'unsubscribe', label: 'Unsubscribe' },
              { value: 'list_subscriptions', label: 'List Subscriptions' },
              { value: 'confirm_subscription', label: 'Confirm Subscription' },
              { value: 'set_topic_attributes', label: 'Set Topic Attributes' },
              { value: 'get_topic_attributes', label: 'Get Topic Attributes' },
              { value: 'add_permission', label: 'Add Permission' }
            ];
          case 'ses':
            return [
              { value: 'send_email', label: 'Send Email' },
              { value: 'send_raw_email', label: 'Send Raw Email' },
              { value: 'send_templated_email', label: 'Send Templated Email' },
              { value: 'send_bulk_templated_email', label: 'Send Bulk Templated Email' },
              { value: 'verify_email', label: 'Verify Email' },
              { value: 'verify_domain', label: 'Verify Domain' },
              { value: 'list_identities', label: 'List Identities' },
              { value: 'create_template', label: 'Create Template' },
              { value: 'update_template', label: 'Update Template' },
              { value: 'delete_template', label: 'Delete Template' },
              { value: 'get_send_statistics', label: 'Get Send Statistics' },
              { value: 'get_send_quota', label: 'Get Send Quota' },
              { value: 'create_configuration_set', label: 'Create Configuration Set' },
              { value: 'put_configuration_set_event_destination', label: 'Add Event Destination' }
            ];
          default:
            return [{ value: 'custom', label: 'Custom Operation' }];
        }
      },
      required: true
    },

    // S3 Specific Fields
    {
      label: 'Bucket Name',
      field: 'bucketName',
      type: 'text',
      placeholder: 'my-bucket-name',
      required: function() { 
        return this.service === 's3' && this.operation !== 'list_buckets';
      },
      validation: (value) => {
        if (value && typeof value === 'string' && !/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(value)) {
          return 'Invalid bucket name format';
        }
        return null;
      }
    },
    {
      label: 'Object Key',
      field: 'objectKey',
      type: 'text',
      placeholder: 'path/to/file.txt',
      required: function() { 
        return this.service === 's3' && ['get_object', 'put_object', 'delete_object', 'copy_object'].includes(this.operation);
      }
    },
    {
      label: 'Object Content',
      field: 'objectContent',
      type: 'textarea',
      placeholder: 'File content or data',
      required: function() { 
        return this.service === 's3' && this.operation === 'put_object';
      }
    },
    {
      label: 'Content Type',
      field: 'contentType',
      type: 'text',
      placeholder: 'text/plain',
      defaultValue: 'application/octet-stream',
      required: false
    },
    {
      label: 'Storage Class',
      field: 'storageClass',
      type: 'select',
      options: [
        { value: 'STANDARD', label: 'Standard' },
        { value: 'REDUCED_REDUNDANCY', label: 'Reduced Redundancy' },
        { value: 'STANDARD_IA', label: 'Standard IA' },
        { value: 'ONEZONE_IA', label: 'One Zone IA' },
        { value: 'INTELLIGENT_TIERING', label: 'Intelligent Tiering' },
        { value: 'GLACIER', label: 'Glacier' },
        { value: 'DEEP_ARCHIVE', label: 'Deep Archive' }
      ],
      defaultValue: 'STANDARD',
      required: false
    },

    // EC2 Specific Fields
    {
      label: 'Instance ID(s)',
      field: 'instanceIds',
      type: 'text',
      placeholder: 'i-1234567890abcdef0',
      required: function() { 
        return this.service === 'ec2' && ['terminate_instances', 'stop_instances', 'start_instances', 
                'reboot_instances', 'create_snapshot', 'create_image'].includes(this.operation);
      },
      validation: (value) => {
        if (value && typeof value === 'string') {
          const ids = value.split(',').map(id => id.trim());
          for (const id of ids) {
            if (!/^i-[0-9a-f]{17}$/.test(id)) {
              return `Invalid instance ID format: ${id}`;
            }
          }
        }
        return null;
      }
    },
    {
      label: 'AMI ID',
      field: 'imageId',
      type: 'text',
      placeholder: 'ami-1234567890abcdef0',
      required: function() { 
        return this.service === 'ec2' && this.operation === 'run_instances';
      },
      validation: (value) => {
        if (value && typeof value === 'string' && !/^ami-[0-9a-f]{17}$/.test(value)) {
          return 'Invalid AMI ID format';
        }
        return null;
      }
    },
    {
      label: 'Instance Type',
      field: 'instanceType',
      type: 'select',
      options: [
        { value: 't2.micro', label: 't2.micro' },
        { value: 't2.small', label: 't2.small' },
        { value: 't2.medium', label: 't2.medium' },
        { value: 't3.micro', label: 't3.micro' },
        { value: 't3.small', label: 't3.small' },
        { value: 't3.medium', label: 't3.medium' },
        { value: 'm5.large', label: 'm5.large' },
        { value: 'm5.xlarge', label: 'm5.xlarge' },
        { value: 'c5.large', label: 'c5.large' },
        { value: 'c5.xlarge', label: 'c5.xlarge' },
        { value: 'r5.large', label: 'r5.large' },
        { value: 'r5.xlarge', label: 'r5.xlarge' }
      ],
      defaultValue: 't2.micro',
      required: function() { 
        return this.service === 'ec2' && this.operation === 'run_instances';
      }
    },

    // Lambda Specific Fields
    {
      label: 'Function Name',
      field: 'functionName',
      type: 'text',
      placeholder: 'my-function',
      required: function() { 
        return this.service === 'lambda' && this.operation !== 'list_functions';
      },
      validation: (value) => {
        if (value && typeof value === 'string' && !/^[a-zA-Z0-9-_]+$/.test(value)) {
          return 'Function name can only contain letters, numbers, hyphens, and underscores';
        }
        return null;
      }
    },
    {
      label: 'Function Payload',
      field: 'payload',
      type: 'textarea',
      placeholder: '{"key": "value"}',
      required: function() { 
        return this.service === 'lambda' && ['invoke', 'invoke_async'].includes(this.operation);
      },
      validation: (value) => {
        if (value && typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            return 'Payload must be valid JSON';
          }
        }
        return null;
      }
    },
    {
      label: 'Runtime',
      field: 'runtime',
      type: 'select',
      options: [
        { value: 'nodejs18.x', label: 'Node.js 18.x' },
        { value: 'nodejs16.x', label: 'Node.js 16.x' },
        { value: 'python3.11', label: 'Python 3.11' },
        { value: 'python3.10', label: 'Python 3.10' },
        { value: 'python3.9', label: 'Python 3.9' },
        { value: 'java17', label: 'Java 17' },
        { value: 'java11', label: 'Java 11' },
        { value: 'dotnet6', label: '.NET 6' },
        { value: 'go1.x', label: 'Go 1.x' },
        { value: 'ruby3.2', label: 'Ruby 3.2' },
        { value: 'provided.al2', label: 'Custom Runtime AL2' }
      ],
      required: function() { 
        return this.service === 'lambda' && this.operation === 'create_function';
      }
    },

    // DynamoDB Specific Fields
    {
      label: 'Table Name',
      field: 'tableName',
      type: 'text',
      placeholder: 'my-table',
      required: function() { 
        return this.service === 'dynamodb' && this.operation !== 'list_tables';
      }
    },
    {
      label: 'Item (JSON)',
      field: 'item',
      type: 'textarea',
      placeholder: '{"id": {"S": "123"}, "name": {"S": "John"}}',
      required: function() { 
        return this.service === 'dynamodb' && ['put_item', 'get_item', 'update_item', 'delete_item'].includes(this.operation);
      },
      validation: (value) => {
        if (value && typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            return 'Item must be valid JSON';
          }
        }
        return null;
      }
    },
    {
      label: 'Key Condition Expression',
      field: 'keyConditionExpression',
      type: 'text',
      placeholder: 'id = :id',
      required: function() { 
        return this.service === 'dynamodb' && this.operation === 'query';
      }
    },
    {
      label: 'Expression Attribute Values (JSON)',
      field: 'expressionAttributeValues',
      type: 'textarea',
      placeholder: '{":id": {"S": "123"}}',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            return 'Expression attribute values must be valid JSON';
          }
        }
        return null;
      }
    },

    // SQS Specific Fields
    {
      label: 'Queue URL',
      field: 'queueUrl',
      type: 'text',
      placeholder: 'https://sqs.region.amazonaws.com/account-id/queue-name',
      required: function() { 
        return this.service === 'sqs' && this.operation !== 'list_queues';
      },
      validation: (value) => {
        if (value && typeof value === 'string' && !/^https:\/\/sqs\.[a-z0-9-]+\.amazonaws\.com\/\d+\/[\w-]+$/.test(value)) {
          return 'Invalid SQS queue URL format';
        }
        return null;
      }
    },
    {
      label: 'Message Body',
      field: 'messageBody',
      type: 'textarea',
      placeholder: 'Your message content',
      required: function() { 
        return this.service === 'sqs' && ['send_message', 'send_message_batch'].includes(this.operation);
      }
    },
    {
      label: 'Max Messages',
      field: 'maxMessages',
      type: 'number',
      placeholder: '10',
      defaultValue: 1,
      required: false,
      validation: (value) => {
        if (value !== undefined && value !== null) {
          const numValue = typeof value === 'string' ? parseInt(value, 10) : Number(value);
          if (numValue < 1 || numValue > 10) {
            return 'Max messages must be between 1 and 10';
          }
        }
        return null;
      }
    },

    // SNS Specific Fields
    {
      label: 'Topic ARN',
      field: 'topicArn',
      type: 'text',
      placeholder: 'arn:aws:sns:region:account-id:topic-name',
      required: function() { 
        return this.service === 'sns' && ['publish', 'subscribe', 'delete_topic'].includes(this.operation);
      },
      validation: (value) => {
        if (value && typeof value === 'string' && !/^arn:aws:sns:[a-z0-9-]+:\d+:[\w-]+$/.test(value)) {
          return 'Invalid SNS topic ARN format';
        }
        return null;
      }
    },
    {
      label: 'Message',
      field: 'message',
      type: 'textarea',
      placeholder: 'Notification message',
      required: function() { 
        return this.service === 'sns' && this.operation === 'publish';
      }
    },
    {
      label: 'Subject',
      field: 'subject',
      type: 'text',
      placeholder: 'Email subject',
      required: false
    },

    // SES Specific Fields
    {
      label: 'From Email',
      field: 'fromEmail',
      type: 'email',
      placeholder: 'sender@example.com',
      required: function() { 
        return this.service === 'ses' && ['send_email', 'send_raw_email', 'send_templated_email'].includes(this.operation);
      },
      validation: (value) => {
        if (value && typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Invalid email format';
        }
        return null;
      }
    },
    {
      label: 'To Email(s)',
      field: 'toEmails',
      type: 'text',
      placeholder: 'recipient@example.com',
      required: function() { 
        return this.service === 'ses' && ['send_email', 'send_raw_email', 'send_templated_email'].includes(this.operation);
      },
      validation: (value) => {
        if (value && typeof value === 'string') {
          const emails = value.split(',').map(email => email.trim());
          for (const email of emails) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              return `Invalid email format: ${email}`;
            }
          }
        }
        return null;
      }
    },
    {
      label: 'Email Subject',
      field: 'emailSubject',
      type: 'text',
      placeholder: 'Email subject',
      required: function() { 
        return this.service === 'ses' && this.operation === 'send_email';
      }
    },
    {
      label: 'Email Body (HTML)',
      field: 'htmlBody',
      type: 'textarea',
      placeholder: '<h1>Hello</h1><p>This is an email</p>',
      required: false
    },
    {
      label: 'Email Body (Text)',
      field: 'textBody',
      type: 'textarea',
      placeholder: 'Plain text email content',
      required: function() { 
        return this.service === 'ses' && this.operation === 'send_email' && !this.htmlBody;
      }
    },

    // Common Advanced Options
    {
      label: 'Tags (JSON)',
      field: 'tags',
      type: 'textarea',
      placeholder: '{"Environment": "Production", "Project": "MyProject"}',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            return 'Tags must be valid JSON';
          }
        }
        return null;
      }
    },
    {
      label: 'Request Timeout (ms)',
      field: 'timeout',
      type: 'number',
      placeholder: '30000',
      defaultValue: 30000,
      required: false,
      validation: (value) => {
        if (value !== undefined && value !== null) {
          const numValue = typeof value === 'string' ? parseInt(value, 10) : Number(value);
          if (numValue < 1000 || numValue > 300000) {
            return 'Timeout must be between 1000 and 300000 milliseconds';
          }
        }
        return null;
      }
    },
    {
      label: 'Max Retries',
      field: 'maxRetries',
      type: 'number',
      placeholder: '3',
      defaultValue: 3,
      required: false,
      validation: (value) => {
        if (value !== undefined && value !== null) {
          const numValue = typeof value === 'string' ? parseInt(value, 10) : Number(value);
          if (numValue < 0 || numValue > 10) {
            return 'Max retries must be between 0 and 10';
          }
        }
        return null;
      }
    },
    {
      label: 'Endpoint URL (Custom)',
      field: 'endpoint',
      type: 'text',
      placeholder: 'https://custom-endpoint.example.com',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string') {
          try {
            new URL(value);
          } catch {
            return 'Invalid endpoint URL format';
          }
        }
        return null;
      }
    }
  ],
  examples: [
    {
      name: 'S3 Upload File',
      description: 'Upload a file to S3 bucket',
      config: {
        authMethod: 'access_key',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-east-1',
        service: 's3',
        operation: 'put_object',
        bucketName: 'my-bucket',
        objectKey: 'documents/file.pdf',
        objectContent: 'File content here',
        contentType: 'application/pdf',
        storageClass: 'STANDARD'
      }
    },
    {
      name: 'Lambda Invoke Function',
      description: 'Invoke a Lambda function',
      config: {
        authMethod: 'access_key',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-west-2',
        service: 'lambda',
        operation: 'invoke',
        functionName: 'my-function',
        payload: '{"name": "John", "age": 30}'
      }
    },
    {
      name: 'DynamoDB Put Item',
      description: 'Insert item into DynamoDB table',
      config: {
        authMethod: 'access_key',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-east-1',
        service: 'dynamodb',
        operation: 'put_item',
        tableName: 'users',
        item: '{"id": {"S": "user123"}, "name": {"S": "John Doe"}, "age": {"N": "30"}}'
      }
    },
    {
      name: 'SQS Send Message',
      description: 'Send message to SQS queue',
      config: {
        authMethod: 'access_key',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-east-1',
        service: 'sqs',
        operation: 'send_message',
        queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
        messageBody: 'Process this order: #12345'
      }
    },
    {
      name: 'SES Send Email',
      description: 'Send email via SES',
      config: {
        authMethod: 'access_key',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-east-1',
        service: 'ses',
        operation: 'send_email',
        fromEmail: 'noreply@example.com',
        toEmails: 'customer@example.com',
        emailSubject: 'Order Confirmation',
        htmlBody: '<h1>Thank you for your order!</h1><p>Order #12345 has been confirmed.</p>',
        textBody: 'Thank you for your order! Order #12345 has been confirmed.'
      }
    },
    {
      name: 'EC2 Launch Instance',
      description: 'Launch new EC2 instance',
      config: {
        authMethod: 'access_key',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-west-2',
        service: 'ec2',
        operation: 'run_instances',
        imageId: 'ami-0abcdef1234567890',
        instanceType: 't2.micro',
        tags: '{"Name": "WebServer", "Environment": "Development"}'
      }
    }
  ]
};