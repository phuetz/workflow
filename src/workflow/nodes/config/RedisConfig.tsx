/**
 * Redis Node Configuration
 * In-memory data structure store
 */

import React, { useState } from 'react';

interface RedisConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const RedisConfig: React.FC<RedisConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<string>((config.operation as string) || 'get');
  const [key, setKey] = useState<string>((config.key as string) || '');
  const [value, setValue] = useState<string>((config.value as string) || '');
  const [expire, setExpire] = useState<number>((config.expire as number) || 0);
  const [field, setField] = useState<string>((config.field as string) || '');

  const handleChange = (updates: Record<string, unknown>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => {
            setOperation(e.target.value);
            handleChange({ operation: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
        >
          <optgroup label="String Operations">
            <option value="get">Get</option>
            <option value="set">Set</option>
            <option value="del">Delete</option>
            <option value="incr">Increment</option>
            <option value="decr">Decrement</option>
          </optgroup>
          <optgroup label="Hash Operations">
            <option value="hget">Hash Get</option>
            <option value="hset">Hash Set</option>
            <option value="hgetall">Hash Get All</option>
            <option value="hdel">Hash Delete</option>
          </optgroup>
          <optgroup label="List Operations">
            <option value="lpush">List Push Left</option>
            <option value="rpush">List Push Right</option>
            <option value="lpop">List Pop Left</option>
            <option value="rpop">List Pop Right</option>
            <option value="lrange">List Range</option>
          </optgroup>
          <optgroup label="Set Operations">
            <option value="sadd">Set Add</option>
            <option value="smembers">Set Members</option>
            <option value="sismember">Set Is Member</option>
          </optgroup>
          <optgroup label="Advanced">
            <option value="keys">Keys Pattern</option>
            <option value="exists">Exists</option>
            <option value="ttl">Time To Live</option>
            <option value="expire">Set Expire</option>
          </optgroup>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Key <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            handleChange({ key: e.target.value });
          }}
          placeholder="user:123 or session:abc"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Redis key. Can use expression: {`{{ $json.key }}`}
        </p>
      </div>

      {(operation === 'set' || operation === 'lpush' || operation === 'rpush' || operation === 'sadd') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Value <span className="text-red-500">*</span>
          </label>
          <textarea
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              handleChange({ value: e.target.value });
            }}
            placeholder='String, number, or JSON: {"user": "data"}'
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Value to store. Objects will be JSON-stringified.
          </p>
        </div>
      )}

      {(operation === 'hget' || operation === 'hset' || operation === 'hdel') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Field <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={field}
            onChange={(e) => {
              setField(e.target.value);
              handleChange({ field: e.target.value });
            }}
            placeholder="name or email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Hash field name
          </p>
        </div>
      )}

      {operation === 'hset' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Value <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              handleChange({ value: e.target.value });
            }}
            placeholder="field value"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
          />
        </div>
      )}

      {(operation === 'set' || operation === 'hset') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expire (seconds)
          </label>
          <input
            type="number"
            value={expire}
            onChange={(e) => {
              setExpire(parseInt(e.target.value) || 0);
              handleChange({ expire: parseInt(e.target.value) || 0 });
            }}
            min="0"
            placeholder="0 = no expiration"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Auto-delete after N seconds (0 = never expire)
          </p>
        </div>
      )}

      <div className="bg-red-50 border border-red-200 rounded-md p-3">
        <p className="text-sm text-red-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-red-700">
          Requires Redis connection: host, port, password (optional), database. Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm text-orange-900 font-medium mb-1">Features</p>
        <ul className="text-xs text-orange-700 space-y-1">
          <li>• In-memory data structure store</li>
          <li>• Strings, Lists, Sets, Hashes, Sorted Sets</li>
          <li>• Pub/Sub messaging</li>
          <li>• Automatic expiration (TTL)</li>
          <li>• Persistence options (RDB, AOF)</li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Database:</strong> Redis</div>
          <div><strong>Default Port:</strong> 6379</div>
          <div><strong>Documentation:</strong> redis.io/documentation</div>
        </p>
      </div>
    </div>
  );
};
