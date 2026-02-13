/**
 * Community Features Component
 * User profiles, collections, and social features
 */

import React, { useState, useEffect } from 'react';
import {
  User,
  Users,
  Heart,
  Star,
  Download,
  Award,
  Calendar,
  Globe,
  Github,
  Twitter,
  Linkedin,
  Plus,
  Grid,
  Bookmark,
  TrendingUp,
  Eye
} from 'lucide-react';
import {
  UserProfile,
  TemplateCollection,
  UserBadge,
  TrendingTemplate
} from '../../types/marketplaceEnhanced';
import { WorkflowTemplate } from '../../types/templates';
import { logger } from '../../services/SimpleLogger';

interface CommunityFeaturesProps {
  darkMode?: boolean;
}

type ViewMode = 'profiles' | 'collections' | 'trending' | 'badges';

export function CommunityFeatures({ darkMode = false }: CommunityFeaturesProps) {
  const [activeView, setActiveView] = useState<ViewMode>('trending');
  const [topAuthors, setTopAuthors] = useState<UserProfile[]>([]);
  const [featuredCollections, setFeaturedCollections] = useState<TemplateCollection[]>([]);
  const [trendingTemplates, setTrendingTemplates] = useState<TrendingTemplate[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<TemplateCollection | null>(null);
  const [isFollowing, setIsFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCommunityData();
  }, []);

  const loadCommunityData = async () => {
    try {
      // Simulate API calls
      setTopAuthors(generateMockAuthors());
      setFeaturedCollections(generateMockCollections());
      setTrendingTemplates(generateMockTrending());
    } catch (error) {
      logger.error('Failed to load community data:', error);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      await fetch(`/api/users/${userId}/follow`, { method: 'POST' });
      setIsFollowing(prev => {
        const next = new Set(prev);
        if (next.has(userId)) {
          next.delete(userId);
        } else {
          next.add(userId);
        }
        return next;
      });
    } catch (error) {
      logger.error('Failed to follow user:', error);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'text-purple-500 bg-purple-500/10';
      case 'epic': return 'text-pink-500 bg-pink-500/10';
      case 'rare': return 'text-blue-500 bg-blue-500/10';
      case 'uncommon': return 'text-green-500 bg-green-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} p-6`}>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Users className="w-8 h-8 text-purple-500" />
          Community
        </h1>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          Discover top authors, curated collections, and trending templates
        </p>
      </div>

      {/* Navigation */}
      <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} px-6`}>
        <div className="flex gap-6">
          {[
            { id: 'trending', label: 'Trending', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'profiles', label: 'Top Authors', icon: <Award className="w-4 h-4" /> },
            { id: 'collections', label: 'Collections', icon: <Bookmark className="w-4 h-4" /> },
            { id: 'badges', label: 'Badges', icon: <Star className="w-4 h-4" /> }
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as ViewMode)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeView === view.id
                  ? 'border-purple-500 text-purple-500'
                  : darkMode
                  ? 'border-transparent text-gray-400 hover:text-gray-300'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {view.icon}
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Trending Templates */}
        {activeView === 'trending' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Trending This Week</h2>
            <div className="space-y-4">
              {trendingTemplates.map((template, index) => (
                <div
                  key={template.id}
                  className={`p-6 rounded-lg border ${
                    darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl font-bold text-purple-500 w-12 text-center">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{template.name}</h3>
                      <p className={`mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {template.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <TrendingUp className={`w-4 h-4 ${template.installTrend === 'up' ? 'text-green-500' : 'text-red-500'}`} />
                          <span>{template.installGrowth > 0 ? '+' : ''}{template.installGrowth.toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Download className="w-4 h-4" />
                          <span>{formatNumber(template.installsThisWeek)} this week</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>{template.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Authors */}
        {activeView === 'profiles' && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Top Template Authors</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topAuthors.map((author) => (
                <div
                  key={author.id}
                  className={`p-6 rounded-lg border cursor-pointer transition-all hover:scale-105 ${
                    darkMode ? 'border-gray-700 bg-gray-800 hover:border-purple-500' : 'border-gray-200 bg-white hover:border-purple-400'
                  }`}
                  onClick={() => setSelectedProfile(author)}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      {author.avatar ? (
                        <img src={author.avatar} alt={author.displayName} className="w-full h-full rounded-full" />
                      ) : (
                        <User className="w-8 h-8" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{author.displayName}</h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        @{author.username}
                      </p>
                    </div>
                  </div>

                  {author.bio && (
                    <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {author.bio}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center">
                      <div className="font-bold">{author.templatesPublished}</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Templates</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">{formatNumber(author.totalDownloads)}</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Downloads</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">{author.averageRating.toFixed(1)}</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Rating</div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollow(author.id);
                    }}
                    className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                      isFollowing.has(author.id)
                        ? darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                    }`}
                  >
                    {isFollowing.has(author.id) ? 'Following' : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collections */}
        {activeView === 'collections' && (
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Curated Collections</h2>
              <button className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Collection
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {featuredCollections.map((collection) => (
                <div
                  key={collection.id}
                  className={`p-6 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${
                    darkMode ? 'border-gray-700 bg-gray-800 hover:border-purple-500' : 'border-gray-200 bg-white hover:border-purple-400'
                  }`}
                  onClick={() => setSelectedCollection(collection)}
                >
                  {collection.coverImage && (
                    <div className="aspect-video rounded-lg overflow-hidden mb-4">
                      <img src={collection.coverImage} alt={collection.name} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold flex-1">{collection.name}</h3>
                    {collection.isFeatured && (
                      <Award className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>

                  <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {collection.description}
                  </p>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Grid className="w-4 h-4" />
                      <span className="text-sm">{collection.templateCount} templates</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      <span className="text-sm">{formatNumber(collection.followers)} followers</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    }`}>
                      {collection.curatorAvatar ? (
                        <img src={collection.curatorAvatar} alt={collection.curatorName} className="w-full h-full rounded-full" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-sm">by {collection.curatorName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Badges */}
        {activeView === 'badges' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Achievement Badges</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generateMockBadges().map((badge) => (
                <div
                  key={badge.id}
                  className={`p-4 rounded-lg border ${
                    darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className={`text-4xl mb-2 p-3 rounded-lg inline-block ${getBadgeColor(badge.rarity)}`}>
                    {badge.icon}
                  </div>
                  <h3 className="font-semibold mb-1">{badge.name}</h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {badge.description}
                  </p>
                  <div className={`mt-2 text-xs uppercase tracking-wider font-medium ${getBadgeColor(badge.rarity)}`}>
                    {badge.rarity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Mock data generators
function generateMockAuthors(): UserProfile[] {
  return [
    {
      id: 'author-1',
      username: 'workflow_master',
      displayName: 'Workflow Master',
      bio: 'Building automation tools for 10+ years',
      templatesPublished: 24,
      totalDownloads: 15420,
      averageRating: 4.8,
      reviewsWritten: 12,
      followers: 1234,
      following: 56,
      badges: [],
      joinedAt: new Date('2020-01-01')
    },
    {
      id: 'author-2',
      username: 'automation_pro',
      displayName: 'Automation Pro',
      bio: 'Helping businesses automate their workflows',
      templatesPublished: 18,
      totalDownloads: 8932,
      averageRating: 4.6,
      reviewsWritten: 8,
      followers: 892,
      following: 34,
      badges: [],
      joinedAt: new Date('2021-03-15')
    }
  ];
}

function generateMockCollections(): TemplateCollection[] {
  return [
    {
      id: 'collection-1',
      name: 'E-commerce Automation Essentials',
      description: 'Must-have templates for e-commerce businesses',
      curator: 'curator-1',
      curatorName: 'E-commerce Expert',
      templates: ['t1', 't2', 't3'],
      templateCount: 8,
      tags: ['ecommerce', 'automation', 'shopify'],
      followers: 2341,
      views: 15420,
      isPublic: true,
      isFeatured: true,
      createdAt: new Date('2023-01-15'),
      updatedAt: new Date('2024-01-10')
    }
  ];
}

function generateMockTrending(): TrendingTemplate[] {
  return [
    {
      id: 'trending-1',
      name: 'Automated Customer Onboarding',
      description: 'Streamline your customer onboarding process with this complete workflow template',
      category: 'business_automation',
      author: 'Workflow Master',
      authorType: 'verified',
      tags: ['onboarding', 'automation', 'crm'],
      difficulty: 'intermediate',
      workflow: { nodes: [], edges: [] },
      version: '1.2.0',
      createdAt: new Date('2023-06-01'),
      updatedAt: new Date('2024-01-15'),
      downloads: 5420,
      rating: 4.8,
      reviewCount: 124,
      featured: true,
      requiredIntegrations: ['Salesforce', 'Slack'],
      requiredCredentials: ['salesforce', 'slack'],
      estimatedSetupTime: 15,
      documentation: { overview: '', setup: [], usage: '' },
      screenshots: [],
      customizableFields: [],
      pricing: 'free',
      trendScore: 95,
      installTrend: 'up',
      installGrowth: 45.2,
      installsThisWeek: 842,
      installsLastWeek: 580
    } as TrendingTemplate
  ];
}

function generateMockBadges(): UserBadge[] {
  return [
    { id: '1', name: 'First Template', description: 'Published your first template', icon: '🎉', color: 'blue', rarity: 'common', earnedAt: new Date() },
    { id: '2', name: 'Top Author', description: '1000+ template downloads', icon: '🏆', color: 'gold', rarity: 'rare', earnedAt: new Date() },
    { id: '3', name: 'Community Hero', description: 'Helped 100+ users', icon: '💪', color: 'purple', rarity: 'epic', earnedAt: new Date() },
    { id: '4', name: 'Legendary Creator', description: '10,000+ downloads', icon: '⭐', color: 'purple', rarity: 'legendary', earnedAt: new Date() }
  ];
}
