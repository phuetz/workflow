import React from 'react';
import { TemplateCategory } from './types';

interface TemplateCategoriesProps {
  categories: TemplateCategory[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export default function TemplateCategories({
  categories,
  selectedCategory,
  onCategoryChange
}: TemplateCategoriesProps) {
  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-3">Categories</h3>
      <div className="space-y-2">
        <button
          onClick={() => onCategoryChange('all')}
          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
            selectedCategory === 'all' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
          }`}
        >
          Tous les templates
        </button>
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              selectedCategory === category.id ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
            }`}
          >
            <category.icon size={16} color={category.color} />
            <span>{category.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
