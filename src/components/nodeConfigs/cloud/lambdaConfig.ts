import { NodeConfigDefinition } from '../../../types/nodeConfig';

export const lambdaConfig: NodeConfigDefinition = {
  fields: [
    // Authentication Configuration
    {
      label: 'Authentication Method',
      field: 'authMethod',
      type: 'select',
      options: [
        { value: 'access_key', label: 'AWS Access Key' },
        { value: 'function_url', label: 'Function URL (Public)' },
        { value: 'api_gateway', label: 'API Gateway' }
      ],
      required: true,
      defaultValue: 'access_key'
    },
    {
      label: 'AWS Access Key ID',
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
      label: 'AWS Secret Access Key',
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
      label: 'Function URL',
      field: 'functionUrl',
      type: 'text',
      placeholder: 'https://abcdefghij.lambda-url.us-east-1.on.aws/',
      required: function() { return this.authMethod === 'function_url'; },
      validation: (value) => {
        if (value && typeof value === 'string' && !/^https:\/\/[a-z0-9]+\.lambda-url\.[a-z0-9-]+\.on\.aws\/$/.test(value)) {
          return 'Invalid Lambda Function URL format';
        }
        return null;
      }
    },
    {
      label: 'API Gateway URL',
      field: 'apiGatewayUrl',
      type: 'text',
      placeholder: 'https://api-id.execute-api.region.amazonaws.com/stage',
      required: function() { return this.authMethod === 'api_gateway'; },
      validation: (value) => {
        if (value && typeof value === 'string' && !/^https:\/\/[a-z0-9]+\.execute-api\.[a-z0-9-]+\.amazonaws\.com/.test(value)) {
          return 'Invalid API Gateway URL format';
        }
        return null;
      }
    },
    {
      label: 'API Key',
      field: 'apiKey',
      type: 'password',
      placeholder: 'your-api-key',
      required: false
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
      required: function() { return this.authMethod === 'access_key'; },
      defaultValue: 'us-east-1'
    },

    // Operation Configuration
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      options: [
        // Function Management
        { value: 'invoke', label: 'Invoke Function' },
        { value: 'invoke_async', label: 'Invoke Function Async' },
        { value: 'invoke_dry_run', label: 'Invoke Dry Run' },
        { value: 'list_functions', label: 'List Functions' },
        { value: 'get_function', label: 'Get Function' },
        { value: 'get_function_configuration', label: 'Get Function Configuration' },
        { value: 'create_function', label: 'Create Function' },
        { value: 'update_function_code', label: 'Update Function Code' },
        { value: 'update_function_configuration', label: 'Update Function Configuration' },
        { value: 'delete_function', label: 'Delete Function' },
        { value: 'publish_version', label: 'Publish Version' },
        { value: 'list_versions', label: 'List Versions' },
        
        // Alias Management
        { value: 'create_alias', label: 'Create Alias' },
        { value: 'update_alias', label: 'Update Alias' },
        { value: 'delete_alias', label: 'Delete Alias' },
        { value: 'list_aliases', label: 'List Aliases' },
        { value: 'get_alias', label: 'Get Alias' },
        
        // Layer Management
        { value: 'publish_layer_version', label: 'Publish Layer Version' },
        { value: 'list_layers', label: 'List Layers' },
        { value: 'list_layer_versions', label: 'List Layer Versions' },
        { value: 'get_layer_version', label: 'Get Layer Version' },
        { value: 'delete_layer_version', label: 'Delete Layer Version' },
        
        // Event Source Mapping
        { value: 'create_event_source_mapping', label: 'Create Event Source Mapping' },
        { value: 'update_event_source_mapping', label: 'Update Event Source Mapping' },
        { value: 'delete_event_source_mapping', label: 'Delete Event Source Mapping' },
        { value: 'list_event_source_mappings', label: 'List Event Source Mappings' },
        { value: 'get_event_source_mapping', label: 'Get Event Source Mapping' },
        
        // Permissions
        { value: 'add_permission', label: 'Add Permission' },
        { value: 'remove_permission', label: 'Remove Permission' },
        { value: 'get_policy', label: 'Get Policy' },
        
        // Concurrency
        { value: 'put_function_concurrency', label: 'Set Concurrency Limit' },
        { value: 'delete_function_concurrency', label: 'Delete Concurrency Limit' },
        { value: 'get_function_concurrency', label: 'Get Concurrency' },
        { value: 'put_provisioned_concurrency', label: 'Set Provisioned Concurrency' },
        { value: 'delete_provisioned_concurrency', label: 'Delete Provisioned Concurrency' },
        
        // Tags
        { value: 'tag_resource', label: 'Tag Resource' },
        { value: 'untag_resource', label: 'Untag Resource' },
        { value: 'list_tags', label: 'List Tags' }
      ],
      required: true
    },

    // Function Identification
    {
      label: 'Function Name',
      field: 'functionName',
      type: 'text',
      placeholder: 'my-function',
      required: function() { 
        return this.authMethod === 'access_key' && !['list_functions', 'list_layers', 'publish_layer_version'].includes(this.operation);
      },
      validation: (value) => {
        if (value && typeof value === 'string') {
          if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
            return 'Function name can only contain letters, numbers, hyphens, and underscores';
          }
          if (value.length > 64) {
            return 'Function name must be 64 characters or less';
          }
        }
        return null;
      }
    },
    {
      label: 'Qualifier',
      field: 'qualifier',
      type: 'text',
      placeholder: '$LATEST, version number, or alias',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string' && !/^(\$LATEST|[a-zA-Z0-9-_]+)$/.test(value)) {
          return 'Invalid qualifier format';
        }
        return null;
      }
    },

    // Invocation Configuration
    {
      label: 'Invocation Type',
      field: 'invocationType',
      type: 'select',
      options: [
        { value: 'RequestResponse', label: 'Request/Response (Synchronous)' },
        { value: 'Event', label: 'Event (Asynchronous)' },
        { value: 'DryRun', label: 'Dry Run (Test)' }
      ],
      defaultValue: 'RequestResponse',
      required: function() { 
        return ['invoke', 'invoke_async'].includes(this.operation);
      }
    },
    {
      label: 'Log Type',
      field: 'logType',
      type: 'select',
      options: [
        { value: 'None', label: 'None' },
        { value: 'Tail', label: 'Tail (Last 4KB of logs)' }
      ],
      defaultValue: 'None',
      required: false
    },
    {
      label: 'Payload',
      field: 'payload',
      type: 'textarea',
      placeholder: '{"key": "value", "name": "John"}',
      required: function() { 
        return ['invoke', 'invoke_async', 'invoke_dry_run'].includes(this.operation);
      },
      validation: (value) => {
        if (value && typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            return 'Payload must be valid JSON';
          }
          // Check payload size (6MB max)
          const sizeInBytes = new TextEncoder().encode(value).length;
          if (sizeInBytes > 6 * 1024 * 1024) {
            return 'Payload too large (max 6MB)';
          }
        }
        return null;
      }
    },
    {
      label: 'Client Context',
      field: 'clientContext',
      type: 'textarea',
      placeholder: '{"custom": {"key": "value"}}',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            return 'Client context must be valid JSON';
          }
        }
        return null;
      }
    },

    // Function Creation/Update Configuration
    {
      label: 'Runtime',
      field: 'runtime',
      type: 'select',
      options: [
        { value: 'nodejs20.x', label: 'Node.js 20.x' },
        { value: 'nodejs18.x', label: 'Node.js 18.x' },
        { value: 'nodejs16.x', label: 'Node.js 16.x' },
        { value: 'python3.12', label: 'Python 3.12' },
        { value: 'python3.11', label: 'Python 3.11' },
        { value: 'python3.10', label: 'Python 3.10' },
        { value: 'python3.9', label: 'Python 3.9' },
        { value: 'java21', label: 'Java 21' },
        { value: 'java17', label: 'Java 17' },
        { value: 'java11', label: 'Java 11' },
        { value: 'dotnet8', label: '.NET 8' },
        { value: 'dotnet6', label: '.NET 6' },
        { value: 'go1.x', label: 'Go 1.x' },
        { value: 'ruby3.2', label: 'Ruby 3.2' },
        { value: 'provided.al2023', label: 'Custom Runtime AL2023' },
        { value: 'provided.al2', label: 'Custom Runtime AL2' }
      ],
      required: function() { 
        return ['create_function', 'update_function_configuration'].includes(this.operation);
      }
    },
    {
      label: 'Handler',
      field: 'handler',
      type: 'text',
      placeholder: 'index.handler',
      required: function() { 
        return ['create_function', 'update_function_configuration'].includes(this.operation);
      },
      validation: (value) => {
        // Validation handled by required field
        return null;
      }
    },
    {
      label: 'Role ARN',
      field: 'role',
      type: 'text',
      placeholder: 'arn:aws:iam::123456789012:role/lambda-role',
      required: function() { 
        return this.operation === 'create_function';
      },
      validation: (value) => {
        if (value && typeof value === 'string' && !/^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/.test(value)) {
          return 'Invalid Role ARN format';
        }
        return null;
      }
    },
    {
      label: 'Code ZIP File (Base64)',
      field: 'zipFile',
      type: 'textarea',
      placeholder: 'Base64 encoded ZIP file content',
      required: function() { 
        return ['create_function', 'update_function_code'].includes(this.operation) && !this.s3Bucket;
      }
    },
    {
      label: 'S3 Bucket',
      field: 's3Bucket',
      type: 'text',
      placeholder: 'my-lambda-code-bucket',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string' && !/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(value)) {
          return 'Invalid bucket name format';
        }
        return null;
      }
    },
    {
      label: 'S3 Key',
      field: 's3Key',
      type: 'text',
      placeholder: 'path/to/function.zip',
      required: function() { 
        return ['create_function', 'update_function_code'].includes(this.operation) && this.s3Bucket;
      }
    },
    {
      label: 'S3 Object Version',
      field: 's3ObjectVersion',
      type: 'text',
      placeholder: 'version-id',
      required: false
    },
    {
      label: 'Description',
      field: 'description',
      type: 'textarea',
      placeholder: 'Function description',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string' && value.length > 256) {
          return 'Description must be 256 characters or less';
        }
        return null;
      }
    },
    {
      label: 'Timeout (seconds)',
      field: 'timeout',
      type: 'number',
      placeholder: '3',
      defaultValue: 3,
      required: false,
      validation: (value) => {
        if (value !== undefined && value !== null) {
          const numValue = typeof value === 'string' ? parseInt(value, 10) : Number(value);
          if (numValue < 1 || numValue > 900) {
            return 'Timeout must be between 1 and 900 seconds';
          }
        }
        return null;
      }
    },
    {
      label: 'Memory Size (MB)',
      field: 'memorySize',
      type: 'select',
      options: [
        { value: '128', label: '128 MB' },
        { value: '256', label: '256 MB' },
        { value: '512', label: '512 MB' },
        { value: '1024', label: '1 GB' },
        { value: '2048', label: '2 GB' },
        { value: '3072', label: '3 GB' },
        { value: '4096', label: '4 GB' },
        { value: '5120', label: '5 GB' },
        { value: '6144', label: '6 GB' },
        { value: '7168', label: '7 GB' },
        { value: '8192', label: '8 GB' },
        { value: '9216', label: '9 GB' },
        { value: '10240', label: '10 GB' }
      ] as Array<{ value: string; label: string }>,
      defaultValue: 128,
      required: false
    },

    // Environment Variables
    {
      label: 'Environment Variables (JSON)',
      field: 'environment',
      type: 'textarea',
      placeholder: '{"NODE_ENV": "production", "API_KEY": "secret"}',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (typeof parsed !== 'object' || Array.isArray(parsed)) {
              return 'Environment variables must be a JSON object';
            }
          } catch {
            return 'Environment variables must be valid JSON';
          }
        }
        return null;
      }
    },

    // VPC Configuration
    {
      label: 'VPC Subnet IDs',
      field: 'subnetIds',
      type: 'text',
      placeholder: 'subnet-123abc,subnet-456def',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string') {
          const subnets = value.split(',').map(s => s.trim());
          for (const subnet of subnets) {
            if (!/^subnet-[0-9a-f]{17}$/.test(subnet)) {
              return `Invalid subnet ID format: ${subnet}`;
            }
          }
        }
        return null;
      }
    },
    {
      label: 'VPC Security Group IDs',
      field: 'securityGroupIds',
      type: 'text',
      placeholder: 'sg-123abc,sg-456def',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string') {
          const groups = value.split(',').map(g => g.trim());
          for (const group of groups) {
            if (!/^sg-[0-9a-f]{17}$/.test(group)) {
              return `Invalid security group ID format: ${group}`;
            }
          }
        }
        return null;
      }
    },

    // Layer Configuration
    {
      label: 'Layer Name',
      field: 'layerName',
      type: 'text',
      placeholder: 'my-layer',
      required: function() { 
        return ['publish_layer_version', 'list_layer_versions', 'get_layer_version', 'delete_layer_version'].includes(this.operation);
      }
    },
    {
      label: 'Layer Version',
      field: 'layerVersion',
      type: 'number',
      placeholder: '1',
      required: function() { 
        return ['get_layer_version', 'delete_layer_version'].includes(this.operation);
      }
    },
    {
      label: 'Compatible Runtimes',
      field: 'compatibleRuntimes',
      type: 'text',
      placeholder: 'nodejs18.x,nodejs20.x',
      required: function() { 
        return this.operation === 'publish_layer_version';
      }
    },

    // Alias Configuration
    {
      label: 'Alias Name',
      field: 'aliasName',
      type: 'text',
      placeholder: 'PROD',
      required: function() { 
        return ['create_alias', 'update_alias', 'delete_alias', 'get_alias'].includes(this.operation);
      },
      validation: (value) => {
        if (value && typeof value === 'string') {
          if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
            return 'Alias name can only contain letters, numbers, hyphens, and underscores';
          }
        }
        return null;
      }
    },
    {
      label: 'Function Version',
      field: 'functionVersion',
      type: 'text',
      placeholder: '1',
      required: function() { 
        return ['create_alias', 'update_alias'].includes(this.operation);
      }
    },

    // Event Source Mapping
    {
      label: 'Event Source ARN',
      field: 'eventSourceArn',
      type: 'text',
      placeholder: 'arn:aws:kinesis:region:account:stream/stream-name',
      required: function() { 
        return this.operation === 'create_event_source_mapping';
      }
    },
    {
      label: 'Batch Size',
      field: 'batchSize',
      type: 'number',
      placeholder: '10',
      defaultValue: 10,
      required: false,
      validation: (value) => {
        if (value !== undefined && value !== null) {
          const numValue = typeof value === 'string' ? parseInt(value, 10) : Number(value);
          if (numValue < 1 || numValue > 10000) {
            return 'Batch size must be between 1 and 10000';
          }
        }
        return null;
      }
    },
    {
      label: 'Starting Position',
      field: 'startingPosition',
      type: 'select',
      options: [
        { value: 'TRIM_HORIZON', label: 'Trim Horizon (Beginning)' },
        { value: 'LATEST', label: 'Latest' },
        { value: 'AT_TIMESTAMP', label: 'At Timestamp' }
      ],
      required: function() { 
        return this.operation === 'create_event_source_mapping';
      }
    },

    // Concurrency Configuration
    {
      label: 'Reserved Concurrent Executions',
      field: 'reservedConcurrentExecutions',
      type: 'number',
      placeholder: '100',
      required: function() { 
        return this.operation === 'put_function_concurrency';
      },
      validation: (value) => {
        if (value !== undefined && value !== null) {
          const numValue = typeof value === 'string' ? parseInt(value, 10) : Number(value);
          if (numValue < 0 || numValue > 1000) {
            return 'Reserved concurrent executions must be between 0 and 1000';
          }
        }
        return null;
      }
    },
    {
      label: 'Provisioned Concurrent Executions',
      field: 'provisionedConcurrentExecutions',
      type: 'number',
      placeholder: '10',
      required: function() { 
        return this.operation === 'put_provisioned_concurrency';
      },
      validation: (value) => {
        if (value !== undefined && value !== null) {
          const numValue = typeof value === 'string' ? parseInt(value, 10) : Number(value);
          if (numValue < 1 || numValue > 1000) {
            return 'Provisioned concurrent executions must be between 1 and 1000';
          }
        }
        return null;
      }
    },

    // Tags
    {
      label: 'Tags (JSON)',
      field: 'tags',
      type: 'textarea',
      placeholder: '{"Environment": "Production", "Team": "Backend"}',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (typeof parsed !== 'object' || Array.isArray(parsed)) {
              return 'Tags must be a JSON object';
            }
          } catch {
            return 'Tags must be valid JSON';
          }
        }
        return null;
      }
    },

    // Advanced Options
    {
      label: 'Tracing Config',
      field: 'tracingConfig',
      type: 'select',
      options: [
        { value: 'Active', label: 'Active' },
        { value: 'PassThrough', label: 'Pass Through' }
      ],
      required: false
    },
    {
      label: 'Dead Letter Queue ARN',
      field: 'deadLetterQueueArn',
      type: 'text',
      placeholder: 'arn:aws:sqs:region:account:queue-name',
      required: false
    },
    {
      label: 'KMS Key ARN',
      field: 'kmsKeyArn',
      type: 'text',
      placeholder: 'arn:aws:kms:region:account:key/key-id',
      required: false
    },
    {
      label: 'Architectures',
      field: 'architectures',
      type: 'select',
      options: [
        { value: 'x86_64', label: 'x86_64' },
        { value: 'arm64', label: 'arm64 (Graviton2)' }
      ],
      defaultValue: 'x86_64',
      required: false
    },
    {
      label: 'Ephemeral Storage (MB)',
      field: 'ephemeralStorage',
      type: 'number',
      placeholder: '512',
      defaultValue: 512,
      required: false,
      validation: (value) => {
        if (value !== undefined && value !== null) {
          const numValue = typeof value === 'string' ? parseInt(value, 10) : Number(value);
          if (numValue < 512 || numValue > 10240) {
            return 'Ephemeral storage must be between 512 and 10240 MB';
          }
        }
        return null;
      }
    }
  ],
  examples: [
    {
      name: 'Invoke Function',
      description: 'Invoke a Lambda function synchronously',
      config: {
        authMethod: 'access_key',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-east-1',
        operation: 'invoke',
        functionName: 'my-function',
        invocationType: 'RequestResponse',
        payload: '{"name": "John", "age": 30}',
        logType: 'Tail'
      }
    },
    {
      name: 'Invoke via Function URL',
      description: 'Invoke function using public URL',
      config: {
        authMethod: 'function_url',
        functionUrl: 'https://abcdefghij.lambda-url.us-east-1.on.aws/',
        operation: 'invoke',
        payload: '{"action": "process", "data": {"id": "123"}}'
      }
    },
    {
      name: 'Create Function',
      description: 'Create a new Lambda function',
      config: {
        authMethod: 'access_key',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-west-2',
        operation: 'create_function',
        functionName: 'my-new-function',
        runtime: 'nodejs18.x',
        handler: 'index.handler',
        role: 'arn:aws:iam::123456789012:role/lambda-execution-role',
        s3Bucket: 'my-lambda-code',
        s3Key: 'functions/my-function.zip',
        description: 'Process incoming webhook data',
        timeout: 30,
        memorySize: 256,
        environment: '{"NODE_ENV": "production", "API_ENDPOINT": "https://api.example.com"}'
      }
    },
    {
      name: 'Update Function Configuration',
      description: 'Update Lambda function settings',
      config: {
        authMethod: 'access_key',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-east-1',
        operation: 'update_function_configuration',
        functionName: 'my-function',
        timeout: 60,
        memorySize: 512,
        environment: '{"NODE_ENV": "production", "DEBUG": "true"}',
        tracingConfig: 'Active'
      }
    },
    {
      name: 'Create Event Source Mapping',
      description: 'Connect Lambda to Kinesis stream',
      config: {
        authMethod: 'access_key',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-east-1',
        operation: 'create_event_source_mapping',
        functionName: 'stream-processor',
        eventSourceArn: 'arn:aws:kinesis:us-east-1:123456789012:stream/my-stream',
        batchSize: 100,
        startingPosition: 'LATEST'
      }
    },
    {
      name: 'Async Invocation',
      description: 'Invoke function asynchronously',
      config: {
        authMethod: 'access_key',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'eu-west-1',
        operation: 'invoke_async',
        functionName: 'background-processor',
        invocationType: 'Event',
        payload: '{"jobId": "job-12345", "action": "process-images"}'
      }
    }
  ]
};