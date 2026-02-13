/**
 * Cal.com Service
 * Handles Cal.com API operations for booking and scheduling
 */

import { logger } from '../../services/LoggingService';
import axios, { AxiosInstance } from 'axios';

interface CalComCredentials {
  apiKey: string;
  baseURL?: string; // For self-hosted instances
}

interface CalComEventType {
  title: string;
  slug: string;
  length: number; // Duration in minutes
  description?: string;
  hidden?: boolean;
  locations?: Array<{
    type: string;
    address?: string;
    link?: string;
  }>;
  requiresConfirmation?: boolean;
  price?: number;
  currency?: string;
  disableGuests?: boolean;
  minimumBookingNotice?: number;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  scheduleId?: number;
  timeZone?: string;
}

interface CalComBooking {
  eventTypeId: number;
  start: string; // ISO 8601 datetime
  responses: {
    name: string;
    email: string;
    notes?: string;
    guests?: string[];
    location?: string;
  };
  timeZone?: string;
  language?: string;
  metadata?: Record<string, any>;
}

interface CalComSchedule {
  name: string;
  timeZone: string;
  availability: Array<{
    days: number[]; // 0-6 (Sunday-Saturday)
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
  }>;
}

export class CalComService {
  private readonly defaultBaseURL = 'https://api.cal.com/v1';
  private axiosInstance: AxiosInstance;
  private credentials: CalComCredentials;

  constructor(credentials: CalComCredentials) {
    this.credentials = credentials;

    this.axiosInstance = axios.create({
      baseURL: credentials.baseURL || this.defaultBaseURL,
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * EVENT TYPE OPERATIONS
   */

  /**
   * List event types
   */
  async listEventTypes(): Promise<any> {
    try {
      logger.info('Listing Cal.com event types');

      const response = await this.axiosInstance.get('/event-types');

      const eventTypes = response.data.event_types || [];
      logger.info(`Found ${eventTypes.length} event types`);

      return { eventTypes };
    } catch (error) {
      logger.error('Failed to list event types:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get event type
   */
  async getEventType(eventTypeId: number): Promise<any> {
    try {
      logger.info(`Fetching Cal.com event type: ${eventTypeId}`);

      const response = await this.axiosInstance.get(`/event-types/${eventTypeId}`);

      return response.data.event_type;
    } catch (error) {
      logger.error(`Failed to fetch event type ${eventTypeId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Create event type
   */
  async createEventType(eventType: CalComEventType): Promise<any> {
    try {
      logger.info('Creating Cal.com event type');

      const response = await this.axiosInstance.post('/event-types', eventType);

      logger.info(`Event type created successfully: ${response.data.event_type.id}`);
      return response.data.event_type;
    } catch (error) {
      logger.error('Failed to create event type:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update event type
   */
  async updateEventType(eventTypeId: number, eventType: Partial<CalComEventType>): Promise<any> {
    try {
      logger.info(`Updating Cal.com event type: ${eventTypeId}`);

      const response = await this.axiosInstance.patch(`/event-types/${eventTypeId}`, eventType);

      logger.info('Event type updated successfully');
      return response.data.event_type;
    } catch (error) {
      logger.error('Failed to update event type:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete event type
   */
  async deleteEventType(eventTypeId: number): Promise<void> {
    try {
      logger.info(`Deleting Cal.com event type: ${eventTypeId}`);

      await this.axiosInstance.delete(`/event-types/${eventTypeId}`);

      logger.info('Event type deleted successfully');
    } catch (error) {
      logger.error('Failed to delete event type:', error);
      throw this.handleError(error);
    }
  }

  /**
   * BOOKING OPERATIONS
   */

  /**
   * List bookings
   */
  async listBookings(options?: {
    status?: 'upcoming' | 'past' | 'cancelled';
    userId?: number;
    teamId?: number;
    eventTypeId?: number;
    attendeeEmail?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    try {
      logger.info('Listing Cal.com bookings');

      const params: any = {
        page: options?.page || 1,
        limit: options?.limit || 100,
      };

      if (options?.status) params.status = options.status;
      if (options?.userId) params.userId = options.userId;
      if (options?.teamId) params.teamId = options.teamId;
      if (options?.eventTypeId) params.eventTypeId = options.eventTypeId;
      if (options?.attendeeEmail) params.attendeeEmail = options.attendeeEmail;
      if (options?.startDate) params.startDate = options.startDate;
      if (options?.endDate) params.endDate = options.endDate;

      const response = await this.axiosInstance.get('/bookings', { params });

      const bookings = response.data.bookings || [];
      logger.info(`Found ${bookings.length} bookings`);

      return {
        bookings,
        page: response.data.page,
        limit: response.data.limit,
        total: response.data.total,
      };
    } catch (error) {
      logger.error('Failed to list bookings:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get booking
   */
  async getBooking(bookingId: number): Promise<any> {
    try {
      logger.info(`Fetching Cal.com booking: ${bookingId}`);

      const response = await this.axiosInstance.get(`/bookings/${bookingId}`);

      return response.data.booking;
    } catch (error) {
      logger.error(`Failed to fetch booking ${bookingId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Create booking
   */
  async createBooking(booking: CalComBooking): Promise<any> {
    try {
      logger.info('Creating Cal.com booking');

      const response = await this.axiosInstance.post('/bookings', booking);

      logger.info(`Booking created successfully: ${response.data.booking.id}`);
      return response.data.booking;
    } catch (error) {
      logger.error('Failed to create booking:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId: number, options?: {
    cancellationReason?: string;
    allRemainingBookings?: boolean;
  }): Promise<any> {
    try {
      logger.info(`Cancelling Cal.com booking: ${bookingId}`);

      const response = await this.axiosInstance.delete(`/bookings/${bookingId}`, {
        data: {
          cancellationReason: options?.cancellationReason,
          allRemainingBookings: options?.allRemainingBookings || false,
        },
      });

      logger.info('Booking cancelled successfully');
      return response.data;
    } catch (error) {
      logger.error('Failed to cancel booking:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Reschedule booking
   */
  async rescheduleBooking(bookingId: number, options: {
    start: string; // ISO 8601 datetime
    rescheduleReason?: string;
  }): Promise<any> {
    try {
      logger.info(`Rescheduling Cal.com booking: ${bookingId}`);

      const response = await this.axiosInstance.patch(`/bookings/${bookingId}/reschedule`, {
        start: options.start,
        rescheduleReason: options.rescheduleReason,
      });

      logger.info('Booking rescheduled successfully');
      return response.data.booking;
    } catch (error) {
      logger.error('Failed to reschedule booking:', error);
      throw this.handleError(error);
    }
  }

  /**
   * AVAILABILITY OPERATIONS
   */

  /**
   * Check availability
   */
  async checkAvailability(options: {
    eventTypeId: number;
    startTime: string; // ISO 8601 datetime
    endTime: string; // ISO 8601 datetime
    timeZone?: string;
  }): Promise<any> {
    try {
      logger.info(`Checking availability for event type: ${options.eventTypeId}`);

      const params: any = {
        eventTypeId: options.eventTypeId,
        startTime: options.startTime,
        endTime: options.endTime,
      };

      if (options.timeZone) params.timeZone = options.timeZone;

      const response = await this.axiosInstance.get('/availability', { params });

      return response.data;
    } catch (error) {
      logger.error('Failed to check availability:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get available slots
   */
  async getAvailableSlots(options: {
    eventTypeId: number;
    startTime: string; // ISO 8601 date
    endTime: string; // ISO 8601 date
    timeZone?: string;
  }): Promise<any> {
    try {
      logger.info(`Fetching available slots for event type: ${options.eventTypeId}`);

      const params: any = {
        eventTypeId: options.eventTypeId,
        startTime: options.startTime,
        endTime: options.endTime,
      };

      if (options.timeZone) params.timeZone = options.timeZone;

      const response = await this.axiosInstance.get('/slots/available', { params });

      const slots = response.data.slots || [];
      logger.info(`Found ${slots.length} available slots`);

      return { slots };
    } catch (error) {
      logger.error('Failed to fetch available slots:', error);
      throw this.handleError(error);
    }
  }

  /**
   * SCHEDULE OPERATIONS
   */

  /**
   * List schedules
   */
  async listSchedules(): Promise<any> {
    try {
      logger.info('Listing Cal.com schedules');

      const response = await this.axiosInstance.get('/schedules');

      const schedules = response.data.schedules || [];
      logger.info(`Found ${schedules.length} schedules`);

      return { schedules };
    } catch (error) {
      logger.error('Failed to list schedules:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get schedule
   */
  async getSchedule(scheduleId: number): Promise<any> {
    try {
      logger.info(`Fetching Cal.com schedule: ${scheduleId}`);

      const response = await this.axiosInstance.get(`/schedules/${scheduleId}`);

      return response.data.schedule;
    } catch (error) {
      logger.error(`Failed to fetch schedule ${scheduleId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Create schedule
   */
  async createSchedule(schedule: CalComSchedule): Promise<any> {
    try {
      logger.info('Creating Cal.com schedule');

      const response = await this.axiosInstance.post('/schedules', schedule);

      logger.info(`Schedule created successfully: ${response.data.schedule.id}`);
      return response.data.schedule;
    } catch (error) {
      logger.error('Failed to create schedule:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update schedule
   */
  async updateSchedule(scheduleId: number, schedule: Partial<CalComSchedule>): Promise<any> {
    try {
      logger.info(`Updating Cal.com schedule: ${scheduleId}`);

      const response = await this.axiosInstance.patch(`/schedules/${scheduleId}`, schedule);

      logger.info('Schedule updated successfully');
      return response.data.schedule;
    } catch (error) {
      logger.error('Failed to update schedule:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(scheduleId: number): Promise<void> {
    try {
      logger.info(`Deleting Cal.com schedule: ${scheduleId}`);

      await this.axiosInstance.delete(`/schedules/${scheduleId}`);

      logger.info('Schedule deleted successfully');
    } catch (error) {
      logger.error('Failed to delete schedule:', error);
      throw this.handleError(error);
    }
  }

  /**
   * USER OPERATIONS
   */

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<any> {
    try {
      logger.info('Fetching current Cal.com user');

      const response = await this.axiosInstance.get('/me');

      return response.data.user;
    } catch (error) {
      logger.error('Failed to fetch current user:', error);
      throw this.handleError(error);
    }
  }

  /**
   * List users (team members)
   */
  async listUsers(): Promise<any> {
    try {
      logger.info('Listing Cal.com users');

      const response = await this.axiosInstance.get('/users');

      const users = response.data.users || [];
      logger.info(`Found ${users.length} users`);

      return { users };
    } catch (error) {
      logger.error('Failed to list users:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get user
   */
  async getUser(userId: number): Promise<any> {
    try {
      logger.info(`Fetching Cal.com user: ${userId}`);

      const response = await this.axiosInstance.get(`/users/${userId}`);

      return response.data.user;
    } catch (error) {
      logger.error(`Failed to fetch user ${userId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Update user
   */
  async updateUser(userId: number, user: {
    name?: string;
    email?: string;
    bio?: string;
    timeZone?: string;
    weekStart?: string;
    brandColor?: string;
    darkBrandColor?: string;
    theme?: string;
  }): Promise<any> {
    try {
      logger.info(`Updating Cal.com user: ${userId}`);

      const response = await this.axiosInstance.patch(`/users/${userId}`, user);

      logger.info('User updated successfully');
      return response.data.user;
    } catch (error) {
      logger.error('Failed to update user:', error);
      throw this.handleError(error);
    }
  }

  /**
   * WEBHOOK OPERATIONS
   */

  /**
   * List webhooks
   */
  async listWebhooks(): Promise<any> {
    try {
      logger.info('Listing Cal.com webhooks');

      const response = await this.axiosInstance.get('/webhooks');

      const webhooks = response.data.webhooks || [];
      logger.info(`Found ${webhooks.length} webhooks`);

      return { webhooks };
    } catch (error) {
      logger.error('Failed to list webhooks:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create webhook
   */
  async createWebhook(webhook: {
    subscriberUrl: string;
    eventTriggers: string[];
    active?: boolean;
    payloadTemplate?: string;
  }): Promise<any> {
    try {
      logger.info('Creating Cal.com webhook');

      const response = await this.axiosInstance.post('/webhooks', webhook);

      logger.info(`Webhook created successfully: ${response.data.webhook.id}`);
      return response.data.webhook;
    } catch (error) {
      logger.error('Failed to create webhook:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      logger.info(`Deleting Cal.com webhook: ${webhookId}`);

      await this.axiosInstance.delete(`/webhooks/${webhookId}`);

      logger.info('Webhook deleted successfully');
    } catch (error) {
      logger.error('Failed to delete webhook:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const calError = error.response?.data;
      if (calError?.message) {
        return new Error(`Cal.com API Error: ${calError.message}`);
      }
      if (calError?.error) {
        return new Error(`Cal.com API Error: ${calError.error}`);
      }
      return new Error(`Cal.com API Error: ${error.message}`);
    }
    return error instanceof Error ? error : new Error('Unknown Cal.com error');
  }

  /**
   * Get service metrics
   */
  getMetrics(): any {
    return {
      service: 'Cal.com',
      authenticated: this.credentials.apiKey ? true : false,
      baseURL: this.credentials.baseURL || this.defaultBaseURL,
    };
  }
}

// Export factory function
export function createCalComService(credentials: CalComCredentials): CalComService {
  return new CalComService(credentials);
}
