import React from 'react';
import { IntelligentTemplate, Difficulty } from './types';

interface TemplateCardProps {
  template: IntelligentTemplate;
  onClick: (template: IntelligentTemplate) => void;
}

export function getDifficultyColor(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'beginner': return 'text-green-600 bg-green-100';
    case 'intermediate': return 'text-yellow-600 bg-yellow-100';
    case 'advanced': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}

export default function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <div
      className="bg-white border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onClick(template)}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(template.difficulty)}`}>
          {template.difficulty}
        </span>
        {template.aiGenerated && (
          <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-full text-xs">
            IA
          </span>
        )}
      </div>

      <h4 className="font-semibold mb-2">{template.name}</h4>
      <p className="text-sm text-gray-600 mb-3">{template.description}</p>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{template.estimatedTime}min</span>
        <span>{template.optimizationScore}%</span>
        <span>${template.estimatedCost}/mois</span>
      </div>

      <div className="flex flex-wrap gap-1 mt-3">
        {template.tags.slice(0, 3).map(tag => (
          <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
