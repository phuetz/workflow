/**
 * Twilio Integration Types
 * PROJET SAUVÉ - Phase 6: Communication
 */

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  fromNumber?: string;
}

export type TwilioOperation =
  | 'sendSMS'
  | 'makeCall'
  | 'sendWhatsApp'
  | 'getMessageStatus'
  | 'getCallLogs';

export interface TwilioMessage {
  sid: string;
  from: string;
  to: string;
  body: string;
  status: string;
  dateCreated: string;
}

export interface TwilioResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}
