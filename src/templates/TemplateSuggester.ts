/**
 * Template Suggester
 * Intelligent template recommendations based on context, usage patterns, and user behavior
 */

import {
  TemplateSuggestion,
  SuggestionContext,
  SuggestionReason,
  SuggestionFactor,
  UserProfile,
  ActivityData,
  TeamUsageData,
  GeneratedTemplate,
  TemplateSuggesterService
} from '../types/aiTemplate';
import { WorkflowTemplate, TemplateCategory } from '../types/templates';
import { logger } from '../services/SimpleLogger';

export class TemplateSuggester implements TemplateSuggesterService {
  private userProfiles: Map<string, UserProfile> = new Map();
  private teamData: Map<string, TeamUsageData> = new Map();
  private templateUsage: Map<string, number> = new Map();
  private userTemplateHistory: Map<string, Set<string>> = new Map();

  // Category similarity matrix (how related categories are)
  private readonly categorySimilarity: Partial<Record<TemplateCategory, TemplateCategory[]>> = {
    'business_automation': ['productivity', 'integration', 'data_processing'],
    'marketing': ['social_media', 'analytics', 'notifications'],
    'sales': ['business_automation', 'analytics', 'customer_support'],
    'customer_support': ['notifications', 'sales', 'productivity'],
    'data_processing': ['analytics', 'integration', 'business_automation'],
    'notifications': ['customer_support', 'monitoring', 'marketing'],
    'social_media': ['marketing', 'notifications', 'analytics'],
    'ecommerce': ['finance', 'notifications', 'marketing'],
    'finance': ['business_automation', 'ecommerce', 'analytics'],
    'hr': ['business_automation', 'productivity', 'notifications'],
    'development': ['monitoring', 'integration', 'productivity'],
    'analytics': ['data_processing', 'marketing', 'business_automation'],
    'productivity': ['business_automation', 'hr', 'customer_support'],
    'integration': ['data_processing', 'business_automation', 'development'],
    'monitoring': ['development', 'notifications', 'analytics']
  };

  constructor() {
    logger.info('TemplateSuggester initialized');
  }

  /**
   * Get template suggestions based on context
   */
  async getSuggestions(
    context: SuggestionContext,
    limit: number = 5
  ): Promise<TemplateSuggestion[]> {
    logger.info('Generating template suggestions', {
      userId: context.userProfile.id,
      connectedIntegrations: context.connectedIntegrations.length,
      limit
    });

    const suggestions: TemplateSuggestion[] = [];

    // Get all available templates (would come from database in production)
    const allTemplates = this.getAllTemplates();

    // Score each template
    for (const template of allTemplates) {
      const score = await this.scoreTemplate(template, context);

      if (score.relevanceScore > 30) { // Minimum relevance threshold
        suggestions.push(score);
      }
    }

    // Sort by relevance score
    suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Ensure diversity in suggestions
    const diverseSuggestions = this.ensureDiversity(suggestions, limit);

    logger.info('Template suggestions generated', {
      totalSuggestions: suggestions.length,
      returnedSuggestions: diverseSuggestions.length
    });

    return diverseSuggestions;
  }

  /**
   * Record template usage for learning
   */
  async recordUsage(
    templateId: string,
    userId: string,
    success: boolean
  ): Promise<void> {
    // Update usage count
    const currentCount = this.templateUsage.get(templateId) || 0;
    this.templateUsage.set(templateId, currentCount + 1);

    // Update user history
    if (!this.userTemplateHistory.has(userId)) {
      this.userTemplateHistory.set(userId, new Set());
    }
    this.userTemplateHistory.get(userId)!.add(templateId);

    // Update user profile
    const profile = this.userProfiles.get(userId);
    if (profile) {
      // This would update ML model in production
      profile.usagePatterns.push({
        pattern: `template:${templateId}`,
        frequency: 1,
        lastUsed: new Date()
      });
      this.userProfiles.set(userId, profile);
    }

    logger.debug('Template usage recorded', {
      templateId,
      userId,
      success,
      totalUsageCount: this.templateUsage.get(templateId)
    });
  }

  /**
   * Update user profile based on activity
   */
  async updateUserProfile(
    userId: string,
    activity: ActivityData
  ): Promise<void> {
    let profile = this.userProfiles.get(userId);

    if (!profile) {
      profile = this.createDefaultProfile(userId);
    }

    // Update profile based on activity type
    switch (activity.type) {
      case 'integration_connected':
        const integration = activity.details.integration as string;
        if (!profile.preferredIntegrations.includes(integration)) {
          profile.preferredIntegrations.push(integration);
        }
        break;

      case 'template_used':
        const category = activity.category;
        if (category && !profile.workflowCategories.includes(category)) {
          profile.workflowCategories.push(category);
        }
        break;

      case 'workflow_created':
        // Update skill level based on complexity
        const complexity = activity.details.complexity as string;
        if (complexity === 'complex' && profile.skillLevel === 'beginner') {
          profile.skillLevel = 'intermediate';
        }
        break;
    }

    this.userProfiles.set(userId, profile);

    logger.debug('User profile updated', {
      userId,
      activityType: activity.type
    });
  }

  // ============================================================
  // PRIVATE SCORING METHODS
  // ============================================================

  /**
   * Score a template's relevance for the given context
   */
  private async scoreTemplate(
    template: GeneratedTemplate | WorkflowTemplate,
    context: SuggestionContext
  ): Promise<TemplateSuggestion> {
    const factors: SuggestionFactor[] = [];
    let totalScore = 0;

    // Factor 1: Connected Apps Match
    const connectedAppsScore = this.scoreConnectedApps(template, context);
    if (connectedAppsScore.weight > 0) {
      factors.push(connectedAppsScore);
      totalScore += connectedAppsScore.weight * connectedAppsScore.confidence * 100;
    }

    // Factor 2: User Behavior
    const behaviorScore = this.scoreUserBehavior(template, context);
    if (behaviorScore.weight > 0) {
      factors.push(behaviorScore);
      totalScore += behaviorScore.weight * behaviorScore.confidence * 100;
    }

    // Factor 3: Industry Match
    const industryScore = this.scoreIndustry(template, context);
    if (industryScore.weight > 0) {
      factors.push(industryScore);
      totalScore += industryScore.weight * industryScore.confidence * 100;
    }

    // Factor 4: Use Case Similarity
    const useCaseScore = this.scoreUseCase(template, context);
    if (useCaseScore.weight > 0) {
      factors.push(useCaseScore);
      totalScore += useCaseScore.weight * useCaseScore.confidence * 100;
    }

    // Factor 5: Team Preferences
    if (context.teamUsage) {
      const teamScore = this.scoreTeamPreferences(template, context.teamUsage);
      if (teamScore.weight > 0) {
        factors.push(teamScore);
        totalScore += teamScore.weight * teamScore.confidence * 100;
      }
    }

    // Factor 6: Similar Users
    const similarUsersScore = this.scoreSimilarUsers(template, context);
    if (similarUsersScore.weight > 0) {
      factors.push(similarUsersScore);
      totalScore += similarUsersScore.weight * similarUsersScore.confidence * 100;
    }

    // Build suggestion reason
    const reason: SuggestionReason = {
      primary: this.generatePrimaryReason(factors),
      factors,
      matchedPatterns: this.extractMatchedPatterns(template, context)
    };

    // Calculate setup time
    const setupTime = this.estimateSetupTime(template, context);

    // Generate benefit description
    const expectedBenefit = this.generateBenefitDescription(template, factors);

    // Check how many similar templates the user has used
    const similarTemplatesUsed = this.countSimilarTemplatesUsed(
      template,
      context.userProfile.id
    );

    return {
      template,
      relevanceScore: Math.min(100, Math.round(totalScore)),
      reason,
      context,
      estimatedSetupTime: setupTime,
      expectedBenefit,
      similarTemplatesUsed
    };
  }

  /**
   * Score based on connected apps
   */
  private scoreConnectedApps(
    template: GeneratedTemplate | WorkflowTemplate,
    context: SuggestionContext
  ): SuggestionFactor {
    const templateIntegrations = this.extractIntegrations(template);
    const matchedIntegrations = templateIntegrations.filter(integration =>
      context.connectedIntegrations.some(connected =>
        connected.toLowerCase().includes(integration.toLowerCase()) ||
        integration.toLowerCase().includes(connected.toLowerCase())
      )
    );

    const matchRatio = templateIntegrations.length > 0 ?
      matchedIntegrations.length / templateIntegrations.length : 0;

    return {
      type: 'connected_apps',
      weight: 0.30, // 30% weight
      description: matchedIntegrations.length > 0 ?
        `Uses ${matchedIntegrations.length} of your connected apps: ${matchedIntegrations.join(', ')}` :
        'No connected apps match',
      confidence: matchRatio
    };
  }

  /**
   * Score based on user behavior and history
   */
  private scoreUserBehavior(
    template: GeneratedTemplate | WorkflowTemplate,
    context: SuggestionContext
  ): SuggestionFactor {
    const userProfile = context.userProfile;

    // Check category preferences
    const category = this.getTemplateCategory(template);
    const categoryMatch = userProfile.workflowCategories.includes(category);

    // Check if user has used similar templates
    const recentActivity = context.recentActivity.slice(0, 10);
    const similarActivityCount = recentActivity.filter(activity =>
      activity.category === category
    ).length;

    const confidence = categoryMatch ? 0.8 : (similarActivityCount / 10) * 0.6;

    return {
      type: 'user_behavior',
      weight: 0.25, // 25% weight
      description: categoryMatch ?
        `Matches your preferred category: ${category}` :
        `Based on your recent ${category} activity`,
      confidence
    };
  }

  /**
   * Score based on industry match
   */
  private scoreIndustry(
    template: GeneratedTemplate | WorkflowTemplate,
    context: SuggestionContext
  ): SuggestionFactor {
    if (!context.userProfile.industry) {
      return {
        type: 'industry',
        weight: 0,
        description: 'Industry not specified',
        confidence: 0
      };
    }

    const category = this.getTemplateCategory(template);

    // Industry-category mappings
    const industryMappings: Record<string, TemplateCategory[]> = {
      'ecommerce': ['ecommerce', 'marketing', 'customer_support'],
      'saas': ['customer_support', 'marketing', 'analytics'],
      'finance': ['finance', 'business_automation', 'analytics'],
      'healthcare': ['business_automation', 'customer_support', 'monitoring'],
      'education': ['productivity', 'notifications', 'analytics']
    };

    const relevantCategories = industryMappings[context.userProfile.industry.toLowerCase()] || [];
    const isRelevant = relevantCategories.includes(category);

    return {
      type: 'industry',
      weight: 0.15, // 15% weight
      description: isRelevant ?
        `Commonly used in ${context.userProfile.industry} industry` :
        'Not specific to your industry',
      confidence: isRelevant ? 0.85 : 0.2
    };
  }

  /**
   * Score based on use case similarity
   */
  private scoreUseCase(
    template: GeneratedTemplate | WorkflowTemplate,
    context: SuggestionContext
  ): SuggestionFactor {
    const category = this.getTemplateCategory(template);

    // Check if category is related to user's preferred categories
    const relatedCategories = this.categorySimilarity[category] || [];
    const hasRelatedCategory = context.userProfile.workflowCategories.some(userCat =>
      relatedCategories.includes(userCat)
    );

    const confidence = hasRelatedCategory ? 0.7 : 0.3;

    return {
      type: 'use_case',
      weight: 0.15, // 15% weight
      description: hasRelatedCategory ?
        `Related to your ${category} workflows` :
        `Explore new ${category} automation`,
      confidence
    };
  }

  /**
   * Score based on team preferences
   */
  private scoreTeamPreferences(
    template: GeneratedTemplate | WorkflowTemplate,
    teamData: TeamUsageData
  ): SuggestionFactor {
    const templateId = 'id' in template ? template.id : template.name;
    const isPopular = teamData.popularTemplates.includes(templateId);

    const category = this.getTemplateCategory(template);
    const categoryPopular = teamData.preferredCategories.includes(category);

    const confidence = isPopular ? 0.9 : (categoryPopular ? 0.6 : 0.3);

    return {
      type: 'team_preference',
      weight: 0.10, // 10% weight
      description: isPopular ?
        'Popular with your team' :
        (categoryPopular ? 'Team uses similar templates' : 'Not commonly used by team'),
      confidence
    };
  }

  /**
   * Score based on similar users' choices
   */
  private scoreSimilarUsers(
    template: GeneratedTemplate | WorkflowTemplate,
    context: SuggestionContext
  ): SuggestionFactor {
    // In production, this would use collaborative filtering
    // For now, use template popularity as proxy
    const templateId = 'id' in template ? template.id : template.name;
    const usageCount = this.templateUsage.get(templateId) || 0;

    // Normalize usage count (assume max 1000 uses)
    const confidence = Math.min(usageCount / 1000, 1);

    return {
      type: 'similar_users',
      weight: 0.05, // 5% weight
      description: usageCount > 100 ?
        `Used by ${usageCount} similar users` :
        'New template',
      confidence
    };
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Get template category (works for both GeneratedTemplate and WorkflowTemplate)
   */
  private getTemplateCategory(template: GeneratedTemplate | WorkflowTemplate): TemplateCategory {
    return template.category;
  }

  /**
   * Extract integrations from template
   */
  private extractIntegrations(template: GeneratedTemplate | WorkflowTemplate): string[] {
    const integrations: string[] = [];

    if ('nodes' in template) {
      template.nodes.forEach(node => {
        const nodeType = node.type;
        if (nodeType && nodeType !== 'transform' && nodeType !== 'filter') {
          integrations.push(nodeType);
        }
      });
    }

    return Array.from(new Set(integrations));
  }

  /**
   * Generate primary reason for suggestion
   */
  private generatePrimaryReason(factors: SuggestionFactor[]): string {
    // Find highest weighted factor
    const topFactor = factors.reduce((best, current) =>
      (current.weight * current.confidence) > (best.weight * best.confidence) ? current : best
    );

    return topFactor.description;
  }

  /**
   * Extract matched patterns
   */
  private extractMatchedPatterns(
    template: GeneratedTemplate | WorkflowTemplate,
    context: SuggestionContext
  ): string[] {
    const patterns: string[] = [];

    // Check for common patterns
    const templateIntegrations = this.extractIntegrations(template);

    if (templateIntegrations.some(i => ['slack', 'email', 'teams'].includes(i))) {
      patterns.push('notification');
    }

    if (templateIntegrations.some(i => ['postgres', 'mysql', 'mongodb'].includes(i))) {
      patterns.push('database-operation');
    }

    if (templateIntegrations.some(i => ['schedule'].includes(i))) {
      patterns.push('scheduled-automation');
    }

    return patterns;
  }

  /**
   * Estimate setup time in minutes
   */
  private estimateSetupTime(
    template: GeneratedTemplate | WorkflowTemplate,
    context: SuggestionContext
  ): number {
    let baseTime = 5; // 5 minutes base

    const templateIntegrations = this.extractIntegrations(template);

    // Add time for each integration that needs credentials
    const needsCredentials = templateIntegrations.filter(integration =>
      !context.connectedIntegrations.includes(integration)
    );

    baseTime += needsCredentials.length * 3; // 3 minutes per credential

    // Add time based on node count
    const nodeCount = 'nodes' in template ? template.nodes.length : 0;
    baseTime += Math.floor(nodeCount / 3); // 1 minute per 3 nodes

    // Adjust for skill level
    const skillMultiplier = {
      'beginner': 1.5,
      'intermediate': 1.0,
      'advanced': 0.7
    };
    baseTime *= skillMultiplier[context.userProfile.skillLevel];

    return Math.round(baseTime);
  }

  /**
   * Generate benefit description
   */
  private generateBenefitDescription(
    template: GeneratedTemplate | WorkflowTemplate,
    factors: SuggestionFactor[]
  ): string {
    const topFactors = factors
      .filter(f => f.confidence > 0.5)
      .sort((a, b) => (b.weight * b.confidence) - (a.weight * a.confidence))
      .slice(0, 2);

    if (topFactors.length === 0) {
      return 'Automate your workflows efficiently';
    }

    const benefits = topFactors.map(f => f.description).join('. ');
    return benefits;
  }

  /**
   * Count similar templates user has used
   */
  private countSimilarTemplatesUsed(
    template: GeneratedTemplate | WorkflowTemplate,
    userId: string
  ): number {
    const userHistory = this.userTemplateHistory.get(userId);
    if (!userHistory) return 0;

    const category = this.getTemplateCategory(template);

    // Count templates in same category
    let count = 0;
    for (const templateId of Array.from(userHistory)) {
      // In production, would look up template category from database
      count++;
    }

    return Math.min(count, userHistory.size);
  }

  /**
   * Ensure diversity in suggestions
   */
  private ensureDiversity(
    suggestions: TemplateSuggestion[],
    limit: number
  ): TemplateSuggestion[] {
    const diverse: TemplateSuggestion[] = [];
    const usedCategories = new Set<TemplateCategory>();

    // First pass: one from each category
    for (const suggestion of suggestions) {
      const category = this.getTemplateCategory(suggestion.template);

      if (!usedCategories.has(category) && diverse.length < limit) {
        diverse.push(suggestion);
        usedCategories.add(category);
      }
    }

    // Second pass: fill remaining slots with highest scored
    if (diverse.length < limit) {
      for (const suggestion of suggestions) {
        if (!diverse.includes(suggestion) && diverse.length < limit) {
          diverse.push(suggestion);
        }
      }
    }

    return diverse;
  }

  /**
   * Create default user profile
   */
  private createDefaultProfile(userId: string): UserProfile {
    return {
      id: userId,
      skillLevel: 'beginner',
      preferredIntegrations: [],
      workflowCategories: [],
      usagePatterns: []
    };
  }

  /**
   * Get all available templates (mock - would query database)
   */
  private getAllTemplates(): Array<GeneratedTemplate | WorkflowTemplate> {
    // In production, this would query the template database
    // For now, return empty array - templates would be injected
    return [];
  }

  /**
   * Get suggester statistics
   */
  getStats() {
    return {
      totalUsers: this.userProfiles.size,
      totalTeams: this.teamData.size,
      trackedTemplates: this.templateUsage.size,
      totalUsageRecords: Array.from(this.templateUsage.values()).reduce((a, b) => a + b, 0)
    };
  }
}

// Export singleton instance
export const templateSuggester = new TemplateSuggester();
