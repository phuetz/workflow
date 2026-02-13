/**
 * Community Nodes Repository Types
 * Marketplace for community-contributed nodes and integrations
 */

export interface CommunityNode {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: NodeCategory;
  icon: string;
  color: string;
  version: string;
  author: NodeAuthor;
  repository: NodeRepository;
  package: NodePackage;
  documentation: NodeDocumentation;
  stats: NodeStats;
  ratings: NodeRatings;
  compatibility: NodeCompatibility;
  security: NodeSecurity;
  metadata: NodeMetadata;
  status: NodeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface NodeAuthor {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  website?: string;
  github?: string;
  twitter?: string;
  verified: boolean;
  reputation: number;
  totalDownloads: number;
  totalNodes: number;
  joinedAt: Date;
}

export interface NodeRepository {
  type: 'github' | 'gitlab' | 'bitbucket';
  url: string;
  branch: string;
  path?: string;
  stars: number;
  forks: number;
  issues: number;
  lastCommit: Date;
  license: string;
  topics: string[];
}

export interface NodePackage {
  name: string;
  version: string;
  registry: 'npm' | 'github' | 'custom';
  downloadUrl: string;
  integrity?: string;
  size: number;
  dependencies: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: {
    node?: string;
    npm?: string;
  };
  main: string;
  types?: string;
}

export interface NodeDocumentation {
  readme: string;
  changelog?: string;
  examples: NodeExample[];
  configuration: NodeConfiguration[];
  troubleshooting?: TroubleshootingGuide[];
  videos?: VideoTutorial[];
  links: ExternalLink[];
}

export interface NodeExample {
  id: string;
  title: string;
  description: string;
  workflow: Record<string, unknown>; // Simplified workflow JSON
  input?: unknown;
  output?: unknown;
  code?: string;
  tags: string[];
}

export interface NodeConfiguration {
  property: string;
  type: string;
  description: string;
  required: boolean;
  default?: unknown;
  options?: ConfigOption[];
  validation?: string;
}

export interface ConfigOption {
  value: unknown;
  label: string;
  description?: string;
}

export interface TroubleshootingGuide {
  issue: string;
  description: string;
  solution: string;
  relatedErrors?: string[];
}

export interface VideoTutorial {
  title: string;
  url: string;
  duration: number; // seconds
  thumbnail?: string;
  author?: string;
}

export interface ExternalLink {
  title: string;
  url: string;
  type: 'documentation' | 'tutorial' | 'support' | 'other';
}

export interface NodeStats {
  downloads: {
    total: number;
    weekly: number;
    monthly: number;
    daily: number[];
  };
  installations: number;
  usageCount: number;
  forkCount: number;
  contributorCount: number;
  issueCount: {
    open: number;
    closed: number;
  };
  pullRequestCount: {
    open: number;
    merged: number;
  };
}

export interface NodeRatings {
  average: number;
  count: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  reviews: NodeReview[];
}

export interface NodeReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title?: string;
  comment: string;
  helpful: number;
  notHelpful: number;
  verified: boolean;
  version: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface NodeCompatibility {
  workflowBuilderVersion: string;
  nodeVersions: string[];
  platforms: string[];
  browsers?: string[];
  tested: boolean;
  breaking: BreakingChange[];
}

export interface BreakingChange {
  version: string;
  description: string;
  migration?: string;
}

export interface NodeSecurity {
  verified: boolean;
  auditStatus: 'pending' | 'passed' | 'failed' | 'warning';
  auditDate?: Date;
  vulnerabilities: SecurityVulnerability[];
  permissions: string[];
  dataAccess: string[];
  networkAccess: string[];
  sandboxed: boolean;
}

export interface SecurityVulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  cve?: string;
  fixedIn?: string;
}

export interface NodeMetadata {
  tags: string[];
  keywords: string[];
  language: string;
  featured: boolean;
  trending: boolean;
  editorsPick: boolean;
  beta: boolean;
  deprecated: boolean;
  deprecationNotice?: string;
  successorId?: string;
}

export type NodeStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'deprecated' | 'archived';

export type NodeCategory = 
  | 'data'
  | 'communication'
  | 'marketing'
  | 'productivity'
  | 'development'
  | 'utility'
  | 'ai-ml'
  | 'analytics'
  | 'automation'
  | 'finance'
  | 'social'
  | 'storage'
  | 'security'
  | 'monitoring'
  | 'other';

// Node Submission and Publishing
export interface NodeSubmission {
  id: string;
  nodeId?: string; // If updating existing node
  name: string;
  displayName: string;
  description: string;
  category: NodeCategory;
  repositoryUrl: string;
  packageName: string;
  documentation: string;
  exampleWorkflow?: Record<string, unknown>;
  submittedBy: string;
  submittedAt: Date;
  status: SubmissionStatus;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
}

export type SubmissionStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'changes-requested';

// Community Features
export interface NodeCollection {
  id: string;
  name: string;
  description: string;
  nodes: string[]; // Node IDs
  author: string;
  isPublic: boolean;
  followers: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NodeComment {
  id: string;
  nodeId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  parentId?: string; // For replies
  helpful: number;
  replies: NodeComment[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface NodeContribution {
  id: string;
  nodeId: string;
  contributorId: string;
  contributorName: string;
  type: 'code' | 'documentation' | 'example' | 'translation' | 'bug-fix';
  description: string;
  pullRequestUrl?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

// Search and Discovery
export interface NodeSearchFilters {
  query?: string;
  categories?: NodeCategory[];
  authors?: string[];
  tags?: string[];
  minRating?: number;
  compatibility?: string;
  featured?: boolean;
  verified?: boolean;
  sortBy?: NodeSortOption;
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export type NodeSortOption = 
  | 'relevance'
  | 'downloads'
  | 'rating'
  | 'recent'
  | 'trending'
  | 'name';

export interface NodeSearchResult {
  nodes: CommunityNode[];
  total: number;
  page: number;
  totalPages: number;
  facets: SearchFacets;
}

export interface SearchFacets {
  categories: FacetCount[];
  authors: FacetCount[];
  tags: FacetCount[];
  ratings: FacetCount[];
}

export interface FacetCount {
  value: string;
  count: number;
}

// Installation and Updates
export interface NodeInstallation {
  id: string;
  nodeId: string;
  userId: string;
  version: string;
  installedAt: Date;
  lastUsedAt?: Date;
  autoUpdate: boolean;
  settings?: Record<string, unknown>;
}

export interface NodeUpdate {
  nodeId: string;
  currentVersion: string;
  latestVersion: string;
  type: 'patch' | 'minor' | 'major';
  changelog: string;
  breaking: boolean;
  releaseDate: Date;
}

// Developer Tools
export interface NodeSDK {
  scaffoldNode(options: ScaffoldOptions): Promise<void>;
  validateNode(path: string): Promise<ValidationResult>;
  testNode(path: string, testData?: unknown): Promise<TestResult>;
  packageNode(path: string): Promise<NodePackage>;
  publishNode(packagePath: string): Promise<CommunityNode>;
  generateDocs(path: string): Promise<string>;
}

export interface ScaffoldOptions {
  name: string;
  displayName: string;
  category: NodeCategory;
  template: 'basic' | 'advanced' | 'trigger' | 'webhook';
  typescript: boolean;
  includeTests: boolean;
  includeDocs: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  line?: number;
  column?: number;
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface TestResult {
  passed: boolean;
  tests: TestCase[];
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  duration: number;
}

export interface TestCase {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  stack?: string;
}

// Community Service Interface
export interface CommunityService {
  // Node Discovery
  searchNodes(filters: NodeSearchFilters): Promise<NodeSearchResult>;
  getNode(nodeId: string): Promise<CommunityNode | null>;
  getFeaturedNodes(): Promise<CommunityNode[]>;
  getTrendingNodes(period?: 'day' | 'week' | 'month'): Promise<CommunityNode[]>;
  getSimilarNodes(nodeId: string, limit?: number): Promise<CommunityNode[]>;
  
  // Installation
  installNode(nodeId: string, version?: string): Promise<NodeInstallation>;
  uninstallNode(nodeId: string): Promise<void>;
  updateNode(nodeId: string, version: string): Promise<NodeInstallation>;
  getInstalledNodes(userId: string): Promise<NodeInstallation[]>;
  checkUpdates(installations: string[]): Promise<NodeUpdate[]>;
  
  // Publishing
  submitNode(submission: Omit<NodeSubmission, 'id' | 'submittedAt' | 'status'>): Promise<NodeSubmission>;
  updateSubmission(submissionId: string, updates: Partial<NodeSubmission>): Promise<NodeSubmission>;
  getSubmissions(authorId: string): Promise<NodeSubmission[]>;
  
  // Community Interaction
  rateNode(nodeId: string, rating: number, review?: string): Promise<NodeReview>;
  commentOnNode(nodeId: string, comment: string, parentId?: string): Promise<NodeComment>;
  reportNode(nodeId: string, reason: string): Promise<void>;
  followAuthor(authorId: string): Promise<void>;
  
  // Collections
  createCollection(collection: Omit<NodeCollection, 'id' | 'createdAt' | 'updatedAt'>): Promise<NodeCollection>;
  updateCollection(collectionId: string, updates: Partial<NodeCollection>): Promise<NodeCollection>;
  deleteCollection(collectionId: string): Promise<void>;
  getCollections(userId?: string): Promise<NodeCollection[]>;
  
  // Developer Tools
  validateNodePackage(packagePath: string): Promise<ValidationResult>;
  generateNodeTemplate(options: ScaffoldOptions): Promise<string>;
  getNodeSDK(): NodeSDK;
  
  // Analytics
  getNodeAnalytics(nodeId: string, period?: DateRange): Promise<NodeAnalytics>;
  getAuthorAnalytics(authorId: string, period?: DateRange): Promise<AuthorAnalytics>;
}

export interface NodeAnalytics {
  downloads: TimeSeriesData[];
  installations: TimeSeriesData[];
  usage: TimeSeriesData[];
  ratings: TimeSeriesData[];
  geography: GeographyData[];
  versions: VersionData[];
}

export interface AuthorAnalytics {
  totalDownloads: number;
  totalInstallations: number;
  averageRating: number;
  nodePerformance: NodePerformance[];
  topNodes: CommunityNode[];
  growth: GrowthMetrics;
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

export interface GeographyData {
  country: string;
  downloads: number;
  installations: number;
}

export interface VersionData {
  version: string;
  downloads: number;
  installations: number;
  releaseDate: Date;
}

export interface NodePerformance {
  nodeId: string;
  nodeName: string;
  downloads: number;
  rating: number;
  trend: 'up' | 'down' | 'stable';
}

export interface GrowthMetrics {
  downloadsGrowth: number; // percentage
  installationsGrowth: number;
  ratingsGrowth: number;
  period: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}