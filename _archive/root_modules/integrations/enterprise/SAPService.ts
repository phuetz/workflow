/**
 * SAP Service Integration
 * Enterprise SAP system integration
 */

import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';

export interface SAPConfig {
  host: string;
  port?: number;
  client: string;
  username: string;
  password: string;
  language?: string;
  systemId?: string;
  routerString?: string;
  useSAPUI5?: boolean;
  oDataVersion?: '2.0' | '4.0';
  csrf?: boolean;
  timeout?: number;
}

export interface SAPODataConfig {
  serviceUrl: string;
  username: string;
  password: string;
  version: '2.0' | '4.0';
  csrf: boolean;
}

export interface RFC_PARAMETER {
  name: string;
  type: 'IMPORT' | 'EXPORT' | 'CHANGING' | 'TABLE';
  value?: unknown;
  structure?: RFC_STRUCTURE;
}

export interface RFC_STRUCTURE {
  [key: string]: unknown;
}

export interface RFC_TABLE {
  name: string;
  rows: unknown[];
}

export interface SAPDocument {
  documentType: string;
  documentNumber: string;
  companyCode: string;
  fiscalYear?: string;
  data: Record<string, unknown>;
}

export interface SAPMasterData {
  type: 'CUSTOMER' | 'VENDOR' | 'MATERIAL' | 'EMPLOYEE' | 'COST_CENTER';
  key: string;
  data: Record<string, unknown>;
}

export class SAPService extends EventEmitter {
  private config: SAPConfig;
  private httpClient: AxiosInstance;
  private csrfToken: string = '';
  private sessionCookies: string[] = [];
  private connected: boolean = false;
  
  constructor(config: SAPConfig) {
    super();
    this.config = config;
    this.initializeHttpClient();
  }
  
  private initializeHttpClient(): void {
    this.httpClient = axios.create({
      baseURL: `http://${this.config.host}:${this.config.port || 8000}`,
      timeout: this.config.timeout || 30000,
      auth: {
        username: this.config.username,
        password: this.config.password
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // Request interceptor
    this.httpClient.interceptors.request.use(
      (config) => {
        // Add SAP client
        config.params = config.params || {};
        config.params['sap-client'] = this.config.client;
        
        if (this.config.language) {
          config.params['sap-language'] = this.config.language;
        }
        
        // Add CSRF token if available
        if (this.csrfToken && this.config.csrf) {
          config.headers['X-CSRF-Token'] = this.csrfToken;
        }
        
        // Add session cookies
        if (this.sessionCookies.length > 0) {
          config.headers['Cookie'] = this.sessionCookies.join('; ');
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        // Extract and store session cookies
        const setCookieHeader = response.headers['set-cookie'];
        if (setCookieHeader) {
          this.sessionCookies = setCookieHeader.map(cookie => 
            cookie.split(';')[0]
          );
        }
        
        // Extract CSRF token
        const csrfToken = response.headers['x-csrf-token'];
        if (csrfToken && csrfToken !== 'fetch') {
          this.csrfToken = csrfToken;
        }
        
        return response;
      },
      (error) => {
        this.emit('error', error);
        return Promise.reject(error);
      }
    );
  }
  
  // Connection Management
  
  public async connect(): Promise<void> {
    try {
      // Test connection with a simple service call
      await this.httpClient.get('/sap/bc/rest/test');
      
      // Fetch CSRF token if required
      if (this.config.csrf) {
        await this.fetchCSRFToken();
      }
      
      this.connected = true;
      
      this.emit('connected', {
        host: this.config.host,
        client: this.config.client
      });
      
    } catch (error) {
      this.emit('connectionError', error);
      throw new Error(`Failed to connect to SAP system: ${error.message}`);
    }
  }
  
  public disconnect(): void {
    this.connected = false;
    this.csrfToken = '';
    this.sessionCookies = [];
    
    this.emit('disconnected');
  }
  
  private async fetchCSRFToken(): Promise<void> {
    try {
      await this.httpClient.get('/sap/bc/rest/csrf', {
        headers: {
          'X-CSRF-Token': 'fetch'
        }
      });
    } catch (error) {
      console.warn('Could not fetch CSRF token:', error.message);
    }
  }
  
  // RFC Function Calls
  
  public async callRFC(
    functionName: string,
    parameters: RFC_PARAMETER[] = [],
    tables: RFC_TABLE[] = []
  ): Promise<unknown> {
    if (!this.connected) {
      throw new Error('Not connected to SAP system');
    }
    
    const rfcCall = {
      function: functionName,
      parameters: this.formatRFCParameters(parameters),
      tables: this.formatRFCTables(tables)
    };
    
    try {
      const response = await this.httpClient.post('/sap/bc/rest/rfc/call', rfcCall);
      
      this.emit('rfcCalled', {
        function: functionName,
        success: true,
        duration: response.headers['x-response-time']
      });
      
      return response.data;
      
    } catch (error) {
      this.emit('rfcError', {
        function: functionName,
        error: error.message
      });
      throw error;
    }
  }
  
  private formatRFCParameters(parameters: RFC_PARAMETER[]): Record<string, unknown> {
    const formatted: Record<string, unknown> = {};
    
    for (const param of parameters) {
      formatted[param.name] = {
        type: param.type,
        value: param.value,
        structure: param.structure
      };
    }
    
    return formatted;
  }
  
  private formatRFCTables(tables: RFC_TABLE[]): Record<string, unknown> {
    const formatted: Record<string, unknown> = {};
    
    for (const table of tables) {
      formatted[table.name] = table.rows;
    }
    
    return formatted;
  }
  
  // Common SAP Operations
  
  // Financial Document Operations
  
  public async createFinancialDocument(document: SAPDocument): Promise<string> {
    const parameters: RFC_PARAMETER[] = [
      {
        name: 'DOCUMENTHEADER',
        type: 'IMPORT',
        structure: {
          DOC_TYPE: document.documentType,
          COMP_CODE: document.companyCode,
          FISC_YEAR: document.fiscalYear || new Date().getFullYear().toString(),
          ...document.data
        }
      }
    ];
    
    const result = await this.callRFC('BAPI_ACC_DOCUMENT_POST', parameters);
    
    if (result.RETURN && result.RETURN.TYPE === 'E') {
      throw new Error(`SAP Error: ${result.RETURN.MESSAGE}`);
    }
    
    this.emit('documentCreated', {
      documentType: document.documentType,
      documentNumber: result.DOCUMENTNUMBER
    });
    
    return result.DOCUMENTNUMBER;
  }
  
  public async getFinancialDocument(
    companyCode: string,
    documentNumber: string,
    fiscalYear: string
  ): Promise<unknown> {
    const parameters: RFC_PARAMETER[] = [
      {
        name: 'COMPANYCODE',
        type: 'IMPORT',
        value: companyCode
      },
      {
        name: 'DOCUMENTNUMBER',
        type: 'IMPORT',
        value: documentNumber
      },
      {
        name: 'FISCALYEAR',
        type: 'IMPORT',
        value: fiscalYear
      }
    ];
    
    const result = await this.callRFC('BAPI_ACC_DOCUMENT_DISPLAY', parameters);
    
    return result.DOCUMENTHEADER;
  }
  
  // Master Data Operations
  
  public async createCustomer(customerData: SAPMasterData): Promise<string> {
    if (customerData.type !== 'CUSTOMER') {
      throw new Error('Invalid master data type for customer creation');
    }
    
    const parameters: RFC_PARAMETER[] = [
      {
        name: 'PERSONALDATA',
        type: 'IMPORT',
        structure: customerData.data
      }
    ];
    
    const result = await this.callRFC('BAPI_CUSTOMER_CREATEFROMDATA1', parameters);
    
    if (result.RETURN && result.RETURN.TYPE === 'E') {
      throw new Error(`SAP Error: ${result.RETURN.MESSAGE}`);
    }
    
    this.emit('customerCreated', {
      customerNumber: result.CUSTOMERNO
    });
    
    return result.CUSTOMERNO;
  }
  
  public async getCustomer(customerNumber: string): Promise<unknown> {
    const parameters: RFC_PARAMETER[] = [
      {
        name: 'CUSTOMERNO',
        type: 'IMPORT',
        value: customerNumber
      }
    ];
    
    const result = await this.callRFC('BAPI_CUSTOMER_GETDETAIL2', parameters);
    
    return {
      personalData: result.PERSONALDATA,
      companyData: result.COMPANYDATA,
      addressData: result.ADDRESSDATA
    };
  }
  
  public async createMaterial(materialData: SAPMasterData): Promise<string> {
    if (materialData.type !== 'MATERIAL') {
      throw new Error('Invalid master data type for material creation');
    }
    
    const parameters: RFC_PARAMETER[] = [
      {
        name: 'HEADDATA',
        type: 'IMPORT',
        structure: {
          MATERIAL: materialData.key,
          ...materialData.data
        }
      }
    ];
    
    const result = await this.callRFC('BAPI_MATERIAL_CREATEDATA', parameters);
    
    if (result.RETURN && result.RETURN.TYPE === 'E') {
      throw new Error(`SAP Error: ${result.RETURN.MESSAGE}`);
    }
    
    this.emit('materialCreated', {
      materialNumber: result.MATERIAL
    });
    
    return result.MATERIAL;
  }
  
  // Purchase Order Operations
  
  public async createPurchaseOrder(poData: {
    vendor: string;
    companyCode: string;
    purchaseOrg: string;
    purchaseGroup: string;
    items: Array<{
      material: string;
      quantity: number;
      price: number;
      plant: string;
    }>;
  }): Promise<string> {
    const poHeader = {
      VENDOR: poData.vendor,
      COMP_CODE: poData.companyCode,
      PURCH_ORG: poData.purchaseOrg,
      PUR_GROUP: poData.purchaseGroup,
      DOC_TYPE: 'NB'
    };
    
    const poItems = poData.items.map((item, index) => ({
      PO_ITEM: (index + 1).toString().padStart(5, '0'),
      MATERIAL: item.material,
      QUANTITY: item.quantity.toString(),
      NET_PRICE: item.price.toString(),
      PLANT: item.plant
    }));
    
    const parameters: RFC_PARAMETER[] = [
      {
        name: 'POHEADER',
        type: 'IMPORT',
        structure: poHeader
      }
    ];
    
    const tables: RFC_TABLE[] = [
      {
        name: 'POITEM',
        rows: poItems
      }
    ];
    
    const result = await this.callRFC('BAPI_PO_CREATE1', parameters, tables);
    
    if (result.RETURN && result.RETURN.TYPE === 'E') {
      throw new Error(`SAP Error: ${result.RETURN.MESSAGE}`);
    }
    
    // Commit the transaction
    await this.callRFC('BAPI_TRANSACTION_COMMIT');
    
    this.emit('purchaseOrderCreated', {
      poNumber: result.PONUMBER
    });
    
    return result.PONUMBER;
  }
  
  // Sales Order Operations
  
  public async createSalesOrder(soData: {
    customer: string;
    salesOrg: string;
    distChannel: string;
    division: string;
    items: Array<{
      material: string;
      quantity: number;
      plant: string;
    }>;
  }): Promise<string> {
    const orderHeader = {
      SOLD_TO_PARTY: soData.customer,
      SALES_ORG: soData.salesOrg,
      DISTR_CHAN: soData.distChannel,
      DIVISION: soData.division,
      DOC_TYPE: 'OR'
    };
    
    const orderItems = soData.items.map((item, index) => ({
      ITM_NUMBER: (index + 1).toString().padStart(6, '0'),
      MATERIAL: item.material,
      REQ_QTY: item.quantity.toString(),
      PLANT: item.plant
    }));
    
    const parameters: RFC_PARAMETER[] = [
      {
        name: 'ORDER_HEADER_IN',
        type: 'IMPORT',
        structure: orderHeader
      }
    ];
    
    const tables: RFC_TABLE[] = [
      {
        name: 'ORDER_ITEMS_IN',
        rows: orderItems
      }
    ];
    
    const result = await this.callRFC('BAPI_SALESORDER_CREATEFROMDAT2', parameters, tables);
    
    if (result.RETURN && result.RETURN.TYPE === 'E') {
      throw new Error(`SAP Error: ${result.RETURN.MESSAGE}`);
    }
    
    // Commit the transaction
    await this.callRFC('BAPI_TRANSACTION_COMMIT');
    
    this.emit('salesOrderCreated', {
      soNumber: result.SALESDOCUMENT
    });
    
    return result.SALESDOCUMENT;
  }
  
  // Inventory Management
  
  public async checkMaterialStock(
    material: string,
    plant: string,
    storageLocation?: string
  ): Promise<unknown> {
    const parameters: RFC_PARAMETER[] = [
      {
        name: 'MATERIAL',
        type: 'IMPORT',
        value: material
      },
      {
        name: 'PLANT',
        type: 'IMPORT',
        value: plant
      }
    ];
    
    if (storageLocation) {
      parameters.push({
        name: 'STGE_LOC',
        type: 'IMPORT',
        value: storageLocation
      });
    }
    
    const result = await this.callRFC('BAPI_MATERIAL_STOCK_REQ_LIST', parameters);
    
    return result.STOCK_OVERVIEW;
  }
  
  public async postGoodsMovement(movementData: {
    documentDate: string;
    postingDate: string;
    items: Array<{
      material: string;
      plant: string;
      storageLocation: string;
      movementType: string;
      quantity: number;
      unit: string;
    }>;
  }): Promise<string> {
    const goodsMovementHeader = {
      DOC_DATE: movementData.documentDate,
      PSTNG_DATE: movementData.postingDate
    };
    
    const goodsMovementItems = movementData.items.map(item => ({
      MATERIAL: item.material,
      PLANT: item.plant,
      STGE_LOC: item.storageLocation,
      MOVE_TYPE: item.movementType,
      ENTRY_QNT: item.quantity.toString(),
      ENTRY_UOM: item.unit
    }));
    
    const parameters: RFC_PARAMETER[] = [
      {
        name: 'GOODSMVT_HEADER',
        type: 'IMPORT',
        structure: goodsMovementHeader
      }
    ];
    
    const tables: RFC_TABLE[] = [
      {
        name: 'GOODSMVT_ITEM',
        rows: goodsMovementItems
      }
    ];
    
    const result = await this.callRFC('BAPI_GOODSMVT_CREATE', parameters, tables);
    
    if (result.RETURN && result.RETURN.TYPE === 'E') {
      throw new Error(`SAP Error: ${result.RETURN.MESSAGE}`);
    }
    
    // Commit the transaction
    await this.callRFC('BAPI_TRANSACTION_COMMIT');
    
    this.emit('goodsMovementPosted', {
      documentNumber: result.MATERIALDOCUMENT
    });
    
    return result.MATERIALDOCUMENT;
  }
  
  // HR Operations
  
  public async getEmployeeInfo(employeeNumber: string): Promise<unknown> {
    const parameters: RFC_PARAMETER[] = [
      {
        name: 'EMPLOYEE_ID',
        type: 'IMPORT',
        value: employeeNumber
      }
    ];
    
    const result = await this.callRFC('BAPI_EMPLOYEE_GETDATA', parameters);
    
    return {
      personalData: result.PERSONAL_DATA,
      organizationalData: result.ORG_DATA,
      addressData: result.ADDRESS_DATA
    };
  }
  
  // Batch Processing
  
  public async processBatch(operations: Array<{
    type: 'RFC' | 'BAPI';
    functionName: string;
    parameters?: RFC_PARAMETER[];
    tables?: RFC_TABLE[];
  }>): Promise<unknown[]> {
    const results: unknown[] = [];
    
    for (const operation of operations) {
      try {
        const result = await this.callRFC(
          operation.functionName,
          operation.parameters,
          operation.tables
        );
        
        results.push({
          success: true,
          result
        });
      } catch (error) {
        results.push({
          success: false,
          error: error.message
        });
      }
    }
    
    this.emit('batchProcessed', {
      operationCount: operations.length,
      successCount: results.filter(r => r.success).length
    });
    
    return results;
  }
  
  // OData Services (for SAP UI5/Fiori integration)
  
  public async createODataService(config: SAPODataConfig): Promise<void> {
    // This would set up OData service connectivity
    // Implementation would depend on specific SAP version and services
    
    this.emit('oDataServiceCreated', {
      serviceUrl: config.serviceUrl,
      version: config.version
    });
  }
  
  public async executeODataQuery(
    entitySet: string,
    filters?: Record<string, unknown>,
    select?: string[],
    expand?: string[]
  ): Promise<unknown> {
    let url = `/sap/opu/odata/sap/${entitySet}`;
    const params: string[] = [];
    
    if (filters) {
      const filterString = Object.entries(filters)
        .map(([key, value]) => `${key} eq '${value}'`)
        .join(' and ');
      params.push(`$filter=${encodeURIComponent(filterString)}`);
    }
    
    if (select) {
      params.push(`$select=${select.join(',')}`);
    }
    
    if (expand) {
      params.push(`$expand=${expand.join(',')}`);
    }
    
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    
    try {
      const response = await this.httpClient.get(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      return response.data;
    } catch (error) {
      this.emit('oDataError', { entitySet, error });
      throw error;
    }
  }
  
  // Utility Methods
  
  public isConnected(): boolean {
    return this.connected;
  }
  
  public getSystemInfo(): {
    host: string;
    client: string;
    systemId?: string;
    connected: boolean;
  } {
    return {
      host: this.config.host,
      client: this.config.client,
      systemId: this.config.systemId,
      connected: this.connected
    };
  }
  
  // Error Handling Helper
  
  private handleSAPError(sapReturn: unknown): void {
    if (sapReturn && sapReturn.TYPE === 'E') {
      throw new Error(`SAP Error ${sapReturn.NUMBER}: ${sapReturn.MESSAGE}`);
    }
    
    if (sapReturn && sapReturn.TYPE === 'W') {
      this.emit('warning', {
        number: sapReturn.NUMBER,
        message: sapReturn.MESSAGE
      });
    }
  }
}