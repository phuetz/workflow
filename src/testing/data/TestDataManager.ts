/**
 * Test Data Manager
 * Generate, anonymize, and manage test data
 */

import { logger } from '../../services/SimpleLogger';
import type {
  TestDataSchema,
  TestData,
  AnonymizationRule,
  TestDataField,
  PIIField,
} from '../types/testing';

export class TestDataManager {
  private schemas: Map<string, TestDataSchema> = new Map();
  private data: Map<string, TestData[]> = new Map();

  /**
   * Register a data schema
   */
  registerSchema(schema: TestDataSchema): void {
    this.schemas.set(schema.name, schema);
    logger.debug(`[TestDataManager] Registered schema: ${schema.name}`);
  }

  /**
   * Generate test data
   */
  generate(schemaName: string, count: number, seed?: number): TestData {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      throw new Error(`Schema ${schemaName} not found`);
    }

    logger.debug(`[TestDataManager] Generating ${count} records for ${schemaName}`);

    const records: any[] = [];

    for (let i = 0; i < count; i++) {
      const record: any = {};

      schema.fields.forEach(field => {
        record[field.name] = this.generateFieldValue(field, i, seed);
      });

      records.push(record);
    }

    const testData: TestData = {
      schema: schemaName,
      records,
      metadata: {
        generatedAt: Date.now(),
        count,
        seed,
      },
    };

    const existing = this.data.get(schemaName) || [];
    existing.push(testData);
    this.data.set(schemaName, existing);

    logger.debug(`[TestDataManager] Generated ${count} records`);
    return testData;
  }

  /**
   * Generate field value using Faker.js-like generation
   */
  private generateFieldValue(field: TestDataField, index: number, seed?: number): any {
    if (field.generator) {
      return field.generator(this.getFaker());
    }

    switch (field.type) {
      case 'string':
        return field.enumValues
          ? field.enumValues[index % field.enumValues.length]
          : `${field.name}_${index}`;

      case 'number':
        const min = field.min || 0;
        const max = field.max || 100;
        return Math.floor(Math.random() * (max - min + 1)) + min;

      case 'boolean':
        return Math.random() > 0.5;

      case 'date':
        const now = Date.now();
        const daysAgo = Math.floor(Math.random() * 365);
        return new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString();

      case 'email':
        return `user${index}@example.com`;

      case 'phone':
        return `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`;

      case 'address':
        return `${index} Main Street, City, State 12345`;

      case 'uuid':
        return this.generateUUID();

      case 'enum':
        return field.enumValues
          ? field.enumValues[index % field.enumValues.length]
          : null;

      default:
        return null;
    }
  }

  /**
   * Anonymize data
   */
  async anonymize(data: any[], rules: AnonymizationRule[]): Promise<any[]> {
    logger.debug(`[TestDataManager] Anonymizing ${data.length} records with ${rules.length} rules`);

    const anonymized = data.map(record => {
      const newRecord = { ...record };

      rules.forEach(rule => {
        if (rule.field in newRecord) {
          newRecord[rule.field] = this.applyAnonymization(newRecord[rule.field], rule);
        }
      });

      return newRecord;
    });

    logger.debug(`[TestDataManager] Anonymization complete`);
    return anonymized;
  }

  /**
   * Apply anonymization strategy
   */
  private applyAnonymization(value: any, rule: AnonymizationRule): any {
    switch (rule.strategy) {
      case 'mask':
        const maskChar = rule.config?.maskChar || '*';
        return typeof value === 'string'
          ? value.slice(0, 2) + maskChar.repeat(Math.max(0, value.length - 2))
          : value;

      case 'hash':
        return this.simpleHash(String(value));

      case 'encrypt':
        // In production, use real encryption
        return `encrypted_${this.simpleHash(String(value))}`;

      case 'replace':
        return rule.config?.replacement || null;

      case 'remove':
        return null;

      case 'shuffle':
        return typeof value === 'string'
          ? value.split('').sort(() => Math.random() - 0.5).join('')
          : value;

      case 'generalize':
        if (typeof value === 'number') {
          const level = rule.config?.generalizationLevel || 10;
          return Math.floor(value / level) * level;
        }
        return value;

      default:
        return value;
    }
  }

  /**
   * Detect PII fields
   */
  detectPII(data: any[]): PIIField[] {
    logger.debug(`[TestDataManager] Detecting PII in ${data.length} records`);

    if (data.length === 0) {
      return [];
    }

    const piiFields: PIIField[] = [];
    const sampleRecord = data[0];

    Object.keys(sampleRecord).forEach(fieldName => {
      const fieldValue = sampleRecord[fieldName];
      const pii = this.identifyPIIType(fieldName, fieldValue);

      if (pii) {
        piiFields.push({
          name: fieldName,
          type: pii.type,
          detected: true,
          confidence: pii.confidence,
        });
      }
    });

    logger.debug(`[TestDataManager] Detected ${piiFields.length} PII fields`);
    return piiFields;
  }

  /**
   * Identify PII type
   */
  private identifyPIIType(
    fieldName: string,
    value: any
  ): { type: PIIField['type']; confidence: number } | null {
    const fieldLower = fieldName.toLowerCase();
    const valueStr = String(value);

    // Email detection
    if (fieldLower.includes('email') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valueStr)) {
      return { type: 'email', confidence: 0.95 };
    }

    // Phone detection
    if (fieldLower.includes('phone') || /^\+?[\d\s-()]{10,}$/.test(valueStr)) {
      return { type: 'phone', confidence: 0.9 };
    }

    // SSN detection
    if (fieldLower.includes('ssn') || /^\d{3}-?\d{2}-?\d{4}$/.test(valueStr)) {
      return { type: 'ssn', confidence: 0.95 };
    }

    // Credit card detection
    if (fieldLower.includes('card') || fieldLower.includes('credit')) {
      return { type: 'credit_card', confidence: 0.85 };
    }

    // Address detection
    if (fieldLower.includes('address') || fieldLower.includes('street')) {
      return { type: 'address', confidence: 0.9 };
    }

    // Name detection
    if (fieldLower.includes('name') && !fieldLower.includes('username')) {
      return { type: 'name', confidence: 0.85 };
    }

    // IP address detection
    if (fieldLower.includes('ip') || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(valueStr)) {
      return { type: 'ip_address', confidence: 0.9 };
    }

    return null;
  }

  /**
   * Seed database with test data
   */
  async seed(database: string, data: TestData): Promise<void> {
    logger.debug(`[TestDataManager] Seeding ${database} with ${data.records.length} records`);

    // In production, this would insert into actual database
    // For now, just simulate

    await this.sleep(100);

    logger.debug(`[TestDataManager] Database seeded successfully`);
  }

  /**
   * Cleanup test data
   */
  async cleanup(schemaName?: string): Promise<void> {
    if (schemaName) {
      logger.debug(`[TestDataManager] Cleaning up data for schema: ${schemaName}`);
      this.data.delete(schemaName);
    } else {
      logger.debug(`[TestDataManager] Cleaning up all test data`);
      this.data.clear();
    }
  }

  /**
   * Export data fixtures
   */
  exportFixture(schemaName: string): TestData | null {
    const dataList = this.data.get(schemaName);
    return dataList && dataList.length > 0 ? dataList[dataList.length - 1] : null;
  }

  /**
   * Import data fixtures
   */
  importFixture(data: TestData): void {
    const existing = this.data.get(data.schema) || [];
    existing.push(data);
    this.data.set(data.schema, existing);

    logger.debug(`[TestDataManager] Imported ${data.records.length} records for ${data.schema}`);
  }

  /**
   * Get faker instance (simulation)
   */
  private getFaker(): any {
    // In production, this would return actual Faker.js instance
    return {
      name: {
        firstName: () => ['John', 'Jane', 'Bob', 'Alice'][Math.floor(Math.random() * 4)],
        lastName: () => ['Doe', 'Smith', 'Johnson', 'Williams'][Math.floor(Math.random() * 4)],
      },
      internet: {
        email: () => `user${Math.floor(Math.random() * 1000)}@example.com`,
        userName: () => `user${Math.floor(Math.random() * 1000)}`,
      },
      phone: {
        phoneNumber: () => `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
      },
      address: {
        streetAddress: () => `${Math.floor(Math.random() * 1000)} Main St`,
        city: () => ['New York', 'Los Angeles', 'Chicago', 'Houston'][Math.floor(Math.random() * 4)],
        zipCode: () => String(Math.floor(Math.random() * 90000 + 10000)),
      },
      commerce: {
        productName: () => ['Widget', 'Gadget', 'Tool', 'Device'][Math.floor(Math.random() * 4)],
        price: () => (Math.random() * 1000).toFixed(2),
      },
      lorem: {
        sentence: () => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        paragraph: () => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      },
    };
  }

  /**
   * Generate UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get data
   */
  getData(schemaName: string): TestData[] {
    return this.data.get(schemaName) || [];
  }

  /**
   * Get all schemas
   */
  getAllSchemas(): TestDataSchema[] {
    return Array.from(this.schemas.values());
  }
}

export default TestDataManager;
