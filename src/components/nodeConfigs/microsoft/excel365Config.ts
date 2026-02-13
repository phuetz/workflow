import { NodeConfigDefinition } from '../types';

export const excel365Config: NodeConfigDefinition = {
  fields: [
    // Authentication Configuration
    {
      label: 'Authentication Method',
      field: 'authMethod',
      type: 'select',
      options: [
        { value: 'oauth', label: 'OAuth 2.0 (Recommended)' },
        { value: 'app_password', label: 'Application Password' },
        { value: 'service_principal', label: 'Service Principal' }
      ],
      required: true,
      defaultValue: 'oauth'
    },
    {
      label: 'Tenant ID',
      field: 'tenantId',
      type: 'text',
      placeholder: 'your-tenant-id',
      required: true,
      validation: (value) => {
        if (!value) return 'Tenant ID is required';
        if (typeof value !== 'string' || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)) {
          return 'Invalid tenant ID format';
        }
        return null;
      }
    },
    {
      label: 'Client ID',
      field: 'clientId',
      type: 'text',
      placeholder: 'your-client-id',
      required: true,
      validation: (value) => {
        if (!value) return 'Client ID is required';
        if (typeof value !== 'string' || !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)) {
          return 'Invalid client ID format';
        }
        return null;
      }
    },
    {
      label: 'Client Secret',
      field: 'clientSecret',
      type: 'password',
      placeholder: 'your-client-secret',
      required: function() { return this.authMethod !== 'oauth'; },
      validation: (value, config) => {
        if (config?.authMethod !== 'oauth' && !value) {
          return 'Client secret is required for this authentication method';
        }
        return null;
      }
    },
    {
      label: 'Access Token',
      field: 'accessToken',
      type: 'password',
      placeholder: 'OAuth access token',
      required: function() { return this.authMethod === 'oauth'; },
      validation: (value, config) => {
        if (config?.authMethod === 'oauth' && !value) {
          return 'Access token is required for OAuth authentication';
        }
        return null;
      }
    },

    // Operation Configuration
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      options: [
        // Workbook Operations
        { value: 'get_workbook', label: 'Get Workbook' },
        { value: 'list_workbooks', label: 'List Workbooks' },
        { value: 'create_workbook', label: 'Create Workbook' },
        { value: 'delete_workbook', label: 'Delete Workbook' },
        { value: 'copy_workbook', label: 'Copy Workbook' },
        
        // Worksheet Operations
        { value: 'get_worksheet', label: 'Get Worksheet' },
        { value: 'list_worksheets', label: 'List Worksheets' },
        { value: 'create_worksheet', label: 'Create Worksheet' },
        { value: 'delete_worksheet', label: 'Delete Worksheet' },
        { value: 'rename_worksheet', label: 'Rename Worksheet' },
        
        // Cell Operations
        { value: 'get_cell_value', label: 'Get Cell Value' },
        { value: 'set_cell_value', label: 'Set Cell Value' },
        { value: 'get_range_values', label: 'Get Range Values' },
        { value: 'set_range_values', label: 'Set Range Values' },
        { value: 'clear_range', label: 'Clear Range' },
        { value: 'insert_rows', label: 'Insert Rows' },
        { value: 'insert_columns', label: 'Insert Columns' },
        { value: 'delete_rows', label: 'Delete Rows' },
        { value: 'delete_columns', label: 'Delete Columns' },
        
        // Table Operations
        { value: 'create_table', label: 'Create Table' },
        { value: 'get_table', label: 'Get Table' },
        { value: 'list_tables', label: 'List Tables' },
        { value: 'add_table_row', label: 'Add Table Row' },
        { value: 'update_table_row', label: 'Update Table Row' },
        { value: 'delete_table_row', label: 'Delete Table Row' },
        { value: 'sort_table', label: 'Sort Table' },
        { value: 'filter_table', label: 'Filter Table' },
        
        // Chart Operations
        { value: 'create_chart', label: 'Create Chart' },
        { value: 'get_chart', label: 'Get Chart' },
        { value: 'list_charts', label: 'List Charts' },
        { value: 'update_chart', label: 'Update Chart' },
        { value: 'delete_chart', label: 'Delete Chart' },
        
        // Formula Operations
        { value: 'calculate_formula', label: 'Calculate Formula' },
        { value: 'add_named_range', label: 'Add Named Range' },
        { value: 'get_named_range', label: 'Get Named Range' },
        { value: 'list_named_ranges', label: 'List Named Ranges' },
        
        // Format Operations
        { value: 'format_cells', label: 'Format Cells' },
        { value: 'set_cell_format', label: 'Set Cell Format' },
        { value: 'apply_conditional_formatting', label: 'Apply Conditional Formatting' },
        
        // Data Operations
        { value: 'import_csv', label: 'Import CSV Data' },
        { value: 'export_csv', label: 'Export to CSV' },
        { value: 'pivot_table', label: 'Create Pivot Table' },
        { value: 'data_validation', label: 'Add Data Validation' }
      ],
      required: true
    },

    // File/Workbook Identification
    {
      label: 'Workbook ID or Path',
      field: 'workbookId',
      type: 'text',
      placeholder: 'workbook-id or /path/to/file.xlsx',
      required: function() {
        return !['list_workbooks', 'create_workbook'].includes(this.operation);
      },
      validation: (value, config) => {
        const operation = config?.operation;
        if (typeof operation === 'string' && !['list_workbooks', 'create_workbook'].includes(operation) && !value) {
          return 'Workbook ID or path is required for this operation';
        }
        return null;
      }
    },
    {
      label: 'Worksheet Name',
      field: 'worksheetName',
      type: 'text',
      placeholder: 'Sheet1',
      required: function() { 
        return ['get_worksheet', 'create_worksheet', 'delete_worksheet', 'rename_worksheet', 
                'get_cell_value', 'set_cell_value', 'get_range_values', 'set_range_values',
                'clear_range', 'insert_rows', 'insert_columns', 'delete_rows', 'delete_columns',
                'create_table', 'create_chart', 'format_cells'].includes(this.operation);
      }
    },

    // Cell/Range Configuration
    {
      label: 'Cell Address or Range',
      field: 'cellRange',
      type: 'text',
      placeholder: 'A1 or A1:B10',
      required: function() {
        return ['get_cell_value', 'set_cell_value', 'get_range_values', 'set_range_values',
                'clear_range', 'format_cells', 'apply_conditional_formatting'].includes(this.operation);
      },
      validation: (value, config) => {
        const operation = config?.operation;
        if (typeof operation === 'string' && ['get_cell_value', 'set_cell_value', 'get_range_values', 'set_range_values',
             'clear_range', 'format_cells'].includes(operation) && !value) {
          return 'Cell address or range is required for this operation';
        }
        if (value && typeof value === 'string' && !/^[A-Z]+[0-9]+(:[A-Z]+[0-9]+)?$/.test(value)) {
          return 'Invalid cell range format (use A1 or A1:B10)';
        }
        return null;
      }
    },

    // Value Configuration
    {
      label: 'Cell Value',
      field: 'cellValue',
      type: 'text',
      placeholder: 'Value to set',
      required: function() { 
        return this.operation === 'set_cell_value';
      }
    },
    {
      label: 'Range Values (JSON Array)',
      field: 'rangeValues',
      type: 'textarea',
      placeholder: '[["A1", "B1"], ["A2", "B2"]]',
      required: function() { 
        return this.operation === 'set_range_values';
      },
      validation: (value, config) => {
        if (config?.operation === 'set_range_values' && value) {
          try {
            const parsed = JSON.parse(typeof value === 'string' ? value : JSON.stringify(value));
            if (!Array.isArray(parsed)) {
              return 'Range values must be a JSON array';
            }
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },

    // Table Configuration
    {
      label: 'Table Name',
      field: 'tableName',
      type: 'text',
      placeholder: 'MyTable',
      required: function() { 
        return ['create_table', 'get_table', 'add_table_row', 'update_table_row', 
                'delete_table_row', 'sort_table', 'filter_table'].includes(this.operation);
      }
    },
    {
      label: 'Table Headers (JSON Array)',
      field: 'tableHeaders',
      type: 'textarea',
      placeholder: '["Column1", "Column2", "Column3"]',
      required: function() { 
        return this.operation === 'create_table';
      },
      validation: (value, config) => {
        if (config?.operation === 'create_table' && value) {
          try {
            const parsed = JSON.parse(typeof value === 'string' ? value : JSON.stringify(value));
            if (!Array.isArray(parsed)) {
              return 'Table headers must be a JSON array';
            }
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },
    {
      label: 'Table Data (JSON Object)',
      field: 'tableData',
      type: 'textarea',
      placeholder: '{"Column1": "Value1", "Column2": "Value2"}',
      required: function() { 
        return ['add_table_row', 'update_table_row'].includes(this.operation);
      },
      validation: (value, config) => {
        const operation = config?.operation;
        if (typeof operation === 'string' && ['add_table_row', 'update_table_row'].includes(operation) && value) {
          try {
            JSON.parse(typeof value === 'string' ? value : JSON.stringify(value));
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },

    // Chart Configuration
    {
      label: 'Chart Type',
      field: 'chartType',
      type: 'select',
      options: [
        { value: 'line', label: 'Line Chart' },
        { value: 'column', label: 'Column Chart' },
        { value: 'bar', label: 'Bar Chart' },
        { value: 'pie', label: 'Pie Chart' },
        { value: 'scatter', label: 'Scatter Plot' },
        { value: 'area', label: 'Area Chart' },
        { value: 'doughnut', label: 'Doughnut Chart' }
      ],
      required: function() { 
        return this.operation === 'create_chart';
      }
    },
    {
      label: 'Chart Data Range',
      field: 'chartDataRange',
      type: 'text',
      placeholder: 'A1:C10',
      required: function() { 
        return this.operation === 'create_chart';
      }
    },
    {
      label: 'Chart Title',
      field: 'chartTitle',
      type: 'text',
      placeholder: 'My Chart Title',
      required: function() { 
        return this.operation === 'create_chart';
      }
    },

    // Formula Configuration
    {
      label: 'Formula',
      field: 'formula',
      type: 'text',
      placeholder: '=SUM(A1:A10)',
      required: function() {
        return ['calculate_formula', 'set_cell_value'].includes(this.operation) && this.valueType === 'formula';
      },
      validation: (value, config) => {
        if (config?.operation === 'calculate_formula' && value && typeof value === 'string' && !value.startsWith('=')) {
          return 'Formula must start with =';
        }
        return null;
      }
    },
    {
      label: 'Named Range Name',
      field: 'namedRangeName',
      type: 'text',
      placeholder: 'MyRange',
      required: function() { 
        return ['add_named_range', 'get_named_range'].includes(this.operation);
      }
    },

    // Format Configuration
    {
      label: 'Number Format',
      field: 'numberFormat',
      type: 'select',
      options: [
        { value: 'General', label: 'General' },
        { value: '0', label: 'Number' },
        { value: '0.00', label: 'Number (2 decimals)' },
        { value: '#,##0', label: 'Number with commas' },
        { value: '#,##0.00', label: 'Number with commas (2 decimals)' },
        { value: '0%', label: 'Percentage' },
        { value: '0.00%', label: 'Percentage (2 decimals)' },
        { value: '$#,##0.00', label: 'Currency' },
        { value: 'mm/dd/yyyy', label: 'Date (MM/DD/YYYY)' },
        { value: 'dd/mm/yyyy', label: 'Date (DD/MM/YYYY)' },
        { value: 'h:mm AM/PM', label: 'Time (12-hour)' },
        { value: 'h:mm:ss', label: 'Time (24-hour)' }
      ],
      required: function() { 
        return ['format_cells', 'set_cell_format'].includes(this.operation);
      }
    },
    {
      label: 'Font Name',
      field: 'fontName',
      type: 'text',
      placeholder: 'Arial',
      required: false
    },
    {
      label: 'Font Size',
      field: 'fontSize',
      type: 'number',
      placeholder: '12',
      required: false,
      validation: (value) => {
        if (value) {
          const num = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : 0;
          if (num < 1 || num > 72) {
            return 'Font size must be between 1 and 72';
          }
        }
        return null;
      }
    },
    {
      label: 'Font Color',
      field: 'fontColor',
      type: 'text',
      placeholder: '#000000',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string' && !/^#[0-9A-Fa-f]{6}$/.test(value)) {
          return 'Font color must be in hex format (#RRGGBB)';
        }
        return null;
      }
    },
    {
      label: 'Background Color',
      field: 'backgroundColor',
      type: 'text',
      placeholder: '#FFFFFF',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string' && !/^#[0-9A-Fa-f]{6}$/.test(value)) {
          return 'Background color must be in hex format (#RRGGBB)';
        }
        return null;
      }
    },
    {
      label: 'Bold',
      field: 'bold',
      type: 'checkbox',
      required: false
    },
    {
      label: 'Italic',
      field: 'italic',
      type: 'checkbox',
      required: false
    },
    {
      label: 'Underline',
      field: 'underline',
      type: 'checkbox',
      required: false
    },

    // Data Import/Export Configuration
    {
      label: 'CSV Data',
      field: 'csvData',
      type: 'textarea',
      placeholder: 'Name,Age,City\nJohn,25,New York\nJane,30,London',
      required: function() { 
        return this.operation === 'import_csv';
      }
    },
    {
      label: 'Include Headers',
      field: 'includeHeaders',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },
    {
      label: 'Delimiter',
      field: 'delimiter',
      type: 'select',
      options: [
        { value: ',', label: 'Comma (,)' },
        { value: ';', label: 'Semicolon (;)' },
        { value: '\t', label: 'Tab' },
        { value: '|', label: 'Pipe (|)' }
      ],
      defaultValue: ',',
      required: function() { 
        return ['import_csv', 'export_csv'].includes(this.operation);
      }
    },

    // Advanced Options
    {
      label: 'Calculate Automatically',
      field: 'autoCalculate',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },
    {
      label: 'Preserve Formatting',
      field: 'preserveFormatting',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },
    {
      label: 'Error Handling',
      field: 'errorHandling',
      type: 'select',
      options: [
        { value: 'throw', label: 'Throw Error' },
        { value: 'ignore', label: 'Ignore Errors' },
        { value: 'return_error', label: 'Return Error Details' }
      ],
      defaultValue: 'throw',
      required: false
    }
  ],
  examples: [
    {
      name: 'Read Cell Value',
      description: 'Get the value from a specific cell',
      config: {
        authMethod: 'oauth',
        tenantId: 'your-tenant-id',
        clientId: 'your-client-id',
        accessToken: 'your-access-token',
        operation: 'get_cell_value',
        workbookId: 'your-workbook-id',
        worksheetName: 'Sheet1',
        cellRange: 'A1'
      }
    },
    {
      name: 'Write Data Range',
      description: 'Write multiple values to a range of cells',
      config: {
        authMethod: 'oauth',
        tenantId: 'your-tenant-id',
        clientId: 'your-client-id',
        accessToken: 'your-access-token',
        operation: 'set_range_values',
        workbookId: 'your-workbook-id',
        worksheetName: 'Sheet1',
        cellRange: 'A1:C3',
        rangeValues: '[["Name", "Age", "City"], ["John", 25, "New York"], ["Jane", 30, "London"]]'
      }
    },
    {
      name: 'Create Chart',
      description: 'Create a chart from data range',
      config: {
        authMethod: 'oauth',
        tenantId: 'your-tenant-id',
        clientId: 'your-client-id',
        accessToken: 'your-access-token',
        operation: 'create_chart',
        workbookId: 'your-workbook-id',
        worksheetName: 'Sheet1',
        chartType: 'line',
        chartDataRange: 'A1:B10',
        chartTitle: 'Sales Trend'
      }
    },
    {
      name: 'Import CSV',
      description: 'Import CSV data into a worksheet',
      config: {
        authMethod: 'oauth',
        tenantId: 'your-tenant-id',
        clientId: 'your-client-id',
        accessToken: 'your-access-token',
        operation: 'import_csv',
        workbookId: 'your-workbook-id',
        worksheetName: 'Data',
        csvData: 'Product,Price,Quantity\nLaptop,999.99,10\nMouse,29.99,50',
        includeHeaders: true,
        delimiter: ','
      }
    },
    {
      name: 'Format Cells',
      description: 'Apply formatting to a range of cells',
      config: {
        authMethod: 'oauth',
        tenantId: 'your-tenant-id',
        clientId: 'your-client-id',
        accessToken: 'your-access-token',
        operation: 'format_cells',
        workbookId: 'your-workbook-id',
        worksheetName: 'Sheet1',
        cellRange: 'A1:C1',
        numberFormat: 'General',
        fontName: 'Arial',
        fontSize: 14,
        fontColor: '#000000',
        backgroundColor: '#FFFF00',
        bold: true
      }
    }
  ]
};