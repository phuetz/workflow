/**
 * FHIR R4 Client
 * Complete FHIR R4 resource support with REST API
 */

import type {
  FHIRResource,
  FHIRPatient,
  FHIRObservation,
  FHIRCondition,
  FHIRMedicationRequest,
  FHIRAppointment,
  FHIRResourceType,
  FHIRIdentifier,
  FHIRCodeableConcept,
  FHIRReference,
} from './types/healthcare';

export interface FHIRClientConfig {
  baseUrl: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  tenantId?: string;
}

export interface FHIRSearchParams {
  _id?: string;
  _lastUpdated?: string;
  _tag?: string;
  _profile?: string;
  _security?: string;
  _count?: number;
  _offset?: number;
  _sort?: string;
  _include?: string;
  _revinclude?: string;
  _summary?: 'true' | 'text' | 'data' | 'count' | 'false';
  [key: string]: any;
}

export interface FHIRBundle<T extends FHIRResource = FHIRResource> {
  resourceType: 'Bundle';
  type: 'searchset' | 'transaction' | 'collection' | 'document' | 'message';
  total?: number;
  link?: FHIRBundleLink[];
  entry?: FHIRBundleEntry<T>[];
}

export interface FHIRBundleLink {
  relation: 'self' | 'first' | 'previous' | 'next' | 'last';
  url: string;
}

export interface FHIRBundleEntry<T extends FHIRResource = FHIRResource> {
  fullUrl?: string;
  resource?: T;
  search?: {
    mode: 'match' | 'include';
    score?: number;
  };
}

export interface FHIROperationOutcome {
  resourceType: 'OperationOutcome';
  issue: FHIROperationOutcomeIssue[];
}

export interface FHIROperationOutcomeIssue {
  severity: 'fatal' | 'error' | 'warning' | 'information';
  code: string;
  details?: FHIRCodeableConcept;
  diagnostics?: string;
  location?: string[];
  expression?: string[];
}

export class FHIRClient {
  private config: FHIRClientConfig;
  private baseHeaders: Record<string, string>;

  constructor(config: FHIRClientConfig) {
    this.config = config;
    this.baseHeaders = {
      'Content-Type': 'application/fhir+json',
      Accept: 'application/fhir+json',
    };

    if (config.accessToken) {
      this.baseHeaders.Authorization = `Bearer ${config.accessToken}`;
    }
  }

  /**
   * Generic request method
   */
  private async request<T = any>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: this.baseHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`FHIR request failed: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  /**
   * Search for resources
   */
  async search<T extends FHIRResource>(
    resourceType: FHIRResourceType,
    params?: FHIRSearchParams
  ): Promise<FHIRBundle<T>> {
    const queryString = params ? this.buildQueryString(params) : '';
    return this.request<FHIRBundle<T>>('GET', `/${resourceType}${queryString}`);
  }

  /**
   * Read a resource by ID
   */
  async read<T extends FHIRResource>(
    resourceType: FHIRResourceType,
    id: string
  ): Promise<T> {
    return this.request<T>('GET', `/${resourceType}/${id}`);
  }

  /**
   * Create a new resource
   */
  async create<T extends FHIRResource>(resource: T): Promise<T> {
    return this.request<T>('POST', `/${resource.resourceType}`, resource);
  }

  /**
   * Update a resource
   */
  async update<T extends FHIRResource>(resource: T): Promise<T> {
    if (!resource.id) {
      throw new Error('Resource ID is required for update');
    }
    return this.request<T>('PUT', `/${resource.resourceType}/${resource.id}`, resource);
  }

  /**
   * Patch a resource (partial update)
   */
  async patch<T extends FHIRResource>(
    resourceType: FHIRResourceType,
    id: string,
    patch: any
  ): Promise<T> {
    return this.request<T>('PATCH', `/${resourceType}/${id}`, patch);
  }

  /**
   * Delete a resource
   */
  async delete(resourceType: FHIRResourceType, id: string): Promise<void> {
    await this.request('DELETE', `/${resourceType}/${id}`);
  }

  /**
   * Get resource history
   */
  async history<T extends FHIRResource>(
    resourceType: FHIRResourceType,
    id: string
  ): Promise<FHIRBundle<T>> {
    return this.request<FHIRBundle<T>>('GET', `/${resourceType}/${id}/_history`);
  }

  /**
   * Execute a transaction/batch
   */
  async transaction(bundle: FHIRBundle): Promise<FHIRBundle> {
    return this.request<FHIRBundle>('POST', '/', bundle);
  }

  /**
   * Build query string from params
   */
  private buildQueryString(params: FHIRSearchParams): string {
    const parts: string[] = [];

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => parts.push(`${key}=${encodeURIComponent(v)}`));
        } else {
          parts.push(`${key}=${encodeURIComponent(value)}`);
        }
      }
    }

    return parts.length > 0 ? `?${parts.join('&')}` : '';
  }

  // Patient operations

  /**
   * Search for patients
   */
  async searchPatients(params: {
    name?: string;
    identifier?: string;
    birthdate?: string;
    gender?: string;
    phone?: string;
    email?: string;
    address?: string;
    _count?: number;
    _offset?: number;
  }): Promise<FHIRBundle<FHIRPatient>> {
    return this.search<FHIRPatient>('Patient', params);
  }

  /**
   * Get patient by ID
   */
  async getPatient(id: string): Promise<FHIRPatient> {
    return this.read<FHIRPatient>('Patient', id);
  }

  /**
   * Create a new patient
   */
  async createPatient(patient: Omit<FHIRPatient, 'resourceType'>): Promise<FHIRPatient> {
    return this.create<FHIRPatient>({ resourceType: 'Patient', ...patient });
  }

  /**
   * Update patient
   */
  async updatePatient(patient: FHIRPatient): Promise<FHIRPatient> {
    return this.update<FHIRPatient>(patient);
  }

  /**
   * Get patient everything (comprehensive patient data)
   */
  async getPatientEverything(patientId: string): Promise<FHIRBundle> {
    return this.request<FHIRBundle>('GET', `/Patient/${patientId}/$everything`);
  }

  // Observation operations

  /**
   * Search for observations
   */
  async searchObservations(params: {
    patient?: string;
    subject?: string;
    code?: string;
    date?: string;
    category?: string;
    status?: string;
    _count?: number;
    _offset?: number;
  }): Promise<FHIRBundle<FHIRObservation>> {
    return this.search<FHIRObservation>('Observation', params);
  }

  /**
   * Create observation
   */
  async createObservation(observation: Omit<FHIRObservation, 'resourceType'>): Promise<FHIRObservation> {
    return this.create<FHIRObservation>({ resourceType: 'Observation', ...observation });
  }

  /**
   * Get vital signs for patient
   */
  async getVitalSigns(patientId: string, fromDate?: string): Promise<FHIRBundle<FHIRObservation>> {
    const params: any = {
      patient: patientId,
      category: 'vital-signs',
    };

    if (fromDate) {
      params.date = `ge${fromDate}`;
    }

    return this.searchObservations(params);
  }

  /**
   * Get lab results for patient
   */
  async getLabResults(patientId: string, fromDate?: string): Promise<FHIRBundle<FHIRObservation>> {
    const params: any = {
      patient: patientId,
      category: 'laboratory',
    };

    if (fromDate) {
      params.date = `ge${fromDate}`;
    }

    return this.searchObservations(params);
  }

  // Condition operations

  /**
   * Search for conditions
   */
  async searchConditions(params: {
    patient?: string;
    subject?: string;
    code?: string;
    'clinical-status'?: string;
    'verification-status'?: string;
    category?: string;
    _count?: number;
    _offset?: number;
  }): Promise<FHIRBundle<FHIRCondition>> {
    return this.search<FHIRCondition>('Condition', params);
  }

  /**
   * Create condition
   */
  async createCondition(condition: Omit<FHIRCondition, 'resourceType'>): Promise<FHIRCondition> {
    return this.create<FHIRCondition>({ resourceType: 'Condition', ...condition });
  }

  /**
   * Get active conditions for patient
   */
  async getActiveConditions(patientId: string): Promise<FHIRBundle<FHIRCondition>> {
    return this.searchConditions({
      patient: patientId,
      'clinical-status': 'active',
    });
  }

  // Medication operations

  /**
   * Search for medication requests
   */
  async searchMedicationRequests(params: {
    patient?: string;
    subject?: string;
    status?: string;
    intent?: string;
    medication?: string;
    authoredon?: string;
    _count?: number;
    _offset?: number;
  }): Promise<FHIRBundle<FHIRMedicationRequest>> {
    return this.search<FHIRMedicationRequest>('MedicationRequest', params);
  }

  /**
   * Create medication request
   */
  async createMedicationRequest(
    medicationRequest: Omit<FHIRMedicationRequest, 'resourceType'>
  ): Promise<FHIRMedicationRequest> {
    return this.create<FHIRMedicationRequest>({
      resourceType: 'MedicationRequest',
      ...medicationRequest,
    });
  }

  /**
   * Get active medications for patient
   */
  async getActiveMedications(patientId: string): Promise<FHIRBundle<FHIRMedicationRequest>> {
    return this.searchMedicationRequests({
      patient: patientId,
      status: 'active',
    });
  }

  // Appointment operations

  /**
   * Search for appointments
   */
  async searchAppointments(params: {
    patient?: string;
    practitioner?: string;
    location?: string;
    date?: string;
    status?: string;
    'service-type'?: string;
    _count?: number;
    _offset?: number;
  }): Promise<FHIRBundle<FHIRAppointment>> {
    return this.search<FHIRAppointment>('Appointment', params);
  }

  /**
   * Create appointment
   */
  async createAppointment(appointment: Omit<FHIRAppointment, 'resourceType'>): Promise<FHIRAppointment> {
    return this.create<FHIRAppointment>({ resourceType: 'Appointment', ...appointment });
  }

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(
    appointmentId: string,
    status: FHIRAppointment['status']
  ): Promise<FHIRAppointment> {
    const appointment = await this.read<FHIRAppointment>('Appointment', appointmentId);
    appointment.status = status;
    return this.update<FHIRAppointment>(appointment);
  }

  /**
   * Get upcoming appointments for patient
   */
  async getUpcomingAppointments(patientId: string): Promise<FHIRBundle<FHIRAppointment>> {
    const now = new Date().toISOString();
    return this.searchAppointments({
      patient: patientId,
      date: `ge${now}`,
      status: 'booked,pending,arrived',
    });
  }

  // Utility methods

  /**
   * Create FHIR identifier
   */
  createIdentifier(system: string, value: string, use?: FHIRIdentifier['use']): FHIRIdentifier {
    return {
      use,
      system,
      value,
    };
  }

  /**
   * Create FHIR CodeableConcept
   */
  createCodeableConcept(
    system: string,
    code: string,
    display?: string
  ): FHIRCodeableConcept {
    return {
      coding: [
        {
          system,
          code,
          display,
        },
      ],
      text: display,
    };
  }

  /**
   * Create FHIR Reference
   */
  createReference(
    resourceType: FHIRResourceType,
    id: string,
    display?: string
  ): FHIRReference {
    return {
      reference: `${resourceType}/${id}`,
      type: resourceType,
      display,
    };
  }

  /**
   * Extract resource from bundle entry
   */
  extractResources<T extends FHIRResource>(bundle: FHIRBundle<T>): T[] {
    return bundle.entry?.map(e => e.resource).filter(Boolean) as T[] || [];
  }

  /**
   * Validate FHIR resource
   */
  async validate<T extends FHIRResource>(resource: T): Promise<FHIROperationOutcome> {
    return this.request<FHIROperationOutcome>(
      'POST',
      `/${resource.resourceType}/$validate`,
      resource
    );
  }
}

/**
 * FHIR Resource Builder
 * Fluent API for building FHIR resources
 */
export class FHIRPatientBuilder {
  private patient: Partial<FHIRPatient> = {
    resourceType: 'Patient',
    identifier: [],
    name: [],
    telecom: [],
    address: [],
  };

  addIdentifier(system: string, value: string, use?: FHIRIdentifier['use']): this {
    this.patient.identifier!.push({ system, value, use });
    return this;
  }

  setActive(active: boolean): this {
    this.patient.active = active;
    return this;
  }

  addName(family: string, given: string[], use?: FHIRPatient['name'][0]['use']): this {
    this.patient.name!.push({
      use,
      family,
      given,
      text: `${given.join(' ')} ${family}`,
    });
    return this;
  }

  addTelecom(system: FHIRPatient['telecom'][0]['system'], value: string, use?: FHIRPatient['telecom'][0]['use']): this {
    this.patient.telecom!.push({ system, value, use });
    return this;
  }

  setGender(gender: FHIRPatient['gender']): this {
    this.patient.gender = gender;
    return this;
  }

  setBirthDate(birthDate: string): this {
    this.patient.birthDate = birthDate;
    return this;
  }

  addAddress(
    line: string[],
    city: string,
    state: string,
    postalCode: string,
    country: string,
    use?: FHIRPatient['address'][0]['use']
  ): this {
    this.patient.address!.push({
      use,
      line,
      city,
      state,
      postalCode,
      country,
    });
    return this;
  }

  build(): FHIRPatient {
    return this.patient as FHIRPatient;
  }
}

export class FHIRObservationBuilder {
  private observation: Partial<FHIRObservation> = {
    resourceType: 'Observation',
    status: 'final',
  };

  setStatus(status: FHIRObservation['status']): this {
    this.observation.status = status;
    return this;
  }

  setCode(system: string, code: string, display: string): this {
    this.observation.code = {
      coding: [{ system, code, display }],
      text: display,
    };
    return this;
  }

  setSubject(resourceType: FHIRResourceType, id: string, display?: string): this {
    this.observation.subject = {
      reference: `${resourceType}/${id}`,
      display,
    };
    return this;
  }

  setEffectiveDateTime(dateTime: string): this {
    this.observation.effectiveDateTime = dateTime;
    return this;
  }

  setValueQuantity(value: number, unit: string, system?: string, code?: string): this {
    this.observation.valueQuantity = {
      value,
      unit,
      system,
      code,
    };
    return this;
  }

  setValueString(value: string): this {
    this.observation.valueString = value;
    return this;
  }

  addCategory(system: string, code: string, display: string): this {
    if (!this.observation.category) {
      this.observation.category = [];
    }
    this.observation.category.push({
      coding: [{ system, code, display }],
    });
    return this;
  }

  build(): FHIRObservation {
    if (!this.observation.code) {
      throw new Error('Observation code is required');
    }
    return this.observation as FHIRObservation;
  }
}
