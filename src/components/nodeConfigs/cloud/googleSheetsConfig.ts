import { NodeConfigDefinition, validators } from '../../../types/nodeConfig';

export const googleSheetsConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'Authentication Method',
      field: 'authMethod',
      type: 'select',
      required: true,
      defaultValue: 'serviceAccount',
      options: [
        { value: 'serviceAccount', label: 'Service Account (JSON Key)' },
        { value: 'oauth2', label: 'OAuth2' },
        { value: 'apiKey', label: 'API Key (Read-only)' }
      ]
    },
    {
      label: 'Service Account Credentials',
      field: 'credentials',
      type: 'json',
      placeholder: '{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "...",\n  "client_email": "..."\n}',
      required: true,
      description: 'Paste your Google Service Account JSON key',
      validation: (value) => {
        if (!value) return 'Credentials are required';

        let jsonError: string | null = null;
        let creds: any = null;

        try {
          creds = typeof value === 'string' ? JSON.parse(value) : value;
        } catch (e) {
          jsonError = 'Invalid JSON format';
        }

        if (jsonError) return jsonError;

        try {
          if (!creds.type || !creds.project_id || !creds.private_key || !creds.client_email) {
            return 'Invalid service account credentials format';
          }
        } catch (e) {
          // Already validated as JSON
        }
        return null;
      }
    },
    {
      label: 'API Key',
      field: 'apiKey',
      type: 'password',
      placeholder: 'AIzaSy...',
      description: 'Google API Key (for read-only operations)'
    },
    {
      label: 'Spreadsheet ID',
      field: 'spreadsheetId',
      type: 'text',
      required: true,
      placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      description: 'The ID from the spreadsheet URL',
      validation: validators.required('Spreadsheet ID')
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      defaultValue: 'read',
      options: [
        { value: 'read', label: 'Read Data' },
        { value: 'write', label: 'Write Data' },
        { value: 'append', label: 'Append Rows' },
        { value: 'update', label: 'Update Cells' },
        { value: 'clear', label: 'Clear Range' },
        { value: 'batchUpdate', label: 'Batch Update' },
        { value: 'getSheetInfo', label: 'Get Sheet Info' },
        { value: 'createSheet', label: 'Create New Sheet' },
        { value: 'deleteSheet', label: 'Delete Sheet' },
        { value: 'duplicateSheet', label: 'Duplicate Sheet' }
      ]
    },
    {
      label: 'Sheet Name',
      field: 'sheetName',
      type: 'text',
      placeholder: 'Sheet1',
      defaultValue: 'Sheet1',
      description: 'Name of the sheet tab'
    },
    {
      label: 'Range',
      field: 'range',
      type: 'text',
      placeholder: 'A1:Z100',
      description: 'Cell range (e.g., A1:D10, A:A, 1:1)',
      validation: (value, config) => {
        const operation = config?.operation as string | undefined;
        if (!value && operation && ['read', 'write', 'update', 'clear'].includes(operation)) {
          return 'Range is required for this operation';
        }
        return null;
      }
    },
    {
      label: 'Data',
      field: 'data',
      type: 'json',
      placeholder: '[["Name", "Email"], ["John", "john@example.com"]]',
      description: 'Data to write/append (2D array)',
      validation: (value, config) => {
        const operation = config?.operation as string | undefined;
        if (!value && operation && ['write', 'append', 'update'].includes(operation)) {
          return 'Data is required for this operation';
        }
        if (value) {
          let jsonError: string | null = null;
          let data: any = null;

          try {
            data = typeof value === 'string' ? JSON.parse(value) : value;
          } catch (e) {
            jsonError = 'Invalid JSON format';
          }

          if (jsonError) return jsonError;

          try {
            if (!Array.isArray(data)) {
              return 'Data must be an array';
            }
          } catch (e) {
            // Already validated as JSON
          }
        }
        return null;
      }
    },
    {
      label: 'Value Input Option',
      field: 'valueInputOption',
      type: 'select',
      defaultValue: 'USER_ENTERED',
      options: [
        { value: 'USER_ENTERED', label: 'User Entered (Parse formulas)' },
        { value: 'RAW', label: 'Raw (Plain text)' }
      ],
      description: 'How to interpret input data'
    },
    {
      label: 'Value Render Option',
      field: 'valueRenderOption',
      type: 'select',
      defaultValue: 'FORMATTED_VALUE',
      options: [
        { value: 'FORMATTED_VALUE', label: 'Formatted Value' },
        { value: 'UNFORMATTED_VALUE', label: 'Unformatted Value' },
        { value: 'FORMULA', label: 'Formula' }
      ],
      description: 'How to return values when reading'
    },
    {
      label: 'Major Dimension',
      field: 'majorDimension',
      type: 'select',
      defaultValue: 'ROWS',
      options: [
        { value: 'ROWS', label: 'Rows' },
        { value: 'COLUMNS', label: 'Columns' }
      ],
      description: 'Whether data is row-major or column-major'
    },
    {
      label: 'Include Values in Response',
      field: 'includeValuesInResponse',
      type: 'checkbox',
      defaultValue: true,
      description: 'Include updated values in response'
    },
    {
      label: 'New Sheet Title',
      field: 'newSheetTitle',
      type: 'text',
      placeholder: 'New Sheet',
      description: 'Title for new sheet (create/duplicate operations)'
    },
    {
      label: 'Sheet ID to Delete',
      field: 'sheetId',
      type: 'number',
      placeholder: '0',
      description: 'Numeric ID of sheet to delete'
    },
    {
      label: 'Batch Requests',
      field: 'batchRequests',
      type: 'json',
      placeholder: '[{"updateCells": {...}}, {"mergeCells": {...}}]',
      description: 'Array of batch update requests',
      validation: (value, config) => {
        const operation = config?.operation as string | undefined;
        if (!value && operation === 'batchUpdate') {
          return 'Batch requests are required';
        }
        if (value) {
          return validators.json(value as string);
        }
        return null;
      }
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // Auth validation
    if (config.authMethod === 'serviceAccount' && !config.credentials) {
      errors.credentials = 'Service account credentials are required';
    }
    
    if (config.authMethod === 'apiKey' && !config.apiKey) {
      errors.apiKey = 'API key is required';
    }

    // Operation-specific validations
    const operation = config.operation as string | undefined;
    if (operation && ['read', 'write', 'update', 'clear'].includes(operation) && !config.range) {
      errors.range = 'Range is required for this operation';
    }

    if (operation && ['write', 'append', 'update'].includes(operation) && !config.data) {
      errors.data = 'Data is required for this operation';
    }

    if (config.operation === 'createSheet' && !config.newSheetTitle) {
      errors.newSheetTitle = 'Sheet title is required';
    }

    if (config.operation === 'deleteSheet' && !config.sheetId) {
      errors.sheetId = 'Sheet ID is required';
    }

    if (config.operation === 'batchUpdate' && !config.batchRequests) {
      errors.batchRequests = 'Batch requests are required';
    }

    // API key can only do read operations
    if (config.authMethod === 'apiKey' && config.operation !== 'read' && config.operation !== 'getSheetInfo') {
      errors.operation = 'API key authentication only supports read operations';
    }

    return errors;
  },

  transform: (config) => {
    // Parse JSON fields
    if (config.credentials && typeof config.credentials === 'string') {
      try {
        config.credentials = JSON.parse(config.credentials);
      } catch (e) {
        // Keep as string
      }
    }

    if (config.data && typeof config.data === 'string') {
      try {
        config.data = JSON.parse(config.data);
      } catch (e) {
        // Keep as string
      }
    }

    if (config.batchRequests && typeof config.batchRequests === 'string') {
      try {
        config.batchRequests = JSON.parse(config.batchRequests);
      } catch (e) {
        // Keep as string
      }
    }

    // Build full range with sheet name
    const range = config.range as string | undefined;
    const sheetName = config.sheetName as string | undefined;
    if (range && sheetName && !range.includes('!')) {
      config.fullRange = `${sheetName}!${range}`;
    } else {
      config.fullRange = range;
    }

    return config;
  },

  examples: [
    {
      label: 'Read Data',
      config: {
        authMethod: 'serviceAccount',
        credentials: '{"type": "service_account", ...}',
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        operation: 'read',
        sheetName: 'Sheet1',
        range: 'A1:D10',
        valueRenderOption: 'FORMATTED_VALUE'
      }
    },
    {
      label: 'Append Rows',
      config: {
        authMethod: 'serviceAccount',
        credentials: '{"type": "service_account", ...}',
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        operation: 'append',
        sheetName: 'Sheet1',
        range: 'A:D',
        data: '[["{{$json.name}}", "{{$json.email}}", "{{$json.phone}}", "{{$now}}"]]',
        valueInputOption: 'USER_ENTERED'
      }
    },
    {
      label: 'Update Range',
      config: {
        authMethod: 'serviceAccount',
        credentials: '{"type": "service_account", ...}',
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        operation: 'update',
        sheetName: 'Sheet1',
        range: 'A2:D2',
        data: '[["Updated Name", "updated@email.com", "123-456-7890", "=NOW()"]]',
        valueInputOption: 'USER_ENTERED'
      }
    },
    {
      label: 'Batch Import',
      config: {
        authMethod: 'serviceAccount',
        credentials: '{"type": "service_account", ...}',
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        operation: 'write',
        sheetName: 'ImportedData',
        range: 'A1',
        data: '{{$json.csvData}}',
        valueInputOption: 'RAW'
      }
    },
    {
      label: 'Create New Sheet',
      config: {
        authMethod: 'serviceAccount',
        credentials: '{"type": "service_account", ...}',
        spreadsheetId: 'YOUR_SPREADSHEET_ID',
        operation: 'createSheet',
        newSheetTitle: 'Report {{$json.date}}'
      }
    },
    {
      label: 'Get Sheet Info (Public)',
      config: {
        authMethod: 'apiKey',
        apiKey: 'YOUR_API_KEY',
        spreadsheetId: 'PUBLIC_SPREADSHEET_ID',
        operation: 'getSheetInfo'
      }
    }
  ]
};