/**
 * Workflow Intelligence Types
 * Types for workflow health scoring, trend analysis, anomaly detection, and recommendations
 */

import { WorkflowMetrics, PerformanceMetrics, ReliabilityMetrics } from './analytics';

// ============================================================================
// Health Scoring
// ============================================================================

export interface HealthScore {
  /** Overall health score (0-100) */
  overall: number;

  /** Component scores with individual weights */
  components: {
    reliability: number;  // 30% weight - success rate, error rate
    performance: number;  // 25% weight - execution time, throughput
    cost: number;         // 20% weight - cost per execution, monthly total
    usage: number;        // 15% weight - executions per day, trends
    freshness: number;    // 10% weight - last modified, last run
  };

  /** Health trend direction */
  trend: 'improving' | 'stable' | 'degrading';

  /** Trend confidence (0-1) */
  trendConfidence: number;

  /** Proactive recommendations */
  recommendations: Recommendation[];

  /** Historical scores for tracking */
  history: Array<{
    timestamp: Date;
    score: number;
  }>;

  /** Calculation metadata */
  metadata: {
    calculatedAt: Date;
    dataPoints: number;
    timeRange: number; // days
  };
}

export interface HealthScoreWeights {
  reliability: number;
  performance: number;
  cost: number;
  usage: number;
  freshness: number;
}

export const DEFAULT_HEALTH_WEIGHTS: HealthScoreWeights = {
  reliability: 0.30,
  performance: 0.25,
  cost: 0.20,
  usage: 0.15,
  freshness: 0.10,
};

// ============================================================================
// Trend Analysis
// ============================================================================

export interface TrendAnalysis {
  /** Metric being analyzed */
  metric: string;

  /** Trend direction */
  direction: 'up' | 'down' | 'stable';

  /** Trend strength (0-1) */
  strength: number;

  /** Statistical significance p-value */
  significance: number;

  /** Current value */
  currentValue: number;

  /** Previous value for comparison */
  previousValue: number;

  /** Percentage change */
  changePercent: number;

  /** Absolute change */
  changeAbsolute: number;

  /** Forecast for next period */
  forecast: {
    value: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
    confidence: number; // 0-1
  };

  /** Data points used */
  dataPoints: TimeSeriesData[];

  /** Analysis period */
  period: {
    start: Date;
    end: Date;
    days: number;
  };
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface TrendForecast {
  metric: string;
  period: 'day' | 'week' | 'month';
  predictions: Array<{
    timestamp: Date;
    value: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
  }>;
  confidence: number;
  method: 'moving-average' | 'exponential-smoothing' | 'linear-regression';
}

// ============================================================================
// Anomaly Detection
// ============================================================================

export interface Anomaly {
  /** Unique anomaly ID */
  id: string;

  /** Anomaly type */
  type: AnomalyType;

  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Affected metric */
  metric: string;

  /** Current value */
  currentValue: number;

  /** Expected value based on baseline */
  expectedValue: number;

  /** Deviation from expected */
  deviation: number;

  /** Standard deviations from mean */
  sigmaLevel: number;

  /** Description of the anomaly */
  description: string;

  /** Detection timestamp */
  detectedAt: Date;

  /** Affected workflow */
  workflowId?: string;

  /** Affected nodes */
  affectedNodes?: string[];

  /** Detection method used */
  detectionMethod: 'statistical' | 'pattern' | 'ml' | 'threshold';

  /** Confidence in detection (0-1) */
  confidence: number;

  /** Alert status */
  alert: {
    sent: boolean;
    sentAt?: Date;
    recipients?: string[];
  };

  /** Resolution status */
  resolved: boolean;
  resolvedAt?: Date;

  /** Recommendations */
  recommendations: Recommendation[];
}

export type AnomalyType =
  | 'execution_time_spike'
  | 'error_rate_increase'
  | 'cost_anomaly'
  | 'usage_drop'
  | 'throughput_degradation'
  | 'memory_spike'
  | 'pattern_break'
  | 'seasonal_deviation';

export interface AnomalyDetectionConfig {
  /** Sigma threshold for statistical detection (default: 3) */
  sigmaThreshold: number;

  /** Minimum data points required */
  minimumDataPoints: number;

  /** Lookback period in days */
  lookbackDays: number;

  /** Enable real-time detection */
  realTime: boolean;

  /** Alert configuration */
  alerts: {
    enabled: boolean;
    severityThreshold: Anomaly['severity'];
    channels: ('email' | 'slack' | 'webhook')[];
  };

  /** Detection methods to use */
  methods: {
    statistical: boolean;
    pattern: boolean;
    ml: boolean;
    threshold: boolean;
  };
}

export interface AnomalyBaseline {
  metric: string;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  p25: number;
  p75: number;
  iqr: number;
  calculatedFrom: {
    dataPoints: number;
    startDate: Date;
    endDate: Date;
  };
}

// ============================================================================
// Recommendations
// ============================================================================

export interface Recommendation {
  /** Unique recommendation ID */
  id: string;

  /** Recommendation type */
  type: RecommendationType;

  /** Priority level */
  priority: 'low' | 'medium' | 'high' | 'critical';

  /** Title */
  title: string;

  /** Detailed description */
  description: string;

  /** Expected impact */
  impact: {
    metric: string;
    currentValue: number;
    expectedValue: number;
    improvement: number;
    improvementPercent: number;
    unit?: string;
  };

  /** Estimated effort */
  effort: 'low' | 'medium' | 'high';

  /** Actionable steps */
  steps: string[];

  /** Affected workflow */
  workflowId?: string;

  /** Affected nodes */
  affectedNodes?: string[];

  /** Created timestamp */
  createdAt: Date;

  /** Expiry timestamp */
  expiresAt?: Date;

  /** User action status */
  status: 'pending' | 'accepted' | 'rejected' | 'implemented' | 'expired';

  /** User who acted */
  actedBy?: string;
  actedAt?: Date;

  /** Confidence in recommendation (0-1) */
  confidence: number;

  /** Supporting data */
  supportingData?: Record<string, unknown>;

  /** Auto-implementable flag */
  autoImplementable: boolean;
}

export type RecommendationType =
  | 'archive_unused'
  | 'consolidate_workflows'
  | 'cost_optimization'
  | 'performance_improvement'
  | 'add_caching'
  | 'add_retry'
  | 'add_error_handling'
  | 'add_circuit_breaker'
  | 'optimize_concurrency'
  | 'reduce_polling'
  | 'upgrade_node'
  | 'split_workflow'
  | 'add_monitoring'
  | 'security_enhancement';

export interface RecommendationEngine {
  /** Generate recommendations for a workflow */
  generateRecommendations(
    workflowId: string,
    healthScore: HealthScore,
    anomalies: Anomaly[],
    trends: TrendAnalysis[]
  ): Promise<Recommendation[]>;

  /** Get active recommendations */
  getActiveRecommendations(workflowId?: string): Promise<Recommendation[]>;

  /** Accept a recommendation */
  acceptRecommendation(recommendationId: string, userId: string): Promise<void>;

  /** Reject a recommendation */
  rejectRecommendation(recommendationId: string, userId: string, reason?: string): Promise<void>;

  /** Auto-implement a recommendation */
  implementRecommendation(recommendationId: string): Promise<boolean>;
}

// ============================================================================
// Intelligence Metrics
// ============================================================================

export interface IntelligenceMetrics {
  /** Workflow ID */
  workflowId: string;

  /** Workflow name */
  workflowName: string;

  /** Health score */
  healthScore: HealthScore;

  /** Active anomalies */
  anomalies: Anomaly[];

  /** Trend analyses */
  trends: {
    usage: TrendAnalysis;
    performance: TrendAnalysis;
    cost: TrendAnalysis;
    errorRate: TrendAnalysis;
  };

  /** Active recommendations */
  recommendations: Recommendation[];

  /** Cost analysis */
  costAnalysis: {
    currentMonthly: number;
    projectedMonthly: number;
    perExecution: number;
    savingsOpportunity: number;
    breakdown: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
  };

  /** Usage patterns */
  usagePatterns: {
    peakHours: number[];
    peakDays: string[];
    seasonality: boolean;
    executionsPerDay: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };

  /** Last updated */
  lastUpdated: Date;

  /** Data quality */
  dataQuality: {
    completeness: number; // 0-1
    freshness: number; // days since last update
    reliability: number; // 0-1
  };
}

// ============================================================================
// Workflow Intelligence Configuration
// ============================================================================

export interface IntelligenceConfig {
  /** Enable intelligence engine */
  enabled: boolean;

  /** Calculation interval in minutes */
  calculationInterval: number;

  /** Data retention in days */
  dataRetentionDays: number;

  /** Health score configuration */
  healthScore: {
    weights: HealthScoreWeights;
    trendLookbackDays: number;
    minimumDataPoints: number;
  };

  /** Anomaly detection configuration */
  anomalyDetection: AnomalyDetectionConfig;

  /** Recommendation settings */
  recommendations: {
    enabled: boolean;
    autoImplement: boolean;
    expiryDays: number;
    minimumConfidence: number;
  };

  /** Alert settings */
  alerts: {
    enabled: boolean;
    channels: Array<{
      type: 'email' | 'slack' | 'webhook';
      config: Record<string, unknown>;
    }>;
  };
}

// ============================================================================
// Statistical Analysis Types
// ============================================================================

export interface StatisticalSummary {
  count: number;
  mean: number;
  median: number;
  mode: number[];
  stdDev: number;
  variance: number;
  min: number;
  max: number;
  range: number;
  q1: number;
  q2: number;
  q3: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
  outliers: number[];
}

export interface CorrelationAnalysis {
  metric1: string;
  metric2: string;
  correlation: number; // -1 to 1
  pValue: number;
  significant: boolean;
  strength: 'none' | 'weak' | 'moderate' | 'strong' | 'very-strong';
}

export interface SeasonalityAnalysis {
  hasSeasonality: boolean;
  period: number; // in days
  confidence: number;
  seasonalComponent: number[];
  trendComponent: number[];
  residualComponent: number[];
}

// ============================================================================
// Machine Learning Types
// ============================================================================

export interface MLModelInfo {
  id: string;
  name: string;
  type: 'clustering' | 'classification' | 'regression' | 'time-series';
  algorithm: string;
  version: string;
  trainedAt: Date;
  accuracy: number;
  features: string[];
  hyperparameters: Record<string, unknown>;
  performance: {
    precision: number;
    recall: number;
    f1Score: number;
    mse?: number;
    rmse?: number;
    mae?: number;
  };
}

export interface ClusteringResult {
  clusters: Array<{
    id: number;
    center: number[];
    size: number;
    workflowIds: string[];
    characteristics: Record<string, number>;
  }>;
  silhouetteScore: number;
  model: MLModelInfo;
}

// ============================================================================
// Export all types
// ============================================================================

export interface WorkflowIntelligence {
  workflowId: string;
  workflowName: string;
  metrics: IntelligenceMetrics;
  config: IntelligenceConfig;
  lastCalculated: Date;
}
