/**
 * Workflow Sharing Service
 * Handles public URL sharing, permissions, analytics, and embedding
 */

import { BaseService } from './BaseService';
import type {
  SharedWorkflow,
  ShareService as ISharingService,
  CreateShareOptions,
  PublicWorkflowView,
  ShareActivity,
  ShareActivityType,
  SharePermissions,
  ShareSettings,
  ShareAnalytics,
  ShareComment,
  ShareTemplate,
  ShareCollection,
  ShareEmbedConfig,
  ShareQRCode,
  PermissionContext,
  AccessContext,
  AccessResult,
  DateRange,
  ActivityFilters,
  CommentFilters,
  QRCodeOptions,
  ShareStats
  // Removed unused imports: ShareLocation, DailyShareStats
} from '../types/sharing';

export class SharingService extends BaseService implements ISharingService {
  private static instance: SharingService;
  private shares: Map<string, SharedWorkflow> = new Map();
  private sharesByWorkflow: Map<string, Set<string>> = new Map();
  private comments: Map<string, ShareComment[]> = new Map();
  private templates: Map<string, ShareTemplate> = new Map();
  private collections: Map<string, ShareCollection> = new Map();
  private qrCodes: Map<string, ShareQRCode> = new Map();
  private activities: Map<string, ShareActivity[]> = new Map();

  private constructor() {
    super('SharingService');
    this.initializeDefaultTemplates();
  }

  static getInstance(): SharingService {
    if (!SharingService.instance) {
      SharingService.instance = new SharingService();
    }
    return SharingService.instance;
  }

  private initializeDefaultTemplates() {
    const publicTemplate: ShareTemplate = {
      id: 'public-default',
      name: 'Public Sharing',
      description: 'Full public access with all permissions',
      permissions: {
        allowView: true,
        allowClone: true,
        allowExport: true,
        allowRun: true,
        allowComment: true,
        requireAuth: false
      },
      settings: {
        showAuthor: true,
        showCreatedDate: true,
        showDescription: true,
        showTags: true,
        showStats: true,
        allowRating: true,
        allowFeedback: true
      },
      isDefault: true,
      createdBy: 'system',
      createdAt: new Date()
    };

    const restrictedTemplate: ShareTemplate = {
      id: 'restricted-default',
      name: 'Restricted Sharing',
      description: 'View-only access with limited permissions',
      permissions: {
        allowView: true,
        allowClone: false,
        allowExport: false,
        allowRun: false,
        allowComment: false,
        requireAuth: true
      },
      settings: {
        showAuthor: false,
        showCreatedDate: false,
        showDescription: true,
        showTags: false,
        showStats: false,
        allowRating: false,
        allowFeedback: false
      },
      isDefault: false,
      createdBy: 'system',
      createdAt: new Date()
    };

    this.templates.set(publicTemplate.id, publicTemplate);
    this.templates.set(restrictedTemplate.id, restrictedTemplate);
  }

  async createShare(workflowId: string, options: CreateShareOptions = {}): Promise<SharedWorkflow> {
    // Generate share ID and public URL
    const shareId = this.generateShareId();
    const publicUrl = this.buildPublicUrl(shareId);

    // Get template if specified
    let template: ShareTemplate | undefined;
    if (options.templateId) {
      template = this.templates.get(options.templateId);
    }

    // Default permissions and settings
    const defaultPermissions: SharePermissions = template?.permissions || {
      allowView: true,
      allowClone: true,
      allowExport: false,
      allowRun: false,
      allowComment: true,
      requireAuth: false
    };

    const defaultSettings: ShareSettings = template?.settings || {
      showAuthor: true,
      showCreatedDate: true,
      showDescription: true,
      showTags: true,
      showStats: true,
      allowRating: true,
      allowFeedback: true
    };

    const share: SharedWorkflow = {
      id: this.generateId(),
      workflowId,
      workflowName: `Workflow ${workflowId}`, // Would get from workflow service
      shareId,
      publicUrl,
      title: options.title || `Shared Workflow ${shareId}`,
      description: options.description,
      permissions: { ...defaultPermissions, ...options.permissions },
      settings: { ...defaultSettings, ...options.settings },
      analytics: {
        totalViews: 0,
        uniqueViews: 0,
        totalClones: 0,
        totalExecutions: 0,
        totalComments: 0,
        ratingCount: 0,
        viewsByCountry: {},
        viewsByDevice: {},
        viewsBySource: {},
        dailyStats: [],
        recentActivity: []
      },
      metadata: {
        createdBy: 'current-user', // Would get from user service
        createdByName: 'Current User',
        createdByEmail: 'user@example.com',
        originalWorkflowId: workflowId,
        tags: [],
        lastModified: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    if (options.expiresIn) {
      share.expiresAt = new Date(Date.now() + options.expiresIn * 1000);
    }

    this.shares.set(shareId, share);
    
    // Index by workflow ID
    if (!this.sharesByWorkflow.has(workflowId)) {
      this.sharesByWorkflow.set(workflowId, new Set());
    }
    this.sharesByWorkflow.get(workflowId)!.add(shareId);

    this.logger.info('Share created', { shareId, workflowId, publicUrl });
    return share;
  }

  async updateShare(shareId: string, updates: Partial<SharedWorkflow>): Promise<SharedWorkflow> {
    const share = this.shares.get(shareId);
    if (!share) {
      throw new Error(`Share ${shareId} not found`);
    }

    const updatedShare: SharedWorkflow = {
      ...share,
      ...updates,
      updatedAt: new Date()
    };

    this.shares.set(shareId, updatedShare);
    this.logger.info('Share updated', { shareId });
    return updatedShare;
  }

  async deleteShare(shareId: string): Promise<void> {
    const share = this.shares.get(shareId);
    if (!share) {
      throw new Error(`Share ${shareId} not found`);
    }

    this.shares.delete(shareId);
    this.comments.delete(shareId);
    this.activities.delete(shareId);
    this.qrCodes.delete(shareId);

    // Remove from workflow index
    const workflowShares = this.sharesByWorkflow.get(share.workflowId);
    if (workflowShares) {
      workflowShares.delete(shareId);
      if (workflowShares.size === 0) {
        this.sharesByWorkflow.delete(share.workflowId);
      }
    }

    this.logger.info('Share deleted', { shareId });
  }

  async getShare(shareId: string): Promise<SharedWorkflow | null> {
    return this.shares.get(shareId) || null;
  }

  async listShares(userId?: string): Promise<SharedWorkflow[]> {
    const shares = Array.from(this.shares.values());
    if (userId) {
      return shares.filter(share => share.metadata.createdBy === userId);
    }
    return shares;
  }

  async getPublicWorkflow(shareId: string): Promise<PublicWorkflowView> {
    const share = this.shares.get(shareId);
    if (!share) {
      throw new Error(`Share ${shareId} not found`);
    }

    if (!share.isActive) {
      throw new Error(`Share ${shareId} is not active`);
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new Error(`Share ${shareId} has expired`);
    }

    // Would get actual workflow data from workflow service
    const workflow = {
      id: share.workflowId,
      name: share.workflowName,
      nodes: [],
      edges: []
    };

    return {
      shareId,
      workflowId: share.workflowId,
      title: share.title || share.workflowName,
      description: share.description,
      thumbnail: share.thumbnail,
      workflow,
      metadata: share.metadata,
      settings: share.settings,
      canClone: share.permissions.allowClone,
      canExport: share.permissions.allowExport,
      canRun: share.permissions.allowRun,
      canComment: share.permissions.allowComment
    };
  }

  async incrementView(shareId: string, metadata?: ShareActivity): Promise<void> {
    const share = this.shares.get(shareId);
    if (!share) return;

    share.analytics.totalViews++;

    // Track unique views (simplified - would use better tracking in production)
    const ipAddress = metadata?.ipAddress;
    if (ipAddress) {
      share.analytics.uniqueViews++;
    }

    // Update country stats
    if (metadata?.location?.country) {
      const country = metadata.location.country;
      share.analytics.viewsByCountry[country] = (share.analytics.viewsByCountry[country] || 0) + 1;
    }

    // Update device stats
    if (metadata?.userAgent) {
      const device = this.getDeviceType(metadata.userAgent);
      share.analytics.viewsByDevice[device] = (share.analytics.viewsByDevice[device] || 0) + 1;
    }

    await this.recordActivity(shareId, {
      type: 'view',
      userId: metadata?.userId,
      userEmail: metadata?.userEmail,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      location: metadata?.location,
      metadata: metadata?.metadata
    });

    this.shares.set(shareId, share);
  }

  async recordActivity(shareId: string, activity: Omit<ShareActivity, 'id' | 'timestamp'>): Promise<void> {
    const fullActivity: ShareActivity = {
      ...activity,
      id: this.generateId(),
      timestamp: new Date()
    };

    if (!this.activities.has(shareId)) {
      this.activities.set(shareId, []);
    }

    const activities = this.activities.get(shareId)!;
    activities.unshift(fullActivity);

    // Keep only last 1000 activities
    if (activities.length > 1000) {
      activities.splice(1000);
    }

    // Update share analytics
    const share = this.shares.get(shareId);
    if (share) {
      share.analytics.recentActivity = activities.slice(0, 10);
      this.updateDailyStats(share, activity.type);
    }
  }

  async checkPermission(
    shareId: string,
    permission: keyof SharePermissions,
    context?: PermissionContext
  ): Promise<boolean> {
    const share = this.shares.get(shareId);
    if (!share || !share.isActive) return false;

    const permissions = share.permissions;
    const permissionValue = permissions[permission];

    if (typeof permissionValue !== 'boolean') return false;
    if (!permissionValue) return false;

    // Check authentication requirement
    if (permissions.requireAuth && !context?.userId) {
      return false;
    }

    // Check domain restrictions
    if (permissions.allowedDomains && context?.domain) {
      if (!permissions.allowedDomains.includes(context.domain)) {
        return false;
      }
    }

    // Check user restrictions
    if (permissions.allowedUsers && context?.userEmail) {
      if (!permissions.allowedUsers.includes(context.userEmail)) {
        return false;
      }
    }

    return true;
  }

  async validateAccess(shareId: string, _context: AccessContext): Promise<AccessResult> {
    // Context parameter for future access validation logic
    const share = this.shares.get(shareId);
    if (!share) {
      return { allowed: false, reason: 'Share not found' };
    }

    if (!share.isActive) {
      return { allowed: false, reason: 'Share is inactive' };
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      return { allowed: false, reason: 'Share has expired' };
    }

    // Check view limits
    if (share.permissions.maxViews && share.analytics.totalViews >= share.permissions.maxViews) {
      return { allowed: false, reason: 'View limit reached' };
    }

    // Check clone limits
    if (share.permissions.maxClones && share.analytics.totalClones >= share.permissions.maxClones) {
      return {
        allowed: true,
        reason: 'Clone limit reached',
        remainingClones: 0
      };
    }

    // Check execution limits
    if (share.permissions.maxExecutions && share.analytics.totalExecutions >= share.permissions.maxExecutions) {
      return {
        allowed: true,
        reason: 'Execution limit reached',
        remainingExecutions: 0
      };
    }

    return {
      allowed: true,
      remainingViews: share.permissions.maxViews ? share.permissions.maxViews - share.analytics.totalViews : undefined,
      remainingClones: share.permissions.maxClones ? share.permissions.maxClones - share.analytics.totalClones : undefined,
      remainingExecutions: share.permissions.maxExecutions ? share.permissions.maxExecutions - share.analytics.totalExecutions : undefined
    };
  }

  async getAnalytics(shareId: string, range?: DateRange): Promise<ShareAnalytics> {
    const share = this.shares.get(shareId);
    if (!share) {
      throw new Error(`Share ${shareId} not found`);
    }

    let dailyStats = share.analytics.dailyStats;
    // Filter daily stats by date range if provided
    if (range) {
      dailyStats = dailyStats.filter(stat => {
        const date = typeof stat.date === 'string' ? new Date(stat.date) : stat.date;
        return date >= range.start && date <= range.end;
      });
    }

    return {
      ...share.analytics,
      dailyStats
    };
  }

  async getActivityLog(shareId: string, filters?: ActivityFilters): Promise<ShareActivity[]> {
    let activities = this.activities.get(shareId) || [];

    if (filters) {
      if (filters.types) {
        activities = activities.filter(a => filters.types!.includes(a.type));
      }

      if (filters.userId) {
        activities = activities.filter(a => a.userId === filters.userId);
      }

      if (filters.dateRange) {
        activities = activities.filter(a =>
          a.timestamp >= filters.dateRange!.start &&
          a.timestamp <= filters.dateRange!.end
        );
      }

      if (filters.offset) {
        activities = activities.slice(filters.offset);
      }

      if (filters.limit) {
        activities = activities.slice(0, filters.limit);
      }
    }

    return activities;
  }

  async addComment(shareId: string, comment: Omit<ShareComment, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShareComment> {
    const fullComment: ShareComment = {
      ...comment,
      id: this.generateId(),
      replies: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!this.comments.has(shareId)) {
      this.comments.set(shareId, []);
    }

    this.comments.get(shareId)!.push(fullComment);

    // Update share analytics
    const share = this.shares.get(shareId);
    if (share) {
      share.analytics.totalComments++;
      if (comment.rating) {
        const currentRating = share.analytics.averageRating || 0;
        const currentCount = share.analytics.ratingCount || 0;
        share.analytics.averageRating = (currentRating * currentCount + comment.rating) / (currentCount + 1);
        share.analytics.ratingCount++;
      }
    }

    return fullComment;
  }

  async getComments(shareId: string, filters?: CommentFilters): Promise<ShareComment[]> {
    let comments = this.comments.get(shareId) || [];

    if (filters) {
      if (filters.isPublic !== undefined) {
        comments = comments.filter(c => c.isPublic === filters.isPublic);
      }

      if (filters.isModerated !== undefined) {
        comments = comments.filter(c => c.isModerated === filters.isModerated);
      }

      if (filters.userId) {
        comments = comments.filter(c => c.userId === filters.userId);
      }

      if (filters.minRating) {
        comments = comments.filter(c => (c.rating || 0) >= filters.minRating!);
      }

      if (filters.maxRating) {
        comments = comments.filter(c => (c.rating || 0) <= filters.maxRating!);
      }

      if (filters.dateRange) {
        comments = comments.filter(c =>
          c.createdAt >= filters.dateRange!.start &&
          c.createdAt <= filters.dateRange!.end
        );
      }

      if (filters.offset) {
        comments = comments.slice(filters.offset);
      }

      if (filters.limit) {
        comments = comments.slice(0, filters.limit);
      }
    }

    return comments;
  }

  async moderateComment(commentId: string, action: 'approve' | 'reject' | 'flag'): Promise<void> {
    // Find comment across all shares
    for (const comments of Array.from(this.comments.values())) {
      const comment = comments.find(c => c.id === commentId);
      if (comment) {
        switch (action) {
          case 'approve':
            comment.isModerated = true;
            comment.isPublic = true;
            break;
          case 'reject':
            comment.isModerated = true;
            comment.isPublic = false;
            break;
          case 'flag':
            comment.metadata.isFlagged = true;
            break;
        }
        comment.updatedAt = new Date();
        return;
      }
    }

    throw new Error(`Comment ${commentId} not found`);
  }

  async createTemplate(template: Omit<ShareTemplate, 'id' | 'createdAt'>): Promise<ShareTemplate> {
    const fullTemplate: ShareTemplate = {
      ...template,
      id: this.generateId(),
      createdAt: new Date()
    };

    this.templates.set(fullTemplate.id, fullTemplate);
    return fullTemplate;
  }

  async listTemplates(): Promise<ShareTemplate[]> {
    return Array.from(this.templates.values());
  }

  async createCollection(collection: Omit<ShareCollection, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShareCollection> {
    const fullCollection: ShareCollection = {
      ...collection,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.collections.set(fullCollection.id, fullCollection);
    return fullCollection;
  }

  async listCollections(userId?: string): Promise<ShareCollection[]> {
    const collections = Array.from(this.collections.values());
    if (userId) {
      return collections.filter(c => c.createdBy === userId || c.isPublic);
    }
    return collections.filter(c => c.isPublic);
  }

  generateEmbedCode(config: ShareEmbedConfig): string {
    const { shareId, width = '100%', height = '600px' } = config;
    const share = this.shares.get(shareId);
    if (!share) {
      throw new Error(`Share ${shareId} not found`);
    }

    const params = new URLSearchParams();
    if (config.theme) params.set('theme', config.theme);
    if (config.showHeader !== undefined) params.set('header', config.showHeader.toString());
    if (config.showFooter !== undefined) params.set('footer', config.showFooter.toString());
    if (config.showControls !== undefined) params.set('controls', config.showControls.toString());
    if (config.autoStart) params.set('autostart', 'true');
    if (config.allowFullscreen !== undefined) params.set('fullscreen', config.allowFullscreen.toString());

    const queryString = params.toString();
    const finalUrl = `${share.publicUrl}${queryString ? '?' + queryString : ''}`;

    return `<iframe
  src="${finalUrl}"
  width="${width}"
  height="${height}"
  frameborder="0"
  ${config.allowFullscreen ? 'allowfullscreen' : ''}
  style="border: 1px solid #e1e5e9; border-radius: 8px;"
></iframe>`;
  }

  async generateQRCode(shareId: string, options: QRCodeOptions = {}): Promise<ShareQRCode> {
    const share = this.shares.get(shareId);
    if (!share) {
      throw new Error(`Share ${shareId} not found`);
    }

    const publicUrl = share.publicUrl;

    // In a real implementation, you'd use a QR code library
    const qrCode: ShareQRCode = {
      shareId,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=${options.size || 200}x${options.size || 200}&data=${encodeURIComponent(publicUrl)}`,
      size: options.size || 200,
      format: options.format || 'png',
      errorCorrection: options.errorCorrection || 'M',
      createdAt: new Date()
    };

    this.qrCodes.set(shareId, qrCode);
    return qrCode;
  }

  generateShareId(): string {
    // Generate a short, URL-friendly ID
    return Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 8);
  }

  buildPublicUrl(shareId: string): string {
    return `${window.location.origin}/shared/${shareId}`;
  }

  validateShareUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.startsWith('/shared/') && urlObj.pathname.length > 8;
    } catch {
      return false;
    }
  }

  async getShareStats(userId?: string): Promise<ShareStats> {
    const shares = userId
      ? Array.from(this.shares.values()).filter(s => s.metadata.createdBy === userId)
      : Array.from(this.shares.values());

    const totalViews = shares.reduce((sum, s) => sum + s.analytics.totalViews, 0);
    const totalClones = shares.reduce((sum, s) => sum + s.analytics.totalClones, 0);
    const totalExecutions = shares.reduce((sum, s) => sum + s.analytics.totalExecutions, 0);

    const mostViewedShare = shares.reduce((max, share) =>
      share.analytics.totalViews > (max?.analytics.totalViews || 0) ? share : max
    );

    const mostClonedShare = shares.reduce((max, share) =>
      share.analytics.totalClones > (max?.analytics.totalClones || 0) ? share : max
    );

    const recentShares = shares
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trending = shares
      .filter(share => {
        return share.createdAt > weekAgo;
      })
      .sort((a, b) => b.analytics.totalViews - a.analytics.totalViews)
      .slice(0, 5);

    return {
      totalShares: shares.length,
      totalViews,
      totalClones,
      totalExecutions,
      mostViewedShare,
      mostClonedShare,
      recentShares,
      trending
    };
  }

  // Private helper methods
  private updateDailyStats(share: SharedWorkflow, activityType: ShareActivityType) {
    const today = new Date().toISOString().split('T')[0];
    let todayStats = share.analytics.dailyStats.find(stat => stat.date === today);

    if (!todayStats) {
      todayStats = {
        date: today,
        views: 0,
        clones: 0,
        executions: 0,
        comments: 0
      };
      share.analytics.dailyStats.unshift(todayStats);
    }

    switch (activityType) {
      case 'view':
        todayStats.views++;
        break;
      case 'clone':
        todayStats.clones++;
        share.analytics.totalClones++;
        break;
      case 'execute':
        todayStats.executions++;
        share.analytics.totalExecutions++;
        break;
      case 'comment':
        todayStats.comments++;
        break;
    }

    // Keep only last 90 days
    if (share.analytics.dailyStats.length > 90) {
      share.analytics.dailyStats = share.analytics.dailyStats.slice(0, 90);
    }
  }

  private getDeviceType(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile')) return 'mobile';
    if (ua.includes('tablet')) return 'tablet';
    return 'desktop';
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}