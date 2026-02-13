import React from 'react';
import { Search } from 'lucide-react';

interface TemplateSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export default function TemplateSearch({ searchTerm, onSearchChange }: TemplateSearchProps) {
  return (
    <div className="mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Rechercher templates..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>
    </div>
  );
}
