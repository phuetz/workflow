/**
 * Workflow Sharing Types
 * Public URL sharing with permissions and analytics
 */

export interface SharedWorkflow {
  id: string;
  workflowId: string;
  workflowName: string;
  shareId: string; // Short UUID for public URLs
  publicUrl: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  permissions: SharePermissions;
  analytics: ShareAnalytics;
  settings: ShareSettings;
  metadata: ShareMetadata;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface SharePermissions {
  allowView: boolean;
  allowClone: boolean;
  allowExport: boolean;
  allowRun: boolean;
  allowComment: boolean;
  requireAuth: boolean;
  allowedDomains?: string[];
  allowedUsers?: string[];
  allowedRoles?: ShareRole[];
  maxViews?: number;
  maxClones?: number;
  maxExecutions?: number;
}

export type ShareRole = 'viewer' | 'editor' | 'runner' | 'admin';

export interface ShareSettings {
  showAuthor: boolean;
  showCreatedDate: boolean;
  showDescription: boolean;
  showTags: boolean;
  showStats: boolean;
  allowRating: boolean;
  allowFeedback: boolean;
  watermark?: string;
  customBranding?: ShareBranding;
  seoSettings?: SEOSettings;
}

export interface ShareBranding {
  logoUrl?: string;
  primaryColor?: string;
  customCSS?: string;
  footerText?: string;
}

export interface SEOSettings {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  ogImage?: string;
}

export interface ShareAnalytics {
  totalViews: number;
  uniqueViews: number;
  totalClones: number;
  totalExecutions: number;
  totalComments: number;
  averageRating?: number;
  ratingCount: number;
  viewsByCountry: Record<string, number>;
  viewsByDevice: Record<string, number>;
  viewsBySource: Record<string, number>;
  dailyStats: DailyShareStats[];
  recentActivity: ShareActivity[];
}

export interface DailyShareStats {
  date: string;
  views: number;
  clones: number;
  executions: number;
  comments: number;
}

export interface ShareActivity {
  id: string;
  type: ShareActivityType;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: ShareLocation;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export type ShareActivityType = 
  | 'view'
  | 'clone'
  | 'export'
  | 'execute'
  | 'comment'
  | 'rate'
  | 'download'
  | 'share';

export interface ShareLocation {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
}

export interface ShareMetadata {
  createdBy: string;
  createdByName: string;
  createdByEmail?: string;
  originalWorkflowId: string;
  workflowVersion?: string;
  tags?: string[];
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedRunTime?: number;
  language?: string;
  lastModified: Date;
}

export interface ShareComment {
  id: string;
  shareId: string;
  userId?: string;
  userEmail?: string;
  userName: string;
  content: string;
  rating?: number;
  isPublic: boolean;
  isModerated: boolean;
  replies: ShareCommentReply[];
  metadata: CommentMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShareCommentReply {
  id: string;
  userId?: string;
  userName: string;
  content: string;
  createdAt: Date;
}

export interface CommentMetadata {
  ipAddress?: string;
  userAgent?: string;
  location?: ShareLocation;
  isVerified: boolean;
  isFlagged: boolean;
  flagReason?: string;
}

export interface ShareTemplate {
  id: string;
  name: string;
  description: string;
  permissions: SharePermissions;
  settings: ShareSettings;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface ShareCollection {
  id: string;
  name: string;
  description?: string;
  sharedWorkflows: string[]; // Share IDs
  isPublic: boolean;
  tags?: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShareEmbedConfig {
  shareId: string;
  width?: string | number;
  height?: string | number;
  theme?: 'light' | 'dark' | 'auto';
  showHeader?: boolean;
  showFooter?: boolean;
  showControls?: boolean;
  autoStart?: boolean;
  allowFullscreen?: boolean;
  customCSS?: string;
}

export interface ShareQRCode {
  shareId: string;
  qrCodeUrl: string;
  size: number;
  format: 'png' | 'svg';
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  createdAt: Date;
}

export interface ShareService {
  // Share management
  createShare(workflowId: string, options: CreateShareOptions): Promise<SharedWorkflow>;
  updateShare(shareId: string, updates: Partial<SharedWorkflow>): Promise<SharedWorkflow>;
  deleteShare(shareId: string): Promise<void>;
  getShare(shareId: string): Promise<SharedWorkflow | null>;
  listShares(userId?: string): Promise<SharedWorkflow[]>;
  
  // Public access
  getPublicWorkflow(shareId: string): Promise<PublicWorkflowView>;
  incrementView(shareId: string, metadata?: ShareActivity): Promise<void>;
  recordActivity(shareId: string, activity: Omit<ShareActivity, 'id' | 'timestamp'>): Promise<void>;
  
  // Permissions
  checkPermission(shareId: string, permission: keyof SharePermissions, context?: PermissionContext): Promise<boolean>;
  validateAccess(shareId: string, context: AccessContext): Promise<AccessResult>;
  
  // Analytics
  getAnalytics(shareId: string, range?: DateRange): Promise<ShareAnalytics>;
  getActivityLog(shareId: string, filters?: ActivityFilters): Promise<ShareActivity[]>;
  
  // Comments and ratings
  addComment(shareId: string, comment: Omit<ShareComment, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShareComment>;
  getComments(shareId: string, filters?: CommentFilters): Promise<ShareComment[]>;
  moderateComment(commentId: string, action: 'approve' | 'reject' | 'flag'): Promise<void>;
  
  // Templates and collections
  createTemplate(template: Omit<ShareTemplate, 'id' | 'createdAt'>): Promise<ShareTemplate>;
  listTemplates(): Promise<ShareTemplate[]>;
  createCollection(collection: Omit<ShareCollection, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShareCollection>;
  listCollections(userId?: string): Promise<ShareCollection[]>;
  
  // Embedding and QR codes
  generateEmbedCode(config: ShareEmbedConfig): string;
  generateQRCode(shareId: string, options?: QRCodeOptions): Promise<ShareQRCode>;
  
  // Utilities
  generateShareId(): string;
  buildPublicUrl(shareId: string): string;
  validateShareUrl(url: string): boolean;
  getShareStats(userId?: string): Promise<ShareStats>;
}

export interface CreateShareOptions {
  title?: string;
  description?: string;
  permissions?: Partial<SharePermissions>;
  settings?: Partial<ShareSettings>;
  expiresIn?: number; // seconds
  templateId?: string;
}

export interface PublicWorkflowView {
  shareId: string;
  workflowId: string;
  title: string;
  description?: string;
  thumbnail?: string;
  workflow: Record<string, unknown>; // Sanitized workflow data
  metadata: ShareMetadata;
  settings: ShareSettings;
  canClone: boolean;
  canExport: boolean;
  canRun: boolean;
  canComment: boolean;
}

export interface PermissionContext {
  userId?: string;
  userEmail?: string;
  userRoles?: string[];
  ipAddress?: string;
  domain?: string;
}

export interface AccessContext extends PermissionContext {
  userAgent?: string;
  referrer?: string;
  location?: ShareLocation;
}

export interface AccessResult {
  allowed: boolean;
  reason?: string;
  remainingViews?: number;
  remainingClones?: number;
  remainingExecutions?: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ActivityFilters {
  types?: ShareActivityType[];
  userId?: string;
  dateRange?: DateRange;
  limit?: number;
  offset?: number;
}

export interface CommentFilters {
  isPublic?: boolean;
  isModerated?: boolean;
  userId?: string;
  dateRange?: DateRange;
  minRating?: number;
  maxRating?: number;
  limit?: number;
  offset?: number;
}

export interface QRCodeOptions {
  size?: number;
  format?: 'png' | 'svg';
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  foregroundColor?: string;
  backgroundColor?: string;
  logo?: string;
}

export interface ShareStats {
  totalShares: number;
  totalViews: number;
  totalClones: number;
  totalExecutions: number;
  mostViewedShare?: SharedWorkflow;
  mostClonedShare?: SharedWorkflow;
  recentShares: SharedWorkflow[];
  trending: SharedWorkflow[];
}

// Events
export interface ShareEvents {
  shareCreated: (share: SharedWorkflow) => void;
  shareUpdated: (share: SharedWorkflow) => void;
  shareDeleted: (shareId: string) => void;
  shareViewed: (shareId: string, activity: ShareActivity) => void;
  shareCloned: (shareId: string, activity: ShareActivity) => void;
  shareRated: (shareId: string, rating: number) => void;
  commentAdded: (shareId: string, comment: ShareComment) => void;
  limitReached: (shareId: string, limitType: string) => void;
  shareExpired: (shareId: string) => void;
}