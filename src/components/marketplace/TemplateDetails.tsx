/**
 * Template Details Component
 * Full template details with screenshots, reviews, and installation
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Star,
  Heart,
  Share2,
  ExternalLink,
  Clock,
  Shield,
  Award,
  CheckCircle,
  AlertCircle,
  Play,
  ChevronLeft,
  ChevronRight,
  Code,
  FileText,
  Users,
  TrendingUp,
  Eye,
  Calendar,
  Tag,
  Zap
} from 'lucide-react';
import { WorkflowTemplate } from '../../types/templates';
import { TemplateAnalytics, TemplateReview } from '../../types/marketplaceEnhanced';
import { RatingSystem } from './RatingSystem';
import { logger } from '../../services/SimpleLogger';

interface TemplateDetailsProps {
  template: WorkflowTemplate;
  onClose: () => void;
  onInstall?: (template: WorkflowTemplate) => void;
  darkMode?: boolean;
}

type TabType = 'overview' | 'setup' | 'reviews' | 'analytics' | 'related';

export function TemplateDetails({
  template,
  onClose,
  onInstall,
  darkMode = false
}: TemplateDetailsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [currentScreenshot, setCurrentScreenshot] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [analytics, setAnalytics] = useState<TemplateAnalytics | null>(null);
  const [relatedTemplates, setRelatedTemplates] = useState<WorkflowTemplate[]>([]);

  useEffect(() => {
    loadAnalytics();
    loadRelatedTemplates();
  }, [template.id]);

  const loadAnalytics = async () => {
    try {
      const response = await fetch(`/api/templates/${template.id}/analytics`);
      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (error) {
      logger.error('Failed to load analytics:', error);
    }
  };

  const loadRelatedTemplates = async () => {
    try {
      const response = await fetch(`/api/templates?category=${template.category}&limit=4`);
      const data = await response.json();
      setRelatedTemplates(data.templates.filter((t: WorkflowTemplate) => t.id !== template.id));
    } catch (error) {
      logger.error('Failed to load related templates:', error);
    }
  };

  const handleInstall = () => {
    setShowInstallModal(true);
  };

  const confirmInstall = () => {
    onInstall?.(template);
    setShowInstallModal(false);
    onClose();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: template.name,
          text: template.description,
          url: window.location.href
        });
      } catch (error) {
        logger.error('Failed to share:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= Math.round(rating)
                ? 'fill-yellow-400 text-yellow-400'
                : darkMode ? 'text-gray-600' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getAuthorBadge = () => {
    switch (template.authorType) {
      case 'official':
        return { icon: <Shield className="w-4 h-4" />, color: 'text-blue-500', label: 'Official', bg: 'bg-blue-500/10' };
      case 'verified':
        return { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-500', label: 'Verified', bg: 'bg-green-500/10' };
      default:
        return null;
    }
  };

  const badge = getAuthorBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`w-full max-w-6xl h-[90vh] rounded-lg shadow-2xl flex flex-col overflow-hidden ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
        }`}
      >
        {/* Header */}
        <div className={`border-b ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'} p-6`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{template.name}</h2>
                {template.featured && (
                  <div className="px-2 py-1 rounded-full bg-yellow-500 text-white text-xs font-medium flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    Featured
                  </div>
                )}
                {badge && (
                  <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${badge.color} ${badge.bg}`}>
                    {badge.icon}
                    {badge.label}
                  </div>
                )}
              </div>
              <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {template.description}
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  {renderStars(template.rating)}
                  <span className="text-sm font-medium">{template.rating.toFixed(1)}</span>
                  <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    ({formatNumber(template.reviewCount)} reviews)
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Download className="w-4 h-4" />
                  <span>{formatNumber(template.downloads)} installs</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Users className="w-4 h-4" />
                  <span>by {template.author}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFavorited(!isFavorited)}
                className={`p-2 rounded-lg transition-colors ${
                  isFavorited
                    ? 'text-red-500 bg-red-500/10'
                    : darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
                aria-label="Favorite"
              >
                <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={handleShare}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
                aria-label="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Install Button */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleInstall}
              className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium flex items-center gap-2 transition-all hover:scale-105"
            >
              <Download className="w-5 h-5" />
              Install Template
            </button>
            {template.pricing !== 'free' && (
              <div className="px-4 py-2 rounded-lg bg-purple-500/10 text-purple-500 font-medium">
                {template.pricing === 'premium' ? `$${template.price || 9.99}` : 'Enterprise'}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              <span>{template.estimatedSetupTime} min setup</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} px-6`}>
          <div className="flex gap-6">
            {[
              { id: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
              { id: 'setup', label: 'Setup Guide', icon: <Code className="w-4 h-4" /> },
              { id: 'reviews', label: 'Reviews', icon: <Star className="w-4 h-4" /> },
              { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" /> },
              { id: 'related', label: 'Related', icon: <Tag className="w-4 h-4" /> }
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
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Screenshots Carousel */}
              {template.screenshots && template.screenshots.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Screenshots</h3>
                  <div className="relative">
                    <div className={`aspect-video rounded-lg overflow-hidden ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      <img
                        src={template.screenshots[currentScreenshot]}
                        alt={`Screenshot ${currentScreenshot + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    {template.screenshots.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentScreenshot(i => (i - 1 + template.screenshots!.length) % template.screenshots!.length)}
                          className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full ${
                            darkMode ? 'bg-gray-800/80 hover:bg-gray-700' : 'bg-white/80 hover:bg-white'
                          } shadow-lg`}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setCurrentScreenshot(i => (i + 1) % template.screenshots!.length)}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full ${
                            darkMode ? 'bg-gray-800/80 hover:bg-gray-700' : 'bg-white/80 hover:bg-white'
                          } shadow-lg`}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                          {template.screenshots.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setCurrentScreenshot(i)}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                i === currentScreenshot ? 'bg-purple-500' : 'bg-gray-400'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Video */}
              {template.videoUrl && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Demo Video</h3>
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      src={template.videoUrl}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Description</h3>
                <div className={`prose ${darkMode ? 'prose-invert' : ''} max-w-none`}>
                  <p>{template.documentation.overview}</p>
                </div>
              </div>

              {/* Requirements */}
              <div className="grid md:grid-cols-2 gap-6">
                {template.requiredIntegrations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Required Integrations</h3>
                    <ul className="space-y-2">
                      {template.requiredIntegrations.map((integration) => (
                        <li key={integration} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>{integration}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {template.requiredCredentials.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Required Credentials</h3>
                    <ul className="space-y-2">
                      {template.requiredCredentials.map((credential) => (
                        <li key={credential} className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-500" />
                          <span>{credential}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`px-3 py-1 rounded-full text-sm ${
                        darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Metadata */}
              <div className={`grid md:grid-cols-3 gap-4 p-4 rounded-lg ${
                darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <div>
                  <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Category
                  </div>
                  <div className="font-medium">{template.category.replace('_', ' ')}</div>
                </div>
                <div>
                  <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Difficulty
                  </div>
                  <div className="font-medium capitalize">{template.difficulty}</div>
                </div>
                <div>
                  <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Version
                  </div>
                  <div className="font-medium">{template.version}</div>
                </div>
                <div>
                  <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Created
                  </div>
                  <div className="font-medium text-sm">{formatDate(template.createdAt)}</div>
                </div>
                <div>
                  <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Updated
                  </div>
                  <div className="font-medium text-sm">{formatDate(template.updatedAt)}</div>
                </div>
                <div>
                  <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Pricing
                  </div>
                  <div className="font-medium capitalize">{template.pricing}</div>
                </div>
              </div>
            </div>
          )}

          {/* Setup Tab */}
          {activeTab === 'setup' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Setup Instructions</h3>
              {template.documentation.setup.map((step) => (
                <div key={step.step} className={`p-4 rounded-lg border ${
                  darkMode ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold flex-shrink-0">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2">{step.title}</h4>
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        {step.description}
                      </p>
                      {step.codeExample && (
                        <pre className={`mt-3 p-3 rounded-lg text-sm overflow-x-auto ${
                          darkMode ? 'bg-gray-800' : 'bg-gray-100'
                        }`}>
                          <code>{step.codeExample}</code>
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Usage Guide */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Usage Guide</h3>
                <div className={`prose ${darkMode ? 'prose-invert' : ''} max-w-none`}>
                  <p>{template.documentation.usage}</p>
                </div>
              </div>

              {/* Troubleshooting */}
              {template.documentation.troubleshooting && template.documentation.troubleshooting.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Troubleshooting</h3>
                  <div className="space-y-3">
                    {template.documentation.troubleshooting.map((item, i) => (
                      <div key={i} className={`p-4 rounded-lg border ${
                        darkMode ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-yellow-300 bg-yellow-50'
                      }`}>
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-semibold mb-1">{item.problem}</h4>
                            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                              {item.solution}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <RatingSystem templateId={template.id} darkMode={darkMode} />
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && analytics && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Analytics & Statistics</h3>

              {/* Key Metrics */}
              <div className="grid md:grid-cols-4 gap-4">
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Total Installs
                  </div>
                  <div className="text-2xl font-bold">{formatNumber(analytics.totalInstalls)}</div>
                </div>
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Active Installs
                  </div>
                  <div className="text-2xl font-bold">{formatNumber(analytics.activeInstalls)}</div>
                </div>
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Avg. Rating
                  </div>
                  <div className="text-2xl font-bold">{analytics.ratingDistribution.average.toFixed(1)}</div>
                </div>
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Completion Rate
                  </div>
                  <div className="text-2xl font-bold">{(analytics.completionRate * 100).toFixed(0)}%</div>
                </div>
              </div>

              {/* Rating Distribution */}
              <div>
                <h4 className="font-semibold mb-3">Rating Distribution</h4>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map(rating => {
                    const count = analytics.ratingDistribution[rating as keyof typeof analytics.ratingDistribution] as number || 0;
                    const percentage = analytics.ratingDistribution.total > 0
                      ? (count / analytics.ratingDistribution.total) * 100
                      : 0;

                    return (
                      <div key={rating} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-16">
                          <span className="text-sm">{rating}</span>
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        </div>
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm w-12 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Related Tab */}
          {activeTab === 'related' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Related Templates</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {relatedTemplates.map(relatedTemplate => (
                  <div
                    key={relatedTemplate.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      darkMode
                        ? 'border-gray-700 bg-gray-700/50 hover:bg-gray-700'
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <h4 className="font-semibold mb-2">{relatedTemplate.name}</h4>
                    <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {relatedTemplate.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span>{relatedTemplate.rating.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        <span>{formatNumber(relatedTemplate.downloads)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Install Confirmation Modal */}
      {showInstallModal && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-lg shadow-xl p-6 ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className="text-xl font-bold mb-4">Install Template?</h3>
            <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              This will create a new workflow based on "{template.name}". You can customize it after installation.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmInstall}
                className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium"
              >
                Install
              </button>
              <button
                onClick={() => setShowInstallModal(false)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
