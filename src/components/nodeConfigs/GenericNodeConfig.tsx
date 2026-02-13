import React, { useState, useEffect } from 'react';
import { NodeConfigDefinition, ValidationResult } from '../../types/nodeConfig';
import { BaseConfigField } from './BaseConfigField';
import { AlertCircle, Sparkles } from 'lucide-react';
import { logger } from '../../services/SimpleLogger';

interface GenericNodeConfigProps {
  nodeType: string;
  config: Record<string, any>;
  configDefinition: NodeConfigDefinition;
  updateNodeConfig: (field: string, value: unknown) => void;
  darkMode: boolean;
  nodeId: string;
}

export const GenericNodeConfig: React.FC<GenericNodeConfigProps> = ({
  nodeType,
  config,
  configDefinition,
  updateNodeConfig,
  darkMode,
  nodeId
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showExamples, setShowExamples] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Validate individual field
  const validateField = (fieldConfig: any, value: any): string | null => {
    if (!fieldConfig) return null;

    if (fieldConfig.validation) {
      return fieldConfig.validation(value);
    }

    if (fieldConfig.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `${fieldConfig.label} is required`;
    }

    return null;
  };

  // Validate all fields
  const validateAllFields = () => {
    const newErrors: Record<string, string> = {};

    // Field-level validation
    configDefinition.fields.forEach(field => {
      const error = validateField(field, config[field.field]);
      if (error) {
        newErrors[field.field] = error;
      }
    });

    // Custom validation function
    if (configDefinition.validate) {
      const customErrors = configDefinition.validate(config);
      Object.assign(newErrors, customErrors);
    }

    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    };
  };

  // Update field with validation
  const handleFieldChange = (field: string, value: any) => {
    updateNodeConfig(field, value);

    // Clear error when user starts typing
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }

    // Validate on change for better UX
    const fieldConfig = configDefinition.fields.find(f => f.field === field);
    const error = validateField(fieldConfig, value);
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  // Apply example configuration
  const applyExample = (example: Record<string, any>) => {
    Object.entries(example).forEach(([field, value]) => {
      updateNodeConfig(field, value);
    });
    setShowExamples(false);
    setErrors({}); // Clear errors when applying example
  };

  // Test node configuration
  const testNodeConfiguration = async (nodeId: string, config: Record<string, any>) => {
    // This is a placeholder - actual implementation would test the node
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 1000);
    });
  };

  return (
    <div className="space-y-4">
      {/* Examples section */}
      {configDefinition.examples && configDefinition.examples.length > 0 && (
        <div className={`p-3 rounded-lg ${
          darkMode ? 'bg-gray-800' : 'bg-gray-50'
        } border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={() => setShowExamples(!showExamples)}
            className="flex items-center justify-between w-full text-sm font-medium"
          >
            <span className="flex items-center">
              <Sparkles size={16} className="mr-2 text-yellow-500" />
              Quick Examples
            </span>
            <span>{showExamples ? '−' : '+'}</span>
          </button>
          
          {showExamples && (
            <div className="mt-3 space-y-2">
              {configDefinition.examples.map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => applyExample(example.config)}
                  className={`w-full text-left p-2 rounded text-sm ${
                    darkMode
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-white hover:bg-gray-100'
                  } transition-colors`}
                >
                  {example.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Configuration fields */}
      {configDefinition.fields.map((fieldConfig) => (
        <BaseConfigField
          key={fieldConfig.field}
          config={fieldConfig}
          value={config[fieldConfig.field]}
          onChange={handleFieldChange}
          error={errors[fieldConfig.field]}
          darkMode={darkMode}
          nodeId={nodeId}
        />
      ))}

      {/* Validation summary */}
      {Object.keys(errors).length > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start">
            <AlertCircle size={16} className="text-red-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-red-600 dark:text-red-400">
              <p className="font-medium mb-1">Please fix the following errors:</p>
              <ul className="list-disc list-inside space-y-1">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Test configuration button */}
      <button
        onClick={() => {
          const validation = validateAllFields();
          setErrors(validation.errors);
          if (validation.isValid) {
            const handleTest = async () => {
              setTesting(true);
              try {
                // Test node configuration
                const result = await testNodeConfiguration(nodeId, config);
                setTestResult(result);
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                setTestResult({ success: false, error: errorMessage });
              } finally {
                setTesting(false);
              }
            };
            handleTest();
            logger.debug('Configuration is valid:', config);
          }
        }}
        className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
          darkMode
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
        disabled={testing}
      >
        {testing ? 'Testing...' : 'Test Configuration'}
      </button>
    </div>
  );
};