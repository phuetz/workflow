import React, { useState } from 'react';
import {
  Activity, BadgeCheck, Box, Briefcase, Code, DollarSign,
  Download, Eye, GitBranch, MessageCircle, Plus, ShoppingCart,
  Star, StarHalf, Target, Users, Workflow
} from 'lucide-react';
import type { WorkflowTemplate } from '../../types/templates';

interface TemplateCardProps {
  template: WorkflowTemplate;
  onUseTemplate: (template: WorkflowTemplate) => void;
  onPreview: (template: WorkflowTemplate) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onUseTemplate, onPreview }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Category icons and colors
  const categoryConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
    business_automation: {
      icon: <Briefcase className="w-4 h-4" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    ecommerce: {
      icon: <ShoppingCart className="w-4 h-4" />,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
    },
    hr: {
      icon: <Users className="w-4 h-4" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    monitoring: {
      icon: <Activity className="w-4 h-4" />,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    development: {
      icon: <Code className="w-4 h-4" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    finance: {
      icon: <DollarSign className="w-4 h-4" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    marketing: {
      icon: <Target className="w-4 h-4" />,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    communication: {
      icon: <MessageCircle className="w-4 h-4" />,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
  };

  const config = categoryConfig[template.category] || {
    icon: <Workflow className="w-4 h-4" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  };

  // Difficulty badge colors
  const difficultyConfig: Record<string, { label: string; color: string }> = {
    beginner: { label: 'Beginner', color: 'bg-green-100 text-green-700' },
    intermediate: { label: 'Intermediate', color: 'bg-yellow-100 text-yellow-700' },
    advanced: { label: 'Advanced', color: 'bg-red-100 text-red-700' },
  };

  const difficulty = difficultyConfig[template.difficulty] || difficultyConfig.beginner;

  // Render star rating
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<StarHalf key="half" className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-3.5 h-3.5 text-gray-300" />);
    }

    return stars;
  };

  return (
    <div
      className={`group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden ${
        isHovered ? 'ring-2 ring-primary-500' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail/Preview Area */}
      <div
        className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center cursor-pointer overflow-hidden"
        onClick={() => onPreview(template)}
      >
        {/* Placeholder pattern */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`pattern-${template.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="2" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#pattern-${template.id})`} />
          </svg>
        </div>

        {/* Icon */}
        <div className={`relative z-10 p-4 rounded-full ${config.bgColor} ${config.color}`}>
          {config.icon}
        </div>

        {/* Preview overlay on hover */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fadeIn">
            <div className="text-center">
              <Eye className="w-8 h-8 text-white mb-2 mx-auto" />
              <span className="text-white text-sm font-medium">Click to Preview</span>
            </div>
          </div>
        )}

        {/* Author badge */}
        {template.authorType === 'official' && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
            <BadgeCheck className="w-3 h-3" />
            Official
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 flex-1">
            {template.name}
          </h3>
          <div className={`ml-2 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${difficulty.color}`}>
            {difficulty.label}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
          {template.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {template.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded text-xs">
              +{template.tags.length - 3}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
          <div className="flex items-center gap-1">
            {renderStars(template.rating)}
            <span className="ml-1 font-medium">{template.rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="w-3.5 h-3.5" />
            <span>{template.downloads.toLocaleString()}</span>
          </div>
        </div>

        {/* Nodes count */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1">
            <Box className="w-3.5 h-3.5" />
            <span>{template.workflow.nodes.length} nodes</span>
          </div>
          <div className="flex items-center gap-1">
            <GitBranch className="w-3.5 h-3.5" />
            <span>{template.workflow.edges.length} connections</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onUseTemplate(template)}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Use Template
          </button>
          <button
            onClick={() => onPreview(template)}
            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            aria-label="Preview template"
          >
            <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Hover effect - subtle glow */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent animate-pulse" />
        </div>
      )}
    </div>
  );
};

export default TemplateCard;
