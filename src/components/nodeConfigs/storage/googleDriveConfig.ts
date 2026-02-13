import { NodeConfigDefinition } from '../../../types/nodeConfig';

export const googleDriveConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'Authentication',
      field: 'auth',
      type: 'credentials',
      required: true,
      credentialTypes: ['google-drive-oauth2'],
      placeholder: 'Select Google Drive credentials',
      tooltip: 'Google Drive OAuth2 authentication'
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      options: [
        // File Operations
        { value: 'file_upload', label: 'Upload File' },
        { value: 'file_download', label: 'Download File' },
        { value: 'file_update', label: 'Update File' },
        { value: 'file_delete', label: 'Delete File' },
        { value: 'file_delete_permanent', label: 'Permanently Delete File' },
        { value: 'file_copy', label: 'Copy File' },
        { value: 'file_move', label: 'Move File' },
        { value: 'file_rename', label: 'Rename File' },
        { value: 'file_get_metadata', label: 'Get File Metadata' },
        { value: 'file_list', label: 'List Files' },
        { value: 'file_search', label: 'Search Files' },
        { value: 'file_export', label: 'Export File' },
        { value: 'file_get_revisions', label: 'Get File Revisions' },
        { value: 'file_restore_revision', label: 'Restore File Revision' },
        
        // Folder Management
        { value: 'folder_create', label: 'Create Folder' },
        { value: 'folder_list_contents', label: 'List Folder Contents' },
        { value: 'folder_move_to', label: 'Move to Folder' },
        { value: 'folder_delete', label: 'Delete Folder' },
        { value: 'folder_get_tree', label: 'Get Folder Tree' },
        { value: 'folder_set_color', label: 'Set Folder Color' },
        
        // Sharing & Permissions
        { value: 'share_file', label: 'Share File' },
        { value: 'permission_update', label: 'Update Permissions' },
        { value: 'permission_remove', label: 'Remove Permissions' },
        { value: 'permission_list', label: 'List Permissions' },
        { value: 'link_create', label: 'Create Shareable Link' },
        { value: 'link_set_expiration', label: 'Set Link Expiration' },
        { value: 'sharing_history', label: 'Get Sharing History' },
        { value: 'ownership_transfer', label: 'Transfer Ownership' },
        
        // Collaboration Features
        { value: 'comment_add', label: 'Add Comment' },
        { value: 'comment_reply', label: 'Reply to Comment' },
        { value: 'comment_resolve', label: 'Resolve Comment' },
        { value: 'comment_list', label: 'List Comments' },
        { value: 'suggestion_get', label: 'Get Suggestions' },
        { value: 'suggestion_accept_reject', label: 'Accept/Reject Suggestions' },
        
        // Advanced Features
        { value: 'watch_changes', label: 'Watch File Changes' },
        { value: 'stop_watching', label: 'Stop Watching' },
        { value: 'get_activity', label: 'Get Activity' },
        { value: 'shortcut_create', label: 'Create Shortcut' },
        { value: 'batch_operations', label: 'Batch Operations' },
        { value: 'quota_get', label: 'Get Storage Quota' },
        { value: 'thumbnail_generate', label: 'Generate Thumbnails' },
        
        // Team Drive Operations
        { value: 'team_drive_create', label: 'Create Team Drive' },
        { value: 'team_drive_list', label: 'List Team Drives' },
        { value: 'team_drive_member_add', label: 'Add Team Drive Member' },
        { value: 'team_drive_member_remove', label: 'Remove Team Drive Member' },
        { value: 'team_drive_update', label: 'Update Team Drive' },
        { value: 'team_drive_delete', label: 'Delete Team Drive' }
      ],
      defaultValue: 'file_list',
      tooltip: 'The operation to perform in Google Drive'
    },
    {
      label: 'File ID',
      field: 'fileId',
      type: 'text',
      placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      required: function() {
        const fileOps = [
          'file_download', 'file_update', 'file_delete', 'file_delete_permanent',
          'file_copy', 'file_move', 'file_rename', 'file_get_metadata',
          'file_export', 'file_get_revisions', 'file_restore_revision',
          'share_file', 'permission_update', 'permission_remove', 'permission_list',
          'link_create', 'link_set_expiration', 'sharing_history', 'ownership_transfer',
          'comment_add', 'comment_list', 'watch_changes', 'stop_watching',
          'get_activity', 'thumbnail_generate'
        ];
        return fileOps.includes(this.operation);
      },
      tooltip: 'The ID of the file or folder'
    },
    {
      label: 'File Name',
      field: 'name',
      type: 'text',
      placeholder: 'My Document.docx',
      required: function() {
        return ['file_upload', 'file_rename', 'folder_create'].includes(this.operation);
      },
      tooltip: 'Name of the file or folder'
    },
    {
      label: 'File Content',
      field: 'content',
      type: 'text',
      required: function() {
        return ['file_upload', 'file_update'].includes(this.operation);
      },
      tooltip: 'Binary data of the file to upload'
    },
    {
      label: 'MIME Type',
      field: 'mimeType',
      type: 'select',
      options: [
        { value: 'application/vnd.google-apps.document', label: 'Google Docs' },
        { value: 'application/vnd.google-apps.spreadsheet', label: 'Google Sheets' },
        { value: 'application/vnd.google-apps.presentation', label: 'Google Slides' },
        { value: 'application/pdf', label: 'PDF' },
        { value: 'application/msword', label: 'Word Document' },
        { value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word Document (DOCX)' },
        { value: 'application/vnd.ms-excel', label: 'Excel Spreadsheet' },
        { value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'Excel Spreadsheet (XLSX)' },
        { value: 'text/plain', label: 'Plain Text' },
        { value: 'text/csv', label: 'CSV' },
        { value: 'image/jpeg', label: 'JPEG Image' },
        { value: 'image/png', label: 'PNG Image' },
        { value: 'application/zip', label: 'ZIP Archive' },
        { value: 'application/json', label: 'JSON' }
      ],
      required: false,
      visible: function() {
        return ['file_upload', 'file_update', 'file_export'].includes(this.operation);
      }
    },
    {
      label: 'Parent Folder ID',
      field: 'parentId',
      type: 'text',
      placeholder: '0B7Ja7Y6WczP5fldUWHpZaGdCQkY2T3BhMF9tNkJNbjdtM2wzRGFQb19ySVBkenBST19iVFk',
      required: false,
      visible: function() {
        return ['file_upload', 'folder_create', 'file_move', 'folder_move_to'].includes(this.operation);
      },
      tooltip: 'Parent folder ID (leave empty for root)'
    },
    {
      label: 'Search Query',
      field: 'query',
      type: 'text',
      placeholder: 'name contains "invoice" and modifiedTime > "2024-01-01"',
      required: function() {
        return this.operation === 'file_search';
      },
      tooltip: 'Google Drive search query syntax'
    },
    {
      label: 'File Fields',
      field: 'fields',
      type: 'multiselect',
      options: [
        { value: 'id', label: 'ID' },
        { value: 'name', label: 'Name' },
        { value: 'mimeType', label: 'MIME Type' },
        { value: 'size', label: 'Size' },
        { value: 'createdTime', label: 'Created Time' },
        { value: 'modifiedTime', label: 'Modified Time' },
        { value: 'parents', label: 'Parent Folders' },
        { value: 'owners', label: 'Owners' },
        { value: 'permissions', label: 'Permissions' },
        { value: 'webViewLink', label: 'Web View Link' },
        { value: 'webContentLink', label: 'Download Link' },
        { value: 'thumbnailLink', label: 'Thumbnail Link' },
        { value: 'starred', label: 'Starred' },
        { value: 'trashed', label: 'Trashed' },
        { value: 'version', label: 'Version' }
      ],
      defaultValue: ['id', 'name', 'mimeType', 'modifiedTime'],
      visible: function() {
        const fieldOps = [
          'file_list', 'file_search', 'file_get_metadata',
          'folder_list_contents', 'folder_get_tree'
        ];
        return fieldOps.includes(this.operation);
      },
      tooltip: 'Fields to include in the response'
    },
    {
      label: 'Order By',
      field: 'orderBy',
      type: 'select',
      options: [
        { value: 'createdTime', label: 'Created Time' },
        { value: 'modifiedTime', label: 'Modified Time' },
        { value: 'name', label: 'Name' },
        { value: 'quotaBytesUsed', label: 'Size' },
        { value: 'viewedByMeTime', label: 'Last Viewed' },
        { value: 'sharedWithMeTime', label: 'Shared Time' }
      ],
      defaultValue: 'modifiedTime',
      visible: function() {
        return ['file_list', 'file_search', 'folder_list_contents'].includes(this.operation);
      }
    },
    {
      label: 'Sort Order',
      field: 'sortOrder',
      type: 'select',
      options: [
        { value: 'ascending', label: 'Ascending' },
        { value: 'descending', label: 'Descending' }
      ],
      defaultValue: 'descending',
      visible: function() {
        return ['file_list', 'file_search', 'folder_list_contents'].includes(this.operation);
      }
    },
    {
      label: 'Email Address',
      field: 'email',
      type: 'email',
      placeholder: 'user@example.com',
      required: function() {
        return ['share_file', 'permission_update', 'ownership_transfer'].includes(this.operation);
      },
      visible: function() {
        const emailOps = [
          'share_file', 'permission_update', 'ownership_transfer',
          'team_drive_member_add'
        ];
        return emailOps.includes(this.operation);
      }
    },
    {
      label: 'Permission Role',
      field: 'role',
      type: 'select',
      options: [
        { value: 'reader', label: 'Reader' },
        { value: 'commenter', label: 'Commenter' },
        { value: 'writer', label: 'Writer' },
        { value: 'owner', label: 'Owner' }
      ],
      defaultValue: 'reader',
      required: function() {
        return ['share_file', 'permission_update'].includes(this.operation);
      },
      visible: function() {
        return ['share_file', 'permission_update', 'team_drive_member_add'].includes(this.operation);
      }
    },
    {
      label: 'Permission ID',
      field: 'permissionId',
      type: 'text',
      placeholder: '01234567890123456789',
      required: function() {
        return ['permission_update', 'permission_remove'].includes(this.operation);
      },
      visible: function() {
        return ['permission_update', 'permission_remove'].includes(this.operation);
      }
    },
    {
      label: 'Link Type',
      field: 'linkType',
      type: 'select',
      options: [
        { value: 'view', label: 'View Only' },
        { value: 'comment', label: 'Comment' },
        { value: 'edit', label: 'Edit' }
      ],
      defaultValue: 'view',
      visible: function() {
        return this.operation === 'link_create';
      }
    },
    {
      label: 'Link Expiration',
      field: 'expirationTime',
      type: 'datetime',
      required: false,
      visible: function() {
        return ['link_create', 'link_set_expiration'].includes(this.operation);
      },
      tooltip: 'When the link should expire'
    },
    {
      label: 'Comment Text',
      field: 'commentText',
      type: 'textarea',
      placeholder: 'Please review this section',
      required: function() {
        return ['comment_add', 'comment_reply'].includes(this.operation);
      },
      visible: function() {
        return ['comment_add', 'comment_reply'].includes(this.operation);
      }
    },
    {
      label: 'Comment ID',
      field: 'commentId',
      type: 'text',
      placeholder: 'AAAABg',
      required: function() {
        return ['comment_reply', 'comment_resolve'].includes(this.operation);
      },
      visible: function() {
        return ['comment_reply', 'comment_resolve', 'comment_list'].includes(this.operation);
      }
    },
    {
      label: 'Export Format',
      field: 'exportFormat',
      type: 'select',
      options: [
        { value: 'pdf', label: 'PDF' },
        { value: 'docx', label: 'Word Document' },
        { value: 'xlsx', label: 'Excel Spreadsheet' },
        { value: 'pptx', label: 'PowerPoint Presentation' },
        { value: 'odt', label: 'OpenDocument Text' },
        { value: 'rtf', label: 'Rich Text Format' },
        { value: 'html', label: 'HTML' },
        { value: 'txt', label: 'Plain Text' },
        { value: 'csv', label: 'CSV' },
        { value: 'jpeg', label: 'JPEG Image' },
        { value: 'png', label: 'PNG Image' },
        { value: 'svg', label: 'SVG Vector' }
      ],
      defaultValue: 'pdf',
      required: function() {
        return this.operation === 'file_export';
      },
      visible: function() {
        return this.operation === 'file_export';
      }
    },
    {
      label: 'Revision ID',
      field: 'revisionId',
      type: 'text',
      placeholder: '1',
      required: function() {
        return this.operation === 'file_restore_revision';
      },
      visible: function() {
        return ['file_get_revisions', 'file_restore_revision'].includes(this.operation);
      }
    },
    {
      label: 'Folder Color',
      field: 'folderColor',
      type: 'select',
      options: [
        { value: 'default', label: 'Default' },
        { value: 'gray', label: 'Gray' },
        { value: 'blue', label: 'Blue' },
        { value: 'green', label: 'Green' },
        { value: 'yellow', label: 'Yellow' },
        { value: 'orange', label: 'Orange' },
        { value: 'red', label: 'Red' },
        { value: 'purple', label: 'Purple' },
        { value: 'pink', label: 'Pink' }
      ],
      defaultValue: 'default',
      required: function() {
        return this.operation === 'folder_set_color';
      },
      visible: function() {
        return this.operation === 'folder_set_color';
      }
    },
    {
      label: 'Team Drive Name',
      field: 'teamDriveName',
      type: 'text',
      placeholder: 'Marketing Team Drive',
      required: function() {
        return this.operation === 'team_drive_create';
      },
      visible: function() {
        return ['team_drive_create', 'team_drive_update'].includes(this.operation);
      }
    },
    {
      label: 'Team Drive ID',
      field: 'teamDriveId',
      type: 'text',
      placeholder: '0ALGpGkRkZYJKUk9PVA',
      required: function() {
        const teamOps = [
          'team_drive_update', 'team_drive_delete', 'team_drive_member_add',
          'team_drive_member_remove'
        ];
        return teamOps.includes(this.operation);
      },
      visible: function() {
        const teamOps = [
          'team_drive_update', 'team_drive_delete', 'team_drive_member_add',
          'team_drive_member_remove', 'team_drive_list'
        ];
        return teamOps.includes(this.operation);
      }
    },
    {
      label: 'Batch Operations',
      field: 'batchRequests',
      type: 'json',
      placeholder: '[{"method": "GET", "id": "file1"}, {"method": "DELETE", "id": "file2"}]',
      required: function() {
        return this.operation === 'batch_operations';
      },
      visible: function() {
        return this.operation === 'batch_operations';
      },
      tooltip: 'Array of batch requests'
    },
    {
      label: 'Include Trashed',
      field: 'includeTrashed',
      type: 'boolean',
      defaultValue: false,
      visible: function() {
        return ['file_list', 'file_search', 'folder_list_contents'].includes(this.operation);
      },
      tooltip: 'Include files in trash'
    },
    {
      label: 'Supports All Drives',
      field: 'supportsAllDrives',
      type: 'boolean',
      defaultValue: true,
      visible: function() {
        const driveOps = [
          'file_list', 'file_search', 'file_get_metadata',
          'folder_list_contents', 'team_drive_list'
        ];
        return driveOps.includes(this.operation);
      },
      tooltip: 'Whether to include Team/Shared drives'
    },
    {
      label: 'Page Size',
      field: 'pageSize',
      type: 'number',
      placeholder: '100',
      defaultValue: 100,
      min: 1,
      max: 1000,
      visible: function() {
        const pageOps = [
          'file_list', 'file_search', 'folder_list_contents',
          'file_get_revisions', 'comment_list', 'permission_list',
          'team_drive_list', 'get_activity'
        ];
        return pageOps.includes(this.operation);
      }
    },
    {
      label: 'Page Token',
      field: 'pageToken',
      type: 'text',
      placeholder: 'Next page token',
      required: false,
      visible: function() {
        const pageOps = [
          'file_list', 'file_search', 'folder_list_contents',
          'file_get_revisions', 'comment_list', 'permission_list',
          'team_drive_list', 'get_activity'
        ];
        return pageOps.includes(this.operation);
      },
      tooltip: 'Token for pagination'
    }
  ],

  validation: {
    name: (value) => {
      const name = value as string;
      if (name && name.length > 255) {
        return 'File name cannot exceed 255 characters';
      }
      if (name && /[\/\\:*?"<>|]/.test(name)) {
        return 'File name contains invalid characters';
      }
      return null;
    },
    query: (value) => {
      const query = value as string;
      if (query && query.length > 1000) {
        return 'Search query cannot exceed 1000 characters';
      }
      return null;
    },
    email: (value) => {
      const email = value as string;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return 'Invalid email format';
      }
      return null;
    },
    pageSize: (value) => {
      const pageSize = value as number;
      if (pageSize && (pageSize < 1 || pageSize > 1000)) {
        return 'Page size must be between 1 and 1000';
      }
      return null;
    }
  },

  examples: [
    {
      name: 'Upload Document',
      description: 'Upload a document to a specific folder',
      config: {
        operation: 'file_upload',
        name: 'Project Report Q1 2024.pdf',
        mimeType: 'application/pdf',
        parentId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
      }
    },
    {
      name: 'Search Files',
      description: 'Find all PDFs modified in the last week',
      config: {
        operation: 'file_search',
        query: 'mimeType="application/pdf" and modifiedTime > "2024-01-24"',
        fields: ['id', 'name', 'size', 'modifiedTime', 'webViewLink'],
        orderBy: 'modifiedTime',
        sortOrder: 'descending',
        pageSize: 50
      }
    },
    {
      name: 'Share with Team',
      description: 'Share a file with edit permissions',
      config: {
        operation: 'share_file',
        fileId: '1sTWaJ_j7PkjzaBWtNc3IzovK5hQf21FbOw9yLeeLPNQ',
        email: 'team@company.com',
        role: 'writer',
        sendNotificationEmail: true
      }
    },
    {
      name: 'Create Team Folder',
      description: 'Create a new shared folder for team collaboration',
      config: {
        operation: 'folder_create',
        name: 'Q1 2024 Projects',
        parentId: 'root',
        folderColor: 'blue'
      }
    }
  ]
};