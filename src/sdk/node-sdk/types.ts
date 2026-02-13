/**
 * Custom Node SDK Types
 * All type definitions for creating custom workflow nodes
 */

// ============================================================================
// NODE DEFINITION TYPES
// ============================================================================

export interface CustomNodeDefinition {
  name: string;
  displayName: string;
  version: string;
  description: string;
  icon?: string | NodeIcon;
  color?: string;
  category: NodeCategory;
  subcategory?: string;
  documentationUrl?: string;
  properties: NodeProperty[];
  credentials?: CredentialDefinition[];
  inputs?: InputDefinition[];
  outputs?: OutputDefinition[];
  methods?: NodeMethod[];
  webhooks?: WebhookDefinition[];
  triggers?: TriggerDefinition[];
  polling?: PollingDefinition;
  codex?: NodeCodex;
  metadata: NodeMetadata;
}

export interface NodeIcon {
  type: 'file' | 'font' | 'svg';
  value: string;
}

export type NodeCategory =
  | 'core' | 'data' | 'communication' | 'marketing' | 'sales'
  | 'productivity' | 'development' | 'utility' | 'ai'
  | 'analytics' | 'finance' | 'hr' | 'custom';

// ============================================================================
// PROPERTY TYPES
// ============================================================================

export interface NodeProperty {
  name: string;
  displayName: string;
  type: PropertyType;
  default?: any;
  required?: boolean;
  description?: string;
  placeholder?: string;
  options?: PropertyOption[];
  displayOptions?: DisplayOptions;
  validation?: PropertyValidation;
  typeOptions?: TypeOptions;
  routing?: RoutingOptions;
}

export type PropertyType =
  | 'string' | 'number' | 'boolean' | 'json' | 'dateTime'
  | 'color' | 'options' | 'multiOptions' | 'collection'
  | 'fixedCollection' | 'credentials' | 'hidden' | 'notice';

export interface PropertyOption {
  name: string;
  value: string | number | boolean;
  description?: string;
  icon?: string;
  action?: string;
}

export interface DisplayOptions {
  show?: Record<string, any[]>;
  hide?: Record<string, any[]>;
}

export interface PropertyValidation {
  type: ValidationType;
  properties?: Record<string, any>;
  message?: string;
}

export type ValidationType = 'regex' | 'email' | 'url' | 'number' | 'dateTime' | 'custom';

export interface TypeOptions {
  multipleValues?: boolean;
  multipleValueButtonText?: string;
  minValue?: number;
  maxValue?: number;
  numberPrecision?: number;
  password?: boolean;
  rows?: number;
  alwaysOpenEditWindow?: boolean;
  editor?: string;
  loadOptionsMethod?: string;
  loadOptionsDependsOn?: string[];
}

export interface RoutingOptions {
  request?: RequestRouting;
  output?: OutputRouting;
}

export interface RequestRouting {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
  qs?: Record<string, any>;
  auth?: AuthRouting;
}

export interface AuthRouting {
  type: 'none' | 'basic' | 'bearer' | 'oauth1' | 'oauth2' | 'apiKey';
  properties?: Record<string, any>;
}

export interface OutputRouting {
  postReceive?: PostReceiveAction[];
}

export interface PostReceiveAction {
  type: 'rootProperty' | 'set' | 'sort' | 'limit' | 'aggregate' | 'setKeyValue';
  properties?: Record<string, any>;
}

// ============================================================================
// CREDENTIAL TYPES
// ============================================================================

export interface CredentialDefinition {
  name: string;
  displayName: string;
  required?: boolean;
  type: string;
  testedBy?: CredentialTestDefinition;
}

export interface CredentialTestDefinition {
  request: RequestDefinition;
  rules?: TestRule[];
}

export interface RequestDefinition {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  qs?: Record<string, any>;
}

export interface TestRule {
  type: 'responseCode' | 'responseSuccessBody' | 'responseErrorBody';
  properties: Record<string, any>;
}

// ============================================================================
// INPUT/OUTPUT TYPES
// ============================================================================

export interface InputDefinition {
  type: 'main' | 'ai';
  displayName?: string;
  required?: boolean;
  maxConnections?: number;
}

export interface OutputDefinition {
  type: 'main' | 'ai';
  displayName?: string;
}

// ============================================================================
// METHOD/WEBHOOK/TRIGGER TYPES
// ============================================================================

export interface NodeMethod {
  name: string;
  async?: boolean;
  description?: string;
}

export interface WebhookDefinition {
  name: string;
  httpMethod: string;
  responseMode: 'onReceived' | 'lastNode' | 'responseNode';
  path?: string;
  restartWebhook?: boolean;
  isFullPath?: boolean;
}

export interface TriggerDefinition {
  name: string;
  pollInterval?: number;
  description?: string;
}

export interface PollingDefinition {
  interval: number;
  description?: string;
}

// ============================================================================
// CODEX/METADATA TYPES
// ============================================================================

export interface NodeCodex {
  categories?: string[];
  subcategories?: Record<string, string[]>;
  resources?: CodexResource[];
  alias?: string[];
}

export interface CodexResource {
  name: string;
  url: string;
}

export interface NodeMetadata {
  author: string;
  license?: string;
  keywords?: string[];
  homepage?: string;
  repository?: string;
  bugs?: string;
  funding?: string;
}

// ============================================================================
// NODE IMPLEMENTATION TYPES
// ============================================================================

export interface INodeType {
  description: CustomNodeDefinition;
  execute?(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
  trigger?(this: ITriggerFunctions): Promise<ITriggerResponse | undefined>;
  webhook?(this: IWebhookFunctions): Promise<IWebhookResponseData>;
  poll?(this: IPollFunctions): Promise<INodeExecutionData[][]>;
  methods?: {
    loadOptions?: { [key: string]: (this: ILoadOptionsFunctions) => Promise<INodePropertyOptions[]> };
    credentialTest?: { [key: string]: (this: ICredentialTestFunctions, credential: ICredentialDataDecryptedObject) => Promise<INodeCredentialTestResult> };
    resourceMapping?: { [key: string]: (this: ILoadOptionsFunctions) => Promise<ResourceMapperFields> };
  };
}

// ============================================================================
// EXECUTION FUNCTION TYPES
// ============================================================================

export interface IExecuteFunctions {
  getInputData(inputIndex?: number, inputName?: string): INodeExecutionData[];
  getNodeParameter(parameterName: string, itemIndex: number, fallbackValue?: unknown): unknown;
  getWorkflowStaticData(type: string): IDataObject;
  getCredentials(type: string): Promise<ICredentialDataDecryptedObject>;
  getRestApiUrl(): string;
  getTimezone(): string;
  getWorkflow(): IWorkflowMetadata;
  getExecutionId(): string;
  getMode(): WorkflowExecuteMode;
  continueOnFail(): boolean;
  helpers: IExecuteFunctionsHelpers;
}

export interface ITriggerFunctions extends IExecuteFunctions {
  emit(data: INodeExecutionData[][]): void;
  emitError(error: Error): void;
  getNodeWebhookUrl(name: string): string | undefined;
}

export interface IWebhookFunctions extends IExecuteFunctions {
  getBodyData(): IDataObject;
  getHeaderData(): IDataObject;
  getQueryData(): IDataObject;
  getRequestObject(): any;
  getResponseObject(): any;
  getNodeWebhookUrl(name: string): string | undefined;
  prepareOutputData(outputData: INodeExecutionData[], outputIndex?: number): Promise<void>;
}

export interface IPollFunctions extends IExecuteFunctions {
  getNodeStaticData(type: string): IDataObject;
}

export interface ILoadOptionsFunctions {
  getNodeParameter(parameterName: string, fallbackValue?: unknown): unknown;
  getCurrentNodeParameter(parameterName: string): unknown;
  getCurrentNodeParameters(): IDataObject;
  getCredentials(type: string): Promise<ICredentialDataDecryptedObject>;
  getTimezone(): string;
  getRestApiUrl(): string;
  helpers: ILoadOptionsFunctionsHelpers;
}

export interface ICredentialTestFunctions {
  getNodeParameter(parameterName: string, fallbackValue?: unknown): unknown;
  getCredentials(type: string): Promise<ICredentialDataDecryptedObject>;
  helpers: ICredentialTestFunctionsHelpers;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface IExecuteFunctionsHelpers {
  httpRequest(options: IHttpRequestOptions): Promise<any>;
  httpRequestWithAuthentication(credentialsType: string, options: IHttpRequestOptions): Promise<any>;
  prepareBinaryData(binaryData: Buffer, fileName?: string, mimeType?: string): Promise<IBinaryData>;
  getBinaryDataBuffer(itemIndex: number, propertyName: string): Promise<Buffer>;
  copyBinaryFile(): Promise<void>;
  binaryToString(body: Buffer, encoding?: string): string;
  request(options: IHttpRequestOptions): Promise<any>;
  requestWithAuthentication(credentialsType: string, options: IHttpRequestOptions): Promise<any>;
  createDeferredPromise<T>(): IDeferredPromise<T>;
  returnJsonArray(data: IDataObject | IDataObject[]): INodeExecutionData[];
  normalizeItems(items: INodeExecutionData[] | IDataObject[]): INodeExecutionData[];
  constructExecutionMetaData(inputData: INodeExecutionData[], options: { itemData: IPairedItemData }): INodeExecutionData[];
}

export interface ILoadOptionsFunctionsHelpers {
  httpRequest(options: IHttpRequestOptions): Promise<any>;
  httpRequestWithAuthentication(credentialsType: string, options: IHttpRequestOptions): Promise<any>;
  request(options: IHttpRequestOptions): Promise<any>;
  requestWithAuthentication(credentialsType: string, options: IHttpRequestOptions): Promise<any>;
}

export interface ICredentialTestFunctionsHelpers {
  httpRequest(options: IHttpRequestOptions): Promise<any>;
  request(options: IHttpRequestOptions): Promise<any>;
}

// ============================================================================
// DATA TYPES
// ============================================================================

export interface INodeExecutionData {
  json: IDataObject;
  binary?: IBinaryKeyData;
  error?: NodeOperationError;
  pairedItem?: IPairedItemData | IPairedItemData[];
}

export interface IDataObject {
  [key: string]: any;
}

export interface IBinaryData {
  data: string;
  mimeType: string;
  fileName?: string;
  directory?: string;
  fileExtension?: string;
}

export interface IBinaryKeyData {
  [key: string]: IBinaryData;
}

export interface IPairedItemData {
  item: number;
  input?: number;
}

export interface ITriggerResponse {
  closeFunction?: () => Promise<void>;
  manualTriggerFunction?: () => Promise<void>;
}

export interface IWebhookResponseData {
  workflowData?: INodeExecutionData[][];
  webhookResponse?: any;
  noWebhookResponse?: boolean;
}

export interface INodePropertyOptions {
  name: string;
  value: string | number;
  description?: string;
  url?: string;
  action?: string;
}

export interface INodeCredentialTestResult {
  status: 'OK' | 'Error';
  message: string;
}

export interface ICredentialDataDecryptedObject {
  [key: string]: any;
}

export interface IWorkflowMetadata {
  id: string;
  name: string;
  active: boolean;
}

export interface IHttpRequestOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  qs?: Record<string, any>;
  uri?: string;
  json?: boolean;
  auth?: any;
  timeout?: number;
  rejectUnauthorized?: boolean;
  proxy?: string;
  encoding?: string;
  formData?: any;
  form?: any;
  pool?: any;
  followRedirect?: boolean;
  followAllRedirects?: boolean;
  gzip?: boolean;
  jar?: boolean;
  resolveWithFullResponse?: boolean;
  simple?: boolean;
}

export interface IDeferredPromise<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

export interface NodeOperationError extends Error {
  node?: string;
  cause?: Error;
  timestamp?: number;
  context?: IDataObject;
  description?: string;
  functionality?: string;
  httpCode?: string;
  level?: 'warning' | 'error';
  tags?: Record<string, string>;
}

export interface ResourceMapperFields {
  fields: ResourceMapperField[];
}

export interface ResourceMapperField {
  id: string;
  displayName: string;
  required?: boolean;
  defaultMatch?: boolean;
  display?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'dateTime' | 'json';
  canBeUsedToMatch?: boolean;
  removed?: boolean;
}

export type WorkflowExecuteMode =
  | 'cli' | 'error' | 'integrated' | 'internal'
  | 'manual' | 'retry' | 'trigger' | 'webhook';

// ============================================================================
// PACKAGE TYPES
// ============================================================================

export interface NodePackage {
  name: string;
  version: string;
  description?: string;
  main: string;
  types?: string;
  author?: string | NodeAuthor;
  license?: string;
  homepage?: string;
  repository?: string | NodeRepository;
  bugs?: string | NodeBugs;
  keywords?: string[];
  engines?: NodeEngines;
  files?: string[];
  publishConfig?: PublishConfig;
  n8n?: N8nConfig;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface NodeAuthor {
  name: string;
  email?: string;
  url?: string;
}

export interface NodeRepository {
  type: string;
  url: string;
}

export interface NodeBugs {
  url: string;
  email?: string;
}

export interface NodeEngines {
  node?: string;
  npm?: string;
}

export interface PublishConfig {
  access?: 'public' | 'restricted';
  registry?: string;
  tag?: string;
}

export interface N8nConfig {
  nodes?: string[];
  credentials?: string[];
  minimumVersion?: string;
}

// ============================================================================
// TESTING TYPES
// ============================================================================

export interface NodeTestSuite {
  name: string;
  description?: string;
  node: string;
  testCases: NodeTestCase[];
  setup?: TestSetup;
  teardown?: TestTeardown;
}

export interface NodeTestCase {
  name: string;
  description?: string;
  input: INodeExecutionData[][];
  parameters: Record<string, any>;
  credentials?: Record<string, any>;
  expectedOutput?: INodeExecutionData[][];
  expectedError?: string;
  timeout?: number;
  skip?: boolean;
}

export interface TestSetup {
  commands?: string[];
  env?: Record<string, string>;
  files?: TestFile[];
}

export interface TestTeardown {
  commands?: string[];
  removeFiles?: string[];
}

export interface TestFile {
  path: string;
  content: string;
}

export interface NodeDebugInfo {
  executionTime: number;
  memoryUsage: number;
  inputSize: number;
  outputSize: number;
  errors: NodeOperationError[];
  warnings: string[];
  logs: string[];
}

// ============================================================================
// PUBLISHING TYPES
// ============================================================================

export interface PublishOptions {
  registry?: string;
  tag?: string;
  access?: 'public' | 'restricted';
  dryRun?: boolean;
  otp?: string;
}

export interface MarketplaceMetadata {
  featured?: boolean;
  trending?: boolean;
  verified?: boolean;
  downloads?: number;
  rating?: number;
  reviews?: number;
  tags?: string[];
  screenshots?: string[];
  video?: string;
  changelog?: string;
  support?: string;
  documentation?: string;
}

// ============================================================================
// INTERNAL TYPES
// ============================================================================

export interface NodeGeneratorConfig {
  name: string;
  displayName?: string;
  description?: string;
  category: NodeCategory;
  author?: string;
  includeAuthentication?: boolean;
  includeWebhook?: boolean;
  includeTrigger?: boolean;
  includePolling?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PackageOptions {
  minify?: boolean;
  sourceMaps?: boolean;
  external?: string[];
}

export interface TestResults {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  suites: SuiteResult[];
}

export interface SuiteResult {
  name: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  testCases: TestCaseResult[];
}

export interface TestCaseResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}
