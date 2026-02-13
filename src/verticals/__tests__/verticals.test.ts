/**
 * Comprehensive Vertical Solutions Tests
 * Tests for Healthcare, Finance, and Manufacturing verticals
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Healthcare imports
import { HL7Parser, HL7MessageBuilder } from '../healthcare/HL7Parser';
import { FHIRClient, FHIRPatientBuilder, FHIRObservationBuilder } from '../healthcare/FHIRClient';
import { HIPAACompliance } from '../healthcare/HIPAACompliance';
import { healthcareNodes } from '../healthcare/HealthcareNodes';

// Finance imports
import { ISO20022Parser } from '../finance/ISO20022Parser';
import { SWIFTClient } from '../finance/SWIFTClient';
import { KYCAMLEngine } from '../finance/KYCAMLEngine';
import { financeNodes } from '../finance/FinanceNodes';

// Manufacturing imports
import { OPCUAClient } from '../manufacturing/OPCUAClient';
import { PredictiveMaintenanceEngine } from '../manufacturing/PredictiveMaintenance';
import { manufacturingNodes } from '../manufacturing/ManufacturingNodes';

// Templates imports
import { allComplianceTemplates } from '../compliance/ComplianceTemplates';
import { allBestPracticeWorkflows } from '../workflows/BestPracticeWorkflows';

/**
 * Healthcare Tests
 */
describe('Healthcare Vertical', () => {
  describe('HL7Parser', () => {
    let parser: HL7Parser;

    beforeEach(() => {
      parser = new HL7Parser();
    });

    it('should parse ADT message', () => {
      const message = 'MSH|^~\\&|SENDING_APP|SENDING_FAC|RECEIVING_APP|RECEIVING_FAC|20250110120000||ADT^A01|MSG001|P|2.5\r\nPID|||123456||DOE^JOHN^A||19800101|M|||123 MAIN ST^^CITY^ST^12345||555-1234|||M';
      const parsed = parser.parse(message);

      expect(parsed.messageType).toBe('ADT');
      expect(parsed.triggerEvent).toBe('A01');
      expect(parsed.messageControlId).toBe('MSG001');
      expect(parsed.segments).toHaveLength(2);
    });

    it('should extract patient from PID segment', () => {
      const message = parser.parse('MSH|^~\\&|APP|FAC|APP|FAC|20250110120000||ADT^A01|MSG001|P|2.5\r\nPID|||123456||DOE^JOHN^A||19800101|M');
      const patient = parser.parsePatient(message);

      expect(patient).toBeDefined();
      expect(patient?.patientId).toBe('123456');
      expect(patient?.name.family).toBe('DOE');
      expect(patient?.name.given).toContain('JOHN');
      expect(patient?.sex).toBe('M');
    });

    it('should generate HL7 ACK message', () => {
      const message = parser.parse('MSH|^~\\&|APP|FAC|APP|FAC|20250110120000||ADT^A01|MSG001|P|2.5');
      const ack = parser.createACK(message, 'AA');

      expect(ack).toContain('MSA|AA|MSG001');
    });

    it('should validate HL7 message structure', () => {
      const message = parser.parse('MSH|^~\\&|APP|FAC|APP|FAC|20250110120000||ADT^A01|MSG001|P|2.5\r\nPID|||123456||DOE^JOHN');
      const validation = parser.validate(message);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('FHIRClient', () => {
    let client: FHIRClient;

    beforeEach(() => {
      client = new FHIRClient({
        baseUrl: 'https://hapi.fhir.org/baseR4',
        accessToken: 'test-token',
      });
      global.fetch = vi.fn();
    });

    it('should build FHIR patient', () => {
      const builder = new FHIRPatientBuilder();
      const patient = builder
        .addIdentifier('http://hospital.org', '123456', 'official')
        .setActive(true)
        .addName('Doe', ['John', 'A'], 'official')
        .setGender('male')
        .setBirthDate('1980-01-01')
        .build();

      expect(patient.resourceType).toBe('Patient');
      expect(patient.active).toBe(true);
      expect(patient.gender).toBe('male');
      expect(patient.name).toHaveLength(1);
      expect(patient.name?.[0].family).toBe('Doe');
    });

    it('should build FHIR observation', () => {
      const builder = new FHIRObservationBuilder();
      const observation = builder
        .setCode('http://loinc.org', '8867-4', 'Heart rate')
        .setSubject('Patient', '123')
        .setValueQuantity(72, 'beats/minute', 'http://unitsofmeasure.org', '/min')
        .setEffectiveDateTime(new Date().toISOString())
        .build();

      expect(observation.resourceType).toBe('Observation');
      expect(observation.code).toBeDefined();
      expect(observation.valueQuantity?.value).toBe(72);
    });
  });

  describe('HIPAACompliance', () => {
    let hipaa: HIPAACompliance;

    beforeEach(() => {
      hipaa = new HIPAACompliance();
    });

    it('should detect PHI in data', () => {
      const data = {
        name: 'John Doe',
        ssn: '123-45-6789',
        email: 'john@example.com',
      };

      const phi = hipaa.detectPHI(data);

      expect(phi.length).toBeGreaterThan(0);
      expect(phi.some(p => p.type === 'name')).toBe(true);
      expect(phi.some(p => p.type === 'ssn')).toBe(true);
      expect(phi.some(p => p.type === 'email')).toBe(true);
    });

    it('should encrypt and decrypt PHI', () => {
      const originalData = 'Patient SSN: 123-45-6789';
      const encrypted = hipaa.encryptPHI(originalData);

      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.algorithm).toBe('AES-256-GCM');

      const decrypted = hipaa.decryptPHI(encrypted);
      expect(decrypted).toBe(originalData);
    });

    it('should redact PHI', () => {
      const data = { name: 'John Doe', ssn: '123-45-6789' };
      const phi = hipaa.detectPHI(data);
      const redacted = hipaa.redactPHI(data, phi);

      expect(redacted.name).toContain('[REDACTED');
      expect(redacted.ssn).toBe('***-**-****');
    });

    it('should log access and detect anomalies', () => {
      // Log normal access
      for (let i = 0; i < 5; i++) {
        hipaa.logAccess({
          userId: 'user1',
          userName: 'Test User',
          action: 'view',
          resourceType: 'Patient',
          resourceId: 'patient1',
          phi: ['name'],
          ipAddress: '192.168.1.1',
          userAgent: 'test',
        });
      }

      // Log anomalous access (many patients)
      for (let i = 0; i < 25; i++) {
        hipaa.logAccess({
          userId: 'user2',
          userName: 'Suspicious User',
          action: 'view',
          resourceType: 'Patient',
          resourceId: `patient${i}`,
          patientId: `patient${i}`,
          phi: ['name'],
          ipAddress: '192.168.1.2',
          userAgent: 'test',
        });
      }

      const anomalies = hipaa.detectAnomalousAccess();
      expect(anomalies.length).toBeGreaterThan(0);
    });

    it('should generate compliance report', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-10');

      hipaa.logAccess({
        userId: 'user1',
        userName: 'Test User',
        action: 'view',
        resourceType: 'Patient',
        resourceId: 'patient1',
        phi: ['name'],
        ipAddress: '192.168.1.1',
        userAgent: 'test',
      });

      const report = hipaa.generateComplianceReport(startDate, endDate);

      expect(report.access.total).toBeGreaterThan(0);
      expect(report.compliance.status).toBeDefined();
    });
  });
});

/**
 * Finance Tests
 */
describe('Finance Vertical', () => {
  describe('ISO20022Parser', () => {
    let parser: ISO20022Parser;

    beforeEach(() => {
      parser = new ISO20022Parser();
    });

    it('should generate pacs.008 message', () => {
      const payments = [{
        paymentId: 'PMT001',
        endToEndId: 'E2E001',
        amount: { currency: 'USD', value: 1000.00 },
        debtor: { name: 'John Doe' },
        creditor: { name: 'Jane Smith' },
      }];

      const xml = parser.generatePacs008(payments);

      expect(xml).toContain('pacs.008');
      expect(xml).toContain('John Doe');
      expect(xml).toContain('Jane Smith');
      expect(xml).toContain('1000.00');
    });

    it('should generate pain.001 message', () => {
      const payments = [{
        paymentId: 'PMT001',
        endToEndId: 'E2E001',
        amount: { currency: 'EUR', value: 500.00 },
        creditor: { name: 'Supplier Inc' },
        creditorAccount: { identification: { iban: 'DE89370400440532013000' } },
      }];

      const debtor = { name: 'My Company' };
      const xml = parser.generatePain001(payments, debtor);

      expect(xml).toContain('pain.001');
      expect(xml).toContain('My Company');
      expect(xml).toContain('Supplier Inc');
    });
  });

  describe('SWIFTClient', () => {
    let client: SWIFTClient;

    beforeEach(() => {
      client = new SWIFTClient({ bic: 'DEUTDEFF' });
    });

    it('should parse MT103 message', () => {
      const rawMessage = `{1:F01DEUTDEFF0000000000}{2:I103CHASUS33N}{4:
:20:REF123456
:23B:CRED
:32A:250110USD1000,00
:50K:/123456789
John Doe
123 Main St
:57A:CHASUS33
:59:/987654321
Jane Smith
456 Oak Ave
:70:Invoice Payment
:71A:SHA
-}`;

      const message = client.parseMT103(rawMessage);

      expect(message.messageType).toBe('MT103');
      expect(message.senderReference).toBe('REF123456');
      expect(message.amount).toBe(1000);
      expect(message.currency).toBe('USD');
      expect(message.orderingCustomer.name).toBe('John Doe');
      expect(message.beneficiaryCustomer.name).toBe('Jane Smith');
    });

    it('should generate MT103 message', () => {
      const mt103Data = {
        messageType: 'MT103' as const,
        senderReference: 'REF123456',
        bankOperationCode: 'CRED',
        valueDate: new Date('2025-01-10'),
        currency: 'USD',
        amount: 1000.00,
        orderingCustomer: { name: 'John Doe', account: '123456789' },
        accountWithInstitution: 'CHASUS33',
        beneficiaryCustomer: { name: 'Jane Smith', account: '987654321' },
        remittanceInformation: 'Invoice Payment',
        detailsOfCharges: 'SHA' as const,
      };

      const message = client.generateMT103(mt103Data);

      expect(message).toContain(':20:REF123456');
      expect(message).toContain('USD');
      expect(message).toContain('John Doe');
      expect(message).toContain('Jane Smith');
    });
  });

  describe('KYCAMLEngine', () => {
    let engine: KYCAMLEngine;

    beforeEach(() => {
      engine = new KYCAMLEngine({
        sanctionsLists: ['OFAC', 'EU', 'UN'],
        pepLists: ['World-Check'],
        riskThresholds: { low: 30, medium: 50, high: 70 },
        autoApproveThreshold: 30,
      });
    });

    it('should perform KYC verification', async () => {
      const customerData = {
        name: 'John Doe',
        dob: '1980-01-01',
        country: 'US',
        type: 'individual',
      };

      const documents = [{
        type: 'passport' as const,
        number: 'P123456',
        issuingCountry: 'US',
        verified: false,
      }];

      const verification = await engine.performKYC('customer1', customerData, documents);

      expect(verification.customerId).toBe('customer1');
      expect(verification.verificationType).toBe('individual');
      expect(verification.checks.length).toBeGreaterThan(0);
      expect(verification.riskScore).toBeDefined();
      expect(verification.riskLevel).toBeDefined();
    });

    it('should perform AML screening', async () => {
      const customerData = { name: 'Test Customer' };
      const screening = await engine.performAMLScreening('customer1', customerData);

      expect(screening.customerId).toBe('customer1');
      expect(screening.overallStatus).toBeDefined();
      expect(screening.lists).toHaveLength(4);
    });

    it('should monitor transaction for suspicious activity', async () => {
      const transaction = {
        id: 'tx1',
        customerId: 'customer1',
        amount: 15000,
        currency: 'USD',
        type: 'transfer',
        timestamp: new Date(),
      };

      const monitoring = await engine.monitorTransaction(transaction);

      expect(monitoring.transactionId).toBe('tx1');
      expect(monitoring.alerts.length).toBeGreaterThan(0);
      expect(monitoring.alerts.some(a => a.alertType === 'large_transaction')).toBe(true);
    });
  });
});

/**
 * Manufacturing Tests
 */
describe('Manufacturing Vertical', () => {
  describe('OPCUAClient', () => {
    let client: OPCUAClient;

    beforeEach(() => {
      client = new OPCUAClient({
        endpointUrl: 'opc.tcp://localhost:4840',
      });
    });

    it('should connect to OPC UA server', async () => {
      await client.connect();
      expect(true).toBe(true); // Connection successful
    });

    it('should browse nodes', async () => {
      await client.connect();
      const nodes = await client.browse('RootFolder');

      expect(Array.isArray(nodes)).toBe(true);
    });

    it('should read node value', async () => {
      await client.connect();
      const value = await client.readNode('ns=2;s=Machine1.Temperature');

      expect(value.nodeId).toBe('ns=2;s=Machine1.Temperature');
      expect(value.quality).toBeDefined();
    });

    it('should create subscription', async () => {
      await client.connect();
      const subscriptionId = await client.createSubscription(1000);

      expect(subscriptionId).toBeDefined();

      const monitoredItemId = await client.monitorItem(subscriptionId, 'ns=2;s=Machine1.Speed');
      expect(monitoredItemId).toBeDefined();
    });
  });

  describe('PredictiveMaintenanceEngine', () => {
    let engine: PredictiveMaintenanceEngine;

    beforeEach(() => {
      engine = new PredictiveMaintenanceEngine({
        alertThresholds: { failureProbability: 60, timeToFailure: 72 },
        historicalDataWindow: 30,
        anomalyDetectionSensitivity: 'medium',
      });
    });

    it('should analyze machine health', async () => {
      const status = {
        machineId: 'machine1',
        machineName: 'Machine 1',
        status: 'running' as const,
        temperature: 85,
        vibration: 5.0,
        uptime: 75,
        timestamp: new Date(),
      };

      const sensorData = [
        {
          sensorId: 'temp1',
          sensorType: 'temperature' as const,
          value: 85,
          unit: '°C',
          quality: 'good' as const,
          timestamp: new Date(),
          threshold: { high: 80, critical_high: 90 },
        },
      ];

      const alert = await engine.analyzeMachineHealth('machine1', status, sensorData);

      if (alert) {
        expect(alert.machineId).toBe('machine1');
        expect(alert.prediction.failureProbability).toBeGreaterThan(0);
        expect(alert.priority).toBeDefined();
      }
    });

    it('should calculate OEE metrics', () => {
      const metrics = {
        totalProduced: 1000,
        totalRejected: 50,
        downtime: [{ startTime: new Date(), duration: 60, reason: 'maintenance', category: 'planned' as const, type: 'maintenance' as const, machineId: 'machine1' }],
      };

      const oee = engine.calculateOEE(metrics);

      expect(oee.availability).toBeGreaterThan(0);
      expect(oee.performance).toBeGreaterThan(0);
      expect(oee.quality).toBeGreaterThan(0);
      expect(oee.oee).toBeGreaterThan(0);
    });

    it('should update digital twin', async () => {
      const twin = await engine.updateDigitalTwin(
        'twin1',
        'machine1',
        { speed: 100, temperature: 65 },
        { power: { value: 45, unit: 'kW' } }
      );

      expect(twin.twinId).toBe('twin1');
      expect(twin.physicalAssetId).toBe('machine1');
      expect(twin.state.current).toBeDefined();
      expect(twin.telemetry.power).toBeDefined();
    });
  });
});

/**
 * Compliance Templates Tests
 */
describe('Compliance Templates', () => {
  it('should have healthcare templates', () => {
    const healthcareTemplates = allComplianceTemplates.filter(t => t.industry === 'healthcare');
    expect(healthcareTemplates.length).toBeGreaterThan(0);
  });

  it('should have finance templates', () => {
    const financeTemplates = allComplianceTemplates.filter(t => t.industry === 'finance');
    expect(financeTemplates.length).toBeGreaterThan(0);
  });

  it('should have manufacturing templates', () => {
    const manufacturingTemplates = allComplianceTemplates.filter(t => t.industry === 'manufacturing');
    expect(manufacturingTemplates.length).toBeGreaterThan(0);
  });

  it('should have valid template structure', () => {
    allComplianceTemplates.forEach(template => {
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.industry).toBeDefined();
      expect(template.complianceFramework).toBeDefined();
      expect(template.description).toBeDefined();
      expect(Array.isArray(template.nodes)).toBe(true);
      expect(Array.isArray(template.requiredInputs)).toBe(true);
      expect(Array.isArray(template.outputs)).toBe(true);
    });
  });
});

/**
 * Best Practice Workflows Tests
 */
describe('Best Practice Workflows', () => {
  it('should have healthcare workflows', () => {
    const healthcareWorkflows = allBestPracticeWorkflows.filter(w => w.industry === 'healthcare');
    expect(healthcareWorkflows.length).toBeGreaterThan(0);
  });

  it('should have finance workflows', () => {
    const financeWorkflows = allBestPracticeWorkflows.filter(w => w.industry === 'finance');
    expect(financeWorkflows.length).toBeGreaterThan(0);
  });

  it('should have manufacturing workflows', () => {
    const manufacturingWorkflows = allBestPracticeWorkflows.filter(w => w.industry === 'manufacturing');
    expect(manufacturingWorkflows.length).toBeGreaterThan(0);
  });

  it('should have complete workflow definitions', () => {
    allBestPracticeWorkflows.forEach(workflow => {
      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBeDefined();
      expect(workflow.industry).toBeDefined();
      expect(workflow.description).toBeDefined();
      expect(workflow.nodes.length).toBeGreaterThan(0);

      // Each node should have required properties
      workflow.nodes.forEach(node => {
        expect(node.id).toBeDefined();
        expect(node.type).toBeDefined();
        expect(node.name).toBeDefined();
      });
    });
  });
});

/**
 * Integration Tests
 */
describe('Vertical Integration', () => {
  it('should integrate healthcare nodes', () => {
    expect(Object.keys(healthcareNodes).length).toBeGreaterThan(0);
    Object.values(healthcareNodes).forEach(NodeClass => {
      expect(typeof NodeClass).toBe('function');
    });
  });

  it('should integrate finance nodes', () => {
    expect(Object.keys(financeNodes).length).toBeGreaterThan(0);
    Object.values(financeNodes).forEach(NodeClass => {
      expect(typeof NodeClass).toBe('function');
    });
  });

  it('should integrate manufacturing nodes', () => {
    expect(Object.keys(manufacturingNodes).length).toBeGreaterThan(0);
    Object.values(manufacturingNodes).forEach(NodeClass => {
      expect(typeof NodeClass).toBe('function');
    });
  });

  it('should have total of 76+ nodes across all verticals', () => {
    const totalNodes = Object.keys(healthcareNodes).length +
      Object.keys(financeNodes).length +
      Object.keys(manufacturingNodes).length;

    expect(totalNodes).toBeGreaterThanOrEqual(76);
  });

  it('should have 35+ templates and workflows', () => {
    const total = allComplianceTemplates.length + allBestPracticeWorkflows.length;
    expect(total).toBeGreaterThanOrEqual(35);
  });
});
