/**
 * Typeform Integration
 * Complete integration with Typeform for forms, surveys, and quizzes
 */

import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';

// Types
export interface TypeformConfig {
  apiKey: string;
  workspaceId?: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  webhookUrl?: string;
}

export interface TypeformWorkspace {
  id: string;
  name: string;
  default: boolean;
  shared: boolean;
  members: WorkspaceMember[];
  forms_count: number;
  self: { href: string };
}

export interface WorkspaceMember {
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
}

export interface TypeformForm {
  id: string;
  title: string;
  workspace?: { href: string };
  theme?: { href: string };
  settings: FormSettings;
  welcome_screens?: WelcomeScreen[];
  thankyou_screens?: ThankYouScreen[];
  fields: FormField[];
  logic?: LogicJump[];
  variables?: Variable[];
  hidden?: string[];
  tracking?: TrackingInfo;
  _links: FormLinks;
  created_at: string;
  last_updated_at: string;
  published_at?: string;
}

export interface FormSettings {
  language: string;
  progress_bar: 'proportion' | 'percentage' | 'none';
  show_progress_bar: boolean;
  show_typeform_branding: boolean;
  show_time_to_complete: boolean;
  show_number_of_submissions?: boolean;
  show_question_number: boolean;
  show_key_hint_on_choices: boolean;
  pro_subdomain_enabled: boolean;
  capabilities: {
    e2e_encryption: {
      enabled: boolean;
      modifiable: boolean;
    };
  };
  redirect_after_submit_url?: string;
  google_analytics?: string;
  facebook_pixel?: string;
  google_tag_manager?: string;
  is_public: boolean;
  is_trial: boolean;
  meta: {
    title?: string;
    description?: string;
    image?: { href: string };
  };
}

export interface WelcomeScreen {
  id?: string;
  ref?: string;
  title: string;
  properties?: {
    description?: string;
    show_button: boolean;
    button_text?: string;
  };
  attachment?: Attachment;
  layout?: ScreenLayout;
}

export interface ThankYouScreen {
  id?: string;
  ref?: string;
  title: string;
  properties?: {
    show_button: boolean;
    button_text?: string;
    button_mode?: 'default' | 'redirect' | 'reload';
    redirect_url?: string;
    share_icons?: boolean;
  };
  attachment?: Attachment;
  layout?: ScreenLayout;
}

export interface FormField {
  id?: string;
  ref?: string;
  title: string;
  type: FieldType;
  properties?: FieldProperties;
  validations?: FieldValidations;
  attachment?: Attachment;
  layout?: FieldLayout;
}

export type FieldType = 
  | 'multiple_choice'
  | 'picture_choice'
  | 'dropdown'
  | 'opinion_scale'
  | 'rating'
  | 'nps'
  | 'yes_no'
  | 'short_text'
  | 'long_text'
  | 'email'
  | 'phone_number'
  | 'number'
  | 'date'
  | 'website'
  | 'file_upload'
  | 'payment'
  | 'legal'
  | 'ranking'
  | 'matrix'
  | 'statement'
  | 'group';

export interface FieldProperties {
  description?: string;
  choices?: Choice[];
  allow_multiple_selection?: boolean;
  randomize?: boolean;
  allow_other_choice?: boolean;
  vertical_alignment?: boolean;
  supersized?: boolean;
  show_labels?: boolean;
  alphabetical_order?: boolean;
  hide_marks?: boolean;
  start_at_one?: boolean;
  steps?: number;
  labels?: {
    left?: string;
    center?: string;
    right?: string;
  };
  fields?: FormField[];
  separator?: string;
  structure?: string;
  price?: Price;
  currency?: string;
  button_text?: string;
}

export interface Choice {
  id?: string;
  ref?: string;
  label: string;
  attachment?: Attachment;
}

export interface FieldValidations {
  required?: boolean;
  max_length?: number;
  min_length?: number;
  max_value?: number;
  min_value?: number;
  max_selection?: number;
  min_selection?: number;
  regex?: string;
}

export interface Attachment {
  type: 'image' | 'video';
  href?: string;
  scale?: number;
  properties?: {
    description?: string;
    focal_point?: { x: number; y: number };
  };
}

export interface FieldLayout {
  type: 'float' | 'split';
  attachment?: Attachment;
}

export interface ScreenLayout {
  type: 'stack' | 'float' | 'split';
  attachment?: Attachment;
  placement?: 'left' | 'right';
}

export interface LogicJump {
  type: 'field' | 'hidden';
  ref?: string;
  actions: LogicAction[];
}

export interface LogicAction {
  action: 'jump' | 'add' | 'subtract' | 'multiply' | 'divide';
  details: {
    to?: { type: 'field' | 'thankyou' | 'url'; value: string };
    target?: { type: 'variable'; value: string };
    value?: { type: 'constant' | 'variable' | 'field'; value: any };
  };
  condition?: LogicCondition;
}

export interface LogicCondition {
  op: LogicOperator;
  vars?: LogicCondition[];
  field?: { ref: string };
  value?: any;
}

export type LogicOperator = 
  | 'and' | 'or' | 'equal' | 'not_equal' 
  | 'lower_than' | 'lower_equal_than' 
  | 'greater_than' | 'greater_equal_than'
  | 'is' | 'is_not' | 'contains' | 'not_contains'
  | 'begins_with' | 'ends_with' | 'answered' | 'not_answered'
  | 'matches_regex' | 'in' | 'not_in';

export interface Variable {
  key: string;
  type: 'number' | 'text';
  value?: any;
}

export interface TrackingInfo {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface Price {
  type: 'fixed' | 'variable';
  value: string;
}

export interface FormLinks {
  display: string;
  responses?: string;
}

export interface TypeformResponse {
  landing_id: string;
  token: string;
  response_id: string;
  landed_at: string;
  submitted_at: string;
  metadata: ResponseMetadata;
  answers: Answer[];
  hidden?: { [key: string]: any };
  calculated?: {
    score: number;
  };
  variables?: Variable[];
}

export interface ResponseMetadata {
  user_agent: string;
  platform: string;
  referer: string;
  network_id: string;
  browser: string;
}

export interface Answer {
  field: {
    id: string;
    ref: string;
    type: FieldType;
  };
  type: AnswerType;
  text?: string;
  email?: string;
  url?: string;
  phone_number?: string;
  number?: number;
  boolean?: boolean;
  date?: string;
  choice?: {
    id?: string;
    ref?: string;
    label: string;
    other?: string;
  };
  choices?: {
    ids?: string[];
    refs?: string[];
    labels: string[];
    other?: string;
  };
  file_url?: string;
  payment?: {
    amount: string;
    last4: string;
    name: string;
    success: boolean;
  };
}

export type AnswerType = 
  | 'text' | 'email' | 'url' | 'phone_number' 
  | 'number' | 'boolean' | 'date' 
  | 'choice' | 'choices' | 'file_url' | 'payment';

export interface TypeformWebhook {
  id: string;
  form_id: string;
  tag: string;
  url: string;
  enabled: boolean;
  verify_ssl: boolean;
  secret?: string;
  created_at: string;
  updated_at: string;
}

export interface TypeformInsight {
  form_id: string;
  views: InsightMetric;
  unique_views: InsightMetric;
  submissions: InsightMetric;
  unique_submissions: InsightMetric;
  completion_rate: number;
  average_time: number;
  bounce_rate: number;
  responses_by_country?: { [country: string]: number };
  responses_by_device?: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

export interface InsightMetric {
  total: number;
  daily: { date: string; count: number }[];
}

export interface TypeformTheme {
  id: string;
  name: string;
  visibility: 'public' | 'private';
  colors: ThemeColors;
  font: string;
  has_transparent_button: boolean;
  fields?: ThemeField;
}

export interface ThemeColors {
  answer: string;
  background: string;
  button: string;
  question: string;
}

export interface ThemeField {
  alignment: 'left' | 'center' | 'right';
  font_size: 'small' | 'medium' | 'large';
}

export interface CreateFormOptions {
  title: string;
  workspace_id?: string;
  theme?: { id: string } | TypeformTheme;
  settings?: Partial<FormSettings>;
  fields: FormField[];
  welcome_screens?: WelcomeScreen[];
  thankyou_screens?: ThankYouScreen[];
  logic?: LogicJump[];
  variables?: Variable[];
  hidden?: string[];
}

export interface UpdateFormOptions {
  title?: string;
  settings?: Partial<FormSettings>;
  fields?: FormField[];
  logic?: LogicJump[];
  patch?: boolean;
}

export interface ResponseQuery {
  page_size?: number;
  since?: string;
  until?: string;
  after?: string;
  before?: string;
  included_response_ids?: string[];
  completed?: boolean;
  sort?: string;
  query?: string;
  fields?: string[];
}

// Main Integration Class
export class TypeformIntegration extends EventEmitter {
  private static instance: TypeformIntegration;
  private client: AxiosInstance;
  private config: TypeformConfig;
  private webhooks: Map<string, TypeformWebhook> = new Map();
  private forms: Map<string, TypeformForm> = new Map();
  private themes: Map<string, TypeformTheme> = new Map();
  private workspaces: Map<string, TypeformWorkspace> = new Map();

  private constructor(config: TypeformConfig) {
    super();
    this.config = config;
    this.client = this.createClient();
    this.initializeWebhooks();
  }

  public static getInstance(config?: TypeformConfig): TypeformIntegration {
    if (!TypeformIntegration.instance) {
      if (!config) {
        throw new Error('TypeformIntegration requires configuration on first initialization');
      }
      TypeformIntegration.instance = new TypeformIntegration(config);
    }
    return TypeformIntegration.instance;
  }

  private createClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseUrl || 'https://api.typeform.com',
      timeout: this.config.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // Workspace Management
  public async getWorkspaces(): Promise<TypeformWorkspace[]> {
    try {
      const response = await this.client.get('/workspaces');
      const workspaces = response.data.items;
      
      for (const workspace of workspaces) {
        this.workspaces.set(workspace.id, workspace);
      }
      
      return workspaces;
    } catch (error) {
      this.emit('error', { operation: 'getWorkspaces', error });
      throw error;
    }
  }

  public async getWorkspace(workspaceId: string): Promise<TypeformWorkspace> {
    try {
      const response = await this.client.get(`/workspaces/${workspaceId}`);
      const workspace = response.data;
      this.workspaces.set(workspace.id, workspace);
      return workspace;
    } catch (error) {
      this.emit('error', { operation: 'getWorkspace', error });
      throw error;
    }
  }

  // Form Management
  public async createForm(options: CreateFormOptions): Promise<TypeformForm> {
    try {
      const workspaceId = options.workspace_id || this.config.workspaceId;
      const formData = {
        title: options.title,
        type: 'quiz',
        workspace: workspaceId ? { href: `https://api.typeform.com/workspaces/${workspaceId}` } : undefined,
        theme: options.theme,
        settings: options.settings || this.getDefaultSettings(),
        welcome_screens: options.welcome_screens,
        thankyou_screens: options.thankyou_screens,
        fields: options.fields,
        logic: options.logic,
        variables: options.variables,
        hidden: options.hidden
      };

      const response = await this.client.post('/forms', formData);
      const form = response.data;
      this.forms.set(form.id, form);
      
      this.emit('form:created', { form });
      return form;
    } catch (error) {
      this.emit('error', { operation: 'createForm', error });
      throw error;
    }
  }

  public async getForm(formId: string): Promise<TypeformForm> {
    try {
      const response = await this.client.get(`/forms/${formId}`);
      const form = response.data;
      this.forms.set(form.id, form);
      return form;
    } catch (error) {
      this.emit('error', { operation: 'getForm', error });
      throw error;
    }
  }

  public async updateForm(
    formId: string,
    options: UpdateFormOptions
  ): Promise<TypeformForm> {
    try {
      const method = options.patch ? 'patch' : 'put';
      const response = await this.client[method](`/forms/${formId}`, options);
      const form = response.data;
      this.forms.set(form.id, form);
      
      this.emit('form:updated', { form });
      return form;
    } catch (error) {
      this.emit('error', { operation: 'updateForm', error });
      throw error;
    }
  }

  public async deleteForm(formId: string): Promise<void> {
    try {
      await this.client.delete(`/forms/${formId}`);
      this.forms.delete(formId);
      
      this.emit('form:deleted', { formId });
    } catch (error) {
      this.emit('error', { operation: 'deleteForm', error });
      throw error;
    }
  }

  public async listForms(
    workspaceId?: string,
    options: { page?: number; page_size?: number; search?: string } = {}
  ): Promise<TypeformForm[]> {
    try {
      const params: any = {
        ...options,
        workspace_id: workspaceId || this.config.workspaceId
      };

      const response = await this.client.get('/forms', { params });
      const forms = response.data.items;
      
      for (const form of forms) {
        this.forms.set(form.id, form);
      }
      
      return forms;
    } catch (error) {
      this.emit('error', { operation: 'listForms', error });
      throw error;
    }
  }

  public async duplicateForm(formId: string): Promise<TypeformForm> {
    try {
      const originalForm = await this.getForm(formId);
      const newForm = await this.createForm({
        title: `${originalForm.title} (Copy)`,
        workspace_id: this.config.workspaceId,
        settings: originalForm.settings,
        fields: originalForm.fields,
        welcome_screens: originalForm.welcome_screens,
        thankyou_screens: originalForm.thankyou_screens,
        logic: originalForm.logic,
        variables: originalForm.variables,
        hidden: originalForm.hidden
      });
      
      return newForm;
    } catch (error) {
      this.emit('error', { operation: 'duplicateForm', error });
      throw error;
    }
  }

  // Response Management
  public async getResponses(
    formId: string,
    query: ResponseQuery = {}
  ): Promise<TypeformResponse[]> {
    try {
      const response = await this.client.get(`/forms/${formId}/responses`, {
        params: query
      });
      
      this.emit('responses:fetched', { 
        formId, 
        count: response.data.items.length 
      });
      
      return response.data.items;
    } catch (error) {
      this.emit('error', { operation: 'getResponses', error });
      throw error;
    }
  }

  public async getResponse(
    formId: string,
    responseId: string
  ): Promise<TypeformResponse> {
    try {
      const responses = await this.getResponses(formId, {
        included_response_ids: [responseId]
      });
      
      if (responses.length === 0) {
        throw new Error(`Response ${responseId} not found`);
      }
      
      return responses[0];
    } catch (error) {
      this.emit('error', { operation: 'getResponse', error });
      throw error;
    }
  }

  public async deleteResponses(
    formId: string,
    responseIds: string[]
  ): Promise<void> {
    try {
      await this.client.delete(`/forms/${formId}/responses`, {
        data: {
          included_response_ids: responseIds
        }
      });
      
      this.emit('responses:deleted', { formId, count: responseIds.length });
    } catch (error) {
      this.emit('error', { operation: 'deleteResponses', error });
      throw error;
    }
  }

  // Webhook Management
  public async createWebhook(
    formId: string,
    tag: string,
    url: string,
    options: {
      enabled?: boolean;
      verify_ssl?: boolean;
      secret?: string;
    } = {}
  ): Promise<TypeformWebhook> {
    try {
      const webhookData = {
        tag,
        url,
        enabled: options.enabled ?? true,
        verify_ssl: options.verify_ssl ?? true,
        secret: options.secret
      };

      const response = await this.client.put(
        `/forms/${formId}/webhooks/${tag}`,
        webhookData
      );
      
      const webhook = response.data;
      this.webhooks.set(`${formId}_${tag}`, webhook);
      
      this.emit('webhook:created', { webhook });
      return webhook;
    } catch (error) {
      this.emit('error', { operation: 'createWebhook', error });
      throw error;
    }
  }

  public async getWebhook(
    formId: string,
    tag: string
  ): Promise<TypeformWebhook> {
    try {
      const response = await this.client.get(`/forms/${formId}/webhooks/${tag}`);
      const webhook = response.data;
      this.webhooks.set(`${formId}_${tag}`, webhook);
      return webhook;
    } catch (error) {
      this.emit('error', { operation: 'getWebhook', error });
      throw error;
    }
  }

  public async deleteWebhook(formId: string, tag: string): Promise<void> {
    try {
      await this.client.delete(`/forms/${formId}/webhooks/${tag}`);
      this.webhooks.delete(`${formId}_${tag}`);
      
      this.emit('webhook:deleted', { formId, tag });
    } catch (error) {
      this.emit('error', { operation: 'deleteWebhook', error });
      throw error;
    }
  }

  public async listWebhooks(formId: string): Promise<TypeformWebhook[]> {
    try {
      const response = await this.client.get(`/forms/${formId}/webhooks`);
      const webhooks = response.data.items;
      
      for (const webhook of webhooks) {
        this.webhooks.set(`${formId}_${webhook.tag}`, webhook);
      }
      
      return webhooks;
    } catch (error) {
      this.emit('error', { operation: 'listWebhooks', error });
      throw error;
    }
  }

  // Insights & Analytics
  public async getInsights(
    formId: string,
    options: {
      since?: string;
      until?: string;
      timezone?: string;
    } = {}
  ): Promise<TypeformInsight> {
    try {
      const response = await this.client.get(`/insights/${formId}/summary`, {
        params: options
      });
      
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'getInsights', error });
      throw error;
    }
  }

  public async getFieldInsights(
    formId: string,
    fieldId: string
  ): Promise<any> {
    try {
      const response = await this.client.get(
        `/insights/${formId}/questions/${fieldId}`
      );
      
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'getFieldInsights', error });
      throw error;
    }
  }

  // Theme Management
  public async createTheme(theme: Omit<TypeformTheme, 'id'>): Promise<TypeformTheme> {
    try {
      const response = await this.client.post('/themes', theme);
      const createdTheme = response.data;
      this.themes.set(createdTheme.id, createdTheme);
      
      this.emit('theme:created', { theme: createdTheme });
      return createdTheme;
    } catch (error) {
      this.emit('error', { operation: 'createTheme', error });
      throw error;
    }
  }

  public async getTheme(themeId: string): Promise<TypeformTheme> {
    try {
      const response = await this.client.get(`/themes/${themeId}`);
      const theme = response.data;
      this.themes.set(theme.id, theme);
      return theme;
    } catch (error) {
      this.emit('error', { operation: 'getTheme', error });
      throw error;
    }
  }

  public async updateTheme(
    themeId: string,
    updates: Partial<TypeformTheme>
  ): Promise<TypeformTheme> {
    try {
      const response = await this.client.put(`/themes/${themeId}`, updates);
      const theme = response.data;
      this.themes.set(theme.id, theme);
      
      this.emit('theme:updated', { theme });
      return theme;
    } catch (error) {
      this.emit('error', { operation: 'updateTheme', error });
      throw error;
    }
  }

  public async deleteTheme(themeId: string): Promise<void> {
    try {
      await this.client.delete(`/themes/${themeId}`);
      this.themes.delete(themeId);
      
      this.emit('theme:deleted', { themeId });
    } catch (error) {
      this.emit('error', { operation: 'deleteTheme', error });
      throw error;
    }
  }

  public async listThemes(
    options: { page?: number; page_size?: number } = {}
  ): Promise<TypeformTheme[]> {
    try {
      const response = await this.client.get('/themes', { params: options });
      const themes = response.data.items;
      
      for (const theme of themes) {
        this.themes.set(theme.id, theme);
      }
      
      return themes;
    } catch (error) {
      this.emit('error', { operation: 'listThemes', error });
      throw error;
    }
  }

  // Helper Methods
  private getDefaultSettings(): FormSettings {
    return {
      language: 'en',
      progress_bar: 'proportion',
      show_progress_bar: true,
      show_typeform_branding: false,
      show_time_to_complete: true,
      show_question_number: true,
      show_key_hint_on_choices: true,
      pro_subdomain_enabled: false,
      capabilities: {
        e2e_encryption: {
          enabled: false,
          modifiable: false
        }
      },
      is_public: true,
      is_trial: false,
      meta: {}
    };
  }

  private initializeWebhooks(): void {
    if (this.config.webhookUrl) {
      // Set up webhook endpoint for receiving Typeform events
      this.emit('webhook:initialized', { url: this.config.webhookUrl });
    }
  }

  // Utility Methods
  public createMultipleChoiceField(
    title: string,
    choices: string[],
    options: Partial<FormField> = {}
  ): FormField {
    return {
      title,
      type: 'multiple_choice',
      ...options,
      properties: {
        ...options.properties,
        choices: choices.map(label => ({ label }))
      }
    };
  }

  public createTextInputField(
    title: string,
    type: 'short_text' | 'long_text' = 'short_text',
    options: Partial<FormField> = {}
  ): FormField {
    return {
      title,
      type,
      ...options
    };
  }

  public createEmailField(
    title: string,
    options: Partial<FormField> = {}
  ): FormField {
    return {
      title,
      type: 'email',
      ...options,
      validations: {
        ...options.validations,
        required: options.validations?.required ?? true
      }
    };
  }

  public createRatingField(
    title: string,
    steps: number = 5,
    options: Partial<FormField> = {}
  ): FormField {
    return {
      title,
      type: 'rating',
      ...options,
      properties: {
        ...options.properties,
        steps
      }
    };
  }

  public createDateField(
    title: string,
    options: Partial<FormField> = {}
  ): FormField {
    return {
      title,
      type: 'date',
      ...options
    };
  }

  public createFileUploadField(
    title: string,
    options: Partial<FormField> = {}
  ): FormField {
    return {
      title,
      type: 'file_upload',
      ...options
    };
  }

  public createLogicJump(
    fromField: string,
    toField: string,
    condition: LogicCondition
  ): LogicJump {
    return {
      type: 'field',
      ref: fromField,
      actions: [{
        action: 'jump',
        details: {
          to: {
            type: 'field',
            value: toField
          }
        },
        condition
      }]
    };
  }

  // Webhook Processing
  public async processWebhookPayload(payload: any): Promise<TypeformResponse> {
    try {
      // Validate webhook signature if secret is configured
      if (payload.signature && this.config.apiKey) {
        const isValid = this.validateWebhookSignature(
          payload.signature,
          payload.body,
          this.config.apiKey
        );
        
        if (!isValid) {
          throw new Error('Invalid webhook signature');
        }
      }

      const response = payload.form_response;
      
      this.emit('response:received', { response });
      return response;
    } catch (error) {
      this.emit('error', { operation: 'processWebhookPayload', error });
      throw error;
    }
  }

  private validateWebhookSignature(
    signature: string,
    body: string,
    secret: string
  ): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('base64');
    
    return `sha256=${hash}` === signature;
  }
}

// Export singleton getter
export default function getTypeformIntegration(config?: TypeformConfig): TypeformIntegration {
  return TypeformIntegration.getInstance(config);
}