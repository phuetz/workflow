/**
 * HL7 v2.x Parser
 * Parses HL7 v2.x pipe-delimited messages (ADT, ORM, ORU, MDM, SIU)
 */

import type {
  HL7Message,
  HL7Segment,
  HL7Patient,
  HL7Visit,
  HL7Provider,
  HL7Order,
  HL7Observation,
  HL7MessageType,
  HL7TriggerEvent,
} from './types/healthcare';

export class HL7Parser {
  private fieldSeparator = '|';
  private componentSeparator = '^';
  private repetitionSeparator = '~';
  private escapeChar = '\\';
  private subComponentSeparator = '&';

  /**
   * Parse raw HL7 message into structured object
   */
  parse(rawMessage: string): HL7Message {
    const lines = rawMessage.split(/\r?\n/).filter(line => line.trim());

    if (lines.length === 0) {
      throw new Error('Empty HL7 message');
    }

    // Parse MSH segment (header)
    const mshLine = lines[0];
    if (!mshLine.startsWith('MSH')) {
      throw new Error('Invalid HL7 message: must start with MSH segment');
    }

    // Extract separators from MSH
    this.extractSeparators(mshLine);

    const segments = lines.map(line => this.parseSegment(line));
    const msh = segments.find(s => s.name === 'MSH');

    if (!msh) {
      throw new Error('MSH segment not found');
    }

    const messageType = this.parseField(msh.fields[8])?.[0] as HL7MessageType;
    const triggerEvent = this.parseField(msh.fields[8])?.[1] as HL7TriggerEvent;

    return {
      messageType,
      triggerEvent,
      messageControlId: msh.fields[9] || '',
      timestamp: this.parseDateTime(msh.fields[6]),
      sendingApplication: msh.fields[2] || '',
      sendingFacility: msh.fields[3] || '',
      receivingApplication: msh.fields[4] || '',
      receivingFacility: msh.fields[5] || '',
      version: msh.fields[11] || '2.5',
      segments,
    };
  }

  /**
   * Extract separators from MSH segment
   */
  private extractSeparators(mshLine: string): void {
    if (mshLine.length < 9) {
      throw new Error('Invalid MSH segment');
    }

    this.fieldSeparator = mshLine[3];
    this.componentSeparator = mshLine[4];
    this.repetitionSeparator = mshLine[5];
    this.escapeChar = mshLine[6];
    this.subComponentSeparator = mshLine[7];
  }

  /**
   * Parse a single segment
   */
  private parseSegment(line: string): HL7Segment {
    const name = line.substring(0, 3);
    let fields: string[];

    if (name === 'MSH') {
      // MSH is special: field separator is between name and fields
      fields = ['MSH', this.fieldSeparator, ...line.substring(4).split(this.fieldSeparator)];
    } else {
      fields = line.split(this.fieldSeparator);
    }

    return { name, fields, raw: line };
  }

  /**
   * Parse field into components
   */
  private parseField(field: string | undefined): string[] {
    if (!field) return [];
    return field.split(this.componentSeparator).map(c => this.unescape(c));
  }

  /**
   * Parse repetition field
   */
  private parseRepetition(field: string | undefined): string[][] {
    if (!field) return [];
    return field.split(this.repetitionSeparator).map(rep => this.parseField(rep));
  }

  /**
   * Unescape HL7 escape sequences
   */
  private unescape(value: string): string {
    if (!value.includes(this.escapeChar)) {
      return value;
    }

    return value
      .replace(/\\F\\/g, this.fieldSeparator)
      .replace(/\\S\\/g, this.componentSeparator)
      .replace(/\\T\\/g, this.subComponentSeparator)
      .replace(/\\R\\/g, this.repetitionSeparator)
      .replace(/\\E\\/g, this.escapeChar)
      .replace(/\\X([0-9A-Fa-f]{2})\\/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  /**
   * Parse HL7 datetime (YYYYMMDDHHMMSS)
   */
  private parseDateTime(value: string | undefined): Date {
    if (!value || value.length < 8) {
      return new Date();
    }

    const year = parseInt(value.substring(0, 4));
    const month = parseInt(value.substring(4, 6)) - 1;
    const day = parseInt(value.substring(6, 8));
    const hour = value.length >= 10 ? parseInt(value.substring(8, 10)) : 0;
    const minute = value.length >= 12 ? parseInt(value.substring(10, 12)) : 0;
    const second = value.length >= 14 ? parseInt(value.substring(12, 14)) : 0;

    return new Date(year, month, day, hour, minute, second);
  }

  /**
   * Extract patient from PID segment
   */
  parsePatient(message: HL7Message): HL7Patient | null {
    const pid = message.segments.find(s => s.name === 'PID');
    if (!pid) return null;

    const patientId = this.parseField(pid.fields[3])?.[0] || '';
    const accountNumber = this.parseField(pid.fields[18])?.[0];
    const name = this.parseField(pid.fields[5]);
    const dob = this.parseDateTime(pid.fields[7]);
    const sex = (pid.fields[8] || 'U') as 'M' | 'F' | 'O' | 'U';
    const address = this.parseField(pid.fields[11]);
    const phone = this.parseRepetition(pid.fields[13]).map(p => p[0]);
    const email = this.parseRepetition(pid.fields[13]).find(p => p[2] === 'NET')?.[0];
    const ssn = pid.fields[19];
    const maritalStatus = pid.fields[16];
    const race = this.parseField(pid.fields[10])?.[0];
    const ethnicity = this.parseField(pid.fields[22])?.[0];

    return {
      patientId,
      accountNumber,
      name: {
        family: name[0] || '',
        given: name[1] ? [name[1]] : [],
        prefix: name[5],
        suffix: name[4],
      },
      dateOfBirth: dob,
      sex,
      address: address.length > 0 ? {
        street: [address[0], address[1]].filter(Boolean),
        city: address[2] || '',
        state: address[3] || '',
        zip: address[4] || '',
        country: address[5] || '',
      } : undefined,
      phone: phone.length > 0 ? phone : undefined,
      email,
      ssn,
      maritalStatus,
      race,
      ethnicity,
    };
  }

  /**
   * Extract visit from PV1 segment
   */
  parseVisit(message: HL7Message): HL7Visit | null {
    const pv1 = message.segments.find(s => s.name === 'PV1');
    if (!pv1) return null;

    const visitNumber = pv1.fields[19] || '';
    const patientClass = (pv1.fields[2] || 'O') as 'I' | 'O' | 'E' | 'P';
    const admissionType = pv1.fields[4];
    const location = this.parseField(pv1.fields[3]);
    const attendingDoc = this.parseProvider(pv1.fields[7]);
    const referringDoc = this.parseProvider(pv1.fields[8]);
    const admitDateTime = this.parseDateTime(pv1.fields[44]);
    const dischargeDateTime = this.parseDateTime(pv1.fields[45]);

    return {
      visitNumber,
      patientClass,
      admissionType,
      location: location.length > 0 ? {
        pointOfCare: location[0] || '',
        room: location[1] || '',
        bed: location[2] || '',
        facility: location[3] || '',
        building: location[6] || '',
        floor: location[7] || '',
      } : undefined,
      attendingDoctor: attendingDoc,
      referringDoctor: referringDoc,
      admitDateTime: pv1.fields[44] ? admitDateTime : undefined,
      dischargeDateTime: pv1.fields[45] ? dischargeDateTime : undefined,
    };
  }

  /**
   * Parse provider from XCN field
   */
  private parseProvider(field: string | undefined): HL7Provider | null {
    if (!field) return null;

    const components = this.parseField(field);
    if (components.length === 0) return null;

    return {
      id: components[0] || '',
      name: {
        family: components[1] || '',
        given: components[2] ? [components[2]] : [],
        prefix: components[5],
        suffix: components[4],
      },
      npi: components[9],
      specialty: components[13],
    };
  }

  /**
   * Extract orders from ORC/OBR segments
   */
  parseOrders(message: HL7Message): HL7Order[] {
    const orders: HL7Order[] = [];
    const orcSegments = message.segments.filter(s => s.name === 'ORC');
    const obrSegments = message.segments.filter(s => s.name === 'OBR');

    for (let i = 0; i < Math.max(orcSegments.length, obrSegments.length); i++) {
      const orc = orcSegments[i];
      const obr = obrSegments[i];

      if (!orc && !obr) continue;

      const placerOrderNumber = this.parseField(orc?.fields[2] || obr?.fields[2])?.[0] || '';
      const fillerOrderNumber = this.parseField(orc?.fields[3] || obr?.fields[3])?.[0] || '';
      const orderControl = orc?.fields[1] || '';
      const orderDateTime = this.parseDateTime(orc?.fields[9] || obr?.fields[6]);
      const orderingProvider = this.parseProvider(orc?.fields[12] || obr?.fields[16]);
      const orderStatus = orc?.fields[5] || '';

      orders.push({
        orderId: placerOrderNumber || fillerOrderNumber,
        placerOrderNumber,
        fillerOrderNumber,
        orderControl,
        orderDateTime,
        orderingProvider: orderingProvider || {
          id: '',
          name: { family: '', given: [] },
        },
        orderStatus,
      });
    }

    return orders;
  }

  /**
   * Extract observations from OBX segments
   */
  parseObservations(message: HL7Message): HL7Observation[] {
    const obxSegments = message.segments.filter(s => s.name === 'OBX');

    return obxSegments.map(obx => {
      const setId = obx.fields[1] || '';
      const valueType = obx.fields[2] || '';
      const observationType = this.parseField(obx.fields[3])?.[1] || this.parseField(obx.fields[3])?.[0] || '';
      const observationSubId = obx.fields[4];
      const observationValue = obx.fields[5] || '';
      const units = this.parseField(obx.fields[6])?.[0];
      const referenceRange = obx.fields[7];
      const abnormalFlags = obx.fields[8] ? obx.fields[8].split(this.componentSeparator) : [];
      const observationDateTime = this.parseDateTime(obx.fields[14]);
      const status = (obx.fields[11] || 'F') as 'F' | 'P' | 'C' | 'X';

      return {
        observationId: setId,
        observationType,
        observationSubId,
        observationValue,
        units,
        referenceRange,
        abnormalFlags,
        observationDateTime,
        status,
      };
    });
  }

  /**
   * Generate HL7 message from structured object
   */
  generate(message: HL7Message): string {
    const lines: string[] = [];

    // Generate MSH
    const msh = message.segments.find(s => s.name === 'MSH');
    if (msh) {
      lines.push(msh.raw);
    } else {
      const timestamp = this.formatDateTime(message.timestamp);
      lines.push(
        `MSH|^~\\&|${message.sendingApplication}|${message.sendingFacility}|${message.receivingApplication}|${message.receivingFacility}|${timestamp}||${message.messageType}^${message.triggerEvent}|${message.messageControlId}|P|${message.version}`
      );
    }

    // Add other segments
    for (const segment of message.segments) {
      if (segment.name !== 'MSH') {
        lines.push(segment.raw);
      }
    }

    return lines.join('\r\n');
  }

  /**
   * Format datetime to HL7 format (YYYYMMDDHHMMSS)
   */
  private formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  /**
   * Create acknowledgment message (ACK)
   */
  createACK(originalMessage: HL7Message, status: 'AA' | 'AE' | 'AR', errorMessage?: string): string {
    const timestamp = this.formatDateTime(new Date());
    const controlId = `ACK-${Date.now()}`;

    const segments = [
      `MSH|^~\\&|${originalMessage.receivingApplication}|${originalMessage.receivingFacility}|${originalMessage.sendingApplication}|${originalMessage.sendingFacility}|${timestamp}||ACK^${originalMessage.triggerEvent}|${controlId}|P|${originalMessage.version}`,
      `MSA|${status}|${originalMessage.messageControlId}${errorMessage ? `|${errorMessage}` : ''}`,
    ];

    return segments.join('\r\n');
  }

  /**
   * Validate HL7 message structure
   */
  validate(message: HL7Message): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!message.messageType) {
      errors.push('Message type is required');
    }

    if (!message.triggerEvent) {
      errors.push('Trigger event is required');
    }

    if (!message.messageControlId) {
      errors.push('Message control ID is required');
    }

    // Check for required segments
    const hasMSH = message.segments.some(s => s.name === 'MSH');
    if (!hasMSH) {
      errors.push('MSH segment is required');
    }

    // Message type-specific validation
    if (message.messageType === 'ADT') {
      const hasPID = message.segments.some(s => s.name === 'PID');
      if (!hasPID) {
        errors.push('ADT messages require PID segment');
      }
    }

    if (message.messageType === 'ORM' || message.messageType === 'ORU') {
      const hasORC = message.segments.some(s => s.name === 'ORC');
      if (!hasORC) {
        errors.push(`${message.messageType} messages require ORC segment`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * HL7 Message Builder
 * Fluent API for building HL7 messages
 */
export class HL7MessageBuilder {
  private message: Partial<HL7Message> = {
    segments: [],
    timestamp: new Date(),
    version: '2.5',
  };

  setMessageType(messageType: HL7MessageType, triggerEvent: HL7TriggerEvent): this {
    this.message.messageType = messageType;
    this.message.triggerEvent = triggerEvent;
    return this;
  }

  setSendingApplication(app: string, facility: string): this {
    this.message.sendingApplication = app;
    this.message.sendingFacility = facility;
    return this;
  }

  setReceivingApplication(app: string, facility: string): this {
    this.message.receivingApplication = app;
    this.message.receivingFacility = facility;
    return this;
  }

  setMessageControlId(id: string): this {
    this.message.messageControlId = id;
    return this;
  }

  addSegment(name: string, fields: string[]): this {
    const raw = `${name}|${fields.join('|')}`;
    this.message.segments!.push({ name, fields: [name, ...fields], raw });
    return this;
  }

  addPatient(patient: HL7Patient): this {
    const fields = [
      '', // Set ID
      '', // External ID
      patient.patientId, // Internal ID
      '', // Alternate ID
      `${patient.name.family}^${patient.name.given.join(' ')}^${patient.name.prefix || ''}^${patient.name.suffix || ''}`,
      '', // Mother's maiden name
      this.formatDate(patient.dateOfBirth),
      patient.sex,
      '', // Patient alias
      patient.race || '',
      patient.address ? `${patient.address.street.join(' ')}^${patient.address.city}^${patient.address.state}^${patient.address.zip}^${patient.address.country}` : '',
      '', // County code
      patient.phone?.join('~') || '',
      '', // Business phone
      '', // Primary language
      patient.maritalStatus || '',
      '', // Religion
      '', // Account number
      patient.ssn || '',
    ];

    return this.addSegment('PID', fields);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  build(): HL7Message {
    if (!this.message.messageType || !this.message.triggerEvent) {
      throw new Error('Message type and trigger event are required');
    }

    return this.message as HL7Message;
  }
}
