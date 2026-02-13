/**
 * Naming Pattern Library for Intelligent Node Auto-naming
 *
 * Provides patterns and rules for generating meaningful node names
 * based on node type, configuration, and context.
 */

import { NodeType, NodeData } from '../types/workflow';

export interface NamingPattern {
  nodeType: string;
  patterns: Array<{
    priority: number;
    condition: (config: Record<string, any>) => boolean;
    template: (config: Record<string, any>) => string;
  }>;
}

export interface NamingContext {
  position: 'first' | 'middle' | 'last';
  previousNodeType?: string;
  nextNodeType?: string;
  workflowName?: string;
  existingNames: string[];
}

/**
 * HTTP Request Naming Patterns
 */
export const httpRequestPatterns: NamingPattern = {
  nodeType: 'httpRequest',
  patterns: [
    {
      priority: 10,
      condition: (config) => config.method === 'GET' && config.url?.includes('/api/users'),
      template: () => 'Fetch Users from API'
    },
    {
      priority: 10,
      condition: (config) => config.method === 'POST' && config.url?.includes('/api/orders'),
      template: () => 'Create New Order'
    },
    {
      priority: 10,
      condition: (config) => config.method === 'PUT' && config.url?.includes('/api/users'),
      template: () => 'Update User Information'
    },
    {
      priority: 10,
      condition: (config) => config.method === 'DELETE' && config.url?.includes('/api/sessions'),
      template: () => 'Delete User Session'
    },
    {
      priority: 8,
      condition: (config) => config.method === 'GET',
      template: (config) => {
        const resource = extractResourceFromUrl(config.url || '');
        return resource ? `Fetch ${resource}` : 'Fetch Data from API';
      }
    },
    {
      priority: 8,
      condition: (config) => config.method === 'POST',
      template: (config) => {
        const resource = extractResourceFromUrl(config.url || '');
        return resource ? `Create ${resource}` : 'Create Resource via API';
      }
    },
    {
      priority: 8,
      condition: (config) => config.method === 'PUT' || config.method === 'PATCH',
      template: (config) => {
        const resource = extractResourceFromUrl(config.url || '');
        return resource ? `Update ${resource}` : 'Update Resource via API';
      }
    },
    {
      priority: 8,
      condition: (config) => config.method === 'DELETE',
      template: (config) => {
        const resource = extractResourceFromUrl(config.url || '');
        return resource ? `Delete ${resource}` : 'Delete Resource via API';
      }
    },
    {
      priority: 5,
      condition: () => true,
      template: () => 'HTTP Request'
    }
  ]
};

/**
 * Database Naming Patterns
 */
export const databasePatterns: NamingPattern = {
  nodeType: 'database',
  patterns: [
    {
      priority: 10,
      condition: (config) => config.operation === 'SELECT' && config.table,
      template: (config) => `Query ${capitalizeFirst(config.table)} Records`
    },
    {
      priority: 10,
      condition: (config) => config.operation === 'INSERT' && config.table,
      template: (config) => `Add Record to ${capitalizeFirst(config.table)}`
    },
    {
      priority: 10,
      condition: (config) => config.operation === 'UPDATE' && config.table,
      template: (config) => `Modify ${capitalizeFirst(config.table)} Records`
    },
    {
      priority: 10,
      condition: (config) => config.operation === 'DELETE' && config.table,
      template: (config) => `Remove ${capitalizeFirst(config.table)} Records`
    },
    {
      priority: 8,
      condition: (config) => config.query?.toLowerCase().includes('select'),
      template: () => 'Query Database'
    },
    {
      priority: 8,
      condition: (config) => config.query?.toLowerCase().includes('insert'),
      template: () => 'Insert into Database'
    },
    {
      priority: 5,
      condition: () => true,
      template: () => 'Database Operation'
    }
  ]
};

/**
 * Email Naming Patterns
 */
export const emailPatterns: NamingPattern = {
  nodeType: 'email',
  patterns: [
    {
      priority: 10,
      condition: (config) => config.subject?.toLowerCase().includes('welcome'),
      template: () => 'Send Welcome Email to User'
    },
    {
      priority: 10,
      condition: (config) => config.subject?.toLowerCase().includes('invoice'),
      template: () => 'Send Invoice to Customer'
    },
    {
      priority: 10,
      condition: (config) => config.subject?.toLowerCase().includes('error') || config.subject?.toLowerCase().includes('alert'),
      template: () => 'Notify Admin of Error'
    },
    {
      priority: 8,
      condition: (config) => config.to?.includes('admin') || config.to?.includes('support'),
      template: () => 'Notify Admin via Email'
    },
    {
      priority: 8,
      condition: (config) => config.subject,
      template: (config) => `Send Email: ${truncate(config.subject, 30)}`
    },
    {
      priority: 5,
      condition: () => true,
      template: () => 'Send Email'
    }
  ]
};

/**
 * Slack Naming Patterns
 */
export const slackPatterns: NamingPattern = {
  nodeType: 'slack',
  patterns: [
    {
      priority: 10,
      condition: (config) => config.channel?.includes('alerts'),
      template: () => 'Send Alert to Slack'
    },
    {
      priority: 10,
      condition: (config) => config.message?.toLowerCase().includes('notification'),
      template: () => 'Send Notification to Slack'
    },
    {
      priority: 8,
      condition: (config) => config.channel,
      template: (config) => `Post to ${config.channel}`
    },
    {
      priority: 5,
      condition: () => true,
      template: () => 'Send Slack Message'
    }
  ]
};

/**
 * Conditional/Branch Naming Patterns
 */
export const conditionalPatterns: NamingPattern = {
  nodeType: 'if',
  patterns: [
    {
      priority: 10,
      condition: (config) => config.condition?.includes('status'),
      template: () => 'Check Status Condition'
    },
    {
      priority: 10,
      condition: (config) => config.condition?.includes('error'),
      template: () => 'Check for Errors'
    },
    {
      priority: 8,
      condition: (config) => config.condition,
      template: (config) => `If ${truncate(config.condition, 25)}`
    },
    {
      priority: 5,
      condition: () => true,
      template: () => 'Conditional Branch'
    }
  ]
};

/**
 * Loop Naming Patterns
 */
export const loopPatterns: NamingPattern = {
  nodeType: 'forEach',
  patterns: [
    {
      priority: 10,
      condition: (config) => config.items?.includes('users'),
      template: () => 'Process Each User'
    },
    {
      priority: 10,
      condition: (config) => config.items?.includes('orders'),
      template: () => 'Process Each Order'
    },
    {
      priority: 8,
      condition: (config) => config.items,
      template: (config) => {
        const itemName = extractVariableName(config.items);
        return itemName ? `Process Each ${capitalizeFirst(itemName)}` : 'Process Each Item';
      }
    },
    {
      priority: 5,
      condition: () => true,
      template: () => 'For Each Loop'
    }
  ]
};

/**
 * Transform/Set Naming Patterns
 */
export const transformPatterns: NamingPattern = {
  nodeType: 'set',
  patterns: [
    {
      priority: 10,
      condition: (config) => config.values?.some((v: any) => v.name?.toLowerCase().includes('email')),
      template: () => 'Prepare Email Data'
    },
    {
      priority: 10,
      condition: (config) => config.values?.some((v: any) => v.name?.toLowerCase().includes('user')),
      template: () => 'Set User Variables'
    },
    {
      priority: 8,
      condition: (config) => config.values?.length === 1,
      template: (config) => `Set ${capitalizeFirst(config.values[0]?.name || 'Value')}`
    },
    {
      priority: 5,
      condition: () => true,
      template: () => 'Transform Data'
    }
  ]
};

/**
 * Webhook/Trigger Naming Patterns
 */
export const webhookPatterns: NamingPattern = {
  nodeType: 'webhook',
  patterns: [
    {
      priority: 10,
      condition: (config) => config.path?.includes('stripe'),
      template: () => 'Trigger: Stripe Webhook'
    },
    {
      priority: 10,
      condition: (config) => config.path?.includes('github'),
      template: () => 'Trigger: GitHub Webhook'
    },
    {
      priority: 8,
      condition: (config) => config.path,
      template: (config) => `Trigger: ${extractWebhookName(config.path)}`
    },
    {
      priority: 5,
      condition: () => true,
      template: () => 'Webhook Trigger'
    }
  ]
};

/**
 * All Naming Patterns Registry
 */
export const NAMING_PATTERNS: Record<string, NamingPattern> = {
  httpRequest: httpRequestPatterns,
  database: databasePatterns,
  mysql: databasePatterns,
  postgres: databasePatterns,
  mongodb: databasePatterns,
  email: emailPatterns,
  sendgrid: emailPatterns,
  mailgun: emailPatterns,
  slack: slackPatterns,
  if: conditionalPatterns,
  switch: conditionalPatterns,
  forEach: loopPatterns,
  whileLoop: loopPatterns,
  set: transformPatterns,
  webhook: webhookPatterns,
};

/**
 * Action-based verb mapping
 */
export const ACTION_VERBS: Record<string, string> = {
  GET: 'Fetch',
  POST: 'Create',
  PUT: 'Update',
  PATCH: 'Modify',
  DELETE: 'Delete',
  SELECT: 'Query',
  INSERT: 'Add',
  UPDATE: 'Modify',
  send: 'Send',
  process: 'Process',
  transform: 'Transform',
  filter: 'Filter',
  merge: 'Merge',
  split: 'Split',
};

/**
 * Helper: Extract resource name from URL
 */
function extractResourceFromUrl(url: string): string | null {
  try {
    // Remove query params and trailing slashes
    const cleanUrl = url.split('?')[0].replace(/\/$/, '');

    // Extract path segments
    const segments = cleanUrl.split('/').filter(s => s.length > 0);

    // Find resource name (usually last meaningful segment, not an ID)
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i];
      // Skip if it looks like an ID (all numbers or UUID)
      if (!/^\d+$/.test(segment) && !/^[0-9a-f-]{36}$/i.test(segment)) {
        return capitalizeFirst(segment.replace(/-/g, ' '));
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Helper: Extract variable name from expression
 */
function extractVariableName(expression: string): string | null {
  try {
    // Match common patterns like $json.items, {{items}}, $node["name"].json.items
    const matches = expression.match(/\.(\w+)(?:\}|\]|$)/);
    if (matches && matches[1]) {
      return matches[1];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Helper: Extract webhook name from path
 */
function extractWebhookName(path: string): string {
  const cleaned = path.replace(/^\//, '').replace(/\/$/, '');
  const parts = cleaned.split('/');
  return capitalizeFirst(parts[0] || 'Webhook');
}

/**
 * Helper: Capitalize first letter
 */
function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Helper: Truncate string
 */
function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Helper: Generate sequential name
 */
export function generateSequentialName(baseName: string, existingNames: string[]): string {
  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  let counter = 1;
  let newName = `${baseName} ${counter}`;

  while (existingNames.includes(newName)) {
    counter++;
    newName = `${baseName} ${counter}`;
  }

  return newName;
}

/**
 * Helper: Check naming consistency
 */
export function checkNamingConsistency(names: string[]): {
  consistent: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for mixed terminology (e.g., User vs Customer)
  const userTerms = names.filter(n => n.toLowerCase().includes('user'));
  const customerTerms = names.filter(n => n.toLowerCase().includes('customer'));

  if (userTerms.length > 0 && customerTerms.length > 0) {
    issues.push('Mixed terminology: Using both "User" and "Customer"');
  }

  // Check for inconsistent casing
  const hasUpperCamelCase = names.some(n => /^[A-Z][a-z]+[A-Z]/.test(n));
  const hasLowerCase = names.some(n => /^[a-z]/.test(n));

  if (hasUpperCamelCase && hasLowerCase) {
    issues.push('Inconsistent casing: Mix of CamelCase and lowercase');
  }

  return {
    consistent: issues.length === 0,
    issues
  };
}
