/**
 * Visual Workflow Documentation Generator Types
 * Auto-generate comprehensive workflow documentation with visual diagrams
 */

export type DocumentFormat = 'markdown' | 'html' | 'pdf' | 'json' | 'openapi';

export type DiagramFormat = 'mermaid' | 'plantuml' | 'svg' | 'png' | 'd3';

export type DiagramLayout = 'auto' | 'hierarchical' | 'horizontal' | 'vertical';

export type ColorScheme = 'category' | 'status' | 'custom' | 'default';

/**
 * Documentation Configuration
 */
export interface DocumentationConfig {
  // Output settings
  format: DocumentFormat;
  diagramFormat?: DiagramFormat;

  // Content options
  includeNodeDetails: boolean;
  includeVariables: boolean;
  includeExamples: boolean;
  includeAPISpecs: boolean;
  includeVersionHistory: boolean;

  // Diagram options
  diagramLayout: DiagramLayout;
  colorScheme: ColorScheme;
  showNodeIcons: boolean;
  showConnectionLabels: boolean;

  // Template
  template?: string;
  customTemplate?: DocumentTemplate;

  // Metadata
  author?: string;
  version?: string;
  organization?: string;

  // Output
  outputPath?: string;
  embedDiagrams: boolean;
}

/**
 * Workflow Metadata
 */
export interface WorkflowMetadata {
  id: string;
  name: string;
  description?: string;
  version: string;
  author?: string;
  organization?: string;
  tags: string[];
  category?: string;
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  executionCount?: number;
  status?: 'active' | 'inactive' | 'draft';
}

/**
 * Node Documentation
 */
export interface NodeDocumentation {
  id: string;
  name: string;
  type: string;
  category: string;
  description?: string;
  position: { x: number; y: number };

  // Configuration
  config: Record<string, any>;
  configSchema?: Record<string, any>;

  // Connections
  inputs: ConnectionInfo[];
  outputs: ConnectionInfo[];

  // Status
  status?: 'success' | 'error' | 'running' | 'pending';
  executionTime?: number;

  // Examples
  exampleInput?: any;
  exampleOutput?: any;

  // Documentation
  notes?: string;
  warnings?: string[];
}

/**
 * Connection Information
 */
export interface ConnectionInfo {
  id: string;
  sourceNode: string;
  targetNode: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  type?: 'default' | 'error' | 'conditional';
}

/**
 * Variable Documentation
 */
export interface VariableDocumentation {
  name: string;
  type: string;
  description?: string;
  defaultValue?: any;
  scope: 'workflow' | 'global' | 'environment';
  usedIn: string[]; // Node IDs
}

/**
 * Workflow Analysis Result
 */
export interface WorkflowAnalysis {
  metadata: WorkflowMetadata;
  nodes: NodeDocumentation[];
  connections: ConnectionInfo[];
  variables: VariableDocumentation[];

  // Statistics
  statistics: {
    totalNodes: number;
    nodesByCategory: Record<string, number>;
    totalConnections: number;
    maxDepth: number;
    avgExecutionTime?: number;
  };

  // Structure
  structure: {
    entryPoints: string[]; // Node IDs
    exitPoints: string[];
    branches: BranchInfo[];
    loops: LoopInfo[];
  };

  // Dependencies
  dependencies: {
    credentials: string[];
    integrations: string[];
    subWorkflows: string[];
  };
}

/**
 * Branch Information
 */
export interface BranchInfo {
  id: string;
  startNode: string;
  condition?: string;
  branches: {
    path: string[];
    condition?: string;
  }[];
}

/**
 * Loop Information
 */
export interface LoopInfo {
  id: string;
  startNode: string;
  endNode: string;
  path: string[];
  maxIterations?: number;
}

/**
 * Document Template
 */
export interface DocumentTemplate {
  name: string;
  description?: string;
  sections: TemplateSection[];
}

/**
 * Template Section
 */
export interface TemplateSection {
  id: string;
  title: string;
  type: 'overview' | 'diagram' | 'nodes' | 'variables' | 'api' | 'custom';
  content?: string;
  template?: string;
  order: number;
  enabled: boolean;
}

/**
 * Generated Documentation
 */
export interface GeneratedDocumentation {
  id: string;
  workflowId: string;
  format: DocumentFormat;
  content: string;

  // Metadata
  generatedAt: Date;
  generatedBy?: string;
  version: string;

  // Diagrams
  diagrams?: {
    format: DiagramFormat;
    content: string;
    url?: string;
  }[];

  // Files
  files?: {
    name: string;
    path: string;
    size: number;
    mimeType: string;
  }[];

  // Performance
  generationTime: number;

  // Config used
  config: DocumentationConfig;
}

/**
 * Mermaid Diagram Options
 */
export interface MermaidOptions {
  theme: 'default' | 'dark' | 'forest' | 'neutral';
  direction: 'TB' | 'BT' | 'LR' | 'RL';
  nodeShape: Record<string, 'rect' | 'round' | 'stadium' | 'subroutine' | 'cylindrical' | 'circle' | 'diamond'>;
  styleOverrides?: Record<string, string>;
}

/**
 * PlantUML Diagram Options
 */
export interface PlantUMLOptions {
  diagramType: 'activity' | 'sequence' | 'class';
  skinparam?: Record<string, string>;
  style?: string;
}

/**
 * SVG Export Options
 */
export interface SVGExportOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  includeCSS?: boolean;
  embedFonts?: boolean;
}

/**
 * D3 Visualization Options
 */
export interface D3VisualizationOptions {
  width: number;
  height: number;
  interactive: boolean;
  zoomable: boolean;
  pannable: boolean;
  nodeRenderer?: 'default' | 'detailed' | 'minimal';
  edgeRenderer?: 'default' | 'curved' | 'orthogonal';
  theme?: 'light' | 'dark';
}

/**
 * PDF Generation Options
 */
export interface PDFOptions {
  format: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';

  // Cover page
  includeCoverPage: boolean;
  coverPageTemplate?: string;

  // Table of contents
  includeTableOfContents: boolean;

  // Styling
  syntaxHighlighting: boolean;
  theme: 'light' | 'dark';

  // Header/Footer
  includePageNumbers: boolean;
  headerTemplate?: string;
  footerTemplate?: string;

  // Quality
  printBackground: boolean;
  scale: number;
}

/**
 * HTML Export Options
 */
export interface HTMLExportOptions {
  // Style
  theme: 'default' | 'dark' | 'minimal' | 'professional';
  includeCSS: boolean;
  includeJS: boolean;

  // Navigation
  includeNavigation: boolean;
  includeBreadcrumbs: boolean;
  includeTableOfContents: boolean;

  // Features
  includeSearch: boolean;
  syntaxHighlighting: boolean;
  interactiveDiagrams: boolean;

  // Assets
  embedAssets: boolean;
  assetPath?: string;
}

/**
 * OpenAPI Specification
 */
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name?: string;
      email?: string;
    };
  };
  servers: {
    url: string;
    description?: string;
  }[];
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, Schema>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
}

/**
 * OpenAPI Path Item
 */
export interface PathItem {
  summary?: string;
  description?: string;
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
}

/**
 * OpenAPI Operation
 */
export interface Operation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  security?: Record<string, string[]>[];
}

/**
 * OpenAPI Parameter
 */
export interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema: Schema;
}

/**
 * OpenAPI Request Body
 */
export interface RequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, { schema: Schema }>;
}

/**
 * OpenAPI Response
 */
export interface Response {
  description: string;
  content?: Record<string, { schema: Schema }>;
}

/**
 * OpenAPI Schema
 */
export interface Schema {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  enum?: any[];
  example?: any;
}

/**
 * OpenAPI Security Scheme
 */
export interface SecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
}

/**
 * Version History Entry
 */
export interface VersionHistoryEntry {
  version: string;
  date: Date;
  author?: string;
  changes: {
    type: 'added' | 'modified' | 'removed';
    description: string;
    nodes?: string[];
  }[];
  notes?: string;
}

/**
 * Documentation Generation Progress
 */
export interface DocumentationProgress {
  status: 'initializing' | 'analyzing' | 'generating_diagrams' | 'rendering' | 'exporting' | 'complete' | 'error';
  progress: number; // 0-100
  currentStep: string;
  error?: string;
  startTime: Date;
  estimatedCompletion?: Date;
}

/**
 * Documentation Service Interface
 */
export interface IDocumentationService {
  generate(workflowId: string, config: DocumentationConfig): Promise<GeneratedDocumentation>;
  analyze(workflowId: string): Promise<WorkflowAnalysis>;
  export(documentationId: string, format: DocumentFormat): Promise<string>;
  getProgress(taskId: string): Promise<DocumentationProgress>;
}
