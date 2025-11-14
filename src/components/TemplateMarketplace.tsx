import React, { useState, useEffect } from 'react';
import {
  Search,
  Download,
  Star,
  Eye,
  TrendingUp,
  Filter,
  X,
  Check,
  ExternalLink,
  Copy,
  Heart,
  Share2
} from 'lucide-react';
import { useWorkflowStore } from '../store/workflowStore';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: {
    name: string;
    avatar?: string;
    verified?: boolean;
  };
  stats: {
    downloads: number;
    rating: number;
    reviews: number;
    views: number;
  };
  preview?: {
    thumbnail?: string;
    screenshots?: string[];
  };
  workflow: any; // Actual workflow data
  createdAt: string;
  updatedAt: string;
  version: string;
  featured?: boolean;
  premium?: boolean;
}

const CATEGORIES = [
  'All',
  'E-commerce',
  'Marketing',
  'Data Processing',
  'API Integration',
  'Social Media',
  'Analytics',
  'Automation',
  'Customer Support',
  'Finance',
  'HR & Recruiting',
  'Sales',
  'DevOps',
  'Content Creation'
];

const MOCK_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'template-1',
    name: 'E-commerce Order Processing',
    description: 'Automated workflow for processing e-commerce orders, sending confirmations, updating inventory, and notifying shipping',
    category: 'E-commerce',
    tags: ['shopify', 'orders', 'automation', 'email'],
    author: {
      name: 'WorkflowPro Team',
      verified: true
    },
    stats: {
      downloads: 1250,
      rating: 4.8,
      reviews: 145,
      views: 3420
    },
    workflow: {},
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-02-20T00:00:00Z',
    version: '1.2.0',
    featured: true
  },
  {
    id: 'template-2',
    name: 'Social Media Content Publisher',
    description: 'Schedule and publish content across multiple social media platforms with automated image optimization',
    category: 'Social Media',
    tags: ['twitter', 'facebook', 'instagram', 'scheduling'],
    author: {
      name: 'Social Guru',
      verified: true
    },
    stats: {
      downloads: 890,
      rating: 4.6,
      reviews: 98,
      views: 2100
    },
    workflow: {},
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: '2024-02-15T00:00:00Z',
    version: '2.0.1',
    featured: true
  },
  {
    id: 'template-3',
    name: 'Customer Support Ticket Router',
    description: 'Automatically categorize, prioritize, and route support tickets to the right team members',
    category: 'Customer Support',
    tags: ['zendesk', 'support', 'routing', 'ai'],
    author: {
      name: 'SupportMaster',
      verified: false
    },
    stats: {
      downloads: 567,
      rating: 4.9,
      reviews: 67,
      views: 1890
    },
    workflow: {},
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-18T00:00:00Z',
    version: '1.0.3'
  },
  {
    id: 'template-4',
    name: 'Lead Scoring & Enrichment',
    description: 'Score leads from multiple sources, enrich with external data, and sync to CRM',
    category: 'Sales',
    tags: ['crm', 'leads', 'scoring', 'enrichment'],
    author: {
      name: 'Sales Automation Co',
      verified: true
    },
    stats: {
      downloads: 1100,
      rating: 4.7,
      reviews: 123,
      views: 2890
    },
    workflow: {},
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-02-22T00:00:00Z',
    version: '1.5.0',
    featured: true
  },
  {
    id: 'template-5',
    name: 'Data Pipeline ETL',
    description: 'Extract data from multiple sources, transform with custom logic, and load into data warehouse',
    category: 'Data Processing',
    tags: ['etl', 'data', 'pipeline', 'warehouse'],
    author: {
      name: 'DataFlow Inc',
      verified: true
    },
    stats: {
      downloads: 2340,
      rating: 4.9,
      reviews: 234,
      views: 5670
    },
    workflow: {},
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-02-25T00:00:00Z',
    version: '3.1.0',
    featured: true,
    premium: true
  }
];

export default function TemplateMarketplace() {
  const { darkMode, createWorkflow } = useWorkflowStore();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>(MOCK_TEMPLATES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating'>('popular');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);

  // Filter and sort templates
  const filteredTemplates = templates
    .filter(template => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'All' || template.category === selectedCategory;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.stats.downloads - a.stats.downloads;
        case 'recent':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'rating':
          return b.stats.rating - a.stats.rating;
        default:
          return 0;
      }
    });

  const handleImportTemplate = (template: WorkflowTemplate) => {
    // Create new workflow from template
    const newWorkflow = {
      ...template.workflow,
      name: `${template.name} (Copy)`,
      isTemplate: false
    };

    createWorkflow(newWorkflow);
    alert(`Template "${template.name}" imported successfully!`);
    setSelectedTemplate(null);
  };

  const handleShareTemplate = (template: WorkflowTemplate) => {
    const url = `${window.location.origin}/templates/${template.id}`;
    navigator.clipboard.writeText(url);
    alert('Template link copied to clipboard!');
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Workflow Templates</h1>
              <p className="opacity-75">
                Browse and import pre-built workflows to get started quickly
              </p>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Filter size={18} />
              <span>Filters</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 opacity-50" size={20} />
            <input
              type="text"
              placeholder="Search templates by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-12 pr-4 py-3 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 focus:border-blue-500'
                  : 'bg-white border-gray-300 focus:border-blue-500'
              } outline-none transition-colors`}
            />
          </div>

          {/* Categories */}
          <div className="mt-4 flex items-center space-x-2 overflow-x-auto pb-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-500 text-white'
                    : darkMode
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Sort By</h3>
              <button onClick={() => setShowFilters(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center space-x-4">
              {[
                { value: 'popular', label: 'Most Popular' },
                { value: 'recent', label: 'Recently Updated' },
                { value: 'rating', label: 'Highest Rated' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value as any)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    sortBy === option.value
                      ? 'bg-blue-500 text-white'
                      : darkMode
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-4 flex items-center justify-between">
          <p className="opacity-75">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } border rounded-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer ${
                template.featured ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedTemplate(template)}
            >
              {/* Thumbnail */}
              <div className={`h-40 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center relative`}>
                <div className="text-6xl opacity-20">🔧</div>
                {template.featured && (
                  <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                    Featured
                  </div>
                )}
                {template.premium && (
                  <div className="absolute top-2 right-2 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-medium">
                    Premium
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{template.name}</h3>
                </div>

                <p className="text-sm opacity-75 mb-3 line-clamp-2">{template.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className={`px-2 py-1 rounded text-xs ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Author */}
                <div className="flex items-center space-x-2 mb-3 pb-3 border-b">
                  <div className={`w-6 h-6 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center text-xs`}>
                    {template.author.name[0]}
                  </div>
                  <span className="text-sm">{template.author.name}</span>
                  {template.author.verified && (
                    <Check size={14} className="text-blue-500" />
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-xs opacity-75">
                  <div className="flex items-center space-x-1">
                    <Download size={12} />
                    <span>{template.stats.downloads}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star size={12} className="text-yellow-500" />
                    <span>{template.stats.rating}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye size={12} />
                    <span>{template.stats.views}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto`}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-inherit border-b p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">{selectedTemplate.name}</h2>
                <p className="text-sm opacity-75">v{selectedTemplate.version}</p>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <p className="text-lg mb-6">{selectedTemplate.description}</p>

              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} p-4 rounded-lg text-center`}>
                  <Download size={24} className="mx-auto mb-2 opacity-50" />
                  <div className="text-2xl font-bold">{selectedTemplate.stats.downloads}</div>
                  <div className="text-xs opacity-75">Downloads</div>
                </div>
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} p-4 rounded-lg text-center`}>
                  <Star size={24} className="mx-auto mb-2 text-yellow-500" />
                  <div className="text-2xl font-bold">{selectedTemplate.stats.rating}</div>
                  <div className="text-xs opacity-75">Rating</div>
                </div>
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} p-4 rounded-lg text-center`}>
                  <Eye size={24} className="mx-auto mb-2 opacity-50" />
                  <div className="text-2xl font-bold">{selectedTemplate.stats.views}</div>
                  <div className="text-xs opacity-75">Views</div>
                </div>
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} p-4 rounded-lg text-center`}>
                  <TrendingUp size={24} className="mx-auto mb-2 opacity-50" />
                  <div className="text-2xl font-bold">{selectedTemplate.stats.reviews}</div>
                  <div className="text-xs opacity-75">Reviews</div>
                </div>
              </div>

              {/* Tags */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`px-3 py-1 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Author Info */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Author</h3>
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center`}>
                    {selectedTemplate.author.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{selectedTemplate.author.name}</span>
                      {selectedTemplate.author.verified && (
                        <Check size={16} className="text-blue-500" />
                      )}
                    </div>
                    <p className="text-sm opacity-75">Template Creator</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleImportTemplate(selectedTemplate)}
                  className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  <Download size={18} />
                  <span>Import Template</span>
                </button>

                <button
                  onClick={() => handleShareTemplate(selectedTemplate)}
                  className={`px-4 py-3 rounded-lg transition-colors ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                  title="Share"
                >
                  <Share2 size={18} />
                </button>

                <button
                  className={`px-4 py-3 rounded-lg transition-colors ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                  title="Favorite"
                >
                  <Heart size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
