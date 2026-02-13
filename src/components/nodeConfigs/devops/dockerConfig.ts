import { NodeConfigDefinition } from '../../../types/nodeConfig';

// Helper arrays for conditional field visibility
const containerOps = [
  'container_start', 'container_stop', 'container_restart',
  'container_remove', 'container_inspect', 'container_logs',
  'container_exec', 'container_stats', 'container_export',
  'container_commit', 'container_attach', 'container_wait',
  'container_top', 'container_update', 'network_connect',
  'network_disconnect'
];

const imageOps = [
  'image_pull', 'image_push', 'image_inspect',
  'image_remove', 'image_tag', 'image_history',
  'image_save'
];

const networkOps = [
  'network_create', 'network_inspect', 'network_remove',
  'network_connect', 'network_disconnect'
];

const volumeOps = [
  'volume_create', 'volume_inspect', 'volume_remove'
];

const pruneOps = [
  'container_prune', 'image_prune', 'network_prune',
  'volume_prune', 'system_prune'
];

const filterOps = [
  'container_list', 'image_list', 'network_list',
  'volume_list', 'container_prune', 'image_prune',
  'network_prune', 'volume_prune', 'system_events'
];

const listOps = [
  'container_list', 'image_list', 'network_list',
  'volume_list', 'system_info', 'system_version'
];

export const dockerConfig: NodeConfigDefinition = {
  fields: [
    // Authentication
    {
      label: 'Connection Type',
      field: 'connectionType',
      type: 'select',
      options: [
        { value: 'socket', label: 'Docker Socket (Local)' },
        { value: 'tcp', label: 'Docker TCP (Remote)' },
        { value: 'ssh', label: 'Docker over SSH' },
        { value: 'tls', label: 'Docker with TLS' }
      ],
      required: true,
      defaultValue: 'socket',
      description: 'How to connect to Docker daemon'
    },
    {
      label: 'Docker Host',
      field: 'dockerHost',
      type: 'text',
      placeholder: 'tcp://192.168.1.100:2376',
      required: false,
      description: 'Docker daemon endpoint'
    },
    {
      label: 'TLS Certificate',
      field: 'tlsCert',
      type: 'text',
      placeholder: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
      required: false
    },
    {
      label: 'TLS Key',
      field: 'tlsKey',
      type: 'password',
      required: false
    },
    {
      label: 'TLS CA Certificate',
      field: 'tlsCaCert',
      type: 'text',
      placeholder: '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----',
      required: false
    },
    {
      label: 'SSH User',
      field: 'sshUser',
      type: 'text',
      placeholder: 'docker',
      required: false
    },
    {
      label: 'SSH Key',
      field: 'sshKey',
      type: 'password',
      required: false
    },

    // Operation
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      options: [
        // Container Operations
        { value: 'container_create', label: 'Create Container' },
        { value: 'container_start', label: 'Start Container' },
        { value: 'container_stop', label: 'Stop Container' },
        { value: 'container_restart', label: 'Restart Container' },
        { value: 'container_remove', label: 'Remove Container' },
        { value: 'container_list', label: 'List Containers' },
        { value: 'container_inspect', label: 'Inspect Container' },
        { value: 'container_logs', label: 'Get Container Logs' },
        { value: 'container_exec', label: 'Execute Command in Container' },
        { value: 'container_stats', label: 'Get Container Stats' },
        { value: 'container_export', label: 'Export Container' },
        { value: 'container_commit', label: 'Commit Container to Image' },
        { value: 'container_attach', label: 'Attach to Container' },
        { value: 'container_wait', label: 'Wait for Container' },
        { value: 'container_top', label: 'List Container Processes' },
        { value: 'container_update', label: 'Update Container Config' },
        { value: 'container_prune', label: 'Prune Stopped Containers' },
        
        // Image Operations
        { value: 'image_pull', label: 'Pull Image' },
        { value: 'image_push', label: 'Push Image' },
        { value: 'image_build', label: 'Build Image' },
        { value: 'image_list', label: 'List Images' },
        { value: 'image_inspect', label: 'Inspect Image' },
        { value: 'image_remove', label: 'Remove Image' },
        { value: 'image_tag', label: 'Tag Image' },
        { value: 'image_history', label: 'Show Image History' },
        { value: 'image_search', label: 'Search Images' },
        { value: 'image_prune', label: 'Prune Unused Images' },
        { value: 'image_save', label: 'Save Image to Archive' },
        { value: 'image_load', label: 'Load Image from Archive' },
        
        // Network Operations
        { value: 'network_create', label: 'Create Network' },
        { value: 'network_list', label: 'List Networks' },
        { value: 'network_inspect', label: 'Inspect Network' },
        { value: 'network_remove', label: 'Remove Network' },
        { value: 'network_connect', label: 'Connect Container to Network' },
        { value: 'network_disconnect', label: 'Disconnect Container from Network' },
        { value: 'network_prune', label: 'Prune Unused Networks' },
        
        // Volume Operations
        { value: 'volume_create', label: 'Create Volume' },
        { value: 'volume_list', label: 'List Volumes' },
        { value: 'volume_inspect', label: 'Inspect Volume' },
        { value: 'volume_remove', label: 'Remove Volume' },
        { value: 'volume_prune', label: 'Prune Unused Volumes' },
        
        // System Operations
        { value: 'system_info', label: 'Get System Info' },
        { value: 'system_version', label: 'Get Docker Version' },
        { value: 'system_events', label: 'Monitor System Events' },
        { value: 'system_df', label: 'Show Disk Usage' },
        { value: 'system_prune', label: 'Prune All Unused Resources' },
        
        // Registry Operations
        { value: 'registry_login', label: 'Login to Registry' },
        { value: 'registry_logout', label: 'Logout from Registry' }
      ],
      required: true,
      description: 'Docker operation to perform'
    },

    // Container Operations Fields
    {
      label: 'Container Name/ID',
      field: 'containerId',
      type: 'text',
      placeholder: 'my-container or 8a3f9e2d1c5b',
      required: false
    },
    {
      label: 'Image',
      field: 'image',
      type: 'text',
      placeholder: 'nginx:latest',
      required: false,
      description: 'Docker image to use'
    },
    {
      label: 'Container Name',
      field: 'containerName',
      type: 'text',
      placeholder: 'my-nginx-server',
      required: false
    },
    {
      label: 'Command',
      field: 'command',
      type: 'text',
      placeholder: '/bin/bash -c "echo Hello World"',
      required: false
    },
    {
      label: 'Environment Variables',
      field: 'environment',
      type: 'json',
      placeholder: '{\n  "NODE_ENV": "production",\n  "PORT": "3000"\n}',
      required: false,
      description: 'Environment variables as JSON object'
    },
    {
      label: 'Port Mapping',
      field: 'ports',
      type: 'json',
      placeholder: '{\n  "80/tcp": [{"HostPort": "8080"}],\n  "443/tcp": [{"HostPort": "8443"}]\n}',
      required: false,
      description: 'Port bindings as JSON'
    },
    {
      label: 'Volume Mounts',
      field: 'volumes',
      type: 'json',
      placeholder: '[\n  {\n    "Type": "bind",\n    "Source": "/host/path",\n    "Target": "/container/path"\n  }\n]',
      required: false
    },
    {
      label: 'Network Mode',
      field: 'networkMode',
      type: 'select',
      options: [
        { value: 'bridge', label: 'Bridge' },
        { value: 'host', label: 'Host' },
        { value: 'none', label: 'None' },
        { value: 'container', label: 'Container' },
        { value: 'custom', label: 'Custom Network' }
      ],
      defaultValue: 'bridge'
    },
    {
      label: 'Custom Network Name',
      field: 'customNetwork',
      type: 'text',
      placeholder: 'my-network',
      required: false
    },
    {
      label: 'Restart Policy',
      field: 'restartPolicy',
      type: 'select',
      options: [
        { value: 'no', label: 'No' },
        { value: 'on-failure', label: 'On Failure' },
        { value: 'always', label: 'Always' },
        { value: 'unless-stopped', label: 'Unless Stopped' }
      ],
      defaultValue: 'no'
    },
    {
      label: 'Memory Limit',
      field: 'memoryLimit',
      type: 'text',
      placeholder: '512m or 2g',
      required: false
    },
    {
      label: 'CPU Limit',
      field: 'cpuLimit',
      type: 'number',
      placeholder: '1.5',
      required: false,
      description: 'Number of CPUs (e.g., 0.5 = 50% of one CPU)'
    },
    {
      label: 'Labels',
      field: 'labels',
      type: 'json',
      placeholder: '{\n  "app": "web",\n  "env": "production"\n}',
      required: false
    },
    {
      label: 'Privileged Mode',
      field: 'privileged',
      type: 'checkbox',
      defaultValue: false
    },
    {
      label: 'Working Directory',
      field: 'workingDir',
      type: 'text',
      placeholder: '/app',
      required: false
    },
    {
      label: 'User',
      field: 'user',
      type: 'text',
      placeholder: 'node:node or 1000:1000',
      required: false
    },
    {
      label: 'Detach',
      field: 'detach',
      type: 'checkbox',
      defaultValue: true
    },
    {
      label: 'TTY',
      field: 'tty',
      type: 'checkbox',
      defaultValue: false
    },
    {
      label: 'Interactive',
      field: 'interactive',
      type: 'checkbox',
      defaultValue: false
    },

    // Container Control Fields
    {
      label: 'Timeout (seconds)',
      field: 'timeout',
      type: 'number',
      placeholder: '10',
      defaultValue: 10
    },
    {
      label: 'Force Remove',
      field: 'force',
      type: 'checkbox',
      defaultValue: false
    },
    {
      label: 'Remove Volumes',
      field: 'removeVolumes',
      type: 'checkbox',
      defaultValue: false
    },

    // Container Monitoring Fields
    {
      label: 'Show All',
      field: 'all',
      type: 'checkbox',
      defaultValue: false,
      description: 'Show all containers/images (including stopped/intermediate)'
    },
    {
      label: 'Filters',
      field: 'filters',
      type: 'json',
      placeholder: '{\n  "status": ["running"],\n  "label": ["env=production"]\n}',
      required: false
    },
    {
      label: 'Size Info',
      field: 'size',
      type: 'checkbox',
      defaultValue: false
    },
    {
      label: 'Follow Logs',
      field: 'follow',
      type: 'checkbox',
      defaultValue: false
    },
    {
      label: 'Timestamps',
      field: 'timestamps',
      type: 'checkbox',
      defaultValue: false
    },
    {
      label: 'Tail Lines',
      field: 'tail',
      type: 'number',
      placeholder: '100',
      required: false,
      description: 'Number of lines to show from the end'
    },
    {
      label: 'Since',
      field: 'since',
      type: 'text',
      placeholder: '2023-01-01T00:00:00Z or 10m',
      required: false
    },
    {
      label: 'Until',
      field: 'until',
      type: 'text',
      placeholder: '2023-12-31T23:59:59Z or 5m',
      required: false
    },
    {
      label: 'Stream',
      field: 'stream',
      type: 'select',
      options: [
        { value: 'both', label: 'Both' },
        { value: 'stdout', label: 'Stdout Only' },
        { value: 'stderr', label: 'Stderr Only' }
      ],
      defaultValue: 'both'
    },

    // Image Operations Fields
    {
      label: 'Image Name',
      field: 'imageName',
      type: 'text',
      placeholder: 'nginx:latest or docker.io/library/nginx:latest',
      required: false
    },
    {
      label: 'Platform',
      field: 'platform',
      type: 'text',
      placeholder: 'linux/amd64',
      required: false
    },
    {
      label: 'Auth Config',
      field: 'authConfig',
      type: 'json',
      placeholder: '{\n  "username": "user",\n  "password": "pass",\n  "serveraddress": "https://index.docker.io/v1/"\n}',
      required: false
    },

    // Build Fields
    {
      label: 'Build Context',
      field: 'buildContext',
      type: 'text',
      placeholder: '/path/to/dockerfile/directory',
      required: false,
      description: 'Path to directory containing Dockerfile'
    },
    {
      label: 'Dockerfile',
      field: 'dockerfile',
      type: 'text',
      placeholder: 'Dockerfile',
      defaultValue: 'Dockerfile'
    },
    {
      label: 'Build Args',
      field: 'buildArgs',
      type: 'json',
      placeholder: '{\n  "NODE_VERSION": "18",\n  "APP_ENV": "production"\n}',
      required: false
    },
    {
      label: 'Target Stage',
      field: 'target',
      type: 'text',
      placeholder: 'production',
      required: false
    },
    {
      label: 'Cache From',
      field: 'cacheFrom',
      type: 'json',
      placeholder: '["myapp:latest", "myapp:cache"]',
      required: false
    },
    {
      label: 'No Cache',
      field: 'noCache',
      type: 'checkbox',
      defaultValue: false
    },
    {
      label: 'Tags',
      field: 'tags',
      type: 'json',
      placeholder: '["myapp:latest", "myapp:v1.0.0"]',
      required: false
    },

    // Tag Operation Fields
    {
      label: 'New Tag',
      field: 'newTag',
      type: 'text',
      placeholder: 'myapp:v2.0.0',
      required: false
    },

    // Search Fields
    {
      label: 'Search Term',
      field: 'searchTerm',
      type: 'text',
      placeholder: 'nginx',
      required: false
    },
    {
      label: 'Limit Results',
      field: 'limit',
      type: 'number',
      placeholder: '25',
      defaultValue: 25
    },
    {
      label: 'Official Only',
      field: 'officialOnly',
      type: 'checkbox',
      defaultValue: false
    },
    {
      label: 'Minimum Stars',
      field: 'stars',
      type: 'number',
      placeholder: '100',
      required: false
    },

    // Archive Operations
    {
      label: 'Archive Path',
      field: 'archivePath',
      type: 'text',
      placeholder: '/path/to/image.tar',
      required: false
    },

    // Network Operations Fields
    {
      label: 'Network Name',
      field: 'networkName',
      type: 'text',
      placeholder: 'my-network',
      required: false
    },
    {
      label: 'Network Driver',
      field: 'driver',
      type: 'select',
      options: [
        { value: 'bridge', label: 'Bridge' },
        { value: 'overlay', label: 'Overlay' },
        { value: 'host', label: 'Host' },
        { value: 'none', label: 'None' },
        { value: 'macvlan', label: 'Macvlan' }
      ],
      defaultValue: 'bridge'
    },
    {
      label: 'Subnet',
      field: 'subnet',
      type: 'text',
      placeholder: '172.20.0.0/16',
      required: false
    },
    {
      label: 'Gateway',
      field: 'gateway',
      type: 'text',
      placeholder: '172.20.0.1',
      required: false
    },
    {
      label: 'IP Range',
      field: 'ipRange',
      type: 'text',
      placeholder: '172.20.10.0/24',
      required: false
    },
    {
      label: 'Enable IPv6',
      field: 'enableIPv6',
      type: 'checkbox',
      defaultValue: false
    },
    {
      label: 'Internal',
      field: 'internal',
      type: 'checkbox',
      defaultValue: false
    },
    {
      label: 'Attachable',
      field: 'attachable',
      type: 'checkbox',
      defaultValue: false
    },
    {
      label: 'Container IP',
      field: 'containerIP',
      type: 'text',
      placeholder: '172.20.0.10',
      required: false
    },
    {
      label: 'Aliases',
      field: 'aliases',
      type: 'json',
      placeholder: '["web", "api"]',
      required: false
    },

    // Volume Operations Fields
    {
      label: 'Volume Name',
      field: 'volumeName',
      type: 'text',
      placeholder: 'my-volume',
      required: false
    },
    {
      label: 'Volume Driver',
      field: 'volumeDriver',
      type: 'text',
      placeholder: 'local',
      defaultValue: 'local'
    },
    {
      label: 'Driver Options',
      field: 'driverOpts',
      type: 'json',
      placeholder: '{\n  "type": "nfs",\n  "o": "addr=10.0.0.10,rw",\n  "device": ":/exports/data"\n}',
      required: false
    },
    {
      label: 'Volume Labels',
      field: 'volumeLabels',
      type: 'json',
      placeholder: '{\n  "project": "myapp",\n  "env": "production"\n}',
      required: false
    },

    // Commit Operation Fields
    {
      label: 'Repository',
      field: 'repository',
      type: 'text',
      placeholder: 'myapp',
      required: false
    },
    {
      label: 'Tag',
      field: 'tag',
      type: 'text',
      placeholder: 'v1.0.0',
      required: false
    },
    {
      label: 'Author',
      field: 'author',
      type: 'text',
      placeholder: 'John Doe <john@example.com>',
      required: false
    },
    {
      label: 'Message',
      field: 'message',
      type: 'text',
      placeholder: 'Added custom configuration',
      required: false
    },
    {
      label: 'Pause Container',
      field: 'pause',
      type: 'checkbox',
      defaultValue: true
    },

    // System Operations Fields
    {
      label: 'Prune Options',
      field: 'pruneOptions',
      type: 'select',
      options: [
        { value: 'all', label: 'All Unused Resources' },
        { value: 'containers', label: 'Containers Only' },
        { value: 'images', label: 'Images Only' },
        { value: 'volumes', label: 'Volumes Only' },
        { value: 'networks', label: 'Networks Only' }
      ],
      required: false
    },
    {
      label: 'Prune All',
      field: 'pruneAll',
      type: 'checkbox',
      defaultValue: false,
      description: 'Remove all unused resources, not just dangling ones'
    },

    // Registry Fields
    {
      label: 'Registry',
      field: 'registry',
      type: 'text',
      placeholder: 'https://index.docker.io/v1/',
      required: false
    },

    // Output Options
    {
      label: 'Output Format',
      field: 'format',
      type: 'select',
      options: [
        { value: 'json', label: 'JSON' },
        { value: 'table', label: 'Table' },
        { value: 'raw', label: 'Raw' }
      ],
      defaultValue: 'json'
    }
  ],

  examples: [
    {
      name: 'Deploy NGINX with Port Mapping',
      description: 'Create and start an NGINX container with port 80 mapped to host',
      config: {
        connectionType: 'socket',
        operation: 'container_create',
        image: 'nginx:alpine',
        containerName: 'web-server',
        ports: {
          '80/tcp': [{ 'HostPort': '8080' }]
        },
        restartPolicy: 'unless-stopped',
        labels: {
          'app': 'webserver',
          'env': 'production'
        }
      }
    },
    {
      name: 'Build Custom Node.js App',
      description: 'Build a Docker image from Dockerfile with build arguments',
      config: {
        connectionType: 'socket',
        operation: 'image_build',
        buildContext: '/app',
        tags: ['myapp:latest', 'myapp:v1.0.0'],
        buildArgs: {
          'NODE_VERSION': '18-alpine',
          'APP_PORT': '3000'
        },
        target: 'production',
        noCache: false
      }
    },
    {
      name: 'Execute Database Backup',
      description: 'Run pg_dump in a PostgreSQL container',
      config: {
        connectionType: 'socket',
        operation: 'container_exec',
        containerId: 'postgres-db',
        command: 'pg_dump -U postgres mydb > /backup/mydb.sql',
        user: 'postgres',
        workingDir: '/var/lib/postgresql',
        detach: false
      }
    },
    {
      name: 'Create Isolated Network',
      description: 'Create a custom bridge network for microservices',
      config: {
        connectionType: 'socket',
        operation: 'network_create',
        networkName: 'microservices',
        driver: 'bridge',
        subnet: '172.25.0.0/16',
        gateway: '172.25.0.1',
        internal: false,
        attachable: true,
        labels: {
          'project': 'microservices',
          'environment': 'production'
        }
      }
    },
    {
      name: 'Monitor Container Logs',
      description: 'Stream real-time logs from a running container',
      config: {
        connectionType: 'socket',
        operation: 'container_logs',
        containerId: 'app-server',
        follow: true,
        timestamps: true,
        tail: 100,
        stream: 'both'
      }
    },
    {
      name: 'Push to Private Registry',
      description: 'Tag and push image to private Docker registry',
      config: {
        connectionType: 'socket',
        operation: 'image_push',
        imageName: 'registry.company.com/myapp:v2.0.0',
        authConfig: {
          'username': 'deploy-user',
          'password': '${REGISTRY_PASSWORD}',
          'serveraddress': 'https://registry.company.com'
        }
      }
    }
  ]
};