import React from 'react';
import { Edit, Play } from 'lucide-react';
import { APIEndpoint } from './types';

interface EndpointCardProps {
  endpoint: APIEndpoint;
  darkMode: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onTest?: () => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-100 text-green-800',
  POST: 'bg-blue-100 text-blue-800',
  PUT: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-800',
  PATCH: 'bg-purple-100 text-purple-800'
};

export function EndpointCard({
  endpoint,
  darkMode,
  isSelected,
  onSelect,
  onEdit,
  onTest
}: EndpointCardProps) {
  const truncate = (str: string, maxLength: number) => {
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  };

  return (
    <div
      className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
        darkMode
          ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
          : 'bg-white border-gray-200 hover:bg-gray-50'
      } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              METHOD_COLORS[endpoint.method] || 'bg-gray-100 text-gray-800'
            }`}>
              {endpoint.method}
            </span>
            <h3 className="font-medium">{endpoint.name}</h3>
            <span className={`px-2 py-1 rounded-full text-xs ${
              endpoint.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {endpoint.enabled ? 'Active' : 'Disabled'}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-2">
            {endpoint.description ? truncate(endpoint.description, 100) : ''}
          </p>
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span className="font-mono">{truncate(endpoint.path, 50)}</span>
            <span>{endpoint.authentication.required ? 'Auth Required' : 'Public'}</span>
            {endpoint.rateLimit.enabled && (
              <span>{endpoint.rateLimit.requests}/min</span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {onTest && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTest();
              }}
              className="p-2 text-blue-500 hover:bg-blue-50 rounded"
              title="Test endpoint"
            >
              <Play size={16} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 text-gray-500 hover:bg-gray-50 rounded"
            title="Edit endpoint"
          >
            <Edit size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
