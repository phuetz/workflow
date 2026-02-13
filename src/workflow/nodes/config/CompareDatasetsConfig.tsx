/**
 * CompareDatasets Node Configuration
 * Compare two data sets and find differences
 */

import React from 'react';

interface CompareDatasetsConfigProps {
  config: {
    mergeMode?: 'combineBySimilarity' | 'combineByPosition' | 'append';
    comparisonField1?: string;
    comparisonField2?: string;
    clashHandling?: 'preferInput1' | 'preferInput2' | 'addSuffix';
    includeUnpaired?: boolean;
    fuzzyCompare?: boolean;
    outputFormat?: 'combined' | 'separate';
  };
  onChange: (config: CompareDatasetsConfigProps['config']) => void;
}

export const CompareDatasetsConfig: React.FC<CompareDatasetsConfigProps> = ({
  config,
  onChange,
}) => {
  const updateConfig = (updates: Partial<CompareDatasetsConfigProps['config']>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
        This node has 2 inputs and 4 outputs:
        <ul className="mt-2 list-disc list-inside">
          <li>Output 1: Items only in Input 1</li>
          <li>Output 2: Items only in Input 2</li>
          <li>Output 3: Items in both (matched)</li>
          <li>Output 4: Items different between inputs</li>
        </ul>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Comparison Mode
        </label>
        <select
          value={config.mergeMode || 'combineBySimilarity'}
          onChange={(e) => updateConfig({ mergeMode: e.target.value as CompareDatasetsConfigProps['config']['mergeMode'] })}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="combineBySimilarity">Combine By Field Value</option>
          <option value="combineByPosition">Combine By Position</option>
          <option value="append">Append</option>
        </select>
      </div>

      {config.mergeMode === 'combineBySimilarity' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Input 1 - Compare Field
            </label>
            <input
              type="text"
              value={config.comparisonField1 || ''}
              onChange={(e) => updateConfig({ comparisonField1: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="id"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Input 2 - Compare Field
            </label>
            <input
              type="text"
              value={config.comparisonField2 || ''}
              onChange={(e) => updateConfig({ comparisonField2: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="id (leave empty to use same field)"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="fuzzyCompare"
              checked={config.fuzzyCompare ?? false}
              onChange={(e) => updateConfig({ fuzzyCompare: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="fuzzyCompare" className="ml-2 text-sm text-gray-700">
              Fuzzy comparison (case-insensitive, trim whitespace)
            </label>
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          When Fields Clash
        </label>
        <select
          value={config.clashHandling || 'preferInput1'}
          onChange={(e) => updateConfig({ clashHandling: e.target.value as CompareDatasetsConfigProps['config']['clashHandling'] })}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="preferInput1">Prefer Input 1 values</option>
          <option value="preferInput2">Prefer Input 2 values</option>
          <option value="addSuffix">Keep both (add _1 and _2 suffix)</option>
        </select>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="includeUnpaired"
          checked={config.includeUnpaired ?? true}
          onChange={(e) => updateConfig({ includeUnpaired: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="includeUnpaired" className="ml-2 text-sm text-gray-700">
          Include unpaired items in output
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Output Format
        </label>
        <select
          value={config.outputFormat || 'separate'}
          onChange={(e) => updateConfig({ outputFormat: e.target.value as 'combined' | 'separate' })}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="separate">Separate outputs (4 branches)</option>
          <option value="combined">Combined with comparison flag</option>
        </select>
      </div>
    </div>
  );
};

export default CompareDatasetsConfig;
