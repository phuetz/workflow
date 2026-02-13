import { useState, useEffect, useMemo, useCallback } from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';
import { IntelligentTemplate } from './types';
import { INTELLIGENT_TEMPLATES } from './templateData';

export interface UseTemplatesReturn {
  templates: IntelligentTemplate[];
  filteredTemplates: IntelligentTemplate[];
  aiSuggestions: IntelligentTemplate[];
  isGenerating: boolean;
  selectedCategory: string;
  searchTerm: string;
  selectedTemplate: IntelligentTemplate | null;
  setSelectedCategory: (category: string) => void;
  setSearchTerm: (term: string) => void;
  setSelectedTemplate: (template: IntelligentTemplate | null) => void;
  applyTemplate: (template: IntelligentTemplate) => void;
  generateAISuggestions: () => Promise<void>;
}

export function useTemplates(): UseTemplatesReturn {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<IntelligentTemplate | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<IntelligentTemplate[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const { setNodes, setEdges, addLog } = useWorkflowStore();

  const filteredTemplates = useMemo(() => {
    return INTELLIGENT_TEMPLATES.filter(template => {
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
      const matchesSearch = !searchTerm ||
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchTerm]);

  const generateAISuggestions = useCallback(async () => {
    setIsGenerating(true);
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 1500));

    const suggestions = INTELLIGENT_TEMPLATES
      .filter(t => t.aiGenerated)
      .sort((a, b) => b.optimizationScore - a.optimizationScore)
      .slice(0, 3);

    setAiSuggestions(suggestions);
    setIsGenerating(false);
  }, []);

  const applyTemplate = useCallback((template: IntelligentTemplate) => {
    setNodes(template.nodes);
    setEdges(template.edges);
    setSelectedTemplate(null);

    addLog({
      level: 'info',
      message: `Template "${template.name}" applique avec succes`,
      data: {
        templateId: template.id,
        nodes: template.nodes.length,
        edges: template.edges.length,
        optimizationScore: template.optimizationScore
      }
    });
  }, [setNodes, setEdges, addLog]);

  return {
    templates: INTELLIGENT_TEMPLATES,
    filteredTemplates,
    aiSuggestions,
    isGenerating,
    selectedCategory,
    searchTerm,
    selectedTemplate,
    setSelectedCategory,
    setSearchTerm,
    setSelectedTemplate,
    applyTemplate,
    generateAISuggestions
  };
}
