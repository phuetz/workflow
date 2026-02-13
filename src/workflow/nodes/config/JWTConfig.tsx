import React from 'react';
import { WorkflowNode } from '../../../types/workflow';

interface JWTConfigProps {
  node: WorkflowNode;
  onChange: (updates: Partial<WorkflowNode>) => void;
}

export const JWTConfig: React.FC<JWTConfigProps> = ({ node, onChange }) => {
  const config = (node.data?.config || {}) as Record<string, string | number | boolean>;

  const updateConfig = (key: string, value: string | number | boolean) => {
    onChange({
      data: {
        ...node.data,
        config: { ...config, [key]: value }
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Operation
        </label>
        <select
          value={String(config.operation || 'sign')}
          onChange={(e) => updateConfig('operation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="sign">Sign (Create Token)</option>
          <option value="verify">Verify Token</option>
          <option value="decode">Decode (without verification)</option>
        </select>
      </div>

      {config.operation === 'sign' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payload (JSON)
            </label>
            <textarea
              value={String(config.payload || '{}')}
              onChange={(e) => updateConfig('payload', e.target.value)}
              placeholder='{"userId": "{{ $json.id }}", "role": "user"}'
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Algorithm
            </label>
            <select
              value={String(config.algorithm || 'HS256')}
              onChange={(e) => updateConfig('algorithm', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="HS256">HS256 (HMAC + SHA-256)</option>
              <option value="HS384">HS384 (HMAC + SHA-384)</option>
              <option value="HS512">HS512 (HMAC + SHA-512)</option>
              <option value="RS256">RS256 (RSA + SHA-256)</option>
              <option value="RS384">RS384 (RSA + SHA-384)</option>
              <option value="RS512">RS512 (RSA + SHA-512)</option>
              <option value="ES256">ES256 (ECDSA + SHA-256)</option>
              <option value="ES384">ES384 (ECDSA + SHA-384)</option>
              <option value="ES512">ES512 (ECDSA + SHA-512)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Secret / Private Key
            </label>
            <textarea
              value={String(config.secret || '')}
              onChange={(e) => updateConfig('secret', e.target.value)}
              placeholder="your-secret-key or -----BEGIN PRIVATE KEY-----"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Use credentials for production secrets</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Expires In
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={Number(config.expiresInValue) || 1}
                onChange={(e) => updateConfig('expiresInValue', parseInt(e.target.value))}
                min={1}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <select
                value={String(config.expiresInUnit || 'hours')}
                onChange={(e) => updateConfig('expiresInUnit', e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Issuer (Optional)
            </label>
            <input
              type="text"
              value={String(config.issuer || '')}
              onChange={(e) => updateConfig('issuer', e.target.value)}
              placeholder="https://your-app.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Audience (Optional)
            </label>
            <input
              type="text"
              value={String(config.audience || '')}
              onChange={(e) => updateConfig('audience', e.target.value)}
              placeholder="your-api-client"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </>
      )}

      {(config.operation === 'verify' || config.operation === 'decode') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Token
          </label>
          <input
            type="text"
            value={String(config.token || '')}
            onChange={(e) => updateConfig('token', e.target.value)}
            placeholder="{{ $json.token }}"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      )}

      {config.operation === 'verify' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Secret / Public Key
            </label>
            <textarea
              value={String(config.secret || '')}
              onChange={(e) => updateConfig('secret', e.target.value)}
              placeholder="your-secret-key or -----BEGIN PUBLIC KEY-----"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="ignoreExpiration"
              checked={Boolean(config.ignoreExpiration)}
              onChange={(e) => updateConfig('ignoreExpiration', e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="ignoreExpiration" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Ignore token expiration
            </label>
          </div>
        </>
      )}
    </div>
  );
};

export default JWTConfig;
