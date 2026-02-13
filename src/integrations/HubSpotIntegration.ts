/**
 * HubSpot CRM Integration
 * Complete integration with HubSpot CRM for contacts, companies, deals, and marketing
 */

import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';

// Types
export interface HubSpotConfig {
  apiKey?: string;
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string[];
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
}

// Contact Types
export interface HubSpotContact {
  id: string;
  properties: ContactProperties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  associations?: HubSpotAssociations;
}

export interface ContactProperties {
  email?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  jobtitle?: string;
  lifecyclestage?: LifecycleStage;
  hs_lead_status?: LeadStatus;
  hubspot_owner_id?: string;
  notes_last_contacted?: string;
  notes_last_updated?: string;
  num_contacted_notes?: string;
  [key: string]: any;
}

export type LifecycleStage = 
  | 'subscriber'
  | 'lead'
  | 'marketingqualifiedlead'
  | 'salesqualifiedlead'
  | 'opportunity'
  | 'customer'
  | 'evangelist'
  | 'other';

export type LeadStatus = 
  | 'NEW'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'OPEN_DEAL'
  | 'UNQUALIFIED'
  | 'ATTEMPTED_TO_CONTACT'
  | 'CONNECTED'
  | 'BAD_TIMING';

// Company Types
export interface HubSpotCompany {
  id: string;
  properties: CompanyProperties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  associations?: HubSpotAssociations;
}

export interface CompanyProperties {
  name?: string;
  domain?: string;
  industry?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  numberofemployees?: number;
  annualrevenue?: number;
  description?: string;
  type?: string;
  hubspot_owner_id?: string;
  hs_lead_status?: string;
  lifecyclestage?: LifecycleStage;
  [key: string]: any;
}

// Deal Types
export interface HubSpotDeal {
  id: string;
  properties: DealProperties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  associations?: HubSpotAssociations;
}

export interface DealProperties {
  dealname?: string;
  amount?: number;
  dealstage?: string;
  pipeline?: string;
  closedate?: string;
  dealtype?: 'newbusiness' | 'existingbusiness';
  hubspot_owner_id?: string;
  description?: string;
  hs_priority?: 'low' | 'medium' | 'high';
  hs_forecast_category?: 'pipeline' | 'bestcase' | 'commit' | 'closed' | 'omitted';
  hs_deal_stage_probability?: number;
  num_associated_contacts?: number;
  [key: string]: any;
}

// Ticket Types
export interface HubSpotTicket {
  id: string;
  properties: TicketProperties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  associations?: HubSpotAssociations;
}

export interface TicketProperties {
  subject?: string;
  content?: string;
  hs_pipeline?: string;
  hs_pipeline_stage?: string;
  hs_ticket_priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  hs_ticket_category?: string;
  hubspot_owner_id?: string;
  source_type?: string;
  [key: string]: any;
}

// Product Types
export interface HubSpotProduct {
  id: string;
  properties: ProductProperties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface ProductProperties {
  name?: string;
  description?: string;
  price?: number;
  hs_sku?: string;
  hs_cost_of_goods_sold?: number;
  hs_recurring_billing_period?: string;
  [key: string]: any;
}

// Line Item Types
export interface HubSpotLineItem {
  id: string;
  properties: LineItemProperties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  associations?: HubSpotAssociations;
}

export interface LineItemProperties {
  name?: string;
  quantity?: number;
  price?: number;
  amount?: number;
  discount?: number;
  tax?: number;
  hs_product_id?: string;
  hs_recurring_billing_period?: string;
  [key: string]: any;
}

// Quote Types
export interface HubSpotQuote {
  id: string;
  properties: QuoteProperties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  associations?: HubSpotAssociations;
}

export interface QuoteProperties {
  hs_title?: string;
  hs_expiration_date?: string;
  hs_status?: 'DRAFT' | 'APPROVAL_NOT_NEEDED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SENT' | 'ACCEPTED' | 'LOST';
  hs_public_url_key?: string;
  hs_esign_enabled?: boolean;
  hs_payment_enabled?: boolean;
  [key: string]: any;
}

// Task Types
export interface HubSpotTask {
  id: string;
  properties: TaskProperties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  associations?: HubSpotAssociations;
}

export interface TaskProperties {
  hs_task_subject?: string;
  hs_task_body?: string;
  hs_task_status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'WAITING' | 'COMPLETED' | 'DEFERRED';
  hs_task_priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  hs_task_type?: 'EMAIL' | 'CALL' | 'TODO';
  hs_timestamp?: string;
  hubspot_owner_id?: string;
  [key: string]: any;
}

// Note Types
export interface HubSpotNote {
  id: string;
  properties: NoteProperties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  associations?: HubSpotAssociations;
}

export interface NoteProperties {
  hs_note_body?: string;
  hs_timestamp?: string;
  hubspot_owner_id?: string;
  [key: string]: any;
}

// Email Types
export interface HubSpotEmail {
  id: string;
  properties: EmailProperties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  associations?: HubSpotAssociations;
}

export interface EmailProperties {
  hs_email_subject?: string;
  hs_email_text?: string;
  hs_email_html?: string;
  hs_email_status?: string;
  hs_email_direction?: 'INCOMING' | 'OUTGOING';
  hs_email_from?: string;
  hs_email_to?: string;
  [key: string]: any;
}

// Meeting Types
export interface HubSpotMeeting {
  id: string;
  properties: MeetingProperties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  associations?: HubSpotAssociations;
}

export interface MeetingProperties {
  hs_meeting_title?: string;
  hs_meeting_body?: string;
  hs_meeting_start_time?: string;
  hs_meeting_end_time?: string;
  hs_meeting_location?: string;
  hs_meeting_outcome?: string;
  hubspot_owner_id?: string;
  [key: string]: any;
}

// Call Types
export interface HubSpotCall {
  id: string;
  properties: CallProperties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  associations?: HubSpotAssociations;
}

export interface CallProperties {
  hs_call_title?: string;
  hs_call_body?: string;
  hs_call_status?: 'BUSY' | 'CALLING_CRM_USER' | 'CANCELED' | 'COMPLETED' | 'CONNECTING' | 'FAILED' | 'IN_PROGRESS' | 'NO_ANSWER' | 'QUEUED' | 'RINGING';
  hs_call_direction?: 'INBOUND' | 'OUTBOUND';
  hs_call_disposition?: string;
  hs_call_duration?: number;
  hs_call_from_number?: string;
  hs_call_to_number?: string;
  hs_timestamp?: string;
  hubspot_owner_id?: string;
  [key: string]: any;
}

// Association Types
export interface HubSpotAssociations {
  contacts?: { results: Association[] };
  companies?: { results: Association[] };
  deals?: { results: Association[] };
  tickets?: { results: Association[] };
  products?: { results: Association[] };
  line_items?: { results: Association[] };
  quotes?: { results: Association[] };
}

export interface Association {
  id: string;
  type: string;
}

// Pipeline Types
export interface HubSpotPipeline {
  id: string;
  label: string;
  displayOrder: number;
  active: boolean;
  stages: PipelineStage[];
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface PipelineStage {
  id: string;
  label: string;
  displayOrder: number;
  metadata: {
    isClosed: boolean;
    probability?: number;
  };
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

// Owner Types
export interface HubSpotOwner {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  teams?: OwnerTeam[];
}

export interface OwnerTeam {
  id: string;
  name: string;
  primary: boolean;
}

// Workflow Types
export interface HubSpotWorkflow {
  id: string;
  name: string;
  type: 'CONTACT_FLOW' | 'DEAL_FLOW' | 'COMPANY_FLOW' | 'TICKET_FLOW';
  enabled: boolean;
  insertedAt: number;
  updatedAt: number;
  contactListIds?: number[];
  actions: WorkflowAction[];
}

export interface WorkflowAction {
  id: string;
  type: string;
  properties: any;
  delay?: WorkflowDelay;
}

export interface WorkflowDelay {
  days: number;
  hours: number;
  minutes: number;
}

// Form Types
export interface HubSpotForm {
  guid: string;
  name: string;
  cssClass?: string;
  redirect?: string;
  submitText: string;
  followUpId?: string;
  notifyRecipients?: string;
  leadNurturingCampaignId?: string;
  formFieldGroups: FormFieldGroup[];
  createdAt: number;
  updatedAt: number;
  archived: boolean;
}

export interface FormFieldGroup {
  fields: FormField[];
  default: boolean;
  isSmartGroup: boolean;
  richText?: { content: string };
}

export interface FormField {
  name: string;
  label: string;
  type: string;
  fieldType: string;
  description?: string;
  required: boolean;
  enabled: boolean;
  hidden: boolean;
  defaultValue?: string;
  placeholder?: string;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
}

export interface FormFieldOption {
  label: string;
  value: string;
  displayOrder: number;
  doubleData: number;
  hidden: boolean;
  description?: string;
  readOnly: boolean;
}

export interface FormFieldValidation {
  name: string;
  message: string;
  data?: string;
  useDefaultBlockList: boolean;
  blockedEmailDomains?: string[];
}

// Search Types
export interface SearchQuery {
  filterGroups: FilterGroup[];
  sorts?: string[];
  query?: string;
  properties?: string[];
  limit?: number;
  after?: number;
}

export interface FilterGroup {
  filters: Filter[];
}

export interface Filter {
  propertyName: string;
  operator: FilterOperator;
  value?: any;
  highValue?: any;
}

export type FilterOperator = 
  | 'EQ' | 'NEQ' | 'LT' | 'LTE' | 'GT' | 'GTE' 
  | 'BETWEEN' | 'IN' | 'NOT_IN' | 'HAS_PROPERTY' | 'NOT_HAS_PROPERTY'
  | 'CONTAINS_TOKEN' | 'NOT_CONTAINS_TOKEN';

// Batch Types
export interface BatchInput<T> {
  inputs: T[];
}

export interface BatchResult<T> {
  status: 'COMPLETE' | 'PENDING' | 'PROCESSING';
  results: T[];
  errors?: any[];
}

// Main Integration Class
export class HubSpotIntegration extends EventEmitter {
  private static instance: HubSpotIntegration;
  private client: AxiosInstance;
  private config: HubSpotConfig;
  private accessToken?: string;
  private refreshToken?: string;

  private constructor(config: HubSpotConfig) {
    super();
    this.config = config;
    this.accessToken = config.accessToken;
    this.client = this.createClient();
  }

  public static getInstance(config?: HubSpotConfig): HubSpotIntegration {
    if (!HubSpotIntegration.instance) {
      if (!config) {
        throw new Error('HubSpotIntegration requires configuration on first initialization');
      }
      HubSpotIntegration.instance = new HubSpotIntegration(config);
    }
    return HubSpotIntegration.instance;
  }

  private createClient(): AxiosInstance {
    const headers: any = {
      'Content-Type': 'application/json'
    };

    if (this.config.apiKey) {
      headers['hapikey'] = this.config.apiKey;
    } else if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return axios.create({
      baseURL: this.config.baseUrl || 'https://api.hubapi.com',
      timeout: this.config.timeout || 30000,
      headers
    });
  }

  // OAuth Methods
  public async getAuthorizationUrl(state?: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.config.clientId!,
      redirect_uri: this.config.redirectUri!,
      scope: this.config.scopes?.join(' ') || '',
      state: state || ''
    });

    return `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
  }

  public async getAccessToken(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    try {
      const response = await axios.post('https://api.hubapi.com/oauth/v1/token', {
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        code
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      
      // Update client headers
      this.client.defaults.headers['Authorization'] = `Bearer ${this.accessToken}`;
      
      this.emit('auth:success', response.data);
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'getAccessToken', error });
      throw error;
    }
  }

  public async refreshAccessToken(): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    try {
      const response = await axios.post('https://api.hubapi.com/oauth/v1/token', {
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        refresh_token: this.refreshToken
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      
      // Update client headers
      this.client.defaults.headers['Authorization'] = `Bearer ${this.accessToken}`;
      
      this.emit('auth:refreshed', response.data);
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'refreshAccessToken', error });
      throw error;
    }
  }

  // Contact Methods
  public async createContact(properties: ContactProperties): Promise<HubSpotContact> {
    try {
      const response = await this.client.post('/crm/v3/objects/contacts', {
        properties
      });
      
      this.emit('contact:created', response.data);
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'createContact', error });
      throw error;
    }
  }

  public async getContact(
    contactId: string,
    options: {
      properties?: string[];
      associations?: string[];
    } = {}
  ): Promise<HubSpotContact> {
    try {
      const params = new URLSearchParams();
      if (options.properties) {
        params.append('properties', options.properties.join(','));
      }
      if (options.associations) {
        params.append('associations', options.associations.join(','));
      }

      const response = await this.client.get(
        `/crm/v3/objects/contacts/${contactId}?${params.toString()}`
      );
      
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'getContact', error });
      throw error;
    }
  }

  public async updateContact(
    contactId: string,
    properties: Partial<ContactProperties>
  ): Promise<HubSpotContact> {
    try {
      const response = await this.client.patch(
        `/crm/v3/objects/contacts/${contactId}`,
        { properties }
      );
      
      this.emit('contact:updated', response.data);
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'updateContact', error });
      throw error;
    }
  }

  public async deleteContact(contactId: string): Promise<void> {
    try {
      await this.client.delete(`/crm/v3/objects/contacts/${contactId}`);
      this.emit('contact:deleted', { contactId });
    } catch (error) {
      this.emit('error', { operation: 'deleteContact', error });
      throw error;
    }
  }

  public async searchContacts(query: SearchQuery): Promise<{
    total: number;
    results: HubSpotContact[];
  }> {
    try {
      const response = await this.client.post(
        '/crm/v3/objects/contacts/search',
        query
      );
      
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'searchContacts', error });
      throw error;
    }
  }

  // Company Methods
  public async createCompany(properties: CompanyProperties): Promise<HubSpotCompany> {
    try {
      const response = await this.client.post('/crm/v3/objects/companies', {
        properties
      });
      
      this.emit('company:created', response.data);
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'createCompany', error });
      throw error;
    }
  }

  public async getCompany(
    companyId: string,
    options: {
      properties?: string[];
      associations?: string[];
    } = {}
  ): Promise<HubSpotCompany> {
    try {
      const params = new URLSearchParams();
      if (options.properties) {
        params.append('properties', options.properties.join(','));
      }
      if (options.associations) {
        params.append('associations', options.associations.join(','));
      }

      const response = await this.client.get(
        `/crm/v3/objects/companies/${companyId}?${params.toString()}`
      );
      
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'getCompany', error });
      throw error;
    }
  }

  public async updateCompany(
    companyId: string,
    properties: Partial<CompanyProperties>
  ): Promise<HubSpotCompany> {
    try {
      const response = await this.client.patch(
        `/crm/v3/objects/companies/${companyId}`,
        { properties }
      );
      
      this.emit('company:updated', response.data);
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'updateCompany', error });
      throw error;
    }
  }

  public async deleteCompany(companyId: string): Promise<void> {
    try {
      await this.client.delete(`/crm/v3/objects/companies/${companyId}`);
      this.emit('company:deleted', { companyId });
    } catch (error) {
      this.emit('error', { operation: 'deleteCompany', error });
      throw error;
    }
  }

  // Deal Methods
  public async createDeal(properties: DealProperties): Promise<HubSpotDeal> {
    try {
      const response = await this.client.post('/crm/v3/objects/deals', {
        properties
      });
      
      this.emit('deal:created', response.data);
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'createDeal', error });
      throw error;
    }
  }

  public async getDeal(
    dealId: string,
    options: {
      properties?: string[];
      associations?: string[];
    } = {}
  ): Promise<HubSpotDeal> {
    try {
      const params = new URLSearchParams();
      if (options.properties) {
        params.append('properties', options.properties.join(','));
      }
      if (options.associations) {
        params.append('associations', options.associations.join(','));
      }

      const response = await this.client.get(
        `/crm/v3/objects/deals/${dealId}?${params.toString()}`
      );
      
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'getDeal', error });
      throw error;
    }
  }

  public async updateDeal(
    dealId: string,
    properties: Partial<DealProperties>
  ): Promise<HubSpotDeal> {
    try {
      const response = await this.client.patch(
        `/crm/v3/objects/deals/${dealId}`,
        { properties }
      );
      
      this.emit('deal:updated', response.data);
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'updateDeal', error });
      throw error;
    }
  }

  public async deleteDeal(dealId: string): Promise<void> {
    try {
      await this.client.delete(`/crm/v3/objects/deals/${dealId}`);
      this.emit('deal:deleted', { dealId });
    } catch (error) {
      this.emit('error', { operation: 'deleteDeal', error });
      throw error;
    }
  }

  // Ticket Methods
  public async createTicket(properties: TicketProperties): Promise<HubSpotTicket> {
    try {
      const response = await this.client.post('/crm/v3/objects/tickets', {
        properties
      });
      
      this.emit('ticket:created', response.data);
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'createTicket', error });
      throw error;
    }
  }

  // Task Methods
  public async createTask(properties: TaskProperties): Promise<HubSpotTask> {
    try {
      const response = await this.client.post('/crm/v3/objects/tasks', {
        properties
      });
      
      this.emit('task:created', response.data);
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'createTask', error });
      throw error;
    }
  }

  // Note Methods
  public async createNote(properties: NoteProperties): Promise<HubSpotNote> {
    try {
      const response = await this.client.post('/crm/v3/objects/notes', {
        properties
      });
      
      this.emit('note:created', response.data);
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'createNote', error });
      throw error;
    }
  }

  // Association Methods
  public async createAssociation(
    fromObjectType: string,
    fromObjectId: string,
    toObjectType: string,
    toObjectId: string,
    associationType: string
  ): Promise<void> {
    try {
      await this.client.put(
        `/crm/v3/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}/${toObjectId}/${associationType}`
      );
      
      this.emit('association:created', {
        fromObjectType,
        fromObjectId,
        toObjectType,
        toObjectId,
        associationType
      });
    } catch (error) {
      this.emit('error', { operation: 'createAssociation', error });
      throw error;
    }
  }

  public async removeAssociation(
    fromObjectType: string,
    fromObjectId: string,
    toObjectType: string,
    toObjectId: string,
    associationType: string
  ): Promise<void> {
    try {
      await this.client.delete(
        `/crm/v3/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}/${toObjectId}/${associationType}`
      );
      
      this.emit('association:removed', {
        fromObjectType,
        fromObjectId,
        toObjectType,
        toObjectId,
        associationType
      });
    } catch (error) {
      this.emit('error', { operation: 'removeAssociation', error });
      throw error;
    }
  }

  // Pipeline Methods
  public async getPipelines(objectType: string): Promise<HubSpotPipeline[]> {
    try {
      const response = await this.client.get(`/crm/v3/pipelines/${objectType}`);
      return response.data.results;
    } catch (error) {
      this.emit('error', { operation: 'getPipelines', error });
      throw error;
    }
  }

  public async createPipeline(
    objectType: string,
    pipeline: Partial<HubSpotPipeline>
  ): Promise<HubSpotPipeline> {
    try {
      const response = await this.client.post(
        `/crm/v3/pipelines/${objectType}`,
        pipeline
      );
      
      this.emit('pipeline:created', response.data);
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'createPipeline', error });
      throw error;
    }
  }

  // Owner Methods
  public async getOwners(): Promise<HubSpotOwner[]> {
    try {
      const response = await this.client.get('/crm/v3/owners');
      return response.data.results;
    } catch (error) {
      this.emit('error', { operation: 'getOwners', error });
      throw error;
    }
  }

  // Form Methods
  public async getForms(): Promise<HubSpotForm[]> {
    try {
      const response = await this.client.get('/marketing/v3/forms');
      return response.data.results;
    } catch (error) {
      this.emit('error', { operation: 'getForms', error });
      throw error;
    }
  }

  public async submitForm(
    portalId: string,
    formGuid: string,
    fields: { name: string; value: string }[],
    context?: {
      hutk?: string;
      ipAddress?: string;
      pageUrl?: string;
      pageName?: string;
    }
  ): Promise<void> {
    try {
      const data = {
        fields,
        context: {
          hutk: context?.hutk,
          ipAddress: context?.ipAddress,
          pageUrl: context?.pageUrl,
          pageName: context?.pageName
        }
      };

      await axios.post(
        `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formGuid}`,
        data
      );
      
      this.emit('form:submitted', { portalId, formGuid });
    } catch (error) {
      this.emit('error', { operation: 'submitForm', error });
      throw error;
    }
  }

  // Batch Operations
  public async batchCreateContacts(
    contacts: ContactProperties[]
  ): Promise<BatchResult<HubSpotContact>> {
    try {
      const response = await this.client.post('/crm/v3/objects/contacts/batch/create', {
        inputs: contacts.map(properties => ({ properties }))
      });
      
      this.emit('contacts:batchCreated', { count: contacts.length });
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'batchCreateContacts', error });
      throw error;
    }
  }

  public async batchUpdateContacts(
    updates: { id: string; properties: Partial<ContactProperties> }[]
  ): Promise<BatchResult<HubSpotContact>> {
    try {
      const response = await this.client.post('/crm/v3/objects/contacts/batch/update', {
        inputs: updates
      });
      
      this.emit('contacts:batchUpdated', { count: updates.length });
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'batchUpdateContacts', error });
      throw error;
    }
  }

  public async batchDeleteContacts(contactIds: string[]): Promise<void> {
    try {
      await this.client.post('/crm/v3/objects/contacts/batch/archive', {
        inputs: contactIds.map(id => ({ id }))
      });
      
      this.emit('contacts:batchDeleted', { count: contactIds.length });
    } catch (error) {
      this.emit('error', { operation: 'batchDeleteContacts', error });
      throw error;
    }
  }

  // Workflow Methods
  public async getWorkflows(): Promise<HubSpotWorkflow[]> {
    try {
      const response = await this.client.get('/automation/v3/workflows');
      return response.data.workflows;
    } catch (error) {
      this.emit('error', { operation: 'getWorkflows', error });
      throw error;
    }
  }

  public async enrollContactInWorkflow(
    workflowId: string,
    contactEmail: string
  ): Promise<void> {
    try {
      await this.client.post(`/automation/v2/workflows/${workflowId}/enrollments/contacts/${contactEmail}`);
      
      this.emit('workflow:enrolled', { workflowId, contactEmail });
    } catch (error) {
      this.emit('error', { operation: 'enrollContactInWorkflow', error });
      throw error;
    }
  }

  // Analytics Methods
  public async getAnalytics(
    objectType: string,
    options: {
      start: string;
      end: string;
      metrics: string[];
      dimensions?: string[];
      filters?: any[];
    }
  ): Promise<any> {
    try {
      const response = await this.client.post(`/analytics/v2/reports/${objectType}`, options);
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'getAnalytics', error });
      throw error;
    }
  }

  // Helper Methods
  public createContactFromEmail(email: string, additionalProperties: Partial<ContactProperties> = {}): Promise<HubSpotContact> {
    return this.createContact({
      email,
      ...additionalProperties
    });
  }

  public async associateContactToCompany(contactId: string, companyId: string): Promise<void> {
    return this.createAssociation('contacts', contactId, 'companies', companyId, '1');
  }

  public async associateContactToDeal(contactId: string, dealId: string): Promise<void> {
    return this.createAssociation('contacts', contactId, 'deals', dealId, '3');
  }

  public async getContactByEmail(email: string): Promise<HubSpotContact | null> {
    const result = await this.searchContacts({
      filterGroups: [{
        filters: [{
          propertyName: 'email',
          operator: 'EQ',
          value: email
        }]
      }],
      limit: 1
    });
    
    return result.results.length > 0 ? result.results[0] : null;
  }

  public async getCompanyByDomain(domain: string): Promise<HubSpotCompany | null> {
    const result = await this.searchCompanies({
      filterGroups: [{
        filters: [{
          propertyName: 'domain',
          operator: 'EQ',
          value: domain
        }]
      }],
      limit: 1
    });
    
    return result.results.length > 0 ? result.results[0] : null;
  }

  private async searchCompanies(query: SearchQuery): Promise<{
    total: number;
    results: HubSpotCompany[];
  }> {
    try {
      const response = await this.client.post(
        '/crm/v3/objects/companies/search',
        query
      );
      
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'searchCompanies', error });
      throw error;
    }
  }
}

// Export singleton getter
export default function getHubSpotIntegration(config?: HubSpotConfig): HubSpotIntegration {
  return HubSpotIntegration.getInstance(config);
}