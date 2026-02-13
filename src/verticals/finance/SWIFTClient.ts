/**
 * SWIFT Client
 * Handles SWIFT MT and MX (ISO 20022) message processing
 */

import type { SWIFTMessage, SWIFTMessageType, SWIFTBlock, SWIFTField, SWIFTMT103 } from './types/finance';

export interface SWIFTConfig {
  bic: string;
  endpoint?: string;
  apiKey?: string;
  useTestEnvironment?: boolean;
}

export class SWIFTClient {
  private config: SWIFTConfig;

  constructor(config: SWIFTConfig) {
    this.config = config;
  }

  /**
   * Parse SWIFT MT message
   */
  parseMT(rawMessage: string): SWIFTMessage {
    const lines = rawMessage.split('\n').filter(l => l.trim());

    // Parse blocks
    const blocks: SWIFTBlock[] = [];
    let currentBlock = '';
    let blockContent = '';

    for (const line of lines) {
      if (line.startsWith('{')) {
        if (currentBlock) {
          blocks.push({ blockId: currentBlock, content: blockContent.trim() });
        }
        currentBlock = line.substring(1, 2);
        blockContent = line.substring(3);
      } else {
        blockContent += '\n' + line;
      }
    }

    if (currentBlock) {
      blocks.push({ blockId: currentBlock, content: blockContent.trim() });
    }

    // Extract basic header info
    const block1 = blocks.find(b => b.blockId === '1'); // Basic Header
    const block2 = blocks.find(b => b.blockId === '2'); // Application Header
    const block4 = blocks.find(b => b.blockId === '4'); // Text Block

    const messageType = this.extractMessageType(block2?.content || '');
    const sender = this.extractBIC(block1?.content || '', true);
    const receiver = this.extractBIC(block2?.content || '', false);
    const messageReference = this.extractField(block4?.content || '', '20') || '';

    // Parse fields in block 4
    if (block4) {
      block4.fields = this.parseFields(block4.content);
    }

    return {
      messageType,
      sender,
      receiver,
      messageReference,
      timestamp: new Date(),
      priority: this.extractPriority(block2?.content || ''),
      blocks,
      raw: rawMessage,
    };
  }

  /**
   * Parse MT103 specifically
   */
  parseMT103(rawMessage: string): SWIFTMT103 {
    const message = this.parseMT(rawMessage);
    const block4 = message.blocks.find(b => b.blockId === '4');

    if (!block4?.fields) {
      throw new Error('Invalid MT103 message: missing text block');
    }

    const getField = (tag: string) => block4.fields?.find(f => f.tag === tag)?.value || '';
    const getFieldLines = (tag: string) => getField(tag).split('\n');

    const valueDateAmount = getField('32A');
    const valueDate = this.parseValueDate(valueDateAmount.substring(0, 6));
    const currency = valueDateAmount.substring(6, 9);
    const amount = parseFloat(valueDateAmount.substring(9).replace(',', '.'));

    const orderingCustomer = getFieldLines('50K');
    const beneficiaryCustomer = getFieldLines('59');

    return {
      messageType: 'MT103',
      senderReference: getField('20'),
      timeIndication: getField('13C'),
      bankOperationCode: getField('23B'),
      instructionCode: getField('23E'),
      transactionTypeCode: getField('26T'),
      valueDate,
      currency,
      amount,
      orderingCustomer: {
        account: orderingCustomer[0]?.startsWith('/') ? orderingCustomer[0].substring(1) : undefined,
        name: orderingCustomer.find(l => !l.startsWith('/')) || '',
        address: orderingCustomer.slice(2),
      },
      sendingInstitution: getField('51A'),
      orderingInstitution: getField('52A'),
      sendersCorrespondent: getField('53A'),
      receiversCorrespondent: getField('54A'),
      intermediaryInstitution: getField('56A'),
      accountWithInstitution: getField('57A'),
      beneficiaryCustomer: {
        account: beneficiaryCustomer[0]?.startsWith('/') ? beneficiaryCustomer[0].substring(1) : undefined,
        name: beneficiaryCustomer.find(l => !l.startsWith('/')) || '',
        address: beneficiaryCustomer.slice(2),
      },
      remittanceInformation: getField('70'),
      detailsOfCharges: getField('71A') as any,
      senderToReceiverInfo: getField('72'),
    };
  }

  /**
   * Generate MT103 message
   */
  generateMT103(data: SWIFTMT103): string {
    const lines: string[] = [];

    // Block 1: Basic Header
    lines.push(`{1:F01${this.config.bic}0000000000}`);

    // Block 2: Application Header
    const priority = 'N'; // Normal
    const deliveryMonitoring = '2'; // Non-delivery notification
    const obsolescencePeriod = '020'; // 20 minutes
    lines.push(`{2:I103${data.accountWithInstitution}${priority}${deliveryMonitoring}${obsolescencePeriod}}`);

    // Block 3: User Header (optional)
    lines.push('{3:{108:' + data.senderReference + '}}');

    // Block 4: Text
    lines.push('{4:');
    lines.push(':20:' + data.senderReference);

    if (data.timeIndication) lines.push(':13C:' + data.timeIndication);
    lines.push(':23B:' + (data.bankOperationCode || 'CRED'));
    if (data.instructionCode) lines.push(':23E:' + data.instructionCode);
    if (data.transactionTypeCode) lines.push(':26T:' + data.transactionTypeCode);

    const valueDateStr = this.formatValueDate(data.valueDate);
    lines.push(`:32A:${valueDateStr}${data.currency}${data.amount.toFixed(2).replace('.', ',')}`);

    // Ordering Customer (50K)
    const orderingLines: string[] = [];
    if (data.orderingCustomer.account) {
      orderingLines.push('/' + data.orderingCustomer.account);
    }
    orderingLines.push(data.orderingCustomer.name);
    if (data.orderingCustomer.address) {
      orderingLines.push(...data.orderingCustomer.address);
    }
    lines.push(':50K:' + orderingLines.join('\n'));

    if (data.sendingInstitution) lines.push(':51A:' + data.sendingInstitution);
    if (data.orderingInstitution) lines.push(':52A:' + data.orderingInstitution);
    if (data.sendersCorrespondent) lines.push(':53A:' + data.sendersCorrespondent);
    if (data.receiversCorrespondent) lines.push(':54A:' + data.receiversCorrespondent);
    if (data.intermediaryInstitution) lines.push(':56A:' + data.intermediaryInstitution);

    lines.push(':57A:' + data.accountWithInstitution);

    // Beneficiary Customer (59)
    const beneficiaryLines: string[] = [];
    if (data.beneficiaryCustomer.account) {
      beneficiaryLines.push('/' + data.beneficiaryCustomer.account);
    }
    beneficiaryLines.push(data.beneficiaryCustomer.name);
    if (data.beneficiaryCustomer.address) {
      beneficiaryLines.push(...data.beneficiaryCustomer.address);
    }
    lines.push(':59:' + beneficiaryLines.join('\n'));

    if (data.remittanceInformation) {
      lines.push(':70:' + data.remittanceInformation);
    }

    lines.push(':71A:' + (data.detailsOfCharges || 'SHA'));

    if (data.senderToReceiverInfo) {
      lines.push(':72:' + data.senderToReceiverInfo);
    }

    lines.push('-}');

    // Block 5: Trailers (optional)
    lines.push('{5:{CHK:' + this.calculateChecksum(lines.join('\n')) + '}}');

    return lines.join('\n');
  }

  /**
   * Send SWIFT message
   */
  async sendMessage(message: SWIFTMessage | string): Promise<{ sent: boolean; reference: string }> {
    const rawMessage = typeof message === 'string' ? message : message.raw;

    // In production, send to SWIFT network via secure connection
    // For now, return mock response
    return {
      sent: true,
      reference: `SWIFT-${Date.now()}`,
    };
  }

  /**
   * Extract message type from block 2
   */
  private extractMessageType(block2: string): SWIFTMessageType {
    const match = block2.match(/^[IO](\d{3})/);
    if (match) {
      return ('MT' + match[1]) as SWIFTMessageType;
    }
    return 'MT103'; // Default
  }

  /**
   * Extract BIC from block
   */
  private extractBIC(content: string, isSender: boolean): string {
    // BIC is typically 8 or 11 characters
    const match = content.match(/[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?/);
    return match ? match[0] : this.config.bic;
  }

  /**
   * Extract priority from block 2
   */
  private extractPriority(block2: string): 'U' | 'N' | 'S' {
    if (block2.includes('U')) return 'U';
    if (block2.includes('S')) return 'S';
    return 'N';
  }

  /**
   * Extract field value from text block
   */
  private extractField(content: string, tag: string): string | undefined {
    const regex = new RegExp(`:${tag}:([^:]+?)(?=:|$)`, 's');
    const match = content.match(regex);
    return match ? match[1].trim() : undefined;
  }

  /**
   * Parse fields in text block
   */
  private parseFields(content: string): SWIFTField[] {
    const fields: SWIFTField[] = [];
    const fieldRegex = /:(\d{2}[A-Z]?):(.*?)(?=:\d{2}[A-Z]?:|$)/gs;

    let match;
    while ((match = fieldRegex.exec(content)) !== null) {
      fields.push({
        tag: match[1],
        value: match[2].trim(),
        name: this.getFieldName(match[1]),
      });
    }

    return fields;
  }

  /**
   * Get field name from tag
   */
  private getFieldName(tag: string): string {
    const names: Record<string, string> = {
      '20': 'Transaction Reference Number',
      '13C': 'Time Indication',
      '23B': 'Bank Operation Code',
      '23E': 'Instruction Code',
      '26T': 'Transaction Type Code',
      '32A': 'Value Date/Currency/Amount',
      '50K': 'Ordering Customer',
      '51A': 'Sending Institution',
      '52A': 'Ordering Institution',
      '53A': 'Sender\'s Correspondent',
      '54A': 'Receiver\'s Correspondent',
      '56A': 'Intermediary Institution',
      '57A': 'Account With Institution',
      '59': 'Beneficiary Customer',
      '70': 'Remittance Information',
      '71A': 'Details of Charges',
      '72': 'Sender to Receiver Information',
    };

    return names[tag] || `Field ${tag}`;
  }

  /**
   * Parse value date (YYMMDD format)
   */
  private parseValueDate(dateStr: string): Date {
    const year = 2000 + parseInt(dateStr.substring(0, 2));
    const month = parseInt(dateStr.substring(2, 4)) - 1;
    const day = parseInt(dateStr.substring(4, 6));
    return new Date(year, month, day);
  }

  /**
   * Format value date to YYMMDD
   */
  private formatValueDate(date: Date): string {
    const year = date.getFullYear().toString().substring(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return year + month + day;
  }

  /**
   * Calculate checksum for SWIFT message
   */
  private calculateChecksum(message: string): string {
    let sum = 0;
    for (let i = 0; i < message.length; i++) {
      sum += message.charCodeAt(i);
    }
    return sum.toString(16).toUpperCase().padStart(12, '0');
  }

  /**
   * Validate SWIFT message
   */
  validate(message: SWIFTMessage): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!message.sender || message.sender.length < 8) {
      errors.push('Invalid sender BIC');
    }

    if (!message.receiver || message.receiver.length < 8) {
      errors.push('Invalid receiver BIC');
    }

    if (!message.messageReference) {
      errors.push('Message reference is required');
    }

    // Message type-specific validation
    if (message.messageType === 'MT103') {
      const block4 = message.blocks.find(b => b.blockId === '4');
      if (!block4) {
        errors.push('MT103 requires text block (Block 4)');
      }

      const requiredFields = ['20', '32A', '50K', '57A', '59'];
      for (const field of requiredFields) {
        if (!block4?.fields?.some(f => f.tag === field)) {
          errors.push(`MT103 requires field :${field}:`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Convert MT to MX (ISO 20022)
   */
  convertMTtoMX(mtMessage: SWIFTMessage): any {
    // This would convert legacy MT format to modern MX (ISO 20022) format
    // Implementation depends on specific message type
    return {
      messageType: 'MX',
      original: mtMessage.messageType,
      converted: true,
      // Full conversion logic would go here
    };
  }

  /**
   * Convert MX to MT
   */
  convertMXtoMT(mxMessage: any): string {
    // This would convert ISO 20022 XML to legacy MT format
    // Implementation depends on specific message type
    return `{1:F01${this.config.bic}0000000000}\n{2:I103...}`;
  }
}

export default SWIFTClient;
