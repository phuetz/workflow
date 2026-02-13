/**
 * Test Coverage Analyzer
 * Analyzes test coverage and identifies gaps
 */

import type { TestScenario } from './AITestGenerator';

export interface CoverageReport {
  overall: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  gaps: CoverageGap[];
  recommendations: string[];
  metrics: CoverageMetrics;
}

export interface CoverageGap {
  area: string;
  currentCoverage: number;
  targetCoverage: number;
  missingTests: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface CoverageMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  codeCoverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  testDuration: number;
  averageTestDuration: number;
}

export interface TestCoverageOptions {
  targetCoverage?: number;
  criticalAreasRequired?: string[];
  minTestsPerCategory?: number;
}

export class TestCoverageAnalyzer {
  private targetCoverage: number;
  private criticalAreasRequired: string[];
  private minTestsPerCategory: number;

  constructor(options: TestCoverageOptions = {}) {
    this.targetCoverage = options.targetCoverage ?? 80;
    this.criticalAreasRequired = options.criticalAreasRequired ?? [
      'authentication',
      'authorization',
      'data-validation',
      'error-handling',
    ];
    this.minTestsPerCategory = options.minTestsPerCategory ?? 3;
  }

  /**
   * Analyze test coverage
   */
  analyzeCoverage(tests: TestScenario[]): CoverageReport {
    const byCategory = this.analyzeCoverageByCategory(tests);
    const byPriority = this.analyzeCoverageByPriority(tests);
    const gaps = this.identifyCoverageGaps(tests, byCategory);
    const recommendations = this.generateCoverageRecommendations(tests, gaps);

    // Calculate overall coverage
    const overall = this.calculateOverallCoverage(tests);

    // Mock metrics (in real implementation, would integrate with test runner)
    const metrics: CoverageMetrics = {
      totalTests: tests.length,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      codeCoverage: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
      testDuration: 0,
      averageTestDuration: 0,
    };

    return {
      overall,
      byCategory,
      byPriority,
      gaps,
      recommendations,
      metrics,
    };
  }

  /**
   * Identify untested areas in the codebase
   */
  identifyUntestedAreas(
    tests: TestScenario[],
    codeStructure: CodeStructure
  ): UntestedArea[] {
    const untestedAreas: UntestedArea[] = [];

    // Check each module
    codeStructure.modules.forEach((module) => {
      const moduleCoverage = this.getModuleCoverage(module, tests);

      if (moduleCoverage < this.targetCoverage) {
        untestedAreas.push({
          path: module.path,
          type: 'module',
          coverage: moduleCoverage,
          functions: module.functions.filter(
            (f) => !this.isFunctionTested(f, tests)
          ),
        });
      }
    });

    return untestedAreas;
  }

  /**
   * Suggest tests to improve coverage
   */
  suggestTestsForCoverage(
    currentCoverage: CoverageReport,
    targetCoverage: number = 80
  ): TestSuggestion[] {
    const suggestions: TestSuggestion[] = [];

    // Suggest tests for gaps
    currentCoverage.gaps.forEach((gap) => {
      gap.missingTests.forEach((test) => {
        suggestions.push({
          testName: test,
          reason: `Coverage gap in ${gap.area}`,
          priority: gap.priority,
          estimatedImpact: (gap.targetCoverage - gap.currentCoverage) / gap.missingTests.length,
        });
      });
    });

    // Suggest tests for critical areas
    this.criticalAreasRequired.forEach((area) => {
      const categoryCoverage = currentCoverage.byCategory[area] || 0;
      if (categoryCoverage < this.targetCoverage) {
        suggestions.push({
          testName: `Comprehensive ${area} test suite`,
          reason: `Critical area ${area} below target coverage`,
          priority: 'critical',
          estimatedImpact: this.targetCoverage - categoryCoverage,
        });
      }
    });

    // Sort by priority and impact
    return suggestions.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.estimatedImpact - a.estimatedImpact;
    });
  }

  /**
   * Calculate mutation test score
   */
  calculateMutationScore(
    totalMutations: number,
    killedMutations: number
  ): MutationScore {
    const score = totalMutations > 0 ? (killedMutations / totalMutations) * 100 : 0;

    let quality: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 80) {
      quality = 'excellent';
    } else if (score >= 60) {
      quality = 'good';
    } else if (score >= 40) {
      quality = 'fair';
    } else {
      quality = 'poor';
    }

    return {
      score: Math.round(score),
      totalMutations,
      killedMutations,
      survivedMutations: totalMutations - killedMutations,
      quality,
    };
  }

  /**
   * Analyze coverage by category
   */
  private analyzeCoverageByCategory(tests: TestScenario[]): Record<string, number> {
    const byCategory: Record<string, number> = {};

    // Count tests per category
    const categoryCounts: Record<string, number> = {};
    tests.forEach((test) => {
      categoryCounts[test.category] = (categoryCounts[test.category] || 0) + 1;
    });

    // Calculate coverage percentage for each category
    const totalTests = tests.length;
    Object.keys(categoryCounts).forEach((category) => {
      byCategory[category] = totalTests > 0
        ? Math.round((categoryCounts[category] / totalTests) * 100)
        : 0;
    });

    return byCategory;
  }

  /**
   * Analyze coverage by priority
   */
  private analyzeCoverageByPriority(tests: TestScenario[]): Record<string, number> {
    const byPriority: Record<string, number> = {};

    // Count tests per priority
    const priorityCounts: Record<string, number> = {};
    tests.forEach((test) => {
      priorityCounts[test.priority] = (priorityCounts[test.priority] || 0) + 1;
    });

    // Calculate coverage percentage for each priority
    const totalTests = tests.length;
    Object.keys(priorityCounts).forEach((priority) => {
      byPriority[priority] = totalTests > 0
        ? Math.round((priorityCounts[priority] / totalTests) * 100)
        : 0;
    });

    return byPriority;
  }

  /**
   * Identify coverage gaps
   */
  private identifyCoverageGaps(
    tests: TestScenario[],
    byCategory: Record<string, number>
  ): CoverageGap[] {
    const gaps: CoverageGap[] = [];

    // Check each expected category
    const expectedCategories = [
      'happy-path',
      'edge-case',
      'error-handling',
      'performance',
      'security',
    ];

    expectedCategories.forEach((category) => {
      const coverage = byCategory[category] || 0;
      const categoryTests = tests.filter((t) => t.category === category);

      if (categoryTests.length < this.minTestsPerCategory) {
        gaps.push({
          area: category,
          currentCoverage: coverage,
          targetCoverage: this.targetCoverage,
          missingTests: this.suggestTestsForCategory(category, this.minTestsPerCategory - categoryTests.length),
          priority: this.getCategoryPriority(category),
        });
      }
    });

    // Check for critical areas
    this.criticalAreasRequired.forEach((area) => {
      const hasTests = tests.some((t) => t.name.toLowerCase().includes(area.toLowerCase()));
      if (!hasTests) {
        gaps.push({
          area,
          currentCoverage: 0,
          targetCoverage: 100,
          missingTests: [
            `Test ${area} functionality`,
            `Test ${area} error cases`,
            `Test ${area} edge cases`,
          ],
          priority: 'critical',
        });
      }
    });

    return gaps;
  }

  /**
   * Generate coverage recommendations
   */
  private generateCoverageRecommendations(
    tests: TestScenario[],
    gaps: CoverageGap[]
  ): string[] {
    const recommendations: string[] = [];

    // Overall coverage
    const overall = this.calculateOverallCoverage(tests);
    if (overall < this.targetCoverage) {
      recommendations.push(
        `Increase overall test coverage from ${overall}% to ${this.targetCoverage}%`
      );
    }

    // Critical gaps
    const criticalGaps = gaps.filter((g) => g.priority === 'critical');
    if (criticalGaps.length > 0) {
      recommendations.push(
        `Address ${criticalGaps.length} critical coverage gap(s) immediately`
      );
    }

    // Category balance
    const categoryCounts: Record<string, number> = {};
    tests.forEach((t) => {
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
    });

    const maxCategory = Math.max(...Object.values(categoryCounts));
    const minCategory = Math.min(...Object.values(categoryCounts));

    if (maxCategory > minCategory * 3) {
      recommendations.push(
        'Test distribution is unbalanced. Add more tests to underrepresented categories.'
      );
    }

    // Priority balance
    const criticalTests = tests.filter((t) => t.priority === 'critical').length;
    if (criticalTests < tests.length * 0.2) {
      recommendations.push(
        'Add more critical priority tests to cover essential functionality'
      );
    }

    // Happy path
    const happyPathTests = tests.filter((t) => t.category === 'happy-path').length;
    if (happyPathTests === 0 && tests.length > 0) {
      recommendations.push(
        'Add happy path tests to verify normal workflow execution'
      );
    }

    // Error handling
    const errorTests = tests.filter((t) => t.category === 'error-handling').length;
    if (errorTests === 0 && tests.length > 0) {
      recommendations.push(
        'Add error handling tests to verify graceful failure scenarios'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Test coverage is excellent! Keep maintaining this quality.');
    }

    return recommendations;
  }

  /**
   * Calculate overall coverage
   */
  private calculateOverallCoverage(tests: TestScenario[]): number {
    // In a real implementation, this would analyze actual code coverage
    // For now, we estimate based on test completeness

    if (tests.length === 0) return 0;

    // Base coverage from number of tests
    let coverage = Math.min(tests.length * 10, 60);

    // Bonus for category coverage
    const categories = new Set(tests.map((t) => t.category));
    coverage += categories.size * 5;

    // Bonus for critical tests
    const criticalTests = tests.filter((t) => t.priority === 'critical').length;
    coverage += Math.min(criticalTests * 3, 15);

    // Bonus for edge cases
    const edgeCaseTests = tests.filter((t) => t.category === 'edge-case').length;
    coverage += Math.min(edgeCaseTests * 2, 10);

    // Bonus for error handling
    const errorTests = tests.filter((t) => t.category === 'error-handling').length;
    coverage += Math.min(errorTests * 2, 10);

    return Math.min(Math.round(coverage), 100);
  }

  /**
   * Suggest tests for a category
   */
  private suggestTestsForCategory(category: string, count: number): string[] {
    const suggestions: Record<string, string[]> = {
      'happy-path': [
        'Test successful workflow execution',
        'Test standard user flow',
        'Test typical data processing',
      ],
      'edge-case': [
        'Test with empty inputs',
        'Test with maximum data size',
        'Test with special characters',
        'Test with concurrent operations',
      ],
      'error-handling': [
        'Test with invalid inputs',
        'Test network failures',
        'Test timeout scenarios',
        'Test error recovery',
      ],
      'performance': [
        'Test execution time under load',
        'Test memory usage',
        'Test concurrent executions',
        'Test large dataset processing',
      ],
      'security': [
        'Test input sanitization',
        'Test authorization checks',
        'Test data encryption',
        'Test XSS prevention',
      ],
    };

    const categoryTests = suggestions[category] || [];
    return categoryTests.slice(0, count);
  }

  /**
   * Get priority for a category
   */
  private getCategoryPriority(category: string): 'critical' | 'high' | 'medium' | 'low' {
    const priorities: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
      'happy-path': 'critical',
      'error-handling': 'critical',
      'security': 'critical',
      'edge-case': 'high',
      'performance': 'medium',
    };

    return priorities[category] || 'medium';
  }

  /**
   * Get module coverage
   */
  private getModuleCoverage(module: CodeModule, tests: TestScenario[]): number {
    // Simplified calculation - in real implementation would analyze actual coverage
    const relevantTests = tests.filter((t) =>
      t.name.toLowerCase().includes(module.name.toLowerCase())
    );

    return relevantTests.length > 0 ? Math.min(relevantTests.length * 20, 100) : 0;
  }

  /**
   * Check if function is tested
   */
  private isFunctionTested(func: string, tests: TestScenario[]): boolean {
    return tests.some((t) =>
      t.steps.some((s) => s.description.toLowerCase().includes(func.toLowerCase()))
    );
  }
}

// Supporting interfaces
interface CodeStructure {
  modules: CodeModule[];
}

interface CodeModule {
  path: string;
  name: string;
  functions: string[];
}

interface UntestedArea {
  path: string;
  type: 'module' | 'function' | 'branch';
  coverage: number;
  functions: string[];
}

interface TestSuggestion {
  testName: string;
  reason: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedImpact: number;
}

interface MutationScore {
  score: number;
  totalMutations: number;
  killedMutations: number;
  survivedMutations: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export default TestCoverageAnalyzer;
