/**
 * Markdown Node Configuration
 * Convert to/from Markdown format
 */

import React from 'react';

interface MarkdownConfigProps {
  config: {
    operation?: 'toHtml' | 'toText' | 'fromHtml' | 'parse';
    sourceField?: string;
    outputField?: string;
    // toHtml options
    sanitize?: boolean;
    gfm?: boolean;
    breaks?: boolean;
    headerIds?: boolean;
    // fromHtml options
    headingStyle?: 'setext' | 'atx';
    bulletListMarker?: '-' | '*' | '+';
    codeBlockStyle?: 'fenced' | 'indented';
    emDelimiter?: '_' | '*';
    // parse options
    extractHeadings?: boolean;
    extractLinks?: boolean;
    extractCodeBlocks?: boolean;
  };
  onChange: (config: MarkdownConfigProps['config']) => void;
}

export const MarkdownConfig: React.FC<MarkdownConfigProps> = ({
  config,
  onChange,
}) => {
  const updateConfig = (updates: Partial<MarkdownConfigProps['config']>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={config.operation || 'toHtml'}
          onChange={(e) => updateConfig({ operation: e.target.value as MarkdownConfigProps['config']['operation'] })}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="toHtml">Markdown to HTML</option>
          <option value="toText">Markdown to Plain Text</option>
          <option value="fromHtml">HTML to Markdown</option>
          <option value="parse">Parse Markdown (extract structure)</option>
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
          placeholder="{{ $json.markdown }}"
        />
      </div>

      {config.operation === 'toHtml' && (
        <>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="gfm"
                checked={config.gfm ?? true}
                onChange={(e) => updateConfig({ gfm: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="gfm" className="ml-2 text-sm text-gray-700">
                GitHub Flavored Markdown (tables, strikethrough, etc.)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="breaks"
                checked={config.breaks ?? false}
                onChange={(e) => updateConfig({ breaks: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="breaks" className="ml-2 text-sm text-gray-700">
                Convert newlines to {'<br>'}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="headerIds"
                checked={config.headerIds ?? true}
                onChange={(e) => updateConfig({ headerIds: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="headerIds" className="ml-2 text-sm text-gray-700">
                Add IDs to headings
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="sanitize"
                checked={config.sanitize ?? true}
                onChange={(e) => updateConfig({ sanitize: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="sanitize" className="ml-2 text-sm text-gray-700">
                Sanitize HTML output (security)
              </label>
            </div>
          </div>
        </>
      )}

      {config.operation === 'fromHtml' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Heading Style
            </label>
            <select
              value={config.headingStyle || 'atx'}
              onChange={(e) => updateConfig({ headingStyle: e.target.value as 'setext' | 'atx' })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="atx"># ATX Style</option>
              <option value="setext">Setext Style (underline)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bullet List Marker
            </label>
            <select
              value={config.bulletListMarker || '-'}
              onChange={(e) => updateConfig({ bulletListMarker: e.target.value as '-' | '*' | '+' })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="-">- (dash)</option>
              <option value="*">* (asterisk)</option>
              <option value="+">+ (plus)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code Block Style
            </label>
            <select
              value={config.codeBlockStyle || 'fenced'}
              onChange={(e) => updateConfig({ codeBlockStyle: e.target.value as 'fenced' | 'indented' })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="fenced">``` Fenced</option>
              <option value="indented">    Indented</option>
            </select>
          </div>
        </>
      )}

      {config.operation === 'parse' && (
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="extractHeadings"
              checked={config.extractHeadings ?? true}
              onChange={(e) => updateConfig({ extractHeadings: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="extractHeadings" className="ml-2 text-sm text-gray-700">
              Extract headings
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="extractLinks"
              checked={config.extractLinks ?? true}
              onChange={(e) => updateConfig({ extractLinks: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="extractLinks" className="ml-2 text-sm text-gray-700">
              Extract links
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="extractCodeBlocks"
              checked={config.extractCodeBlocks ?? true}
              onChange={(e) => updateConfig({ extractCodeBlocks: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="extractCodeBlocks" className="ml-2 text-sm text-gray-700">
              Extract code blocks
            </label>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Output Field Name
        </label>
        <input
          type="text"
          value={config.outputField || ''}
          onChange={(e) => updateConfig({ outputField: e.target.value })}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          placeholder="result (default)"
        />
      </div>
    </div>
  );
};

export default MarkdownConfig;
