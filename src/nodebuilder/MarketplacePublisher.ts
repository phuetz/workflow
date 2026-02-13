/**
 * Marketplace Publisher
 * One-click publish nodes to marketplace
 */

import {
  PublishConfig,
  PublishResult,
  ValidationResult,
  ValidationIssue,
  NodeBuilderConfig,
  GeneratedFile,
} from '../types/nodebuilder';
import { NodeGenerator } from './NodeGenerator';

export class MarketplacePublisher {
  private config: NodeBuilderConfig;
  private apiUrl: string;

  constructor(config: NodeBuilderConfig, apiUrl: string = '/api/marketplace') {
    this.config = config;
    this.apiUrl = apiUrl;
  }

  /**
   * Publish node to marketplace
   */
  async publish(publishConfig: PublishConfig): Promise<PublishResult> {
    try {
      // Step 1: Validate node configuration
      const validationResults = await this.validateNode();
      const hasErrors = validationResults.some(
        (result) => result.issues.some((issue) => issue.severity === 'error')
      );

      if (hasErrors) {
        return {
          success: false,
          errors: validationResults
            .flatMap((r) => r.issues)
            .filter((i) => i.severity === 'error')
            .map((i) => i.message),
          warnings: validationResults
            .flatMap((r) => r.issues)
            .filter((i) => i.severity === 'warning')
            .map((i) => i.message),
          validationResults,
        };
      }

      // Step 2: Generate node files
      const generator = new NodeGenerator(this.config);
      const generationResult = await generator.generate();

      if (!generationResult.success) {
        return {
          success: false,
          errors: generationResult.errors.map((e) => e.message),
          warnings: generationResult.warnings,
        };
      }

      // Step 3: Package node for marketplace
      const packageData = await this.packageNode(generationResult.files, publishConfig);

      // Step 4: Upload to marketplace
      const uploadResult = await this.uploadToMarketplace(packageData, publishConfig);

      return {
        success: true,
        publishedId: uploadResult.id,
        url: uploadResult.url,
        warnings: validationResults
          .flatMap((r) => r.issues)
          .filter((i) => i.severity === 'warning')
          .map((i) => i.message),
        validationResults,
      };
    } catch (error: any) {
      return {
        success: false,
        errors: [error.message],
      };
    }
  }

  /**
   * Validate node before publishing
   */
  private async validateNode(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Security validation
    results.push(await this.validateSecurity());

    // Quality validation
    results.push(await this.validateQuality());

    // Compatibility validation
    results.push(await this.validateCompatibility());

    // Documentation validation
    results.push(await this.validateDocumentation());

    return results;
  }

  /**
   * Security validation
   */
  private async validateSecurity(): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let score = 100;

    // Check for hardcoded credentials
    if (this.hasHardcodedCredentials()) {
      issues.push({
        severity: 'error',
        message: 'Hardcoded credentials detected',
        location: 'Authentication configuration',
        fix: 'Use credential fields instead of hardcoded values',
      });
      score -= 50;
    }

    // Check for unsafe operations
    if (this.hasUnsafeOperations()) {
      issues.push({
        severity: 'warning',
        message: 'Potentially unsafe operations detected',
        location: 'Operations',
        fix: 'Add input validation and sanitization',
      });
      score -= 20;
    }

    // Check for secure authentication
    if (!this.config.authentication || this.config.authentication.type === 'none') {
      issues.push({
        severity: 'warning',
        message: 'No authentication configured',
        location: 'Authentication',
        fix: 'Consider adding authentication for security',
      });
      score -= 10;
    }

    return {
      category: 'security',
      passed: issues.every((i) => i.severity !== 'error'),
      score: Math.max(score, 0),
      issues,
    };
  }

  /**
   * Quality validation
   */
  private async validateQuality(): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let score = 100;

    // Check description
    if (!this.config.description || this.config.description.length < 20) {
      issues.push({
        severity: 'warning',
        message: 'Description is too short',
        location: 'Basic information',
        fix: 'Add a detailed description (at least 20 characters)',
      });
      score -= 15;
    }

    // Check operations
    if (!this.config.operations || this.config.operations.length === 0) {
      issues.push({
        severity: 'error',
        message: 'No operations defined',
        location: 'Operations',
        fix: 'Add at least one operation',
      });
      score -= 50;
    }

    // Check parameter descriptions
    const paramsWithoutDescription = (this.config.parameters || []).filter(
      (p) => !p.description
    ).length;

    if (paramsWithoutDescription > 0) {
      issues.push({
        severity: 'warning',
        message: `${paramsWithoutDescription} parameters missing descriptions`,
        location: 'Parameters',
        fix: 'Add descriptions to all parameters',
      });
      score -= paramsWithoutDescription * 5;
    }

    // Check examples
    if (!this.config.examples || this.config.examples.length === 0) {
      issues.push({
        severity: 'info',
        message: 'No examples provided',
        location: 'Examples',
        fix: 'Add usage examples to help users',
      });
      score -= 10;
    }

    return {
      category: 'quality',
      passed: issues.every((i) => i.severity !== 'error'),
      score: Math.max(score, 0),
      issues,
    };
  }

  /**
   * Compatibility validation
   */
  private async validateCompatibility(): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let score = 100;

    // Check node name conflicts
    if (await this.hasNameConflict()) {
      issues.push({
        severity: 'error',
        message: 'Node name conflicts with existing node',
        location: 'Basic information',
        fix: 'Choose a unique node name',
      });
      score -= 50;
    }

    // Check version format
    if (!this.isValidVersion(this.config.version)) {
      issues.push({
        severity: 'error',
        message: 'Invalid version format',
        location: 'Version',
        fix: 'Use semantic versioning (e.g., 1.0.0)',
      });
      score -= 30;
    }

    return {
      category: 'compatibility',
      passed: issues.every((i) => i.severity !== 'error'),
      score: Math.max(score, 0),
      issues,
    };
  }

  /**
   * Documentation validation
   */
  private async validateDocumentation(): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let score = 100;

    // Check if documentation is included
    if (!this.config.generationSettings.includeDocumentation) {
      issues.push({
        severity: 'warning',
        message: 'Documentation generation is disabled',
        location: 'Generation settings',
        fix: 'Enable documentation generation',
      });
      score -= 20;
    }

    // Check operation descriptions
    const opsWithoutDescription = (this.config.operations || []).filter(
      (op) => !op.description || op.description.length < 10
    ).length;

    if (opsWithoutDescription > 0) {
      issues.push({
        severity: 'warning',
        message: `${opsWithoutDescription} operations have insufficient descriptions`,
        location: 'Operations',
        fix: 'Add detailed descriptions to all operations',
      });
      score -= opsWithoutDescription * 10;
    }

    return {
      category: 'documentation',
      passed: issues.every((i) => i.severity !== 'error'),
      score: Math.max(score, 0),
      issues,
    };
  }

  /**
   * Check for hardcoded credentials
   */
  private hasHardcodedCredentials(): boolean {
    if (!this.config.authentication) return false;

    // Check if any auth fields have default values that look like credentials
    return this.config.authentication.fields.some((field) => {
      const defaultValue = field.default?.toString() || '';
      return (
        defaultValue.length > 10 &&
        (field.type === 'password' || field.name.includes('key') || field.name.includes('secret'))
      );
    });
  }

  /**
   * Check for unsafe operations
   */
  private hasUnsafeOperations(): boolean {
    return (this.config.operations || []).some((op) => {
      // Check for DELETE operations without confirmation
      if (op.httpConfig.method === 'DELETE') {
        return !op.parameters.some((p) => p.name.includes('confirm'));
      }
      return false;
    });
  }

  /**
   * Check for name conflicts
   */
  private async hasNameConflict(): Promise<boolean> {
    // In a real implementation, this would check against the marketplace API
    // For now, return false
    return false;
  }

  /**
   * Validate semantic version format
   */
  private isValidVersion(version: string): boolean {
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
    return semverRegex.test(version);
  }

  /**
   * Package node files for marketplace
   */
  private async packageNode(
    files: GeneratedFile[],
    publishConfig: PublishConfig
  ): Promise<{
    config: NodeBuilderConfig;
    files: GeneratedFile[];
    publishConfig: PublishConfig;
    manifest: any;
  }> {
    const manifest = {
      name: this.config.name,
      displayName: this.config.displayName,
      version: publishConfig.version,
      description: this.config.description,
      author: this.config.author,
      category: publishConfig.category,
      tags: publishConfig.tags,
      license: publishConfig.license,
      repository: publishConfig.repository,
      changelog: publishConfig.changelog,
      pricing: publishConfig.pricing,
      visibility: publishConfig.visibility,
      createdAt: new Date().toISOString(),
    };

    return {
      config: this.config,
      files,
      publishConfig,
      manifest,
    };
  }

  /**
   * Upload to marketplace
   */
  private async uploadToMarketplace(
    packageData: any,
    publishConfig: PublishConfig
  ): Promise<{ id: string; url: string }> {
    // In a real implementation, this would upload to the marketplace API
    // For now, return mock data
    const nodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: nodeId,
      url: `${this.apiUrl}/nodes/${nodeId}`,
    };
  }

  /**
   * Get validation summary
   */
  async getValidationSummary(): Promise<{
    overallScore: number;
    readyToPublish: boolean;
    categories: Record<string, number>;
    totalIssues: number;
    criticalIssues: number;
  }> {
    const validationResults = await this.validateNode();

    const scores = validationResults.map((r) => r.score);
    const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    const allIssues = validationResults.flatMap((r) => r.issues);
    const criticalIssues = allIssues.filter((i) => i.severity === 'error').length;

    const categories = validationResults.reduce((acc, result) => {
      acc[result.category] = result.score;
      return acc;
    }, {} as Record<string, number>);

    return {
      overallScore: Math.round(overallScore),
      readyToPublish: criticalIssues === 0 && overallScore >= 70,
      categories,
      totalIssues: allIssues.length,
      criticalIssues,
    };
  }

  /**
   * Unpublish node from marketplace
   */
  async unpublish(nodeId: string): Promise<{ success: boolean; message?: string }> {
    try {
      // In a real implementation, this would call the marketplace API
      return {
        success: true,
        message: 'Node unpublished successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Update published node
   */
  async update(nodeId: string, publishConfig: PublishConfig): Promise<PublishResult> {
    // Similar to publish, but updates existing node
    return this.publish(publishConfig);
  }
}
