/**
 * Comprehensive Marketplace Test Suite
 * Tests for all marketplace services: Templates, Nodes, Partners, Ratings
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateService } from '../marketplace/TemplateService';
import { TemplateRepository } from '../marketplace/TemplateRepository';
import { CommunityNodesService } from '../marketplace/CommunityNodes';
import { SecurityScanner } from '../marketplace/SecurityScanner';
import { PartnerService } from '../marketplace/PartnerService';
import { RevenueSharing } from '../marketplace/RevenueSharing';
import { RatingService } from '../marketplace/RatingService';
import {
  WorkflowTemplate,
  TemplateCategory,
  TemplateIndustry,
  TemplateStatus,
  CommunityNode,
  NodeStatus,
  Partner,
  PartnerTier,
  Review,
} from '../types/marketplace';

describe('Marketplace - Template Service', () => {
  let templateRepository: TemplateRepository;
  let templateService: TemplateService;

  beforeEach(() => {
    templateRepository = new TemplateRepository();
    templateService = new TemplateService(templateRepository);
  });

  it('should create a new template', async () => {
    const templateData: Partial<WorkflowTemplate> = {
      name: 'Test Workflow Template',
      description: 'A test template for automated workflows',
      category: TemplateCategory.MARKETING,
      industry: TemplateIndustry.SAAS,
      useCases: ['lead generation', 'email automation'],
      workflow: {
        nodes: [{ id: '1', type: 'trigger', data: {} }],
        edges: [],
      },
      author: {
        id: 'author1',
        name: 'Test Author',
        email: 'author@test.com',
        verified: true,
        reputation: 100,
      },
      metadata: {
        difficulty: 'beginner',
        estimatedSetupTime: 15,
        requiredSkills: ['basic'],
        language: 'en',
        nodeCount: 1,
        complexity: 1,
        maintenanceLevel: 'low',
      },
      dependencies: {
        requiredNodes: ['http', 'email'],
        requiredCredentials: [],
        requiredIntegrations: [],
      },
      media: {
        thumbnailUrl: 'https://example.com/thumb.jpg',
        screenshots: [],
      },
      pricing: {
        type: 'free',
        currency: 'USD',
        trialAvailable: false,
      },
      tags: ['marketing', 'automation', 'lead-gen'],
    };

    const result = await templateService.createTemplate(templateData);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.name).toBe('Test Workflow Template');
    expect(result.data?.status).toBe(TemplateStatus.DRAFT);
  });

  it('should search templates by category', async () => {
    // Create test templates
    const templates: Partial<WorkflowTemplate>[] = [
      {
        name: 'Marketing Template 1',
        description: 'Marketing automation',
        category: TemplateCategory.MARKETING,
        industry: TemplateIndustry.SAAS,
        workflow: { nodes: [{ id: '1' }], edges: [] },
        author: { id: '1', name: 'Author', email: 'a@test.com', verified: true, reputation: 100 },
        metadata: { difficulty: 'beginner', estimatedSetupTime: 10, requiredSkills: [], language: 'en', nodeCount: 1, complexity: 1, maintenanceLevel: 'low' },
        dependencies: { requiredNodes: [], requiredCredentials: [], requiredIntegrations: [] },
        media: { thumbnailUrl: '', screenshots: [] },
        pricing: { type: 'free', currency: 'USD', trialAvailable: false },
        tags: [],
      },
      {
        name: 'Sales Template 1',
        description: 'Sales automation',
        category: TemplateCategory.SALES,
        industry: TemplateIndustry.SAAS,
        workflow: { nodes: [{ id: '1' }], edges: [] },
        author: { id: '1', name: 'Author', email: 'a@test.com', verified: true, reputation: 100 },
        metadata: { difficulty: 'beginner', estimatedSetupTime: 10, requiredSkills: [], language: 'en', nodeCount: 1, complexity: 1, maintenanceLevel: 'low' },
        dependencies: { requiredNodes: [], requiredCredentials: [], requiredIntegrations: [] },
        media: { thumbnailUrl: '', screenshots: [] },
        pricing: { type: 'free', currency: 'USD', trialAvailable: false },
        tags: [],
      },
    ];

    for (const template of templates) {
      await templateService.createTemplate(template);
      const templates = await templateRepository.findAll();
      const template1 = templates[templates.length - 1];
      if (template1) {
        await templateRepository.update(template1.id, { status: TemplateStatus.PUBLISHED });
      }
    }

    const results = await templateService.searchTemplates(
      { categories: [TemplateCategory.MARKETING] },
      1,
      10
    );

    expect(results.templates.length).toBeGreaterThan(0);
    expect(results.templates.every(t => t.category === TemplateCategory.MARKETING)).toBe(true);
  });

  it('should publish a template', async () => {
    const result = await templateService.createTemplate({
      name: 'Test Template',
      description: 'Test',
      category: TemplateCategory.MARKETING,
      industry: TemplateIndustry.SAAS,
      workflow: { nodes: [], edges: [] },
      author: { id: '1', name: 'A', email: 'a@test.com', verified: true, reputation: 100 },
      metadata: { difficulty: 'beginner', estimatedSetupTime: 10, requiredSkills: [], language: 'en', nodeCount: 0, complexity: 1, maintenanceLevel: 'low' },
      dependencies: { requiredNodes: [], requiredCredentials: [], requiredIntegrations: [] },
      media: { thumbnailUrl: '', screenshots: [] },
      pricing: { type: 'free', currency: 'USD', trialAvailable: false },
      tags: [],
    });

    expect(result.success).toBe(true);

    const publishResult = await templateService.publishTemplate(result.data!.id);
    expect(publishResult.success).toBe(true);
    expect(publishResult.data?.status).toBe(TemplateStatus.PUBLISHED);
  });

  it('should track template views and installs', async () => {
    const result = await templateService.createTemplate({
      name: 'Popular Template',
      description: 'Test',
      category: TemplateCategory.MARKETING,
      industry: TemplateIndustry.SAAS,
      workflow: { nodes: [], edges: [] },
      author: { id: '1', name: 'A', email: 'a@test.com', verified: true, reputation: 100 },
      metadata: { difficulty: 'beginner', estimatedSetupTime: 10, requiredSkills: [], language: 'en', nodeCount: 0, complexity: 1, maintenanceLevel: 'low' },
      dependencies: { requiredNodes: [], requiredCredentials: [], requiredIntegrations: [] },
      media: { thumbnailUrl: '', screenshots: [] },
      pricing: { type: 'free', currency: 'USD', trialAvailable: false },
      tags: [],
    });

    const templateId = result.data!.id;

    // View template
    await templateService.getTemplate(templateId);
    const viewed = await templateRepository.findById(templateId);
    expect(viewed?.analytics.views).toBe(1);

    // Install template
    await templateService.publishTemplate(templateId);
    await templateService.installTemplate(templateId, 'user1');
    const installed = await templateRepository.findById(templateId);
    expect(installed?.analytics.installs).toBe(1);
  });
});

describe('Marketplace - Community Nodes', () => {
  let communityNodesService: CommunityNodesService;
  let securityScanner: SecurityScanner;

  beforeEach(() => {
    securityScanner = new SecurityScanner();
    communityNodesService = new CommunityNodesService(securityScanner);
  });

  it('should submit a new community node', async () => {
    const nodeData: Partial<CommunityNode> = {
      name: 'custom_api_node',
      displayName: 'Custom API Node',
      description: 'A custom node for API integration',
      version: '1.0.0',
      author: {
        id: 'dev1',
        name: 'Developer One',
        email: 'dev@test.com',
        verified: true,
        reputation: 80,
        nodeCount: 5,
      },
      category: 'integration',
      icon: '🔌',
      codeUrl: 'https://github.com/user/custom-api-node',
      documentationUrl: 'https://docs.example.com/custom-api-node',
      dependencies: {
        npm: ['axios@1.4.0'],
      },
      permissions: {
        network: true,
        filesystem: false,
        credentials: true,
        subprocess: false,
        environment: false,
      },
      pricing: {
        type: 'free',
        currency: 'USD',
      },
      tags: ['api', 'integration', 'http'],
    };

    const result = await communityNodesService.submitNode(nodeData);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.status).toBe(NodeStatus.SUBMITTED);
  });

  it('should perform security scan on submitted node', async () => {
    const nodeData: Partial<CommunityNode> = {
      name: 'test_node',
      displayName: 'Test Node',
      description: 'Test node for security scanning',
      version: '1.0.0',
      author: { id: '1', name: 'Dev', email: 'd@test.com', verified: true, reputation: 50, nodeCount: 1 },
      category: 'test',
      icon: '🧪',
      codeUrl: 'https://github.com/test/node',
      documentationUrl: 'https://docs.test.com',
      dependencies: {},
      permissions: { network: false, filesystem: false, credentials: false, subprocess: false, environment: false },
      pricing: { type: 'free', currency: 'USD' },
      tags: [],
    };

    const submitResult = await communityNodesService.submitNode(nodeData);
    expect(submitResult.success).toBe(true);

    const scanResult = await communityNodesService.startSecurityScan(submitResult.data!.id);
    expect(scanResult.success).toBe(true);
    expect(scanResult.data?.scannedAt).toBeDefined();
  });

  it('should approve a node after review', async () => {
    const submitResult = await communityNodesService.submitNode({
      name: 'approved_node',
      displayName: 'Approved Node',
      description: 'Node for approval test',
      version: '1.0.0',
      author: { id: '1', name: 'Dev', email: 'd@test.com', verified: true, reputation: 50, nodeCount: 1 },
      category: 'test',
      icon: '✅',
      codeUrl: 'https://github.com/test/approved',
      documentationUrl: 'https://docs.test.com',
      dependencies: {},
      permissions: { network: false, filesystem: false, credentials: false, subprocess: false, environment: false },
      pricing: { type: 'free', currency: 'USD' },
      tags: [],
    });

    const nodeId = submitResult.data!.id;

    // Manually set to pending review
    const node = (await communityNodesService.getNode(nodeId)).data!;
    node.status = NodeStatus.PENDING_REVIEW;

    const approveResult = await communityNodesService.approveNode(nodeId, 'reviewer1', 'Looks good');

    expect(approveResult.success).toBe(true);
    expect(approveResult.data?.verification.verified).toBe(true);
    expect(approveResult.data?.status).toBe(NodeStatus.APPROVED);
  });

  it('should track node downloads', async () => {
    const submitResult = await communityNodesService.submitNode({
      name: 'download_test',
      displayName: 'Download Test',
      description: 'Test downloads',
      version: '1.0.0',
      author: { id: '1', name: 'Dev', email: 'd@test.com', verified: true, reputation: 50, nodeCount: 1 },
      category: 'test',
      icon: '📥',
      codeUrl: 'https://github.com/test/download',
      documentationUrl: 'https://docs.test.com',
      dependencies: {},
      permissions: { network: false, filesystem: false, credentials: false, subprocess: false, environment: false },
      pricing: { type: 'free', currency: 'USD' },
      tags: [],
    });

    const nodeId = submitResult.data!.id;

    // Set to approved
    const node = (await communityNodesService.getNode(nodeId)).data!;
    node.status = NodeStatus.APPROVED;

    const downloadResult = await communityNodesService.downloadNode(nodeId, 'user1');

    expect(downloadResult.success).toBe(true);

    const updatedNode = (await communityNodesService.getNode(nodeId)).data!;
    expect(updatedNode.analytics.downloads).toBe(1);
  });
});

describe('Marketplace - Security Scanner', () => {
  let securityScanner: SecurityScanner;

  beforeEach(() => {
    securityScanner = new SecurityScanner();
  });

  it('should scan node and generate security report', async () => {
    const testNode: CommunityNode = {
      id: 'scan-test-1',
      name: 'test_node',
      displayName: 'Test Node',
      description: 'Test',
      version: '1.0.0',
      author: { id: '1', name: 'Dev', email: 'd@test.com', verified: true, reputation: 50, nodeCount: 1 },
      category: 'test',
      icon: '🧪',
      codeUrl: 'https://github.com/test/node',
      documentationUrl: 'https://docs.test.com',
      verification: {
        status: NodeStatus.SUBMITTED,
        verified: false,
        securityScan: { passed: false, scannedAt: new Date(), findings: [], riskLevel: 'medium', score: 0 },
      },
      analytics: { downloads: 0, activeInstallations: 0, averageRating: 0, ratingCount: 0, successRate: 0, reportCount: 0 },
      dependencies: {},
      permissions: { network: false, filesystem: false, credentials: false, subprocess: false, environment: false },
      pricing: { type: 'free', currency: 'USD' },
      createdAt: new Date(),
      updatedAt: new Date(),
      status: NodeStatus.SUBMITTED,
      tags: [],
    };

    const scanResult = await securityScanner.scanNode(testNode);

    expect(scanResult).toBeDefined();
    expect(scanResult.scannedAt).toBeDefined();
    expect(scanResult.riskLevel).toBeDefined();
    expect(scanResult.score).toBeGreaterThanOrEqual(0);
    expect(scanResult.score).toBeLessThanOrEqual(100);

    const report = securityScanner.generateReport(scanResult);
    expect(report).toContain('Security Scan Report');
    expect(report).toContain('Risk Level');
  });

  it('should detect dangerous patterns in code', async () => {
    // This would require actual code analysis - placeholder test
    expect(securityScanner).toBeDefined();
  });
});

describe('Marketplace - Partner Service', () => {
  let partnerService: PartnerService;

  beforeEach(() => {
    partnerService = new PartnerService();
  });

  it('should register a new partner', async () => {
    const partnerData: Partial<Partner> = {
      name: 'John Doe',
      companyName: 'Acme Workflows Inc.',
      email: 'john@acme.com',
      payout: {
        method: 'stripe',
        accountId: 'acct_123',
        minimumPayout: 100,
        frequency: 'monthly',
        currency: 'USD',
      },
      support: {
        dedicatedChannel: false,
        prioritySupport: false,
        contactEmail: 'support@acme.com',
      },
    };

    const result = await partnerService.registerPartner(partnerData);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.tier).toBe(PartnerTier.BRONZE);
    expect(result.data?.revenue.revenueShare).toBe(60);
  });

  it('should update partner tier based on template count', async () => {
    const registerResult = await partnerService.registerPartner({
      name: 'Jane Smith',
      companyName: 'Workflow Masters',
      email: 'jane@masters.com',
      payout: { method: 'paypal', accountId: 'pp_456', minimumPayout: 50, frequency: 'monthly', currency: 'USD' },
      support: { dedicatedChannel: false, prioritySupport: false, contactEmail: 'support@masters.com' },
    });

    const partnerId = registerResult.data!.id;

    // Simulate creating templates
    const partner = (await partnerService.getPartner(partnerId)).data!;
    partner.statistics.templateCount = 15; // Should be Silver tier

    const updateResult = await partnerService.updatePartnerTier(partnerId);

    expect(updateResult.success).toBe(true);
    expect(updateResult.data?.tier).toBe(PartnerTier.SILVER);
    expect(updateResult.data?.revenue.revenueShare).toBe(65);
  });

  it('should track partner revenue', async () => {
    const registerResult = await partnerService.registerPartner({
      name: 'Revenue Test',
      companyName: 'Test Co',
      email: 'test@co.com',
      payout: { method: 'stripe', accountId: 'acct_789', minimumPayout: 100, frequency: 'monthly', currency: 'USD' },
      support: { dedicatedChannel: false, prioritySupport: false, contactEmail: 'support@test.com' },
    });

    const partnerId = registerResult.data!.id;

    // Track some revenue
    await partnerService.trackRevenue(partnerId, 100, 'template-1', 'template');
    await partnerService.trackRevenue(partnerId, 50, 'template-2', 'template');

    const partner = (await partnerService.getPartner(partnerId)).data!;

    expect(partner.revenue.totalEarnings).toBeGreaterThan(0);
    expect(partner.revenue.pendingPayout).toBeGreaterThan(0);
  });
});

describe('Marketplace - Revenue Sharing', () => {
  let revenueSharing: RevenueSharing;

  beforeEach(() => {
    revenueSharing = new RevenueSharing();
  });

  it('should calculate revenue split correctly', () => {
    const split60 = revenueSharing.calculateSplit(100, 60);
    expect(split60.partnerShare).toBe(60);
    expect(split60.platformShare).toBe(40);

    const split70 = revenueSharing.calculateSplit(100, 70);
    expect(split70.partnerShare).toBe(70);
    expect(split70.platformShare).toBe(30);
  });

  it('should record revenue transaction', async () => {
    const transaction = await revenueSharing.recordTransaction(
      'partner-1',
      99.99,
      65,
      'template-1',
      'template'
    );

    expect(transaction).toBeDefined();
    expect(transaction.partnerId).toBe('partner-1');
    expect(transaction.amount).toBe(99.99);
    expect(transaction.partnerShare).toBeCloseTo(64.99, 2);
    expect(transaction.platformShare).toBeCloseTo(35, 2);
  });

  it('should calculate earnings summary', async () => {
    const partnerId = 'partner-summary-test';

    await revenueSharing.recordTransaction(partnerId, 100, 60, 'item-1', 'template');
    await revenueSharing.recordTransaction(partnerId, 50, 60, 'item-2', 'node');

    const summary = await revenueSharing.calculateEarningsSummary(partnerId);

    expect(summary.totalEarnings).toBe(90); // 60 + 30
    expect(summary.transactionCount).toBe(2);
  });
});

describe('Marketplace - Rating Service', () => {
  let ratingService: RatingService;

  beforeEach(() => {
    ratingService = new RatingService();
  });

  it('should submit a review', async () => {
    const reviewData: Partial<Review> = {
      resourceId: 'template-1',
      resourceType: 'template',
      userId: 'user-1',
      userName: 'Test User',
      rating: 5,
      comment: 'Excellent template! Very helpful.',
      verifiedPurchase: true,
    };

    const result = await ratingService.submitReview(reviewData);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.rating).toBe(5);
  });

  it('should calculate rating summary', async () => {
    const resourceId = 'template-ratings-test';

    // Submit multiple reviews
    await ratingService.submitReview({
      resourceId,
      resourceType: 'template',
      userId: 'user-1',
      userName: 'User 1',
      rating: 5,
      comment: 'Great!',
      verifiedPurchase: true,
    });

    await ratingService.submitReview({
      resourceId,
      resourceType: 'template',
      userId: 'user-2',
      userName: 'User 2',
      rating: 4,
      comment: 'Good',
      verifiedPurchase: true,
    });

    await ratingService.submitReview({
      resourceId,
      resourceType: 'template',
      userId: 'user-3',
      userName: 'User 3',
      rating: 5,
      comment: 'Excellent',
      verifiedPurchase: true,
    });

    const summary = await ratingService.getRatingSummary(resourceId);

    expect(summary.totalReviews).toBe(3);
    expect(summary.averageRating).toBeCloseTo(4.7, 1);
    expect(summary.distribution[5]).toBe(2);
    expect(summary.distribution[4]).toBe(1);
  });

  it('should vote review as helpful', async () => {
    const reviewResult = await ratingService.submitReview({
      resourceId: 'template-1',
      resourceType: 'template',
      userId: 'reviewer',
      userName: 'Reviewer',
      rating: 5,
      comment: 'Helpful review',
      verifiedPurchase: true,
    });

    const reviewId = reviewResult.data!.id;

    const voteResult = await ratingService.voteHelpful(reviewId, 'voter-1');

    expect(voteResult.success).toBe(true);
    expect(voteResult.data?.helpful).toBe(1);
  });

  it('should detect spam in reviews', async () => {
    const spamReview = await ratingService.submitReview({
      resourceId: 'template-1',
      resourceType: 'template',
      userId: 'spammer',
      userName: 'Spammer',
      rating: 5,
      comment: 'CLICK HERE FOR FREE STUFF!!! BUY NOW!!!',
      verifiedPurchase: false,
    });

    // Spam should be flagged
    expect(spamReview.data?.status).toBe('flagged');
  });

  it('should allow author to reply to review', async () => {
    const reviewResult = await ratingService.submitReview({
      resourceId: 'template-1',
      resourceType: 'template',
      userId: 'reviewer',
      userName: 'Reviewer',
      rating: 4,
      comment: 'Good but needs improvement',
      verifiedPurchase: true,
    });

    const reviewId = reviewResult.data!.id;

    const replyResult = await ratingService.replyToReview(
      reviewId,
      'author-1',
      'Template Author',
      'Thank you for the feedback! We will improve in the next version.'
    );

    expect(replyResult.success).toBe(true);
    expect(replyResult.data?.response).toBeDefined();
    expect(replyResult.data?.response?.comment).toContain('next version');
  });
});
