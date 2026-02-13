/**
 * Crypto Node Configuration
 * Hash, encrypt, decrypt, sign, verify data
 */

import React from 'react';

interface CryptoConfigProps {
  config: {
    operation?: 'hash' | 'hmac' | 'encrypt' | 'decrypt' | 'sign' | 'verify' | 'generateKey' | 'uuid';
    inputField?: string;
    // Hash options
    hashAlgorithm?: 'md5' | 'sha1' | 'sha256' | 'sha384' | 'sha512' | 'sha3-256' | 'sha3-512';
    encoding?: 'hex' | 'base64' | 'binary';
    // HMAC options
    hmacSecret?: string;
    // Encryption options
    encryptAlgorithm?: 'aes-128-cbc' | 'aes-192-cbc' | 'aes-256-cbc' | 'aes-128-gcm' | 'aes-256-gcm';
    encryptionKey?: string;
    iv?: string;
    // Sign options
    signAlgorithm?: 'rsa-sha256' | 'rsa-sha512' | 'ecdsa-sha256';
    privateKey?: string;
    publicKey?: string;
  };
  onChange: (config: CryptoConfigProps['config']) => void;
}

export const CryptoConfig: React.FC<CryptoConfigProps> = ({
  config,
  onChange,
}) => {
  const updateConfig = (updates: Partial<CryptoConfigProps['config']>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={config.operation || 'hash'}
          onChange={(e) => updateConfig({ operation: e.target.value as CryptoConfigProps['config']['operation'] })}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="hash">Hash</option>
          <option value="hmac">HMAC</option>
          <option value="encrypt">Encrypt</option>
          <option value="decrypt">Decrypt</option>
          <option value="sign">Sign</option>
          <option value="verify">Verify Signature</option>
          <option value="generateKey">Generate Key</option>
          <option value="uuid">Generate UUID</option>
        </select>
      </div>

      {config.operation !== 'uuid' && config.operation !== 'generateKey' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Input Field
          </label>
          <input
            type="text"
            value={config.inputField || ''}
            onChange={(e) => updateConfig({ inputField: e.target.value })}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="{{ $json.dataToHash }}"
          />
        </div>
      )}

      {(config.operation === 'hash' || config.operation === 'hmac') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Algorithm
            </label>
            <select
              value={config.hashAlgorithm || 'sha256'}
              onChange={(e) => updateConfig({ hashAlgorithm: e.target.value as CryptoConfigProps['config']['hashAlgorithm'] })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="md5">MD5 (not secure)</option>
              <option value="sha1">SHA-1 (not secure)</option>
              <option value="sha256">SHA-256</option>
              <option value="sha384">SHA-384</option>
              <option value="sha512">SHA-512</option>
              <option value="sha3-256">SHA3-256</option>
              <option value="sha3-512">SHA3-512</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Output Encoding
            </label>
            <select
              value={config.encoding || 'hex'}
              onChange={(e) => updateConfig({ encoding: e.target.value as 'hex' | 'base64' | 'binary' })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="hex">Hexadecimal</option>
              <option value="base64">Base64</option>
              <option value="binary">Binary</option>
            </select>
          </div>
        </>
      )}

      {config.operation === 'hmac' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            HMAC Secret
          </label>
          <input
            type="password"
            value={config.hmacSecret || ''}
            onChange={(e) => updateConfig({ hmacSecret: e.target.value })}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            placeholder="Your secret key"
          />
        </div>
      )}

      {(config.operation === 'encrypt' || config.operation === 'decrypt') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Algorithm
            </label>
            <select
              value={config.encryptAlgorithm || 'aes-256-cbc'}
              onChange={(e) => updateConfig({ encryptAlgorithm: e.target.value as CryptoConfigProps['config']['encryptAlgorithm'] })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="aes-128-cbc">AES-128-CBC</option>
              <option value="aes-192-cbc">AES-192-CBC</option>
              <option value="aes-256-cbc">AES-256-CBC</option>
              <option value="aes-128-gcm">AES-128-GCM (authenticated)</option>
              <option value="aes-256-gcm">AES-256-GCM (authenticated)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Encryption Key
            </label>
            <input
              type="password"
              value={config.encryptionKey || ''}
              onChange={(e) => updateConfig({ encryptionKey: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="32-byte key for AES-256"
            />
            <p className="mt-1 text-xs text-gray-500">
              Key must match algorithm (16/24/32 bytes for AES-128/192/256)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initialization Vector (optional)
            </label>
            <input
              type="text"
              value={config.iv || ''}
              onChange={(e) => updateConfig({ iv: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="16-byte IV (auto-generated if empty)"
            />
          </div>
        </>
      )}

      {(config.operation === 'sign' || config.operation === 'verify') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Algorithm
            </label>
            <select
              value={config.signAlgorithm || 'rsa-sha256'}
              onChange={(e) => updateConfig({ signAlgorithm: e.target.value as CryptoConfigProps['config']['signAlgorithm'] })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="rsa-sha256">RSA-SHA256</option>
              <option value="rsa-sha512">RSA-SHA512</option>
              <option value="ecdsa-sha256">ECDSA-SHA256</option>
            </select>
          </div>
          {config.operation === 'sign' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Private Key (PEM)
              </label>
              <textarea
                value={config.privateKey || ''}
                onChange={(e) => updateConfig({ privateKey: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                rows={4}
                placeholder="-----BEGIN PRIVATE KEY-----..."
              />
            </div>
          )}
          {config.operation === 'verify' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Public Key (PEM)
              </label>
              <textarea
                value={config.publicKey || ''}
                onChange={(e) => updateConfig({ publicKey: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                rows={4}
                placeholder="-----BEGIN PUBLIC KEY-----..."
              />
            </div>
          )}
        </>
      )}

      {config.operation === 'generateKey' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Key Type
          </label>
          <select
            value={config.encryptAlgorithm || 'aes-256-cbc'}
            onChange={(e) => updateConfig({ encryptAlgorithm: e.target.value as CryptoConfigProps['config']['encryptAlgorithm'] })}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="aes-128-cbc">128-bit (16 bytes)</option>
            <option value="aes-192-cbc">192-bit (24 bytes)</option>
            <option value="aes-256-cbc">256-bit (32 bytes)</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default CryptoConfig;
