/**
 * Fact Checker
 * Verify facts against external sources and ground truth
 */

import type { FactCheckResult } from '../types/llmops';
import { logger } from '../../services/SimpleLogger';

export interface Source {
  url: string;
  title: string;
  content: string;
  reliability: 'high' | 'medium' | 'low';
}

export class FactChecker {
  /**
   * Check facts in response against sources
   */
  async factCheck(response: string, sources: Source[]): Promise<FactCheckResult> {
    logger.debug(`[FactChecker] Checking ${sources.length} sources...`);

    // Extract claims
    const claims = this.extractClaims(response);

    const results: FactCheckResult['claims'] = [];

    for (const claim of claims) {
      const claimResult = await this.verifyClaim(claim, sources);
      results.push(claimResult);
    }

    // Calculate overall verification
    const verifiedCount = results.filter((r) => r.verified).length;
    const verified = verifiedCount / results.length > 0.7; // 70% threshold

    // Calculate confidence
    const avgConfidence =
      results.reduce((sum, r) => {
        const sourceConfidence = r.sources.reduce(
          (s, src) => s + src.relevance,
          0
        ) / r.sources.length;
        return sum + sourceConfidence;
      }, 0) / results.length;

    // Determine reliability
    let reliability: 'high' | 'medium' | 'low' = 'low';
    if (avgConfidence > 0.8) reliability = 'high';
    else if (avgConfidence > 0.5) reliability = 'medium';

    // Assessment
    let assessment = '';
    if (verified && reliability === 'high') {
      assessment = 'All major claims are well-supported by reliable sources.';
    } else if (verified) {
      assessment = 'Claims are generally supported but source reliability varies.';
    } else {
      assessment = 'Several claims lack sufficient source support.';
    }

    logger.debug(`[FactChecker] Complete: ${reliability} reliability`);

    return {
      verified,
      confidence: avgConfidence,
      claims: results,
      assessment,
      reliability,
    };
  }

  /**
   * Verify single claim
   */
  private async verifyClaim(
    claim: string,
    sources: Source[]
  ): Promise<FactCheckResult['claims'][0]> {
    const claimSources: FactCheckResult['claims'][0]['sources'] = [];

    for (const source of sources) {
      const relevance = this.calculateRelevance(claim, source.content);

      if (relevance > 0.3) {
        // Only include relevant sources
        const supports = this.checkSupport(claim, source.content);

        claimSources.push({
          url: source.url,
          title: source.title,
          relevance,
          supports,
        });
      }
    }

    // Sort by relevance
    claimSources.sort((a, b) => b.relevance - a.relevance);

    // Verified if majority of sources support it
    const supportCount = claimSources.filter((s) => s.supports).length;
    const verified = supportCount > claimSources.length / 2;

    return {
      claim,
      verified,
      sources: claimSources,
    };
  }

  /**
   * Extract claims from text
   */
  private extractClaims(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
  }

  /**
   * Calculate relevance of source to claim
   */
  private calculateRelevance(claim: string, content: string): number {
    const claimWords = new Set(
      claim
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );
    const contentWords = new Set(
      content
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );

    const overlap = new Set([...claimWords].filter((w) => contentWords.has(w)));

    return overlap.size / claimWords.size;
  }

  /**
   * Check if source supports claim
   */
  private checkSupport(claim: string, content: string): boolean {
    // Simple keyword matching (in production, use NLI model)
    const claimLower = claim.toLowerCase();
    const contentLower = content.toLowerCase();

    // Extract key entities
    const claimEntities = this.extractEntities(claim);

    let supportScore = 0;

    for (const entity of claimEntities) {
      if (contentLower.includes(entity.toLowerCase())) {
        supportScore += 1;
      }
    }

    return supportScore / claimEntities.length > 0.5;
  }

  /**
   * Extract entities (simple version)
   */
  private extractEntities(text: string): string[] {
    const entities: string[] = [];

    // Capitalized words (proper nouns)
    const words = text.split(/\s+/);
    for (const word of words) {
      if (word.length > 2 && word[0] === word[0].toUpperCase()) {
        entities.push(word);
      }
    }

    // Numbers
    const numbers = text.match(/\d+/g);
    if (numbers) {
      entities.push(...numbers);
    }

    return entities;
  }

  /**
   * Search web for sources (simulated)
   */
  async searchSources(query: string, maxResults: number = 5): Promise<Source[]> {
    // Simulate web search
    await this.sleep(200);

    const sources: Source[] = [];

    for (let i = 0; i < maxResults; i++) {
      sources.push({
        url: `https://example.com/source${i + 1}`,
        title: `Source ${i + 1} about ${query}`,
        content: `This is content about ${query}. ` + 'Lorem ipsum '.repeat(20),
        reliability: i < 2 ? 'high' : i < 4 ? 'medium' : 'low',
      });
    }

    return sources;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
