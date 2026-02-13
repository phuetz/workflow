/**
 * Reviews API Routes
 * Handle template reviews, ratings, and voting
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../../../services/LoggingService';
import { TemplateReview, RatingDistribution } from '../../../types/marketplaceEnhanced';

export const reviewsRouter = Router();

/**
 * GET /api/reviews/:templateId
 * Get all reviews for a template
 */
reviewsRouter.get('/:templateId', asyncHandler(async (req: Request, res: Response) => {
  const { templateId } = req.params;
  const { sortBy = 'recent', sentiment, verified } = req.query;

  try {
    // Simulate fetching reviews
    const reviews: TemplateReview[] = [
      {
        id: '1',
        templateId,
        userId: 'user-1',
        userName: 'John Doe',
        rating: 5,
        title: 'Excellent template!',
        body: 'This template saved me hours of work.',
        pros: ['Easy to use', 'Well documented'],
        cons: [],
        verifiedInstall: true,
        createdAt: new Date(Date.now() - 86400000 * 2),
        updatedAt: new Date(Date.now() - 86400000 * 2),
        helpfulVotes: 15,
        unhelpfulVotes: 1,
        reportCount: 0,
        moderationStatus: 'approved'
      }
    ];

    const distribution: RatingDistribution = {
      1: 2,
      2: 3,
      3: 8,
      4: 28,
      5: 42,
      average: 4.3,
      total: 83
    };

    res.json({
      success: true,
      reviews,
      distribution,
      count: reviews.length
    });
  } catch (error) {
    logger.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reviews'
    });
  }
}));

/**
 * POST /api/reviews/:templateId
 * Submit a new review
 */
reviewsRouter.post('/:templateId', asyncHandler(async (req: Request, res: Response) => {
  const { templateId } = req.params;
  const { rating, title, body, pros, cons } = req.body;

  if (!rating || !title || !body) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
    });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      error: 'Rating must be between 1 and 5'
    });
  }

  try {
    const review: Partial<TemplateReview> = {
      id: Math.random().toString(36).substr(2, 9),
      templateId,
      userId: 'current-user',
      userName: 'Current User',
      rating,
      title,
      body,
      pros: pros || [],
      cons: cons || [],
      verifiedInstall: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      helpfulVotes: 0,
      unhelpfulVotes: 0,
      reportCount: 0,
      moderationStatus: 'pending'
    };

    logger.info('Review submitted', { templateId, reviewId: review.id });

    res.status(201).json({
      success: true,
      review,
      message: 'Review submitted successfully'
    });
  } catch (error) {
    logger.error('Error submitting review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit review'
    });
  }
}));

/**
 * POST /api/reviews/:templateId/:reviewId/vote
 * Vote on a review (helpful/unhelpful)
 */
reviewsRouter.post('/:templateId/:reviewId/vote', asyncHandler(async (req: Request, res: Response) => {
  const { templateId, reviewId } = req.params;
  const { helpful } = req.body;

  try {
    logger.info('Review vote', { templateId, reviewId, helpful });

    res.json({
      success: true,
      message: 'Vote recorded'
    });
  } catch (error) {
    logger.error('Error voting on review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to vote on review'
    });
  }
}));

/**
 * POST /api/reviews/:templateId/:reviewId/report
 * Report a review for moderation
 */
reviewsRouter.post('/:templateId/:reviewId/report', asyncHandler(async (req: Request, res: Response) => {
  const { templateId, reviewId } = req.params;
  const { reason } = req.body;

  try {
    logger.info('Review reported', { templateId, reviewId, reason });

    res.json({
      success: true,
      message: 'Review reported for moderation'
    });
  } catch (error) {
    logger.error('Error reporting review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report review'
    });
  }
}));

export default reviewsRouter;
