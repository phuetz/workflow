import React from 'react';
import { IntelligentTemplate, TemplateCategory } from './types';
import TemplateCard from './TemplateCard';

interface TemplateGridProps {
  templates: IntelligentTemplate[];
  categories: TemplateCategory[];
  selectedCategory: string;
  onSelectTemplate: (template: IntelligentTemplate) => void;
}

export default function TemplateGrid({
  templates,
  categories,
  selectedCategory,
  onSelectTemplate
}: TemplateGridProps) {
  const categoryName = selectedCategory === 'all'
    ? 'Tous les templates'
    : categories.find(c => c.id === selectedCategory)?.name || 'Templates';

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">{categoryName}</h3>
        <p className="text-gray-600">
          {templates.length} templates disponibles
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            onClick={onSelectTemplate}
          />
        ))}
      </div>
    </div>
  );
}
