/**
 * Anti-Pattern Detector
 * Detects anti-patterns in workflows and suggests fixes
 */

import type { WorkflowNode, WorkflowEdge } from '../types/workflow';
import type {
  AntiPatternDefinition,
  AntiPatternDetectionResult,
  AntiPatternFix,
} from '../types/patterns';
import { ANTI_PATTERN_CATALOG } from './AntiPatternCatalog';

/**
 * Anti-Pattern Detector
 */
export class AntiPatternDetector {
  /**
   * Detect all anti-patterns in workflow
   */
  static detect(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    threshold = 0.5
  ): AntiPatternDetectionResult[] {
    const results: AntiPatternDetectionResult[] = [];

    for (const antiPattern of ANTI_PATTERN_CATALOG) {
      const detection = this.detectAntiPattern(nodes, edges, antiPattern);

      if (detection.confidence >= threshold) {
        results.push(detection);
      }
    }

    // Sort by severity and confidence
    results.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff =
        severityOrder[a.antiPattern.severity] - severityOrder[b.antiPattern.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.confidence - a.confidence;
    });

    return results;
  }

  /**
   * Detect specific anti-pattern
   */
  static detectAntiPattern(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    antiPattern: AntiPatternDefinition
  ): AntiPatternDetectionResult {
    const affectedNodes: string[] = [];
    const affectedEdges: string[] = [];
    const evidence: string[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    // Run all detection rules
    for (const rule of antiPattern.detection.rules) {
      const result = rule.check(nodes, edges);

      if (result.matches) {
        totalScore += result.score * rule.weight;
        totalWeight += rule.weight;
        evidence.push(...result.evidence);
        affectedNodes.push(...result.affectedNodes);
      }
    }

    // Calculate confidence
    const confidence =
      totalWeight > 0 ? Math.min(1, totalScore / totalWeight) : 0;

    // Generate fixes
    const fixes = this.generateFixes(antiPattern, affectedNodes);

    return {
      antiPattern,
      confidence,
      affectedNodes: [...new Set(affectedNodes)], // Remove duplicates
      affectedEdges: [...new Set(affectedEdges)],
      evidence,
      fixes,
      timestamp: new Date(),
    };
  }

  /**
   * Generate fixes for anti-pattern
   */
  private static generateFixes(
    antiPattern: AntiPatternDefinition,
    affectedNodes: string[]
  ): AntiPatternFix[] {
    const fixes: AntiPatternFix[] = [];

    // Generate fixes based on refactoring steps
    for (let i = 0; i < antiPattern.refactoring.length; i++) {
      const refactoringStep = antiPattern.refactoring[i];

      fixes.push({
        description: refactoringStep,
        difficulty: this.assessDifficulty(antiPattern, i),
        steps: this.generateSteps(refactoringStep, affectedNodes),
        automatable: this.isAutomatable(refactoringStep),
        suggestedPattern: antiPattern.relatedPatterns[i] || antiPattern.relatedPatterns[0],
      });
    }

    return fixes;
  }

  /**
   * Assess fix difficulty
   */
  private static assessDifficulty(
    antiPattern: AntiPatternDefinition,
    stepIndex: number
  ): 'easy' | 'medium' | 'hard' {
    // Base difficulty on severity and step index
    if (antiPattern.severity === 'critical') {
      return stepIndex === 0 ? 'medium' : 'hard';
    } else if (antiPattern.severity === 'high') {
      return stepIndex === 0 ? 'easy' : 'medium';
    } else {
      return 'easy';
    }
  }

  /**
   * Generate concrete steps for fix
   */
  private static generateSteps(
    refactoringStep: string,
    affectedNodes: string[]
  ): string[] {
    const steps: string[] = [];

    // Generic steps based on refactoring description
    if (refactoringStep.includes('add')) {
      steps.push('Identify location to add new nodes');
      steps.push('Configure new nodes according to requirements');
      steps.push('Connect nodes to workflow');
      steps.push('Test the changes');
    } else if (refactoringStep.includes('remove')) {
      steps.push('Backup current workflow');
      steps.push('Identify nodes to remove');
      steps.push('Remove connections');
      steps.push('Remove nodes');
      steps.push('Verify workflow still functions');
    } else if (refactoringStep.includes('implement')) {
      steps.push('Review pattern documentation');
      steps.push('Plan implementation approach');
      steps.push('Make incremental changes');
      steps.push('Test each change');
    } else {
      steps.push('Review the refactoring suggestion');
      steps.push('Plan your changes');
      steps.push('Implement incrementally');
      steps.push('Test thoroughly');
    }

    if (affectedNodes.length > 0) {
      steps.push(`Focus on ${affectedNodes.length} affected node(s)`);
    }

    return steps;
  }

  /**
   * Check if fix can be automated
   */
  private static isAutomatable(refactoringStep: string): boolean {
    const automatableKeywords = ['add validation', 'add timeout', 'add retry'];
    return automatableKeywords.some((keyword) =>
      refactoringStep.toLowerCase().includes(keyword)
    );
  }

  /**
   * Get anti-patterns by severity
   */
  static detectBySeverity(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): AntiPatternDetectionResult[] {
    const antiPatterns = ANTI_PATTERN_CATALOG.filter(
      (ap) => ap.severity === severity
    );

    const results: AntiPatternDetectionResult[] = [];

    for (const antiPattern of antiPatterns) {
      const detection = this.detectAntiPattern(nodes, edges, antiPattern);
      if (detection.confidence >= 0.5) {
        results.push(detection);
      }
    }

    return results;
  }

  /**
   * Get critical issues only
   */
  static detectCritical(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): AntiPatternDetectionResult[] {
    return this.detectBySeverity(nodes, edges, 'critical');
  }

  /**
   * Get workflow health score (0-100)
   */
  static calculateHealthScore(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    issues: AntiPatternDetectionResult[];
  } {
    const detections = this.detect(nodes, edges, 0.3);

    // Calculate penalty for each detection
    let penalty = 0;

    for (const detection of detections) {
      const severityPenalty = {
        critical: 25,
        high: 15,
        medium: 8,
        low: 3,
      };

      penalty +=
        severityPenalty[detection.antiPattern.severity] * detection.confidence;
    }

    const score = Math.max(0, 100 - penalty);

    // Assign grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    return { score, grade, issues: detections };
  }

  /**
   * Generate comprehensive report
   */
  static generateReport(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): {
    health: ReturnType<typeof AntiPatternDetector.calculateHealthScore>;
    critical: AntiPatternDetectionResult[];
    high: AntiPatternDetectionResult[];
    medium: AntiPatternDetectionResult[];
    low: AntiPatternDetectionResult[];
    summary: string;
    recommendations: string[];
  } {
    const health = this.calculateHealthScore(nodes, edges);
    const all = this.detect(nodes, edges, 0.3);

    const critical = all.filter((d) => d.antiPattern.severity === 'critical');
    const high = all.filter((d) => d.antiPattern.severity === 'high');
    const medium = all.filter((d) => d.antiPattern.severity === 'medium');
    const low = all.filter((d) => d.antiPattern.severity === 'low');

    // Generate summary
    let summary = `Workflow Health: ${health.score.toFixed(0)}/100 (Grade: ${health.grade})\n`;
    summary += `Total Issues: ${all.length}\n`;
    summary += `- Critical: ${critical.length}\n`;
    summary += `- High: ${high.length}\n`;
    summary += `- Medium: ${medium.length}\n`;
    summary += `- Low: ${low.length}`;

    // Generate recommendations
    const recommendations: string[] = [];

    if (critical.length > 0) {
      recommendations.push(
        `URGENT: Address ${critical.length} critical issue(s) immediately`
      );
      recommendations.push(
        ...critical.map((d) => `- ${d.antiPattern.name}: ${d.evidence[0]}`)
      );
    }

    if (high.length > 0) {
      recommendations.push(
        `HIGH PRIORITY: Fix ${high.length} high-severity issue(s)`
      );
    }

    if (health.score < 70) {
      recommendations.push(
        'Workflow needs significant improvement. Consider redesign.'
      );
    } else if (health.score < 85) {
      recommendations.push('Workflow is functional but has room for improvement.');
    } else {
      recommendations.push('Workflow is in good health. Maintain best practices.');
    }

    return {
      health,
      critical,
      high,
      medium,
      low,
      summary,
      recommendations,
    };
  }
}

/**
 * Quick detection function
 */
export function detectAntiPatterns(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  threshold = 0.5
): AntiPatternDetectionResult[] {
  return AntiPatternDetector.detect(nodes, edges, threshold);
}

/**
 * Quick health check function
 */
export function checkWorkflowHealth(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): ReturnType<typeof AntiPatternDetector.calculateHealthScore> {
  return AntiPatternDetector.calculateHealthScore(nodes, edges);
}
