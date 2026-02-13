/**
 * Node Builder Types
 * Comprehensive type definitions for the no-code node builder system
 */

export interface NodeBuilderConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  author: string;
  category: NodeCategory;
  icon: string;
  color: string;

  // Authentication configuration
  authentication: AuthenticationConfig;

  // Parameters configuration
  parameters: ParameterDefinition[];

  // Operation modes
  operations: OperationDefinition[];

  // Data mapping
  inputMapping?: DataMappingRule[];
  outputMapping?: DataMappingRule[];

  // Metadata
  tags: string[];
  documentation?: string;
  examples?: ExampleDefinition[];

  // Generation settings
  generationSettings: GenerationSettings;
}

export enum NodeCategory {
  TRIGGER = 'trigger',
  ACTION = 'action',
  DATA_PROCESSING = 'data_processing',
  COMMUNICATION = 'communication',
  DATABASE = 'database',
  STORAGE = 'storage',
  AI_ML = 'ai_ml',
  ANALYTICS = 'analytics',
  UTILITY = 'utility',
  CUSTOM = 'custom',
}

export interface AuthenticationConfig {
  type: AuthType;
  name: string;
  description: string;
  fields: AuthField[];
  testEndpoint?: string;
  testMethod?: HttpMethod;
}

export enum AuthType {
  NONE = 'none',
  API_KEY = 'api_key',
  BEARER_TOKEN = 'bearer_token',
  BASIC_AUTH = 'basic_auth',
  OAUTH2 = 'oauth2',
  CUSTOM_HEADER = 'custom_header',
  QUERY_PARAM = 'query_param',
}

export interface AuthField {
  name: string;
  displayName: string;
  type: FieldType;
  required: boolean;
  description: string;
  placeholder?: string;
  default?: unknown;

  // OAuth2 specific
  authUrl?: string;
  tokenUrl?: string;
  scopes?: string[];

  // API Key specific
  headerName?: string;
  queryName?: string;
}

export enum FieldType {
  STRING = 'string',
  PASSWORD = 'password',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  TEXT_AREA = 'text_area',
  JSON = 'json',
  URL = 'url',
  EMAIL = 'email',
  EXPRESSION = 'expression',
}

export interface ParameterDefinition {
  id: string;
  name: string;
  displayName: string;
  type: FieldType;
  required: boolean;
  description: string;
  placeholder?: string;
  default?: unknown;

  // Validation
  validation?: ValidationRule[];

  // Conditional visibility
  displayConditions?: DisplayCondition[];

  // Options for select fields
  options?: ParameterOption[];

  // Nested parameters
  children?: ParameterDefinition[];
}

export interface ValidationRule {
  type: ValidationType;
  value?: unknown;
  message: string;
}

export enum ValidationType {
  REQUIRED = 'required',
  MIN_LENGTH = 'min_length',
  MAX_LENGTH = 'max_length',
  PATTERN = 'pattern',
  MIN = 'min',
  MAX = 'max',
  EMAIL = 'email',
  URL = 'url',
  CUSTOM = 'custom',
}

export interface DisplayCondition {
  parameter: string;
  operator: ConditionOperator;
  value: unknown;
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
}

export interface ParameterOption {
  label: string;
  value: unknown;
  description?: string;
}

export interface OperationDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;

  // HTTP Configuration
  httpConfig: HttpConfiguration;

  // Parameters specific to this operation
  parameters: ParameterDefinition[];

  // Response handling
  responseHandling: ResponseHandlingConfig;
}

export interface HttpConfiguration {
  method: HttpMethod;
  endpoint: string;
  headers?: HeaderDefinition[];
  queryParams?: QueryParamDefinition[];
  bodyType?: BodyType;
  bodyTemplate?: string;
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export enum BodyType {
  JSON = 'json',
  FORM_DATA = 'form_data',
  FORM_URLENCODED = 'form_urlencoded',
  RAW = 'raw',
  NONE = 'none',
}

export interface HeaderDefinition {
  name: string;
  value: string;
  dynamic?: boolean;
}

export interface QueryParamDefinition {
  name: string;
  value: string;
  dynamic?: boolean;
  required?: boolean;
}

export interface ResponseHandlingConfig {
  dataPath?: string; // JSON path to extract data
  errorPath?: string; // JSON path to detect errors
  successCondition?: SuccessCondition;
  pagination?: PaginationConfig;
  transform?: TransformRule[];
}

export interface SuccessCondition {
  type: 'status_code' | 'response_field';
  statusCodes?: number[];
  field?: string;
  expectedValue?: unknown;
}

export interface PaginationConfig {
  type: 'offset' | 'cursor' | 'page';
  limitParam: string;
  offsetParam?: string;
  cursorParam?: string;
  pageParam?: string;
  totalPath?: string;
  nextPagePath?: string;
}

export interface TransformRule {
  from: string;
  to: string;
  transform?: string; // Expression to transform the value
}

export interface DataMappingRule {
  source: string;
  target: string;
  transform?: string;
  default?: unknown;
}

export interface ExampleDefinition {
  name: string;
  description: string;
  input: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
}

export interface GenerationSettings {
  language: 'typescript' | 'javascript';
  includeTests: boolean;
  includeDocumentation: boolean;
  codingStyle: 'modern' | 'classic';
  errorHandling: 'try-catch' | 'error-first';
  typescript: {
    strict: boolean;
    generateInterfaces: boolean;
  };
}

// OpenAPI Import Types
export interface OpenAPISpec {
  openapi: string;
  info: OpenAPIInfo;
  servers?: OpenAPIServer[];
  paths: Record<string, OpenAPIPath>;
  components?: OpenAPIComponents;
  security?: OpenAPISecurity[];
}

export interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
}

export interface OpenAPIServer {
  url: string;
  description?: string;
}

export interface OpenAPIPath {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  parameters?: OpenAPIParameter[];
}

export interface OpenAPIOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<string, OpenAPIResponse>;
  security?: OpenAPISecurity[];
  tags?: string[];
}

export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema?: OpenAPISchema;
}

export interface OpenAPIRequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, OpenAPIMediaType>;
}

export interface OpenAPIMediaType {
  schema?: OpenAPISchema;
  example?: unknown;
}

export interface OpenAPIResponse {
  description: string;
  content?: Record<string, OpenAPIMediaType>;
}

export interface OpenAPISchema {
  type?: string;
  format?: string;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  enum?: unknown[];
  items?: OpenAPISchema;
  default?: unknown;
}

export interface OpenAPIComponents {
  schemas?: Record<string, OpenAPISchema>;
  securitySchemes?: Record<string, OpenAPISecurityScheme>;
}

export interface OpenAPISecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: OpenAPIOAuthFlows;
}

export interface OpenAPIOAuthFlows {
  implicit?: OpenAPIOAuthFlow;
  password?: OpenAPIOAuthFlow;
  clientCredentials?: OpenAPIOAuthFlow;
  authorizationCode?: OpenAPIOAuthFlow;
}

export interface OpenAPIOAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes?: Record<string, string>;
}

export interface OpenAPISecurity {
  [key: string]: string[];
}

// Postman Import Types
export interface PostmanCollection {
  info: PostmanInfo;
  item: PostmanItem[];
  auth?: PostmanAuth;
  variable?: PostmanVariable[];
}

export interface PostmanInfo {
  name: string;
  description?: string;
  version?: string;
  schema: string;
}

export interface PostmanItem {
  name: string;
  description?: string;
  request?: PostmanRequest;
  item?: PostmanItem[]; // For folders
  event?: PostmanEvent[];
}

export interface PostmanRequest {
  method: string;
  header?: PostmanHeader[];
  url: PostmanUrl | string;
  body?: PostmanBody;
  auth?: PostmanAuth;
  description?: string;
}

export interface PostmanUrl {
  raw?: string;
  protocol?: string;
  host?: string[];
  path?: string[];
  query?: PostmanQueryParam[];
  variable?: PostmanVariable[];
}

export interface PostmanHeader {
  key: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface PostmanQueryParam {
  key: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface PostmanBody {
  mode?: 'raw' | 'urlencoded' | 'formdata' | 'file';
  raw?: string;
  urlencoded?: Array<{ key: string; value: string }>;
  formdata?: Array<{ key: string; value: string; type?: string }>;
}

export interface PostmanAuth {
  type: string;
  apikey?: Array<{ key: string; value: string }>;
  bearer?: Array<{ key: string; value: string }>;
  basic?: Array<{ key: string; value: string }>;
  oauth2?: Array<{ key: string; value: string }>;
}

export interface PostmanVariable {
  key: string;
  value: string;
  type?: string;
  description?: string;
}

export interface PostmanEvent {
  listen: string;
  script: {
    type: string;
    exec: string[];
  };
}

// GraphQL Import Types
export interface GraphQLSchema {
  schema: string;
  queries?: GraphQLOperation[];
  mutations?: GraphQLOperation[];
  subscriptions?: GraphQLOperation[];
  types?: GraphQLType[];
}

export interface GraphQLOperation {
  name: string;
  description?: string;
  arguments?: GraphQLArgument[];
  returnType: string;
}

export interface GraphQLArgument {
  name: string;
  type: string;
  description?: string;
  required: boolean;
  defaultValue?: unknown;
}

export interface GraphQLType {
  name: string;
  kind: 'OBJECT' | 'INPUT_OBJECT' | 'ENUM' | 'SCALAR' | 'INTERFACE' | 'UNION';
  description?: string;
  fields?: GraphQLField[];
  enumValues?: string[];
}

export interface GraphQLField {
  name: string;
  type: string;
  description?: string;
  required: boolean;
}

// Node Generation Result
export interface NodeGenerationResult {
  success: boolean;
  nodeId: string;
  files: GeneratedFile[];
  errors: GenerationError[];
  warnings: string[];
  metadata: GenerationMetadata;
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'config' | 'executor' | 'test' | 'docs' | 'types';
}

export interface GenerationError {
  type: 'validation' | 'generation' | 'compilation';
  message: string;
  location?: string;
  suggestion?: string;
}

export interface GenerationMetadata {
  generatedAt: Date;
  nodeCount: number;
  linesOfCode: number;
  estimatedComplexity: number;
  qualityScore: number;
}

// Node Testing Types
export interface NodeTestConfig {
  nodeId: string;
  testCases: NodeTestCase[];
  mockData?: Record<string, unknown>;
  timeout?: number;
}

export interface NodeTestCase {
  id: string;
  name: string;
  description: string;
  operation: string;
  input: Record<string, unknown>;
  expectedOutput?: Record<string, unknown>;
  expectedError?: string;
  assertions: TestAssertion[];
}

export interface TestAssertion {
  type: 'equals' | 'contains' | 'matches' | 'exists' | 'type' | 'custom';
  path: string;
  expected?: unknown;
  message: string;
}

export interface NodeTestResult {
  success: boolean;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  results: TestCaseResult[];
  duration: number;
}

export interface TestCaseResult {
  testCaseId: string;
  passed: boolean;
  duration: number;
  output?: unknown;
  error?: string;
  assertions: AssertionResult[];
}

export interface AssertionResult {
  passed: boolean;
  message: string;
  expected?: unknown;
  actual?: unknown;
}

// Wizard Types
export interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: WizardStepType;
  validation?: (data: WizardData) => boolean;
  optional?: boolean;
}

export enum WizardStepType {
  BASIC_INFO = 'basic_info',
  AUTHENTICATION = 'authentication',
  OPERATIONS = 'operations',
  PARAMETERS = 'parameters',
  DATA_MAPPING = 'data_mapping',
  TESTING = 'testing',
  REVIEW = 'review',
}

export interface WizardData {
  basicInfo?: {
    name: string;
    displayName: string;
    description: string;
    category: NodeCategory;
    icon: string;
    color: string;
  };
  authentication?: AuthenticationConfig;
  operations?: OperationDefinition[];
  parameters?: ParameterDefinition[];
  dataMapping?: {
    input: DataMappingRule[];
    output: DataMappingRule[];
  };
  testing?: NodeTestConfig;
  generationSettings?: GenerationSettings;
}

// Marketplace Publishing Types
export interface PublishConfig {
  nodeId: string;
  version: string;
  changelog: string;
  tags: string[];
  category: string;
  pricing: {
    type: 'free' | 'premium';
    price?: number;
  };
  visibility: 'public' | 'private' | 'unlisted';
  license: string;
  repository?: string;
}

export interface PublishResult {
  success: boolean;
  publishedId?: string;
  url?: string;
  errors?: string[];
  warnings?: string[];
  validationResults?: ValidationResult[];
}

export interface ValidationResult {
  category: 'security' | 'quality' | 'compatibility' | 'documentation';
  passed: boolean;
  score: number;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: string;
  fix?: string;
}
