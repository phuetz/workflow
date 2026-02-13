/**
 * Community Marketplace - Main Export File
 * Centralized exports for all marketplace services
 */

// Services
export { TemplateService } from './TemplateService';
export { TemplateRepository } from './TemplateRepository';
export { CommunityNodesService } from './CommunityNodes';
export { SecurityScanner } from './SecurityScanner';
export { PartnerService } from './PartnerService';
export { RevenueSharing } from './RevenueSharing';
export { RatingService } from './RatingService';

// Types
export type {
  WorkflowTemplate,
  TemplateSearchFilters,
  TemplateSearchResult,
  CommunityNode,
  NodeVerification,
  SecurityScanResult,
  SecurityFinding,
  Partner,
  PartnerDashboardData,
  Review,
  RatingSummary,
  MarketplaceResponse,
  PaginatedResponse,
  MarketplaceEvent,
} from '../types/marketplace';

export {
  TemplateCategory,
  TemplateIndustry,
  TemplateStatus,
  NodeStatus,
  PartnerTier,
  PartnerStatus,
  ReviewStatus,
  MarketplaceEventType,
} from '../types/marketplace';

/**
 * Quick Start Example
 *
 * import {
 *   TemplateService,
 *   TemplateRepository,
 *   CommunityNodesService,
 *   PartnerService,
 *   RatingService
 * } from './marketplace';
 *
 * // Initialize services
 * const templateRepo = new TemplateRepository();
 * const templateService = new TemplateService(templateRepo);
 * const nodeService = new CommunityNodesService();
 * const partnerService = new PartnerService();
 * const ratingService = new RatingService();
 *
 * // Search templates
 * const templates = await templateService.searchTemplates({
 *   categories: [TemplateCategory.MARKETING],
 *   rating: 4.5,
 *   verified: true
 * });
 *
 * // Install template
 * await templateService.installTemplate('template-id', 'user-id');
 *
 * // Submit community node
 * await nodeService.submitNode({ ... });
 *
 * // Register as partner
 * await partnerService.registerPartner({ ... });
 *
 * // Submit review
 * await ratingService.submitReview({ ... });
 */
