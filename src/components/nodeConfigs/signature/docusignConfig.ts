import { NodeConfigDefinition, FieldConfig } from '../../../types/nodeConfig';

// Extended FieldConfig to support additional DocuSign-specific types and properties
interface ExtendedFieldConfig extends Omit<FieldConfig, 'type'> {
  type: FieldConfig['type'] | 'credentials' | 'binary' | 'date' | 'url' | 'multiselect';
  credentialTypes?: string[];
  visible?: boolean | ((config?: Record<string, unknown>) => boolean);
  min?: number;
  max?: number;
}

interface ExtendedNodeConfigDefinition extends Omit<NodeConfigDefinition, 'fields' | 'validate'> {
  fields: ExtendedFieldConfig[];
  validation?: Record<string, (value: unknown) => string | null>;
}

// Operation groups for conditional field visibility
const recipientOps = ['recipient_update', 'recipient_get', 'view_recipient'];
const viewOps = ['view_recipient', 'view_sender', 'view_correct'];

export const docusignConfig: ExtendedNodeConfigDefinition = {
  fields: [
    {
      label: 'Authentication',
      field: 'auth',
      type: 'credentials',
      required: true,
      credentialTypes: ['docusign-oauth2'],
      placeholder: 'Select DocuSign credentials',
      tooltip: 'DocuSign OAuth2 authentication'
    },
    {
      label: 'Environment',
      field: 'environment',
      type: 'select',
      options: [
        { value: 'demo', label: 'Demo/Sandbox' },
        { value: 'production', label: 'Production' }
      ],
      defaultValue: 'demo',
      required: true,
      tooltip: 'DocuSign environment to use'
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      options: [
        // Envelope Operations
        { value: 'envelope_create', label: 'Create Envelope' },
        { value: 'envelope_send', label: 'Send Envelope' },
        { value: 'envelope_get', label: 'Get Envelope' },
        { value: 'envelope_list', label: 'List Envelopes' },
        { value: 'envelope_void', label: 'Void Envelope' },
        { value: 'envelope_delete', label: 'Delete Envelope' },
        { value: 'envelope_status', label: 'Get Envelope Status' },
        { value: 'envelope_resend', label: 'Resend Envelope' },
        
        // Document Operations
        { value: 'document_add', label: 'Add Document' },
        { value: 'document_get', label: 'Get Document' },
        { value: 'document_download', label: 'Download Document' },
        { value: 'document_list', label: 'List Documents' },
        
        // Template Operations
        { value: 'template_create', label: 'Create Template' },
        { value: 'template_get', label: 'Get Template' },
        { value: 'template_list', label: 'List Templates' },
        { value: 'template_use', label: 'Create Envelope from Template' },
        { value: 'template_update', label: 'Update Template' },
        { value: 'template_delete', label: 'Delete Template' },
        
        // Recipient Operations
        { value: 'recipient_add', label: 'Add Recipient' },
        { value: 'recipient_update', label: 'Update Recipient' },
        { value: 'recipient_get', label: 'Get Recipient Status' },
        { value: 'recipient_list', label: 'List Recipients' },
        
        // Authentication & Views
        { value: 'view_recipient', label: 'Get Recipient View URL' },
        { value: 'view_sender', label: 'Get Sender View URL' },
        { value: 'view_correct', label: 'Get Correct View URL' },
        
        // Advanced Operations
        { value: 'webhook_create', label: 'Create Webhook' },
        { value: 'webhook_list', label: 'List Webhooks' },
        { value: 'webhook_delete', label: 'Delete Webhook' },
        { value: 'audit_events', label: 'Get Audit Events' },
        { value: 'custom_fields', label: 'Get Custom Fields' }
      ],
      defaultValue: 'envelope_list',
      tooltip: 'The operation to perform in DocuSign'
    },
    {
      label: 'Envelope ID',
      field: 'envelopeId',
      type: 'text',
      placeholder: '12345678-1234-1234-1234-123456789012',
      required: function() {
        const envelopeOps = [
          'envelope_send', 'envelope_get', 'envelope_void', 'envelope_delete',
          'envelope_status', 'envelope_resend', 'document_add', 'document_get',
          'document_download', 'document_list', 'recipient_add', 'recipient_update',
          'recipient_get', 'recipient_list', 'view_recipient', 'view_sender',
          'view_correct', 'audit_events', 'custom_fields'
        ];
        return envelopeOps.includes(this.operation);
      },
      tooltip: 'The unique identifier of the envelope'
    },
    {
      label: 'Template ID',
      field: 'templateId',
      type: 'text',
      placeholder: '12345678-1234-1234-1234-123456789012',
      required: function() {
        const templateOps = [
          'template_get', 'template_use', 'template_update', 'template_delete'
        ];
        return templateOps.includes(this.operation);
      },
      visible: function() {
        const templateOps = [
          'template_get', 'template_use', 'template_update', 'template_delete',
          'envelope_create'
        ];
        return templateOps.includes(this.operation);
      }
    },
    {
      label: 'Document Name',
      field: 'documentName',
      type: 'text',
      placeholder: 'Contract.pdf',
      required: function() {
        return ['envelope_create', 'document_add', 'template_create'].includes(this.operation);
      },
      visible: function() {
        return ['envelope_create', 'document_add', 'template_create'].includes(this.operation);
      }
    },
    {
      label: 'Document Content',
      field: 'documentContent',
      type: 'binary',
      required: function() {
        return ['envelope_create', 'document_add', 'template_create'].includes(this.operation);
      },
      visible: function() {
        return ['envelope_create', 'document_add', 'template_create'].includes(this.operation);
      },
      tooltip: 'Base64 encoded document content or file path'
    },
    {
      label: 'Email Subject',
      field: 'emailSubject',
      type: 'text',
      placeholder: 'Please sign this document',
      required: function() {
        return ['envelope_create', 'envelope_send', 'template_use'].includes(this.operation);
      },
      visible: function() {
        return ['envelope_create', 'envelope_send', 'template_use'].includes(this.operation);
      }
    },
    {
      label: 'Email Message',
      field: 'emailMessage',
      type: 'textarea',
      placeholder: 'Hello, please sign the attached document.',
      required: false,
      visible: function() {
        return ['envelope_create', 'envelope_send', 'template_use'].includes(this.operation);
      }
    },
    {
      label: 'Recipients',
      field: 'recipients',
      type: 'json',
      placeholder: '[{"name": "John Doe", "email": "john@example.com", "role": "signer"}]',
      required: function() {
        return ['envelope_create', 'template_use', 'recipient_add'].includes(this.operation);
      },
      visible: function() {
        return ['envelope_create', 'template_use', 'recipient_add'].includes(this.operation);
      },
      tooltip: 'Array of recipient objects with name, email, and role'
    },
    {
      label: 'Recipient ID',
      field: 'recipientId',
      type: 'text',
      placeholder: '1',
      required: function() {
        return recipientOps.includes(this.operation);
      },
      visible: function() {
        return recipientOps.includes(this.operation);
      }
    },
    {
      label: 'Recipient Name',
      field: 'recipientName',
      type: 'text',
      placeholder: 'John Doe',
      required: function() {
        return ['recipient_add', 'recipient_update'].includes(this.operation);
      },
      visible: function() {
        return ['recipient_add', 'recipient_update'].includes(this.operation);
      }
    },
    {
      label: 'Recipient Email',
      field: 'recipientEmail',
      type: 'email',
      placeholder: 'john@example.com',
      required: function() {
        return ['recipient_add', 'recipient_update'].includes(this.operation);
      },
      visible: function() {
        return ['recipient_add', 'recipient_update'].includes(this.operation);
      }
    },
    {
      label: 'Recipient Role',
      field: 'recipientRole',
      type: 'select',
      options: [
        { value: 'signer', label: 'Signer' },
        { value: 'carbonCopy', label: 'Carbon Copy' },
        { value: 'certifiedDelivery', label: 'Certified Delivery' },
        { value: 'inPersonSigner', label: 'In Person Signer' },
        { value: 'intermediary', label: 'Intermediary' },
        { value: 'editor', label: 'Editor' },
        { value: 'agent', label: 'Agent' }
      ],
      defaultValue: 'signer',
      required: function() {
        return ['recipient_add', 'recipient_update'].includes(this.operation);
      },
      visible: function() {
        return ['recipient_add', 'recipient_update'].includes(this.operation);
      }
    },
    {
      label: 'Signing Order',
      field: 'routingOrder',
      type: 'number',
      placeholder: '1',
      defaultValue: 1,
      min: 1,
      visible: function() {
        return ['envelope_create', 'recipient_add', 'recipient_update'].includes(this.operation);
      },
      tooltip: 'Order in which recipients should sign'
    },
    {
      label: 'Auto Navigation',
      field: 'autoNavigation',
      type: 'boolean',
      defaultValue: true,
      visible: function() {
        return ['envelope_create', 'template_create'].includes(this.operation);
      },
      tooltip: 'Automatically navigate between signature fields'
    },
    {
      label: 'Status',
      field: 'status',
      type: 'select',
      options: [
        { value: 'created', label: 'Created' },
        { value: 'sent', label: 'Sent' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'signed', label: 'Signed' },
        { value: 'completed', label: 'Completed' },
        { value: 'declined', label: 'Declined' },
        { value: 'voided', label: 'Voided' },
        { value: 'deleted', label: 'Deleted' }
      ],
      defaultValue: 'sent',
      visible: function() {
        return this.operation === 'envelope_list';
      },
      tooltip: 'Filter envelopes by status'
    },
    {
      label: 'Date Range From',
      field: 'fromDate',
      type: 'date',
      required: false,
      visible: function() {
        return ['envelope_list', 'audit_events'].includes(this.operation);
      },
      tooltip: 'Start date for filtering'
    },
    {
      label: 'Date Range To',
      field: 'toDate',
      type: 'date',
      required: false,
      visible: function() {
        return ['envelope_list', 'audit_events'].includes(this.operation);
      },
      tooltip: 'End date for filtering'
    },
    {
      label: 'Template Name',
      field: 'templateName',
      type: 'text',
      placeholder: 'Contract Template',
      required: function() {
        return this.operation === 'template_create';
      },
      visible: function() {
        return ['template_create', 'template_update'].includes(this.operation);
      }
    },
    {
      label: 'Template Description',
      field: 'templateDescription',
      type: 'textarea',
      placeholder: 'Standard contract template',
      required: false,
      visible: function() {
        return ['template_create', 'template_update'].includes(this.operation);
      }
    },
    {
      label: 'Tabs Configuration',
      field: 'tabs',
      type: 'json',
      placeholder: '[{"type": "signHere", "documentId": "1", "pageNumber": "1", "xPosition": "100", "yPosition": "100"}]',
      required: false,
      visible: function() {
        return ['envelope_create', 'template_create', 'document_add'].includes(this.operation);
      },
      tooltip: 'Array of tab objects defining signature and form fields'
    },
    {
      label: 'Return URL',
      field: 'returnUrl',
      type: 'url',
      placeholder: 'https://your-app.com/docusign/return',
      required: function() {
        return viewOps.includes(this.operation);
      },
      visible: function() {
        return viewOps.includes(this.operation);
      },
      tooltip: 'URL to redirect to after signing'
    },
    {
      label: 'Authentication Method',
      field: 'authenticationMethod',
      type: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Phone SMS' },
        { value: 'knowledgeBased', label: 'Knowledge Based' },
        { value: 'idCheck', label: 'ID Check' }
      ],
      defaultValue: 'none',
      visible: function() {
        return ['envelope_create', 'recipient_add', 'recipient_update'].includes(this.operation);
      }
    },
    {
      label: 'Webhook URL',
      field: 'webhookUrl',
      type: 'url',
      placeholder: 'https://your-app.com/webhooks/docusign',
      required: function() {
        return this.operation === 'webhook_create';
      },
      visible: function() {
        return this.operation === 'webhook_create';
      }
    },
    {
      label: 'Webhook Events',
      field: 'webhookEvents',
      type: 'multiselect',
      options: [
        { value: 'envelope-sent', label: 'Envelope Sent' },
        { value: 'envelope-delivered', label: 'Envelope Delivered' },
        { value: 'envelope-completed', label: 'Envelope Completed' },
        { value: 'envelope-declined', label: 'Envelope Declined' },
        { value: 'envelope-voided', label: 'Envelope Voided' },
        { value: 'recipient-authenticationfailed', label: 'Authentication Failed' },
        { value: 'recipient-autoresponded', label: 'Auto Responded' },
        { value: 'recipient-declined', label: 'Recipient Declined' },
        { value: 'recipient-delivered', label: 'Recipient Delivered' },
        { value: 'recipient-sent', label: 'Recipient Sent' },
        { value: 'recipient-signed', label: 'Recipient Signed' }
      ],
      defaultValue: ['envelope-completed', 'envelope-declined'],
      required: function() {
        return this.operation === 'webhook_create';
      },
      visible: function() {
        return this.operation === 'webhook_create';
      }
    },
    {
      label: 'Void Reason',
      field: 'voidReason',
      type: 'text',
      placeholder: 'Document no longer needed',
      required: function() {
        return this.operation === 'envelope_void';
      },
      visible: function() {
        return this.operation === 'envelope_void';
      }
    },
    {
      label: 'Folder ID',
      field: 'folderId',
      type: 'text',
      placeholder: 'folder-id',
      required: false,
      visible: function() {
        return ['envelope_list', 'template_list'].includes(this.operation);
      },
      tooltip: 'Filter by folder'
    },
    {
      label: 'Include Tabs',
      field: 'includeTabs',
      type: 'boolean',
      defaultValue: false,
      visible: function() {
        return ['envelope_get', 'template_get'].includes(this.operation);
      },
      tooltip: 'Include tab information in response'
    },
    {
      label: 'Include Recipients',
      field: 'includeRecipients',
      type: 'boolean',
      defaultValue: true,
      visible: function() {
        return ['envelope_get', 'template_get'].includes(this.operation);
      }
    },
    {
      label: 'Page Size',
      field: 'count',
      type: 'number',
      placeholder: '100',
      defaultValue: 100,
      min: 1,
      max: 100,
      visible: function() {
        return ['envelope_list', 'template_list', 'webhook_list'].includes(this.operation);
      }
    },
    {
      label: 'Start Position',
      field: 'startPosition',
      type: 'number',
      placeholder: '0',
      defaultValue: 0,
      min: 0,
      visible: function() {
        return ['envelope_list', 'template_list'].includes(this.operation);
      }
    }
  ],

  validation: {
    envelopeId: (value) => {
      if (value && typeof value === 'string' && !/^[a-zA-Z0-9\-]{8,}$/.test(value)) {
        return 'Invalid envelope ID format';
      }
      return null;
    },
    templateId: (value) => {
      if (value && typeof value === 'string' && !/^[a-zA-Z0-9\-]{8,}$/.test(value)) {
        return 'Invalid template ID format';
      }
      return null;
    },
    recipientEmail: (value) => {
      if (value && typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Invalid email format';
      }
      return null;
    },
    emailSubject: (value) => {
      if (value && typeof value === 'string' && value.length > 100) {
        return 'Email subject cannot exceed 100 characters';
      }
      return null;
    },
    routingOrder: (value) => {
      const num = typeof value === 'string' ? parseInt(value, 10) : typeof value === 'number' ? value : NaN;
      if (!isNaN(num) && (num < 1 || num > 999)) {
        return 'Routing order must be between 1 and 999';
      }
      return null;
    }
  },

  examples: [
    {
      name: 'Send Simple Contract',
      description: 'Create and send a contract for signature',
      config: {
        operation: 'envelope_create',
        emailSubject: 'Please sign the service contract',
        emailMessage: 'Hi there, please review and sign the attached service contract.',
        documentName: 'Service Contract.pdf',
        recipients: [
          {
            name: 'John Smith',
            email: 'john.smith@example.com',
            role: 'signer',
            routingOrder: 1
          }
        ],
        tabs: [
          {
            type: 'signHere',
            documentId: '1',
            pageNumber: '1',
            xPosition: '100',
            yPosition: '200'
          },
          {
            type: 'dateTabLabel',
            documentId: '1',
            pageNumber: '1',
            xPosition: '300',
            yPosition: '200'
          }
        ],
        status: 'sent',
        autoNavigation: true
      }
    },
    {
      name: 'Create Envelope from Template',
      description: 'Use existing template to create new envelope',
      config: {
        operation: 'template_use',
        templateId: '12345678-1234-1234-1234-123456789012',
        emailSubject: 'Employment Contract - Please Sign',
        recipients: [
          {
            name: 'Jane Doe',
            email: 'jane.doe@company.com',
            role: 'signer',
            routingOrder: 1
          },
          {
            name: 'HR Manager',
            email: 'hr@company.com',
            role: 'carbonCopy',
            routingOrder: 2
          }
        ]
      }
    },
    {
      name: 'Setup Webhook Notifications',
      description: 'Create webhook to receive envelope status updates',
      config: {
        operation: 'webhook_create',
        webhookUrl: 'https://api.myapp.com/webhooks/docusign',
        webhookEvents: [
          'envelope-completed',
          'envelope-declined',
          'envelope-voided',
          'recipient-signed'
        ]
      }
    },
    {
      name: 'Get Signing URL',
      description: 'Generate embedded signing URL for recipient',
      config: {
        operation: 'view_recipient',
        envelopeId: '12345678-1234-1234-1234-123456789012',
        recipientId: '1',
        returnUrl: 'https://myapp.com/documents/signed',
        authenticationMethod: 'email'
      }
    }
  ]
};