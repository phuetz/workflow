/**
 * Workflow Templates Marketplace - Barrel Export
 * Community-driven marketplace for sharing and discovering workflow templates
 */

// Re-export all types
export * from './types';

// Re-export registry components
export { TemplateRegistry, SearchIndex, RecommendationEngine } from './TemplateRegistry';

// Re-export validator components
export {
  TemplateValidator,
  TemplateFilter,
  TemplateSorter,
  TemplatePaginator,
} from './TemplateValidator';

// Re-export versioning components
export {
  VersionManager,
  ReviewManager,
  RatingCalculator,
  PaymentProcessor,
  TemplateUpdater,
} from './TemplateVersioning';

// Re-export catalog components
export {
  AnalyticsManager,
  TrendingCalculator,
  PopularityRanker,
  SimilarityCalculator,
  BackgroundTaskManager,
  TrackingService,
} from './TemplateCatalog';

// Re-export main class and singleton
export {
  WorkflowTemplatesMarketplace,
  workflowMarketplace,
} from './WorkflowTemplatesMarketplace';
