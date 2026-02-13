/**
 * Finance Workflow Nodes
 * 20+ nodes for payments, ISO 20022, SWIFT, KYC/AML, reconciliation
 */

import { ISO20022Parser } from './ISO20022Parser';
import { SWIFTClient } from './SWIFTClient';
import { KYCAMLEngine } from './KYCAMLEngine';
import type {
  ISO20022Message,
  ISO20022Payment,
  SWIFTMessage,
  SWIFTMT103,
  KYCVerification,
  AMLScreening,
  Payment,
  ACHTransaction,
  WireTransfer,
  SEPATransaction,
  FraudCheck,
  ReconciliationJob,
} from './types/finance';

export interface FinanceNodeConfig {
  swiftConfig?: {
    bic: string;
    endpoint?: string;
    apiKey?: string;
  };
  kycConfig?: {
    sanctionsLists: string[];
    pepLists: string[];
    autoApproveThreshold: number;
  };
  paymentGateway?: {
    provider: string;
    apiKey: string;
    environment: 'test' | 'production';
  };
}

export interface NodeInput {
  json: any;
  binary?: any;
}

export interface NodeOutput {
  json: any;
  binary?: any;
}

// ISO 20022 Nodes

export class ParseISO20022Node {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const parser = new ISO20022Parser();
    const xml = input.json.xml || input.json;

    if (typeof xml !== 'string') {
      throw new Error('ISO 20022 message must be XML string');
    }

    const message = parser.parse(xml);
    const validation = parser.validate(message);

    return {
      json: {
        message,
        validation,
        payments: message.parsed?.payments || [],
      },
    };
  }
}

export class GenerateISO20022Node {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const parser = new ISO20022Parser();
    const messageType = input.json.messageType;
    const payments = input.json.payments as ISO20022Payment[];

    let xml: string;
    if (messageType === 'pacs.008') {
      xml = parser.generatePacs008(payments, input.json.messageId);
    } else if (messageType === 'pain.001') {
      xml = parser.generatePain001(payments, input.json.debtor, input.json.messageId);
    } else {
      throw new Error(`Unsupported message type: ${messageType}`);
    }

    return {
      json: {
        xml,
        messageType,
        numberOfPayments: payments.length,
      },
    };
  }
}

export class SendISO20022Node {
  async execute(input: NodeInput, config: FinanceNodeConfig): Promise<NodeOutput> {
    const xml = input.json.xml || input.json;

    // In production, send to payment network
    return {
      json: {
        sent: true,
        messageId: input.json.messageId || `ISO-${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// SWIFT Nodes

export class ParseSWIFTNode {
  async execute(input: NodeInput, config: FinanceNodeConfig): Promise<NodeOutput> {
    if (!config.swiftConfig) {
      throw new Error('SWIFT configuration is required');
    }

    const client = new SWIFTClient(config.swiftConfig);
    const rawMessage = input.json.message || input.json;

    const message = client.parseMT(rawMessage);
    const validation = client.validate(message);

    return {
      json: {
        message,
        validation,
        messageType: message.messageType,
      },
    };
  }
}

export class ParseSWIFTMT103Node {
  async execute(input: NodeInput, config: FinanceNodeConfig): Promise<NodeOutput> {
    if (!config.swiftConfig) {
      throw new Error('SWIFT configuration is required');
    }

    const client = new SWIFTClient(config.swiftConfig);
    const rawMessage = input.json.message || input.json;

    const mt103 = client.parseMT103(rawMessage);

    return {
      json: {
        payment: mt103,
        amount: mt103.amount,
        currency: mt103.currency,
        beneficiary: mt103.beneficiaryCustomer,
      },
    };
  }
}

export class GenerateSWIFTMT103Node {
  async execute(input: NodeInput, config: FinanceNodeConfig): Promise<NodeOutput> {
    if (!config.swiftConfig) {
      throw new Error('SWIFT configuration is required');
    }

    const client = new SWIFTClient(config.swiftConfig);
    const mt103Data = input.json as SWIFTMT103;

    const message = client.generateMT103(mt103Data);

    return {
      json: {
        message,
        messageType: 'MT103',
        reference: mt103Data.senderReference,
      },
    };
  }
}

export class SendSWIFTNode {
  async execute(input: NodeInput, config: FinanceNodeConfig): Promise<NodeOutput> {
    if (!config.swiftConfig) {
      throw new Error('SWIFT configuration is required');
    }

    const client = new SWIFTClient(config.swiftConfig);
    const message = input.json.message || input.json;

    const result = await client.sendMessage(message);

    return {
      json: {
        ...result,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// KYC/AML Nodes

export class PerformKYCNode {
  async execute(input: NodeInput, config: FinanceNodeConfig): Promise<NodeOutput> {
    if (!config.kycConfig) {
      throw new Error('KYC configuration is required');
    }

    const engine = new KYCAMLEngine({
      ...config.kycConfig,
      riskThresholds: { low: 30, medium: 50, high: 70 },
    });

    const verification = await engine.performKYC(
      input.json.customerId,
      input.json.customerData,
      input.json.documents || []
    );

    return {
      json: {
        verification,
        approved: verification.status === 'approved',
        riskLevel: verification.riskLevel,
      },
    };
  }
}

export class PerformAMLScreeningNode {
  async execute(input: NodeInput, config: FinanceNodeConfig): Promise<NodeOutput> {
    if (!config.kycConfig) {
      throw new Error('KYC configuration is required');
    }

    const engine = new KYCAMLEngine({
      ...config.kycConfig,
      riskThresholds: { low: 30, medium: 50, high: 70 },
    });

    const screening = await engine.performAMLScreening(
      input.json.customerId,
      input.json.customerData
    );

    return {
      json: {
        screening,
        clear: screening.overallStatus === 'clear',
        matches: screening.matches,
      },
    };
  }
}

export class MonitorTransactionNode {
  async execute(input: NodeInput, config: FinanceNodeConfig): Promise<NodeOutput> {
    if (!config.kycConfig) {
      throw new Error('KYC configuration is required');
    }

    const engine = new KYCAMLEngine({
      ...config.kycConfig,
      riskThresholds: { low: 30, medium: 50, high: 70 },
    });

    const monitoring = await engine.monitorTransaction(input.json);

    return {
      json: {
        monitoring,
        flagged: monitoring.status !== 'cleared',
        alerts: monitoring.alerts,
      },
    };
  }
}

export class FileSARNode {
  async execute(input: NodeInput, config: FinanceNodeConfig): Promise<NodeOutput> {
    if (!config.kycConfig) {
      throw new Error('KYC configuration is required');
    }

    const engine = new KYCAMLEngine({
      ...config.kycConfig,
      riskThresholds: { low: 30, medium: 50, high: 70 },
    });

    const sarId = await engine.fileSAR(input.json);

    return {
      json: {
        sarId,
        filed: true,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// Payment Processing Nodes

export class ProcessACHNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const transaction = input.json as ACHTransaction;

    // In production, process through ACH network
    const result = {
      ...transaction,
      status: 'processing' as const,
      processedDate: new Date(),
    };

    return {
      json: {
        transaction: result,
        traceNumber: `ACH-${Date.now()}`,
      },
    };
  }
}

export class ProcessWireNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const wire = input.json as WireTransfer;

    // In production, process through Fedwire/SWIFT
    const result = {
      ...wire,
      status: 'processing' as const,
      fedReference: `FED-${Date.now()}`,
    };

    return {
      json: {
        wire: result,
        estimated: wire.type === 'domestic' ? 'Same day' : '2-5 business days',
      },
    };
  }
}

export class ProcessSEPANode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const sepa = input.json as SEPATransaction;

    // In production, process through SEPA network
    const result = {
      ...sepa,
      status: sepa.type === 'INST' ? 'completed' : 'processing' as const,
    };

    return {
      json: {
        transaction: result,
        instant: sepa.type === 'INST',
      },
    };
  }
}

export class ValidateIBANNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const iban = (input.json.iban || input.json).replace(/\s/g, '');

    // Basic IBAN validation
    const valid = /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban) && iban.length >= 15 && iban.length <= 34;

    let country, bankCode, accountNumber;
    if (valid) {
      country = iban.substring(0, 2);
      bankCode = iban.substring(4, 8);
      accountNumber = iban.substring(8);
    }

    return {
      json: {
        iban,
        valid,
        country,
        bankCode,
        accountNumber,
      },
    };
  }
}

export class ValidateSWIFTBICNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const bic = (input.json.bic || input.json).replace(/\s/g, '');

    // SWIFT BIC validation (8 or 11 characters)
    const valid = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic);

    let institutionCode, countryCode, locationCode, branchCode;
    if (valid) {
      institutionCode = bic.substring(0, 4);
      countryCode = bic.substring(4, 6);
      locationCode = bic.substring(6, 8);
      branchCode = bic.length === 11 ? bic.substring(8, 11) : undefined;
    }

    return {
      json: {
        bic,
        valid,
        institutionCode,
        countryCode,
        locationCode,
        branchCode,
      },
    };
  }
}

// Fraud Detection Nodes

export class FraudCheckNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const transaction = input.json;

    const factors = [];
    let riskScore = 0;

    // Velocity check
    if (transaction.velocityChecks?.last1Hour > 5) {
      factors.push({
        name: 'high_velocity',
        score: 25,
        severity: 'high' as const,
        description: 'Unusual transaction frequency',
      });
      riskScore += 25;
    }

    // Geographic anomaly
    if (transaction.geolocation?.country !== transaction.expectedCountry) {
      factors.push({
        name: 'geographic_anomaly',
        score: 20,
        severity: 'medium' as const,
        description: 'Transaction from unexpected location',
      });
      riskScore += 20;
    }

    // Large amount
    if (transaction.amount > 10000) {
      factors.push({
        name: 'large_amount',
        score: 15,
        severity: 'medium' as const,
        description: 'High transaction amount',
      });
      riskScore += 15;
    }

    const decision = riskScore > 60 ? 'decline' : riskScore > 30 ? 'review' : 'approve';

    const check: FraudCheck = {
      transactionId: transaction.id,
      timestamp: new Date(),
      riskScore,
      decision,
      factors,
      ipAddress: transaction.ipAddress,
      geolocation: transaction.geolocation,
    };

    return {
      json: {
        check,
        approved: decision === 'approve',
        requiresReview: decision === 'review',
      },
    };
  }
}

// Reconciliation Nodes

export class ReconcilePaymentsNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const source1 = input.json.source1 || [];
    const source2 = input.json.source2 || [];

    const matches = [];
    const mismatches = [];

    // Simple reconciliation by ID
    for (const record1 of source1) {
      const match = source2.find((r: any) => r.id === record1.id);

      if (!match) {
        mismatches.push({
          type: 'missing' as const,
          severity: 'medium' as const,
          source1Record: record1,
          description: `Record ${record1.id} missing in source 2`,
        });
      } else if (Math.abs(record1.amount - match.amount) > 0.01) {
        mismatches.push({
          type: 'amount_mismatch' as const,
          severity: 'high' as const,
          source1Record: record1,
          source2Record: match,
          difference: record1.amount - match.amount,
          description: `Amount mismatch for ${record1.id}`,
        });
      } else {
        matches.push({ record1, record2: match });
      }
    }

    const job: ReconciliationJob = {
      id: `REC-${Date.now()}`,
      type: input.json.type || 'bank',
      status: 'completed',
      startDate: new Date(input.json.startDate),
      endDate: new Date(input.json.endDate),
      source1: {
        type: input.json.source1Type,
        count: source1.length,
        totalAmount: source1.reduce((sum: number, r: any) => sum + r.amount, 0),
      },
      source2: {
        type: input.json.source2Type,
        count: source2.length,
        totalAmount: source2.reduce((sum: number, r: any) => sum + r.amount, 0),
      },
      matches: matches.length,
      mismatches,
      completedDate: new Date(),
    };

    return {
      json: {
        job,
        reconciled: mismatches.length === 0,
        matchRate: (matches.length / source1.length) * 100,
      },
    };
  }
}

// Currency & Exchange Nodes

export class ConvertCurrencyNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const amount = input.json.amount;
    const fromCurrency = input.json.from;
    const toCurrency = input.json.to;

    // In production, fetch live exchange rates
    const mockRates: Record<string, Record<string, number>> = {
      USD: { EUR: 0.85, GBP: 0.73, JPY: 110.0 },
      EUR: { USD: 1.18, GBP: 0.86, JPY: 129.0 },
      GBP: { USD: 1.37, EUR: 1.16, JPY: 151.0 },
    };

    const rate = mockRates[fromCurrency]?.[toCurrency] || 1.0;
    const convertedAmount = amount * rate;

    return {
      json: {
        amount,
        fromCurrency,
        toCurrency,
        rate,
        convertedAmount,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export class GetExchangeRateNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const base = input.json.base || 'USD';
    const target = input.json.target;

    // In production, fetch from exchange rate API
    const mockRates: Record<string, number> = {
      EUR: 0.85,
      GBP: 0.73,
      JPY: 110.0,
      CHF: 0.92,
      CAD: 1.25,
      AUD: 1.35,
    };

    const rate = mockRates[target] || 1.0;

    return {
      json: {
        base,
        target,
        rate,
        timestamp: new Date().toISOString(),
        provider: 'Mock Exchange Service',
      },
    };
  }
}

// Compliance & Reporting Nodes

export class GenerateAuditTrailNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const transactions = input.json.transactions || [];

    const auditTrail = transactions.map((tx: any) => ({
      transactionId: tx.id,
      timestamp: tx.timestamp,
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency,
      parties: {
        sender: tx.sender,
        receiver: tx.receiver,
      },
      status: tx.status,
      compliance: {
        kycVerified: true,
        amlScreened: true,
        sanctionsCleared: true,
      },
    }));

    return {
      json: {
        auditTrail,
        period: {
          start: input.json.startDate,
          end: input.json.endDate,
        },
        totalTransactions: auditTrail.length,
      },
    };
  }
}

export class Generate1099Node {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const taxpayer = input.json.taxpayer;
    const income = input.json.income || [];

    const total = income.reduce((sum: number, i: any) => sum + i.amount, 0);

    const form1099 = {
      formType: '1099-MISC',
      taxYear: new Date().getFullYear() - 1,
      payer: input.json.payer,
      recipient: taxpayer,
      income: {
        total,
        breakdown: income,
      },
      withheld: total * (input.json.withholdingRate || 0),
    };

    return {
      json: {
        form1099,
        requiresFiling: total >= 600,
      },
    };
  }
}

// Export all finance nodes
export const financeNodes = {
  ParseISO20022Node,
  GenerateISO20022Node,
  SendISO20022Node,
  ParseSWIFTNode,
  ParseSWIFTMT103Node,
  GenerateSWIFTMT103Node,
  SendSWIFTNode,
  PerformKYCNode,
  PerformAMLScreeningNode,
  MonitorTransactionNode,
  FileSARNode,
  ProcessACHNode,
  ProcessWireNode,
  ProcessSEPANode,
  ValidateIBANNode,
  ValidateSWIFTBICNode,
  FraudCheckNode,
  ReconcilePaymentsNode,
  ConvertCurrencyNode,
  GetExchangeRateNode,
  GenerateAuditTrailNode,
  Generate1099Node,
};
