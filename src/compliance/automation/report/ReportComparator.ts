/**
 * ReportComparator - Handles report comparison and historical analysis
 */

import { EventEmitter } from 'events';
import { ComplianceFramework } from '../../../types/compliance';
import type {
  GeneratedReport,
  ReportComparison,
  ComparisonDifference,
  ComparisonSummary,
  HistoricalTrendData,
  HistoricalPeriod,
  ReportPeriod,
} from './types';
import { DataCollector } from './DataCollector';

/**
 * ReportComparator handles report comparison operations
 */
export class ReportComparator extends EventEmitter {
  private generatedReports: Map<string, GeneratedReport>;
  private historicalData: Map<string, HistoricalTrendData> = new Map();
  private dataCollector: DataCollector;

  constructor(generatedReports: Map<string, GeneratedReport>) {
    super();
    this.generatedReports = generatedReports;
    this.dataCollector = new DataCollector();
  }

  /**
   * Compare two reports
   */
  async compareReports(
    baseReportId: string,
    compareReportId: string
  ): Promise<ReportComparison> {
    const baseReport = this.generatedReports.get(baseReportId);
    const compareReport = this.generatedReports.get(compareReportId);

    if (!baseReport || !compareReport) {
      throw new Error('One or both reports not found');
    }

    const differences = this.calculateReportDifferences(baseReport, compareReport);
    const summary = this.generateComparisonSummary(differences);
    const insights = this.generateComparisonInsights(differences, baseReport, compareReport);

    const comparison: ReportComparison = {
      id: this.generateId('comparison'),
      baseReportId,
      compareReportId,
      generatedAt: new Date(),
      differences,
      summary,
      insights,
    };

    this.emit('comparison:generated', { comparison });
    return comparison;
  }

  /**
   * Get historical trends for frameworks
   */
  async getHistoricalTrends(
    frameworks: ComplianceFramework[],
    periodCount: number = 12,
    periodType: 'month' | 'quarter' | 'year' = 'month'
  ): Promise<HistoricalTrendData[]> {
    const trends: HistoricalTrendData[] = [];

    for (const framework of frameworks) {
      const periods = this.dataCollector.generateHistoricalPeriods(periodCount, periodType);

      const historicalPeriods: HistoricalPeriod[] = periods.map(period => ({
        startDate: period.startDate,
        endDate: period.endDate,
        complianceScore: this.dataCollector.getHistoricalScore(framework, period),
        controlsAssessed: this.dataCollector.getHistoricalControlCount(framework, period),
        gapsIdentified: this.dataCollector.getHistoricalGapCount(framework, period, 'identified'),
        gapsResolved: this.dataCollector.getHistoricalGapCount(framework, period, 'resolved'),
        evidenceCollected: this.dataCollector.getHistoricalEvidenceCount(framework, period),
      }));

      const aggregations = this.dataCollector.calculateTrendAggregations(historicalPeriods);
      const predictions = this.dataCollector.generateTrendPredictions(historicalPeriods);

      trends.push({
        framework,
        periods: historicalPeriods,
        aggregations,
        predictions,
      });
    }

    return trends;
  }

  /**
   * Calculate differences between reports
   */
  private calculateReportDifferences(
    baseReport: GeneratedReport,
    compareReport: GeneratedReport
  ): ComparisonDifference[] {
    const differences: ComparisonDifference[] = [];

    // Compare executive summaries if available
    if (baseReport.content.executiveSummary && compareReport.content.executiveSummary) {
      const baseSummary = baseReport.content.executiveSummary;
      const compareSummary = compareReport.content.executiveSummary;

      const scoreDiff = compareSummary.overallScore - baseSummary.overallScore;
      differences.push({
        field: 'overallScore',
        category: 'Executive Summary',
        baseValue: baseSummary.overallScore,
        compareValue: compareSummary.overallScore,
        change: scoreDiff,
        changeType: scoreDiff > 0 ? 'improved' : scoreDiff < 0 ? 'declined' : 'unchanged',
        significance: Math.abs(scoreDiff) > 10 ? 'high' : Math.abs(scoreDiff) > 5 ? 'medium' : 'low',
      });

      const issuesDiff = compareSummary.criticalIssues - baseSummary.criticalIssues;
      differences.push({
        field: 'criticalIssues',
        category: 'Executive Summary',
        baseValue: baseSummary.criticalIssues,
        compareValue: compareSummary.criticalIssues,
        change: issuesDiff,
        changeType: issuesDiff < 0 ? 'improved' : issuesDiff > 0 ? 'declined' : 'unchanged',
        significance: Math.abs(issuesDiff) > 5 ? 'high' : Math.abs(issuesDiff) > 2 ? 'medium' : 'low',
      });
    }

    return differences;
  }

  /**
   * Generate comparison summary
   */
  private generateComparisonSummary(differences: ComparisonDifference[]): ComparisonSummary {
    const improvements = differences.filter(d => d.changeType === 'improved').length;
    const declines = differences.filter(d => d.changeType === 'declined').length;

    return {
      totalChanges: differences.length,
      improvements,
      declines,
      overallTrend: improvements > declines ? 'improving' : improvements < declines ? 'declining' : 'stable',
      keyChanges: differences
        .filter(d => d.significance === 'high')
        .map(d => `${d.field}: ${d.changeType} by ${Math.abs(d.change).toFixed(1)}`),
    };
  }

  /**
   * Generate comparison insights
   */
  private generateComparisonInsights(
    differences: ComparisonDifference[],
    baseReport: GeneratedReport,
    compareReport: GeneratedReport
  ): string[] {
    const insights: string[] = [];

    const scoreDiff = differences.find(d => d.field === 'overallScore');
    if (scoreDiff && scoreDiff.changeType === 'improved') {
      insights.push(`Compliance score improved by ${Math.abs(scoreDiff.change).toFixed(1)}%`);
    } else if (scoreDiff && scoreDiff.changeType === 'declined') {
      insights.push(`Warning: Compliance score declined by ${Math.abs(scoreDiff.change).toFixed(1)}%`);
    }

    const issuesDiff = differences.find(d => d.field === 'criticalIssues');
    if (issuesDiff && issuesDiff.changeType === 'improved') {
      insights.push(`Critical issues reduced by ${Math.abs(issuesDiff.change)}`);
    }

    return insights;
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
