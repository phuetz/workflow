import { NodeConfigDefinition } from '../../../types/nodeConfig';

export const boxConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'Authentication',
      field: 'auth',
      type: 'credentials',
      required: true,
      credentialTypes: ['box-oauth2'],
      placeholder: 'Select Box OAuth2 credentials',
      tooltip: 'Box OAuth 2.0 authentication credentials'
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      options: [
        // File Operations
        { value: 'file_get', label: 'Get File Info' },
        { value: 'file_download', label: 'Download File' },
        { value: 'file_upload', label: 'Upload File' },
        { value: 'file_update', label: 'Update File' },
        { value: 'file_delete', label: 'Delete File' },
        { value: 'file_copy', label: 'Copy File' },
        { value: 'file_move', label: 'Move File' },
        { value: 'file_rename', label: 'Rename File' },
        { value: 'file_get_versions', label: 'Get File Versions' },
        { value: 'file_restore_version', label: 'Restore File Version' },
        { value: 'file_lock', label: 'Lock File' },
        { value: 'file_unlock', label: 'Unlock File' },
        
        // Folder Operations
        { value: 'folder_create', label: 'Create Folder' },
        { value: 'folder_get', label: 'Get Folder Info' },
        { value: 'folder_list', label: 'List Folder Contents' },
        { value: 'folder_update', label: 'Update Folder' },
        { value: 'folder_delete', label: 'Delete Folder' },
        { value: 'folder_copy', label: 'Copy Folder' },
        { value: 'folder_move', label: 'Move Folder' },
        { value: 'folder_rename', label: 'Rename Folder' },
        
        // Collaboration
        { value: 'collaboration_add', label: 'Add Collaborator' },
        { value: 'collaboration_update', label: 'Update Collaboration' },
        { value: 'collaboration_remove', label: 'Remove Collaborator' },
        { value: 'collaboration_list', label: 'List Collaborators' },
        { value: 'collaboration_pending', label: 'List Pending Collaborations' },
        
        // Sharing
        { value: 'share_link_create', label: 'Create Shared Link' },
        { value: 'share_link_get', label: 'Get Shared Link' },
        { value: 'share_link_update', label: 'Update Shared Link' },
        { value: 'share_link_delete', label: 'Delete Shared Link' },
        
        // Comments
        { value: 'comment_create', label: 'Create Comment' },
        { value: 'comment_get', label: 'Get Comment' },
        { value: 'comment_update', label: 'Update Comment' },
        { value: 'comment_delete', label: 'Delete Comment' },
        { value: 'comment_list', label: 'List Comments' },
        
        // Collections
        { value: 'collection_list', label: 'List Collections' },
        { value: 'collection_items', label: 'Get Collection Items' },
        { value: 'collection_add_item', label: 'Add to Collection' },
        { value: 'collection_remove_item', label: 'Remove from Collection' },
        
        // Search
        { value: 'search', label: 'Search Files/Folders' },
        { value: 'metadata_search', label: 'Search by Metadata' },
        
        // Metadata
        { value: 'metadata_create', label: 'Create Metadata' },
        { value: 'metadata_get', label: 'Get Metadata' },
        { value: 'metadata_update', label: 'Update Metadata' },
        { value: 'metadata_delete', label: 'Delete Metadata' },
        
        // Tasks
        { value: 'task_create', label: 'Create Task' },
        { value: 'task_get', label: 'Get Task' },
        { value: 'task_update', label: 'Update Task' },
        { value: 'task_delete', label: 'Delete Task' }
      ],
      defaultValue: 'file_get',
      tooltip: 'The operation to perform in Box'
    },
    {
      label: 'File/Folder ID',
      field: 'itemId',
      type: 'text',
      placeholder: '123456789',
      required: function() {
        const idOps = [
          'file_get', 'file_download', 'file_update', 'file_delete',
          'file_copy', 'file_move', 'file_rename', 'file_get_versions',
          'file_restore_version', 'file_lock', 'file_unlock',
          'folder_get', 'folder_list', 'folder_update', 'folder_delete',
          'folder_copy', 'folder_move', 'folder_rename',
          'collaboration_list', 'comment_list', 'comment_create',
          'metadata_create', 'metadata_get', 'metadata_update', 'metadata_delete',
          'share_link_create', 'share_link_get', 'share_link_update', 'share_link_delete',
          'task_create', 'collection_add_item', 'collection_remove_item'
        ];
        return idOps.includes(this.operation);
      },
      tooltip: 'The ID of the file or folder'
    },
    {
      label: 'Parent Folder ID',
      field: 'parentId',
      type: 'text',
      placeholder: '0',
      required: function() {
        return ['file_upload', 'folder_create', 'file_copy', 'folder_copy'].includes(this.operation);
      },
      defaultValue: '0',
      tooltip: 'Parent folder ID (0 for root folder)'
    },
    {
      label: 'Name',
      field: 'name',
      type: 'text',
      placeholder: 'Document.pdf',
      required: function() {
        return ['file_upload', 'file_rename', 'folder_create', 'folder_rename'].includes(this.operation);
      },
      tooltip: 'Name of the file or folder'
    },
    {
      label: 'File Content',
      field: 'content',
      type: 'text',
      required: function() {
        return this.operation === 'file_upload' || this.operation === 'file_update';
      },
      tooltip: 'Binary data of the file to upload'
    },
    {
      label: 'Description',
      field: 'description',
      type: 'text',
      placeholder: 'File description',
      required: false,
      visible: function() {
        return ['file_upload', 'file_update', 'folder_create', 'folder_update'].includes(this.operation);
      }
    },
    {
      label: 'Collaborator Email',
      field: 'collaboratorEmail',
      type: 'email',
      placeholder: 'user@example.com',
      required: function() {
        return this.operation === 'collaboration_add';
      },
      tooltip: 'Email of the collaborator to add'
    },
    {
      label: 'Collaboration Role',
      field: 'role',
      type: 'select',
      options: [
        { value: 'editor', label: 'Editor' },
        { value: 'viewer', label: 'Viewer' },
        { value: 'previewer', label: 'Previewer' },
        { value: 'uploader', label: 'Uploader' },
        { value: 'previewer_uploader', label: 'Previewer Uploader' },
        { value: 'viewer_uploader', label: 'Viewer Uploader' },
        { value: 'co-owner', label: 'Co-owner' }
      ],
      defaultValue: 'viewer',
      required: function() {
        return ['collaboration_add', 'collaboration_update'].includes(this.operation);
      }
    },
    {
      label: 'Collaboration ID',
      field: 'collaborationId',
      type: 'text',
      placeholder: '123456789',
      required: function() {
        return ['collaboration_update', 'collaboration_remove'].includes(this.operation);
      }
    },
    {
      label: 'Search Query',
      field: 'query',
      type: 'text',
      placeholder: 'contract type:pdf',
      required: function() {
        return ['search', 'metadata_search'].includes(this.operation);
      },
      tooltip: 'Search query string'
    },
    {
      label: 'Search Scope',
      field: 'scope',
      type: 'select',
      options: [
        { value: 'user_content', label: 'User Content' },
        { value: 'enterprise_content', label: 'Enterprise Content' }
      ],
      defaultValue: 'user_content',
      visible: function() {
        return ['search', 'metadata_search'].includes(this.operation);
      }
    },
    {
      label: 'File Type Filter',
      field: 'fileExtensions',
      type: 'text',
      placeholder: 'pdf,docx,xlsx',
      required: false,
      visible: function() {
        return this.operation === 'search';
      },
      tooltip: 'Comma-separated file extensions to filter'
    },
    {
      label: 'Content Types',
      field: 'contentTypes',
      type: 'multiselect',
      options: [
        { value: 'name', label: 'Name' },
        { value: 'description', label: 'Description' },
        { value: 'file_content', label: 'File Content' },
        { value: 'comments', label: 'Comments' },
        { value: 'tags', label: 'Tags' }
      ],
      defaultValue: ['name'],
      visible: function() {
        return this.operation === 'search';
      }
    },
    {
      label: 'Shared Link Access',
      field: 'access',
      type: 'select',
      options: [
        { value: 'open', label: 'Open (Anyone with link)' },
        { value: 'company', label: 'Company' },
        { value: 'collaborators', label: 'Collaborators Only' }
      ],
      defaultValue: 'open',
      required: function() {
        return this.operation === 'share_link_create';
      }
    },
    {
      label: 'Link Password',
      field: 'password',
      type: 'password',
      placeholder: 'Optional password',
      required: false,
      visible: function() {
        return ['share_link_create', 'share_link_update'].includes(this.operation);
      }
    },
    {
      label: 'Link Expiration',
      field: 'unsharedAt',
      type: 'datetime',
      required: false,
      visible: function() {
        return ['share_link_create', 'share_link_update'].includes(this.operation);
      },
      tooltip: 'When the shared link should expire'
    },
    {
      label: 'Can Download',
      field: 'canDownload',
      type: 'boolean',
      defaultValue: true,
      visible: function() {
        return ['share_link_create', 'share_link_update'].includes(this.operation);
      }
    },
    {
      label: 'Comment Text',
      field: 'message',
      type: 'textarea',
      placeholder: 'Your comment here',
      required: function() {
        return ['comment_create', 'comment_update'].includes(this.operation);
      }
    },
    {
      label: 'Comment ID',
      field: 'commentId',
      type: 'text',
      placeholder: '123456789',
      required: function() {
        return ['comment_get', 'comment_update', 'comment_delete'].includes(this.operation);
      }
    },
    {
      label: 'Task Action',
      field: 'action',
      type: 'select',
      options: [
        { value: 'review', label: 'Review' },
        { value: 'complete', label: 'Complete' }
      ],
      defaultValue: 'review',
      required: function() {
        return this.operation === 'task_create';
      }
    },
    {
      label: 'Task Message',
      field: 'taskMessage',
      type: 'textarea',
      placeholder: 'Task description',
      required: function() {
        return this.operation === 'task_create';
      }
    },
    {
      label: 'Due Date',
      field: 'dueAt',
      type: 'datetime',
      required: false,
      visible: function() {
        return this.operation === 'task_create';
      }
    },
    {
      label: 'Metadata Template',
      field: 'template',
      type: 'select',
      options: [
        { value: 'properties', label: 'Properties' },
        { value: 'marketingInfo', label: 'Marketing Info' },
        { value: 'customerInfo', label: 'Customer Info' },
        { value: 'contractInfo', label: 'Contract Info' },
        { value: 'custom', label: 'Custom Template' }
      ],
      defaultValue: 'properties',
      required: function() {
        return ['metadata_create', 'metadata_get', 'metadata_update', 'metadata_delete'].includes(this.operation);
      }
    },
    {
      label: 'Metadata Values',
      field: 'metadata',
      type: 'json',
      placeholder: '{"department": "Sales", "status": "Active"}',
      required: function() {
        return ['metadata_create', 'metadata_update'].includes(this.operation);
      },
      tooltip: 'JSON object with metadata key-value pairs'
    },
    {
      label: 'Version ID',
      field: 'versionId',
      type: 'text',
      placeholder: '123456789',
      required: function() {
        return this.operation === 'file_restore_version';
      },
      tooltip: 'The version ID to restore'
    },
    {
      label: 'Collection ID',
      field: 'collectionId',
      type: 'text',
      placeholder: '123456789',
      required: function() {
        return ['collection_items', 'collection_add_item', 'collection_remove_item'].includes(this.operation);
      }
    },
    {
      label: 'Fields',
      field: 'fields',
      type: 'multiselect',
      options: [
        { value: 'id', label: 'ID' },
        { value: 'name', label: 'Name' },
        { value: 'description', label: 'Description' },
        { value: 'size', label: 'Size' },
        { value: 'created_at', label: 'Created At' },
        { value: 'modified_at', label: 'Modified At' },
        { value: 'created_by', label: 'Created By' },
        { value: 'modified_by', label: 'Modified By' },
        { value: 'owned_by', label: 'Owned By' },
        { value: 'shared_link', label: 'Shared Link' },
        { value: 'permissions', label: 'Permissions' },
        { value: 'tags', label: 'Tags' },
        { value: 'metadata', label: 'Metadata' }
      ],
      defaultValue: ['id', 'name', 'size', 'modified_at'],
      visible: function() {
        const fieldsOps = [
          'file_get', 'folder_get', 'folder_list', 'search',
          'collection_items', 'collaboration_list'
        ];
        return fieldsOps.includes(this.operation);
      },
      tooltip: 'Fields to include in the response'
    },
    {
      label: 'Limit',
      field: 'limit',
      type: 'number',
      placeholder: '100',
      defaultValue: 100,
      min: 1,
      max: 1000,
      visible: function() {
        const limitOps = [
          'folder_list', 'search', 'collaboration_list', 'comment_list',
          'collection_items', 'file_get_versions', 'collaboration_pending'
        ];
        return limitOps.includes(this.operation);
      }
    },
    {
      label: 'Offset',
      field: 'offset',
      type: 'number',
      placeholder: '0',
      defaultValue: 0,
      min: 0,
      visible: function() {
        const offsetOps = [
          'folder_list', 'search', 'collaboration_list', 'comment_list',
          'collection_items', 'collaboration_pending'
        ];
        return offsetOps.includes(this.operation);
      }
    }
  ],

  validation: {
    itemId: (value) => {
      if (value && typeof value === 'string' && !/^\d+$/.test(value)) {
        return 'Item ID must be numeric';
      }
      return null;
    },
    name: (value) => {
      if (value && typeof value === 'string' && value.length > 255) {
        return 'Name cannot exceed 255 characters';
      }
      if (value && typeof value === 'string' && /[<>:"|?*\/\\]/.test(value)) {
        return 'Name contains invalid characters';
      }
      return null;
    },
    query: (value) => {
      if (value && typeof value === 'string' && value.length > 500) {
        return 'Search query cannot exceed 500 characters';
      }
      return null;
    },
    fileExtensions: (value) => {
      if (value && typeof value === 'string' && !/^[a-zA-Z0-9,\s]+$/.test(value)) {
        return 'Invalid file extensions format';
      }
      return null;
    }
  },

  examples: [
    {
      name: 'Upload Document to Root',
      description: 'Upload a PDF document to the root folder',
      config: {
        operation: 'file_upload',
        parentId: '0',
        name: 'contract-2024.pdf',
        description: 'Annual contract for 2024'
      }
    },
    {
      name: 'Search for Contracts',
      description: 'Search for all PDF contracts in the enterprise',
      config: {
        operation: 'search',
        query: 'contract type:pdf',
        scope: 'enterprise_content',
        fileExtensions: 'pdf',
        contentTypes: ['name', 'file_content'],
        limit: 50
      }
    },
    {
      name: 'Add Collaborator to Folder',
      description: 'Add a user as editor to a project folder',
      config: {
        operation: 'collaboration_add',
        itemId: '123456789',
        collaboratorEmail: 'jane.doe@company.com',
        role: 'editor'
      }
    },
    {
      name: 'Create Shared Link',
      description: 'Create a password-protected shared link that expires',
      config: {
        operation: 'share_link_create',
        itemId: '987654321',
        access: 'company',
        password: 'SecurePass123',
        canDownload: false
      }
    }
  ]
};