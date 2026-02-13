import { NodeConfigDefinition } from '../../../types/nodeConfig';

// Helper array for batch operations
const batchOps = ['batch_upload', 'batch_download', 'batch_delete', 'batch_move'];

export const dropboxConfig: NodeConfigDefinition = {
  fields: [
    // Authentication
    {
      label: 'Access Token',
      field: 'accessToken',
      type: 'password',
      required: true,
      tooltip: 'Your Dropbox Access Token'
    },
    {
      label: 'Refresh Token',
      field: 'refreshToken',
      type: 'password',
      required: false,
      tooltip: 'For long-lived access'
    },

    // Operation
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      options: [
        // File Operations
        { value: 'file_get', label: 'Get File' },
        { value: 'file_download', label: 'Download File' },
        { value: 'file_upload', label: 'Upload File' },
        { value: 'file_update', label: 'Update File' },
        { value: 'file_delete', label: 'Delete File' },
        { value: 'file_move', label: 'Move File' },
        { value: 'file_copy', label: 'Copy File' },
        { value: 'file_rename', label: 'Rename File' },
        { value: 'file_get_revisions', label: 'Get File Revisions' },
        { value: 'file_restore', label: 'Restore File' },
        { value: 'file_get_download_link', label: 'Get Download Link' },
        { value: 'file_get_preview_link', label: 'Get Preview Link' },
        { value: 'file_search', label: 'Search Files' },
        { value: 'file_list_versions', label: 'List File Versions' },
        { value: 'file_lock', label: 'Lock File' },
        { value: 'file_unlock', label: 'Unlock File' },
        
        // Folder Operations
        { value: 'folder_get', label: 'Get Folder' },
        { value: 'folder_list', label: 'List Folder' },
        { value: 'folder_create', label: 'Create Folder' },
        { value: 'folder_delete', label: 'Delete Folder' },
        { value: 'folder_move', label: 'Move Folder' },
        { value: 'folder_copy', label: 'Copy Folder' },
        { value: 'folder_rename', label: 'Rename Folder' },
        { value: 'folder_get_size', label: 'Get Folder Size' },
        
        // Sharing Operations
        { value: 'share_create_link', label: 'Create Share Link' },
        { value: 'share_get_link', label: 'Get Share Link' },
        { value: 'share_update_link', label: 'Update Share Link' },
        { value: 'share_delete_link', label: 'Delete Share Link' },
        { value: 'share_list_links', label: 'List Shared Links' },
        { value: 'share_add_folder_member', label: 'Add Folder Member' },
        { value: 'share_remove_folder_member', label: 'Remove Folder Member' },
        { value: 'share_list_folder_members', label: 'List Folder Members' },
        { value: 'share_update_member_permissions', label: 'Update Member Permissions' },
        { value: 'share_transfer_folder_ownership', label: 'Transfer Folder Ownership' },
        
        // Account & Space
        { value: 'account_get_info', label: 'Get Account Info' },
        { value: 'account_get_space_usage', label: 'Get Space Usage' },
        { value: 'account_list_devices', label: 'List Devices' },
        { value: 'account_revoke_device', label: 'Revoke Device' },
        
        // Batch Operations
        { value: 'batch_upload', label: 'Batch Upload' },
        { value: 'batch_download', label: 'Batch Download' },
        { value: 'batch_delete', label: 'Batch Delete' },
        { value: 'batch_move', label: 'Batch Move' }
      ],
      required: true,
      tooltip: 'Dropbox operation to perform'
    },

    // Common Parameters
    {
      label: 'Include Deleted',
      field: 'includeDeleted',
      type: 'checkbox',
      defaultValue: false,
      showWhen: (config?: Record<string, unknown>) => {
        const listOps = [
          'folder_list', 'file_search', 'file_list_versions'
        ];
        const operation = config?.operation as string;
        return listOps.includes(operation);
      }
    },
    {
      label: 'Include Media Info',
      field: 'includeMediaInfo',
      type: 'checkbox',
      defaultValue: false,
      showWhen: (config?: Record<string, unknown>) => {
        const mediaOps = [
          'file_get', 'folder_list', 'file_search'
        ];
        const operation = config?.operation as string;
        return mediaOps.includes(operation);
      }
    },
    {
      label: 'Include Has Explicit Shared Members',
      field: 'includeHasExplicitSharedMembers',
      type: 'checkbox',
      defaultValue: false,
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['folder_list', 'file_get'].includes(operation);
      }
    },
    {
      label: 'Auto Rename',
      field: 'autorename',
      type: 'checkbox',
      defaultValue: false,
      showWhen: (config?: Record<string, unknown>) => {
        const renameOps = [
          'file_upload', 'file_move', 'file_copy',
          'folder_create', 'folder_move', 'folder_copy'
        ];
        const operation = config?.operation as string;
        return renameOps.includes(operation);
      }
    },

    // File/Folder Path
    {
      label: 'Path',
      field: 'path',
      type: 'text',
      placeholder: '/folder/file.txt',
      required: (config?: Record<string, unknown>) => {
        const pathOps = [
          'file_get', 'file_download', 'file_upload', 'file_update',
          'file_delete', 'file_rename', 'file_get_revisions', 'file_restore',
          'file_get_download_link', 'file_get_preview_link', 'file_list_versions',
          'file_lock', 'file_unlock', 'folder_get', 'folder_list',
          'folder_create', 'folder_delete', 'folder_rename', 'folder_get_size',
          'share_create_link', 'share_add_folder_member'
        ];
        const operation = config?.operation as string;
        return pathOps.includes(operation);
      },
      validation: (value) => {
        const strValue = value as string;
        if (strValue && !strValue.startsWith('/')) {
          return 'Path must start with /';
        }
        if (strValue && strValue.length > 260) {
          return 'Path cannot exceed 260 characters';
        }
        return null;
      }
    },

    // File Operations Fields
    {
      label: 'File Content',
      field: 'fileContent',
      type: 'text',
      placeholder: 'File content or base64 encoded data',
      required: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['file_upload', 'file_update'].includes(operation);
      }
    },
    {
      label: 'File Name',
      field: 'fileName',
      type: 'text',
      placeholder: 'document.pdf',
      required: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        const path = config?.path;
        return operation === 'file_upload' && !path;
      }
    },
    {
      label: 'Mode',
      field: 'mode',
      type: 'select',
      options: [
        { value: 'add', label: 'Add (create new)' },
        { value: 'overwrite', label: 'Overwrite' },
        { value: 'update', label: 'Update specific revision' }
      ],
      defaultValue: 'add',
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['file_upload', 'file_update'].includes(operation);
      }
    },
    {
      label: 'Client Modified',
      field: 'clientModified',
      type: 'text',
      placeholder: '2024-01-01T00:00:00Z',
      required: false,
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['file_upload', 'file_update'].includes(operation);
      },
      tooltip: 'ISO 8601 format'
    },
    {
      label: 'Mute',
      field: 'mute',
      type: 'checkbox',
      defaultValue: false,
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['file_upload', 'file_update', 'file_delete'].includes(operation);
      },
      tooltip: 'Suppress notifications'
    },
    {
      label: 'Revision',
      field: 'rev',
      type: 'text',
      placeholder: 'a1c10ce0dd78',
      required: false,
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['file_download', 'file_update', 'file_restore'].includes(operation);
      },
      tooltip: 'Specific revision ID'
    },

    // Move/Copy Operations
    {
      label: 'From Path',
      field: 'fromPath',
      type: 'text',
      placeholder: '/source/file.txt',
      required: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['file_move', 'file_copy', 'folder_move', 'folder_copy'].includes(operation);
      },
      validation: (value) => {
        const strValue = value as string;
        if (strValue && !strValue.startsWith('/')) {
          return 'Path must start with /';
        }
        return null;
      }
    },
    {
      label: 'To Path',
      field: 'toPath',
      type: 'text',
      placeholder: '/destination/file.txt',
      required: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['file_move', 'file_copy', 'folder_move', 'folder_copy'].includes(operation);
      },
      validation: (value) => {
        const strValue = value as string;
        if (strValue && !strValue.startsWith('/')) {
          return 'Path must start with /';
        }
        return null;
      }
    },
    {
      label: 'Allow Shared Folder',
      field: 'allowSharedFolder',
      type: 'checkbox',
      defaultValue: true,
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['file_move', 'file_copy', 'folder_move', 'folder_copy'].includes(operation);
      }
    },
    {
      label: 'Allow Ownership Transfer',
      field: 'allowOwnershipTransfer',
      type: 'checkbox',
      defaultValue: false,
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['file_move', 'folder_move'].includes(operation);
      }
    },

    // Search Parameters
    {
      label: 'Search Query',
      field: 'query',
      type: 'text',
      placeholder: 'invoice 2024',
      required: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return operation === 'file_search';
      }
    },
    {
      label: 'Max Results',
      field: 'maxResults',
      type: 'number',
      placeholder: '100',
      defaultValue: 100,
      validation: (value) => {
        const numValue = value as number;
        if (numValue && (numValue < 1 || numValue > 1000)) {
          return 'Must be between 1 and 1000';
        }
        return null;
      },
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['file_search', 'file_list_versions'].includes(operation);
      }
    },
    {
      label: 'File Status',
      field: 'fileStatus',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'deleted', label: 'Deleted' }
      ],
      defaultValue: 'active',
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return operation === 'file_search';
      }
    },
    {
      label: 'Filename Only',
      field: 'filenameOnly',
      type: 'checkbox',
      defaultValue: false,
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return operation === 'file_search';
      },
      tooltip: 'Search only in filenames'
    },
    {
      label: 'Include Highlights',
      field: 'includeHighlights',
      type: 'checkbox',
      defaultValue: false,
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return operation === 'file_search';
      }
    },

    // Folder Operations Fields
    {
      label: 'Recursive',
      field: 'recursive',
      type: 'checkbox',
      defaultValue: false,
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['folder_list', 'folder_delete', 'folder_get_size'].includes(operation);
      }
    },
    {
      label: 'Include Removed',
      field: 'includeRemoved',
      type: 'checkbox',
      defaultValue: false,
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return operation === 'folder_list';
      }
    },
    {
      label: 'Include Non-Downloadable Files',
      field: 'includeNonDownloadableFiles',
      type: 'checkbox',
      defaultValue: false,
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return operation === 'folder_list';
      }
    },
    {
      label: 'Cursor',
      field: 'cursor',
      type: 'text',
      placeholder: 'AAD...cursor...string',
      required: false,
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return operation === 'folder_list';
      },
      tooltip: 'For continuing listings'
    },
    {
      label: 'Limit',
      field: 'limit',
      type: 'number',
      placeholder: '100',
      defaultValue: 100,
      validation: (value) => {
        const numValue = value as number;
        if (numValue && (numValue < 1 || numValue > 2000)) {
          return 'Must be between 1 and 2000';
        }
        return null;
      },
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return operation === 'folder_list';
      }
    },

    // Sharing Fields
    {
      label: 'Share Link URL',
      field: 'url',
      type: 'text',
      placeholder: 'https://www.dropbox.com/s/...',
      required: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['share_get_link', 'share_update_link', 'share_delete_link'].includes(operation);
      }
    },
    {
      label: 'Require Password',
      field: 'requirePassword',
      type: 'checkbox',
      defaultValue: false,
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['share_create_link', 'share_update_link'].includes(operation);
      }
    },
    {
      label: 'Link Password',
      field: 'linkPassword',
      type: 'password',
      required: (config?: Record<string, unknown>) => {
        const requirePassword = config?.requirePassword as boolean;
        return requirePassword === true;
      },
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['share_create_link', 'share_update_link'].includes(operation);
      }
    },
    {
      label: 'Expires',
      field: 'expires',
      type: 'text',
      placeholder: '2025-12-31T23:59:59Z',
      required: false,
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['share_create_link', 'share_update_link'].includes(operation);
      },
      tooltip: 'ISO 8601 format'
    },
    {
      label: 'Audience',
      field: 'audience',
      type: 'select',
      options: [
        { value: 'public', label: 'Public' },
        { value: 'team', label: 'Team' },
        { value: 'no_one', label: 'No One' }
      ],
      defaultValue: 'public',
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['share_create_link', 'share_update_link'].includes(operation);
      }
    },
    {
      label: 'Access Level',
      field: 'access',
      type: 'select',
      options: [
        { value: 'viewer', label: 'Viewer' },
        { value: 'editor', label: 'Editor' },
        { value: 'max', label: 'Maximum allowed' }
      ],
      defaultValue: 'viewer',
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['share_create_link', 'share_update_link'].includes(operation);
      }
    },
    {
      label: 'Allow Download',
      field: 'allowDownload',
      type: 'checkbox',
      defaultValue: true,
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['share_create_link', 'share_update_link'].includes(operation);
      }
    },

    // Member Management
    {
      label: 'Members',
      field: 'members',
      type: 'json',
      placeholder: '[{"member": {"tag": "email", "email": "user@example.com"}, "accessLevel": "editor"}]',
      required: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return operation === 'share_add_folder_member';
      }
    },
    {
      label: 'Member Email',
      field: 'memberEmail',
      type: 'email',
      placeholder: 'user@example.com',
      required: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['share_remove_folder_member', 'share_update_member_permissions'].includes(operation);
      }
    },
    {
      label: 'Access Level',
      field: 'accessLevel',
      type: 'select',
      options: [
        { value: 'owner', label: 'Owner' },
        { value: 'editor', label: 'Editor' },
        { value: 'viewer', label: 'Viewer' },
        { value: 'viewer_no_comment', label: 'Viewer (No Comment)' }
      ],
      required: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return operation === 'share_update_member_permissions';
      }
    },
    {
      label: 'Quiet',
      field: 'quiet',
      type: 'checkbox',
      defaultValue: false,
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['share_add_folder_member', 'share_remove_folder_member'].includes(operation);
      },
      tooltip: 'Suppress notifications'
    },
    {
      label: 'Custom Message',
      field: 'customMessage',
      type: 'text',
      placeholder: 'Welcome to the project folder!',
      required: false,
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return operation === 'share_add_folder_member';
      }
    },

    // Batch Operations
    {
      label: 'Entries',
      field: 'entries',
      type: 'json',
      placeholder: '[{"path": "/file1.txt", "content": "data1"}, {"path": "/file2.txt", "content": "data2"}]',
      required: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return batchOps.includes(operation);
      }
    },
    {
      label: 'Atomic',
      field: 'atomic',
      type: 'checkbox',
      defaultValue: false,
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return batchOps.includes(operation);
      },
      tooltip: 'All or nothing execution'
    },

    // Account Operations
    {
      label: 'Account ID',
      field: 'accountId',
      type: 'text',
      placeholder: 'dbid:AAH4f99T0taONIb-OurWxbNQ6ywGRopQngc',
      required: false,
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return operation === 'account_get_info';
      }
    },
    {
      label: 'Device ID',
      field: 'deviceId',
      type: 'text',
      placeholder: 'dbdsid:AAAAAAAAAA...',
      required: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return operation === 'account_revoke_device';
      }
    },

    // Advanced Options
    {
      label: 'Strict Conflict',
      field: 'strictConflict',
      type: 'checkbox',
      defaultValue: false,
      showWhen: (config?: Record<string, unknown>) => {
        const operation = config?.operation as string;
        return ['file_upload', 'file_update'].includes(operation);
      }
    }
  ],

  examples: [
    {
      label: 'Upload Document',
      config: {
        accessToken: '${DROPBOX_ACCESS_TOKEN}',
        operation: 'file_upload',
        path: '/Documents/Reports/Q4_2024_Report.pdf',
        fileContent: '{{document.pdfContent}}',
        mode: 'add',
        autorename: true,
        clientModified: new Date().toISOString(),
        mute: false
      }
    },
    {
      label: 'Organize Files by Date',
      config: {
        accessToken: '${DROPBOX_ACCESS_TOKEN}',
        operation: 'file_move',
        fromPath: '/Inbox/{{file.name}}',
        toPath: '/Organized/{{date.year}}/{{date.month}}/{{file.name}}',
        autorename: true,
        allowSharedFolder: false,
        allowOwnershipTransfer: false
      }
    },
    {
      label: 'Create Team Share',
      config: {
        accessToken: '${DROPBOX_ACCESS_TOKEN}',
        operation: 'share_add_folder_member',
        path: '/Projects/{{project.name}}',
        members: [
          {
            member: { tag: 'email', email: '{{teamLead.email}}' },
            accessLevel: 'editor'
          },
          {
            member: { tag: 'email', email: '{{developer.email}}' },
            accessLevel: 'editor'
          },
          {
            member: { tag: 'email', email: '{{designer.email}}' },
            accessLevel: 'viewer'
          }
        ],
        quiet: false,
        customMessage: 'Welcome to the {{project.name}} project folder!'
      }
    },
    {
      label: 'Backup Database',
      config: {
        accessToken: '${DROPBOX_ACCESS_TOKEN}',
        operation: 'file_upload',
        path: '/Backups/Database/db_backup_{{timestamp}}.sql',
        fileContent: '{{database.exportData}}',
        mode: 'add',
        clientModified: new Date().toISOString()
      }
    },
    {
      label: 'Search and Download Reports',
      config: {
        accessToken: '${DROPBOX_ACCESS_TOKEN}',
        operation: 'file_search',
        query: 'monthly report 2024',
        maxResults: 20,
        fileStatus: 'active',
        filenameOnly: false,
        includeHighlights: true
      }
    },
    {
      label: 'Batch Process Images',
      config: {
        accessToken: '${DROPBOX_ACCESS_TOKEN}',
        operation: 'batch_upload',
        entries: [
          {
            path: '/Photos/Processed/image1_edited.jpg',
            content: '{{processedImages[0]}}',
            mode: 'add',
            autorename: true
          },
          {
            path: '/Photos/Processed/image2_edited.jpg',
            content: '{{processedImages[1]}}',
            mode: 'add',
            autorename: true
          }
        ],
        atomic: false
      }
    }
  ]
};