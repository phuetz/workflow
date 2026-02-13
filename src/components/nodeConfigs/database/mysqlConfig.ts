import { NodeConfigDefinition, validators, commonFields } from '../../../types/nodeConfig';

export const mysqlConfig: NodeConfigDefinition = {
  fields: [
    ...commonFields.database(),
    {
      label: 'Port',
      field: 'port',
      type: 'number',
      placeholder: '3306',
      defaultValue: 3306,
      validation: validators.port
    },
    {
      label: 'SSL',
      field: 'ssl',
      type: 'checkbox',
      defaultValue: false,
      description: 'Use SSL connection'
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      defaultValue: 'select',
      options: [
        { value: 'select', label: 'SELECT (Query)' },
        { value: 'insert', label: 'INSERT' },
        { value: 'update', label: 'UPDATE' },
        { value: 'delete', label: 'DELETE' },
        { value: 'execute', label: 'Execute Raw Query' },
        { value: 'procedure', label: 'Call Stored Procedure' }
      ]
    },
    {
      label: 'Table',
      field: 'table',
      type: 'text',
      placeholder: 'users',
      description: 'Table name for the operation'
    },
    {
      label: 'Query / SQL',
      field: 'query',
      type: 'expression',
      placeholder: 'SELECT * FROM users WHERE active = 1',
      description: 'SQL query or query builder expression'
    },
    {
      label: 'Parameters',
      field: 'parameters',
      type: 'json',
      placeholder: '{"userId": "{{$json.id}}"}',
      description: 'Parameters for prepared statements',
      validation: (value) => {
        if (!value) return null;
        return validators.json(value);
      }
    },
    {
      label: 'Columns (for INSERT/UPDATE)',
      field: 'columns',
      type: 'json',
      placeholder: '{"name": "{{$json.name}}", "email": "{{$json.email}}"}',
      description: 'Column values for insert/update operations',
      validation: (value) => {
        if (!value) return null;
        return validators.json(value);
      }
    },
    {
      label: 'Where Clause',
      field: 'where',
      type: 'expression',
      placeholder: 'id = {{$json.userId}}',
      description: 'WHERE clause for UPDATE/DELETE operations'
    },
    {
      label: 'Limit',
      field: 'limit',
      type: 'number',
      placeholder: '100',
      description: 'Maximum number of rows to return',
      validation: validators.positiveNumber
    },
    {
      label: 'Order By',
      field: 'orderBy',
      type: 'text',
      placeholder: 'created_at DESC',
      description: 'ORDER BY clause'
    },
    {
      label: 'Connection Timeout (ms)',
      field: 'connectionTimeout',
      type: 'number',
      placeholder: '10000',
      defaultValue: 10000,
      validation: validators.positiveNumber
    },
    {
      label: 'Enable Multiple Statements',
      field: 'multipleStatements',
      type: 'checkbox',
      defaultValue: false,
      description: 'Allow multiple SQL statements in one query'
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // Operation-specific validations
    if (config.operation === 'select' && !config.query && !config.table) {
      errors.query = 'Either query or table must be specified for SELECT';
    }

    if ((config.operation === 'insert' || config.operation === 'update') && !config.columns) {
      errors.columns = 'Columns are required for INSERT/UPDATE operations';
    }

    if ((config.operation === 'update' || config.operation === 'delete') && !config.where && !config.query) {
      errors.where = 'WHERE clause is required for UPDATE/DELETE operations';
    }

    if (config.operation === 'procedure' && !config.query) {
      errors.query = 'Procedure name is required';
    }

    // Security warning for raw queries
    if (config.query && typeof config.query === 'string' && config.query.includes('{{') && !config.parameters) {
      errors.parameters = 'Use parameters for dynamic values to prevent SQL injection';
    }

    return errors;
  },

  transform: (config) => {
    // Parse JSON strings if needed
    if (config.parameters && typeof config.parameters === 'string') {
      try {
        config.parameters = JSON.parse(config.parameters);
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }

    if (config.columns && typeof config.columns === 'string') {
      try {
        config.columns = JSON.parse(config.columns);
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }

    return config;
  },

  examples: [
    {
      label: 'Simple SELECT',
      config: {
        host: 'localhost',
        port: 3306,
        database: 'myapp',
        username: 'root',
        password: 'password',
        operation: 'select',
        table: 'users',
        where: 'active = 1',
        orderBy: 'created_at DESC',
        limit: 10
      }
    },
    {
      label: 'Parameterized Query',
      config: {
        host: 'localhost',
        port: 3306,
        database: 'myapp',
        username: 'root',
        password: 'password',
        operation: 'execute',
        query: 'SELECT * FROM orders WHERE user_id = ? AND status = ?',
        parameters: '["{{$json.userId}}", "pending"]'
      }
    },
    {
      label: 'Insert Record',
      config: {
        host: 'localhost',
        port: 3306,
        database: 'myapp',
        username: 'root',
        password: 'password',
        operation: 'insert',
        table: 'users',
        columns: '{"name": "{{$json.name}}", "email": "{{$json.email}}", "created_at": "NOW()"}'
      }
    },
    {
      label: 'Update Record',
      config: {
        host: 'localhost',
        port: 3306,
        database: 'myapp',
        username: 'root',
        password: 'password',
        operation: 'update',
        table: 'users',
        columns: '{"last_login": "NOW()", "login_count": "login_count + 1"}',
        where: 'id = {{$json.userId}}'
      }
    },
    {
      label: 'Call Stored Procedure',
      config: {
        host: 'localhost',
        port: 3306,
        database: 'myapp',
        username: 'root',
        password: 'password',
        operation: 'procedure',
        query: 'CALL GetUserOrders(?)',
        parameters: '["{{$json.userId}}"]'
      }
    }
  ]
};

export default mysqlConfig;
