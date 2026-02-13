/**
 * Error Intelligence System - Comprehensive Tests
 *
 * Tests for ErrorClassifier, TrendAnalyzer, and ErrorKnowledgeBase
 * Validates ML accuracy, pattern detection, and recommendation quality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { errorClassifier } from '../monitoring/ErrorClassifier';
import { trendAnalyzer } from '../monitoring/TrendAnalyzer';
import { knowledgeBase } from '../monitoring/ErrorKnowledgeBase';
import { ErrorHandler, ErrorCategory, ErrorSeverity } from '../utils/ErrorHandler';

describe('ErrorClassifier', () => {
  beforeEach(() => {
    errorClassifier.clearHistory();
  });

  describe('Network Error Classification', () => {
    it('should classify timeout errors correctly', () => {
      const error = new Error('Request timeout after 30s');
      const result = errorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.TIMEOUT);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.reasoning).toContain('timeout');
    });

    it('should classify connection refused errors', () => {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:5432');
      const result = errorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.NETWORK);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.features.containsConnection).toBe(true);
    });

    it('should classify rate limit errors', () => {
      const error = new Error('429 Too Many Requests - Rate limit exceeded');
      const result = errorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.NETWORK);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.features.containsRate).toBe(true);
      expect(result.features.statusCode).toBe(429);
    });
  });

  describe('Authentication Error Classification', () => {
    it('should classify 401 unauthorized errors', () => {
      const error = new Error('401 Unauthorized - Invalid token');
      const result = errorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.features.statusCode).toBe(401);
      expect(result.features.containsAuth).toBe(true);
    });

    it('should classify token expiration errors', () => {
      const error = new Error('Authentication failed: Token has expired');
      const result = errorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(result.features.containsAuth).toBe(true);
    });

    it('should classify permission denied errors', () => {
      const error = new Error('403 Forbidden - Access denied');
      const result = errorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.AUTHORIZATION);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.features.statusCode).toBe(403);
    });
  });

  describe('Validation Error Classification', () => {
    it('should classify validation errors', () => {
      const error = new Error('400 Bad Request - Validation failed');
      const result = errorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.features.containsValidation).toBe(true);
      expect(result.features.isClientError).toBe(true);
    });

    it('should classify JSON parse errors', () => {
      const error = new Error('JSON parse error: Unexpected token');
      const result = errorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.features.containsValidation).toBe(true);
    });
  });

  describe('Resource Error Classification', () => {
    it('should classify memory errors', () => {
      const error = new Error('JavaScript heap out of memory');
      const result = errorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.MEMORY);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.features.containsMemory).toBe(true);
    });

    it('should classify 404 not found errors', () => {
      const error = new Error('404 Not Found - Resource does not exist');
      const result = errorClassifier.classify(error);

      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.features.statusCode).toBe(404);
    });
  });

  describe('Feature Extraction', () => {
    it('should extract message features correctly', () => {
      const error = new Error('GET https://api.example.com/users timeout after 30000ms');
      const result = errorClassifier.classify(error);

      expect(result.features.messageLength).toBeGreaterThan(0);
      expect(result.features.containsURL).toBe(true);
      expect(result.features.containsPath).toBe(true);
      expect(result.features.containsTimeout).toBe(true);
      expect(result.features.wordCount).toBeGreaterThan(5);
    });

    it('should detect status codes in error messages', () => {
      const error = new Error('Request failed with status code 503');
      const result = errorClassifier.classify(error);

      expect(result.features.hasStatusCode).toBe(true);
      expect(result.features.statusCode).toBe(503);
      expect(result.features.isServerError).toBe(true);
    });
  });

  describe('Learning & Accuracy', () => {
    it('should improve with more data', () => {
      // Create known error pattern
      const errors = Array.from({ length: 10 }, () =>
        ErrorHandler.timeout('API request', { endpoint: '/api/test' }, 5000)
      );

      errors.forEach(error => errorClassifier.classify(error));

      // Test classification of similar error
      const newError = new Error('API request timeout');
      const result = errorClassifier.classify(newError);

      expect(result.category).toBe(ErrorCategory.TIMEOUT);
      expect(result.features.similarErrorsCount).toBeGreaterThan(0);
    });

    it('should track model statistics', () => {
      const error1 = new Error('Timeout error');
      const error2 = new Error('Connection refused');

      errorClassifier.classify(error1);
      errorClassifier.classify(error2);

      const stats = errorClassifier.getModelStats();

      expect(stats.version).toBe('1.0.0');
      expect(stats.accuracy).toBeGreaterThanOrEqual(0.95);
      expect(stats.historySize).toBe(2);
    });
  });

  describe('Alternative Categories', () => {
    it('should provide alternative classifications', () => {
      const error = new Error('Service temporarily unavailable due to timeout');
      const result = errorClassifier.classify(error);

      expect(result.alternativeCategories.length).toBeGreaterThan(0);
      expect(result.alternativeCategories[0].confidence).toBeLessThan(result.confidence);
    });
  });
});

describe('TrendAnalyzer', () => {
  beforeEach(() => {
    trendAnalyzer.clearHistory();
  });

  describe('Error Trend Analysis', () => {
    it('should analyze error trends over time', () => {
      // Create errors over time
      const now = Date.now();
      const errors = Array.from({ length: 50 }, (_, i) => ({
        ...ErrorHandler.network(new Error('Test error'), {}),
        timestamp: now - (i * 60000) // 1 error per minute
      }));

      errors.forEach(error => trendAnalyzer.addError(error));

      const trend = trendAnalyzer.analyzeTrends(
        new Date(now - 3600000),
        new Date(now),
        'hour'
      );

      expect(trend.totalErrors).toBe(50);
      expect(trend.errorRate).toBeGreaterThan(0);
      expect(trend.categories.size).toBeGreaterThan(0);
    });

    it('should detect increasing trends', () => {
      const now = Date.now();

      // Create increasing error pattern
      const baselineErrors = Array.from({ length: 10 }, (_, i) => ({
        ...ErrorHandler.network(new Error('Test'), {}),
        timestamp: now - 7200000 - (i * 60000) // 2-3 hours ago
      }));

      const recentErrors = Array.from({ length: 50 }, (_, i) => ({
        ...ErrorHandler.network(new Error('Test'), {}),
        timestamp: now - (i * 60000) // Last hour
      }));

      [...baselineErrors, ...recentErrors].forEach(error => trendAnalyzer.addError(error));

      const trend = trendAnalyzer.analyzeTrends(
        new Date(now - 3600000),
        new Date(now),
        'hour'
      );

      expect(trend.trend).toBe('increasing');
      expect(trend.growth).toBeGreaterThan(10);
    });
  });

  describe('Spike Detection', () => {
    it('should detect error spikes', () => {
      const now = Date.now();

      // Normal baseline (1 error per minute)
      const baseline = Array.from({ length: 60 }, (_, i) => ({
        ...ErrorHandler.network(new Error('Normal'), {}),
        timestamp: now - 7200000 - (i * 60000)
      }));

      // Spike (20 errors in 5 minutes)
      const spike = Array.from({ length: 100 }, (_, i) => ({
        ...ErrorHandler.network(new Error('Spike'), {}),
        timestamp: now - (i * 3000) // One every 3 seconds
      }));

      [...baseline, ...spike].forEach(error => trendAnalyzer.addError(error));

      const spikes = trendAnalyzer.detectSpikes(3600000);

      expect(spikes.length).toBeGreaterThan(0);
      expect(spikes[0].severity).toMatch(/high|critical/);
      expect(spikes[0].multiplier).toBeGreaterThan(3);
    });

    it('should classify spike severity correctly', () => {
      const now = Date.now();

      // Baseline
      const baseline = Array.from({ length: 10 }, (_, i) => ({
        ...ErrorHandler.network(new Error('Normal'), {}),
        timestamp: now - 7200000 - (i * 360000)
      }));

      // Critical spike (15x baseline)
      const spike = Array.from({ length: 150 }, (_, i) => ({
        ...ErrorHandler.network(new Error('Critical'), {}),
        timestamp: now - (i * 10000)
      }));

      [...baseline, ...spike].forEach(error => trendAnalyzer.addError(error));

      const spikes = trendAnalyzer.detectSpikes(3600000);

      expect(spikes[0].severity).toBe('critical');
      expect(spikes[0].multiplier).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Temporal Patterns', () => {
    it('should detect hourly patterns', () => {
      const now = Date.now();

      // Create hourly pattern (more errors during business hours)
      const errors = [];
      for (let hour = 0; hour < 24; hour++) {
        const errorCount = hour >= 9 && hour <= 17 ? 10 : 2; // More during 9am-5pm
        for (let i = 0; i < errorCount; i++) {
          errors.push({
            ...ErrorHandler.network(new Error('Test'), {}),
            timestamp: now - (24 - hour) * 3600000 - (i * 360000)
          });
        }
      }

      errors.forEach(error => trendAnalyzer.addError(error));

      const patterns = trendAnalyzer.detectTemporalPatterns();
      const hourlyPattern = patterns.find(p => p.type === 'hourly');

      expect(hourlyPattern).toBeDefined();
      if (hourlyPattern) {
        expect(hourlyPattern.confidence).toBeGreaterThan(0.5);
        expect(hourlyPattern.peakHours).toBeDefined();
      }
    });
  });

  describe('Error Prediction', () => {
    it('should predict future errors', () => {
      const now = Date.now();

      // Create trend data (increasing errors)
      const errors = Array.from({ length: 100 }, (_, i) => ({
        ...ErrorHandler.network(new Error('Test'), {}),
        timestamp: now - (100 - i) * 360000 // Last 10 hours, increasing
      }));

      errors.forEach(error => trendAnalyzer.addError(error));

      const prediction = trendAnalyzer.predictErrors(1);

      expect(prediction.predictedCount).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(['increasing', 'decreasing', 'stable']).toContain(prediction.trend);
      expect(['low', 'medium', 'high']).toContain(prediction.riskLevel);
      expect(prediction.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide high risk predictions correctly', () => {
      const now = Date.now();

      // Create rapidly increasing error pattern
      const errors = Array.from({ length: 200 }, (_, i) => ({
        ...ErrorHandler.network(new Error('Test'), {}),
        timestamp: now - (200 - i) * 180000 // Increasing frequency
      }));

      errors.forEach(error => trendAnalyzer.addError(error));

      const prediction = trendAnalyzer.predictErrors(1);

      if (prediction.predictedCount > 100) {
        expect(prediction.riskLevel).toMatch(/medium|high/);
      }
    });
  });

  describe('Deployment Correlation', () => {
    it('should detect deployment correlations', () => {
      const now = Date.now();

      // Pre-deployment errors (baseline)
      const preErrors = Array.from({ length: 10 }, (_, i) => ({
        ...ErrorHandler.network(new Error('Pre'), {}),
        timestamp: now - 7200000 - (i * 360000)
      }));

      // Record deployment
      trendAnalyzer.recordDeployment('v1.2.3');

      // Post-deployment spike
      const postErrors = Array.from({ length: 50 }, (_, i) => ({
        ...ErrorHandler.network(new Error('Post'), {}),
        timestamp: now - (i * 60000)
      }));

      [...preErrors, ...postErrors].forEach(error => trendAnalyzer.addError(error));

      const correlations = trendAnalyzer.findDeploymentCorrelations();

      expect(correlations.length).toBeGreaterThan(0);
      expect(correlations[0].event).toContain('v1.2.3');
      expect(correlations[0].errorIncreasePercent).toBeGreaterThan(0);
    });
  });

  describe('Insights Generation', () => {
    it('should generate actionable insights', () => {
      const now = Date.now();

      // Create various error scenarios
      // Spike
      const spike = Array.from({ length: 100 }, (_, i) => ({
        ...ErrorHandler.network(new Error('Spike'), {}),
        timestamp: now - (i * 10000)
      }));

      spike.forEach(error => trendAnalyzer.addError(error));

      const insights = trendAnalyzer.getInsights();

      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0].type).toBeDefined();
      expect(insights[0].severity).toBeDefined();
      expect(insights[0].title).toBeDefined();
      expect(insights[0].recommendations.length).toBeGreaterThan(0);
    });
  });
});

describe('ErrorKnowledgeBase', () => {
  describe('Error Search', () => {
    it('should search by error message', () => {
      const results = knowledgeBase.search('timeout');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toBe('ETIMEDOUT');
      expect(results[0].name).toContain('Timeout');
    });

    it('should search by error code', () => {
      const results = knowledgeBase.search('ECONNREFUSED');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].code).toBe('ECONNREFUSED');
    });

    it('should search by tags', () => {
      const results = knowledgeBase.search('authentication');

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.tags.some(tag => tag.includes('auth'))).toBe(true);
      });
    });

    it('should search by symptoms', () => {
      const results = knowledgeBase.search('rate limit');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Error Retrieval', () => {
    it('should get error by exact code', () => {
      const knowledge = knowledgeBase.getByCode('ETIMEDOUT');

      expect(knowledge).toBeDefined();
      expect(knowledge?.code).toBe('ETIMEDOUT');
      expect(knowledge?.solutions.length).toBeGreaterThan(0);
    });

    it('should get errors by category', () => {
      const results = knowledgeBase.getByCategory(ErrorCategory.NETWORK);

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.category).toBe(ErrorCategory.NETWORK);
      });
    });

    it('should get errors by severity', () => {
      const results = knowledgeBase.getBySeverity(ErrorSeverity.CRITICAL);

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.severity).toBe(ErrorSeverity.CRITICAL);
      });
    });
  });

  describe('Solutions & Recommendations', () => {
    it('should provide solutions with high success rates', () => {
      const knowledge = knowledgeBase.getByCode('ETIMEDOUT');

      expect(knowledge?.solutions.length).toBeGreaterThan(0);
      knowledge?.solutions.forEach(solution => {
        expect(solution.successRate).toBeGreaterThanOrEqual(0);
        expect(solution.successRate).toBeLessThanOrEqual(1);
        expect(solution.title).toBeDefined();
        expect(solution.steps.length).toBeGreaterThan(0);
        expect(solution.difficulty).toMatch(/easy|medium|hard/);
      });
    });

    it('should include code examples for solutions', () => {
      const knowledge = knowledgeBase.getByCode('ETIMEDOUT');
      const solutionsWithCode = knowledge?.solutions.filter(s => s.codeExample);

      expect(solutionsWithCode).toBeDefined();
      expect(solutionsWithCode!.length).toBeGreaterThan(0);
    });

    it('should provide prevention strategies', () => {
      const knowledge = knowledgeBase.getByCode('ETIMEDOUT');

      expect(knowledge?.prevention.length).toBeGreaterThan(0);
      knowledge?.prevention.forEach(strategy => {
        expect(strategy.title).toBeDefined();
        expect(strategy.implementation.length).toBeGreaterThan(0);
        expect(strategy.impact).toMatch(/low|medium|high/);
        expect(strategy.effort).toMatch(/low|medium|high/);
      });
    });
  });

  describe('Frequency Tracking', () => {
    it('should track error occurrences', () => {
      const code = 'ETIMEDOUT';
      const beforeFreq = knowledgeBase.getByCode(code)?.frequency || 0;

      knowledgeBase.recordOccurrence(code);

      const afterFreq = knowledgeBase.getByCode(code)?.frequency || 0;

      expect(afterFreq).toBe(beforeFreq + 1);
    });

    it('should get most frequent errors', () => {
      // Record some occurrences
      knowledgeBase.recordOccurrence('ETIMEDOUT');
      knowledgeBase.recordOccurrence('ETIMEDOUT');
      knowledgeBase.recordOccurrence('ECONNREFUSED');

      const frequent = knowledgeBase.getMostFrequent(5);

      expect(frequent.length).toBeGreaterThan(0);
      expect(frequent[0].frequency).toBeGreaterThanOrEqual(frequent[1]?.frequency || 0);
    });
  });

  describe('Statistics', () => {
    it('should provide comprehensive statistics', () => {
      const stats = knowledgeBase.getStats();

      expect(stats.total).toBeGreaterThanOrEqual(13); // At least 13 patterns
      expect(stats.totalSolutions).toBeGreaterThan(stats.total); // Multiple solutions per error
      expect(stats.avgResolutionRate).toBeGreaterThan(0.7); // Average >70% success
      expect(stats.avgResolutionRate).toBeLessThanOrEqual(1);
      expect(Object.keys(stats.byCategory).length).toBeGreaterThan(0);
      expect(Object.keys(stats.bySeverity).length).toBeGreaterThan(0);
    });

    it('should have high-quality error patterns', () => {
      const allCodes = knowledgeBase.getAllCodes();

      expect(allCodes.length).toBeGreaterThanOrEqual(13);

      allCodes.forEach(code => {
        const knowledge = knowledgeBase.getByCode(code);

        expect(knowledge).toBeDefined();
        expect(knowledge!.solutions.length).toBeGreaterThan(0);
        expect(knowledge!.description).toBeTruthy();
        expect(knowledge!.symptoms.length).toBeGreaterThan(0);
        expect(knowledge!.rootCauses.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('Error Intelligence System Integration', () => {
  beforeEach(() => {
    errorClassifier.clearHistory();
    trendAnalyzer.clearHistory();
  });

  it('should work end-to-end: classify → analyze → recommend', () => {
    // 1. Create an error
    const error = new Error('Request timeout after 30s');

    // 2. Classify it
    const classification = errorClassifier.classify(error);

    expect(classification.category).toBe(ErrorCategory.TIMEOUT);
    expect(classification.confidence).toBeGreaterThan(0.7);

    // 3. Create application error
    const appError = ErrorHandler.timeout('API request', {}, 30000);

    // 4. Add to trend analyzer
    trendAnalyzer.addError(appError);

    // 5. Get solution from knowledge base
    const solutions = knowledgeBase.search('timeout');

    expect(solutions.length).toBeGreaterThan(0);
    expect(solutions[0].solutions[0].successRate).toBeGreaterThan(0.7);
  });

  it('should detect and recommend solutions for spike', () => {
    const now = Date.now();

    // Create baseline
    const baseline = Array.from({ length: 10 }, () => ({
      ...ErrorHandler.network(new Error('Normal'), {}),
      timestamp: now - 7200000
    }));

    // Create spike with timeout errors
    const spike = Array.from({ length: 100 }, () => ({
      ...ErrorHandler.timeout('API request', {}, 30000),
      timestamp: now - 300000
    }));

    [...baseline, ...spike].forEach(error => trendAnalyzer.addError(error));

    // Detect spike
    const spikes = trendAnalyzer.detectSpikes(3600000);

    expect(spikes.length).toBeGreaterThan(0);
    expect(spikes[0].severity).toMatch(/high|critical/);

    // Get recommendations
    const insights = trendAnalyzer.getInsights();

    expect(insights.length).toBeGreaterThan(0);
    expect(insights[0].recommendations.length).toBeGreaterThan(0);
  });

  it('should provide confidence in predictions', () => {
    const now = Date.now();

    // Create consistent error pattern
    const errors = Array.from({ length: 100 }, (_, i) => ({
      ...ErrorHandler.network(new Error('Consistent'), {}),
      timestamp: now - (100 - i) * 360000
    }));

    errors.forEach(error => trendAnalyzer.addError(error));

    const prediction = trendAnalyzer.predictErrors(1);

    // With consistent data, confidence should be higher
    expect(prediction.confidence).toBeGreaterThan(0.5);
  });
});

describe('Performance & Scalability', () => {
  it('should handle large error volumes efficiently', () => {
    const startTime = Date.now();
    const now = Date.now();

    // Process 1000 errors
    const errors = Array.from({ length: 1000 }, (_, i) => ({
      ...ErrorHandler.network(new Error(`Error ${i}`), {}),
      timestamp: now - (i * 1000)
    }));

    errors.forEach(error => {
      errorClassifier.classify(error);
      trendAnalyzer.addError(error);
    });

    const duration = Date.now() - startTime;

    // Should process 1000 errors in less than 5 seconds
    expect(duration).toBeLessThan(5000);
    console.log(`Processed 1000 errors in ${duration}ms`);
  });

  it('should maintain classification accuracy with volume', () => {
    // Create 500 network errors and 500 timeout errors
    const networkErrors = Array.from({ length: 500 }, (_, i) => new Error(`ECONNREFUSED ${i}`));
    const timeoutErrors = Array.from({ length: 500 }, (_, i) => new Error(`Timeout ${i}`));

    let correctNetwork = 0;
    let correctTimeout = 0;

    networkErrors.forEach(error => {
      const result = errorClassifier.classify(error);
      if (result.category === ErrorCategory.NETWORK) correctNetwork++;
    });

    timeoutErrors.forEach(error => {
      const result = errorClassifier.classify(error);
      if (result.category === ErrorCategory.TIMEOUT) correctTimeout++;
    });

    const accuracy = (correctNetwork + correctTimeout) / 1000;

    // Should maintain >90% accuracy even with 1000 errors
    expect(accuracy).toBeGreaterThan(0.9);
    console.log(`Classification accuracy: ${(accuracy * 100).toFixed(1)}%`);
  });
});
