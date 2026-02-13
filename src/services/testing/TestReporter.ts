/**
 * Test Reporter
 * Handles test report generation and export
 */

import type { WorkflowTestResult, TestReport, TestAssertion } from '../../types/testing';
import type { ReportOptions, ExportFormat } from './types';
import { coverageCalculator } from './CoverageCalculator';

/**
 * TestReporter handles report generation and export
 */
export class TestReporter {
  /**
   * Generate a test report from results
   */
  generateReport(results: WorkflowTestResult[], options: ReportOptions): TestReport {
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const errors = results.filter(r => r.status === 'error').length;

    const report: TestReport = {
      id: this.generateReportId(),
      createdAt: new Date(),
      duration: options.duration,
      summary: {
        total: results.length,
        passed,
        failed,
        errors,
        passRate: results.length > 0 ? (passed / results.length) * 100 : 0
      },
      results,
      coverage: options.coverage ? coverageCalculator.aggregateCoverage(results) : undefined,
      insights: this.generateInsights(results)
    };

    return report;
  }

  /**
   * Generate insights from test results
   */
  generateInsights(results: WorkflowTestResult[]): string[] {
    const insights: string[] = [];

    // Performance insights
    const avgDuration = results.length > 0
      ? results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length
      : 0;

    if (avgDuration > 5000) {
      insights.push(`Average test duration is ${avgDuration}ms - consider optimizing slow tests`);
    }

    // Failure patterns
    const failedAssertions = results
      .flatMap(r => r.assertions || [])
      .filter(a => !a.passed);

    if (failedAssertions.length > 0) {
      const commonFailures = this.findCommonFailures(failedAssertions);
      if (commonFailures.length > 0) {
        insights.push(`Common failure pattern detected: ${commonFailures[0]}`);
      }
    }

    // Coverage insights
    const coverageResults = results.filter(r => r.coverage);
    if (coverageResults.length > 0) {
      const avgCoverage = coverageResults.reduce(
        (sum, r) => sum + (r.coverage?.overall || 0),
        0
      ) / coverageResults.length;

      if (avgCoverage < 80) {
        insights.push(`Test coverage is ${avgCoverage.toFixed(1)}% - aim for at least 80%`);
      }
    }

    return insights;
  }

  /**
   * Find common failure patterns
   */
  private findCommonFailures(assertions: TestAssertion[]): string[] {
    const failureTypes = new Map<string, number>();

    assertions.forEach(a => {
      if (!a.passed) {
        const key = a.error || a.description || 'Unknown';
        failureTypes.set(key, (failureTypes.get(key) || 0) + 1);
      }
    });

    return Array.from(failureTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);
  }

  /**
   * Export test results in various formats
   */
  exportResults(results: WorkflowTestResult[], format: ExportFormat = 'json'): string {
    switch (format) {
      case 'junit':
        return this.exportAsJUnit(results);
      case 'html':
        return this.exportAsHTML(results);
      default:
        return JSON.stringify(results, null, 2);
    }
  }

  /**
   * Export as JUnit XML format
   */
  private exportAsJUnit(results: WorkflowTestResult[]): string {
    const xml = `<testsuites tests="${results.length}" failures="${results.filter(r => r.status === 'failed').length}" errors="${results.filter(r => r.status === 'error').length}">
  ${results.map(r => `
  <testsuite name="${r.workflowId}" tests="${r.assertions.length}" failures="${r.assertions.filter(a => !a.passed).length}">
    ${r.assertions.map(a => `
    <testcase name="${a.description}" time="${r.duration / 1000}">
      ${!a.passed ? `<failure message="${a.error || 'Assertion failed'}">${a.expected} != ${a.actual}</failure>` : ''}
    </testcase>`).join('')}
  </testsuite>`).join('')}
</testsuites>`;

    return xml;
  }

  /**
   * Export as HTML report
   */
  private exportAsHTML(results: WorkflowTestResult[]): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Workflow Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .passed { color: green; }
    .failed { color: red; }
    .error { color: orange; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>Workflow Test Report</h1>
  <table>
    <thead>
      <tr>
        <th>Test Case</th>
        <th>Workflow</th>
        <th>Status</th>
        <th>Duration</th>
        <th>Assertions</th>
      </tr>
    </thead>
    <tbody>
      ${results.map(r => `
      <tr>
        <td>${r.testCaseId}</td>
        <td>${r.workflowId}</td>
        <td class="${r.status}">${r.status.toUpperCase()}</td>
        <td>${r.duration}ms</td>
        <td>${r.metrics.assertionsPassed}/${r.assertions.length}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</body>
</html>`;
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    return `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const testReporter = new TestReporter();
