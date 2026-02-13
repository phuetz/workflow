/**
 * NodeBase - Base class for custom node implementation
 * Provides common functionality and utilities for all custom nodes
 */

import {
  INodeExecutionData,
  IDataObject,
  INodeTypeDescription,
  IExecutionContext,
  ICredentialDataDecryptedObject,
  INodeHelpers,
  IBinaryData,
  IPairedItemData,
} from './NodeInterface';

/**
 * Abstract base class for custom nodes
 * Extend this class to create your custom workflow nodes
 */
export abstract class NodeBase {
  /**
   * Node description - must be implemented by child classes
   */
  abstract description: INodeTypeDescription;

  /**
   * Main execution method - must be implemented by child classes
   * @param this - Execution context with helper methods
   * @returns Array of output data for each output connection
   */
  abstract execute(this: IExecutionContext): Promise<INodeExecutionData[][]>;

  /**
   * Optional: Trigger function for trigger nodes
   */
  trigger?(this: IExecutionContext): Promise<any>;

  /**
   * Optional: Webhook function for webhook nodes
   */
  webhook?(this: IExecutionContext): Promise<any>;

  /**
   * Optional: Poll function for polling nodes
   */
  poll?(this: IExecutionContext): Promise<INodeExecutionData[][]>;

  /**
   * Optional: Load options methods for dynamic dropdowns
   */
  methods?: {
    loadOptions?: Record<string, (this: IExecutionContext) => Promise<Array<{ name: string; value: string }>>>;
    credentialTest?: Record<string, (this: IExecutionContext, credential: ICredentialDataDecryptedObject) => Promise<any>>;
  };
}

/**
 * Helper functions available in execution context
 */
export class NodeHelpers implements INodeHelpers {
  constructor(private context: IExecutionContext) {}

  /**
   * Make an HTTP request
   */
  async request(options: any): Promise<any> {
    // Implementation delegated to execution engine
    throw new Error('Request method must be provided by execution context');
  }

  /**
   * Make an authenticated HTTP request
   */
  async requestWithAuthentication(credentialType: string, options: any, additionalCredentialOptions?: any): Promise<any> {
    const credentials = await this.context.getCredentials(credentialType);
    // Apply authentication to request
    return this.request({ ...options, auth: credentials });
  }

  /**
   * Make an OAuth1 authenticated request
   */
  async requestOAuth1(credentialType: string, options: any): Promise<any> {
    const credentials = await this.context.getCredentials(credentialType);
    // Apply OAuth1 to request
    return this.request({ ...options, oauth1: credentials });
  }

  /**
   * Make an OAuth2 authenticated request
   */
  async requestOAuth2(credentialType: string, options: any, oAuth2Options?: any): Promise<any> {
    const credentials = await this.context.getCredentials(credentialType);
    // Apply OAuth2 to request
    return this.request({ ...options, oauth2: credentials, ...oAuth2Options });
  }

  /**
   * Prepare binary data for storage
   */
  async prepareBinaryData(buffer: Buffer, fileName?: string, mimeType?: string): Promise<IBinaryData> {
    return {
      data: buffer.toString('base64'),
      mimeType: mimeType || 'application/octet-stream',
      fileName,
      fileSize: buffer.length,
    };
  }

  /**
   * Get binary data as buffer
   */
  async getBinaryDataBuffer(itemIndex: number, propertyName: string): Promise<Buffer> {
    const inputData = this.context.getInputData();
    const item = inputData[itemIndex];

    if (!item?.binary?.[propertyName]) {
      throw new Error(`Binary property "${propertyName}" does not exist on item ${itemIndex}`);
    }

    const binaryData = item.binary[propertyName];
    return Buffer.from(binaryData.data, 'base64');
  }

  /**
   * Convert data objects to execution data format
   */
  returnJsonArray(data: IDataObject | IDataObject[]): INodeExecutionData[] {
    const dataArray = Array.isArray(data) ? data : [data];
    return dataArray.map(item => ({ json: item }));
  }

  /**
   * Normalize items - ensure all items have proper structure
   */
  normalizeItems(items: INodeExecutionData[]): INodeExecutionData[] {
    return items.map(item => ({
      json: item.json || {},
      binary: item.binary,
      pairedItem: item.pairedItem,
    }));
  }

  /**
   * Construct execution metadata for items
   */
  constructExecutionMetaData(
    inputData: INodeExecutionData[],
    options?: { itemData?: IPairedItemData | IPairedItemData[] }
  ): INodeExecutionData[] {
    return inputData.map((item, index) => ({
      ...item,
      pairedItem: options?.itemData || { item: index },
    }));
  }

  /**
   * Generate a random string
   */
  generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Hash a value using specified algorithm
   */
  hashValue(value: string, algorithm: 'md5' | 'sha1' | 'sha256' | 'sha512' = 'sha256'): string {
    const crypto = require('crypto');
    return crypto.createHash(algorithm).update(value).digest('hex');
  }

  /**
   * Create a write stream (sandboxed)
   */
  async createWriteStream(fileName: string): Promise<any> {
    // Implementation must be sandboxed
    throw new Error('File system access must be granted via permissions');
  }

  /**
   * HTTP request helper
   */
  async httpRequest(options: any): Promise<any> {
    return this.request(options);
  }

  /**
   * HTTP request with authentication helper
   */
  async httpRequestWithAuthentication(credentialType: string, options: any): Promise<any> {
    return this.requestWithAuthentication(credentialType, options);
  }
}

/**
 * Base execution context implementation
 */
export class ExecutionContext implements IExecutionContext {
  private inputData: INodeExecutionData[][] = [];
  private nodeParameters: Record<string, any> = {};
  private staticData: IDataObject = {};
  private credentials: Record<string, ICredentialDataDecryptedObject> = {};
  private workflowMetadata: any;
  private executionId: string;
  private mode: any;
  public helpers: INodeHelpers;

  constructor(config: {
    inputData: INodeExecutionData[][];
    nodeParameters: Record<string, any>;
    credentials?: Record<string, ICredentialDataDecryptedObject>;
    workflowMetadata?: any;
    executionId?: string;
    mode?: any;
  }) {
    this.inputData = config.inputData;
    this.nodeParameters = config.nodeParameters;
    this.credentials = config.credentials || {};
    this.workflowMetadata = config.workflowMetadata;
    this.executionId = config.executionId || this.generateExecutionId();
    this.mode = config.mode || 'manual';
    this.helpers = new NodeHelpers(this);
  }

  getInputData(inputIndex = 0, inputName?: string): INodeExecutionData[] {
    return this.inputData[inputIndex] || [];
  }

  getNodeParameter(parameterName: string, itemIndex: number, fallbackValue?: unknown): unknown {
    const value = this.nodeParameters[parameterName];

    if (value === undefined) {
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }
      throw new Error(`Parameter "${parameterName}" is not defined`);
    }

    // Handle expressions
    if (typeof value === 'string' && value.includes('{{')) {
      return this.evaluateExpression(value, itemIndex);
    }

    return value;
  }

  getWorkflowStaticData(type: string): IDataObject {
    return this.staticData;
  }

  async getCredentials(type: string, itemIndex?: number): Promise<ICredentialDataDecryptedObject> {
    const credential = this.credentials[type];
    if (!credential) {
      throw new Error(`Credentials of type "${type}" are not set`);
    }
    return credential;
  }

  getWorkflow(): any {
    return this.workflowMetadata || { id: 'unknown', name: 'Unknown Workflow', active: true };
  }

  getExecutionId(): string {
    return this.executionId;
  }

  getMode(): any {
    return this.mode;
  }

  getTimezone(): string {
    return process.env.TIMEZONE || 'UTC';
  }

  getRestApiUrl(): string {
    return process.env.REST_API_URL || 'http://localhost:3000/api';
  }

  continueOnFail(): boolean {
    return this.nodeParameters.continueOnFail === true;
  }

  evaluateExpression(expression: string, itemIndex: number): any {
    // Simple expression evaluation (should use proper expression engine)
    const inputData = this.getInputData();
    const item = inputData[itemIndex];

    // Replace {{ $json.fieldName }} with actual value
    const matches = expression.match(/\{\{\s*\$json\.(\w+)\s*\}\}/g);
    if (matches && item) {
      let result = expression;
      matches.forEach(match => {
        const field = match.replace(/\{\{\s*\$json\.|s*\}\}/g, '');
        const value = item.json[field];
        result = result.replace(match, String(value));
      });
      return result;
    }

    return expression;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Utility functions for node development
 */
export class NodeUtils {
  /**
   * Validate node parameters
   */
  static validateParameters(parameters: Record<string, any>, requiredParams: string[]): void {
    for (const param of requiredParams) {
      if (parameters[param] === undefined || parameters[param] === null || parameters[param] === '') {
        throw new Error(`Required parameter "${param}" is missing`);
      }
    }
  }

  /**
   * Extract value from nested object using dot notation
   */
  static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set value in nested object using dot notation
   */
  static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Merge multiple data objects
   */
  static mergeData(...objects: IDataObject[]): IDataObject {
    return Object.assign({}, ...objects);
  }

  /**
   * Deep clone an object
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Format error for user display
   */
  static formatError(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Parse JSON safely
   */
  static safeJsonParse(str: string, fallback: any = null): any {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }

  /**
   * Stringify JSON safely
   */
  static safeJsonStringify(obj: any, pretty = false): string {
    try {
      return JSON.stringify(obj, null, pretty ? 2 : 0);
    } catch {
      return '{}';
    }
  }
}
