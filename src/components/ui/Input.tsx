/**
 * Unified Input Component
 * Accessible form input with validation states
 * Fixes P0-A11Y-003 and P1-FORM issues
 */

import React, { forwardRef, useId } from 'react';
import { AlertCircle, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: string;
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  showPasswordToggle?: boolean;
  fullWidth?: boolean;
}

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      success,
      size = 'md',
      leftIcon,
      rightIcon,
      loading = false,
      showPasswordToggle = false,
      fullWidth = true,
      disabled,
      required,
      type = 'text',
      className = '',
      id: providedId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = providedId || generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;
    const successId = `${inputId}-success`;

    const [showPassword, setShowPassword] = React.useState(false);
    const inputType = type === 'password' && showPassword ? 'text' : type;

    const hasError = !!error;
    const hasSuccess = !!success && !hasError;
    const isDisabled = disabled || loading;

    // Determine aria-describedby
    const describedBy = [
      helperText && !hasError && !hasSuccess ? helperId : null,
      hasError ? errorId : null,
      hasSuccess ? successId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    const getBorderColor = () => {
      if (hasError) return 'border-red-500 focus:ring-red-500 focus:border-red-500';
      if (hasSuccess) return 'border-green-500 focus:ring-green-500 focus:border-green-500';
      return 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600';
    };

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}

          {/* Input field */}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            disabled={isDisabled}
            required={required}
            aria-required={required}
            aria-invalid={hasError}
            aria-describedby={describedBy}
            className={`
              block rounded-lg border bg-white dark:bg-gray-800
              text-gray-900 dark:text-white
              placeholder-gray-400 dark:placeholder-gray-500
              transition-colors duration-200
              focus:outline-none focus:ring-2
              disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50
              ${sizeStyles[size]}
              ${getBorderColor()}
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon || loading || showPasswordToggle || hasError || hasSuccess ? 'pr-10' : ''}
              ${fullWidth ? 'w-full' : ''}
              ${className}
            `.trim().replace(/\s+/g, ' ')}
            {...props}
          />

          {/* Right side icons */}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
            {loading && (
              <Loader2
                className="w-4 h-4 text-gray-400 animate-spin"
                aria-hidden="true"
              />
            )}
            {!loading && hasError && (
              <AlertCircle
                className="w-4 h-4 text-red-500"
                aria-hidden="true"
              />
            )}
            {!loading && hasSuccess && (
              <CheckCircle
                className="w-4 h-4 text-green-500"
                aria-hidden="true"
              />
            )}
            {!loading && showPasswordToggle && type === 'password' && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            )}
            {!loading && !hasError && !hasSuccess && !showPasswordToggle && rightIcon && (
              <span className="text-gray-400">{rightIcon}</span>
            )}
          </div>
        </div>

        {/* Helper text / Error / Success messages */}
        {helperText && !hasError && !hasSuccess && (
          <p
            id={helperId}
            className="mt-1.5 text-xs text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}
        {hasError && (
          <p
            id={errorId}
            className="mt-1.5 text-xs text-red-600 dark:text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}
        {hasSuccess && (
          <p
            id={successId}
            className="mt-1.5 text-xs text-green-600 dark:text-green-400"
          >
            {success}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
