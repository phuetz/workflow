/**
 * Hallucination Detector
 * Multi-method hallucination detection with >95% accuracy target
 */

import { logger } from '../../services/SimpleLogger';
import type {
  HallucinationResult,
  ConfidenceScore,
  ConsistencyScore,
  Claim,
} from '../types/llmops';

export interface DetectionConfig {
  methods: ('factual-consistency' | 'self-consistency' | 'external-validation')[];
  threshold: number; // 0-1
  numSamplings?: number; // For self-consistency
  groundTruth?: string;
  sources?: string[];
}

export class HallucinationDetector {
  private readonly accuracyTarget = 0.95;
  private readonly falsePositiveThreshold = 0.05;

  /**
   * Detect hallucinations in LLM response
   */
  async detect(
    prompt: string,
    response: string,
    config: DetectionConfig
  ): Promise<HallucinationResult> {
    logger.debug('[HallucinationDetector] Analyzing response...');

    const result: HallucinationResult = {
      isHallucinated: false,
      confidence: 0,
      detectionMethods: {},
      claims: [],
      recommendations: [],
    };

    let totalScore = 0;
    let methodCount = 0;

    // Factual consistency check
    if (config.methods.includes('factual-consistency') && config.groundTruth) {
      const consistency = await this.checkFactualConsistency(
        response,
        config.groundTruth
      );
      result.detectionMethods.factualConsistency = consistency;
      totalScore += consistency.score;
      methodCount++;
    }

    // Self-consistency check
    if (config.methods.includes('self-consistency')) {
      const consistency = await this.checkSelfConsistency(
        prompt,
        response,
        config.numSamplings || 3
      );
      result.detectionMethods.selfConsistency = consistency;
      totalScore += consistency.score;
      methodCount++;
    }

    // External validation
    if (config.methods.includes('external-validation') && config.sources) {
      const validation = await this.checkExternalValidation(
        response,
        config.sources
      );
      result.detectionMethods.externalValidation = validation;
      totalScore += validation.score;
      methodCount++;
    }

    // Calculate overall confidence
    const avgScore = methodCount > 0 ? totalScore / methodCount : 0;
    result.confidence = avgScore;

    // Determine if hallucinated (inverse of score)
    result.isHallucinated = avgScore < config.threshold;

    // Extract and verify claims
    result.claims = await this.extractClaims(response);

    // Generate recommendations
    result.recommendations = this.generateRecommendations(result);

    logger.debug(
      `[HallucinationDetector] Analysis complete: ${result.isHallucinated ? 'HALLUCINATED' : 'VERIFIED'} (confidence: ${(result.confidence * 100).toFixed(1)}%)`
    );

    return result;
  }

  /**
   * Check factual consistency with ground truth
   */
  private async checkFactualConsistency(
    response: string,
    groundTruth: string
  ): Promise<{ score: number; issues: string[] }> {
    const issues: string[] = [];

    // Extract facts from response and ground truth
    const responseFacts = this.extractFacts(response);
    const truthFacts = this.extractFacts(groundTruth);

    let consistentFacts = 0;
    const totalFacts = responseFacts.length;

    for (const fact of responseFacts) {
      // Check if fact is supported by ground truth
      const isSupported = truthFacts.some((truthFact) =>
        this.areFactsConsistent(fact, truthFact)
      );

      if (isSupported) {
        consistentFacts++;
      } else {
        issues.push(`Unverified fact: ${fact}`);
      }
    }

    const score = totalFacts > 0 ? consistentFacts / totalFacts : 1;

    return { score, issues };
  }

  /**
   * Check self-consistency across multiple samplings
   */
  private async checkSelfConsistency(
    prompt: string,
    response: string,
    numSamplings: number
  ): Promise<{ score: number; inconsistencies: string[] }> {
    const inconsistencies: string[] = [];

    // Generate multiple responses (simulated)
    const responses = [response];
    for (let i = 1; i < numSamplings; i++) {
      const sampling = await this.sampleResponse(prompt);
      responses.push(sampling);
    }

    // Extract facts from all responses
    const allFacts = responses.map((r) => this.extractFacts(r));

    // Find common facts (consensus)
    const consensus = this.findConsensus(allFacts);

    // Check how well original response aligns with consensus
    const originalFacts = new Set(allFacts[0]);
    let consistentCount = 0;

    for (const fact of originalFacts) {
      if (consensus.has(fact)) {
        consistentCount++;
      } else {
        inconsistencies.push(`Inconsistent claim: ${fact}`);
      }
    }

    const score =
      originalFacts.size > 0 ? consistentCount / originalFacts.size : 1;

    return { score, inconsistencies };
  }

  /**
   * Check external validation against sources
   */
  private async checkExternalValidation(
    response: string,
    sources: string[]
  ): Promise<{ score: number; unverifiedClaims: string[] }> {
    const unverifiedClaims: string[] = [];

    // Extract claims from response
    const claims = this.extractFacts(response);

    let verifiedCount = 0;

    for (const claim of claims) {
      // Check if claim is supported by any source
      const isVerified = sources.some((source) =>
        this.isClaimInSource(claim, source)
      );

      if (isVerified) {
        verifiedCount++;
      } else {
        unverifiedClaims.push(claim);
      }
    }

    const score = claims.length > 0 ? verifiedCount / claims.length : 1;

    return { score, unverifiedClaims };
  }

  /**
   * Score confidence of response
   */
  async scoreConfidence(response: string): Promise<ConfidenceScore> {
    const score: ConfidenceScore = {
      overall: 0,
      factualAccuracy: 0,
      consistency: 0,
      coherence: 0,
      completeness: 0,
      flags: [],
    };

    // Factual accuracy (presence of specific facts, dates, numbers)
    score.factualAccuracy = this.scoreFactualAccuracy(response);

    // Consistency (internal logical consistency)
    score.consistency = this.scoreConsistency(response);

    // Coherence (grammatical and semantic coherence)
    score.coherence = this.scoreCoherence(response);

    // Completeness (addresses the prompt fully)
    score.completeness = this.scoreCompleteness(response);

    // Overall score (weighted average)
    score.overall =
      score.factualAccuracy * 0.4 +
      score.consistency * 0.3 +
      score.coherence * 0.2 +
      score.completeness * 0.1;

    // Add flags for issues
    if (score.factualAccuracy < 0.5) {
      score.flags.push({
        type: 'warning',
        message: 'Low factual accuracy detected',
      });
    }

    if (score.consistency < 0.5) {
      score.flags.push({
        type: 'error',
        message: 'Internal inconsistencies detected',
      });
    }

    if (response.length < 50) {
      score.flags.push({
        type: 'warning',
        message: 'Response may be too short',
      });
    }

    return score;
  }

  /**
   * Extract claims from text
   */
  private async extractClaims(text: string): Promise<Claim[]> {
    // Simple claim extraction (in production, use NLP)
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    return sentences.map((sentence) => ({
      text: sentence.trim(),
      verified: false,
      confidence: 0.5,
    }));
  }

  /**
   * Extract facts from text
   */
  private extractFacts(text: string): string[] {
    // Simplified fact extraction
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    // Filter sentences that look like facts (contain specific markers)
    return sentences
      .filter(
        (s) =>
          s.match(/\d{4}/) || // Contains year
          s.match(/\d+%/) || // Contains percentage
          s.match(/\$\d+/) || // Contains price
          s.match(/\b(is|are|was|were|has|have)\b/i) // Contains factual verbs
      )
      .map((s) => s.trim());
  }

  /**
   * Check if two facts are consistent
   */
  private areFactsConsistent(fact1: string, fact2: string): boolean {
    // Simple word overlap check
    const words1 = new Set(
      fact1
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );
    const words2 = new Set(
      fact2
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );

    const overlap = new Set([...words1].filter((w) => words2.has(w)));

    // If >50% word overlap, consider consistent
    return overlap.size / Math.min(words1.size, words2.size) > 0.5;
  }

  /**
   * Sample response from model (simulated)
   */
  private async sampleResponse(prompt: string): Promise<string> {
    // Simulate different response
    // In production, call actual model with different temperature
    await this.sleep(50);
    return `Alternative response to: ${prompt.substring(0, 30)}...`;
  }

  /**
   * Find consensus facts across multiple responses
   */
  private findConsensus(factSets: string[][]): Set<string> {
    const consensus = new Set<string>();
    const factCounts = new Map<string, number>();

    // Count occurrences of each fact
    for (const facts of factSets) {
      for (const fact of facts) {
        factCounts.set(fact, (factCounts.get(fact) || 0) + 1);
      }
    }

    // Facts appearing in majority of responses
    const threshold = Math.ceil(factSets.length / 2);

    for (const [fact, count] of factCounts.entries()) {
      if (count >= threshold) {
        consensus.add(fact);
      }
    }

    return consensus;
  }

  /**
   * Check if claim is in source
   */
  private isClaimInSource(claim: string, source: string): boolean {
    const claimWords = new Set(
      claim
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );
    const sourceWords = new Set(
      source
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );

    const overlap = new Set([...claimWords].filter((w) => sourceWords.has(w)));

    // If >70% of claim words appear in source
    return overlap.size / claimWords.size > 0.7;
  }

  /**
   * Score factual accuracy
   */
  private scoreFactualAccuracy(text: string): number {
    let score = 0.5;

    // Presence of specific facts increases score
    if (text.match(/\d{4}/)) score += 0.1; // Year
    if (text.match(/\d+%/)) score += 0.1; // Percentage
    if (text.match(/\$\d+/)) score += 0.1; // Price
    if (text.match(/\b\d+\b/)) score += 0.1; // Numbers

    // Presence of hedging words decreases score
    if (text.match(/\b(maybe|perhaps|possibly|probably)\b/i)) score -= 0.1;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Score consistency
   */
  private scoreConsistency(text: string): number {
    const sentences = text.split(/[.!?]+/);

    // Check for contradictions (simple heuristic)
    const hasNegation = text.match(/\b(not|never|no)\b/i);
    const hasAffirmation = text.match(/\b(yes|always|definitely)\b/i);

    if (hasNegation && hasAffirmation) {
      return 0.6; // Potential contradiction
    }

    return 0.9; // Default high consistency
  }

  /**
   * Score coherence
   */
  private scoreCoherence(text: string): number {
    let score = 0.7;

    // Length check
    if (text.length > 100) score += 0.1;

    // Sentence structure
    const sentences = text.split(/[.!?]+/);
    if (sentences.length > 2) score += 0.1;

    // Grammar indicators (simple)
    const hasProperCapitalization = text[0] === text[0].toUpperCase();
    if (hasProperCapitalization) score += 0.1;

    return Math.min(1, score);
  }

  /**
   * Score completeness
   */
  private scoreCompleteness(text: string): number {
    let score = 0.5;

    // Length-based heuristic
    if (text.length > 200) score = 0.8;
    else if (text.length > 100) score = 0.6;
    else if (text.length > 50) score = 0.4;
    else score = 0.2;

    return score;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(result: HallucinationResult): string[] {
    const recommendations: string[] = [];

    if (result.isHallucinated) {
      recommendations.push('⚠️ Response may contain hallucinations');
      recommendations.push('Verify facts against reliable sources');
    }

    if (result.confidence < 0.5) {
      recommendations.push('Low confidence - consider regenerating response');
    }

    if (result.detectionMethods.factualConsistency) {
      const { issues } = result.detectionMethods.factualConsistency;
      if (issues.length > 0) {
        recommendations.push(`${issues.length} factual inconsistencies detected`);
      }
    }

    if (result.detectionMethods.selfConsistency) {
      const { inconsistencies } = result.detectionMethods.selfConsistency;
      if (inconsistencies.length > 0) {
        recommendations.push('Response varies across samplings - may be unstable');
      }
    }

    if (result.detectionMethods.externalValidation) {
      const { unverifiedClaims } = result.detectionMethods.externalValidation;
      if (unverifiedClaims.length > 0) {
        recommendations.push(`${unverifiedClaims.length} claims lack external verification`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Response appears reliable');
    }

    return recommendations;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get detection accuracy (for testing)
   */
  getAccuracyTarget(): number {
    return this.accuracyTarget;
  }

  /**
   * Get false positive threshold
   */
  getFalsePositiveThreshold(): number {
    return this.falsePositiveThreshold;
  }
}
