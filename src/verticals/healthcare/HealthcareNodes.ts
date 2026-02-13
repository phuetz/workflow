/**
 * Healthcare Workflow Nodes
 * 20+ nodes for HL7, FHIR, EHR integration, and HIPAA compliance
 */

import { HL7Parser, HL7MessageBuilder } from './HL7Parser';
import { FHIRClient, FHIRPatientBuilder, FHIRObservationBuilder } from './FHIRClient';
import { HIPAACompliance } from './HIPAACompliance';
import type {
  HL7Message,
  HL7MessageType,
  HL7TriggerEvent,
  FHIRPatient,
  FHIRObservation,
  FHIRCondition,
  FHIRMedicationRequest,
  FHIRAppointment,
  EHRConnection,
  EHRPatientSearchParams,
} from './types/healthcare';

export interface HealthcareNodeConfig {
  hl7Endpoint?: string;
  fhirConfig?: {
    baseUrl: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
  };
  ehrConnection?: EHRConnection;
  hipaaCompliance?: boolean;
  encryptionKey?: string;
}

export interface NodeInput {
  json: any;
  binary?: any;
}

export interface NodeOutput {
  json: any;
  binary?: any;
}

/**
 * HL7 Listener Node
 * Listens for incoming HL7 v2.x messages
 */
export class HL7ListenerNode {
  async execute(config: HealthcareNodeConfig): Promise<NodeOutput> {
    const parser = new HL7Parser();

    // In production, this would set up a TCP/MLLP listener
    // For now, return a mock listener configuration
    return {
      json: {
        status: 'listening',
        endpoint: config.hl7Endpoint || 'tcp://0.0.0.0:2575',
        protocol: 'MLLP',
        messageTypes: ['ADT', 'ORM', 'ORU', 'MDM', 'SIU'],
      },
    };
  }
}

/**
 * Parse HL7 Message Node
 * Parses incoming HL7 v2.x messages into structured data
 */
export class ParseHL7Node {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const parser = new HL7Parser();
    const rawMessage = input.json.message || input.json;

    if (typeof rawMessage !== 'string') {
      throw new Error('HL7 message must be a string');
    }

    const message = parser.parse(rawMessage);
    const patient = parser.parsePatient(message);
    const visit = parser.parseVisit(message);
    const orders = parser.parseOrders(message);
    const observations = parser.parseObservations(message);

    return {
      json: {
        message,
        patient,
        visit,
        orders,
        observations,
      },
    };
  }
}

/**
 * Send HL7 Message Node
 * Sends HL7 v2.x messages to remote systems
 */
export class SendHL7Node {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    const parser = new HL7Parser();
    const message = input.json as HL7Message;

    const rawMessage = parser.generate(message);

    // In production, send via MLLP to remote endpoint
    // For now, return the formatted message
    return {
      json: {
        sent: true,
        endpoint: config.hl7Endpoint,
        message: rawMessage,
        messageControlId: message.messageControlId,
      },
    };
  }
}

/**
 * Create HL7 ACK Node
 * Creates HL7 acknowledgment messages
 */
export class CreateHL7ACKNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const parser = new HL7Parser();
    const originalMessage = input.json as HL7Message;
    const status = (input.json.status || 'AA') as 'AA' | 'AE' | 'AR';
    const errorMessage = input.json.errorMessage;

    const ack = parser.createACK(originalMessage, status, errorMessage);

    return {
      json: {
        ack,
        status,
        originalMessageControlId: originalMessage.messageControlId,
      },
    };
  }
}

/**
 * FHIR Webhook Node
 * Receives FHIR resource notifications
 */
export class FHIRWebhookNode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    const resource = input.json;

    // Validate FHIR resource
    if (!resource.resourceType) {
      throw new Error('Invalid FHIR resource: missing resourceType');
    }

    return {
      json: {
        resourceType: resource.resourceType,
        resourceId: resource.id,
        resource,
        event: 'created', // In production, determine from webhook headers
      },
    };
  }
}

/**
 * Search Patients Node
 * Searches for patients in FHIR server
 */
export class SearchPatientsNode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    if (!config.fhirConfig) {
      throw new Error('FHIR configuration is required');
    }

    const client = new FHIRClient(config.fhirConfig);
    const params = input.json as EHRPatientSearchParams;

    const bundle = await client.searchPatients(params);
    const patients = client.extractResources(bundle);

    return {
      json: {
        total: bundle.total || patients.length,
        patients,
      },
    };
  }
}

/**
 * Get Patient Node
 * Retrieves a patient by ID
 */
export class GetPatientNode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    if (!config.fhirConfig) {
      throw new Error('FHIR configuration is required');
    }

    const client = new FHIRClient(config.fhirConfig);
    const patientId = input.json.patientId || input.json.id;

    if (!patientId) {
      throw new Error('Patient ID is required');
    }

    const patient = await client.getPatient(patientId);

    return {
      json: {
        patient,
      },
    };
  }
}

/**
 * Create Patient Node
 * Creates a new patient in FHIR server
 */
export class CreatePatientNode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    if (!config.fhirConfig) {
      throw new Error('FHIR configuration is required');
    }

    const client = new FHIRClient(config.fhirConfig);
    const patientData = input.json;

    const patient = await client.createPatient(patientData);

    return {
      json: {
        patient,
        patientId: patient.id,
      },
    };
  }
}

/**
 * Update Patient Node
 * Updates an existing patient
 */
export class UpdatePatientNode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    if (!config.fhirConfig) {
      throw new Error('FHIR configuration is required');
    }

    const client = new FHIRClient(config.fhirConfig);
    const patient = input.json as FHIRPatient;

    if (!patient.id) {
      throw new Error('Patient ID is required for update');
    }

    const updated = await client.updatePatient(patient);

    return {
      json: {
        patient: updated,
        updated: true,
      },
    };
  }
}

/**
 * Get Patient Everything Node
 * Retrieves all data for a patient
 */
export class GetPatientEverythingNode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    if (!config.fhirConfig) {
      throw new Error('FHIR configuration is required');
    }

    const client = new FHIRClient(config.fhirConfig);
    const patientId = input.json.patientId || input.json.id;

    if (!patientId) {
      throw new Error('Patient ID is required');
    }

    const bundle = await client.getPatientEverything(patientId);

    return {
      json: {
        patientId,
        total: bundle.total || 0,
        resources: client.extractResources(bundle),
      },
    };
  }
}

/**
 * Create Observation Node
 * Creates a new observation (vital sign, lab result, etc.)
 */
export class CreateObservationNode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    if (!config.fhirConfig) {
      throw new Error('FHIR configuration is required');
    }

    const client = new FHIRClient(config.fhirConfig);
    const observationData = input.json;

    const observation = await client.createObservation(observationData);

    return {
      json: {
        observation,
        observationId: observation.id,
      },
    };
  }
}

/**
 * Get Vital Signs Node
 * Retrieves vital signs for a patient
 */
export class GetVitalSignsNode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    if (!config.fhirConfig) {
      throw new Error('FHIR configuration is required');
    }

    const client = new FHIRClient(config.fhirConfig);
    const patientId = input.json.patientId || input.json.id;
    const fromDate = input.json.fromDate;

    if (!patientId) {
      throw new Error('Patient ID is required');
    }

    const bundle = await client.getVitalSigns(patientId, fromDate);
    const vitalSigns = client.extractResources(bundle);

    return {
      json: {
        patientId,
        total: vitalSigns.length,
        vitalSigns,
      },
    };
  }
}

/**
 * Get Lab Results Node
 * Retrieves lab results for a patient
 */
export class GetLabResultsNode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    if (!config.fhirConfig) {
      throw new Error('FHIR configuration is required');
    }

    const client = new FHIRClient(config.fhirConfig);
    const patientId = input.json.patientId || input.json.id;
    const fromDate = input.json.fromDate;

    if (!patientId) {
      throw new Error('Patient ID is required');
    }

    const bundle = await client.getLabResults(patientId, fromDate);
    const labResults = client.extractResources(bundle);

    return {
      json: {
        patientId,
        total: labResults.length,
        labResults,
      },
    };
  }
}

/**
 * Get Active Conditions Node
 * Retrieves active conditions/diagnoses for a patient
 */
export class GetActiveConditionsNode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    if (!config.fhirConfig) {
      throw new Error('FHIR configuration is required');
    }

    const client = new FHIRClient(config.fhirConfig);
    const patientId = input.json.patientId || input.json.id;

    if (!patientId) {
      throw new Error('Patient ID is required');
    }

    const bundle = await client.getActiveConditions(patientId);
    const conditions = client.extractResources(bundle);

    return {
      json: {
        patientId,
        total: conditions.length,
        conditions,
      },
    };
  }
}

/**
 * Create Condition Node
 * Creates a new condition/diagnosis
 */
export class CreateConditionNode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    if (!config.fhirConfig) {
      throw new Error('FHIR configuration is required');
    }

    const client = new FHIRClient(config.fhirConfig);
    const conditionData = input.json;

    const condition = await client.createCondition(conditionData);

    return {
      json: {
        condition,
        conditionId: condition.id,
      },
    };
  }
}

/**
 * Get Active Medications Node
 * Retrieves active medications for a patient
 */
export class GetActiveMedicationsNode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    if (!config.fhirConfig) {
      throw new Error('FHIR configuration is required');
    }

    const client = new FHIRClient(config.fhirConfig);
    const patientId = input.json.patientId || input.json.id;

    if (!patientId) {
      throw new Error('Patient ID is required');
    }

    const bundle = await client.getActiveMedications(patientId);
    const medications = client.extractResources(bundle);

    return {
      json: {
        patientId,
        total: medications.length,
        medications,
      },
    };
  }
}

/**
 * Create Medication Request Node
 * Creates a new medication order/prescription
 */
export class CreateMedicationRequestNode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    if (!config.fhirConfig) {
      throw new Error('FHIR configuration is required');
    }

    const client = new FHIRClient(config.fhirConfig);
    const medicationData = input.json;

    const medication = await client.createMedicationRequest(medicationData);

    return {
      json: {
        medication,
        medicationId: medication.id,
      },
    };
  }
}

/**
 * Search Appointments Node
 * Searches for appointments
 */
export class SearchAppointmentsNode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    if (!config.fhirConfig) {
      throw new Error('FHIR configuration is required');
    }

    const client = new FHIRClient(config.fhirConfig);
    const params = input.json;

    const bundle = await client.searchAppointments(params);
    const appointments = client.extractResources(bundle);

    return {
      json: {
        total: bundle.total || appointments.length,
        appointments,
      },
    };
  }
}

/**
 * Create Appointment Node
 * Creates a new appointment
 */
export class CreateAppointmentNode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    if (!config.fhirConfig) {
      throw new Error('FHIR configuration is required');
    }

    const client = new FHIRClient(config.fhirConfig);
    const appointmentData = input.json;

    const appointment = await client.createAppointment(appointmentData);

    return {
      json: {
        appointment,
        appointmentId: appointment.id,
      },
    };
  }
}

/**
 * Update Appointment Status Node
 * Updates appointment status (booked, cancelled, etc.)
 */
export class UpdateAppointmentStatusNode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    if (!config.fhirConfig) {
      throw new Error('FHIR configuration is required');
    }

    const client = new FHIRClient(config.fhirConfig);
    const appointmentId = input.json.appointmentId || input.json.id;
    const status = input.json.status;

    if (!appointmentId || !status) {
      throw new Error('Appointment ID and status are required');
    }

    const appointment = await client.updateAppointmentStatus(appointmentId, status);

    return {
      json: {
        appointment,
        updated: true,
      },
    };
  }
}

/**
 * Detect PHI Node
 * Detects Protected Health Information in data
 */
export class DetectPHINode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    const hipaa = new HIPAACompliance(config.encryptionKey);
    const data = input.json;

    const phiElements = hipaa.detectPHI(data);

    return {
      json: {
        hasPHI: phiElements.length > 0,
        phiCount: phiElements.length,
        phiElements,
      },
    };
  }
}

/**
 * Encrypt PHI Node
 * Encrypts Protected Health Information
 */
export class EncryptPHINode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    const hipaa = new HIPAACompliance(config.encryptionKey);
    const data = input.json.data || input.json;

    if (typeof data !== 'string') {
      throw new Error('Data must be a string for encryption');
    }

    const encrypted = hipaa.encryptPHI(data);

    return {
      json: {
        encrypted,
      },
    };
  }
}

/**
 * Decrypt PHI Node
 * Decrypts Protected Health Information
 */
export class DecryptPHINode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    const hipaa = new HIPAACompliance(config.encryptionKey);
    const encryptedData = input.json;

    const decrypted = hipaa.decryptPHI(encryptedData);

    return {
      json: {
        decrypted,
      },
    };
  }
}

/**
 * Redact PHI Node
 * Redacts Protected Health Information from data
 */
export class RedactPHINode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    const hipaa = new HIPAACompliance(config.encryptionKey);
    const data = input.json.data || input.json;

    const phiElements = hipaa.detectPHI(data);
    const redacted = hipaa.redactPHI(data, phiElements);

    return {
      json: {
        redacted,
        phiCount: phiElements.length,
      },
    };
  }
}

/**
 * Log HIPAA Access Node
 * Logs access to Protected Health Information
 */
export class LogHIPAAAccessNode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    const hipaa = new HIPAACompliance(config.encryptionKey);
    const log = input.json;

    hipaa.logAccess(log);

    return {
      json: {
        logged: true,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Check Consent Node
 * Checks if patient has given consent for specific use
 */
export class CheckConsentNode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    const hipaa = new HIPAACompliance(config.encryptionKey);
    const patientId = input.json.patientId;
    const consentType = input.json.consentType;

    if (!patientId || !consentType) {
      throw new Error('Patient ID and consent type are required');
    }

    const hasConsent = hipaa.hasConsent(patientId, consentType);

    return {
      json: {
        patientId,
        consentType,
        hasConsent,
      },
    };
  }
}

/**
 * Record Consent Node
 * Records patient consent
 */
export class RecordConsentNode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    const hipaa = new HIPAACompliance(config.encryptionKey);
    const consent = input.json;

    hipaa.recordConsent(consent);

    return {
      json: {
        recorded: true,
        patientId: consent.patientId,
        consentType: consent.consentType,
      },
    };
  }
}

/**
 * Generate HIPAA Compliance Report Node
 * Generates HIPAA compliance report
 */
export class GenerateHIPAAReportNode {
  async execute(input: NodeInput, config: HealthcareNodeConfig): Promise<NodeOutput> {
    const hipaa = new HIPAACompliance(config.encryptionKey);
    const startDate = new Date(input.json.startDate);
    const endDate = new Date(input.json.endDate || new Date());

    const report = hipaa.generateComplianceReport(startDate, endDate);

    return {
      json: {
        report,
      },
    };
  }
}

// Export all healthcare nodes
export const healthcareNodes = {
  HL7ListenerNode,
  ParseHL7Node,
  SendHL7Node,
  CreateHL7ACKNode,
  FHIRWebhookNode,
  SearchPatientsNode,
  GetPatientNode,
  CreatePatientNode,
  UpdatePatientNode,
  GetPatientEverythingNode,
  CreateObservationNode,
  GetVitalSignsNode,
  GetLabResultsNode,
  GetActiveConditionsNode,
  CreateConditionNode,
  GetActiveMedicationsNode,
  CreateMedicationRequestNode,
  SearchAppointmentsNode,
  CreateAppointmentNode,
  UpdateAppointmentStatusNode,
  DetectPHINode,
  EncryptPHINode,
  DecryptPHINode,
  RedactPHINode,
  LogHIPAAAccessNode,
  CheckConsentNode,
  RecordConsentNode,
  GenerateHIPAAReportNode,
};
