/**
 * Forms Components - Barrel Export
 * Interactive form trigger system components
 */

export { FormField } from './FormField';
export { FormPage } from './FormPage';
export { FormRenderer } from './FormRenderer';
export { FormBuilder } from './FormBuilder';

// Re-export types
export type {
  FormFieldType,
  FormField as FormFieldConfig,
  FormPage as FormPageConfig,
  FormTriggerConfig,
  FormSubmission,
  FormValidationResult,
  FormBuilderState,
  FormStyle,
  FormAuthentication,
  FormFieldOption,
  FormFieldValidation,
  FormExecutionContext,
} from '@/types/forms';
