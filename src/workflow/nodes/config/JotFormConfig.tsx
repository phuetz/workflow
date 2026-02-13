import React, { useState, useCallback } from 'react';
import { WorkflowNode } from '../../../types/workflow';

interface JotFormConfigProps {
  node: WorkflowNode;
  onChange: (config: Record<string, unknown>) => void;
}

interface JotFormConfig {
  operation:
    | 'getFormSubmissions'
    | 'getSubmission'
    | 'getForm'
    | 'getForms'
    | 'createSubmission'
    | 'deleteSubmission'
    | 'getFormQuestions'
    | 'getFormProperties';

  // Authentication
  apiKey: string;

  // Form ID
  formId?: string;

  // Submission ID
  submissionId?: string;

  // Filter options (for getFormSubmissions)
  limit?: number;
  offset?: number;
  filter?: string; // JSON format filters
  orderBy?: string; // field name to order by
  direction?: 'ASC' | 'DESC';

  // Create submission data
  submissionData?: Record<string, unknown>;
}

export const JotFormConfig: React.FC<JotFormConfigProps> = ({ node, onChange }) => {
  const [config, setConfig] = useState<JotFormConfig>(
    (node.data.config as unknown as JotFormConfig) || {
      operation: 'getFormSubmissions',
      apiKey: '',
      limit: 20,
      offset: 0,
      direction: 'DESC',
    }
  );

  const handleChange = useCallback((updates: Partial<JotFormConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange(newConfig);
  }, [config, onChange]);

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto">
      <div>
        <h3 className="text-lg font-semibold mb-2">JotForm Integration</h3>
        <p className="text-sm text-gray-600 mb-4">
          Access form submissions and manage forms
        </p>
      </div>

      {/* Operation Selection */}
      <div>
        <label className="block text-sm font-medium mb-1">Operation</label>
        <select
          className="w-full p-2 border rounded"
          value={config.operation}
          onChange={(e) => handleChange({ operation: e.target.value as JotFormConfig['operation'] })}
        >
          <optgroup label="Submissions">
            <option value="getFormSubmissions">Get Form Submissions</option>
            <option value="getSubmission">Get Single Submission</option>
            <option value="createSubmission">Create Submission</option>
            <option value="deleteSubmission">Delete Submission</option>
          </optgroup>
          <optgroup label="Forms">
            <option value="getForms">Get All Forms</option>
            <option value="getForm">Get Single Form</option>
            <option value="getFormQuestions">Get Form Questions</option>
            <option value="getFormProperties">Get Form Properties</option>
          </optgroup>
        </select>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-sm font-medium mb-1">API Key *</label>
        <input
          type="password"
          className="w-full p-2 border rounded text-sm"
          value={config.apiKey}
          onChange={(e) => handleChange({ apiKey: e.target.value })}
          placeholder="Your JotForm API Key"
        />
        <p className="text-xs text-gray-500 mt-1">
          Get your API key from <a href="https://www.jotform.com/myaccount/api" target="_blank" rel="noopener noreferrer" className="text-blue-500">JotForm API Settings</a>
        </p>
      </div>

      {/* Form ID (for most operations) */}
      {['getFormSubmissions', 'getForm', 'createSubmission', 'getFormQuestions', 'getFormProperties'].includes(config.operation) && (
        <div>
          <label className="block text-sm font-medium mb-1">Form ID *</label>
          <input
            type="text"
            className="w-full p-2 border rounded text-sm"
            value={config.formId || ''}
            onChange={(e) => handleChange({ formId: e.target.value })}
            placeholder="230987654321234"
          />
          <p className="text-xs text-gray-500 mt-1">
            Find form ID in your form URL: jotform.com/form/<strong>230987654321234</strong>
          </p>
        </div>
      )}

      {/* Submission ID (for get/delete single submission) */}
      {['getSubmission', 'deleteSubmission'].includes(config.operation) && (
        <div>
          <label className="block text-sm font-medium mb-1">Submission ID *</label>
          <input
            type="text"
            className="w-full p-2 border rounded text-sm"
            value={config.submissionId || ''}
            onChange={(e) => handleChange({ submissionId: e.target.value })}
            placeholder="5567890123456789"
          />
        </div>
      )}

      {/* Get Form Submissions - Filter Options */}
      {config.operation === 'getFormSubmissions' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium">Filter & Pagination</h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1">Limit</label>
              <input
                type="number"
                min="1"
                max="1000"
                className="w-full p-2 border rounded text-sm"
                value={config.limit || 20}
                onChange={(e) => handleChange({ limit: parseInt(e.target.value) || 20 })}
              />
              <p className="text-xs text-gray-500 mt-1">Max 1000 submissions per request</p>
            </div>

            <div>
              <label className="block text-xs mb-1">Offset</label>
              <input
                type="number"
                min="0"
                className="w-full p-2 border rounded text-sm"
                value={config.offset || 0}
                onChange={(e) => handleChange({ offset: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-gray-500 mt-1">Skip N submissions</p>
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1">Filter (JSON)</label>
            <textarea
              className="w-full p-2 border rounded text-sm font-mono"
              rows={4}
              value={config.filter || ''}
              onChange={(e) => handleChange({ filter: e.target.value })}
              placeholder={'{\n  "created_at:gt": "2025-01-01 00:00:00",\n  "status": "ACTIVE"\n}'}
            />
            <p className="text-xs text-gray-500 mt-1">
              Filter submissions by field values. Operators: :gt, :lt, :contains, :starts_with, :ends_with
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1">Order By Field</label>
              <input
                type="text"
                className="w-full p-2 border rounded text-sm"
                value={config.orderBy || ''}
                onChange={(e) => handleChange({ orderBy: e.target.value })}
                placeholder="created_at"
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Direction</label>
              <select
                className="w-full p-2 border rounded text-sm"
                value={config.direction || 'DESC'}
                onChange={(e) => handleChange({ direction: e.target.value as 'ASC' | 'DESC' })}
              >
                <option value="ASC">Ascending (oldest first)</option>
                <option value="DESC">Descending (newest first)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Create Submission - Data */}
      {config.operation === 'createSubmission' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium">Submission Data</h4>

          <div>
            <label className="block text-xs mb-1">Submission Data (JSON) *</label>
            <textarea
              className="w-full p-2 border rounded text-sm font-mono"
              rows={12}
              value={JSON.stringify(config.submissionData || {}, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleChange({ submissionData: parsed });
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              placeholder={'{\n  "submission": {\n    "1": "John Doe",\n    "2": "john@example.com",\n    "3": "+1234567890",\n    "4": "This is a message"\n  }\n}'}
            />
            <p className="text-xs text-gray-500 mt-1">
              Map question IDs to their values. Get question IDs from "Get Form Questions" operation.
            </p>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 text-xs">
            <strong>💡 Tip:</strong> Use "Get Form Questions" first to see all question IDs and types for your form.
          </div>
        </div>
      )}

      {/* Get Forms - Pagination */}
      {config.operation === 'getForms' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium">Pagination</h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1">Limit</label>
              <input
                type="number"
                min="1"
                max="1000"
                className="w-full p-2 border rounded text-sm"
                value={config.limit || 20}
                onChange={(e) => handleChange({ limit: parseInt(e.target.value) || 20 })}
              />
            </div>

            <div>
              <label className="block text-xs mb-1">Offset</label>
              <input
                type="number"
                min="0"
                className="w-full p-2 border rounded text-sm"
                value={config.offset || 0}
                onChange={(e) => handleChange({ offset: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Examples Section */}
      <div className="border-t pt-4">
        <details className="cursor-pointer">
          <summary className="text-sm font-medium mb-2">📚 Examples</summary>
          <div className="mt-2 space-y-3 text-xs">
            <div>
              <strong>Example 1: Get recent submissions</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`Operation: Get Form Submissions
Form ID: 230987654321234
Limit: 50
Order By: created_at
Direction: DESC`}
              </pre>
            </div>

            <div>
              <strong>Example 2: Filter submissions by date</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`Filter JSON:
{
  "created_at:gt": "2025-10-01 00:00:00",
  "created_at:lt": "2025-10-31 23:59:59"
}`}
              </pre>
            </div>

            <div>
              <strong>Example 3: Create submission programmatically</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`Submission Data:
{
  "submission": {
    "1": "John Doe",          // Question 1: Name
    "2": "john@example.com",  // Question 2: Email
    "3": "+1234567890",       // Question 3: Phone
    "4": {                    // Question 4: Address
      "addr_line1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postal": "10001"
    }
  }
}`}
              </pre>
            </div>

            <div>
              <strong>Example 4: Filter by field value</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
{`Filter JSON:
{
  "2:contains": "@gmail.com",    // Email contains @gmail.com
  "status": "ACTIVE"             // Only active submissions
}`}
              </pre>
            </div>
          </div>
        </details>
      </div>

      {/* API Response Info */}
      <div className="border-t pt-4">
        <details className="cursor-pointer">
          <summary className="text-sm font-medium mb-2">🔍 Response Format</summary>
          <div className="mt-2 space-y-2 text-xs">
            <p><strong>Get Form Submissions:</strong> Returns array of submission objects with answers</p>
            <p><strong>Get Submission:</strong> Returns single submission with all field values</p>
            <p><strong>Get Form Questions:</strong> Returns array of questions with IDs, types, and labels</p>
            <p><strong>Get Form Properties:</strong> Returns form title, status, count, created_at, etc.</p>

            <div className="bg-gray-100 p-2 rounded mt-2">
              <strong>Typical submission structure:</strong>
              <pre className="mt-1 overflow-x-auto">
{`{
  "id": "5567890123456789",
  "form_id": "230987654321234",
  "ip": "192.168.1.1",
  "created_at": "2025-10-05 12:34:56",
  "status": "ACTIVE",
  "answers": {
    "1": { "text": "John Doe", "answer": "John Doe" },
    "2": { "text": "john@example.com", "answer": "john@example.com" }
  }
}`}
              </pre>
            </div>
          </div>
        </details>
      </div>

      {/* Documentation */}
      <div className="text-xs text-gray-500 mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
        <strong>📚 JotForm API:</strong> This integration uses the JotForm API v1.
        Rate limit: 1000 requests per day for free accounts, 10,000 for paid accounts.
      </div>
    </div>
  );
};
