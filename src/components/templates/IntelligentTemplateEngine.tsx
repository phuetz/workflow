import React, { useState, useEffect } from 'react';
import { Lightbulb } from 'lucide-react';
import {
  TEMPLATE_CATEGORIES,
  TemplateSearch,
  TemplateCategories,
  TemplateSuggestions,
  TemplateDetail,
  TemplateGrid,
  useTemplates
} from './template-engine';

export default function IntelligentTemplateEngine() {
  const [isOpen, setIsOpen] = useState(false);

  const {
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
  } = useTemplates();

  // Generate AI suggestions when modal opens
  useEffect(() => {
    if (isOpen) {
      generateAISuggestions();
    }
  }, [isOpen, generateAISuggestions]);

  const handleApplyTemplate = (template: typeof selectedTemplate) => {
    if (template) {
      applyTemplate(template);
      setIsOpen(false);
    }
  };

  // Closed state - show floating button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-20 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 z-50"
        title="Ouvrir le moteur de templates intelligents"
      >
        <Lightbulb size={24} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Lightbulb size={32} />
              <div>
                <h2 className="text-2xl font-bold">Intelligent Template Engine</h2>
                <p className="text-purple-100">Templates optimises par IA pour surpasser n8n</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-300 text-2xl"
            >
              x
            </button>
          </div>
        </div>

        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-1/4 bg-gray-50 p-4 border-r overflow-y-auto">
            <TemplateSearch
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />

            <TemplateCategories
              categories={TEMPLATE_CATEGORIES}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />

            <TemplateSuggestions
              suggestions={aiSuggestions}
              isGenerating={isGenerating}
              onSelectTemplate={setSelectedTemplate}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            {selectedTemplate ? (
              <TemplateDetail
                template={selectedTemplate}
                onBack={() => setSelectedTemplate(null)}
                onApply={handleApplyTemplate}
              />
            ) : (
              <TemplateGrid
                templates={filteredTemplates}
                categories={TEMPLATE_CATEGORIES}
                selectedCategory={selectedCategory}
                onSelectTemplate={setSelectedTemplate}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
