/**
 * Calendly Integration
 * Complete integration with Calendly for scheduling and calendar management
 */

import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';

// Types
export interface CalendlyConfig {
  apiKey: string;
  organizationUri?: string;
  baseUrl?: string;
  webhookSigningKey?: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface CalendlyUser {
  uri: string;
  name: string;
  slug: string;
  email: string;
  scheduling_url: string;
  timezone: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  current_organization: string;
  resource_type: 'User';
}

export interface CalendlyOrganization {
  uri: string;
  role: 'owner' | 'admin' | 'user';
  user: string;
  organization: string;
  updated_at: string;
  created_at: string;
  resource_type: 'OrganizationMembership';
}

export interface CalendlyEventType {
  uri: string;
  name: string;
  active: boolean;
  booking_method: 'instant' | 'poll';
  slug: string;
  scheduling_url: string;
  duration: number;
  kind: 'solo' | 'group' | 'collective' | 'round_robin';
  pooling_type?: 'round_robin' | 'collective';
  type: 'StandardEventType' | 'AdhocEventType';
  color: string;
  created_at: string;
  updated_at: string;
  internal_note?: string;
  description_plain?: string;
  description_html?: string;
  profile?: {
    type: 'User' | 'Team';
    name: string;
    owner: string;
  };
  secret: boolean;
  position?: number;
  custom_questions?: CustomQuestion[];
  deleted_at?: string | null;
  admin_managed: boolean;
}

export interface CustomQuestion {
  name: string;
  type: 'text' | 'phone_number' | 'single_select' | 'multi_select' | 'radio_buttons' | 'checkboxes';
  position: number;
  enabled: boolean;
  required: boolean;
  answer_choices?: string[];
  include_other?: boolean;
}

export interface CalendlyEvent {
  uri: string;
  name: string;
  status: 'active' | 'canceled';
  start_time: string;
  end_time: string;
  event_type: string;
  location?: EventLocation;
  invitees_counter: {
    total: number;
    active: number;
    limit: number;
  };
  created_at: string;
  updated_at: string;
  event_memberships: EventMembership[];
  event_guests?: EventGuest[];
  calendar_event?: CalendarEvent;
  cancellation?: Cancellation;
}

export interface EventLocation {
  type: 'physical' | 'outbound_call' | 'inbound_call' | 'google_meet' | 'zoom' | 'gotomeeting' | 'teams' | 'custom' | 'ask_invitee';
  location?: string;
  status?: 'pushed' | 'failed';
  join_url?: string;
  data?: any;
}

export interface EventMembership {
  user: string;
  user_email: string;
  user_name: string;
}

export interface EventGuest {
  email: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  kind: 'google' | 'outlook' | 'office365' | 'exchange' | 'icloud';
  external_id: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

export interface Cancellation {
  canceled_by: string;
  reason?: string;
  canceler_type: 'host' | 'invitee';
  created_at: string;
}

export interface CalendlyInvitee {
  uri: string;
  email: string;
  name: string;
  status: 'active' | 'canceled';
  questions_and_answers?: QuestionAnswer[];
  timezone?: string;
  event: string;
  text_reminder_number?: string | null;
  rescheduled: boolean;
  old_invitee?: string | null;
  new_invitee?: string | null;
  cancel_url: string;
  reschedule_url: string;
  created_at: string;
  updated_at: string;
  cancellation?: Cancellation;
  payment?: Payment;
  no_show?: NoShow | null;
  reconfirmation?: Reconfirmation | null;
  scheduling_method?: string;
  routing_form_submission?: string | null;
}

export interface QuestionAnswer {
  question: string;
  answer: string;
  position: number;
}

export interface Payment {
  external_id: string;
  provider: 'stripe' | 'paypal';
  amount: number;
  currency: string;
  terms: string;
  successful: boolean;
}

export interface NoShow {
  uri: string;
  created_at: string;
}

export interface Reconfirmation {
  created_at: string;
  confirmed_at?: string;
}

export interface CalendlyWebhook {
  uri: string;
  callback_url: string;
  created_at: string;
  updated_at: string;
  retry_started_at?: string;
  state: 'active' | 'disabled';
  events: WebhookEvent[];
  organization: string;
  user?: string;
  scope: 'organization' | 'user';
  signing_key?: string;
}

export type WebhookEvent = 
  | 'invitee.created'
  | 'invitee.canceled'
  | 'invitee_no_show.created'
  | 'invitee_no_show.deleted'
  | 'routing_form_submission.created';

export interface WebhookPayload {
  created_at: string;
  created_by: string;
  event: WebhookEvent;
  payload: any;
}

export interface CalendlyAvailability {
  today_total: number;
  today_available: number;
  date_range: {
    start: string;
    end: string;
  };
  days: DayAvailability[];
}

export interface DayAvailability {
  date: string;
  status: 'available' | 'unavailable' | 'partly-available';
  spots: SpotAvailability[];
  invitees?: any[];
}

export interface SpotAvailability {
  status: 'available' | 'unavailable';
  invitees_remaining: number;
  start_time: string;
  end_time?: string;
  scheduling_url?: string;
}

export interface SchedulingLink {
  booking_url: string;
  owner: string;
  owner_type: 'EventType' | 'EventTypeAvailableTime';
  max_event_count?: number;
  resource_type: 'SchedulingLink';
}

export interface ActivityLog {
  occurred_at: string;
  actor?: {
    type: 'User' | 'System';
    uuid?: string;
    display_name: string;
    alternative_identifier?: string;
  };
  details?: {
    resource?: {
      uuid: string;
      type: string;
    };
    routing_form?: {
      uuid: string;
    };
  };
  namespace: 'organization' | 'external';
  action: ActivityAction;
  organization: {
    uuid: string;
  };
}

export type ActivityAction = 
  | 'event_type.created'
  | 'event_type.deleted'
  | 'event_type.settings_updated'
  | 'organization_invitation.accepted'
  | 'organization_invitation.created'
  | 'organization_invitation.revoked'
  | 'organization_membership.activated'
  | 'organization_membership.deactivated'
  | 'organization_membership.removed'
  | 'user.signup';

export interface CreateEventTypeOptions {
  name: string;
  duration?: number;
  kind?: 'solo' | 'group' | 'collective' | 'round_robin';
  color?: string;
  description?: string;
  active?: boolean;
  booking_method?: 'instant' | 'poll';
  internal_note?: string;
  custom_questions?: CustomQuestion[];
  position?: number;
}

export interface UpdateEventTypeOptions {
  name?: string;
  duration?: number;
  active?: boolean;
  color?: string;
  description?: string;
  internal_note?: string;
  custom_questions?: CustomQuestion[];
  position?: number;
}

export interface InviteeScheduleOptions {
  event_type_uri: string;
  start_time: string;
  invitee_email: string;
  invitee_name: string;
  answer_1?: string;
  answer_2?: string;
  answer_3?: string;
  answer_4?: string;
  answer_5?: string;
  answer_6?: string;
  invitee_notes?: string;
  timezone?: string;
}

// Main Integration Class
export class CalendlyIntegration extends EventEmitter {
  private static instance: CalendlyIntegration;
  private client: AxiosInstance;
  private config: CalendlyConfig;
  private currentUser?: CalendlyUser;
  private webhooks: Map<string, CalendlyWebhook> = new Map();
  private eventTypes: Map<string, CalendlyEventType> = new Map();

  private constructor(config: CalendlyConfig) {
    super();
    this.config = config;
    this.client = this.createClient();
    this.initialize();
  }

  public static getInstance(config?: CalendlyConfig): CalendlyIntegration {
    if (!CalendlyIntegration.instance) {
      if (!config) {
        throw new Error('CalendlyIntegration requires configuration on first initialization');
      }
      CalendlyIntegration.instance = new CalendlyIntegration(config);
    }
    return CalendlyIntegration.instance;
  }

  private createClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseUrl || 'https://api.calendly.com',
      timeout: this.config.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private async initialize(): Promise<void> {
    try {
      // Get current user
      this.currentUser = await this.getCurrentUser();
      
      // Set organization URI if not provided
      if (!this.config.organizationUri && this.currentUser) {
        this.config.organizationUri = this.currentUser.current_organization;
      }
      
      this.emit('initialized', { user: this.currentUser });
    } catch (error) {
      this.emit('error', { operation: 'initialize', error });
    }
  }

  // User Management
  public async getCurrentUser(): Promise<CalendlyUser> {
    try {
      const response = await this.client.get('/users/me');
      return response.data.resource;
    } catch (error) {
      this.emit('error', { operation: 'getCurrentUser', error });
      throw error;
    }
  }

  public async getUser(userUri: string): Promise<CalendlyUser> {
    try {
      const uuid = this.extractUuid(userUri);
      const response = await this.client.get(`/users/${uuid}`);
      return response.data.resource;
    } catch (error) {
      this.emit('error', { operation: 'getUser', error });
      throw error;
    }
  }

  // Organization Management
  public async getOrganizationMembership(
    uuid?: string
  ): Promise<CalendlyOrganization> {
    try {
      const membershipUuid = uuid || this.extractUuid(this.config.organizationUri!);
      const response = await this.client.get(
        `/organization_memberships/${membershipUuid}`
      );
      return response.data.resource;
    } catch (error) {
      this.emit('error', { operation: 'getOrganizationMembership', error });
      throw error;
    }
  }

  public async listOrganizationMembers(
    organizationUri?: string,
    options: { count?: number; page_token?: string; email?: string } = {}
  ): Promise<{ collection: CalendlyOrganization[]; pagination: any }> {
    try {
      const params = {
        organization: organizationUri || this.config.organizationUri,
        ...options
      };
      
      const response = await this.client.get('/organization_memberships', { params });
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'listOrganizationMembers', error });
      throw error;
    }
  }

  public async removeOrganizationMember(uuid: string): Promise<void> {
    try {
      await this.client.delete(`/organization_memberships/${uuid}`);
      this.emit('member:removed', { uuid });
    } catch (error) {
      this.emit('error', { operation: 'removeOrganizationMember', error });
      throw error;
    }
  }

  // Event Type Management
  public async createEventType(
    options: CreateEventTypeOptions
  ): Promise<CalendlyEventType> {
    try {
      const data = {
        ...options,
        user: this.currentUser?.uri,
        duration: options.duration || 30,
        kind: options.kind || 'solo',
        booking_method: options.booking_method || 'instant'
      };

      const response = await this.client.post('/event_types', data);
      const eventType = response.data.resource;
      this.eventTypes.set(eventType.uri, eventType);
      
      this.emit('eventType:created', { eventType });
      return eventType;
    } catch (error) {
      this.emit('error', { operation: 'createEventType', error });
      throw error;
    }
  }

  public async getEventType(uuid: string): Promise<CalendlyEventType> {
    try {
      const response = await this.client.get(`/event_types/${uuid}`);
      const eventType = response.data.resource;
      this.eventTypes.set(eventType.uri, eventType);
      return eventType;
    } catch (error) {
      this.emit('error', { operation: 'getEventType', error });
      throw error;
    }
  }

  public async updateEventType(
    uuid: string,
    options: UpdateEventTypeOptions
  ): Promise<CalendlyEventType> {
    try {
      const response = await this.client.patch(`/event_types/${uuid}`, options);
      const eventType = response.data.resource;
      this.eventTypes.set(eventType.uri, eventType);
      
      this.emit('eventType:updated', { eventType });
      return eventType;
    } catch (error) {
      this.emit('error', { operation: 'updateEventType', error });
      throw error;
    }
  }

  public async deleteEventType(uuid: string): Promise<void> {
    try {
      await this.client.delete(`/event_types/${uuid}`);
      this.emit('eventType:deleted', { uuid });
    } catch (error) {
      this.emit('error', { operation: 'deleteEventType', error });
      throw error;
    }
  }

  public async listEventTypes(
    options: {
      active?: boolean;
      count?: number;
      page_token?: string;
      organization?: string;
      user?: string;
      sort?: string;
    } = {}
  ): Promise<{ collection: CalendlyEventType[]; pagination: any }> {
    try {
      const params = {
        organization: options.organization || this.config.organizationUri,
        ...options
      };
      
      const response = await this.client.get('/event_types', { params });
      
      // Cache event types
      for (const eventType of response.data.collection) {
        this.eventTypes.set(eventType.uri, eventType);
      }
      
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'listEventTypes', error });
      throw error;
    }
  }

  // Event Management
  public async getEvent(uuid: string): Promise<CalendlyEvent> {
    try {
      const response = await this.client.get(`/scheduled_events/${uuid}`);
      return response.data.resource;
    } catch (error) {
      this.emit('error', { operation: 'getEvent', error });
      throw error;
    }
  }

  public async listEvents(
    options: {
      organization?: string;
      user?: string;
      count?: number;
      invitee_email?: string;
      max_start_time?: string;
      min_start_time?: string;
      page_token?: string;
      sort?: string;
      status?: 'active' | 'canceled';
    } = {}
  ): Promise<{ collection: CalendlyEvent[]; pagination: any }> {
    try {
      const params = {
        organization: options.organization || this.config.organizationUri,
        ...options
      };
      
      const response = await this.client.get('/scheduled_events', { params });
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'listEvents', error });
      throw error;
    }
  }

  public async cancelEvent(
    uuid: string,
    options: { reason?: string } = {}
  ): Promise<{ invitee: CalendlyInvitee }> {
    try {
      const response = await this.client.post(
        `/scheduled_events/${uuid}/cancellation`,
        options
      );
      
      this.emit('event:canceled', { uuid, reason: options.reason });
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'cancelEvent', error });
      throw error;
    }
  }

  // Invitee Management
  public async getInvitee(
    eventUuid: string,
    inviteeUuid: string
  ): Promise<CalendlyInvitee> {
    try {
      const response = await this.client.get(
        `/scheduled_events/${eventUuid}/invitees/${inviteeUuid}`
      );
      return response.data.resource;
    } catch (error) {
      this.emit('error', { operation: 'getInvitee', error });
      throw error;
    }
  }

  public async listInvitees(
    options: {
      count?: number;
      email?: string;
      page_token?: string;
      sort?: string;
      status?: 'active' | 'canceled';
      event?: string;
    }
  ): Promise<{ collection: CalendlyInvitee[]; pagination: any }> {
    try {
      if (!options.event) {
        throw new Error('Event URI is required to list invitees');
      }
      
      const eventUuid = this.extractUuid(options.event);
      const response = await this.client.get(
        `/scheduled_events/${eventUuid}/invitees`,
        { params: options }
      );
      
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'listInvitees', error });
      throw error;
    }
  }

  public async markNoShow(
    inviteeUri: string
  ): Promise<{ no_show: NoShow }> {
    try {
      const response = await this.client.post('/invitee_no_shows', {
        invitee: inviteeUri
      });
      
      this.emit('invitee:noShow', { inviteeUri });
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'markNoShow', error });
      throw error;
    }
  }

  public async unmarkNoShow(uuid: string): Promise<void> {
    try {
      await this.client.delete(`/invitee_no_shows/${uuid}`);
      this.emit('invitee:noShowRemoved', { uuid });
    } catch (error) {
      this.emit('error', { operation: 'unmarkNoShow', error });
      throw error;
    }
  }

  // Webhook Management
  public async createWebhook(
    callbackUrl: string,
    events: WebhookEvent[],
    options: {
      organization?: string;
      user?: string;
      scope?: 'organization' | 'user';
      signing_key?: string;
    } = {}
  ): Promise<CalendlyWebhook> {
    try {
      const data = {
        url: callbackUrl,
        events,
        organization: options.organization || this.config.organizationUri,
        user: options.user,
        scope: options.scope || 'organization',
        signing_key: options.signing_key || this.config.webhookSigningKey
      };

      const response = await this.client.post('/webhook_subscriptions', data);
      const webhook = response.data.resource;
      this.webhooks.set(webhook.uri, webhook);
      
      this.emit('webhook:created', { webhook });
      return webhook;
    } catch (error) {
      this.emit('error', { operation: 'createWebhook', error });
      throw error;
    }
  }

  public async getWebhook(uuid: string): Promise<CalendlyWebhook> {
    try {
      const response = await this.client.get(`/webhook_subscriptions/${uuid}`);
      const webhook = response.data.resource;
      this.webhooks.set(webhook.uri, webhook);
      return webhook;
    } catch (error) {
      this.emit('error', { operation: 'getWebhook', error });
      throw error;
    }
  }

  public async deleteWebhook(uuid: string): Promise<void> {
    try {
      await this.client.delete(`/webhook_subscriptions/${uuid}`);
      this.emit('webhook:deleted', { uuid });
    } catch (error) {
      this.emit('error', { operation: 'deleteWebhook', error });
      throw error;
    }
  }

  public async listWebhooks(
    options: {
      count?: number;
      organization?: string;
      page_token?: string;
      scope?: 'organization' | 'user';
      user?: string;
    } = {}
  ): Promise<{ collection: CalendlyWebhook[]; pagination: any }> {
    try {
      const params = {
        organization: options.organization || this.config.organizationUri,
        ...options
      };
      
      const response = await this.client.get('/webhook_subscriptions', { params });
      
      // Cache webhooks
      for (const webhook of response.data.collection) {
        this.webhooks.set(webhook.uri, webhook);
      }
      
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'listWebhooks', error });
      throw error;
    }
  }

  // Availability
  public async getEventTypeAvailability(
    eventTypeUri: string,
    options: {
      start_time: string;
      end_time: string;
    }
  ): Promise<CalendlyAvailability> {
    try {
      const params = {
        event_type: eventTypeUri,
        ...options
      };
      
      const response = await this.client.get(
        '/event_type_available_times',
        { params }
      );
      
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'getEventTypeAvailability', error });
      throw error;
    }
  }

  public async getUserAvailability(
    userUri: string,
    options: {
      start_time: string;
      end_time: string;
    }
  ): Promise<any> {
    try {
      const params = {
        user: userUri,
        ...options
      };
      
      const response = await this.client.get('/user_availability_schedules', {
        params
      });
      
      return response.data.collection;
    } catch (error) {
      this.emit('error', { operation: 'getUserAvailability', error });
      throw error;
    }
  }

  public async getUserBusyTime(
    userUri: string,
    options: {
      start_time: string;
      end_time: string;
    }
  ): Promise<any> {
    try {
      const params = {
        user: userUri,
        ...options
      };
      
      const response = await this.client.get('/user_busy_times', { params });
      return response.data.collection;
    } catch (error) {
      this.emit('error', { operation: 'getUserBusyTime', error });
      throw error;
    }
  }

  // Scheduling Links
  public async createSchedulingLink(
    owner: string,
    options: {
      max_event_count?: number;
    } = {}
  ): Promise<SchedulingLink> {
    try {
      const data = {
        owner,
        owner_type: 'EventType',
        ...options
      };

      const response = await this.client.post('/scheduling_links', data);
      
      this.emit('schedulingLink:created', { link: response.data.resource });
      return response.data.resource;
    } catch (error) {
      this.emit('error', { operation: 'createSchedulingLink', error });
      throw error;
    }
  }

  // Activity Log
  public async getActivityLog(
    organizationUri?: string,
    options: {
      count?: number;
      max_occurred_at?: string;
      min_occurred_at?: string;
      namespace?: 'organization' | 'external';
      page_token?: string;
      search_term?: string;
      sort?: string;
      actor?: string[];
      action?: ActivityAction[];
    } = {}
  ): Promise<{ collection: ActivityLog[]; pagination: any }> {
    try {
      const params = {
        organization: organizationUri || this.config.organizationUri,
        ...options
      };
      
      const response = await this.client.get('/activity_log_entries', { params });
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'getActivityLog', error });
      throw error;
    }
  }

  // Invitee Scheduling (Direct Booking)
  public async scheduleEvent(
    options: InviteeScheduleOptions
  ): Promise<{ resource: CalendlyInvitee }> {
    try {
      const response = await this.client.post('/scheduling/invitees', options);
      
      this.emit('event:scheduled', { invitee: response.data.resource });
      return response.data;
    } catch (error) {
      this.emit('error', { operation: 'scheduleEvent', error });
      throw error;
    }
  }

  // Webhook Processing
  public async processWebhookPayload(
    payload: WebhookPayload,
    signature?: string
  ): Promise<void> {
    try {
      // Verify signature if provided
      if (signature && this.config.webhookSigningKey) {
        const isValid = this.verifyWebhookSignature(
          payload,
          signature,
          this.config.webhookSigningKey
        );
        
        if (!isValid) {
          throw new Error('Invalid webhook signature');
        }
      }

      // Process based on event type
      switch (payload.event) {
        case 'invitee.created':
          this.emit('invitee:created', payload.payload);
          break;
        case 'invitee.canceled':
          this.emit('invitee:canceled', payload.payload);
          break;
        case 'invitee_no_show.created':
          this.emit('invitee:noShow', payload.payload);
          break;
        case 'invitee_no_show.deleted':
          this.emit('invitee:noShowRemoved', payload.payload);
          break;
        case 'routing_form_submission.created':
          this.emit('routingForm:submitted', payload.payload);
          break;
        default:
          this.emit('webhook:unknown', payload);
      }

      this.emit('webhook:processed', payload);
    } catch (error) {
      this.emit('error', { operation: 'processWebhookPayload', error });
      throw error;
    }
  }

  // Helper Methods
  private extractUuid(uri: string): string {
    const parts = uri.split('/');
    return parts[parts.length - 1];
  }

  private verifyWebhookSignature(
    payload: any,
    signature: string,
    key: string
  ): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', key)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  }

  // Utility Methods for Creating Events
  public createOneOnOneEventType(
    name: string,
    duration: number = 30,
    options: Partial<CreateEventTypeOptions> = {}
  ): Promise<CalendlyEventType> {
    return this.createEventType({
      name,
      duration,
      kind: 'solo',
      ...options
    });
  }

  public createGroupEventType(
    name: string,
    duration: number = 60,
    options: Partial<CreateEventTypeOptions> = {}
  ): Promise<CalendlyEventType> {
    return this.createEventType({
      name,
      duration,
      kind: 'group',
      ...options
    });
  }

  public createCollectiveEventType(
    name: string,
    duration: number = 45,
    options: Partial<CreateEventTypeOptions> = {}
  ): Promise<CalendlyEventType> {
    return this.createEventType({
      name,
      duration,
      kind: 'collective',
      ...options
    });
  }

  public createRoundRobinEventType(
    name: string,
    duration: number = 30,
    options: Partial<CreateEventTypeOptions> = {}
  ): Promise<CalendlyEventType> {
    return this.createEventType({
      name,
      duration,
      kind: 'round_robin',
      ...options
    });
  }

  // Quick scheduling methods
  public async getNextAvailableSlot(
    eventTypeUri: string,
    startFrom?: Date
  ): Promise<SpotAvailability | null> {
    const start = startFrom || new Date();
    const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    const availability = await this.getEventTypeAvailability(eventTypeUri, {
      start_time: start.toISOString(),
      end_time: end.toISOString()
    });
    
    for (const day of availability.days) {
      const availableSpot = day.spots.find(s => s.status === 'available');
      if (availableSpot) {
        return availableSpot;
      }
    }
    
    return null;
  }

  public async findAvailableSlots(
    eventTypeUri: string,
    options: {
      start_time: string;
      end_time: string;
      limit?: number;
    }
  ): Promise<SpotAvailability[]> {
    const availability = await this.getEventTypeAvailability(eventTypeUri, {
      start_time: options.start_time,
      end_time: options.end_time
    });
    
    const availableSlots: SpotAvailability[] = [];
    const limit = options.limit || 10;
    
    for (const day of availability.days) {
      for (const spot of day.spots) {
        if (spot.status === 'available') {
          availableSlots.push(spot);
          if (availableSlots.length >= limit) {
            return availableSlots;
          }
        }
      }
    }
    
    return availableSlots;
  }
}

// Export singleton getter
export default function getCalendlyIntegration(config?: CalendlyConfig): CalendlyIntegration {
  return CalendlyIntegration.getInstance(config);
}