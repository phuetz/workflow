import { NodeConfigDefinition, validators, commonFields } from '../../../types/nodeConfig';

export const postgresConfig: NodeConfigDefinition = {
  fields: [
    ...commonFields.database(),
    {
      label: 'Port',
      field: 'port',
      type: 'number',
      placeholder: '5432',
      defaultValue: 5432,
      validation: validators.port
    },
    {
      label: 'SSL Mode',
      field: 'sslMode',
      type: 'select',
      defaultValue: 'prefer',
      options: [
        { value: 'disable', label: 'Disable' },
        { value: 'allow', label: 'Allow' },
        { value: 'prefer', label: 'Prefer (Default)' },
        { value: 'require', label: 'Require' },
        { value: 'verify-ca', label: 'Verify CA' },
        { value: 'verify-full', label: 'Verify Full' }
      ],
      description: 'SSL connection mode'
    },
    {
      label: 'Schema',
      field: 'schema',
      type: 'text',
      placeholder: 'public',
      defaultValue: 'public',
      description: 'Database schema to use'
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
        { value: 'upsert', label: 'UPSERT (INSERT ON CONFLICT)' },
        { value: 'execute', label: 'Execute Raw Query' },
        { value: 'function', label: 'Call Function' },
        { value: 'copy', label: 'COPY (Bulk Import/Export)' }
      ]
    },
    {
      label: 'Table',
      field: 'table',
      type: 'text',
      placeholder: 'users',
      description: 'Table name (can include schema: schema.table)'
    },
    {
      label: 'Query / SQL',
      field: 'query',
      type: 'expression',
      placeholder: 'SELECT * FROM users WHERE created_at > NOW() - INTERVAL \'7 days\'',
      description: 'PostgreSQL query'
    },
    {
      label: 'Parameters',
      field: 'parameters',
      type: 'json',
      placeholder: '["{{$json.userId}}", "{{$json.status}}"]',
      description: 'Parameters for prepared statements ($1, $2, etc.)',
      validation: (value) => {
        if (!value) return null;
        return validators.json(value as string);
      }
    },
    {
      label: 'Columns (for INSERT/UPDATE)',
      field: 'columns',
      type: 'json',
      placeholder: '{"name": "{{$json.name}}", "metadata": "{{$json}}"}',
      description: 'Column values (supports JSONB)',
      validation: (value) => {
        if (!value) return null;
        return validators.json(value as string);
      }
    },
    {
      label: 'Conflict Target (for UPSERT)',
      field: 'conflictTarget',
      type: 'text',
      placeholder: 'email',
      description: 'Column(s) for ON CONFLICT clause'
    },
    {
      label: 'Conflict Action',
      field: 'conflictAction',
      type: 'select',
      defaultValue: 'update',
      options: [
        { value: 'nothing', label: 'DO NOTHING' },
        { value: 'update', label: 'DO UPDATE SET' }
      ]
    },
    {
      label: 'Where Clause',
      field: 'where',
      type: 'expression',
      placeholder: 'id = $1 AND status = $2',
      description: 'WHERE clause (use $1, $2 for parameters)'
    },
    {
      label: 'Returning',
      field: 'returning',
      type: 'text',
      placeholder: '*',
      description: 'RETURNING clause for INSERT/UPDATE/DELETE'
    },
    {
      label: 'Limit',
      field: 'limit',
      type: 'number',
      placeholder: '100',
      validation: validators.positiveNumber
    },
    {
      label: 'Offset',
      field: 'offset',
      type: 'number',
      placeholder: '0',
      validation: (value) => {
        if (!value) return null;
        const num = Number(value);
        if (isNaN(num) || num < 0) {
          return 'Offset must be 0 or positive';
        }
        return null;
      }
    },
    {
      label: 'Order By',
      field: 'orderBy',
      type: 'text',
      placeholder: 'created_at DESC NULLS LAST'
    },
    {
      label: 'Statement Timeout (ms)',
      field: 'statementTimeout',
      type: 'number',
      placeholder: '30000',
      defaultValue: 30000,
      validation: validators.positiveNumber
    },
    {
      label: 'Enable Array Mode',
      field: 'arrayMode',
      type: 'checkbox',
      defaultValue: false,
      description: 'Return results as arrays instead of objects'
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // Operation-specific validations
    if (config.operation === 'select' && !config.query && !config.table) {
      errors.query = 'Either query or table must be specified';
    }

    if ((config.operation === 'insert' || config.operation === 'update' || config.operation === 'upsert') && !config.columns) {
      errors.columns = 'Columns are required for this operation';
    }

    if (config.operation === 'upsert' && !config.conflictTarget) {
      errors.conflictTarget = 'Conflict target is required for UPSERT';
    }

    if ((config.operation === 'update' || config.operation === 'delete') && !config.where && !config.query) {
      errors.where = 'WHERE clause is required for UPDATE/DELETE';
    }

    if (config.operation === 'function' && !config.query) {
      errors.query = 'Function name is required';
    }

    if (config.operation === 'copy' && !config.query) {
      errors.query = 'COPY command is required';
    }

    return errors;
  },

  transform: (config) => {
    // Parse JSON strings
    if (config.parameters && typeof config.parameters === 'string') {
      try {
        config.parameters = JSON.parse(config.parameters);
      } catch (e) {
        // Keep as string
      }
    }

    if (config.columns && typeof config.columns === 'string') {
      try {
        config.columns = JSON.parse(config.columns);
      } catch (e) {
        // Keep as string
      }
    }

    // Add schema to table if not included
    if (config.table && config.schema && !(config.table as string).includes('.')) {
      config.table = `${config.schema}.${config.table}`;
    }

    return config;
  },

  examples: [
    {
      label: 'Simple Query',
      config: {
        host: 'localhost',
        port: 5432,
        database: 'myapp',
        username: 'postgres',
        password: 'password',
        operation: 'select',
        table: 'users',
        where: 'active = true',
        orderBy: 'created_at DESC',
        limit: 10
      }
    },
    {
      label: 'Parameterized Query',
      config: {
        host: 'localhost',
        port: 5432,
        database: 'myapp',
        username: 'postgres',
        password: 'password',
        operation: 'execute',
        query: 'SELECT * FROM orders WHERE user_id = $1 AND created_at > $2',
        parameters: '["{{$json.userId}}", "{{$json.startDate}}"]'
      }
    },
    {
      label: 'Insert with JSONB',
      config: {
        host: 'localhost',
        port: 5432,
        database: 'myapp',
        username: 'postgres',
        password: 'password',
        operation: 'insert',
        table: 'events',
        columns: '{"user_id": "{{$json.userId}}", "event_type": "{{$json.type}}", "metadata": {{$json}}}',
        returning: 'id, created_at'
      }
    },
    {
      label: 'Upsert (Insert or Update)',
      config: {
        host: 'localhost',
        port: 5432,
        database: 'myapp',
        username: 'postgres',
        password: 'password',
        operation: 'upsert',
        table: 'user_preferences',
        columns: '{"user_id": "{{$json.userId}}", "preferences": {{$json.preferences}}}',
        conflictTarget: 'user_id',
        conflictAction: 'update',
        returning: '*'
      }
    },
    {
      label: 'Call Function',
      config: {
        host: 'localhost',
        port: 5432,
        database: 'myapp',
        username: 'postgres',
        password: 'password',
        operation: 'function',
        query: 'calculate_user_score($1, $2)',
        parameters: '["{{$json.userId}}", "{{$json.period}}"]'
      }
    },
    {
      label: 'Bulk Copy',
      config: {
        host: 'localhost',
        port: 5432,
        database: 'myapp',
        username: 'postgres',
        password: 'password',
        operation: 'copy',
        query: 'COPY users(name, email) FROM STDIN WITH CSV HEADER'
      }
    }
  ]
};