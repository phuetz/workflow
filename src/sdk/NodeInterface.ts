/**
 * Node Interface - Core interfaces for custom node development
 */

export interface INodeExecutionData {
  json: Record<string, any>;
  binary?: Record<string, IBinaryData>;
  pairedItem?: IPairedItemData | IPairedItemData[];
  error?: Error;
}

export interface IBinaryData {
  data: string; // Base64 encoded
  mimeType: string;
  fileName?: string;
  fileExtension?: string;
  fileSize?: number;
  directory?: string;
  id?: string;
}

export interface IPairedItemData {
  item: number;
  input?: number;
}

export interface INodePropertyOptions {
  name: string;
  value: string | number | boolean;
  description?: string;
  action?: string;
}

export interface IDataObject {
  [key: string]: any;
}

export interface ICredentialDataDecryptedObject {
  [key: string]: any;
}

export interface INodeCredentialTestResult {
  status: 'OK' | 'Error';
  message: string;
}

export interface IWorkflowMetadata {
  id?: string;
  name?: string;
  active: boolean;
}

export interface ITriggerResponse {
  closeFunction?: () => Promise<void>;
  manualTriggerFunction?: () => Promise<void>;
  manualTriggerResponse?: () => Promise<INodeExecutionData[][]>;
}

export interface IWebhookResponseData {
  workflowData?: INodeExecutionData[][];
  webhookResponse?: any;
  noWebhookResponse?: boolean;
}

export type WorkflowExecuteMode =
  | 'integrated'
  | 'cli'
  | 'error'
  | 'internal'
  | 'manual'
  | 'retry'
  | 'trigger'
  | 'webhook';

export interface ResourceMapperFields {
  fields: ResourceMapperField[];
}

export interface ResourceMapperField {
  id: string;
  displayName: string;
  required?: boolean;
  defaultMatch?: boolean;
  canBeUsedToMatch?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  options?: INodePropertyOptions[];
}

/**
 * Node Execution Context - Provides methods and helpers for node execution
 */
export interface IExecutionContext {
  // Data access
  getInputData(inputIndex?: number, inputName?: string): INodeExecutionData[];
  getNodeParameter(parameterName: string, itemIndex: number, fallbackValue?: unknown): unknown;
  getWorkflowStaticData(type: string): IDataObject;

  // Credentials
  getCredentials(type: string, itemIndex?: number): Promise<ICredentialDataDecryptedObject>;

  // Workflow info
  getWorkflow(): IWorkflowMetadata;
  getExecutionId(): string;
  getMode(): WorkflowExecuteMode;
  getTimezone(): string;
  getRestApiUrl(): string;

  // Execution control
  continueOnFail(): boolean;
  evaluateExpression(expression: string, itemIndex: number): any;

  // Helpers
  helpers: INodeHelpers;
}

export interface INodeHelpers {
  // HTTP requests
  request(options: IHttpRequestOptions): Promise<any>;
  requestWithAuthentication(credentialType: string, options: IHttpRequestOptions, additionalCredentialOptions?: IAdditionalCredentialOptions): Promise<any>;
  requestOAuth1(credentialType: string, options: IHttpRequestOptions): Promise<any>;
  requestOAuth2(credentialType: string, options: IHttpRequestOptions, oAuth2Options?: IOAuth2Options): Promise<any>;

  // Binary data
  prepareBinaryData(buffer: Buffer, fileName?: string, mimeType?: string): Promise<IBinaryData>;
  getBinaryDataBuffer(itemIndex: number, propertyName: string): Promise<Buffer>;

  // Utilities
  returnJsonArray(data: IDataObject | IDataObject[]): INodeExecutionData[];
  normalizeItems(items: INodeExecutionData[]): INodeExecutionData[];
  constructExecutionMetaData(inputData: INodeExecutionData[], options?: { itemData?: IPairedItemData | IPairedItemData[] }): INodeExecutionData[];

  // Crypto
  generateRandomString(length: number): string;
  hashValue(value: string, algorithm?: 'md5' | 'sha1' | 'sha256' | 'sha512'): string;

  // File system (sandboxed)
  createWriteStream(fileName: string): Promise<any>;

  // HTTP client helpers
  httpRequest(options: IHttpRequestOptions): Promise<any>;
  httpRequestWithAuthentication(credentialType: string, options: IHttpRequestOptions): Promise<any>;
}

export interface IHttpRequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: any;
  qs?: Record<string, any>;
  json?: boolean;
  timeout?: number;
  encoding?: string | null;
  resolveWithFullResponse?: boolean;
  simple?: boolean;
  followRedirect?: boolean;
  followAllRedirects?: boolean;
  maxRedirects?: number;
  gzip?: boolean;
  returnFullResponse?: boolean;
  ignoreHttpStatusErrors?: boolean;
  proxy?: string;
}

export interface IAdditionalCredentialOptions {
  oauth2?: IOAuth2Options;
}

export interface IOAuth2Options {
  tokenType?: 'Bearer' | 'Basic';
  keyToIncludeInAccessTokenHeader?: string;
  includeCredentialsOnRefreshOnBody?: boolean;
}

/**
 * Load Options Functions - For dynamic node properties
 */
export interface ILoadOptionsFunctionsHelpers {
  request(options: IHttpRequestOptions): Promise<any>;
  requestWithAuthentication(credentialType: string, options: IHttpRequestOptions): Promise<any>;
}

/**
 * Credential Test Functions Helpers
 */
export interface ICredentialTestFunctionsHelpers {
  request(options: IHttpRequestOptions): Promise<any>;
}

/**
 * Node Definition Metadata
 */
export interface INodeTypeDescription {
  displayName: string;
  name: string;
  icon?: string;
  iconUrl?: string;
  group: string[];
  version: number | number[];
  subtitle?: string;
  description: string;
  defaults: {
    name: string;
    color?: string;
  };
  inputs: string[] | INodeInputConfiguration[];
  outputs: string[] | INodeOutputConfiguration[];
  credentials?: INodeCredentialDescription[];
  properties: INodeProperties[];
  webhooks?: IWebhookDescription[];
  polling?: boolean;
  triggerPanel?: ITriggerPanel;
  maxNodes?: number;
  usableAsTool?: boolean;
  codex?: {
    categories?: string[];
    subcategories?: Record<string, string[]>;
    resources?: {
      primaryDocumentation?: Array<{
        url: string;
      }>;
      credentialDocumentation?: Array<{
        url: string;
      }>;
    };
    alias?: string[];
  };
}

export interface INodeInputConfiguration {
  type: 'main' | 'ai';
  displayName?: string;
  required?: boolean;
  maxConnections?: number;
}

export interface INodeOutputConfiguration {
  type: 'main' | 'ai';
  displayName?: string;
}

export interface INodeCredentialDescription {
  name: string;
  required?: boolean;
  displayOptions?: IDisplayOptions;
  testedBy?: string | ICredentialTestRequest;
}

export interface ICredentialTestRequest {
  request: IHttpRequestOptions;
  rules?: Array<{
    type: 'responseCode' | 'responseSuccessBody' | 'responseErrorBody';
    properties: Record<string, any>;
  }>;
}

export interface INodeProperties {
  displayName: string;
  name: string;
  type: NodePropertyTypes;
  default: any;
  required?: boolean;
  description?: string;
  placeholder?: string;
  hint?: string;
  options?: INodePropertyOptions[];
  displayOptions?: IDisplayOptions;
  typeOptions?: INodePropertyTypeOptions;
  routing?: INodePropertyRouting;
  extractValue?: INodePropertyValueExtractor;
  validateType?: string;
  ignoreValidationDuringExecution?: boolean;
  noDataExpression?: boolean;
  requiresDataPath?: 'single' | 'multiple';
  isNodeSetting?: boolean;
}

export type NodePropertyTypes =
  | 'string'
  | 'number'
  | 'boolean'
  | 'json'
  | 'dateTime'
  | 'color'
  | 'options'
  | 'multiOptions'
  | 'collection'
  | 'fixedCollection'
  | 'credentials'
  | 'hidden'
  | 'notice'
  | 'resourceLocator'
  | 'resourceMapper'
  | 'curlImport'
  | 'authentication'
  | 'filter';

export interface IDisplayOptions {
  show?: Record<string, any[]>;
  hide?: Record<string, any[]>;
}

export interface INodePropertyTypeOptions {
  minValue?: number;
  maxValue?: number;
  numberPrecision?: number;
  password?: boolean;
  rows?: number;
  multipleValues?: boolean;
  multipleValueButtonText?: string;
  sortable?: boolean;
  loadOptionsMethod?: string;
  loadOptionsDependsOn?: string[];
  alwaysOpenEditWindow?: boolean;
  editor?: string;
  editorLanguage?: string;
  showVariableSelector?: boolean;
}

export interface INodePropertyRouting {
  request?: INodeRequestRouting;
  send?: INodeRequestSend;
  output?: INodeResponseRouting;
  operations?: Record<string, INodePropertyRouting>;
}

export interface INodeRequestRouting {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
  qs?: Record<string, any>;
}

export interface INodeRequestSend {
  type?: string;
  property?: string;
  value?: string;
  propertyInDotNotation?: boolean;
  paginate?: boolean | IPaginationOptions;
  preSend?: Array<(this: IExecutionContext, requestOptions: IHttpRequestOptions) => Promise<IHttpRequestOptions>>;
}

export interface IPaginationOptions {
  type: 'offset' | 'token' | 'url' | 'response';
  properties: Record<string, any>;
}

export interface INodeResponseRouting {
  postReceive?: INodePostReceiveAction[];
}

export interface INodePostReceiveAction {
  type: 'rootProperty' | 'set' | 'setKeyValue' | 'sort' | 'limit' | 'binaryData';
  properties: Record<string, any>;
  actions?: INodePostReceiveAction[];
}

export interface INodePropertyValueExtractor {
  type: 'regex' | 'jsonPath';
  regex?: string;
  jsonPath?: string;
}

export interface IWebhookDescription {
  name: string;
  httpMethod: string | string[];
  responseMode?: string;
  path?: string;
  isFullPath?: boolean;
  restartWebhook?: boolean;
}

export interface ITriggerPanel {
  header?: string;
  executionsHelp?: {
    inactive?: string;
    active?: string;
  };
  activationHint?: string;
}
