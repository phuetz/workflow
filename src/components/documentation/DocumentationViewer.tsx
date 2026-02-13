/**
 * Documentation Viewer Component
 * Interactive documentation browser with search, navigation, and feedback
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Copy,
  Printer,
  ThumbsUp,
  ThumbsDown,
  Clock,
  User,
  Eye,
  Share2,
  Menu,
  X,
  ArrowLeft,
  // Home,
  Bookmark,
  Settings,
  HelpCircle,
  Zap,
  Code,
  FileText,
  Users,
  Shield,
  Server,
  PuzzleIcon as Puzzle,
  GitBranch,
  // Activity,
  Layers
} from 'lucide-react';
import { documentationService } from '../../services/DocumentationService';
import type {
  DocumentationSection,
  DocumentationNavigation,
  DocumentationSearchResult,
  DocumentationFeedback,
  DocumentationCategory
} from '../../types/documentation';

interface DocumentationViewerProps {
  initialSectionId?: string;
  onClose?: () => void;
}

export const DocumentationViewer: React.FC<DocumentationViewerProps> = ({
  initialSectionId = 'welcome',
  onClose
}) => {
  const [currentSection, setCurrentSection] = useState<DocumentationSection | null>(null);
  const [navigation, setNavigation] = useState<DocumentationNavigation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocumentationSearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<Array<{ title: string; id: string }>>([]);
  const [feedback, setFeedback] = useState<{ type: string; submitted: boolean }>({ type: '', submitted: false });
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);

  useEffect(() => {
    loadNavigation();
    loadSection(initialSectionId);
  }, [initialSectionId]);

  const loadNavigation = async () => {
    // Load navigation from DocumentationService
    const nav = documentationService.getNavigation();
    setNavigation(nav);
  };

  const loadSection = async (sectionId: string) => {
    // Load section content from DocumentationService
    const section = documentationService.getSection(sectionId);
    if (section) {
      setCurrentSection(section);
      updateBreadcrumb(section);
      updateRecentlyViewed(sectionId);
      setShowSearch(false);
    }
  };

  const updateBreadcrumb = (section: any) => {
    // Find the section in navigation to build breadcrumb
    const breadcrumb = [
      { title: 'Documentation', id: 'home' },
      { title: section.title, id: section.id }
    ];
    setBreadcrumb(breadcrumb);
  };

  const updateRecentlyViewed = (sectionId: string) => {
    setRecentlyViewed(prev => {
      const updated = [sectionId, ...prev.filter(id => id !== sectionId)];
      return updated.slice(0, 10); // Keep last 10
    });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = documentationService.search(query);
      setSearchResults(results);
      setShowSearch(true);
    } else {
      setSearchResults([]);
      setShowSearch(false);
    }
  };

  const navigateToSection = (sectionId: string) => {
    loadSection(sectionId);
  };

  const submitFeedback = async (type: 'helpful' | 'not_helpful' | 'error' | 'suggestion', rating?: number) => {
    if (!currentSection) return;

    const feedbackData: DocumentationFeedback = {
      sectionId: currentSection.id,
      type,
      rating,
      timestamp: new Date()
    };

    await documentationService.submitFeedback(feedbackData);
    setFeedback({ type, submitted: true });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSectionClick = (sectionId: string) => {
    loadSection(sectionId);
    updateRecentlyViewed(sectionId);
  };

  const handleFeedback = (type: 'helpful' | 'not_helpful' | 'error' | 'suggestion') => {
    submitFeedback(type);
  };

  const isBookmarked = currentSection ? bookmarks.includes(currentSection.id) : false;

  const categoryIcons: Record<string, unknown> = {
    getting_started: Zap,
    workflow_building: GitBranch,
    node_reference: Puzzle,
    integrations: Layers,
    api_reference: Code,
    troubleshooting: HelpCircle,
    advanced: Settings,
    security: Shield,
    deployment: Server,
    community: Users
  };

  const getCategoryIcon = (category: string) => {
    return (categoryIcons as Record<string, unknown>)[category] || FileText;
  };

  const renderNavigation = () => {
    if (!navigation) return null;

    return (
      <div className="space-y-4">
        {/* Quick Links */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Quick Start</h3>
          <div className="space-y-1">
            {navigation.quickLinks.filter(link => link.category === 'essential').map((link) => (
              <button
                key={link.path}
                onClick={() => handleSectionClick(link.path.replace('/docs/', ''))}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg flex items-center"
              >
                <Zap className="w-4 h-4 mr-2" />
                {link.title}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Sections */}
        {navigation.sections.map((section) => {
          const IconComponent = getCategoryIcon(section.category || 'default') as React.ComponentType<{ className?: string }>;
          const isExpanded = !section.collapsed;

          return (
            <div key={section.id}>
              <button
                onClick={() => {
                  // Toggle section expansion
                  section.collapsed = !section.collapsed;
                  setNavigation({ ...navigation });
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 rounded-lg"
              >
                <div className="flex items-center">
                  <IconComponent className="w-4 h-4 mr-2" />
                  {section.title}
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {isExpanded && (
                <div className="ml-6 mt-1 space-y-1">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSectionClick(item.path.replace('/docs/', ''))}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between hover:bg-blue-50 hover:text-blue-700 ${
                        currentSection?.id === item.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
                      }`}
                    >
                      <span>{item.title}</span>
                      {item.badge && (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.badge === 'new' ? 'bg-green-100 text-green-800' :
                          item.badge === 'updated' ? 'bg-blue-100 text-blue-800' :
                          item.badge === 'popular' ? 'bg-yellow-100 text-yellow-800' :
                          item.badge === 'essential' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Recently Viewed</h3>
            <div className="space-y-1">
              {recentlyViewed.slice(0, 5).map((sectionId) => {
                // Find the section title from navigation or use the ID as fallback
                const sectionTitle = navigation?.sections
                  .flatMap(s => s.items)
                  .find(item => item.id === sectionId)?.title || sectionId;

                return (
                  <button
                    key={sectionId}
                    onClick={() => handleSectionClick(sectionId)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg flex items-center"
                  >
                    <Clock className="w-3 h-3 mr-2" />
                    <span className="truncate">{sectionTitle}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSearchResults = () => {
    if (!showSearch || searchResults.length === 0) return null;

    return (
      <div className="border-t border-gray-200">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Search Results ({searchResults.length})
          </h3>
          <div className="space-y-3">
            {searchResults.slice(0, 10).map((result) => (
              <button
                key={result.section.id}
                onClick={() => handleSectionClick(result.section.id)}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {result.section.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {result.section.description}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {result.section.type}
                      </span>
                      <span>•</span>
                      <span>{result.section.metadata.estimatedReadTime} min read</span>
                    </div>
                  </div>
                  <div className="text-sm text-blue-600 font-medium">
                    Score: {result.relevanceScore}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (!currentSection) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Select a documentation section to view</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {breadcrumb.map((item, index) => (
                <React.Fragment key={item.id}>
                  {index > 0 && <ChevronRight className="w-4 h-4" />}
                  <button
                    onClick={() => index === 0 ? setCurrentSection(null) : handleSectionClick(item.id)}
                    className="hover:text-blue-600"
                  >
                    {item.title}
                  </button>
                </React.Fragment>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  if (isBookmarked) {
                    setBookmarks(prev => prev.filter(id => id !== currentSection.id));
                  } else {
                    setBookmarks(prev => [...prev, currentSection.id]);
                  }
                }}
                className={`p-2 rounded-lg ${
                  bookmarks.includes(currentSection.id)
                    ? 'text-yellow-600 bg-yellow-50'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Bookmark className="w-4 h-4" />
              </button>

              <button
                onClick={() => copyToClipboard(window.location.href)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => window.print()}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {currentSection.title}
          </h1>

          <p className="text-gray-600 mb-4">
            {currentSection.description}
          </p>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-1" />
              {currentSection.metadata.author}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {currentSection.metadata.estimatedReadTime} min read
            </div>
            <div className="flex items-center">
              <Eye className="w-4 h-4 mr-1" />
              {currentSection.metadata.difficulty}
            </div>
            <div className="flex items-center space-x-1">
              {currentSection.metadata.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="prose max-w-none">
          {/* SECURITY FIX: Use safe text rendering instead of dangerous HTML conversion */}
          <div className="whitespace-pre-wrap">
            {currentSection.content.markdown}
          </div>
        </div>

        {/* Code Examples */}
        {currentSection.content.codeExamples && currentSection.content.codeExamples.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Code Examples</h3>
            {currentSection.content.codeExamples.map((example) => (
              <div key={example.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{example.title}</h4>
                    <p className="text-sm text-gray-600">{example.description}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(example.code)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <pre className="p-4 bg-gray-900 text-green-400 text-sm overflow-x-auto">
                  <code>{example.code}</code>
                </pre>
              </div>
            ))}
          </div>
        )}

        {/* Feedback Section */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold mb-4">Was this helpful?</h3>

          {!feedback.submitted ? (
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleFeedback('helpful')}
                className="flex items-center px-4 py-2 text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                Yes, helpful
              </button>
              <button
                onClick={() => handleFeedback('not_helpful')}
                className="flex items-center px-4 py-2 text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                Not helpful
              </button>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">
                Thank you for your feedback! We'll use it to improve our documentation.
              </p>
            </div>
          )}
        </div>

        {/* Related Sections */}
        {currentSection.relatedSections && currentSection.relatedSections.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold mb-4">Related Articles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentSection.relatedSections.map((relatedId) => {
                // Fetch related section details from DocumentationService
                const relatedSection = documentationService.getSection(relatedId);
                return (
                  <button
                    key={relatedId}
                    onClick={() => handleSectionClick(relatedId)}
                    className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm"
                  >
                    <h4 className="font-medium text-gray-900 mb-1">
                      {relatedSection?.title || 'Related Article'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {relatedSection?.description || `Click to view: ${relatedId}`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex bg-white">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} border-r border-gray-200 flex flex-col transition-all duration-200`}>
        {/* Sidebar Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center">
                <BookOpen className="w-6 h-6 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold">Documentation</h2>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              {sidebarCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </button>
          </div>

          {/* Search */}
          {!sidebarCollapsed && (
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto">
          {!sidebarCollapsed && (
            <>
              {showSearch ? renderSearchResults() : (
                <div className="p-4">
                  {renderNavigation()}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};