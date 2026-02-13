/**
 * HTML Node Configuration
 * Extract or convert HTML content
 */

import React from 'react';

interface HtmlConfigProps {
  config: {
    operation?: 'extractHtml' | 'convertToHtml' | 'extractText' | 'extractLinks' | 'extractImages' | 'extractMetadata';
    sourceField?: string;
    selector?: string;
    extractAttribute?: string;
    returnArray?: boolean;
    includeParent?: boolean;
    outputField?: string;
    // Convert options
    inputFormat?: 'markdown' | 'text' | 'json';
    wrapInHtml?: boolean;
    sanitize?: boolean;
  };
  onChange: (config: HtmlConfigProps['config']) => void;
}

export const HtmlConfig: React.FC<HtmlConfigProps> = ({
  config,
  onChange,
}) => {
  const updateConfig = (updates: Partial<HtmlConfigProps['config']>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={config.operation || 'extractHtml'}
          onChange={(e) => updateConfig({ operation: e.target.value as HtmlConfigProps['config']['operation'] })}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="extractHtml">Extract HTML Elements</option>
          <option value="extractText">Extract Text Content</option>
          <option value="extractLinks">Extract Links</option>
          <option value="extractImages">Extract Images</option>
          <option value="extractMetadata">Extract Metadata (title, meta tags)</option>
          <option value="convertToHtml">Convert to HTML</option>
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
          placeholder="{{ $json.html }}"
        />
      </div>

      {(config.operation === 'extractHtml' || config.operation === 'extractText') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CSS Selector
            </label>
            <input
              type="text"
              value={config.selector || ''}
              onChange={(e) => updateConfig({ selector: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="div.content > p, #main-title"
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave empty to process entire HTML
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Extract Attribute (optional)
            </label>
            <input
              type="text"
              value={config.extractAttribute || ''}
              onChange={(e) => updateConfig({ extractAttribute: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="href, src, data-id"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="returnArray"
              checked={config.returnArray ?? true}
              onChange={(e) => updateConfig({ returnArray: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="returnArray" className="ml-2 text-sm text-gray-700">
              Return all matches as array
            </label>
          </div>
        </>
      )}

      {config.operation === 'convertToHtml' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Input Format
            </label>
            <select
              value={config.inputFormat || 'markdown'}
              onChange={(e) => updateConfig({ inputFormat: e.target.value as 'markdown' | 'text' | 'json' })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="markdown">Markdown</option>
              <option value="text">Plain Text</option>
              <option value="json">JSON (table)</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="wrapInHtml"
              checked={config.wrapInHtml ?? false}
              onChange={(e) => updateConfig({ wrapInHtml: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="wrapInHtml" className="ml-2 text-sm text-gray-700">
              Wrap in full HTML document
            </label>
          </div>
        </>
      )}

      <div className="flex items-center">
        <input
          type="checkbox"
          id="sanitize"
          checked={config.sanitize ?? true}
          onChange={(e) => updateConfig({ sanitize: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="sanitize" className="ml-2 text-sm text-gray-700">
          Sanitize output (remove scripts, unsafe elements)
        </label>
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
          placeholder="extracted (default: depends on operation)"
        />
      </div>
    </div>
  );
};

export default HtmlConfig;
