/**
 * Rating Service - Rating and Review Management
 * Handles reviews, moderation, and rating calculations
 */

import { logger } from '../services/SimpleLogger';
import {
  Review,
  ReviewStatus,
  ReviewFilters,
  RatingSummary,
  ReviewResponse,
  MarketplaceResponse,
  PaginatedResponse,
} from '../types/marketplace';

export class RatingService {
  private reviews: Map<string, Review> = new Map();
  private helpfulVotes: Map<string, Set<string>> = new Map(); // reviewId -> Set of userIds who voted helpful
  private notHelpfulVotes: Map<string, Set<string>> = new Map();
  private spamKeywords = ['spam', 'fake', 'bot', 'scam', 'click here', 'buy now'];

  /**
   * Submit new review
   */
  async submitReview(reviewData: Partial<Review>): Promise<MarketplaceResponse<Review>> {
    try {
      // Validate review
      const validation = this.validateReview(reviewData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Check for spam
      const spamCheck = this.detectSpam(reviewData.comment || '');
      const status = spamCheck.isSpam ? ReviewStatus.FLAGGED : ReviewStatus.APPROVED;

      const review: Review = {
        ...reviewData,
        id: this.generateId(),
        rating: reviewData.rating || 5,
        comment: reviewData.comment || '',
        helpful: 0,
        notHelpful: 0,
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
        reportCount: 0,
      } as Review;

      this.reviews.set(review.id, review);

      // Initialize vote tracking
      this.helpfulVotes.set(review.id, new Set());
      this.notHelpfulVotes.set(review.id, new Set());

      return {
        success: true,
        data: review,
        message: status === ReviewStatus.FLAGGED ? 'Review submitted for moderation' : 'Review submitted successfully',
      };
    } catch (error) {
      logger.error('Submit review error:', error);
      return {
        success: false,
        error: 'Failed to submit review',
      };
    }
  }

  /**
   * Get reviews for resource
   */
  async getReviews(
    resourceId: string,
    filters?: ReviewFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedResponse<Review>> {
    let reviews = Array.from(this.reviews.values()).filter(
      (r) => r.resourceId === resourceId && r.status === ReviewStatus.APPROVED
    );

    // Apply filters
    if (filters) {
      reviews = this.applyFilters(reviews, filters);
    }

    // Sort reviews
    reviews = this.sortReviews(reviews, filters?.sortBy);

    // Paginate
    const total = reviews.length;
    const start = (page - 1) * pageSize;
    const paginatedReviews = reviews.slice(start, start + pageSize);

    return {
      items: paginatedReviews,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get rating summary for resource
   */
  async getRatingSummary(resourceId: string): Promise<RatingSummary> {
    const reviews = Array.from(this.reviews.values()).filter(
      (r) => r.resourceId === resourceId && r.status === ReviewStatus.APPROVED
    );

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        percentageRecommend: 0,
        recentTrend: 'stable',
      };
    }

    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    const distribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    // Calculate percentage of 4-5 star reviews
    const positiveReviews = distribution[4] + distribution[5];
    const percentageRecommend = (positiveReviews / totalReviews) * 100;

    // Calculate trend
    const recentTrend = this.calculateTrend(reviews);

    return {
      averageRating: this.roundToDecimal(averageRating, 1),
      totalReviews,
      distribution,
      percentageRecommend: this.roundToDecimal(percentageRecommend, 0),
      recentTrend,
    };
  }

  /**
   * Vote review as helpful
   */
  async voteHelpful(reviewId: string, userId: string): Promise<MarketplaceResponse<Review>> {
    try {
      const review = this.reviews.get(reviewId);
      if (!review) {
        return {
          success: false,
          error: 'Review not found',
        };
      }

      const helpfulVoters = this.helpfulVotes.get(reviewId)!;
      const notHelpfulVoters = this.notHelpfulVotes.get(reviewId)!;

      // Remove from not helpful if previously voted
      if (notHelpfulVoters.has(userId)) {
        notHelpfulVoters.delete(userId);
        review.notHelpful--;
      }

      // Add to helpful
      if (!helpfulVoters.has(userId)) {
        helpfulVoters.add(userId);
        review.helpful++;
      }

      return {
        success: true,
        data: review,
      };
    } catch (error) {
      logger.error('Vote helpful error:', error);
      return {
        success: false,
        error: 'Failed to vote',
      };
    }
  }

  /**
   * Vote review as not helpful
   */
  async voteNotHelpful(reviewId: string, userId: string): Promise<MarketplaceResponse<Review>> {
    try {
      const review = this.reviews.get(reviewId);
      if (!review) {
        return {
          success: false,
          error: 'Review not found',
        };
      }

      const helpfulVoters = this.helpfulVotes.get(reviewId)!;
      const notHelpfulVoters = this.notHelpfulVotes.get(reviewId)!;

      // Remove from helpful if previously voted
      if (helpfulVoters.has(userId)) {
        helpfulVoters.delete(userId);
        review.helpful--;
      }

      // Add to not helpful
      if (!notHelpfulVoters.has(userId)) {
        notHelpfulVoters.add(userId);
        review.notHelpful++;
      }

      return {
        success: true,
        data: review,
      };
    } catch (error) {
      logger.error('Vote not helpful error:', error);
      return {
        success: false,
        error: 'Failed to vote',
      };
    }
  }

  /**
   * Reply to review (author/partner)
   */
  async replyToReview(
    reviewId: string,
    authorId: string,
    authorName: string,
    comment: string
  ): Promise<MarketplaceResponse<Review>> {
    try {
      const review = this.reviews.get(reviewId);
      if (!review) {
        return {
          success: false,
          error: 'Review not found',
        };
      }

      if (review.response) {
        return {
          success: false,
          error: 'Review already has a response',
        };
      }

      review.response = {
        authorId,
        authorName,
        comment,
        createdAt: new Date(),
      };

      review.updatedAt = new Date();

      return {
        success: true,
        data: review,
        message: 'Reply posted successfully',
      };
    } catch (error) {
      logger.error('Reply to review error:', error);
      return {
        success: false,
        error: 'Failed to reply',
      };
    }
  }

  /**
   * Report review
   */
  async reportReview(reviewId: string, userId: string, reason: string): Promise<MarketplaceResponse<void>> {
    try {
      const review = this.reviews.get(reviewId);
      if (!review) {
        return {
          success: false,
          error: 'Review not found',
        };
      }

      review.reportCount++;

      // Auto-flag if reported multiple times
      if (review.reportCount >= 3) {
        review.status = ReviewStatus.FLAGGED;
      }

      return {
        success: true,
        message: 'Review reported successfully',
      };
    } catch (error) {
      logger.error('Report review error:', error);
      return {
        success: false,
        error: 'Failed to report review',
      };
    }
  }

  /**
   * Moderate review (admin)
   */
  async moderateReview(
    reviewId: string,
    action: 'approve' | 'remove',
    reason?: string
  ): Promise<MarketplaceResponse<Review>> {
    try {
      const review = this.reviews.get(reviewId);
      if (!review) {
        return {
          success: false,
          error: 'Review not found',
        };
      }

      if (action === 'approve') {
        review.status = ReviewStatus.APPROVED;
      } else {
        review.status = ReviewStatus.REMOVED;
      }

      review.updatedAt = new Date();

      return {
        success: true,
        data: review,
        message: `Review ${action}d successfully`,
      };
    } catch (error) {
      logger.error('Moderate review error:', error);
      return {
        success: false,
        error: 'Failed to moderate review',
      };
    }
  }

  /**
   * Get flagged reviews for moderation
   */
  async getFlaggedReviews(): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter((r) => r.status === ReviewStatus.FLAGGED);
  }

  /**
   * Apply filters to reviews
   */
  private applyFilters(reviews: Review[], filters: ReviewFilters): Review[] {
    let filtered = reviews;

    if (filters.rating) {
      filtered = filtered.filter((r) => r.rating === filters.rating);
    }

    if (filters.verifiedOnly) {
      filtered = filtered.filter((r) => r.verifiedPurchase);
    }

    if (filters.withComment) {
      filtered = filtered.filter((r) => r.comment.trim().length > 0);
    }

    return filtered;
  }

  /**
   * Sort reviews
   */
  private sortReviews(reviews: Review[], sortBy?: string): Review[] {
    switch (sortBy) {
      case 'newest':
        return reviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      case 'oldest':
        return reviews.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      case 'helpful':
        return reviews.sort((a, b) => b.helpful - a.helpful);
      case 'rating_high':
        return reviews.sort((a, b) => b.rating - a.rating);
      case 'rating_low':
        return reviews.sort((a, b) => a.rating - b.rating);
      default:
        return reviews.sort((a, b) => b.helpful - a.helpful); // Default to most helpful
    }
  }

  /**
   * Calculate rating trend
   */
  private calculateTrend(reviews: Review[]): 'up' | 'down' | 'stable' {
    if (reviews.length < 10) return 'stable';

    // Compare last 5 reviews with previous 5
    const sorted = [...reviews].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const recent = sorted.slice(0, 5);
    const previous = sorted.slice(5, 10);

    const recentAvg = recent.reduce((sum, r) => sum + r.rating, 0) / recent.length;
    const previousAvg = previous.reduce((sum, r) => sum + r.rating, 0) / previous.length;

    if (recentAvg > previousAvg + 0.2) return 'up';
    if (recentAvg < previousAvg - 0.2) return 'down';
    return 'stable';
  }

  /**
   * Detect spam in review
   */
  private detectSpam(text: string): { isSpam: boolean; confidence: number } {
    const lowerText = text.toLowerCase();
    let spamScore = 0;

    // Check for spam keywords
    for (const keyword of this.spamKeywords) {
      if (lowerText.includes(keyword)) {
        spamScore += 2;
      }
    }

    // Check for excessive caps
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5) {
      spamScore += 1;
    }

    // Check for excessive punctuation
    const punctuationRatio = (text.match(/[!?]{2,}/g) || []).length;
    if (punctuationRatio > 2) {
      spamScore += 1;
    }

    // Check for URLs
    if (/(https?:\/\/|www\.)/i.test(text)) {
      spamScore += 2;
    }

    const isSpam = spamScore >= 3;
    const confidence = Math.min(spamScore / 5, 1);

    return { isSpam, confidence };
  }

  /**
   * Validate review data
   */
  private validateReview(review: Partial<Review>): { valid: boolean; error?: string } {
    if (!review.resourceId) {
      return { valid: false, error: 'Resource ID is required' };
    }

    if (!review.userId) {
      return { valid: false, error: 'User ID is required' };
    }

    if (!review.rating || review.rating < 1 || review.rating > 5) {
      return { valid: false, error: 'Rating must be between 1 and 5' };
    }

    if (review.comment && review.comment.length > 500) {
      return { valid: false, error: 'Comment must be 500 characters or less' };
    }

    return { valid: true };
  }

  /**
   * Round to decimal places
   */
  private roundToDecimal(value: number, decimals: number): number {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Bulk import reviews (for testing)
   */
  async bulkImport(reviews: Review[]): Promise<void> {
    reviews.forEach((review) => {
      this.reviews.set(review.id, review);
      this.helpfulVotes.set(review.id, new Set());
      this.notHelpfulVotes.set(review.id, new Set());
    });
  }

  /**
   * Get all reviews (admin)
   */
  async getAllReviews(): Promise<Review[]> {
    return Array.from(this.reviews.values());
  }
}
