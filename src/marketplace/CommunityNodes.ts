/**
 * Community Nodes Service - Node Lifecycle Management
 * Handles submission, verification, installation of community nodes
 */

import {
  CommunityNode,
  NodeStatus,
  NodeVerification,
  SecurityScanResult,
  MarketplaceResponse,
  PaginatedResponse,
  MarketplaceEvent,
  MarketplaceEventType,
} from '../types/marketplace';
import { SecurityScanner } from './SecurityScanner';
import { logger } from '../services/SimpleLogger';

export class CommunityNodesService {
  private nodes: Map<string, CommunityNode> = new Map();
  private securityScanner: SecurityScanner;
  private eventListeners: Map<MarketplaceEventType, Function[]> = new Map();

  constructor(securityScanner?: SecurityScanner) {
    this.securityScanner = securityScanner || new SecurityScanner();
  }

  /**
   * Submit new community node
   */
  async submitNode(nodeData: Partial<CommunityNode>): Promise<MarketplaceResponse<CommunityNode>> {
    try {
      // Validate node data
      const validation = this.validateNodeData(nodeData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Create node with initial status
      const node: CommunityNode = {
        ...nodeData,
        id: this.generateId(),
        version: nodeData.version || '1.0.0',
        status: NodeStatus.SUBMITTED,
        createdAt: new Date(),
        updatedAt: new Date(),
        verification: {
          status: NodeStatus.SUBMITTED,
          verified: false,
          securityScan: {
            passed: false,
            scannedAt: new Date(),
            findings: [],
            riskLevel: 'medium',
            score: 0,
          },
        },
        analytics: {
          downloads: 0,
          activeInstallations: 0,
          averageRating: 0,
          ratingCount: 0,
          successRate: 0,
          reportCount: 0,
        },
        tags: nodeData.tags || [],
      } as CommunityNode;

      // Save node
      this.nodes.set(node.id, node);

      // Start security scan automatically
      await this.startSecurityScan(node.id);

      return {
        success: true,
        data: node,
        message: 'Node submitted successfully and security scan started',
      };
    } catch (error) {
      logger.error('Submit node error:', error);
      return {
        success: false,
        error: 'Failed to submit node',
      };
    }
  }

  /**
   * Start security scan for node
   */
  async startSecurityScan(nodeId: string): Promise<MarketplaceResponse<SecurityScanResult>> {
    try {
      const node = this.nodes.get(nodeId);
      if (!node) {
        return {
          success: false,
          error: 'Node not found',
        };
      }

      // Update status to scanning
      await this.updateNodeStatus(nodeId, NodeStatus.SCANNING);

      // Perform security scan
      const scanResult = await this.securityScanner.scanNode(node);

      // Update node with scan results
      node.verification.securityScan = scanResult;
      node.updatedAt = new Date();

      // Determine next status based on scan results
      if (scanResult.passed) {
        if (scanResult.riskLevel === 'low' || scanResult.riskLevel === 'medium') {
          await this.updateNodeStatus(nodeId, NodeStatus.PENDING_REVIEW);
        } else {
          await this.updateNodeStatus(nodeId, NodeStatus.REJECTED);
        }
      } else {
        await this.updateNodeStatus(nodeId, NodeStatus.REJECTED);
      }

      return {
        success: true,
        data: scanResult,
        message: 'Security scan completed',
      };
    } catch (error) {
      logger.error('Security scan error:', error);
      return {
        success: false,
        error: 'Failed to perform security scan',
      };
    }
  }

  /**
   * Approve node (manual review)
   */
  async approveNode(
    nodeId: string,
    reviewerId: string,
    comments?: string
  ): Promise<MarketplaceResponse<CommunityNode>> {
    try {
      const node = this.nodes.get(nodeId);
      if (!node) {
        return {
          success: false,
          error: 'Node not found',
        };
      }

      if (node.status !== NodeStatus.PENDING_REVIEW && node.status !== NodeStatus.IN_REVIEW) {
        return {
          success: false,
          error: 'Node is not ready for approval',
        };
      }

      // Update verification
      node.verification.verified = true;
      node.verification.verifiedAt = new Date();
      node.verification.verifiedBy = reviewerId;
      node.verification.badge = 'verified';
      node.verification.manualReview = {
        approved: true,
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        comments,
        checklist: {
          codeQuality: true,
          documentation: true,
          errorHandling: true,
          security: true,
          performance: true,
          compatibility: true,
        },
      };

      await this.updateNodeStatus(nodeId, NodeStatus.APPROVED);

      return {
        success: true,
        data: node,
        message: 'Node approved successfully',
      };
    } catch (error) {
      logger.error('Approve node error:', error);
      return {
        success: false,
        error: 'Failed to approve node',
      };
    }
  }

  /**
   * Reject node
   */
  async rejectNode(
    nodeId: string,
    reviewerId: string,
    reason: string
  ): Promise<MarketplaceResponse<CommunityNode>> {
    try {
      const node = this.nodes.get(nodeId);
      if (!node) {
        return {
          success: false,
          error: 'Node not found',
        };
      }

      node.verification.manualReview = {
        approved: false,
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        comments: reason,
        checklist: {
          codeQuality: false,
          documentation: false,
          errorHandling: false,
          security: false,
          performance: false,
          compatibility: false,
        },
      };

      await this.updateNodeStatus(nodeId, NodeStatus.REJECTED);

      return {
        success: true,
        data: node,
        message: 'Node rejected',
      };
    } catch (error) {
      logger.error('Reject node error:', error);
      return {
        success: false,
        error: 'Failed to reject node',
      };
    }
  }

  /**
   * Download/Install node
   */
  async downloadNode(nodeId: string, userId: string): Promise<MarketplaceResponse<any>> {
    try {
      const node = this.nodes.get(nodeId);
      if (!node) {
        return {
          success: false,
          error: 'Node not found',
        };
      }

      if (node.status !== NodeStatus.APPROVED) {
        return {
          success: false,
          error: 'Node is not approved for download',
        };
      }

      // Track download event
      await this.trackEvent({
        type: MarketplaceEventType.NODE_DOWNLOADED,
        resourceId: nodeId,
        resourceType: 'node',
        userId,
        timestamp: new Date(),
      });

      // Increment download count
      node.analytics.downloads += 1;
      node.updatedAt = new Date();

      return {
        success: true,
        data: {
          codeUrl: node.codeUrl,
          version: node.version,
          dependencies: node.dependencies,
        },
        message: 'Node ready for download',
      };
    } catch (error) {
      logger.error('Download node error:', error);
      return {
        success: false,
        error: 'Failed to download node',
      };
    }
  }

  /**
   * Get node by ID
   */
  async getNode(nodeId: string): Promise<MarketplaceResponse<CommunityNode>> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return {
        success: false,
        error: 'Node not found',
      };
    }

    return {
      success: true,
      data: node,
    };
  }

  /**
   * Search nodes
   */
  async searchNodes(
    query: string,
    filters?: any,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResponse<CommunityNode>> {
    let results = Array.from(this.nodes.values());

    // Filter only approved nodes for public search
    results = results.filter((n) => n.status === NodeStatus.APPROVED);

    // Apply text search
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(
        (n) =>
          n.name.toLowerCase().includes(lowerQuery) ||
          n.displayName.toLowerCase().includes(lowerQuery) ||
          n.description.toLowerCase().includes(lowerQuery) ||
          n.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    }

    // Apply category filter
    if (filters?.category) {
      results = results.filter((n) => n.category === filters.category);
    }

    // Apply verified filter
    if (filters?.verified) {
      results = results.filter((n) => n.verification.verified);
    }

    // Sort by downloads
    results.sort((a, b) => b.analytics.downloads - a.analytics.downloads);

    // Paginate
    const total = results.length;
    const start = (page - 1) * pageSize;
    const paginatedResults = results.slice(start, start + pageSize);

    return {
      items: paginatedResults,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get nodes pending review
   */
  async getNodesPendingReview(): Promise<CommunityNode[]> {
    return Array.from(this.nodes.values()).filter(
      (n) => n.status === NodeStatus.PENDING_REVIEW
    );
  }

  /**
   * Get nodes by author
   */
  async getNodesByAuthor(authorId: string): Promise<CommunityNode[]> {
    return Array.from(this.nodes.values()).filter((n) => n.author.id === authorId);
  }

  /**
   * Update node status
   */
  private async updateNodeStatus(nodeId: string, status: NodeStatus): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    node.status = status;
    node.verification.status = status;
    node.updatedAt = new Date();
  }

  /**
   * Validate node data
   */
  private validateNodeData(nodeData: Partial<CommunityNode>): {
    valid: boolean;
    error?: string;
  } {
    if (!nodeData.name || nodeData.name.trim().length === 0) {
      return { valid: false, error: 'Node name is required' };
    }

    if (!nodeData.displayName || nodeData.displayName.trim().length === 0) {
      return { valid: false, error: 'Node display name is required' };
    }

    if (!nodeData.description || nodeData.description.trim().length === 0) {
      return { valid: false, error: 'Node description is required' };
    }

    if (!nodeData.codeUrl || nodeData.codeUrl.trim().length === 0) {
      return { valid: false, error: 'Node code URL is required' };
    }

    if (!nodeData.category) {
      return { valid: false, error: 'Node category is required' };
    }

    return { valid: true };
  }

  /**
   * Track marketplace event
   */
  private async trackEvent(event: MarketplaceEvent): Promise<void> {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach((listener) => listener(event));
  }

  /**
   * Subscribe to events
   */
  on(eventType: MarketplaceEventType, callback: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Bulk import nodes (for testing/seeding)
   */
  async bulkImport(nodes: CommunityNode[]): Promise<void> {
    nodes.forEach((node) => {
      this.nodes.set(node.id, node);
    });
  }

  /**
   * Get all nodes (admin only)
   */
  async getAllNodes(): Promise<CommunityNode[]> {
    return Array.from(this.nodes.values());
  }
}
