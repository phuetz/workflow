import { NodeConfigDefinition } from '../../../types/nodeConfig';

export const redisConfig: NodeConfigDefinition = {
  fields: [
    // Connection Configuration
    {
      label: 'Connection Method',
      field: 'connectionMethod',
      type: 'select',
      options: [
        { value: 'standalone', label: 'Standalone Redis' },
        { value: 'cluster', label: 'Redis Cluster' },
        { value: 'sentinel', label: 'Redis Sentinel' },
        { value: 'url', label: 'Connection URL' }
      ],
      required: true,
      defaultValue: 'standalone'
    },
    {
      label: 'Host',
      field: 'host',
      type: 'text',
      placeholder: 'localhost',
      required: function() { return this.connectionMethod === 'standalone'; },
      validation: (value, config) => {
        if (config.connectionMethod === 'standalone' && !value) {
          return 'Host is required';
        }
        return null;
      }
    },
    {
      label: 'Port',
      field: 'port',
      type: 'number',
      placeholder: '6379',
      defaultValue: 6379,
      required: function() { return this.connectionMethod === 'standalone'; },
      validation: (value, config) => {
        if (config.connectionMethod === 'standalone') {
          if (!value) return 'Port is required';
          const port = typeof value === 'number' ? value : Number(value);
          if (port < 1 || port > 65535) {
            return 'Port must be between 1 and 65535';
          }
        }
        return null;
      }
    },
    {
      label: 'Connection URL',
      field: 'url',
      type: 'text',
      placeholder: 'redis://user:password@localhost:6379/0',
      required: function() { return this.connectionMethod === 'url'; },
      validation: (value, config) => {
        if (config.connectionMethod === 'url' && !value) {
          return 'Connection URL is required';
        }
        if (value && typeof value === 'string' && !value.match(/^redis(s)?:\/\/.*/)) {
          return 'Invalid Redis URL format (must start with redis:// or rediss://)';
        }
        return null;
      }
    },
    {
      label: 'Password',
      field: 'password',
      type: 'password',
      placeholder: 'redis-password',
      required: false
    },
    {
      label: 'Database Number',
      field: 'database',
      type: 'number',
      placeholder: '0',
      defaultValue: 0,
      required: false,
      validation: (value) => {
        if (value !== undefined) {
          const dbNum = typeof value === 'number' ? value : Number(value);
          if (dbNum < 0 || dbNum > 15) {
            return 'Database number must be between 0 and 15';
          }
        }
        return null;
      }
    },
    {
      label: 'Username (Redis 6+)',
      field: 'username',
      type: 'text',
      placeholder: 'default',
      required: false
    },
    {
      label: 'TLS/SSL',
      field: 'tls',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },

    // Cluster Configuration
    {
      label: 'Cluster Nodes',
      field: 'clusterNodes',
      type: 'textarea',
      placeholder: 'host1:6379\nhost2:6379\nhost3:6379',
      required: function() { return this.connectionMethod === 'cluster'; },
      validation: (value, config) => {
        if (config.connectionMethod === 'cluster' && !value) {
          return 'At least one cluster node is required';
        }
        if (value && typeof value === 'string') {
          const nodes = value.split('\n').map((n: string) => n.trim()).filter((n: string) => n);
          for (const node of nodes) {
            if (!node.match(/^[^:]+:\d+$/)) {
              return `Invalid node format: ${node} (use host:port)`;
            }
          }
        }
        return null;
      }
    },

    // Sentinel Configuration
    {
      label: 'Sentinel Hosts',
      field: 'sentinelHosts',
      type: 'textarea',
      placeholder: 'sentinel1:26379\nsentinel2:26379\nsentinel3:26379',
      required: function() { return this.connectionMethod === 'sentinel'; },
      validation: (value, config) => {
        if (config.connectionMethod === 'sentinel' && !value) {
          return 'At least one sentinel host is required';
        }
        if (value && typeof value === 'string') {
          const hosts = value.split('\n').map((h: string) => h.trim()).filter((h: string) => h);
          for (const host of hosts) {
            if (!host.match(/^[^:]+:\d+$/)) {
              return `Invalid sentinel format: ${host} (use host:port)`;
            }
          }
        }
        return null;
      }
    },
    {
      label: 'Master Name',
      field: 'masterName',
      type: 'text',
      placeholder: 'mymaster',
      required: function() { return this.connectionMethod === 'sentinel'; },
      validation: (value, config) => {
        if (config.connectionMethod === 'sentinel' && !value) {
          return 'Master name is required for Sentinel';
        }
        return null;
      }
    },

    // Operation Configuration
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      options: [
        // Key Operations
        { value: 'get', label: 'Get' },
        { value: 'set', label: 'Set' },
        { value: 'setex', label: 'Set with Expiration' },
        { value: 'setnx', label: 'Set if Not Exists' },
        { value: 'getset', label: 'Get and Set' },
        { value: 'mget', label: 'Multiple Get' },
        { value: 'mset', label: 'Multiple Set' },
        { value: 'del', label: 'Delete' },
        { value: 'exists', label: 'Exists' },
        { value: 'expire', label: 'Set Expiration' },
        { value: 'ttl', label: 'Get TTL' },
        { value: 'persist', label: 'Remove Expiration' },
        { value: 'keys', label: 'List Keys' },
        { value: 'scan', label: 'Scan Keys' },
        { value: 'randomkey', label: 'Random Key' },
        { value: 'rename', label: 'Rename Key' },
        { value: 'type', label: 'Get Key Type' },
        
        // String Operations
        { value: 'append', label: 'Append' },
        { value: 'incr', label: 'Increment' },
        { value: 'incrby', label: 'Increment By' },
        { value: 'decr', label: 'Decrement' },
        { value: 'decrby', label: 'Decrement By' },
        { value: 'strlen', label: 'String Length' },
        
        // Hash Operations
        { value: 'hget', label: 'Hash Get' },
        { value: 'hset', label: 'Hash Set' },
        { value: 'hmget', label: 'Hash Multiple Get' },
        { value: 'hmset', label: 'Hash Multiple Set' },
        { value: 'hgetall', label: 'Hash Get All' },
        { value: 'hdel', label: 'Hash Delete' },
        { value: 'hexists', label: 'Hash Exists' },
        { value: 'hkeys', label: 'Hash Keys' },
        { value: 'hvals', label: 'Hash Values' },
        { value: 'hlen', label: 'Hash Length' },
        { value: 'hincrby', label: 'Hash Increment By' },
        
        // List Operations
        { value: 'lpush', label: 'List Push Left' },
        { value: 'rpush', label: 'List Push Right' },
        { value: 'lpop', label: 'List Pop Left' },
        { value: 'rpop', label: 'List Pop Right' },
        { value: 'lrange', label: 'List Range' },
        { value: 'llen', label: 'List Length' },
        { value: 'lindex', label: 'List Get By Index' },
        { value: 'lset', label: 'List Set By Index' },
        { value: 'ltrim', label: 'List Trim' },
        { value: 'lrem', label: 'List Remove' },
        
        // Set Operations
        { value: 'sadd', label: 'Set Add' },
        { value: 'srem', label: 'Set Remove' },
        { value: 'smembers', label: 'Set Members' },
        { value: 'sismember', label: 'Set Is Member' },
        { value: 'scard', label: 'Set Cardinality' },
        { value: 'srandmember', label: 'Set Random Member' },
        { value: 'spop', label: 'Set Pop' },
        { value: 'sunion', label: 'Set Union' },
        { value: 'sinter', label: 'Set Intersection' },
        { value: 'sdiff', label: 'Set Difference' },
        
        // Sorted Set Operations
        { value: 'zadd', label: 'Sorted Set Add' },
        { value: 'zrem', label: 'Sorted Set Remove' },
        { value: 'zrange', label: 'Sorted Set Range' },
        { value: 'zrevrange', label: 'Sorted Set Reverse Range' },
        { value: 'zrank', label: 'Sorted Set Rank' },
        { value: 'zscore', label: 'Sorted Set Score' },
        { value: 'zcard', label: 'Sorted Set Cardinality' },
        { value: 'zincrby', label: 'Sorted Set Increment By' },
        
        // Pub/Sub Operations
        { value: 'publish', label: 'Publish' },
        { value: 'subscribe', label: 'Subscribe' },
        { value: 'unsubscribe', label: 'Unsubscribe' },
        { value: 'psubscribe', label: 'Pattern Subscribe' },
        { value: 'punsubscribe', label: 'Pattern Unsubscribe' },
        
        // Transaction Operations
        { value: 'multi', label: 'Start Transaction' },
        { value: 'exec', label: 'Execute Transaction' },
        { value: 'discard', label: 'Discard Transaction' },
        { value: 'watch', label: 'Watch Keys' },
        { value: 'unwatch', label: 'Unwatch Keys' },
        
        // Server Operations
        { value: 'ping', label: 'Ping' },
        { value: 'info', label: 'Server Info' },
        { value: 'dbsize', label: 'Database Size' },
        { value: 'flushdb', label: 'Flush Database' },
        { value: 'flushall', label: 'Flush All' },
        { value: 'save', label: 'Save' },
        { value: 'bgsave', label: 'Background Save' },
        { value: 'lastsave', label: 'Last Save Time' }
      ],
      required: true
    },

    // Key/Value Configuration
    {
      label: 'Key',
      field: 'key',
      type: 'text',
      placeholder: 'mykey',
      required: function() { 
        return !['ping', 'info', 'dbsize', 'flushdb', 'flushall', 'save', 'bgsave', 'lastsave', 
                'multi', 'exec', 'discard', 'unwatch', 'keys', 'scan', 'randomkey'].includes(this.operation);
      },
      validation: (value, config) => {
        const noKeyOps = ['ping', 'info', 'dbsize', 'flushdb', 'flushall', 'save', 'bgsave', 'lastsave',
                          'multi', 'exec', 'discard', 'unwatch', 'keys', 'scan', 'randomkey'];
        const operation = typeof config.operation === 'string' ? config.operation : '';
        if (!noKeyOps.includes(operation) && !value) {
          return 'Key is required for this operation';
        }
        return null;
      }
    },
    {
      label: 'Value',
      field: 'value',
      type: 'text',
      placeholder: 'myvalue',
      required: function() { 
        return ['set', 'setex', 'setnx', 'getset', 'append'].includes(this.operation);
      }
    },
    {
      label: 'Field (for Hash operations)',
      field: 'field',
      type: 'text',
      placeholder: 'field1',
      required: function() { 
        return ['hget', 'hset', 'hdel', 'hexists'].includes(this.operation);
      }
    },
    {
      label: 'Multiple Keys (one per line)',
      field: 'multipleKeys',
      type: 'textarea',
      placeholder: 'key1\nkey2\nkey3',
      required: function() { 
        return ['mget', 'del', 'exists', 'watch'].includes(this.operation);
      }
    },
    {
      label: 'Key-Value Pairs (JSON)',
      field: 'keyValuePairs',
      type: 'textarea',
      placeholder: '{"key1": "value1", "key2": "value2"}',
      required: function() { 
        return ['mset', 'hmset'].includes(this.operation);
      },
      validation: (value, config) => {
        const operation = typeof config.operation === 'string' ? config.operation : '';
        if (['mset', 'hmset'].includes(operation) && value) {
          try {
            JSON.parse(String(value));
          } catch {
            return 'Key-value pairs must be valid JSON';
          }
        }
        return null;
      }
    },

    // Expiration Configuration
    {
      label: 'TTL (seconds)',
      field: 'ttl',
      type: 'number',
      placeholder: '3600',
      required: function() { 
        return ['setex', 'expire'].includes(this.operation);
      },
      validation: (value, config) => {
        const operation = typeof config.operation === 'string' ? config.operation : '';
        if (['setex', 'expire'].includes(operation)) {
          if (!value) return 'TTL is required';
          const ttl = typeof value === 'number' ? value : Number(value);
          if (ttl < 1) return 'TTL must be positive';
        }
        return null;
      }
    },

    // List Configuration
    {
      label: 'List Values (JSON Array)',
      field: 'listValues',
      type: 'textarea',
      placeholder: '["value1", "value2", "value3"]',
      required: function() { 
        return ['lpush', 'rpush'].includes(this.operation);
      },
      validation: (value, config) => {
        const operation = typeof config.operation === 'string' ? config.operation : '';
        if (['lpush', 'rpush'].includes(operation) && value) {
          try {
            const parsed = JSON.parse(String(value));
            if (!Array.isArray(parsed)) {
              return 'List values must be a JSON array';
            }
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },
    {
      label: 'Start Index',
      field: 'start',
      type: 'number',
      placeholder: '0',
      defaultValue: 0,
      required: function() { 
        return ['lrange', 'ltrim'].includes(this.operation);
      }
    },
    {
      label: 'Stop Index',
      field: 'stop',
      type: 'number',
      placeholder: '-1',
      defaultValue: -1,
      required: function() { 
        return ['lrange', 'ltrim'].includes(this.operation);
      }
    },
    {
      label: 'List Index',
      field: 'index',
      type: 'number',
      placeholder: '0',
      required: function() { 
        return ['lindex', 'lset'].includes(this.operation);
      }
    },
    {
      label: 'Count',
      field: 'count',
      type: 'number',
      placeholder: '1',
      required: function() { 
        return ['lrem', 'spop', 'srandmember'].includes(this.operation);
      }
    },

    // Set Configuration
    {
      label: 'Set Members (JSON Array)',
      field: 'setMembers',
      type: 'textarea',
      placeholder: '["member1", "member2", "member3"]',
      required: function() { 
        return ['sadd', 'srem'].includes(this.operation);
      },
      validation: (value, config) => {
        const operation = typeof config.operation === 'string' ? config.operation : '';
        if (['sadd', 'srem'].includes(operation) && value) {
          try {
            const parsed = JSON.parse(String(value));
            if (!Array.isArray(parsed)) {
              return 'Set members must be a JSON array';
            }
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },
    {
      label: 'Set Member',
      field: 'member',
      type: 'text',
      placeholder: 'member1',
      required: function() { 
        return ['sismember'].includes(this.operation);
      }
    },
    {
      label: 'Other Keys (for set operations)',
      field: 'otherKeys',
      type: 'textarea',
      placeholder: 'key2\nkey3',
      required: function() { 
        return ['sunion', 'sinter', 'sdiff'].includes(this.operation);
      }
    },

    // Sorted Set Configuration
    {
      label: 'Score-Member Pairs (JSON)',
      field: 'scoreMemberPairs',
      type: 'textarea',
      placeholder: '{"member1": 1.0, "member2": 2.0}',
      required: function() { 
        return ['zadd'].includes(this.operation);
      },
      validation: (value, config) => {
        const operation = typeof config.operation === 'string' ? config.operation : '';
        if (operation === 'zadd' && value) {
          try {
            const parsed = JSON.parse(String(value));
            if (typeof parsed !== 'object' || Array.isArray(parsed)) {
              return 'Score-member pairs must be a JSON object';
            }
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },
    {
      label: 'With Scores',
      field: 'withScores',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Increment',
      field: 'increment',
      type: 'number',
      placeholder: '1',
      required: function() { 
        return ['incrby', 'decrby', 'hincrby', 'zincrby'].includes(this.operation);
      }
    },

    // Pub/Sub Configuration
    {
      label: 'Channel',
      field: 'channel',
      type: 'text',
      placeholder: 'mychannel',
      required: function() { 
        return ['publish', 'subscribe', 'unsubscribe'].includes(this.operation);
      }
    },
    {
      label: 'Pattern',
      field: 'pattern',
      type: 'text',
      placeholder: 'channel*',
      required: function() { 
        return ['psubscribe', 'punsubscribe', 'keys'].includes(this.operation);
      }
    },
    {
      label: 'Message',
      field: 'message',
      type: 'text',
      placeholder: 'Hello, Redis!',
      required: function() { 
        return this.operation === 'publish';
      }
    },

    // Scan Configuration
    {
      label: 'Cursor',
      field: 'cursor',
      type: 'text',
      placeholder: '0',
      defaultValue: '0',
      required: function() { 
        return this.operation === 'scan';
      }
    },
    {
      label: 'Match Pattern',
      field: 'match',
      type: 'text',
      placeholder: 'user:*',
      required: false
    },
    {
      label: 'Scan Count',
      field: 'scanCount',
      type: 'number',
      placeholder: '10',
      defaultValue: 10,
      required: false
    },

    // Advanced Options
    {
      label: 'Connection Timeout (ms)',
      field: 'connectTimeout',
      type: 'number',
      placeholder: '5000',
      defaultValue: 5000,
      required: false,
      validation: (value) => {
        if (value) {
          const timeout = typeof value === 'number' ? value : Number(value);
          if (timeout < 100) {
            return 'Connection timeout must be at least 100ms';
          }
        }
        return null;
      }
    },
    {
      label: 'Command Timeout (ms)',
      field: 'commandTimeout',
      type: 'number',
      placeholder: '5000',
      defaultValue: 5000,
      required: false,
      validation: (value) => {
        if (value) {
          const timeout = typeof value === 'number' ? value : Number(value);
          if (timeout < 100) {
            return 'Command timeout must be at least 100ms';
          }
        }
        return null;
      }
    },
    {
      label: 'Enable Offline Queue',
      field: 'enableOfflineQueue',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },
    {
      label: 'Enable Ready Check',
      field: 'enableReadyCheck',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },
    {
      label: 'Lazy Connect',
      field: 'lazyConnect',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Return Buffers',
      field: 'returnBuffers',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'String Numbers',
      field: 'stringNumbers',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Max Retries',
      field: 'maxRetriesPerRequest',
      type: 'number',
      placeholder: '3',
      defaultValue: 3,
      required: false,
      validation: (value) => {
        if (value) {
          const retries = typeof value === 'number' ? value : Number(value);
          if (retries < 0) {
            return 'Max retries must be non-negative';
          }
        }
        return null;
      }
    },
    {
      label: 'Retry Strategy',
      field: 'retryStrategy',
      type: 'select',
      options: [
        { value: 'default', label: 'Default (exponential backoff)' },
        { value: 'fixed', label: 'Fixed Delay' },
        { value: 'linear', label: 'Linear Backoff' },
        { value: 'none', label: 'No Retry' }
      ],
      defaultValue: 'default',
      required: false
    }
  ],
  examples: [
    {
      name: 'Simple Get/Set',
      description: 'Basic key-value operations',
      config: {
        connectionMethod: 'standalone',
        host: 'localhost',
        port: 6379,
        operation: 'set',
        key: 'user:123:name',
        value: 'John Doe'
      }
    },
    {
      name: 'Set with Expiration',
      description: 'Set a key with TTL',
      config: {
        connectionMethod: 'standalone',
        host: 'localhost',
        port: 6379,
        operation: 'setex',
        key: 'session:abc123',
        value: '{"userId": "123", "role": "admin"}',
        ttl: 3600
      }
    },
    {
      name: 'Hash Operations',
      description: 'Store user data in hash',
      config: {
        connectionMethod: 'standalone',
        host: 'localhost',
        port: 6379,
        password: 'mypassword',
        operation: 'hmset',
        key: 'user:123',
        keyValuePairs: '{"name": "John Doe", "email": "john@example.com", "age": "30"}'
      }
    },
    {
      name: 'List as Queue',
      description: 'Use list as a job queue',
      config: {
        connectionMethod: 'standalone',
        host: 'localhost',
        port: 6379,
        operation: 'lpush',
        key: 'job:queue',
        listValues: '["job1", "job2", "job3"]'
      }
    },
    {
      name: 'Pub/Sub Messaging',
      description: 'Publish message to channel',
      config: {
        connectionMethod: 'standalone',
        host: 'localhost',
        port: 6379,
        operation: 'publish',
        channel: 'notifications',
        message: '{"type": "alert", "level": "info", "message": "System update completed"}'
      }
    },
    {
      name: 'Sorted Set Leaderboard',
      description: 'Maintain a game leaderboard',
      config: {
        connectionMethod: 'url',
        url: 'redis://default:password@redis.example.com:6379/0',
        operation: 'zadd',
        key: 'game:leaderboard',
        scoreMemberPairs: '{"player1": 1500, "player2": 1200, "player3": 1800}'
      }
    }
  ]
};