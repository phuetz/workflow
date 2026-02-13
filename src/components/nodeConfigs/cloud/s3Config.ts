import { NodeConfigDefinition, validators, commonFields } from '../../../types/nodeConfig';

export const s3Config: NodeConfigDefinition = {
  fields: [
    {
      label: 'AWS Access Key ID',
      field: 'accessKeyId',
      type: 'password',
      required: true,
      placeholder: 'AKIAIOSFODNN7EXAMPLE',
      validation: validators.required('Access Key ID')
    },
    {
      label: 'AWS Secret Access Key',
      field: 'secretAccessKey',
      type: 'password',
      required: true,
      placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      validation: validators.required('Secret Access Key')
    },
    {
      label: 'Region',
      field: 'region',
      type: 'select',
      required: true,
      defaultValue: 'us-east-1',
      options: [
        { value: 'us-east-1', label: 'US East (N. Virginia)' },
        { value: 'us-east-2', label: 'US East (Ohio)' },
        { value: 'us-west-1', label: 'US West (N. California)' },
        { value: 'us-west-2', label: 'US West (Oregon)' },
        { value: 'eu-west-1', label: 'EU (Ireland)' },
        { value: 'eu-west-2', label: 'EU (London)' },
        { value: 'eu-west-3', label: 'EU (Paris)' },
        { value: 'eu-central-1', label: 'EU (Frankfurt)' },
        { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
        { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
        { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
        { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)' },
        { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
        { value: 'ca-central-1', label: 'Canada (Central)' },
        { value: 'sa-east-1', label: 'South America (São Paulo)' }
      ]
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      defaultValue: 'download',
      options: [
        { value: 'upload', label: 'Upload File' },
        { value: 'download', label: 'Download File' },
        { value: 'list', label: 'List Files' },
        { value: 'delete', label: 'Delete File' },
        { value: 'copy', label: 'Copy File' },
        { value: 'move', label: 'Move File' },
        { value: 'createBucket', label: 'Create Bucket' },
        { value: 'deleteBucket', label: 'Delete Bucket' },
        { value: 'getBucketInfo', label: 'Get Bucket Info' },
        { value: 'getObjectMetadata', label: 'Get Object Metadata' },
        { value: 'generatePresignedUrl', label: 'Generate Presigned URL' }
      ]
    },
    {
      label: 'Bucket Name',
      field: 'bucket',
      type: 'text',
      required: true,
      placeholder: 'my-bucket-name',
      validation: (value) => {
        const bucketName = value as string;
        if (!bucketName) return 'Bucket name is required';
        if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(bucketName)) {
          return 'Invalid bucket name. Must be lowercase, alphanumeric, dots and hyphens only';
        }
        if (bucketName.length < 3 || bucketName.length > 63) {
          return 'Bucket name must be between 3 and 63 characters';
        }
        return null;
      }
    },
    {
      label: 'Object Key/Path',
      field: 'key',
      type: 'text',
      placeholder: 'path/to/file.txt',
      description: 'S3 object key (file path)',
      validation: (value, config) => {
        const operation = config?.operation as string;
        if (!value && operation && ['upload', 'download', 'delete', 'copy', 'move', 'getObjectMetadata'].includes(operation)) {
          return 'Object key is required for this operation';
        }
        return null;
      }
    },
    {
      label: 'Target Bucket (for copy/move)',
      field: 'targetBucket',
      type: 'text',
      placeholder: 'target-bucket-name',
      description: 'Destination bucket for copy/move operations'
    },
    {
      label: 'Target Key (for copy/move)',
      field: 'targetKey',
      type: 'text',
      placeholder: 'new/path/to/file.txt',
      description: 'Destination key for copy/move operations'
    },
    {
      label: 'File Content (for upload)',
      field: 'fileContent',
      type: 'expression',
      placeholder: '{{$binary.data}}',
      description: 'File content to upload (binary or text)'
    },
    {
      label: 'Content Type',
      field: 'contentType',
      type: 'text',
      placeholder: 'application/octet-stream',
      defaultValue: 'application/octet-stream',
      description: 'MIME type of the file'
    },
    {
      label: 'ACL (Access Control)',
      field: 'acl',
      type: 'select',
      defaultValue: 'private',
      options: [
        { value: 'private', label: 'Private' },
        { value: 'public-read', label: 'Public Read' },
        { value: 'public-read-write', label: 'Public Read/Write' },
        { value: 'authenticated-read', label: 'Authenticated Read' },
        { value: 'bucket-owner-read', label: 'Bucket Owner Read' },
        { value: 'bucket-owner-full-control', label: 'Bucket Owner Full Control' }
      ]
    },
    {
      label: 'Storage Class',
      field: 'storageClass',
      type: 'select',
      defaultValue: 'STANDARD',
      options: [
        { value: 'STANDARD', label: 'Standard' },
        { value: 'REDUCED_REDUNDANCY', label: 'Reduced Redundancy' },
        { value: 'STANDARD_IA', label: 'Standard - Infrequent Access' },
        { value: 'ONEZONE_IA', label: 'One Zone - Infrequent Access' },
        { value: 'INTELLIGENT_TIERING', label: 'Intelligent Tiering' },
        { value: 'GLACIER', label: 'Glacier' },
        { value: 'DEEP_ARCHIVE', label: 'Deep Archive' }
      ]
    },
    {
      label: 'Prefix (for list)',
      field: 'prefix',
      type: 'text',
      placeholder: 'folder/',
      description: 'Filter results by prefix when listing'
    },
    {
      label: 'Max Keys (for list)',
      field: 'maxKeys',
      type: 'number',
      placeholder: '1000',
      defaultValue: 1000,
      description: 'Maximum number of objects to list',
      validation: validators.positiveNumber
    },
    {
      label: 'Expiration (for presigned URL)',
      field: 'expiration',
      type: 'number',
      placeholder: '3600',
      defaultValue: 3600,
      description: 'URL expiration time in seconds',
      validation: validators.positiveNumber
    },
    {
      label: 'Server-Side Encryption',
      field: 'serverSideEncryption',
      type: 'checkbox',
      defaultValue: false,
      description: 'Enable server-side encryption'
    },
    {
      label: 'Metadata',
      field: 'metadata',
      type: 'json',
      placeholder: '{"author": "{{$json.user}}", "department": "sales"}',
      description: 'Custom metadata for the object',
      validation: (value) => {
        if (!value) return null;
        const jsonString = value as string;
        return validators.json(jsonString);
      }
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};
    const operation = config.operation as string;

    // Operation-specific validations
    if (['upload'].includes(operation) && !config.fileContent) {
      errors.fileContent = 'File content is required for upload';
    }

    if (['download', 'delete', 'getObjectMetadata'].includes(operation) && !config.key) {
      errors.key = 'Object key is required for this operation';
    }

    if (['copy', 'move'].includes(operation)) {
      if (!config.key) errors.key = 'Source key is required';
      if (!config.targetBucket) errors.targetBucket = 'Target bucket is required';
      if (!config.targetKey) errors.targetKey = 'Target key is required';
    }

    if (operation === 'generatePresignedUrl' && !config.key) {
      errors.key = 'Object key is required to generate presigned URL';
    }

    return errors;
  },

  transform: (config) => {
    // Parse metadata JSON if provided
    if (config.metadata && typeof config.metadata === 'string') {
      try {
        config.metadata = JSON.parse(config.metadata);
      } catch (e) {
        // Keep as string
      }
    }

    return config;
  },

  examples: [
    {
      label: 'Upload File',
      config: {
        accessKeyId: 'YOUR_ACCESS_KEY',
        secretAccessKey: 'YOUR_SECRET_KEY',
        region: 'us-east-1',
        operation: 'upload',
        bucket: 'my-files',
        key: 'uploads/{{$json.filename}}',
        fileContent: '{{$binary.data}}',
        contentType: 'image/jpeg',
        acl: 'private'
      }
    },
    {
      label: 'Download File',
      config: {
        accessKeyId: 'YOUR_ACCESS_KEY',
        secretAccessKey: 'YOUR_SECRET_KEY',
        region: 'us-east-1',
        operation: 'download',
        bucket: 'my-files',
        key: 'documents/report.pdf'
      }
    },
    {
      label: 'List Files',
      config: {
        accessKeyId: 'YOUR_ACCESS_KEY',
        secretAccessKey: 'YOUR_SECRET_KEY',
        region: 'us-east-1',
        operation: 'list',
        bucket: 'my-files',
        prefix: 'images/',
        maxKeys: 100
      }
    },
    {
      label: 'Generate Presigned URL',
      config: {
        accessKeyId: 'YOUR_ACCESS_KEY',
        secretAccessKey: 'YOUR_SECRET_KEY',
        region: 'us-east-1',
        operation: 'generatePresignedUrl',
        bucket: 'my-files',
        key: 'private/document.pdf',
        expiration: 3600
      }
    },
    {
      label: 'Copy File',
      config: {
        accessKeyId: 'YOUR_ACCESS_KEY',
        secretAccessKey: 'YOUR_SECRET_KEY',
        region: 'us-east-1',
        operation: 'copy',
        bucket: 'source-bucket',
        key: 'original/file.txt',
        targetBucket: 'destination-bucket',
        targetKey: 'backup/file.txt'
      }
    },
    {
      label: 'Delete File',
      config: {
        accessKeyId: 'YOUR_ACCESS_KEY',
        secretAccessKey: 'YOUR_SECRET_KEY',
        region: 'us-east-1',
        operation: 'delete',
        bucket: 'my-files',
        key: 'temp/old-file.tmp'
      }
    }
  ]
};