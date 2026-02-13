/**
 * Email Parser Node
 * Parse emails and extract structured data (like Zapier's Email Parser)
 */

import { EventEmitter } from 'events';

export interface ParsedEmail {
  from: EmailAddress | null;
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  replyTo: EmailAddress | null;
  subject: string;
  textBody: string;
  htmlBody: string;
  date: Date | null;
  messageId: string | null;
  inReplyTo: string | null;
  references: string[];
  headers: Record<string, string>;
  attachments: Attachment[];
  extracted: ExtractedData;
}

export interface EmailAddress {
  name: string;
  email: string;
}

export interface Attachment {
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
  content?: string; // base64 encoded
}

export interface ExtractedData {
  emails: string[];
  urls: string[];
  phones: string[];
  dates: string[];
  amounts: AmountData[];
  addresses: string[];
  names: string[];
  trackingNumbers: TrackingNumber[];
  orderNumbers: string[];
  invoiceNumbers: string[];
  customFields: Record<string, string>;
}

export interface AmountData {
  value: number;
  currency: string;
  original: string;
}

export interface TrackingNumber {
  number: string;
  carrier: string;
}

export interface ParserRule {
  name: string;
  pattern: string | RegExp;
  flags?: string;
  group?: number;
  transform?: (value: string) => string;
}

export interface EmailParserConfig {
  extractEmails?: boolean;
  extractUrls?: boolean;
  extractPhones?: boolean;
  extractDates?: boolean;
  extractAmounts?: boolean;
  extractAddresses?: boolean;
  extractNames?: boolean;
  extractTrackingNumbers?: boolean;
  extractOrderNumbers?: boolean;
  customRules?: ParserRule[];
  parseAttachments?: boolean;
  decodeQuotedPrintable?: boolean;
  decodeBase64?: boolean;
}

export class EmailParser extends EventEmitter {
  private config: EmailParserConfig;

  constructor(config: EmailParserConfig = {}) {
    super();
    this.config = {
      extractEmails: true,
      extractUrls: true,
      extractPhones: true,
      extractDates: true,
      extractAmounts: true,
      extractAddresses: false,
      extractNames: false,
      extractTrackingNumbers: true,
      extractOrderNumbers: true,
      parseAttachments: true,
      decodeQuotedPrintable: true,
      decodeBase64: true,
      ...config
    };
  }

  /**
   * Parse raw email content
   */
  parse(rawEmail: string): ParsedEmail {
    this.emit('parsing:start', { size: rawEmail.length });

    const result: ParsedEmail = {
      from: null,
      to: [],
      cc: [],
      bcc: [],
      replyTo: null,
      subject: '',
      textBody: '',
      htmlBody: '',
      date: null,
      messageId: null,
      inReplyTo: null,
      references: [],
      headers: {},
      attachments: [],
      extracted: {
        emails: [],
        urls: [],
        phones: [],
        dates: [],
        amounts: [],
        addresses: [],
        names: [],
        trackingNumbers: [],
        orderNumbers: [],
        invoiceNumbers: [],
        customFields: {}
      }
    };

    try {
      // Split headers and body
      const [headerSection, ...bodyParts] = rawEmail.split(/\r?\n\r?\n/);
      const body = bodyParts.join('\n\n');

      // Parse headers
      result.headers = this.parseHeaders(headerSection);
      result.from = this.parseEmailAddress(result.headers['from']);
      result.to = this.parseEmailAddresses(result.headers['to']);
      result.cc = this.parseEmailAddresses(result.headers['cc']);
      result.bcc = this.parseEmailAddresses(result.headers['bcc']);
      result.replyTo = this.parseEmailAddress(result.headers['reply-to']);
      result.subject = this.decodeHeader(result.headers['subject'] || '');
      result.messageId = result.headers['message-id']?.replace(/[<>]/g, '') || null;
      result.inReplyTo = result.headers['in-reply-to']?.replace(/[<>]/g, '') || null;
      result.references = (result.headers['references'] || '').split(/\s+/).filter(Boolean);
      result.date = this.parseDate(result.headers['date']);

      // Parse body
      const contentType = result.headers['content-type'] || 'text/plain';
      if (contentType.includes('multipart')) {
        this.parseMultipart(body, contentType, result);
      } else {
        result.textBody = this.decodeBody(body, result.headers);
      }

      // Extract data from body
      const fullText = result.textBody + ' ' + this.stripHtml(result.htmlBody);
      this.extractData(fullText, result);

      this.emit('parsing:complete', { success: true });
    } catch (error) {
      this.emit('parsing:error', { error });
    }

    return result;
  }

  /**
   * Parse from structured email data
   */
  parseStructured(email: {
    from?: string;
    to?: string | string[];
    cc?: string | string[];
    subject?: string;
    body?: string;
    html?: string;
    date?: string | Date;
    headers?: Record<string, string>;
    attachments?: Attachment[];
  }): ParsedEmail {
    const result: ParsedEmail = {
      from: this.parseEmailAddress(email.from || ''),
      to: Array.isArray(email.to)
        ? email.to.map(e => this.parseEmailAddress(e)!).filter(Boolean)
        : this.parseEmailAddresses(email.to || ''),
      cc: Array.isArray(email.cc)
        ? email.cc.map(e => this.parseEmailAddress(e)!).filter(Boolean)
        : this.parseEmailAddresses(email.cc || ''),
      bcc: [],
      replyTo: null,
      subject: email.subject || '',
      textBody: email.body || '',
      htmlBody: email.html || '',
      date: email.date ? new Date(email.date) : null,
      messageId: null,
      inReplyTo: null,
      references: [],
      headers: email.headers || {},
      attachments: email.attachments || [],
      extracted: {
        emails: [],
        urls: [],
        phones: [],
        dates: [],
        amounts: [],
        addresses: [],
        names: [],
        trackingNumbers: [],
        orderNumbers: [],
        invoiceNumbers: [],
        customFields: {}
      }
    };

    const fullText = result.textBody + ' ' + this.stripHtml(result.htmlBody);
    this.extractData(fullText, result);

    return result;
  }

  /**
   * Extract specific field using custom rule
   */
  extractField(text: string, rule: ParserRule): string | null {
    try {
      const regex = typeof rule.pattern === 'string'
        ? new RegExp(rule.pattern, rule.flags || 'i')
        : rule.pattern;
      const match = text.match(regex);
      if (match) {
        let value = match[rule.group || 0];
        if (rule.transform) {
          value = rule.transform(value);
        }
        return value;
      }
    } catch (error) {
      this.emit('extract:error', { rule: rule.name, error });
    }
    return null;
  }

  /**
   * Extract all fields matching pattern
   */
  extractAllFields(text: string, rule: ParserRule): string[] {
    const results: string[] = [];
    try {
      const regex = typeof rule.pattern === 'string'
        ? new RegExp(rule.pattern, (rule.flags || '') + 'g')
        : new RegExp(rule.pattern.source, rule.pattern.flags + 'g');
      let match;
      while ((match = regex.exec(text)) !== null) {
        let value = match[rule.group || 0];
        if (rule.transform) {
          value = rule.transform(value);
        }
        results.push(value);
      }
    } catch (error) {
      this.emit('extract:error', { rule: rule.name, error });
    }
    return results;
  }

  private parseHeaders(headerSection: string): Record<string, string> {
    const headers: Record<string, string> = {};
    const lines = headerSection.split(/\r?\n/);
    let currentHeader = '';
    let currentValue = '';

    for (const line of lines) {
      if (/^\s/.test(line)) {
        // Continuation of previous header
        currentValue += ' ' + line.trim();
      } else {
        if (currentHeader) {
          headers[currentHeader.toLowerCase()] = currentValue;
        }
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          currentHeader = line.substring(0, colonIndex);
          currentValue = line.substring(colonIndex + 1).trim();
        }
      }
    }
    if (currentHeader) {
      headers[currentHeader.toLowerCase()] = currentValue;
    }

    return headers;
  }

  private parseEmailAddress(value: string | undefined): EmailAddress | null {
    if (!value) return null;
    // Match "Name" <email> or Name <email> or just email
    const match = value.match(/(?:["']?([^"'<>]+)["']?\s*)?<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/);
    if (match) {
      return {
        name: match[1]?.trim() || '',
        email: match[2]
      };
    }
    return null;
  }

  private parseEmailAddresses(value: string | undefined): EmailAddress[] {
    if (!value) return [];
    const addresses: EmailAddress[] = [];
    const parts = value.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
    for (const part of parts) {
      const addr = this.parseEmailAddress(part.trim());
      if (addr) addresses.push(addr);
    }
    return addresses;
  }

  private decodeHeader(value: string): string {
    // Decode RFC 2047 encoded-words
    return value.replace(/=\?([^?]+)\?([BQ])\?([^?]+)\?=/gi, (_, charset, encoding, encoded) => {
      if (encoding.toUpperCase() === 'B') {
        return Buffer.from(encoded, 'base64').toString('utf-8');
      } else {
        return encoded.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (__, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        );
      }
    });
  }

  private parseDate(value: string | undefined): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  private parseMultipart(body: string, contentType: string, result: ParsedEmail): void {
    const boundaryMatch = contentType.match(/boundary=["']?([^"'\s;]+)["']?/i);
    if (!boundaryMatch) return;

    const boundary = boundaryMatch[1];
    const parts = body.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

    for (const part of parts) {
      if (part.trim() === '' || part.trim() === '--') continue;

      const [partHeaders, ...partBodyParts] = part.split(/\r?\n\r?\n/);
      const partBody = partBodyParts.join('\n\n');
      const headers = this.parseHeaders(partHeaders);
      const partContentType = headers['content-type'] || 'text/plain';

      if (partContentType.includes('multipart')) {
        this.parseMultipart(partBody, partContentType, result);
      } else if (partContentType.includes('text/plain')) {
        result.textBody = this.decodeBody(partBody, headers);
      } else if (partContentType.includes('text/html')) {
        result.htmlBody = this.decodeBody(partBody, headers);
      } else if (this.config.parseAttachments) {
        const disposition = headers['content-disposition'] || '';
        const filename = disposition.match(/filename=["']?([^"';\n]+)["']?/i)?.[1] || 'attachment';
        result.attachments.push({
          filename,
          contentType: partContentType.split(';')[0].trim(),
          size: partBody.length,
          contentId: headers['content-id']?.replace(/[<>]/g, ''),
          content: partBody.trim()
        });
      }
    }
  }

  private decodeBody(body: string, headers: Record<string, string>): string {
    const encoding = headers['content-transfer-encoding']?.toLowerCase();

    if (encoding === 'base64' && this.config.decodeBase64) {
      try {
        return Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf-8');
      } catch {
        return body;
      }
    }

    if (encoding === 'quoted-printable' && this.config.decodeQuotedPrintable) {
      return body
        .replace(/=\r?\n/g, '')
        .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    }

    return body;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractData(text: string, result: ParsedEmail): void {
    if (this.config.extractEmails) {
      result.extracted.emails = this.extractEmails(text);
    }
    if (this.config.extractUrls) {
      result.extracted.urls = this.extractUrls(text);
    }
    if (this.config.extractPhones) {
      result.extracted.phones = this.extractPhones(text);
    }
    if (this.config.extractDates) {
      result.extracted.dates = this.extractDates(text);
    }
    if (this.config.extractAmounts) {
      result.extracted.amounts = this.extractAmounts(text);
    }
    if (this.config.extractTrackingNumbers) {
      result.extracted.trackingNumbers = this.extractTrackingNumbers(text);
    }
    if (this.config.extractOrderNumbers) {
      result.extracted.orderNumbers = this.extractOrderNumbers(text);
      result.extracted.invoiceNumbers = this.extractInvoiceNumbers(text);
    }

    // Apply custom rules
    if (this.config.customRules) {
      for (const rule of this.config.customRules) {
        const values = this.extractAllFields(text, rule);
        if (values.length > 0) {
          result.extracted.customFields[rule.name] = values.join(', ');
        }
      }
    }
  }

  private extractEmails(text: string): string[] {
    const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return [...new Set(text.match(regex) || [])];
  }

  private extractUrls(text: string): string[] {
    const regex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
    return [...new Set(text.match(regex) || [])];
  }

  private extractPhones(text: string): string[] {
    const regex = /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;
    return [...new Set(text.match(regex) || [])];
  }

  private extractDates(text: string): string[] {
    const datePatterns = [
      /\d{1,2}\/\d{1,2}\/\d{2,4}/g,
      /\d{1,2}-\d{1,2}-\d{2,4}/g,
      /\d{4}-\d{2}-\d{2}/g,
      /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/gi
    ];
    const dates: string[] = [];
    for (const pattern of datePatterns) {
      const matches = text.match(pattern) || [];
      dates.push(...matches);
    }
    return [...new Set(dates)];
  }

  private extractAmounts(text: string): AmountData[] {
    const amounts: AmountData[] = [];
    const patterns = [
      { regex: /\$([0-9,]+\.?\d*)/g, currency: 'USD' },
      { regex: /€([0-9,]+\.?\d*)/g, currency: 'EUR' },
      { regex: /£([0-9,]+\.?\d*)/g, currency: 'GBP' },
      { regex: /USD\s*([0-9,]+\.?\d*)/g, currency: 'USD' },
      { regex: /EUR\s*([0-9,]+\.?\d*)/g, currency: 'EUR' }
    ];

    for (const { regex, currency } of patterns) {
      let match;
      while ((match = regex.exec(text)) !== null) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value)) {
          amounts.push({ value, currency, original: match[0] });
        }
      }
    }

    return amounts;
  }

  private extractTrackingNumbers(text: string): TrackingNumber[] {
    const trackingPatterns = [
      { regex: /\b(1Z[A-Z0-9]{16})\b/gi, carrier: 'UPS' },
      { regex: /\b(\d{12,22})\b/g, carrier: 'FedEx' },
      { regex: /\b(94\d{20,22})\b/g, carrier: 'USPS' },
      { regex: /\b([A-Z]{2}\d{9}[A-Z]{2})\b/g, carrier: 'International' }
    ];

    const tracking: TrackingNumber[] = [];
    for (const { regex, carrier } of trackingPatterns) {
      let match;
      while ((match = regex.exec(text)) !== null) {
        tracking.push({ number: match[1], carrier });
      }
    }
    return tracking;
  }

  private extractOrderNumbers(text: string): string[] {
    const patterns = [
      /order\s*(?:#|number|num|no\.?)?:?\s*([A-Z0-9-]+)/gi,
      /order\s+id:?\s*([A-Z0-9-]+)/gi,
      /#([A-Z0-9-]{6,})/g
    ];
    const orders: string[] = [];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        orders.push(match[1]);
      }
    }
    return [...new Set(orders)];
  }

  private extractInvoiceNumbers(text: string): string[] {
    const patterns = [
      /invoice\s*(?:#|number|num|no\.?)?:?\s*([A-Z0-9-]+)/gi,
      /inv[.-]?([A-Z0-9-]+)/gi
    ];
    const invoices: string[] = [];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        invoices.push(match[1]);
      }
    }
    return [...new Set(invoices)];
  }
}

// Export factory function
export function createEmailParser(config?: EmailParserConfig): EmailParser {
  return new EmailParser(config);
}
