/**
 * Rating System Component
 * Reviews, ratings, and helpful voting
 */

import React, { useState, useEffect } from 'react';
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  Flag,
  CheckCircle,
  Filter,
  ChevronDown,
  User,
  Calendar,
  Award
} from 'lucide-react';
import { TemplateReview, RatingDistribution, ReviewFilters } from '../../types/marketplaceEnhanced';
import { logger } from '../../services/SimpleLogger';
import { useToast } from '../ui/Toast';

interface RatingSystemProps {
  templateId: string;
  darkMode?: boolean;
  onSubmitReview?: (review: Partial<TemplateReview>) => void;
}

export function RatingSystem({
  templateId,
  darkMode = false,
  onSubmitReview
}: RatingSystemProps) {
  const toast = useToast();
  const [reviews, setReviews] = useState<TemplateReview[]>([]);
  const [distribution, setDistribution] = useState<RatingDistribution>({
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    average: 0,
    total: 0
  });
  const [filters, setFilters] = useState<ReviewFilters>({
    sortBy: 'recent',
    sentiment: 'all'
  });
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: '',
    body: '',
    pros: [''],
    cons: ['']
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, [templateId, filters]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/templates/${templateId}/reviews?${new URLSearchParams(filters as any)}`);
      const data = await response.json();
      setReviews(data.reviews || generateMockReviews());
      setDistribution(data.distribution || generateMockDistribution());
    } catch (error) {
      logger.error('Failed to load reviews:', error);
      setReviews(generateMockReviews());
      setDistribution(generateMockDistribution());
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (reviewId: string, helpful: boolean) => {
    try {
      await fetch(`/api/templates/${templateId}/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful })
      });

      setReviews(reviews.map(review => {
        if (review.id === reviewId) {
          return {
            ...review,
            helpfulVotes: helpful ? review.helpfulVotes + 1 : review.helpfulVotes,
            unhelpfulVotes: !helpful ? review.unhelpfulVotes + 1 : review.unhelpfulVotes
          };
        }
        return review;
      }));
    } catch (error) {
      logger.error('Failed to vote:', error);
    }
  };

  const handleReport = async (reviewId: string) => {
    try {
      await fetch(`/api/templates/${templateId}/reviews/${reviewId}/report`, {
        method: 'POST'
      });
      toast.success('Review reported for moderation');
    } catch (error) {
      logger.error('Failed to report:', error);
    }
  };

  const handleSubmitReview = async () => {
    if (!newReview.title.trim() || !newReview.body.trim()) {
      toast.warning('Please fill in all required fields');
      return;
    }

    const review: Partial<TemplateReview> = {
      templateId,
      rating: newReview.rating,
      title: newReview.title,
      body: newReview.body,
      pros: newReview.pros.filter(p => p.trim()),
      cons: newReview.cons.filter(c => c.trim()),
      verifiedInstall: true,
      createdAt: new Date()
    };

    try {
      await fetch(`/api/templates/${templateId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review)
      });

      onSubmitReview?.(review);
      setShowWriteReview(false);
      setNewReview({
        rating: 5,
        title: '',
        body: '',
        pros: [''],
        cons: ['']
      });
      loadReviews();
    } catch (error) {
      logger.error('Failed to submit review:', error);
    }
  };

  const renderStars = (rating: number, interactive: boolean = false, onRate?: (rating: number) => void) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => interactive && onRate?.(star)}
            disabled={!interactive}
            className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}
          >
            <Star
              className={`w-5 h-5 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : darkMode ? 'text-gray-600' : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSentimentColor = (rating: number) => {
    if (rating >= 4) return 'text-green-500';
    if (rating >= 3) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Rating Overview */}
      <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Average Rating */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">{distribution.average.toFixed(1)}</div>
              <div className="mb-2">{renderStars(distribution.average)}</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {distribution.total} reviews
              </div>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = distribution[rating as keyof typeof distribution] as number || 0;
              const percentage = distribution.total > 0
                ? (count / distribution.total) * 100
                : 0;

              return (
                <div key={rating} className="flex items-center gap-3">
                  <button
                    onClick={() => setFilters({ ...filters, rating })}
                    className="flex items-center gap-1 hover:text-purple-500 transition-colors"
                  >
                    <span className="text-sm w-3">{rating}</span>
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  </button>
                  <div className={`flex-1 h-2 rounded-full overflow-hidden ${
                    darkMode ? 'bg-gray-600' : 'bg-gray-200'
                  }`}>
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

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Sentiment Filter */}
          <select
            value={filters.sentiment}
            onChange={(e) => setFilters({ ...filters, sentiment: e.target.value as any })}
            className={`px-3 py-2 rounded-lg text-sm ${
              darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
            } border`}
          >
            <option value="all">All Reviews</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
          </select>

          {/* Sort */}
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
            className={`px-3 py-2 rounded-lg text-sm ${
              darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
            } border`}
          >
            <option value="recent">Most Recent</option>
            <option value="helpful">Most Helpful</option>
            <option value="rating">Highest Rating</option>
          </select>

          {/* Verified Only */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.verified || false}
              onChange={(e) => setFilters({ ...filters, verified: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Verified only</span>
          </label>
        </div>

        {/* Write Review Button */}
        <button
          onClick={() => setShowWriteReview(!showWriteReview)}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Write a Review
        </button>
      </div>

      {/* Write Review Form */}
      {showWriteReview && (
        <div className={`p-6 rounded-lg border ${
          darkMode ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'
        }`}>
          <h3 className="text-lg font-semibold mb-4">Write a Review</h3>

          {/* Rating */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Your Rating</label>
            {renderStars(newReview.rating, true, (rating) => setNewReview({ ...newReview, rating }))}
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={newReview.title}
              onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
              placeholder="Summarize your experience"
              className={`w-full px-3 py-2 rounded-lg ${
                darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
              } border`}
            />
          </div>

          {/* Body */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Review</label>
            <textarea
              value={newReview.body}
              onChange={(e) => setNewReview({ ...newReview, body: e.target.value })}
              placeholder="Share your experience with this template"
              rows={4}
              className={`w-full px-3 py-2 rounded-lg ${
                darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
              } border`}
            />
          </div>

          {/* Pros */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Pros</label>
            {newReview.pros.map((pro, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={pro}
                  onChange={(e) => {
                    const pros = [...newReview.pros];
                    pros[i] = e.target.value;
                    setNewReview({ ...newReview, pros });
                  }}
                  placeholder={`Pro #${i + 1}`}
                  className={`flex-1 px-3 py-2 rounded-lg ${
                    darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
                  } border`}
                />
                {i === newReview.pros.length - 1 && (
                  <button
                    onClick={() => setNewReview({ ...newReview, pros: [...newReview.pros, ''] })}
                    className="px-3 py-2 bg-purple-500 text-white rounded-lg text-sm"
                  >
                    +
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Cons */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Cons</label>
            {newReview.cons.map((con, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={con}
                  onChange={(e) => {
                    const cons = [...newReview.cons];
                    cons[i] = e.target.value;
                    setNewReview({ ...newReview, cons });
                  }}
                  placeholder={`Con #${i + 1}`}
                  className={`flex-1 px-3 py-2 rounded-lg ${
                    darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
                  } border`}
                />
                {i === newReview.cons.length - 1 && (
                  <button
                    onClick={() => setNewReview({ ...newReview, cons: [...newReview.cons, ''] })}
                    className="px-3 py-2 bg-purple-500 text-white rounded-lg text-sm"
                  >
                    +
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmitReview}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium"
            >
              Submit Review
            </button>
            <button
              onClick={() => setShowWriteReview(false)}
              className={`px-4 py-2 rounded-lg font-medium ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8">
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              No reviews yet. Be the first to review this template!
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className={`p-6 rounded-lg border ${
                darkMode ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-white'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    darkMode ? 'bg-gray-600' : 'bg-gray-200'
                  }`}>
                    {review.userAvatar ? (
                      <img src={review.userAvatar} alt={review.userName} className="w-full h-full rounded-full" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{review.userName}</span>
                      {review.verifiedInstall && (
                        <div className="flex items-center gap-1 text-xs text-green-500">
                          <CheckCircle className="w-3 h-3" />
                          Verified
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {renderStars(review.rating)}
                      <span className={`${getSentimentColor(review.rating)} font-medium`}>
                        {review.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    {formatDate(review.createdAt)}
                  </span>
                </div>
              </div>

              {/* Title */}
              <h4 className="font-semibold text-lg mb-2">{review.title}</h4>

              {/* Body */}
              <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {review.body}
              </p>

              {/* Pros & Cons */}
              {(review.pros.length > 0 || review.cons.length > 0) && (
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {review.pros.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-green-500 mb-2">Pros</div>
                      <ul className="space-y-1">
                        {review.pros.map((pro, i) => (
                          <li key={i} className={`text-sm flex items-start gap-2 ${
                            darkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <span className="text-green-500 mt-0.5">+</span>
                            <span>{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {review.cons.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-red-500 mb-2">Cons</div>
                      <ul className="space-y-1">
                        {review.cons.map((con, i) => (
                          <li key={i} className={`text-sm flex items-start gap-2 ${
                            darkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <span className="text-red-500 mt-0.5">-</span>
                            <span>{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className={`flex items-center gap-4 pt-4 border-t ${
                darkMode ? 'border-gray-600' : 'border-gray-200'
              }`}>
                <button
                  onClick={() => handleVote(review.id, true)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                    darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>Helpful ({review.helpfulVotes})</span>
                </button>
                <button
                  onClick={() => handleVote(review.id, false)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                    darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" />
                  <span>({review.unhelpfulVotes})</span>
                </button>
                <button
                  onClick={() => handleReport(review.id)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm ml-auto transition-colors ${
                    darkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <Flag className="w-4 h-4" />
                  Report
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Mock data generators
function generateMockReviews(): TemplateReview[] {
  return [
    {
      id: '1',
      templateId: 'template-1',
      userId: 'user-1',
      userName: 'John Doe',
      rating: 5,
      title: 'Excellent template!',
      body: 'This template saved me hours of work. Very well documented and easy to customize.',
      pros: ['Easy to use', 'Well documented', 'Great support'],
      cons: [],
      verifiedInstall: true,
      createdAt: new Date(Date.now() - 86400000 * 2),
      updatedAt: new Date(Date.now() - 86400000 * 2),
      helpfulVotes: 15,
      unhelpfulVotes: 1,
      reportCount: 0,
      moderationStatus: 'approved'
    },
    {
      id: '2',
      templateId: 'template-1',
      userId: 'user-2',
      userName: 'Jane Smith',
      rating: 4,
      title: 'Good template with minor issues',
      body: 'Overall very good, but had some issues with the Slack integration.',
      pros: ['Good documentation', 'Active development'],
      cons: ['Slack integration needs work'],
      verifiedInstall: true,
      createdAt: new Date(Date.now() - 86400000 * 5),
      updatedAt: new Date(Date.now() - 86400000 * 5),
      helpfulVotes: 8,
      unhelpfulVotes: 2,
      reportCount: 0,
      moderationStatus: 'approved'
    }
  ];
}

function generateMockDistribution(): RatingDistribution {
  return {
    5: 42,
    4: 28,
    3: 8,
    2: 3,
    1: 1,
    average: 4.3,
    total: 82
  };
}
