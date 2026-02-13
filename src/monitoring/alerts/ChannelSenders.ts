/**
 * ChannelSenders - Low-level channel sending and HTTP utilities
 * Handles HTTP requests, SMS via Twilio, and channel testing
 */

import * as https from 'https';
import * as crypto from 'crypto';
import { SMSConfig, NotificationChannel } from './types';
import { logger } from '../../services/SimpleLogger';

/**
 * Make HTTP request
 */
export async function makeHttpRequest(
  url: string,
  method: string,
  data: string,
  headers: Record<string, string>,
  timeout = 5000
): Promise<boolean> {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      headers,
      timeout
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        resolve(res.statusCode && res.statusCode >= 200 && res.statusCode < 300);
      });
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

/**
 * Generate webhook signature
 */
export function generateWebhookSignature(payload: string): string {
  const secret = process.env.WEBHOOK_SECRET || 'default-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Send SMS via Twilio
 */
export async function sendSMS(config: SMSConfig, message: string): Promise<boolean> {
  const accountSid = config.accountSid || process.env.TWILIO_ACCOUNT_SID;
  const authToken = config.apiSecret || process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = config.from || process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    logger.warn('SMS not configured - missing Twilio credentials', { component: 'ChannelSenders' });
    logger.info(`Would send SMS to ${config.to.join(', ')}: ${message}`, { component: 'ChannelSenders' });
    return false;
  }

  const truncatedMessage = message.substring(0, 1600);
  const results: boolean[] = [];

  for (const phoneNumber of config.to) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;

      const body = new URLSearchParams({
        To: phoneNumber,
        From: fromNumber,
        Body: truncatedMessage
      }).toString();

      const response = await makeTwilioRequest(twilioUrl, authHeader, body);

      if (response.success) {
        logger.info(`SMS sent to ${phoneNumber}, SID: ${response.sid}`, { component: 'ChannelSenders' });
        results.push(true);
      } else {
        logger.error(`Failed to send SMS to ${phoneNumber}: ${response.error}`, { component: 'ChannelSenders' });
        results.push(false);
      }
    } catch (error) {
      logger.error(`Failed to send SMS to ${phoneNumber}`, { component: 'ChannelSenders', error });
      results.push(false);
    }
  }

  return results.some(r => r);
}

/**
 * Make Twilio API request
 */
async function makeTwilioRequest(
  url: string,
  authHeader: string,
  body: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(responseData);

          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, sid: jsonResponse.sid });
          } else {
            resolve({
              success: false,
              error: jsonResponse.message || jsonResponse.error_message || 'Failed to send SMS'
            });
          }
        } catch {
          resolve({
            success: false,
            error: `Invalid response from Twilio: ${responseData.substring(0, 100)}`
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Request timeout' });
    });

    req.setTimeout(10000);
    req.write(body);
    req.end();
  });
}

/**
 * Test SMS channel connectivity
 */
export async function testSMSChannel(channel: NotificationChannel): Promise<boolean> {
  if (!channel.config.sms) return false;

  const config = channel.config.sms;
  const accountSid = config.accountSid || process.env.TWILIO_ACCOUNT_SID;
  const authToken = config.apiSecret || process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    logger.warn('Cannot test SMS channel - missing Twilio credentials', { component: 'ChannelSenders' });
    return false;
  }

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.twilio.com',
      port: 443,
      path: `/2010-04-01/Accounts/${accountSid}.json`,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          logger.info('SMS channel test successful', { component: 'ChannelSenders' });
          resolve(true);
        } else {
          logger.error('SMS channel test failed', { component: 'ChannelSenders' });
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      logger.error('SMS channel test failed', { component: 'ChannelSenders', error: error.message });
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.setTimeout(5000);
    req.end();
  });
}
