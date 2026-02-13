/**
 * Template Submission Component
 * Create and publish templates with analytics dashboard
 */

import React, { useState, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Video,
  Save,
  Send,
  Eye,
  BarChart3,
  Calendar,
  Globe,
  TrendingUp,
  Users,
  Download,
  Star,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import type { TemplateSubmission, TemplateAnalytics } from '../../types/marketplaceEnhanced';
import { TemplateCategory } from '../../types/templates';
import { logger } from '../../services/SimpleLogger';
import { useToast } from '../ui/Toast';

interface TemplateSubmissionProps {
  darkMode?: boolean;
  onSubmit?: (submission: TemplateSubmission) => void;
}

type TabType = 'editor' | 'analytics' | 'my-templates';

const CATEGORIES: Array<{ value: TemplateCategory; label: string }> = [
  { value: 'business_automation', label: 'Business Automation' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'customer_support', label: 'Customer Support' },
  { value: 'data_processing', label: 'Data Processing' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'finance', label: 'Finance' },
  { value: 'hr', label: 'HR' }
];

export function TemplateSubmission({ darkMode = false, onSubmit }: TemplateSubmissionProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('editor');
  const [submission, setSubmission] = useState<Partial<TemplateSubmission>>({
    name: '',
    description: '',
    category: 'business_automation',
    tags: [],
    difficulty: 'intermediate',
    pricing: 'free',
    overview: '',
    setupInstructions: '',
    usageGuide: '',
    screenshots: [],
    requiredIntegrations: [],
    requiredCredentials: [],
    estimatedSetupTime: 15,
    status: 'draft',
    workflow: { nodes: [], edges: [] },
    customizableFields: []
  });
  const [myTemplates, setMyTemplates] = useState<TemplateSubmission[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<TemplateAnalytics | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadMyTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      loadAnalytics(selectedTemplate);
    }
  }, [selectedTemplate]);

  const loadMyTemplates = async () => {
    try {
      const response = await fetch('/api/templates/my-templates');
      const data = await response.json();
      setMyTemplates(data.templates || generateMockMyTemplates());
    } catch (error) {
      logger.error('Failed to load templates:', error);
      setMyTemplates(generateMockMyTemplates());
    }
  };

  const loadAnalytics = async (templateId: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/analytics`);
      const data = await response.json();
      setAnalytics(data.analytics || generateMockAnalytics());
    } catch (error) {
      logger.error('Failed to load analytics:', error);
      setAnalytics(generateMockAnalytics());
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        // Simulate upload
        const url = URL.createObjectURL(file);
        urls.push(url);
      }
      setSubmission({
        ...submission,
        screenshots: [...(submission.screenshots || []), ...urls]
      });
    } catch (error) {
      logger.error('Failed to upload images:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !(submission.tags || []).includes(tagInput.trim())) {
      setSubmission({
        ...submission,
        tags: [...(submission.tags || []), tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setSubmission({
      ...submission,
      tags: (submission.tags || []).filter(t => t !== tag)
    });
  };

  const handleSaveDraft = async () => {
    try {
      await fetch('/api/templates/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...submission, status: 'draft' })
      });
      toast.success('Draft saved successfully');
      loadMyTemplates();
    } catch (error) {
      logger.error('Failed to save draft:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      await fetch('/api/templates/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...submission, status: 'submitted' })
      });
      onSubmit?.(submission as TemplateSubmission);
      toast.success('Template submitted for review');
      setSubmission({
        name: '',
        description: '',
        category: 'business_automation',
        tags: [],
        difficulty: 'intermediate',
        pricing: 'free',
        overview: '',
        setupInstructions: '',
        usageGuide: '',
        screenshots: [],
        requiredIntegrations: [],
        requiredCredentials: [],
        estimatedSetupTime: 15,
        status: 'draft',
        workflow: { nodes: [], edges: [] },
        customizableFields: []
      });
      loadMyTemplates();
    } catch (error) {
      logger.error('Failed to submit template:', error);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { color: 'bg-gray-500', icon: <Edit className="w-3 h-3" />, label: 'Draft' },
      submitted: { color: 'bg-blue-500', icon: <Send className="w-3 h-3" />, label: 'Under Review' },
      approved: { color: 'bg-green-500', icon: <CheckCircle className="w-3 h-3" />, label: 'Approved' },
      rejected: { color: 'bg-red-500', icon: <XCircle className="w-3 h-3" />, label: 'Rejected' },
      published: { color: 'bg-purple-500', icon: <Globe className="w-3 h-3" />, label: 'Published' }
    };
    const badge = badges[status as keyof typeof badges] || badges.draft;

    return (
      <span className={`${badge.color} text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} p-6`}>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Upload className="w-8 h-8 text-purple-500" />
          Template Management
        </h1>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          Create, publish, and manage your workflow templates
        </p>
      </div>

      {/* Tabs */}
      <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} px-6`}>
        <div className="flex gap-6">
          {[
            { id: 'editor', label: 'Create Template', icon: <Edit className="w-4 h-4" /> },
            { id: 'my-templates', label: 'My Templates', icon: <Globe className="w-4 h-4" /> },
            { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-500'
                  : darkMode
                  ? 'border-transparent text-gray-400 hover:text-gray-300'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Editor Tab */}
        {activeTab === 'editor' && (
          <div className="max-w-4xl mx-auto">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Template Name *</label>
                    <input
                      type="text"
                      value={submission.name}
                      onChange={(e) => setSubmission({ ...submission, name: e.target.value })}
                      placeholder="E.g., Automated Customer Onboarding"
                      className={`w-full px-3 py-2 rounded-lg ${
                        darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      } border`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Short Description *</label>
                    <input
                      type="text"
                      value={submission.description}
                      onChange={(e) => setSubmission({ ...submission, description: e.target.value })}
                      placeholder="One-line description of your template"
                      className={`w-full px-3 py-2 rounded-lg ${
                        darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      } border`}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Category *</label>
                      <select
                        value={submission.category}
                        onChange={(e) => setSubmission({ ...submission, category: e.target.value as TemplateCategory })}
                        className={`w-full px-3 py-2 rounded-lg ${
                          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                        } border`}
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Difficulty *</label>
                      <select
                        value={submission.difficulty}
                        onChange={(e) => setSubmission({ ...submission, difficulty: e.target.value as any })}
                        className={`w-full px-3 py-2 rounded-lg ${
                          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                        } border`}
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Tags</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                        placeholder="Add tags..."
                        className={`flex-1 px-3 py-2 rounded-lg ${
                          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                        } border`}
                      />
                      <button
                        onClick={handleAddTag}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(submission.tags || []).map(tag => (
                        <span
                          key={tag}
                          className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${
                            darkMode ? 'bg-gray-700' : 'bg-gray-200'
                          }`}
                        >
                          {tag}
                          <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500">
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Documentation */}
              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h2 className="text-xl font-semibold mb-4">Documentation</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Overview *</label>
                    <textarea
                      value={submission.overview}
                      onChange={(e) => setSubmission({ ...submission, overview: e.target.value })}
                      placeholder="Detailed description of what this template does..."
                      rows={4}
                      className={`w-full px-3 py-2 rounded-lg ${
                        darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      } border`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Setup Instructions *</label>
                    <textarea
                      value={submission.setupInstructions}
                      onChange={(e) => setSubmission({ ...submission, setupInstructions: e.target.value })}
                      placeholder="Step-by-step setup guide..."
                      rows={6}
                      className={`w-full px-3 py-2 rounded-lg ${
                        darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      } border`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Usage Guide *</label>
                    <textarea
                      value={submission.usageGuide}
                      onChange={(e) => setSubmission({ ...submission, usageGuide: e.target.value })}
                      placeholder="How to use this template..."
                      rows={4}
                      className={`w-full px-3 py-2 rounded-lg ${
                        darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      } border`}
                    />
                  </div>
                </div>
              </div>

              {/* Media */}
              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h2 className="text-xl font-semibold mb-4">Media</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Screenshots</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="screenshot-upload"
                    />
                    <label
                      htmlFor="screenshot-upload"
                      className={`block border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                        darkMode ? 'border-gray-600 hover:border-purple-500' : 'border-gray-300 hover:border-purple-400'
                      }`}
                    >
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Click to upload screenshots</p>
                      <p className="text-sm opacity-50 mt-1">PNG, JPG up to 5MB</p>
                    </label>
                    {submission.screenshots && submission.screenshots.length > 0 && (
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        {submission.screenshots.map((url, i) => (
                          <div key={i} className="relative aspect-video rounded-lg overflow-hidden">
                            <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Demo Video URL (Optional)</label>
                    <input
                      type="url"
                      value={submission.videoUrl || ''}
                      onChange={(e) => setSubmission({ ...submission, videoUrl: e.target.value })}
                      placeholder="https://youtube.com/watch?v=..."
                      className={`w-full px-3 py-2 rounded-lg ${
                        darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      } border`}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleSaveDraft}
                  className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  <Save className="w-5 h-5" />
                  Save Draft
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Submit for Review
                </button>
              </div>
            </div>
          </div>
        )}

        {/* My Templates Tab */}
        {activeTab === 'my-templates' && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">My Templates</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myTemplates.map(template => (
                <div
                  key={template.id}
                  className={`p-6 rounded-lg border cursor-pointer transition-all hover:scale-105 ${
                    darkMode ? 'border-gray-700 bg-gray-800 hover:border-purple-500' : 'border-gray-200 bg-white hover:border-purple-400'
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg flex-1">{template.name}</h3>
                    {getStatusBadge(template.status)}
                  </div>

                  <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {template.description}
                  </p>

                  <div className={`flex items-center gap-4 text-sm pt-4 border-t ${
                    darkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                    </div>
                    {template.status === 'published' && (
                      <div className="flex items-center gap-1 ml-auto text-purple-500">
                        <Eye className="w-4 h-4" />
                        Analytics
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="max-w-6xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold mb-6">Template Analytics</h2>

            {/* Key Metrics */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <Download className="w-5 h-5 text-purple-500" />
                  <span className="text-sm">Total Installs</span>
                </div>
                <div className="text-3xl font-bold">{formatNumber(analytics.totalInstalls)}</div>
              </div>

              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <span className="text-sm">Active Users</span>
                </div>
                <div className="text-3xl font-bold">{formatNumber(analytics.activeInstalls)}</div>
              </div>

              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span className="text-sm">Avg. Rating</span>
                </div>
                <div className="text-3xl font-bold">{analytics.ratingDistribution.average.toFixed(1)}</div>
              </div>

              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <Eye className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Total Views</span>
                </div>
                <div className="text-3xl font-bold">{formatNumber(analytics.views)}</div>
              </div>
            </div>

            {/* Charts would go here */}
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className="text-lg font-semibold mb-4">Installs Over Time</h3>
              <div className={`h-64 flex items-center justify-center ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                Chart would be rendered here
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Mock data
function generateMockMyTemplates(): TemplateSubmission[] {
  return [
    {
      id: 'sub-1',
      name: 'My Automation Template',
      description: 'A custom automation workflow',
      category: 'business_automation',
      tags: ['automation', 'workflow'],
      difficulty: 'intermediate',
      pricing: 'free',
      overview: 'Overview text',
      setupInstructions: 'Setup instructions',
      usageGuide: 'Usage guide',
      screenshots: [],
      requiredIntegrations: [],
      requiredCredentials: [],
      estimatedSetupTime: 15,
      workflow: { nodes: [], edges: [] },
      customizableFields: [],
      status: 'published',
      submittedBy: 'user-1',
      createdAt: new Date('2024-01-01'),
      publishedAt: new Date('2024-01-15')
    }
  ];
}

function generateMockAnalytics(): TemplateAnalytics {
  return {
    templateId: 'template-1',
    totalInstalls: 5420,
    installsByDay: [],
    installsByCountry: [],
    ratingDistribution: {
      1: 2,
      2: 3,
      3: 8,
      4: 28,
      5: 42,
      average: 4.3,
      total: 83
    },
    ratingTrend: [],
    activeInstalls: 3240,
    avgSetupTime: 12,
    completionRate: 0.87,
    views: 15420,
    detailViews: 8932,
    favorites: 892,
    shares: 234,
    lastUpdated: new Date(),
    periodStart: new Date(Date.now() - 30 * 86400000),
    periodEnd: new Date()
  };
}
