import React from 'react';
import { Zap, Star } from 'lucide-react';
import { IntelligentTemplate } from './types';

interface TemplateSuggestionsProps {
  suggestions: IntelligentTemplate[];
  isGenerating: boolean;
  onSelectTemplate: (template: IntelligentTemplate) => void;
}

export default function TemplateSuggestions({
  suggestions,
  isGenerating,
  onSelectTemplate
}: TemplateSuggestionsProps) {
  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-3 flex items-center space-x-2">
        <Zap size={16} className="text-yellow-500" />
        <span>Suggestions IA</span>
      </h3>
      {isGenerating ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-2">Generation...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {suggestions.map(template => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              className="w-full text-left p-2 rounded-lg hover:bg-gray-100 border border-yellow-200"
            >
              <div className="flex items-center space-x-2">
                <Star size={14} className="text-yellow-500" />
                <span className="text-sm font-medium">{template.name}</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">Score: {template.optimizationScore}%</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
