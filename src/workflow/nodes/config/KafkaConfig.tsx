import React, { useState, useCallback } from 'react';
import { WorkflowNode } from '../../../types/workflow';

interface KafkaConfigProps {
  node: WorkflowNode;
  onChange: (config: Record<string, unknown>) => void;
}

interface KafkaConfig {
  mode: 'producer' | 'consumer';
  operation: string;

  // Connection
  brokers: string[];
  clientId?: string;
  ssl?: boolean;
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };

  // Producer fields
  topic?: string;
  partition?: number;
  key?: string;
  value?: string;
  headers?: Record<string, string>;
  acks?: -1 | 0 | 1; // -1 = all, 0 = none, 1 = leader
  compression?: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd';

  // Consumer fields
  groupId?: string;
  topics?: string[];
  fromBeginning?: boolean;
  autoCommit?: boolean;
  sessionTimeout?: number;
  heartbeatInterval?: number;

  // Message serialization
  serialization?: 'json' | 'string' | 'avro' | 'binary';
  avroSchema?: string;
}

export const KafkaConfig: React.FC<KafkaConfigProps> = ({ node, onChange }) => {
  const [config, setConfig] = useState<KafkaConfig>(
    (node.data.config as unknown as KafkaConfig) || {
      mode: 'producer',
      operation: 'send',
      brokers: ['localhost:9092'],
      clientId: 'workflow-client',
      ssl: false,
      acks: -1,
      compression: 'none',
      serialization: 'json',
      autoCommit: true,
      fromBeginning: false,
    }
  );

  const [newBroker, setNewBroker] = useState('');

  const handleChange = useCallback((updates: Partial<KafkaConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange(newConfig);
  }, [config, onChange]);

  const addBroker = useCallback(() => {
    if (newBroker.trim()) {
      const newBrokers = [...(config.brokers || []), newBroker.trim()];
      handleChange({ brokers: newBrokers });
      setNewBroker('');
    }
  }, [config.brokers, newBroker, handleChange]);

  const removeBroker = useCallback((index: number) => {
    const newBrokers = config.brokers?.filter((_, i) => i !== index) || [];
    handleChange({ brokers: newBrokers });
  }, [config.brokers, handleChange]);

  const getOperationsForMode = (mode: string) => {
    if (mode === 'producer') {
      return [
        { value: 'send', label: 'Send Message' },
        { value: 'sendBatch', label: 'Send Batch Messages' },
      ];
    } else {
      return [
        { value: 'consume', label: 'Consume Messages' },
        { value: 'consumeOne', label: 'Consume One Message' },
      ];
    }
  };

  const operations = getOperationsForMode(config.mode);

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto">
      <div>
        <h3 className="text-lg font-semibold mb-2">Apache Kafka Integration</h3>
        <p className="text-sm text-gray-600 mb-4">
          Connect to Kafka cluster for real-time data streaming (producer/consumer)
        </p>
      </div>

      {/* Mode Selection */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Mode</label>
          <select
            className="w-full p-2 border rounded"
            value={config.mode}
            onChange={(e) => {
              const newMode = e.target.value as 'producer' | 'consumer';
              const newOps = getOperationsForMode(newMode);
              handleChange({
                mode: newMode,
                operation: (newOps[0]?.value || '') as string
              });
            }}
          >
            <option value="producer">Producer (Send Messages)</option>
            <option value="consumer">Consumer (Receive Messages)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Operation</label>
          <select
            className="w-full p-2 border rounded"
            value={config.operation}
            onChange={(e) => handleChange({ operation: e.target.value })}
          >
            {operations.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Connection Settings */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-2">Connection Settings</h4>

        {/* Brokers */}
        <div className="mb-3">
          <label className="block text-xs mb-1">Kafka Brokers *</label>
          <div className="space-y-1">
            {config.brokers && config.brokers.length > 0 ? (
              config.brokers.map((broker, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 p-2 border rounded text-sm bg-gray-50"
                    value={broker}
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => removeBroker(index)}
                    className="px-3 py-2 text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic">No brokers configured</p>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 p-2 border rounded text-sm"
                value={newBroker}
                onChange={(e) => setNewBroker(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addBroker()}
                placeholder="localhost:9092"
              />
              <button
                type="button"
                onClick={addBroker}
                className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                + Add
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enter broker addresses (host:port). Example: kafka-broker-1.example.com:9092
          </p>
        </div>

        <div>
          <label className="block text-xs mb-1">Client ID</label>
          <input
            type="text"
            className="w-full p-2 border rounded text-sm"
            value={config.clientId || ''}
            onChange={(e) => handleChange({ clientId: e.target.value })}
            placeholder="workflow-client"
          />
          <p className="text-xs text-gray-500 mt-1">Identifier for this client connection</p>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            id="kafka-ssl"
            checked={config.ssl || false}
            onChange={(e) => handleChange({ ssl: e.target.checked })}
          />
          <label htmlFor="kafka-ssl" className="text-sm">Enable SSL/TLS</label>
        </div>
      </div>

      {/* SASL Authentication */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">SASL Authentication</h4>
          <button
            type="button"
            onClick={() => handleChange({
              sasl: config.sasl ? undefined : {
                mechanism: 'plain',
                username: '',
                password: ''
              }
            })}
            className="text-xs px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            {config.sasl ? 'Disable SASL' : 'Enable SASL'}
          </button>
        </div>

        {config.sasl && (
          <div className="space-y-2">
            <div>
              <label className="block text-xs mb-1">Mechanism</label>
              <select
                className="w-full p-2 border rounded text-sm"
                value={config.sasl.mechanism}
                onChange={(e) => handleChange({
                  sasl: { ...config.sasl!, mechanism: e.target.value as 'plain' | 'scram-sha-256' | 'scram-sha-512' }
                })}
              >
                <option value="plain">PLAIN</option>
                <option value="scram-sha-256">SCRAM-SHA-256</option>
                <option value="scram-sha-512">SCRAM-SHA-512</option>
              </select>
            </div>

            <div>
              <label className="block text-xs mb-1">Username</label>
              <input
                type="text"
                className="w-full p-2 border rounded text-sm"
                value={config.sasl.username}
                onChange={(e) => handleChange({
                  sasl: { ...config.sasl!, username: e.target.value }
                })}
                placeholder="kafka-user"
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Password</label>
              <input
                type="password"
                className="w-full p-2 border rounded text-sm"
                value={config.sasl.password}
                onChange={(e) => handleChange({
                  sasl: { ...config.sasl!, password: e.target.value }
                })}
                placeholder="••••••••"
              />
            </div>
          </div>
        )}
      </div>

      {/* Producer Configuration */}
      {config.mode === 'producer' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium">Producer Configuration</h4>

          <div>
            <label className="block text-xs mb-1">Topic *</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.topic || ''}
              onChange={(e) => handleChange({ topic: e.target.value })}
              placeholder="my-topic"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Partition (Optional)</label>
            <input
              type="number"
              min="0"
              className="w-full p-2 border rounded text-sm"
              value={config.partition ?? ''}
              onChange={(e) => handleChange({ partition: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="Auto-assign"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty for automatic partition assignment</p>
          </div>

          <div>
            <label className="block text-xs mb-1">Message Key (Optional)</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.key || ''}
              onChange={(e) => handleChange({ key: e.target.value })}
              placeholder="message-key"
            />
            <p className="text-xs text-gray-500 mt-1">Used for partitioning and message ordering</p>
          </div>

          <div>
            <label className="block text-xs mb-1">Message Value *</label>
            <textarea
              className="w-full p-2 border rounded text-sm font-mono"
              rows={6}
              value={config.value || ''}
              onChange={(e) => handleChange({ value: e.target.value })}
              placeholder={'{\n  "event": "user.signup",\n  "userId": "12345",\n  "timestamp": "2025-10-05T12:00:00Z"\n}'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1">Acknowledgment</label>
              <select
                className="w-full p-2 border rounded text-sm"
                value={config.acks ?? -1}
                onChange={(e) => handleChange({ acks: parseInt(e.target.value) as KafkaConfig['acks'] })}
              >
                <option value={-1}>All replicas (-1) - Safest</option>
                <option value={1}>Leader only (1) - Balanced</option>
                <option value={0}>No ack (0) - Fastest</option>
              </select>
            </div>

            <div>
              <label className="block text-xs mb-1">Compression</label>
              <select
                className="w-full p-2 border rounded text-sm"
                value={config.compression || 'none'}
                onChange={(e) => handleChange({ compression: e.target.value as KafkaConfig['compression'] })}
              >
                <option value="none">None</option>
                <option value="gzip">GZIP</option>
                <option value="snappy">Snappy</option>
                <option value="lz4">LZ4</option>
                <option value="zstd">ZSTD</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Consumer Configuration */}
      {config.mode === 'consumer' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium">Consumer Configuration</h4>

          <div>
            <label className="block text-xs mb-1">Consumer Group ID *</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.groupId || ''}
              onChange={(e) => handleChange({ groupId: e.target.value })}
              placeholder="my-consumer-group"
            />
            <p className="text-xs text-gray-500 mt-1">Consumers in the same group share message load</p>
          </div>

          <div>
            <label className="block text-xs mb-1">Topics *</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={(config.topics || []).join(', ')}
              onChange={(e) => handleChange({
                topics: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
              })}
              placeholder="topic1, topic2, topic3"
            />
            <p className="text-xs text-gray-500 mt-1">Comma-separated list of topics to subscribe to</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="from-beginning"
                checked={config.fromBeginning || false}
                onChange={(e) => handleChange({ fromBeginning: e.target.checked })}
              />
              <label htmlFor="from-beginning" className="text-sm">Read from beginning</label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="auto-commit"
                checked={config.autoCommit !== false}
                onChange={(e) => handleChange({ autoCommit: e.target.checked })}
              />
              <label htmlFor="auto-commit" className="text-sm">Auto-commit offsets</label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1">Session Timeout (ms)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                className="w-full p-2 border rounded text-sm"
                value={config.sessionTimeout || 30000}
                onChange={(e) => handleChange({ sessionTimeout: parseInt(e.target.value) || 30000 })}
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Heartbeat Interval (ms)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                className="w-full p-2 border rounded text-sm"
                value={config.heartbeatInterval || 3000}
                onChange={(e) => handleChange({ heartbeatInterval: parseInt(e.target.value) || 3000 })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Serialization */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-2">Message Serialization</h4>

        <div>
          <label className="block text-xs mb-1">Format</label>
          <select
            className="w-full p-2 border rounded text-sm"
            value={config.serialization || 'json'}
            onChange={(e) => handleChange({ serialization: e.target.value as KafkaConfig['serialization'] })}
          >
            <option value="json">JSON</option>
            <option value="string">String</option>
            <option value="avro">Avro</option>
            <option value="binary">Binary (Buffer)</option>
          </select>
        </div>

        {config.serialization === 'avro' && (
          <div className="mt-2">
            <label className="block text-xs mb-1">Avro Schema (JSON)</label>
            <textarea
              className="w-full p-2 border rounded text-sm font-mono"
              rows={8}
              value={config.avroSchema || ''}
              onChange={(e) => handleChange({ avroSchema: e.target.value })}
              placeholder={'{\n  "type": "record",\n  "name": "User",\n  "fields": [\n    {"name": "id", "type": "string"},\n    {"name": "email", "type": "string"}\n  ]\n}'}
            />
          </div>
        )}
      </div>

      {/* Documentation */}
      <div className="text-xs text-gray-500 mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
        <strong>📚 Kafka:</strong> This integration uses KafkaJS library.
        Producer sends messages to topics. Consumer reads messages from topics.
        {config.mode === 'consumer' && ' Consumer runs continuously and emits messages as they arrive.'}
      </div>
    </div>
  );
};
