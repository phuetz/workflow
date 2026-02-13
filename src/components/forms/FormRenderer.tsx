/**
 * FormRenderer Component
 * Main component for rendering interactive forms with multi-page support
 */

import React, { useState, useCallback, useMemo } from 'react';
import { FormPage } from './FormPage';
import type {
  FormTriggerConfig,
  FormField,
  FormValidationResult,
  FormSubmission,
} from '@/types/forms';

interface FormRendererProps {
  config: FormTriggerConfig;
  onSubmit: (data: Record<string, unknown>, files: File[]) => Promise<void>;
  onPageChange?: (pageIndex: number) => void;
  className?: string;
}

export const FormRenderer: React.FC<FormRendererProps> = ({
  config,
  onSubmit,
  onPageChange,
  className = '',
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    // Initialize with default values
    const defaults: Record<string, unknown> = {};
    config.pages.forEach((page) => {
      page.fields.forEach((field) => {
        if (field.defaultValue !== undefined) {
          defaults[field.name] = field.defaultValue;
        }
      });
    });
    return defaults;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const totalPages = config.pages.length;
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === totalPages - 1;
  const currentPageData = config.pages[currentPage];

  // Validate a single field
  const validateField = useCallback((field: FormField, value: unknown): string | null => {
    const validation = field.validation;
    if (!validation) return null;

    // Required check
    if (validation.required) {
      if (value === undefined || value === null || value === '') {
        return `${field.label} is required`;
      }
      if (Array.isArray(value) && value.length === 0) {
        return `${field.label} is required`;
      }
    }

    // Skip other validations if empty and not required
    if (value === undefined || value === null || value === '') {
      return null;
    }

    // String validations
    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        return `${field.label} must be at least ${validation.minLength} characters`;
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        return `${field.label} must be at most ${validation.maxLength} characters`;
      }
      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          return validation.patternMessage || `${field.label} format is invalid`;
        }
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        return `${field.label} must be at least ${validation.min}`;
      }
      if (validation.max !== undefined && value > validation.max) {
        return `${field.label} must be at most ${validation.max}`;
      }
    }

    // File validations
    if (field.type === 'file' && value) {
      const files = Array.isArray(value) ? value : [value];
      for (const file of files as File[]) {
        if (field.maxFileSize && file.size > field.maxFileSize * 1024 * 1024) {
          return `File size must be less than ${field.maxFileSize}MB`;
        }
        if (field.acceptedFileTypes && field.acceptedFileTypes.length > 0) {
          const ext = '.' + file.name.split('.').pop()?.toLowerCase();
          const mimeType = file.type;
          const isAccepted = field.acceptedFileTypes.some(
            (type) => type === ext || type === mimeType || mimeType.startsWith(type.replace('/*', '/'))
          );
          if (!isAccepted) {
            return `File type not accepted. Allowed: ${field.acceptedFileTypes.join(', ')}`;
          }
        }
      }
    }

    return null;
  }, []);

  // Validate current page
  const validateCurrentPage = useCallback((): FormValidationResult => {
    const pageErrors: Record<string, string> = {};
    let isValid = true;

    currentPageData.fields.forEach((field) => {
      const error = validateField(field, values[field.name]);
      if (error) {
        pageErrors[field.name] = error;
        isValid = false;
      }
    });

    return { isValid, errors: pageErrors };
  }, [currentPageData, values, validateField]);

  // Validate all pages
  const validateAllPages = useCallback((): FormValidationResult => {
    const allErrors: Record<string, string> = {};
    let isValid = true;

    config.pages.forEach((page) => {
      page.fields.forEach((field) => {
        const error = validateField(field, values[field.name]);
        if (error) {
          allErrors[field.name] = error;
          isValid = false;
        }
      });
    });

    return { isValid, errors: allErrors };
  }, [config.pages, values, validateField]);

  // Handle field change
  const handleFieldChange = useCallback((fieldName: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
    // Clear error when field changes
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  // Handle next page
  const handleNext = useCallback(() => {
    const validation = validateCurrentPage();
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    if (!isLastPage) {
      setCurrentPage((prev) => prev + 1);
      onPageChange?.(currentPage + 1);
    }
  }, [currentPage, isLastPage, validateCurrentPage, onPageChange]);

  // Handle previous page
  const handlePrevious = useCallback(() => {
    if (!isFirstPage) {
      setCurrentPage((prev) => prev - 1);
      onPageChange?.(currentPage - 1);
    }
  }, [currentPage, isFirstPage, onPageChange]);

  // Handle form submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateAllPages();
    if (!validation.isValid) {
      setErrors(validation.errors);
      // Go to first page with error
      for (let i = 0; i < config.pages.length; i++) {
        const pageHasError = config.pages[i].fields.some(
          (field) => validation.errors[field.name]
        );
        if (pageHasError) {
          setCurrentPage(i);
          break;
        }
      }
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Extract files from values
      const files: File[] = [];
      const dataWithoutFiles: Record<string, unknown> = {};

      Object.entries(values).forEach(([key, value]) => {
        if (value instanceof File) {
          files.push(value);
          dataWithoutFiles[key] = value.name;
        } else if (Array.isArray(value) && value[0] instanceof File) {
          files.push(...value);
          dataWithoutFiles[key] = value.map((f) => f.name);
        } else {
          dataWithoutFiles[key] = value;
        }
      });

      await onSubmit(dataWithoutFiles, files);
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateAllPages, config.pages, onSubmit]);

  // Progress percentage
  const progress = useMemo(() => {
    return ((currentPage + 1) / totalPages) * 100;
  }, [currentPage, totalPages]);

  // Custom styles from config
  const customStyles = useMemo(() => ({
    '--form-primary-color': config.style?.primaryColor || '#3B82F6',
    '--form-bg-color': config.style?.backgroundColor || '#FFFFFF',
    '--form-border-radius': config.style?.borderRadius || '8px',
    '--form-font-family': config.style?.fontFamily || 'system-ui, sans-serif',
  } as React.CSSProperties), [config.style]);

  // Render success message
  if (isSubmitted) {
    return (
      <div
        className={`form-renderer-success p-8 text-center ${className}`}
        style={customStyles}
      >
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {config.successMessage || 'Thank you!'}
        </h2>
        <p className="text-gray-600">Your submission has been received.</p>
        {config.redirectUrl && (
          <a
            href={config.redirectUrl}
            className="inline-block mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Continue
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      className={`form-renderer bg-white rounded-lg shadow-lg overflow-hidden ${className}`}
      style={customStyles}
    >
      {/* Header */}
      {(config.title || config.style?.logoUrl) && (
        <div className="px-8 py-6 border-b border-gray-200">
          {config.style?.logoUrl && (
            <img
              src={config.style.logoUrl}
              alt="Logo"
              className="h-10 mb-4"
            />
          )}
          {config.title && (
            <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
          )}
          {config.description && (
            <p className="mt-2 text-gray-600">{config.description}</p>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {config.style?.showProgressBar && totalPages > 1 && (
        <div className="px-8 pt-4">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>Step {currentPage + 1} of {totalPages}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-8">
        <FormPage
          page={currentPageData}
          values={values}
          errors={errors}
          onChange={handleFieldChange}
          disabled={isSubmitting}
        />

        {/* Submit Error */}
        {submitError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {submitError}
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          {!isFirstPage ? (
            <button
              type="button"
              onClick={handlePrevious}
              disabled={isSubmitting}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Previous
            </button>
          ) : (
            <div />
          )}

          {isLastPage ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {config.submitButton.loadingText || 'Submitting...'}
                </>
              ) : (
                config.submitButton.text
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="px-8 py-3 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              Next
            </button>
          )}
        </div>
      </form>

      {/* Custom CSS */}
      {config.style?.customCss && (
        <style>{config.style.customCss}</style>
      )}
    </div>
  );
};

export default FormRenderer;
