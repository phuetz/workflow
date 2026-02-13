/**
 * Mutation Testing Engine
 * Performs mutation testing to evaluate test suite quality
 */

import { MutationOperators, type Mutation, type MutationType } from './MutationOperators';
import { logger } from '../services/SimpleLogger';

export interface MutationTestResult {
  mutation: Mutation;
  status: 'killed' | 'survived' | 'timeout' | 'error';
  killedBy?: string[];
  executionTime: number;
  error?: string;
}

export interface MutationTestReport {
  totalMutations: number;
  killedMutations: number;
  survivedMutations: number;
  timeoutMutations: number;
  errorMutations: number;
  mutationScore: number;
  results: MutationTestResult[];
  byType: Record<MutationType, MutationTypeReport>;
  recommendations: string[];
}

export interface MutationTypeReport {
  total: number;
  killed: number;
  survived: number;
  score: number;
}

export interface MutationTestOptions {
  timeout?: number;
  parallel?: boolean;
  maxMutations?: number;
  includeTypes?: MutationType[];
  excludeTypes?: MutationType[];
  stopOnFirstSurvivor?: boolean;
}

export class MutationTester {
  private options: MutationTestOptions;

  constructor(options: MutationTestOptions = {}) {
    this.options = {
      timeout: options.timeout ?? 5000,
      parallel: options.parallel ?? true,
      maxMutations: options.maxMutations ?? 100,
      includeTypes: options.includeTypes,
      excludeTypes: options.excludeTypes,
      stopOnFirstSurvivor: options.stopOnFirstSurvivor ?? false,
    };
  }

  /**
   * Run mutation testing on code
   */
  async runMutationTests(
    code: string,
    testRunner: (mutatedCode: string) => Promise<TestRunResult>
  ): Promise<MutationTestReport> {
    // Generate mutations
    const mutations = this.generateMutations(code);

    logger.debug(`[MutationTester] Generated ${mutations.length} mutations`);

    // Run tests for each mutation
    const results: MutationTestResult[] = [];

    if (this.options.parallel) {
      const batches = this.createBatches(mutations, 10);
      for (const batch of batches) {
        const batchResults = await Promise.all(
          batch.map((mutation) => this.testMutation(code, mutation, testRunner))
        );
        results.push(...batchResults);

        if (this.options.stopOnFirstSurvivor && batchResults.some((r) => r.status === 'survived')) {
          break;
        }
      }
    } else {
      for (const mutation of mutations) {
        const result = await this.testMutation(code, mutation, testRunner);
        results.push(result);

        if (this.options.stopOnFirstSurvivor && result.status === 'survived') {
          break;
        }
      }
    }

    // Generate report
    return this.generateReport(results);
  }

  /**
   * Generate mutations for code
   */
  generateMutations(code: string): Mutation[] {
    const operators = MutationOperators.getAllOperators();
    const allMutations: Mutation[] = [];

    operators.forEach((operator) => {
      // Check if type should be included
      if (this.options.includeTypes && !this.options.includeTypes.includes(operator.type)) {
        return;
      }

      if (this.options.excludeTypes && this.options.excludeTypes.includes(operator.type)) {
        return;
      }

      try {
        const mutations = operator.apply(code);
        allMutations.push(...mutations);
      } catch (error) {
        logger.warn(`Error applying operator ${operator.name}:`, error);
      }
    });

    // Limit number of mutations
    if (this.options.maxMutations && allMutations.length > this.options.maxMutations) {
      // Prioritize mutations by type
      const prioritized = this.prioritizeMutations(allMutations);
      return prioritized.slice(0, this.options.maxMutations);
    }

    return allMutations;
  }

  /**
   * Test a single mutation
   */
  private async testMutation(
    originalCode: string,
    mutation: Mutation,
    testRunner: (mutatedCode: string) => Promise<TestRunResult>
  ): Promise<MutationTestResult> {
    const startTime = Date.now();

    try {
      // Apply mutation to code
      const mutatedCode = this.applyMutation(originalCode, mutation);

      // Run tests with timeout
      const testPromise = testRunner(mutatedCode);
      const timeoutPromise = new Promise<TestRunResult>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), this.options.timeout)
      );

      const result = await Promise.race([testPromise, timeoutPromise]);

      const executionTime = Date.now() - startTime;

      if (result.passed) {
        // Test passed with mutation = mutation survived (bad)
        return {
          mutation,
          status: 'survived',
          executionTime,
        };
      } else {
        // Test failed with mutation = mutation killed (good)
        return {
          mutation,
          status: 'killed',
          killedBy: result.failedTests,
          executionTime,
        };
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (error instanceof Error && error.message === 'Timeout') {
        return {
          mutation,
          status: 'timeout',
          executionTime,
        };
      }

      return {
        mutation,
        status: 'error',
        executionTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Apply mutation to code
   */
  private applyMutation(code: string, mutation: Mutation): string {
    // This is a simplified implementation
    // In a real implementation, we would use an AST to precisely locate and mutate

    const lines = code.split('\n');
    const targetLine = lines[mutation.location.line - 1];

    if (!targetLine) {
      throw new Error(`Line ${mutation.location.line} not found`);
    }

    // Replace first occurrence of original with mutated
    const mutatedLine = targetLine.replace(mutation.original, mutation.mutated);
    lines[mutation.location.line - 1] = mutatedLine;

    return lines.join('\n');
  }

  /**
   * Generate mutation test report
   */
  private generateReport(results: MutationTestResult[]): MutationTestReport {
    const killed = results.filter((r) => r.status === 'killed').length;
    const survived = results.filter((r) => r.status === 'survived').length;
    const timeout = results.filter((r) => r.status === 'timeout').length;
    const error = results.filter((r) => r.status === 'error').length;

    const total = results.length;
    const mutationScore = total > 0 ? (killed / total) * 100 : 0;

    // Group by type
    const byType: Record<MutationType, MutationTypeReport> = {} as any;

    const types: MutationType[] = [
      'arithmetic',
      'logical',
      'relational',
      'assignment',
      'unary',
      'conditional',
      'return',
      'literal',
      'array',
      'object',
    ];

    types.forEach((type) => {
      const typeResults = results.filter((r) => r.mutation.type === type);
      const typeKilled = typeResults.filter((r) => r.status === 'killed').length;
      const typeSurvived = typeResults.filter((r) => r.status === 'survived').length;

      byType[type] = {
        total: typeResults.length,
        killed: typeKilled,
        survived: typeSurvived,
        score: typeResults.length > 0 ? (typeKilled / typeResults.length) * 100 : 0,
      };
    });

    // Generate recommendations
    const recommendations = this.generateRecommendations(results, mutationScore, byType);

    return {
      totalMutations: total,
      killedMutations: killed,
      survivedMutations: survived,
      timeoutMutations: timeout,
      errorMutations: error,
      mutationScore: Math.round(mutationScore),
      results,
      byType,
      recommendations,
    };
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(
    results: MutationTestResult[],
    score: number,
    byType: Record<MutationType, MutationTypeReport>
  ): string[] {
    const recommendations: string[] = [];

    // Overall score
    if (score < 40) {
      recommendations.push(
        'Critical: Mutation score is very low. Add more comprehensive tests.'
      );
    } else if (score < 60) {
      recommendations.push('Mutation score is below target. Focus on testing edge cases.');
    } else if (score < 80) {
      recommendations.push('Good mutation score. Add tests for surviving mutations.');
    } else {
      recommendations.push('Excellent mutation score! Keep maintaining test quality.');
    }

    // Survived mutations by type
    Object.entries(byType).forEach(([type, report]) => {
      if (report.survived > 0 && report.score < 70) {
        recommendations.push(
          `Add tests for ${type} operations. ${report.survived} mutations survived.`
        );
      }
    });

    // Specific survivor patterns
    const survivors = results.filter((r) => r.status === 'survived');

    const arithmeticSurvivors = survivors.filter((r) => r.mutation.type === 'arithmetic').length;
    if (arithmeticSurvivors > 0) {
      recommendations.push(
        `Add boundary tests for arithmetic operations (${arithmeticSurvivors} survivors).`
      );
    }

    const logicalSurvivors = survivors.filter((r) => r.mutation.type === 'logical').length;
    if (logicalSurvivors > 0) {
      recommendations.push(
        `Add tests for all logical branches (${logicalSurvivors} survivors).`
      );
    }

    const relationalSurvivors = survivors.filter((r) => r.mutation.type === 'relational').length;
    if (relationalSurvivors > 0) {
      recommendations.push(
        `Add boundary condition tests (${relationalSurvivors} survivors).`
      );
    }

    // Timeouts
    const timeouts = results.filter((r) => r.status === 'timeout').length;
    if (timeouts > 0) {
      recommendations.push(
        `${timeouts} mutations timed out. Consider optimizing tests or increasing timeout.`
      );
    }

    // Errors
    const errors = results.filter((r) => r.status === 'error').length;
    if (errors > 0) {
      recommendations.push(`${errors} mutations caused errors. Review test setup.`);
    }

    return recommendations;
  }

  /**
   * Prioritize mutations
   */
  private prioritizeMutations(mutations: Mutation[]): Mutation[] {
    // Priority order for mutation types
    const priority: Record<MutationType, number> = {
      logical: 1,
      relational: 2,
      conditional: 3,
      return: 4,
      arithmetic: 5,
      assignment: 6,
      unary: 7,
      array: 8,
      literal: 9,
      object: 10,
    };

    return mutations.sort((a, b) => {
      return priority[a.type] - priority[b.type];
    });
  }

  /**
   * Create batches for parallel processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * Get mutation score quality rating
   */
  static getMutationScoreQuality(score: number): {
    rating: 'excellent' | 'good' | 'fair' | 'poor';
    color: string;
    description: string;
  } {
    if (score >= 80) {
      return {
        rating: 'excellent',
        color: '#10b981',
        description: 'Excellent test coverage with high mutation kill rate',
      };
    } else if (score >= 60) {
      return {
        rating: 'good',
        color: '#3b82f6',
        description: 'Good test coverage with room for improvement',
      };
    } else if (score >= 40) {
      return {
        rating: 'fair',
        color: '#f59e0b',
        description: 'Fair test coverage, needs more comprehensive tests',
      };
    } else {
      return {
        rating: 'poor',
        color: '#ef4444',
        description: 'Poor test coverage, critical gaps in test suite',
      };
    }
  }
}

// Supporting interfaces
export interface TestRunResult {
  passed: boolean;
  failedTests?: string[];
  totalTests?: number;
  duration?: number;
}

export default MutationTester;
