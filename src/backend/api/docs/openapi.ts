/**
 * OpenAPI 3.0 Specification for Workflow Automation API
 *
 * This specification documents all available API endpoints for the
 * visual workflow automation platform.
 */

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Workflow Automation API',
    version: '1.0.0',
    description: 'API for visual workflow automation platform - build, execute, and manage automated workflows with 400+ integrations',
    contact: {
      name: 'API Support',
      email: 'support@workflow.example.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    { url: '/api', description: 'API Server' }
  ],
  tags: [
    { name: 'Health', description: 'Health check and monitoring endpoints' },
    { name: 'Auth', description: 'Authentication and authorization' },
    { name: 'Workflows', description: 'Workflow management operations' },
    { name: 'Executions', description: 'Workflow execution management' },
    { name: 'Credentials', description: 'Secure credential management' },
    { name: 'Nodes', description: 'Node type catalog' },
    { name: 'Templates', description: 'Workflow templates' },
    { name: 'Webhooks', description: 'Webhook management' },
    { name: 'Users', description: 'User management' },
    { name: 'Teams', description: 'Team management' },
    { name: 'Queue', description: 'Job queue management' },
    { name: 'Analytics', description: 'Usage analytics' },
    { name: 'Audit', description: 'Audit logs' },
    { name: 'Environments', description: 'Environment management' }
  ],
  paths: {
    // Health Endpoints
    '/health': {
      get: {
        summary: 'Health check',
        description: 'Returns the health status of the API server',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' }
              }
            }
          }
        }
      }
    },
    '/ready': {
      get: {
        summary: 'Readiness check',
        description: 'Returns the readiness status including database and Redis connectivity',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Server is ready',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ReadinessResponse' }
              }
            }
          },
          '503': {
            description: 'Server is not ready (dependency unavailable)'
          }
        }
      }
    },

    // Auth Endpoints
    '/auth/login': {
      post: {
        summary: 'User login',
        description: 'Authenticate user with email and password',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' }
              }
            }
          },
          '401': { description: 'Invalid credentials' }
        }
      }
    },
    '/auth/register': {
      post: {
        summary: 'User registration',
        description: 'Register a new user account',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Registration successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' }
              }
            }
          },
          '400': { description: 'Validation error or email already exists' }
        }
      }
    },
    '/auth/refresh': {
      post: {
        summary: 'Refresh access token',
        description: 'Exchange refresh token for new access token',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshTokenRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Token refreshed successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokenResponse' }
              }
            }
          },
          '401': { description: 'Invalid or expired refresh token' }
        }
      }
    },
    '/auth/logout': {
      post: {
        summary: 'User logout',
        description: 'Invalidate current session',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Logout successful' }
        }
      }
    },
    '/auth/me': {
      get: {
        summary: 'Get current user',
        description: 'Returns the authenticated user profile',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' }
              }
            }
          },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/auth/oauth/providers': {
      get: {
        summary: 'List OAuth providers',
        description: 'Returns list of configured OAuth2 providers',
        tags: ['Auth'],
        responses: {
          '200': {
            description: 'List of providers',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    providers: {
                      type: 'array',
                      items: { type: 'string' }
                    },
                    count: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    },

    // Workflow Endpoints
    '/workflows': {
      get: {
        summary: 'List all workflows',
        description: 'Returns a paginated list of workflows for the authenticated user',
        tags: ['Workflows'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by workflow name' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive', 'draft'] } },
          { name: 'tags', in: 'query', schema: { type: 'array', items: { type: 'string' } }, description: 'Filter by tags' }
        ],
        responses: {
          '200': {
            description: 'List of workflows',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WorkflowListResponse' }
              }
            }
          },
          '401': { description: 'Unauthorized' }
        }
      },
      post: {
        summary: 'Create a new workflow',
        description: 'Creates a new workflow with the provided configuration',
        tags: ['Workflows'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateWorkflowRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Workflow created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Workflow' }
              }
            }
          },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/workflows/{id}': {
      get: {
        summary: 'Get workflow by ID',
        description: 'Returns a specific workflow with all its configuration',
        tags: ['Workflows'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'Workflow details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Workflow' }
              }
            }
          },
          '404': { description: 'Workflow not found' },
          '403': { description: 'Access denied' }
        }
      },
      put: {
        summary: 'Update workflow',
        description: 'Updates an existing workflow',
        tags: ['Workflows'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateWorkflowRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Workflow updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Workflow' }
              }
            }
          },
          '404': { description: 'Workflow not found' },
          '403': { description: 'Access denied' }
        }
      },
      delete: {
        summary: 'Delete workflow',
        description: 'Permanently deletes a workflow',
        tags: ['Workflows'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Workflow deleted successfully' },
          '404': { description: 'Workflow not found' },
          '403': { description: 'Access denied' }
        }
      }
    },
    '/workflows/{id}/execute': {
      post: {
        summary: 'Execute workflow',
        description: 'Starts execution of a workflow',
        tags: ['Workflows', 'Executions'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  input: {
                    type: 'object',
                    description: 'Input data for the workflow'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Execution started',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExecutionStartResponse' }
              }
            }
          },
          '404': { description: 'Workflow not found' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/workflows/{id}/executions': {
      get: {
        summary: 'Get workflow execution history',
        description: 'Returns execution history for a specific workflow',
        tags: ['Workflows', 'Executions'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'running', 'success', 'failure'] } }
        ],
        responses: {
          '200': {
            description: 'Execution history',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExecutionListResponse' }
              }
            }
          },
          '404': { description: 'Workflow not found' }
        }
      }
    },
    '/workflows/{id}/duplicate': {
      post: {
        summary: 'Duplicate workflow',
        description: 'Creates a copy of an existing workflow',
        tags: ['Workflows'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '201': {
            description: 'Workflow duplicated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Workflow' }
              }
            }
          },
          '404': { description: 'Workflow not found' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/workflows/{id}/activate': {
      post: {
        summary: 'Activate workflow',
        description: 'Sets workflow status to active',
        tags: ['Workflows'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Workflow activated' },
          '404': { description: 'Workflow not found' },
          '403': { description: 'Access denied' }
        }
      }
    },
    '/workflows/{id}/deactivate': {
      post: {
        summary: 'Deactivate workflow',
        description: 'Sets workflow status to inactive',
        tags: ['Workflows'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Workflow deactivated' },
          '404': { description: 'Workflow not found' },
          '403': { description: 'Access denied' }
        }
      }
    },
    '/workflows/batch/delete': {
      post: {
        summary: 'Batch delete workflows',
        description: 'Delete multiple workflows at once',
        tags: ['Workflows'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BatchWorkflowIdsRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Batch operation results',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BatchOperationResponse' }
              }
            }
          },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/workflows/batch/activate': {
      post: {
        summary: 'Batch activate workflows',
        description: 'Activate multiple workflows at once',
        tags: ['Workflows'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BatchWorkflowIdsRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Batch operation results',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BatchOperationResponse' }
              }
            }
          }
        }
      }
    },
    '/workflows/batch/deactivate': {
      post: {
        summary: 'Batch deactivate workflows',
        description: 'Deactivate multiple workflows at once',
        tags: ['Workflows'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BatchWorkflowIdsRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Batch operation results',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BatchOperationResponse' }
              }
            }
          }
        }
      }
    },
    '/workflows/batch/export': {
      post: {
        summary: 'Batch export workflows',
        description: 'Export multiple workflows at once',
        tags: ['Workflows'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BatchWorkflowIdsRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Exported workflows',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BatchExportResponse' }
              }
            }
          }
        }
      }
    },
    '/workflows/batch/tag': {
      post: {
        summary: 'Batch tag workflows',
        description: 'Add, remove, or replace tags on multiple workflows',
        tags: ['Workflows'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BatchTagRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Batch operation results',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BatchOperationResponse' }
              }
            }
          }
        }
      }
    },

    // Execution Endpoints
    '/executions': {
      get: {
        summary: 'List all executions',
        description: 'Returns a paginated list of workflow executions',
        tags: ['Executions'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'workflowId', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'List of executions',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExecutionListResponse' }
              }
            }
          }
        }
      }
    },
    '/executions/{id}': {
      get: {
        summary: 'Get execution by ID',
        description: 'Returns details of a specific execution',
        tags: ['Executions'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'Execution details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Execution' }
              }
            }
          },
          '404': { description: 'Execution not found' }
        }
      }
    },
    '/executions/{id}/logs': {
      get: {
        summary: 'Get execution logs',
        description: 'Returns logs for a specific execution',
        tags: ['Executions'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'Execution logs',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    logs: { type: 'array', items: { type: 'object' } }
                  }
                }
              }
            }
          },
          '404': { description: 'Execution not found' }
        }
      }
    },
    '/executions/{id}/stream': {
      get: {
        summary: 'Stream execution events',
        description: 'Server-Sent Events stream of execution logs and events',
        tags: ['Executions'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'SSE stream',
            content: {
              'text/event-stream': {
                schema: { type: 'string' }
              }
            }
          },
          '404': { description: 'Execution not found' }
        }
      }
    },
    '/executions/{id}/nodes': {
      get: {
        summary: 'Get node executions',
        description: 'Returns execution details for each node in the workflow',
        tags: ['Executions'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }
        ],
        responses: {
          '200': {
            description: 'Node execution details'
          },
          '404': { description: 'Execution not found' }
        }
      }
    },
    '/executions/queue': {
      post: {
        summary: 'Queue workflow execution',
        description: 'Add a workflow execution to the queue',
        tags: ['Executions', 'Queue'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/QueueExecutionRequest' }
            }
          }
        },
        responses: {
          '202': {
            description: 'Workflow queued successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/QueuedExecutionResponse' }
              }
            }
          },
          '401': { description: 'Authentication required' }
        }
      }
    },
    '/executions/queue/status': {
      get: {
        summary: 'Get queue status',
        description: 'Returns overall execution queue status and metrics',
        tags: ['Executions', 'Queue'],
        responses: {
          '200': {
            description: 'Queue status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/QueueStatusResponse' }
              }
            }
          }
        }
      }
    },
    '/executions/export': {
      get: {
        summary: 'List export jobs',
        description: 'Returns list of export jobs for the current user',
        tags: ['Executions'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of export jobs'
          },
          '401': { description: 'Authentication required' }
        }
      },
      post: {
        summary: 'Create export job',
        description: 'Start a new async export job for executions',
        tags: ['Executions'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ExportExecutionRequest' }
            }
          }
        },
        responses: {
          '202': {
            description: 'Export job started'
          },
          '429': { description: 'Maximum concurrent exports reached' }
        }
      }
    },
    '/executions/{executionId}/retry-from/{nodeId}': {
      post: {
        summary: 'Retry from node',
        description: 'Retry a workflow execution starting from a specific node',
        tags: ['Executions'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'executionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'nodeId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  testData: { type: 'object', description: 'Test data to use instead of previous execution data' },
                  stopAtNodeId: { type: 'string', description: 'Stop execution at this node' },
                  maxExecutionTime: { type: 'integer', description: 'Maximum execution time in milliseconds' }
                }
              }
            }
          }
        },
        responses: {
          '202': {
            description: 'Retry execution started'
          },
          '404': { description: 'Execution or node not found' }
        }
      }
    },

    // Credentials Endpoints
    '/credentials': {
      get: {
        summary: 'List all credentials',
        description: 'Returns list of credentials for the authenticated user (without secret data)',
        tags: ['Credentials'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CredentialListResponse' }
              }
            }
          },
          '401': { description: 'Unauthorized' }
        }
      },
      post: {
        summary: 'Create credential',
        description: 'Creates a new encrypted credential',
        tags: ['Credentials'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateCredentialRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Credential created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Credential' }
              }
            }
          },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/credentials/{id}': {
      get: {
        summary: 'Get credential by ID',
        description: 'Returns credential metadata (without secret data)',
        tags: ['Credentials'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'Credential details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Credential' }
              }
            }
          },
          '404': { description: 'Credential not found' },
          '403': { description: 'Access denied' }
        }
      },
      put: {
        summary: 'Update credential',
        description: 'Updates an existing credential',
        tags: ['Credentials'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateCredentialRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Credential updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Credential' }
              }
            }
          },
          '404': { description: 'Credential not found' },
          '403': { description: 'Access denied' }
        }
      },
      delete: {
        summary: 'Delete credential',
        description: 'Permanently deletes a credential',
        tags: ['Credentials'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Credential deleted' },
          '404': { description: 'Credential not found' },
          '403': { description: 'Access denied' }
        }
      }
    },
    '/credentials/{id}/decrypt': {
      get: {
        summary: 'Get decrypted credential',
        description: 'Returns credential with decrypted data (for execution)',
        tags: ['Credentials'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'Decrypted credential'
          },
          '404': { description: 'Credential not found' },
          '403': { description: 'Access denied' }
        }
      }
    },
    '/credentials/test': {
      post: {
        summary: 'Test credential (before saving)',
        description: 'Tests a new credential configuration',
        tags: ['Credentials'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['kind', 'data'],
                properties: {
                  kind: { type: 'string' },
                  type: { type: 'string' },
                  data: { type: 'object' },
                  testEndpoint: { type: 'string' },
                  timeoutMs: { type: 'integer' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Test results'
          },
          '429': { description: 'Rate limit exceeded' }
        }
      }
    },
    '/credentials/{id}/test': {
      post: {
        summary: 'Test existing credential',
        description: 'Tests an existing credential',
        tags: ['Credentials'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'Test results'
          },
          '404': { description: 'Credential not found' },
          '429': { description: 'Rate limit exceeded' }
        }
      }
    },

    // Nodes Endpoints
    '/nodes': {
      get: {
        summary: 'List all node types',
        description: 'Returns catalog of available node types (150+ types across 34 categories)',
        tags: ['Nodes'],
        responses: {
          '200': {
            description: 'Node type catalog',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NodeTypesResponse' }
              }
            }
          }
        }
      }
    },

    // Templates Endpoints
    '/templates': {
      get: {
        summary: 'List workflow templates',
        description: 'Returns available workflow templates',
        tags: ['Templates'],
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'List of templates',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TemplateListResponse' }
              }
            }
          }
        }
      }
    },

    // Webhooks Endpoints
    '/webhooks': {
      get: {
        summary: 'List webhooks',
        description: 'Returns list of configured webhooks',
        tags: ['Webhooks'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of webhooks'
          }
        }
      },
      post: {
        summary: 'Create webhook',
        description: 'Creates a new webhook endpoint',
        tags: ['Webhooks'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateWebhookRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Webhook created'
          }
        }
      }
    },

    // Users Endpoints
    '/users': {
      get: {
        summary: 'List users',
        description: 'Returns list of users (admin only)',
        tags: ['Users'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: {
          '200': {
            description: 'List of users'
          },
          '403': { description: 'Admin access required' }
        }
      }
    },

    // Teams Endpoints
    '/teams': {
      get: {
        summary: 'List teams',
        description: 'Returns list of teams for the authenticated user',
        tags: ['Teams'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of teams'
          }
        }
      },
      post: {
        summary: 'Create team',
        description: 'Creates a new team',
        tags: ['Teams'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Team created'
          }
        }
      }
    },

    // Queue Endpoints
    '/queue/status': {
      get: {
        summary: 'Get queue status',
        description: 'Returns job queue status and metrics',
        tags: ['Queue'],
        responses: {
          '200': {
            description: 'Queue status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/QueueStatusResponse' }
              }
            }
          }
        }
      }
    },

    // Analytics Endpoints
    '/analytics': {
      get: {
        summary: 'Get analytics overview',
        description: 'Returns usage analytics and statistics',
        tags: ['Analytics'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'period', in: 'query', schema: { type: 'string', enum: ['day', 'week', 'month', 'year'] } }
        ],
        responses: {
          '200': {
            description: 'Analytics data'
          }
        }
      }
    },

    // Audit Endpoints
    '/audit': {
      get: {
        summary: 'Get audit logs',
        description: 'Returns audit trail of actions',
        tags: ['Audit'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'action', in: 'query', schema: { type: 'string' } },
          { name: 'userId', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'Audit logs'
          }
        }
      }
    },

    // Environment Endpoints
    '/environments': {
      get: {
        summary: 'List environments',
        description: 'Returns list of deployment environments',
        tags: ['Environments'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of environments'
          }
        }
      },
      post: {
        summary: 'Create environment',
        description: 'Creates a new deployment environment',
        tags: ['Environments'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  variables: { type: 'object' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Environment created'
          }
        }
      }
    }
  },

  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token obtained from /auth/login or /auth/register'
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for programmatic access'
      }
    },
    schemas: {
      // Health schemas
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['healthy'] },
          timestamp: { type: 'string', format: 'date-time' },
          uptime: { type: 'number' },
          memory: {
            type: 'object',
            properties: {
              heapUsed: { type: 'number' },
              heapTotal: { type: 'number' },
              rss: { type: 'number' }
            }
          },
          environment: { type: 'string' }
        }
      },
      ReadinessResponse: {
        type: 'object',
        properties: {
          ready: { type: 'boolean' },
          timestamp: { type: 'string', format: 'date-time' },
          checks: {
            type: 'object',
            properties: {
              database: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['up', 'down'] },
                  latency: { type: 'number' },
                  error: { type: 'string' }
                }
              },
              redis: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['up', 'down'] },
                  latency: { type: 'number' },
                  error: { type: 'string' }
                }
              }
            }
          }
        }
      },

      // Auth schemas
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 }
        }
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string' },
          lastName: { type: 'string' }
        }
      },
      RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          tokens: { $ref: '#/components/schemas/TokenResponse' }
        }
      },
      TokenResponse: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          expiresIn: { type: 'integer', description: 'Token expiration time in seconds' }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'user', 'viewer'] },
          avatarUrl: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },

      // Workflow schemas
      Workflow: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          version: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'active', 'inactive'] },
          tags: { type: 'array', items: { type: 'string' } },
          nodes: { type: 'array', items: { $ref: '#/components/schemas/WorkflowNode' } },
          edges: { type: 'array', items: { $ref: '#/components/schemas/WorkflowEdge' } },
          settings: { $ref: '#/components/schemas/WorkflowSettings' },
          userId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      WorkflowNode: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          position: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' }
            }
          },
          data: { type: 'object' }
        }
      },
      WorkflowEdge: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          source: { type: 'string' },
          target: { type: 'string' },
          sourceHandle: { type: 'string' },
          targetHandle: { type: 'string' }
        }
      },
      WorkflowSettings: {
        type: 'object',
        properties: {
          errorWorkflow: { type: 'string', description: 'Workflow ID to execute on error' },
          timezone: { type: 'string' },
          saveDataErrorExecution: { type: 'string', enum: ['all', 'none'] },
          saveDataSuccessExecution: { type: 'string', enum: ['all', 'none'] },
          saveExecutionProgress: { type: 'boolean' },
          timeout: { type: 'integer', description: 'Execution timeout in milliseconds' }
        }
      },
      CreateWorkflowRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          tags: { type: 'array', items: { type: 'string' } },
          nodes: { type: 'array', items: { $ref: '#/components/schemas/WorkflowNode' } },
          edges: { type: 'array', items: { $ref: '#/components/schemas/WorkflowEdge' } },
          settings: { $ref: '#/components/schemas/WorkflowSettings' }
        }
      },
      UpdateWorkflowRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          tags: { type: 'array', items: { type: 'string' } },
          nodes: { type: 'array', items: { $ref: '#/components/schemas/WorkflowNode' } },
          edges: { type: 'array', items: { $ref: '#/components/schemas/WorkflowEdge' } },
          settings: { $ref: '#/components/schemas/WorkflowSettings' }
        }
      },
      WorkflowListResponse: {
        type: 'object',
        properties: {
          workflows: { type: 'array', items: { $ref: '#/components/schemas/Workflow' } },
          total: { type: 'integer' },
          page: { type: 'integer' },
          totalPages: { type: 'integer' }
        }
      },
      BatchWorkflowIdsRequest: {
        type: 'object',
        required: ['workflowIds'],
        properties: {
          workflowIds: { type: 'array', items: { type: 'string' }, minItems: 1 }
        }
      },
      BatchTagRequest: {
        type: 'object',
        required: ['workflowIds', 'tags'],
        properties: {
          workflowIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
          tags: { type: 'array', items: { type: 'string' } },
          operation: { type: 'string', enum: ['add', 'remove', 'replace'], default: 'add' }
        }
      },
      BatchOperationResponse: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                success: { type: 'boolean' },
                error: { type: 'string', nullable: true }
              }
            }
          },
          summary: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              succeeded: { type: 'integer' },
              failed: { type: 'integer' }
            }
          }
        }
      },
      BatchExportResponse: {
        type: 'object',
        properties: {
          workflows: { type: 'array', items: { $ref: '#/components/schemas/Workflow' } },
          errors: { type: 'array', items: { type: 'object' } },
          summary: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              exported: { type: 'integer' },
              failed: { type: 'integer' }
            }
          },
          exportMetadata: {
            type: 'object',
            properties: {
              exportedAt: { type: 'string', format: 'date-time' },
              exportedBy: { type: 'string' },
              version: { type: 'string' }
            }
          }
        }
      },

      // Execution schemas
      Execution: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          workflowId: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'running', 'success', 'failure', 'cancelled'] },
          startedAt: { type: 'string', format: 'date-time' },
          finishedAt: { type: 'string', format: 'date-time', nullable: true },
          duration: { type: 'integer', description: 'Duration in milliseconds' },
          trigger: { type: 'object' },
          input: { type: 'object' },
          output: { type: 'object' },
          error: { type: 'string', nullable: true }
        }
      },
      ExecutionStartResponse: {
        type: 'object',
        properties: {
          executionId: { type: 'string' },
          status: { type: 'string', enum: ['pending'] },
          workflowId: { type: 'string' },
          userId: { type: 'string' },
          startTime: { type: 'string', format: 'date-time' }
        }
      },
      ExecutionListResponse: {
        type: 'object',
        properties: {
          executions: { type: 'array', items: { $ref: '#/components/schemas/Execution' } },
          total: { type: 'integer' },
          page: { type: 'integer' },
          totalPages: { type: 'integer' }
        }
      },
      QueueExecutionRequest: {
        type: 'object',
        required: ['workflowId'],
        properties: {
          workflowId: { type: 'string' },
          inputData: { type: 'object' },
          triggerNode: { type: 'string' },
          mode: { type: 'string', enum: ['manual', 'trigger', 'webhook'] },
          priority: { type: 'boolean' }
        }
      },
      QueuedExecutionResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          executionId: { type: 'string' },
          jobId: { type: 'string' },
          message: { type: 'string' },
          links: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              execution: { type: 'string' }
            }
          }
        }
      },
      QueueStatusResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          status: { type: 'string', enum: ['healthy', 'degraded'] },
          metrics: {
            type: 'object',
            properties: {
              pending: { type: 'integer' },
              processing: { type: 'integer' },
              completed: { type: 'integer' },
              failed: { type: 'integer' },
              delayed: { type: 'integer' },
              paused: { type: 'integer' },
              total: { type: 'integer' }
            }
          },
          redis: { type: 'boolean' },
          timestamp: { type: 'string', format: 'date-time' }
        }
      },
      ExportExecutionRequest: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['json', 'csv', 'xlsx'], default: 'json' },
          workflowId: { type: 'string' },
          status: { type: 'string', enum: ['success', 'error', 'all'], default: 'all' },
          dateFrom: { type: 'string', format: 'date-time' },
          dateTo: { type: 'string', format: 'date-time' },
          includeData: { type: 'boolean', default: false },
          includeNodeExecutions: { type: 'boolean', default: false },
          includeLogs: { type: 'boolean', default: false },
          limit: { type: 'integer', default: 10000, maximum: 100000 }
        }
      },

      // Credential schemas
      Credential: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          kind: { type: 'string', enum: ['api_key', 'oauth2', 'basic', 'bearer', 'ssh', 'database', 'custom'] },
          description: { type: 'string' },
          isActive: { type: 'boolean' },
          expiresAt: { type: 'string', format: 'date-time', nullable: true },
          lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      CreateCredentialRequest: {
        type: 'object',
        required: ['name', 'kind', 'data'],
        properties: {
          name: { type: 'string' },
          kind: { type: 'string', enum: ['api_key', 'oauth2', 'basic', 'bearer', 'ssh', 'database', 'custom'] },
          description: { type: 'string' },
          data: { type: 'object', description: 'Credential secret data (will be encrypted)' },
          expiresAt: { type: 'string', format: 'date-time' }
        }
      },
      UpdateCredentialRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          data: { type: 'object' },
          isActive: { type: 'boolean' },
          expiresAt: { type: 'string', format: 'date-time' }
        }
      },
      CredentialListResponse: {
        type: 'object',
        properties: {
          credentials: { type: 'array', items: { $ref: '#/components/schemas/Credential' } }
        }
      },

      // Node schemas
      NodeType: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          name: { type: 'string' },
          category: { type: 'string' },
          description: { type: 'string' },
          icon: { type: 'string' },
          inputs: { type: 'array', items: { type: 'string' } },
          outputs: { type: 'array', items: { type: 'string' } },
          properties: { type: 'array', items: { type: 'object' } }
        }
      },
      NodeTypesResponse: {
        type: 'object',
        properties: {
          nodes: { type: 'array', items: { $ref: '#/components/schemas/NodeType' } },
          categories: { type: 'array', items: { type: 'string' } },
          count: { type: 'integer' }
        }
      },

      // Template schemas
      Template: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          workflow: { $ref: '#/components/schemas/Workflow' },
          usageCount: { type: 'integer' }
        }
      },
      TemplateListResponse: {
        type: 'object',
        properties: {
          templates: { type: 'array', items: { $ref: '#/components/schemas/Template' } },
          categories: { type: 'array', items: { type: 'string' } },
          total: { type: 'integer' }
        }
      },

      // Webhook schemas
      CreateWebhookRequest: {
        type: 'object',
        required: ['workflowId', 'path'],
        properties: {
          workflowId: { type: 'string' },
          path: { type: 'string' },
          httpMethod: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], default: 'POST' },
          authentication: {
            type: 'string',
            enum: ['none', 'basic', 'header', 'jwt', 'hmac', 'oauth2', 'apiKey'],
            default: 'none'
          },
          isActive: { type: 'boolean', default: true }
        }
      },

      // Error response
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          statusCode: { type: 'integer' }
        }
      }
    }
  }
};

export default openApiSpec;
