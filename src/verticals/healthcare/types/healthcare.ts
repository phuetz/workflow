/**
 * Healthcare Type Definitions
 * Supports HL7 v2.x, FHIR R4, and HIPAA compliance
 */

// HL7 v2.x Message Types
export type HL7MessageType = 'ADT' | 'ORM' | 'ORU' | 'MDM' | 'SIU' | 'DFT' | 'BAR' | 'RDE' | 'RDS';

export type HL7TriggerEvent =
  | 'A01' | 'A02' | 'A03' | 'A04' | 'A08' // ADT events
  | 'O01' | 'O02' // ORM events
  | 'R01' | 'R03' // ORU events
  | 'T01' | 'T02' // MDM events
  | 'S12' | 'S13' | 'S14' | 'S15'; // SIU events

export interface HL7Message {
  messageType: HL7MessageType;
  triggerEvent: HL7TriggerEvent;
  messageControlId: string;
  timestamp: Date;
  sendingApplication: string;
  sendingFacility: string;
  receivingApplication: string;
  receivingFacility: string;
  version: string;
  segments: HL7Segment[];
}

export interface HL7Segment {
  name: string;
  fields: string[];
  raw: string;
}

export interface HL7Patient {
  patientId: string;
  accountNumber?: string;
  name: {
    family: string;
    given: string[];
    prefix?: string;
    suffix?: string;
  };
  dateOfBirth: Date;
  sex: 'M' | 'F' | 'O' | 'U';
  address?: {
    street: string[];
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  phone?: string[];
  email?: string;
  ssn?: string;
  maritalStatus?: string;
  race?: string;
  ethnicity?: string;
}

export interface HL7Visit {
  visitNumber: string;
  patientClass: 'I' | 'O' | 'E' | 'P'; // Inpatient, Outpatient, Emergency, Preadmit
  admissionType?: string;
  hospital?: string;
  location?: {
    pointOfCare: string;
    room: string;
    bed: string;
    facility: string;
    building: string;
    floor: string;
  };
  attendingDoctor?: HL7Provider;
  referringDoctor?: HL7Provider;
  admitDateTime?: Date;
  dischargeDateTime?: Date;
}

export interface HL7Provider {
  id: string;
  name: {
    family: string;
    given: string[];
    prefix?: string;
    suffix?: string;
  };
  npi?: string;
  specialty?: string;
}

export interface HL7Order {
  orderId: string;
  placerOrderNumber: string;
  fillerOrderNumber: string;
  orderControl: string;
  orderDateTime: Date;
  orderingProvider: HL7Provider;
  orderStatus: string;
  quantityTiming?: string;
  startDateTime?: Date;
  endDateTime?: Date;
}

export interface HL7Observation {
  observationId: string;
  observationType: string;
  observationSubId?: string;
  observationValue: string;
  units?: string;
  referenceRange?: string;
  abnormalFlags?: string[];
  observationDateTime: Date;
  status: 'F' | 'P' | 'C' | 'X'; // Final, Preliminary, Corrected, Cancelled
}

// FHIR R4 Resource Types
export type FHIRResourceType =
  | 'Patient' | 'Observation' | 'Condition' | 'Medication' | 'MedicationRequest'
  | 'Appointment' | 'Encounter' | 'Procedure' | 'DiagnosticReport' | 'AllergyIntolerance'
  | 'Immunization' | 'CarePlan' | 'Goal' | 'CareTeam' | 'Organization' | 'Practitioner'
  | 'Location' | 'Device' | 'Specimen' | 'DocumentReference';

export interface FHIRResource {
  resourceType: FHIRResourceType;
  id?: string;
  meta?: FHIRMeta;
  text?: FHIRNarrative;
  extension?: FHIRExtension[];
}

export interface FHIRMeta {
  versionId?: string;
  lastUpdated?: string;
  source?: string;
  profile?: string[];
  security?: FHIRCoding[];
  tag?: FHIRCoding[];
}

export interface FHIRNarrative {
  status: 'generated' | 'extensions' | 'additional' | 'empty';
  div: string; // XHTML
}

export interface FHIRExtension {
  url: string;
  valueString?: string;
  valueCode?: string;
  valueDateTime?: string;
  valueInteger?: number;
  valueBoolean?: boolean;
  valueReference?: FHIRReference;
  valueCoding?: FHIRCoding;
}

export interface FHIRCoding {
  system?: string;
  version?: string;
  code?: string;
  display?: string;
  userSelected?: boolean;
}

export interface FHIRCodeableConcept {
  coding?: FHIRCoding[];
  text?: string;
}

export interface FHIRReference {
  reference?: string;
  type?: string;
  identifier?: FHIRIdentifier;
  display?: string;
}

export interface FHIRIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary';
  type?: FHIRCodeableConcept;
  system?: string;
  value?: string;
  period?: FHIRPeriod;
  assigner?: FHIRReference;
}

export interface FHIRPeriod {
  start?: string;
  end?: string;
}

export interface FHIRPatient extends FHIRResource {
  resourceType: 'Patient';
  identifier?: FHIRIdentifier[];
  active?: boolean;
  name?: FHIRHumanName[];
  telecom?: FHIRContactPoint[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  deceasedBoolean?: boolean;
  deceasedDateTime?: string;
  address?: FHIRAddress[];
  maritalStatus?: FHIRCodeableConcept;
  multipleBirthBoolean?: boolean;
  multipleBirthInteger?: number;
  photo?: FHIRAttachment[];
  contact?: FHIRPatientContact[];
  communication?: FHIRPatientCommunication[];
  generalPractitioner?: FHIRReference[];
  managingOrganization?: FHIRReference;
}

export interface FHIRHumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
  period?: FHIRPeriod;
}

export interface FHIRContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  rank?: number;
  period?: FHIRPeriod;
}

export interface FHIRAddress {
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
  type?: 'postal' | 'physical' | 'both';
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  period?: FHIRPeriod;
}

export interface FHIRAttachment {
  contentType?: string;
  language?: string;
  data?: string; // Base64
  url?: string;
  size?: number;
  hash?: string; // Base64
  title?: string;
  creation?: string;
}

export interface FHIRPatientContact {
  relationship?: FHIRCodeableConcept[];
  name?: FHIRHumanName;
  telecom?: FHIRContactPoint[];
  address?: FHIRAddress;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  organization?: FHIRReference;
  period?: FHIRPeriod;
}

export interface FHIRPatientCommunication {
  language: FHIRCodeableConcept;
  preferred?: boolean;
}

export interface FHIRObservation extends FHIRResource {
  resourceType: 'Observation';
  identifier?: FHIRIdentifier[];
  basedOn?: FHIRReference[];
  partOf?: FHIRReference[];
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  subject?: FHIRReference;
  focus?: FHIRReference[];
  encounter?: FHIRReference;
  effectiveDateTime?: string;
  effectivePeriod?: FHIRPeriod;
  issued?: string;
  performer?: FHIRReference[];
  valueQuantity?: FHIRQuantity;
  valueCodeableConcept?: FHIRCodeableConcept;
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueRange?: FHIRRange;
  interpretation?: FHIRCodeableConcept[];
  note?: FHIRAnnotation[];
  bodySite?: FHIRCodeableConcept;
  method?: FHIRCodeableConcept;
  referenceRange?: FHIRObservationReferenceRange[];
  hasMember?: FHIRReference[];
  derivedFrom?: FHIRReference[];
  component?: FHIRObservationComponent[];
}

export interface FHIRQuantity {
  value?: number;
  comparator?: '<' | '<=' | '>=' | '>';
  unit?: string;
  system?: string;
  code?: string;
}

export interface FHIRRange {
  low?: FHIRQuantity;
  high?: FHIRQuantity;
}

export interface FHIRAnnotation {
  authorReference?: FHIRReference;
  authorString?: string;
  time?: string;
  text: string;
}

export interface FHIRObservationReferenceRange {
  low?: FHIRQuantity;
  high?: FHIRQuantity;
  type?: FHIRCodeableConcept;
  appliesTo?: FHIRCodeableConcept[];
  age?: FHIRRange;
  text?: string;
}

export interface FHIRObservationComponent {
  code: FHIRCodeableConcept;
  valueQuantity?: FHIRQuantity;
  valueCodeableConcept?: FHIRCodeableConcept;
  valueString?: string;
  interpretation?: FHIRCodeableConcept[];
  referenceRange?: FHIRObservationReferenceRange[];
}

export interface FHIRCondition extends FHIRResource {
  resourceType: 'Condition';
  identifier?: FHIRIdentifier[];
  clinicalStatus?: FHIRCodeableConcept;
  verificationStatus?: FHIRCodeableConcept;
  category?: FHIRCodeableConcept[];
  severity?: FHIRCodeableConcept;
  code?: FHIRCodeableConcept;
  bodySite?: FHIRCodeableConcept[];
  subject: FHIRReference;
  encounter?: FHIRReference;
  onsetDateTime?: string;
  onsetAge?: FHIRQuantity;
  onsetPeriod?: FHIRPeriod;
  abatementDateTime?: string;
  abatementAge?: FHIRQuantity;
  abatementPeriod?: FHIRPeriod;
  recordedDate?: string;
  recorder?: FHIRReference;
  asserter?: FHIRReference;
  stage?: FHIRConditionStage[];
  evidence?: FHIRConditionEvidence[];
  note?: FHIRAnnotation[];
}

export interface FHIRConditionStage {
  summary?: FHIRCodeableConcept;
  assessment?: FHIRReference[];
  type?: FHIRCodeableConcept;
}

export interface FHIRConditionEvidence {
  code?: FHIRCodeableConcept[];
  detail?: FHIRReference[];
}

export interface FHIRMedicationRequest extends FHIRResource {
  resourceType: 'MedicationRequest';
  identifier?: FHIRIdentifier[];
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft' | 'unknown';
  statusReason?: FHIRCodeableConcept;
  intent: 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  category?: FHIRCodeableConcept[];
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  medicationCodeableConcept?: FHIRCodeableConcept;
  medicationReference?: FHIRReference;
  subject: FHIRReference;
  encounter?: FHIRReference;
  authoredOn?: string;
  requester?: FHIRReference;
  performer?: FHIRReference;
  dosageInstruction?: FHIRDosage[];
  dispenseRequest?: FHIRMedicationRequestDispenseRequest;
}

export interface FHIRDosage {
  sequence?: number;
  text?: string;
  timing?: FHIRTiming;
  route?: FHIRCodeableConcept;
  method?: FHIRCodeableConcept;
  doseAndRate?: FHIRDosageDoseAndRate[];
}

export interface FHIRTiming {
  event?: string[];
  repeat?: FHIRTimingRepeat;
  code?: FHIRCodeableConcept;
}

export interface FHIRTimingRepeat {
  boundsDuration?: FHIRQuantity;
  boundsPeriod?: FHIRPeriod;
  count?: number;
  countMax?: number;
  duration?: number;
  durationMax?: number;
  durationUnit?: 's' | 'min' | 'h' | 'd' | 'wk' | 'mo' | 'a';
  frequency?: number;
  frequencyMax?: number;
  period?: number;
  periodMax?: number;
  periodUnit?: 's' | 'min' | 'h' | 'd' | 'wk' | 'mo' | 'a';
  dayOfWeek?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
  timeOfDay?: string[];
  when?: string[];
}

export interface FHIRDosageDoseAndRate {
  type?: FHIRCodeableConcept;
  doseRange?: FHIRRange;
  doseQuantity?: FHIRQuantity;
  rateRatio?: FHIRRatio;
  rateRange?: FHIRRange;
  rateQuantity?: FHIRQuantity;
}

export interface FHIRRatio {
  numerator?: FHIRQuantity;
  denominator?: FHIRQuantity;
}

export interface FHIRMedicationRequestDispenseRequest {
  initialFill?: {
    quantity?: FHIRQuantity;
    duration?: FHIRQuantity;
  };
  dispenseInterval?: FHIRQuantity;
  validityPeriod?: FHIRPeriod;
  numberOfRepeatsAllowed?: number;
  quantity?: FHIRQuantity;
  expectedSupplyDuration?: FHIRQuantity;
  performer?: FHIRReference;
}

export interface FHIRAppointment extends FHIRResource {
  resourceType: 'Appointment';
  identifier?: FHIRIdentifier[];
  status: 'proposed' | 'pending' | 'booked' | 'arrived' | 'fulfilled' | 'cancelled' | 'noshow' | 'entered-in-error' | 'checked-in' | 'waitlist';
  cancelationReason?: FHIRCodeableConcept;
  serviceCategory?: FHIRCodeableConcept[];
  serviceType?: FHIRCodeableConcept[];
  specialty?: FHIRCodeableConcept[];
  appointmentType?: FHIRCodeableConcept;
  reasonCode?: FHIRCodeableConcept[];
  reasonReference?: FHIRReference[];
  priority?: number;
  description?: string;
  start?: string;
  end?: string;
  minutesDuration?: number;
  slot?: FHIRReference[];
  created?: string;
  comment?: string;
  patientInstruction?: string;
  basedOn?: FHIRReference[];
  participant: FHIRAppointmentParticipant[];
  requestedPeriod?: FHIRPeriod[];
}

export interface FHIRAppointmentParticipant {
  type?: FHIRCodeableConcept[];
  actor?: FHIRReference;
  required?: 'required' | 'optional' | 'information-only';
  status: 'accepted' | 'declined' | 'tentative' | 'needs-action';
  period?: FHIRPeriod;
}

// HIPAA Compliance
export type PHIType =
  | 'name' | 'address' | 'dob' | 'ssn' | 'mrn' | 'phone' | 'email'
  | 'ip' | 'biometric' | 'photo' | 'account' | 'license' | 'device';

export interface PHIElement {
  type: PHIType;
  value: string;
  location: string; // Field path
  confidence: number; // 0-1
}

export interface HIPAAAccessLog {
  timestamp: Date;
  userId: string;
  userName: string;
  action: 'view' | 'create' | 'update' | 'delete' | 'export' | 'print';
  resourceType: string;
  resourceId: string;
  patientId?: string;
  phi: PHIType[];
  purpose?: string;
  ipAddress: string;
  userAgent: string;
  duration?: number; // milliseconds
}

export interface HIPAABreachNotification {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedRecords: number;
  affectedPatients: string[];
  phiTypes: PHIType[];
  description: string;
  mitigation: string;
  reported: boolean;
  reportedDate?: Date;
}

export interface EncryptedPHI {
  encrypted: string; // Base64
  algorithm: 'AES-256-GCM';
  keyId: string;
  iv: string; // Base64
  authTag: string; // Base64
}

export interface HIPAAConsentRecord {
  patientId: string;
  consentDate: Date;
  consentType: 'treatment' | 'payment' | 'operations' | 'research' | 'marketing';
  granted: boolean;
  expirationDate?: Date;
  revokedDate?: Date;
  document?: string; // Base64 PDF
  witness?: string;
}

// EHR Integration
export type EHRVendor = 'epic' | 'cerner' | 'allscripts' | 'meditech' | 'athenahealth';

export interface EHRConnection {
  vendor: EHRVendor;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  tenantId?: string;
  apiVersion?: string;
  fhirEndpoint?: string;
  hl7Endpoint?: string;
}

export interface EHRPatientSearchParams {
  name?: string;
  identifier?: string;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  phone?: string;
  email?: string;
  address?: string;
  limit?: number;
  offset?: number;
}

export interface EHRAppointmentSearchParams {
  patient?: string;
  practitioner?: string;
  location?: string;
  date?: string;
  dateRange?: { start: string; end: string };
  status?: string;
  serviceType?: string;
  limit?: number;
  offset?: number;
}
