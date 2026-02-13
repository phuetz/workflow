import React from 'react';
import { Edit, Play } from 'lucide-react';
import { TestCardProps } from './types';
import { StatusIcon } from './StatusIcon';

export function TestCard({
  test,
  darkMode,
  isSelected,
  isRunningTest,
  onSelect,
  onRunTest,
  onEditTest
}: TestCardProps) {
  return (
    <div
      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
        darkMode
          ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
          : 'bg-white border-gray-200 hover:bg-gray-50'
      } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      onClick={() => onSelect(test)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <StatusIcon className="text-green-500" size={16} />
            <h3 className="font-medium">{test.name}</h3>
            <span
              className={`px-2 py-1 rounded text-xs ${
                test.type === 'unit'
                  ? 'bg-blue-100 text-blue-800'
                  : test.type === 'integration'
                  ? 'bg-green-100 text-green-800'
                  : test.type === 'e2e'
                  ? 'bg-purple-100 text-purple-800'
                  : test.type === 'performance'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {test.type}
            </span>
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                test.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {test.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-2">{test.description}</p>
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>{test.steps.length} steps</span>
            <span>{test.assertions.length} assertions</span>
            <span>{test.timeout / 1000}s timeout</span>
            {test.tags.length > 0 && <span>{test.tags.join(', ')}</span>}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRunTest(test.id);
            }}
            disabled={isRunningTest || !test.enabled}
            className="p-2 text-green-500 hover:bg-green-50 rounded disabled:opacity-50"
          >
            {isRunningTest ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
            ) : (
              <Play size={16} />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditTest(test);
            }}
            className="p-2 text-gray-500 hover:bg-gray-50 rounded"
          >
            <Edit size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
