/**
 * Form Trigger Types
 * Types for the interactive form trigger system
 */

export type FormFieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'password'
  | 'tel'
  | 'url'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'datetime'
  | 'time'
  | 'file'
  | 'hidden'
  | 'rating'
  | 'slider';

export interface FormFieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  customValidation?: string; // Expression for custom validation
}

export interface FormFieldOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  name: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string | number | boolean | string[];
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  conditionalDisplay?: {
    field: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan';
    value: string | number | boolean;
  };
  width?: 'full' | 'half' | 'third';
  // File specific
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in MB
  multiple?: boolean;
  // Slider/Rating specific
  step?: number;
}

export interface FormPage {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export interface FormStyle {
  primaryColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  borderRadius?: string;
  showProgressBar?: boolean;
  logoUrl?: string;
  customCss?: string;
}

export interface FormAuthentication {
  type: 'none' | 'basic' | 'jwt' | 'apiKey';
  config?: {
    username?: string;
    password?: string;
    apiKeyHeader?: string;
    jwtSecret?: string;
  };
}

export interface FormTriggerConfig {
  id: string;
  workflowId: string;
  title: string;
  description?: string;
  pages: FormPage[];
  style?: FormStyle;
  authentication?: FormAuthentication;
  submitButton: {
    text: string;
    loadingText?: string;
  };
  successMessage?: string;
  redirectUrl?: string;
  webhookUrl?: string;
  rateLimit?: {
    maxSubmissions: number;
    windowMs: number;
  };
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormSubmission {
  id: string;
  formId: string;
  workflowId: string;
  data: Record<string, unknown>;
  files?: {
    fieldName: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    storageKey: string;
  }[];
  metadata: {
    ip?: string;
    userAgent?: string;
    referrer?: string;
    submittedAt: Date;
  };
  status: 'pending' | 'processed' | 'failed';
  executionId?: string;
}

export interface FormBuilderState {
  selectedField: string | null;
  selectedPage: number;
  isDragging: boolean;
  previewMode: boolean;
}

// Form validation result
export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Form context for workflow execution
export interface FormExecutionContext {
  formId: string;
  submissionId: string;
  formData: Record<string, unknown>;
  files: FormSubmission['files'];
  metadata: FormSubmission['metadata'];
}
