/**
 * Form Validation Hook
 * Provides real-time validation for form fields
 * Fixes P1-FORM issues
 */

import { useState, useCallback, useMemo } from 'react';

export type ValidationRule<T> = {
  validate: (value: T, allValues?: Record<string, unknown>) => boolean;
  message: string;
};

export type FieldValidation<T> = {
  rules: ValidationRule<T>[];
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
};

export type FormFields<T extends Record<string, unknown>> = {
  [K in keyof T]: FieldValidation<T[K]>;
};

export interface FieldState {
  value: unknown;
  error: string | null;
  touched: boolean;
  validating: boolean;
  valid: boolean;
}

export interface FormState<T extends Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

export interface UseFormValidationReturn<T extends Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setTouched: (field: keyof T) => void;
  setError: (field: keyof T, error: string | null) => void;
  validateField: (field: keyof T) => string | null;
  validateAll: () => boolean;
  handleChange: (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (field: keyof T) => () => void;
  reset: () => void;
  setSubmitting: (submitting: boolean) => void;
  getFieldProps: (field: keyof T) => {
    value: T[keyof T];
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onBlur: () => void;
    error: string | undefined;
    touched: boolean;
  };
}

// Common validation rules
export const validators = {
  required: (message = 'This field is required'): ValidationRule<unknown> => ({
    validate: (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    },
    message,
  }),

  email: (message = 'Please enter a valid email'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true; // Let required handle empty
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => !value || value.length >= min,
    message: message || `Must be at least ${min} characters`,
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => !value || value.length <= max,
    message: message || `Must be at most ${max} characters`,
  }),

  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule<string> => ({
    validate: (value) => !value || regex.test(value),
    message,
  }),

  min: (min: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value === undefined || value === null || value >= min,
    message: message || `Must be at least ${min}`,
  }),

  max: (max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value === undefined || value === null || value <= max,
    message: message || `Must be at most ${max}`,
  }),

  url: (message = 'Please enter a valid URL'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
  }),

  match: (fieldName: string, message?: string): ValidationRule<unknown> => ({
    validate: (value, allValues) => {
      if (!allValues) return true;
      return value === allValues[fieldName];
    },
    message: message || `Must match ${fieldName}`,
  }),

  custom: <T>(fn: (value: T, allValues?: Record<string, unknown>) => boolean, message: string): ValidationRule<T> => ({
    validate: fn,
    message,
  }),
};

export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  validations: Partial<FormFields<T>> = {}
): UseFormValidationReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouchedFields] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDirty = useMemo(() => {
    return Object.keys(values).some((key) => values[key as keyof T] !== initialValues[key as keyof T]);
  }, [values, initialValues]);

  const validateField = useCallback(
    (field: keyof T): string | null => {
      const fieldValidation = validations[field];
      if (!fieldValidation?.rules) return null;

      for (const rule of fieldValidation.rules) {
        const isValid = rule.validate(values[field], values as Record<string, unknown>);
        if (!isValid) {
          return rule.message;
        }
      }
      return null;
    },
    [values, validations]
  );

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));

    // Validate on change if configured
    const fieldValidation = validations[field];
    if (fieldValidation?.validateOnChange !== false) {
      const error = validateField(field);
      setErrors((prev) => ({ ...prev, [field]: error || undefined }));
    }
  }, [validations, validateField]);

  const setTouched = useCallback((field: keyof T) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));

    // Validate on blur if configured
    const fieldValidation = validations[field];
    if (fieldValidation?.validateOnBlur !== false) {
      const error = validateField(field);
      setErrors((prev) => ({ ...prev, [field]: error || undefined }));
    }
  }, [validations, validateField]);

  const setError = useCallback((field: keyof T, error: string | null) => {
    setErrors((prev) => ({ ...prev, [field]: error || undefined }));
  }, []);

  const validateAll = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    for (const field of Object.keys(validations) as Array<keyof T>) {
      const error = validateField(field);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {} as Partial<Record<keyof T, boolean>>
    );
    setTouchedFields(allTouched);

    return isValid;
  }, [validateField, validations, values]);

  const handleChange = useCallback(
    (field: keyof T) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { value, type } = e.target;
        const parsedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
        setValue(field, parsedValue as T[keyof T]);
      },
    [setValue]
  );

  const handleBlur = useCallback(
    (field: keyof T) => () => {
      setTouched(field);
    },
    [setTouched]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouchedFields({});
    setIsSubmitting(false);
  }, [initialValues]);

  const setSubmitting = useCallback((submitting: boolean) => {
    setIsSubmitting(submitting);
  }, []);

  const getFieldProps = useCallback(
    (field: keyof T) => ({
      value: values[field],
      onChange: handleChange(field),
      onBlur: handleBlur(field),
      error: touched[field] ? errors[field] : undefined,
      touched: !!touched[field],
    }),
    [values, errors, touched, handleChange, handleBlur]
  );

  const isValid = useMemo(() => {
    return Object.keys(errors).every((key) => !errors[key as keyof T]);
  }, [errors]);

  return {
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    isDirty,
    setValue,
    setTouched,
    setError,
    validateField,
    validateAll,
    handleChange,
    handleBlur,
    reset,
    setSubmitting,
    getFieldProps,
  };
}

export default useFormValidation;
