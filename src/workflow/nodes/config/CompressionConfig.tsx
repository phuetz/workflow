/**
 * Compression Node Configuration
 * Compress or decompress files (gzip, zip)
 */

import React from 'react';

interface CompressionConfigProps {
  config: {
    operation?: 'compress' | 'decompress';
    format?: 'gzip' | 'zip' | 'tar' | 'tar.gz' | 'brotli';
    sourceField?: string;
    sourceType?: 'binary' | 'base64' | 'text';
    outputField?: string;
    outputType?: 'binary' | 'base64';
    // Zip specific
    filename?: string;
    compressionLevel?: number;
    includeMetadata?: boolean;
    password?: string;
  };
  onChange: (config: CompressionConfigProps['config']) => void;
}

export const CompressionConfig: React.FC<CompressionConfigProps> = ({
  config,
  onChange,
}) => {
  const updateConfig = (updates: Partial<CompressionConfigProps['config']>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={config.operation || 'compress'}
          onChange={(e) => updateConfig({ operation: e.target.value as 'compress' | 'decompress' })}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="compress">Compress</option>
          <option value="decompress">Decompress</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Format
        </label>
        <select
          value={config.format || 'gzip'}
          onChange={(e) => updateConfig({ format: e.target.value as CompressionConfigProps['config']['format'] })}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="gzip">GZIP (.gz)</option>
          <option value="zip">ZIP (.zip)</option>
          <option value="tar">TAR (.tar)</option>
          <option value="tar.gz">TAR+GZIP (.tar.gz)</option>
          <option value="brotli">Brotli (.br)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Source Field
        </label>
        <input
          type="text"
          value={config.sourceField || ''}
          onChange={(e) => updateConfig({ sourceField: e.target.value })}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          placeholder="{{ $json.data }} or {{ $binary.file }}"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Source Data Type
        </label>
        <select
          value={config.sourceType || 'base64'}
          onChange={(e) => updateConfig({ sourceType: e.target.value as 'binary' | 'base64' | 'text' })}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="base64">Base64 encoded</option>
          <option value="binary">Binary data</option>
          <option value="text">Plain text</option>
        </select>
      </div>

      {config.operation === 'compress' && (
        <>
          {config.format === 'zip' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filename in Archive
              </label>
              <input
                type="text"
                value={config.filename || ''}
                onChange={(e) => updateConfig({ filename: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="file.txt"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compression Level (1-9)
            </label>
            <input
              type="range"
              min={1}
              max={9}
              value={config.compressionLevel || 6}
              onChange={(e) => updateConfig({ compressionLevel: parseInt(e.target.value, 10) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Faster (1)</span>
              <span>Current: {config.compressionLevel || 6}</span>
              <span>Smaller (9)</span>
            </div>
          </div>

          {config.format === 'zip' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password (optional)
              </label>
              <input
                type="password"
                value={config.password || ''}
                onChange={(e) => updateConfig({ password: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Leave empty for no encryption"
              />
            </div>
          )}
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Output Type
        </label>
        <select
          value={config.outputType || 'base64'}
          onChange={(e) => updateConfig({ outputType: e.target.value as 'binary' | 'base64' })}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="base64">Base64 encoded</option>
          <option value="binary">Binary data</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Output Field Name
        </label>
        <input
          type="text"
          value={config.outputField || ''}
          onChange={(e) => updateConfig({ outputField: e.target.value })}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          placeholder="compressed (default)"
        />
      </div>

      {config.operation === 'decompress' && (
        <div className="flex items-center">
          <input
            type="checkbox"
            id="includeMetadata"
            checked={config.includeMetadata ?? false}
            onChange={(e) => updateConfig({ includeMetadata: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="includeMetadata" className="ml-2 text-sm text-gray-700">
            Include file metadata (size, timestamps)
          </label>
        </div>
      )}
    </div>
  );
};

export default CompressionConfig;
