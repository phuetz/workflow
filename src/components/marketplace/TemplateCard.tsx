/**
 * Template Card Component
 * Beautiful card design with preview, rating, and quick actions
 */

import React, { useState } from 'react';
import {
  Star,
  Download,
  Clock,
  Shield,
  Award,
  Heart,
  Eye,
  Zap,
  TrendingUp,
  ChevronRight,
  CheckCircle
} from 'lucide-react';
import { WorkflowTemplate } from '../../types/templates';

interface TemplateCardProps {
  template: WorkflowTemplate;
  onClick?: () => void;
  darkMode?: boolean;
  compact?: boolean;
  onInstall?: (template: WorkflowTemplate) => void;
  onFavorite?: (template: WorkflowTemplate) => void;
  isFavorited?: boolean;
}

export function TemplateCard({
  template,
  onClick,
  darkMode = false,
  compact = false,
  onInstall,
  onFavorite,
  isFavorited = false
}: TemplateCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [favorited, setFavorited] = useState(isFavorited);
  const [imageError, setImageError] = useState(false);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorited(!favorited);
    onFavorite?.(template);
  };

  const handleInstall = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInstall?.(template);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'text-green-500 bg-green-500/10';
      case 'intermediate':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'advanced':
        return 'text-red-500 bg-red-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getAuthorBadge = (authorType: string) => {
    switch (authorType) {
      case 'official':
        return { icon: <Shield className="w-3 h-3" />, color: 'text-blue-500', label: 'Official' };
      case 'verified':
        return { icon: <CheckCircle className="w-3 h-3" />, color: 'text-green-500', label: 'Verified' };
      default:
        return null;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= Math.round(rating)
                ? 'fill-yellow-400 text-yellow-400'
                : darkMode ? 'text-gray-600' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // Get preview image (first screenshot or placeholder)
  const previewImage = !imageError && template.screenshots?.[0]
    ? template.screenshots[0]
    : null;

  const badge = getAuthorBadge(template.authorType);

  if (compact) {
    // List view - compact horizontal layout
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
          darkMode
            ? 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-purple-500'
            : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-purple-400'
        } ${isHovered ? 'shadow-lg scale-[1.01]' : 'shadow'}`}
      >
        {/* Preview Thumbnail */}
        <div className={`w-32 h-20 rounded-lg overflow-hidden flex-shrink-0 ${
          darkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          {previewImage ? (
            <img
              src={previewImage}
              alt={template.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">
              {template.category === 'business_automation' ? '💼' :
               template.category === 'marketing' ? '📣' :
               template.category === 'sales' ? '💰' :
               template.category === 'data_processing' ? '📊' : '⚡'}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold truncate">{template.name}</h3>
                {template.featured && (
                  <Award className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                )}
                {badge && (
                  <div className={`flex items-center gap-1 ${badge.color}`} title={badge.label}>
                    {badge.icon}
                  </div>
                )}
              </div>
              <p className={`text-sm line-clamp-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {template.description}
              </p>
            </div>

            {/* Favorite Button */}
            <button
              onClick={handleFavorite}
              className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                favorited
                  ? 'text-red-500 bg-red-500/10'
                  : darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'
              }`}
              aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`w-5 h-5 ${favorited ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Meta Info */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Rating */}
            <div className="flex items-center gap-1">
              {renderStars(template.rating)}
              <span className="text-sm font-medium ml-1">{template.rating.toFixed(1)}</span>
              <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                ({formatNumber(template.reviewCount)})
              </span>
            </div>

            {/* Downloads */}
            <div className="flex items-center gap-1 text-sm">
              <Download className="w-4 h-4" />
              <span>{formatNumber(template.downloads)}</span>
            </div>

            {/* Difficulty */}
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
              {template.difficulty}
            </span>

            {/* Setup Time */}
            <div className="flex items-center gap-1 text-sm">
              <Clock className="w-4 h-4" />
              <span>{template.estimatedSetupTime} min</span>
            </div>

            {/* Pricing */}
            {template.pricing !== 'free' && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-500">
                {template.pricing}
              </span>
            )}
          </div>
        </div>

        {/* Install Button */}
        <button
          onClick={handleInstall}
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 flex-shrink-0 ${
            darkMode
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-purple-500 hover:bg-purple-600 text-white'
          } ${isHovered ? 'scale-105' : ''}`}
        >
          <Download className="w-4 h-4" />
          Install
        </button>
      </div>
    );
  }

  // Grid view - vertical card layout
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex flex-col rounded-lg border overflow-hidden cursor-pointer transition-all ${
        darkMode
          ? 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-purple-500'
          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-purple-400'
      } ${isHovered ? 'shadow-xl scale-[1.02]' : 'shadow-md'}`}
    >
      {/* Preview Image */}
      <div className={`relative h-40 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} overflow-hidden`}>
        {previewImage ? (
          <img
            src={previewImage}
            alt={template.name}
            onError={() => setImageError(true)}
            className={`w-full h-full object-cover transition-transform ${isHovered ? 'scale-110' : 'scale-100'}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            {template.category === 'business_automation' ? '💼' :
             template.category === 'marketing' ? '📣' :
             template.category === 'sales' ? '💰' :
             template.category === 'data_processing' ? '📊' : '⚡'}
          </div>
        )}

        {/* Overlay Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
          <div className="flex flex-col gap-1">
            {template.featured && (
              <div className="px-2 py-1 rounded-full bg-yellow-500 text-white text-xs font-medium flex items-center gap-1">
                <Award className="w-3 h-3" />
                Featured
              </div>
            )}
            {template.pricing !== 'free' && (
              <div className="px-2 py-1 rounded-full bg-purple-500 text-white text-xs font-medium">
                {template.pricing === 'premium' ? 'Premium' : 'Enterprise'}
              </div>
            )}
          </div>

          {/* Favorite Button */}
          <button
            onClick={handleFavorite}
            className={`p-2 rounded-full transition-all backdrop-blur-sm ${
              favorited
                ? 'bg-red-500 text-white'
                : 'bg-black/30 text-white hover:bg-black/50'
            }`}
            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Hover Overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <button
              onClick={handleInstall}
              className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium flex items-center gap-2 transform transition-all hover:scale-105"
            >
              <Download className="w-5 h-5" />
              Quick Install
            </button>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="flex-1 p-4 flex flex-col">
        {/* Header */}
        <div className="mb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-lg font-semibold line-clamp-1 flex-1">{template.name}</h3>
            {badge && (
              <div className={`flex items-center gap-1 ${badge.color}`} title={badge.label}>
                {badge.icon}
              </div>
            )}
          </div>
          <p className={`text-sm line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {template.description}
          </p>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          {renderStars(template.rating)}
          <span className="text-sm font-medium">{template.rating.toFixed(1)}</span>
          <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            ({formatNumber(template.reviewCount)})
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={`px-2 py-1 rounded-full text-xs ${
                darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className={`px-2 py-1 rounded-full text-xs ${
              darkMode ? 'text-gray-500' : 'text-gray-400'
            }`}>
              +{template.tags.length - 3}
            </span>
          )}
        </div>

        {/* Meta Info */}
        <div className={`flex items-center gap-3 text-xs pt-3 border-t ${
          darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
        }`}>
          <div className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            <span>{formatNumber(template.downloads)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{template.estimatedSetupTime}m</span>
          </div>
          <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(template.difficulty)}`}>
            {template.difficulty}
          </span>
        </div>

        {/* Author */}
        <div className={`mt-3 pt-3 border-t flex items-center justify-between ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            by {template.author}
          </span>
          <ChevronRight className={`w-4 h-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
        </div>
      </div>
    </div>
  );
}
