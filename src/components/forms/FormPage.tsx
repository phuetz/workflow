/**
 * FormPage Component
 * Renders a single page of a multi-page form
 */

import React from 'react';
import { FormField } from './FormField';
import type { FormPage as FormPageType, FormField as FormFieldType } from '@/types/forms';

interface FormPageProps {
  page: FormPageType;
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (fieldName: string, value: unknown) => void;
  disabled?: boolean;
}

export const FormPage: React.FC<FormPageProps> = ({
  page,
  values,
  errors,
  onChange,
  disabled = false,
}) => {
  // Check if a field should be displayed based on conditional logic
  const shouldDisplayField = (field: FormFieldType): boolean => {
    if (!field.conditionalDisplay) {
      return true;
    }

    const { field: conditionField, operator, value: conditionValue } = field.conditionalDisplay;
    const fieldValue = values[conditionField];

    switch (operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'notEquals':
        return fieldValue !== conditionValue;
      case 'contains':
        return String(fieldValue).includes(String(conditionValue));
      case 'notContains':
        return !String(fieldValue).includes(String(conditionValue));
      case 'greaterThan':
        return Number(fieldValue) > Number(conditionValue);
      case 'lessThan':
        return Number(fieldValue) < Number(conditionValue);
      default:
        return true;
    }
  };

  // Group fields by row based on width
  const groupFieldsByRow = (fields: FormFieldType[]) => {
    const rows: FormFieldType[][] = [];
    let currentRow: FormFieldType[] = [];
    let currentRowWidth = 0;

    fields.forEach((field) => {
      if (!shouldDisplayField(field)) {
        return;
      }

      const fieldWidth = field.width === 'half' ? 0.5 : field.width === 'third' ? 0.33 : 1;

      if (currentRowWidth + fieldWidth > 1) {
        if (currentRow.length > 0) {
          rows.push(currentRow);
        }
        currentRow = [field];
        currentRowWidth = fieldWidth;
      } else {
        currentRow.push(field);
        currentRowWidth += fieldWidth;
      }
    });

    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return rows;
  };

  const fieldRows = groupFieldsByRow(page.fields);

  return (
    <div className="form-page">
      {/* Page Header */}
      {(page.title || page.description) && (
        <div className="mb-6">
          {page.title && (
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{page.title}</h2>
          )}
          {page.description && (
            <p className="text-gray-600">{page.description}</p>
          )}
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-4">
        {fieldRows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex flex-wrap gap-4">
            {row.map((field) => (
              <FormField
                key={field.id}
                field={field}
                value={values[field.name]}
                onChange={(value) => onChange(field.name, value)}
                error={errors[field.name]}
                disabled={disabled}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FormPage;
