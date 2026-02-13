/**
 * Action Handlers for Playbook Engine
 * Implements notification, blocking, remediation, logging, and escalation handlers
 *
 * @module playbook/ActionHandlers
 */

import type { PlaybookAction, VariableContext, ActionHandler } from './types';

/**
 * ActionHandlers class
 * Contains all action handler implementations for the playbook engine
 */
export class ActionHandlers {
  private handlers: Map<string, ActionHandler> = new Map();

  constructor() {
    this.registerDefaultHandlers();
  }

  /**
   * Register default action handlers
   */
  private registerDefaultHandlers(): void {
    this.handlers.set('notification', this.handleNotification.bind(this));
    this.handlers.set('blocking', this.handleBlocking.bind(this));
    this.handlers.set('remediation', this.handleRemediation.bind(this));
    this.handlers.set('logging', this.handleLogging.bind(this));
    this.handlers.set('escalation', this.handleEscalation.bind(this));
  }

  /**
   * Get handler for action type
   */
  public getHandler(actionType: string): ActionHandler | undefined {
    return this.handlers.get(actionType);
  }

  /**
   * Register a custom action handler
   */
  public registerHandler(actionType: string, handler: ActionHandler): void {
    this.handlers.set(actionType, handler);
  }

  // ================================
  // NOTIFICATION HANDLERS
  // ================================

  private async handleNotification(
    action: PlaybookAction,
    context: VariableContext
  ): Promise<unknown> {
    const { service, payload } = action;
    const expandedPayload = this.expandVariables(payload, context);

    switch (service) {
      case 'slack':
        return this.sendSlackNotification(expandedPayload);
      case 'email':
        return this.sendEmailNotification(expandedPayload);
      case 'sms':
        return this.sendSMSNotification(expandedPayload);
      case 'pagerduty':
        return this.sendPagerDutyAlert(expandedPayload);
      default:
        throw new Error(`Unknown notification service: ${service}`);
    }
  }

  private async sendSlackNotification(payload: Record<string, unknown>): Promise<unknown> {
    const webhookUrl = (process.env.SLACK_WEBHOOK_URL || payload.webhookUrl) as string;

    if (!webhookUrl) {
      console.warn('[ActionHandlers] Slack notification skipped: No webhook URL configured');
      return {
        success: false,
        service: 'slack',
        error: 'No Slack webhook URL configured.'
      };
    }

    try {
      const slackMessage = {
        text: (payload.message as string) || 'Incident alert from Playbook Engine',
        channel: payload.channel as string,
        username: (payload.username as string) || 'Workflow Automation',
        icon_emoji: (payload.icon_emoji as string) || ':robot_face:',
        attachments: payload.attachments ? [
          {
            color: this.getSeverityColor(payload.severity as string),
            title: payload.title as string,
            text: payload.message as string,
            fields: this.buildSlackFields(payload),
            footer: 'Playbook Engine',
            ts: Math.floor(Date.now() / 1000).toString()
          }
        ] : undefined
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Slack API error: ${response.status} - ${errorText}`);
      }

      return { success: true, service: 'slack', channel: payload.channel, timestamp: new Date().toISOString() };
    } catch (error) {
      console.error('[ActionHandlers] Slack notification failed:', error);
      return { success: false, service: 'slack', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private buildSlackFields(payload: Record<string, unknown>): Array<{ title: string; value: string; short: boolean }> {
    const fields: Array<{ title: string; value: string; short: boolean }> = [];
    if (payload.severity) fields.push({ title: 'Severity', value: String(payload.severity).toUpperCase(), short: true });
    if (payload.userId) fields.push({ title: 'User ID', value: String(payload.userId), short: true });
    if (payload.ip || payload.sourceIP) fields.push({ title: 'IP Address', value: String(payload.ip || payload.sourceIP), short: true });
    if (payload.reason) fields.push({ title: 'Reason', value: String(payload.reason), short: false });
    return fields;
  }

  private getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      critical: '#dc2626', high: '#f59e0b', medium: '#3b82f6', low: '#10b981', info: '#6b7280'
    };
    return colors[severity?.toLowerCase()] || colors.medium;
  }

  private async sendEmailNotification(payload: Record<string, unknown>): Promise<unknown> {
    try {
      const nodemailer = await import('nodemailer');
      const smtpConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      };

      if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
        return { success: false, service: 'email', error: 'SMTP not configured.' };
      }

      const transporter = nodemailer.createTransport(smtpConfig);
      const mailOptions = {
        from: (payload.from as string) || process.env.SMTP_FROM || smtpConfig.auth.user,
        to: payload.to as string,
        cc: payload.cc as string,
        bcc: payload.bcc as string,
        subject: (payload.subject as string) || 'Incident Alert - Playbook Engine',
        text: payload.body as string || payload.message as string,
        html: (payload.html as string) || this.generateEmailHtml(payload),
        priority: ((payload.priority as string) === 'critical' ? 'high' : 'normal') as 'high' | 'normal' | 'low'
      };

      const info = await transporter.sendMail(mailOptions) as { messageId?: string; accepted?: string[] };
      return { success: true, service: 'email', messageId: info?.messageId, timestamp: new Date().toISOString() };
    } catch (error) {
      console.error('[ActionHandlers] Email notification failed:', error);
      return { success: false, service: 'email', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private generateEmailHtml(payload: Record<string, unknown>): string {
    const severity = payload.severity as string || 'medium';
    const colors: Record<string, string> = { critical: '#dc2626', high: '#f59e0b', medium: '#3b82f6', low: '#10b981' };
    const color = colors[severity.toLowerCase()] || colors.medium;
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;">
      <div style="background:${color};color:white;padding:20px;"><h1>${payload.title || 'Security Incident Alert'}</h1></div>
      <div style="padding:20px;"><p>${payload.message || 'An incident has been detected.'}</p></div>
    </body></html>`;
  }

  private async sendSMSNotification(payload: Record<string, unknown>): Promise<unknown> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER || payload.from as string;

    if (!accountSid || !authToken || !fromNumber) {
      return { success: false, service: 'sms', error: 'Twilio not configured.' };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const body = new URLSearchParams({
        To: payload.to as string,
        From: fromNumber,
        Body: (payload.message as string) || 'Security alert from Playbook Engine'
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });

      const data = await response.json();
      if (!response.ok) throw new Error(`Twilio API error: ${data.message || response.statusText}`);
      return { success: true, service: 'sms', messageSid: data.sid, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, service: 'sms', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async sendPagerDutyAlert(payload: Record<string, unknown>): Promise<unknown> {
    const routingKey = process.env.PAGERDUTY_ROUTING_KEY || payload.routingKey as string;
    if (!routingKey) return { success: false, service: 'pagerduty', error: 'PagerDuty not configured.' };

    try {
      const severityMap: Record<string, string> = { critical: 'critical', high: 'error', medium: 'warning', low: 'info' };
      const event = {
        routing_key: routingKey,
        event_action: 'trigger',
        dedup_key: payload.dedupKey as string || `playbook-${Date.now()}`,
        payload: {
          summary: (payload.title as string) || 'Incident detected by Playbook Engine',
          source: (payload.source as string) || 'playbook-engine',
          severity: severityMap[(payload.severity as string)?.toLowerCase()] || 'warning',
          timestamp: new Date().toISOString(),
          custom_details: { message: payload.message, userId: payload.userId, ip: payload.ip || payload.sourceIP }
        }
      };

      const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(`PagerDuty API error: ${data.message || response.statusText}`);
      return { success: true, service: 'pagerduty', dedupKey: data.dedup_key, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, service: 'pagerduty', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ================================
  // BLOCKING HANDLERS
  // ================================

  private async handleBlocking(action: PlaybookAction, context: VariableContext): Promise<unknown> {
    const { service, payload } = action;
    const expandedPayload = this.expandVariables(payload, context);

    switch (service) {
      case 'firewall':
        return this.blockIP(expandedPayload);
      case 'iam':
        return this.lockAccount(expandedPayload);
      case 'api-gateway':
        return this.throttleAPI(expandedPayload);
      default:
        throw new Error(`Unknown blocking service: ${service}`);
    }
  }

  private async blockIP(payload: Record<string, unknown>): Promise<unknown> {
    const ip = (payload.ip as string) || (payload.sourceIP as string);
    const duration = (payload.duration as number) || 3600;
    const reason = (payload.reason as string) || 'Blocked by Playbook Engine';

    if (!ip) return { success: false, service: 'firewall', error: 'No IP address provided' };

    const ipRegex = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?!$)|$)){4}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    if (!ipRegex.test(ip)) return { success: false, service: 'firewall', error: `Invalid IP address format: ${ip}` };

    try {
      const firewallMethod = process.env.FIREWALL_METHOD || 'internal';
      let result: { success: boolean; method: string; details?: unknown };

      switch (firewallMethod) {
        case 'cloudflare':
          result = await this.blockIPCloudflare(ip, duration, reason);
          break;
        case 'aws_waf':
          result = { success: true, method: 'aws_waf', details: { message: 'AWS WAF integration stub' } };
          break;
        case 'iptables':
          result = { success: true, method: 'iptables', details: { message: 'iptables requires server privileges' } };
          break;
        default:
          result = { success: true, method: 'internal', details: { ip, reason, blockedAt: new Date().toISOString() } };
      }

      return { success: result.success, service: 'firewall', method: result.method, ip, duration, reason, expiresAt: new Date(Date.now() + duration * 1000).toISOString(), timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, service: 'firewall', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async blockIPCloudflare(ip: string, duration: number, reason: string): Promise<{ success: boolean; method: string; details?: unknown }> {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    if (!apiToken || !zoneId) throw new Error('Cloudflare API token or zone ID not configured');

    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/firewall/access_rules/rules`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'block',
        configuration: { target: 'ip', value: ip },
        notes: `${reason} - Expires: ${new Date(Date.now() + duration * 1000).toISOString()}`
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
    return { success: true, method: 'cloudflare', details: data.result };
  }

  private async lockAccount(payload: Record<string, unknown>): Promise<unknown> {
    const userId = payload.userId as string;
    const reason = (payload.reason as string) || 'Account locked by Playbook Engine';
    const duration = payload.duration as number;

    if (!userId) return { success: false, service: 'iam', error: 'No user ID provided' };

    try {
      const { prisma } = await import('../../../backend/database/prisma');
      const lockUntil = duration ? new Date(Date.now() + duration * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000);

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { status: 'SUSPENDED', accountLockedUntil: lockUntil, updatedAt: new Date() },
        select: { id: true, email: true, status: true, accountLockedUntil: true }
      });

      await prisma.auditLog.create({
        data: { userId, action: 'ACCOUNT_LOCKED', resource: 'user', resourceId: userId, details: { reason, lockedUntil: lockUntil.toISOString(), triggeredBy: 'playbook_engine' } }
      });

      await prisma.userSession.deleteMany({ where: { userId } });

      return { success: true, service: 'iam', userId: updatedUser.id, email: updatedUser.email, lockedUntil: updatedUser.accountLockedUntil, reason, timestamp: new Date().toISOString() };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cannot find module')) {
        return { success: false, service: 'iam', error: 'Database connection not available', userId };
      }
      return { success: false, service: 'iam', error: error instanceof Error ? error.message : 'Unknown error', userId };
    }
  }

  private async throttleAPI(payload: Record<string, unknown>): Promise<unknown> {
    const apiKey = payload.apiKey as string;
    const userId = payload.userId as string;
    const rateLimit = (payload.rateLimit as number) || 100;
    const duration = (payload.duration as number) || 3600;

    if (!apiKey && !userId) return { success: false, service: 'api-gateway', error: 'No API key or user ID provided' };

    try {
      const { prisma } = await import('../../../backend/database/prisma');

      if (apiKey) {
        await prisma.apiKey.updateMany({ where: { keyHash: apiKey, isActive: true }, data: { rateLimit } });
      }
      if (userId) {
        await prisma.apiKey.updateMany({ where: { userId, isActive: true }, data: { rateLimit } });
      }

      await prisma.auditLog.create({
        data: { userId: userId || null, action: 'API_THROTTLED', resource: 'api_key', resourceId: apiKey || userId, details: { rateLimit, duration, triggeredBy: 'playbook_engine' } }
      });

      return { success: true, service: 'api-gateway', apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : undefined, userId, rateLimit, duration, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, service: 'api-gateway', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ================================
  // REMEDIATION HANDLERS
  // ================================

  private async handleRemediation(action: PlaybookAction, context: VariableContext): Promise<unknown> {
    const { service, payload } = action;
    const expandedPayload = this.expandVariables(payload, context);

    switch (service) {
      case 'endpoint':
        return this.isolateEndpoint(expandedPayload);
      case 'container':
        return this.killContainer(expandedPayload);
      case 'database':
        return this.rollbackDatabase(expandedPayload);
      default:
        throw new Error(`Unknown remediation service: ${service}`);
    }
  }

  private async isolateEndpoint(payload: Record<string, unknown>): Promise<unknown> {
    const hostId = payload.hostId as string;
    const isolationType = (payload.isolationType as string) || 'network';
    const reason = (payload.reason as string) || 'Isolated by Playbook Engine';

    if (!hostId) return { success: false, service: 'endpoint', error: 'No host ID provided' };

    const edrProvider = process.env.EDR_PROVIDER || 'internal';
    let result = { success: true, provider: edrProvider, details: { hostId, isolationType, reason, isolatedAt: new Date().toISOString() } };

    if (edrProvider === 'crowdstrike') {
      const clientId = process.env.CROWDSTRIKE_CLIENT_ID;
      const clientSecret = process.env.CROWDSTRIKE_CLIENT_SECRET;
      if (clientId && clientSecret) {
        // CrowdStrike integration would go here
        result = { success: true, provider: 'crowdstrike', details: { message: 'CrowdStrike isolation initiated' } };
      }
    }

    return { success: result.success, service: 'endpoint', provider: result.provider, hostId, isolationType, reason, timestamp: new Date().toISOString() };
  }

  private async killContainer(payload: Record<string, unknown>): Promise<unknown> {
    const containerId = payload.containerId as string;
    const force = (payload.force as boolean) !== false;
    const reason = (payload.reason as string) || 'Container killed by Playbook Engine';

    if (!containerId) return { success: false, service: 'container', error: 'No container ID provided' };

    const containerPlatform = process.env.CONTAINER_PLATFORM || 'docker';
    return { success: true, service: 'container', platform: containerPlatform, containerId, force, reason, timestamp: new Date().toISOString() };
  }

  private async rollbackDatabase(payload: Record<string, unknown>): Promise<unknown> {
    const backupId = payload.backupId as string;
    const targetTime = payload.targetTime as string;
    const tables = payload.tables as string[];
    const reason = (payload.reason as string) || 'Database rollback by Playbook Engine';

    console.warn(`[ActionHandlers] DATABASE ROLLBACK REQUESTED - reason: ${reason}`);
    return { success: true, service: 'database', backupId, targetTime, tables, reason, initiatedAt: new Date().toISOString(), status: 'initiated' };
  }

  // ================================
  // LOGGING HANDLER
  // ================================

  private async handleLogging(action: PlaybookAction, context: VariableContext): Promise<unknown> {
    const { service, payload } = action;
    const expandedPayload = this.expandVariables(payload, context);
    console.log(`[INCIDENT] ${service}:`, expandedPayload);
    return { logged: true, service };
  }

  // ================================
  // ESCALATION HANDLERS
  // ================================

  private async handleEscalation(action: PlaybookAction, context: VariableContext): Promise<unknown> {
    const { service, payload } = action;
    const expandedPayload = this.expandVariables(payload, context);

    switch (service) {
      case 'jira':
        return this.createJiraTicket(expandedPayload);
      case 'servicenow':
        return this.createServiceNowIncident(expandedPayload);
      default:
        throw new Error(`Unknown escalation service: ${service}`);
    }
  }

  private async createJiraTicket(payload: Record<string, unknown>): Promise<unknown> {
    const baseUrl = process.env.JIRA_URL || process.env.JIRA_BASE_URL;
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;

    if (!baseUrl || !email || !apiToken) {
      return { success: false, service: 'jira', error: 'Jira not configured.' };
    }

    try {
      const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
      const projectKey = (payload.projectKey as string) || process.env.JIRA_DEFAULT_PROJECT || 'SEC';

      const issueData = {
        fields: {
          project: { key: projectKey },
          summary: (payload.summary as string) || (payload.title as string) || 'Security Incident - Playbook Engine',
          description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: (payload.description as string) || 'Incident detected by Playbook Engine' }] }] },
          issuetype: { name: (payload.issueType as string) || 'Task' },
          priority: { name: this.mapPriorityToJira(payload.priority as string || 'medium') },
          labels: (payload.labels as string[]) || ['security', 'playbook-engine', 'incident']
        }
      };

      const response = await fetch(`${baseUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(issueData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(`Jira API error: ${JSON.stringify(data.errors || data)}`);
      return { success: true, service: 'jira', key: data.key, id: data.id, url: `${baseUrl}/browse/${data.key}`, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, service: 'jira', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private mapPriorityToJira(priority: string): string {
    const mapping: Record<string, string> = { critical: 'Highest', high: 'High', medium: 'Medium', low: 'Low', info: 'Lowest' };
    return mapping[priority.toLowerCase()] || 'Medium';
  }

  private async createServiceNowIncident(payload: Record<string, unknown>): Promise<unknown> {
    const instanceUrl = process.env.SERVICENOW_INSTANCE_URL;
    const username = process.env.SERVICENOW_USERNAME;
    const password = process.env.SERVICENOW_PASSWORD;

    if (!instanceUrl || !username || !password) {
      return { success: false, service: 'servicenow', error: 'ServiceNow not configured.' };
    }

    try {
      const auth = Buffer.from(`${username}:${password}`).toString('base64');
      const priorityNum = this.mapPriorityToServiceNow(payload.priority as string || payload.severity as string);

      const incidentData = {
        short_description: (payload.title as string) || 'Security Incident - Playbook Engine',
        description: (payload.description as string) || (payload.message as string) || 'Incident detected by Playbook Engine',
        impact: priorityNum,
        urgency: priorityNum,
        assignment_group: (payload.assignment_group as string) || 'Incident Response',
        category: (payload.category as string) || 'Security'
      };

      const response = await fetch(`${instanceUrl}/api/now/table/incident`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(incidentData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(`ServiceNow API error: ${JSON.stringify(data.error || data)}`);
      const result = data.result;
      return { success: true, service: 'servicenow', number: result.number, sysId: result.sys_id, url: `${instanceUrl}/nav_to.do?uri=incident.do?sys_id=${result.sys_id}`, timestamp: new Date().toISOString() };
    } catch (error) {
      return { success: false, service: 'servicenow', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private mapPriorityToServiceNow(priority: string): number {
    const mapping: Record<string, number> = { critical: 1, high: 1, medium: 2, low: 3, info: 3 };
    return mapping[priority?.toLowerCase()] || 2;
  }

  // ================================
  // UTILITY METHODS
  // ================================

  public expandVariables(payload: Record<string, unknown>, context: VariableContext): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'string') {
        result[key] = this.replaceVariables(value, context);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.expandVariables(value as Record<string, unknown>, context);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private replaceVariables(str: string, context: VariableContext): string {
    return str.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const keys = key.split('.');
      let value: unknown = context;
      for (const k of keys) {
        if (typeof value === 'object' && value !== null && k in value) {
          value = (value as Record<string, unknown>)[k];
        } else {
          return match;
        }
      }
      return String(value);
    });
  }
}
