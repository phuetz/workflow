import { NodeConfigDefinition, validators } from '../../../types/nodeConfig';

// Operations that require specific IDs
const needsPageId = ['getPage', 'updatePage', 'archivePage', 'getPageProperty', 'updatePageProperties', 'getBlocks', 'appendBlocks', 'getComments', 'createComment'];
const needsDatabaseId = ['getDatabase', 'queryDatabase', 'updateDatabase'];
const needsBlockId = ['updateBlock', 'deleteBlock'];

export const notionConfig: NodeConfigDefinition = {
  fields: [
    {
      label: 'Integration Token',
      field: 'integrationToken',
      type: 'password',
      placeholder: 'secret_...',
      required: true,
      description: 'Notion Internal Integration Token',
      validation: (value) => {
        if (!value) return 'Integration token is required';
        if (typeof value === 'string' && !value.startsWith('secret_')) {
          return 'Invalid token format (should start with secret_)';
        }
        return null;
      }
    },
    {
      label: 'Notion Version',
      field: 'notionVersion',
      type: 'select',
      defaultValue: '2022-06-28',
      options: [
        { value: '2022-06-28', label: '2022-06-28 (Latest)' },
        { value: '2022-02-22', label: '2022-02-22' },
        { value: '2021-08-16', label: '2021-08-16' }
      ]
    },
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      required: true,
      defaultValue: 'createPage',
      options: [
        { value: 'getPage', label: 'Get Page' },
        { value: 'createPage', label: 'Create Page' },
        { value: 'updatePage', label: 'Update Page' },
        { value: 'archivePage', label: 'Archive Page' },
        { value: 'getDatabase', label: 'Get Database' },
        { value: 'queryDatabase', label: 'Query Database' },
        { value: 'createDatabase', label: 'Create Database' },
        { value: 'updateDatabase', label: 'Update Database' },
        { value: 'getPageProperty', label: 'Get Page Property' },
        { value: 'updatePageProperties', label: 'Update Page Properties' },
        { value: 'getBlocks', label: 'Get Page Blocks' },
        { value: 'appendBlocks', label: 'Append Blocks to Page' },
        { value: 'updateBlock', label: 'Update Block' },
        { value: 'deleteBlock', label: 'Delete Block' },
        { value: 'getUsers', label: 'List Users' },
        { value: 'getUser', label: 'Get User' },
        { value: 'getComments', label: 'Get Comments' },
        { value: 'createComment', label: 'Create Comment' },
        { value: 'search', label: 'Search' }
      ]
    },
    {
      label: 'Page ID',
      field: 'pageId',
      type: 'text',
      placeholder: '123e4567-e89b-12d3-a456-426614174000',
      description: 'Notion page ID (UUID format)',
      validation: (value, config) => {
        if (config && typeof config.operation === 'string' && needsPageId.includes(config.operation) && !value) {
          return 'Page ID is required for this operation';
        }
        if (value && typeof value === 'string' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.replace(/-/g, '').replace(/.{8}(.{4})(.{4})(.{4})(.{12})/, '$&-$1-$2-$3-$4'))) {
          return 'Invalid page ID format (should be UUID)';
        }
        return null;
      }
    },
    {
      label: 'Database ID',
      field: 'databaseId',
      type: 'text',
      placeholder: '123e4567-e89b-12d3-a456-426614174000',
      description: 'Notion database ID (UUID format)',
      validation: (value, config) => {
        if (config && typeof config.operation === 'string' && needsDatabaseId.includes(config.operation) && config.operation !== 'createPage' && !value) {
          return 'Database ID is required for this operation';
        }
        return null;
      }
    },
    {
      label: 'Block ID',
      field: 'blockId',
      type: 'text',
      placeholder: '123e4567-e89b-12d3-a456-426614174000',
      description: 'Block ID for block operations',
      validation: (value, config) => {
        if (config && typeof config.operation === 'string' && needsBlockId.includes(config.operation) && !value) {
          return 'Block ID is required for this operation';
        }
        return null;
      }
    },
    {
      label: 'User ID',
      field: 'userId',
      type: 'text',
      placeholder: '123e4567-e89b-12d3-a456-426614174000',
      description: 'User ID for user operations',
      validation: (value, config) => {
        if (config && config.operation === 'getUser' && !value) {
          return 'User ID is required';
        }
        return null;
      }
    },
    {
      label: 'Parent Type',
      field: 'parentType',
      type: 'select',
      defaultValue: 'database_id',
      options: [
        { value: 'database_id', label: 'Database' },
        { value: 'page_id', label: 'Page' },
        { value: 'workspace', label: 'Workspace' }
      ]
    },
    {
      label: 'Parent ID',
      field: 'parentId',
      type: 'text',
      placeholder: '123e4567-e89b-12d3-a456-426614174000',
      description: 'Parent database or page ID',
      validation: (value, config) => {
        if (config && config.operation === 'createPage' && config.parentType !== 'workspace' && !value) {
          return 'Parent ID is required when creating pages';
        }
        return null;
      }
    },
    {
      label: 'Page Title',
      field: 'pageTitle',
      type: 'text',
      placeholder: 'My New Page',
      description: 'Title for new page',
      validation: (value, config) => {
        if (config && config.operation === 'createPage' && !value) {
          return 'Page title is required';
        }
        return null;
      }
    },
    {
      label: 'Page Properties',
      field: 'pageProperties',
      type: 'json',
      placeholder: '{"Name": {"title": [{"text": {"content": "{{$json.title}}"}}]}, "Status": {"select": {"name": "In Progress"}}}',
      description: 'Page properties as JSON object',
      validation: validators.json
    },
    {
      label: 'Page Content (Blocks)',
      field: 'pageContent',
      type: 'json',
      placeholder: '[{"object": "block", "type": "paragraph", "paragraph": {"rich_text": [{"type": "text", "text": {"content": "Hello World!"}}]}}]',
      description: 'Page content as array of blocks',
      validation: validators.json
    },
    {
      label: 'Database Title',
      field: 'databaseTitle',
      type: 'text',
      placeholder: 'My Database',
      description: 'Title for new database'
    },
    {
      label: 'Database Properties',
      field: 'databaseProperties',
      type: 'json',
      placeholder: '{"Name": {"title": {}}, "Status": {"select": {"options": [{"name": "Not started", "color": "red"}, {"name": "In progress", "color": "yellow"}, {"name": "Done", "color": "green"}]}}}',
      description: 'Database schema properties',
      validation: validators.json
    },
    {
      label: 'Query Filter',
      field: 'queryFilter',
      type: 'json',
      placeholder: '{"property": "Status", "select": {"equals": "In Progress"}}',
      description: 'Filter for database queries',
      validation: validators.json
    },
    {
      label: 'Query Sorts',
      field: 'querySorts',
      type: 'json',
      placeholder: '[{"property": "Created", "direction": "descending"}]',
      description: 'Sort criteria for database queries',
      validation: validators.json
    },
    {
      label: 'Start Cursor',
      field: 'startCursor',
      type: 'text',
      placeholder: 'cursor-string',
      description: 'Pagination cursor for queries'
    },
    {
      label: 'Page Size',
      field: 'pageSize',
      type: 'number',
      placeholder: '100',
      defaultValue: 100,
      description: 'Number of results per page (max 100)'
    },
    {
      label: 'Property ID',
      field: 'propertyId',
      type: 'text',
      placeholder: 'property-id',
      description: 'Property ID for property operations'
    },
    {
      label: 'Blocks to Append',
      field: 'blocksToAppend',
      type: 'json',
      placeholder: '[{"object": "block", "type": "heading_1", "heading_1": {"rich_text": [{"type": "text", "text": {"content": "New Section"}}]}}]',
      description: 'Array of blocks to append',
      validation: validators.json
    },
    {
      label: 'Block Content',
      field: 'blockContent',
      type: 'json',
      placeholder: '{"paragraph": {"rich_text": [{"type": "text", "text": {"content": "Updated content"}}]}}',
      description: 'Updated block content',
      validation: validators.json
    },
    {
      label: 'Comment Text',
      field: 'commentText',
      type: 'text',
      placeholder: 'This is a comment',
      description: 'Comment text content',
      validation: (value, config) => {
        if (config && config.operation === 'createComment' && !value) {
          return 'Comment text is required';
        }
        return null;
      }
    },
    {
      label: 'Discussion ID',
      field: 'discussionId',
      type: 'text',
      placeholder: 'discussion-id',
      description: 'Discussion ID for comments'
    },
    {
      label: 'Search Query',
      field: 'searchQuery',
      type: 'text',
      placeholder: 'search term',
      description: 'Text to search for',
      validation: (value, config) => {
        if (config && config.operation === 'search' && !value) {
          return 'Search query is required';
        }
        return null;
      }
    },
    {
      label: 'Search Filter',
      field: 'searchFilter',
      type: 'json',
      placeholder: '{"property": "object", "value": "page"}',
      description: 'Filter for search results',
      validation: validators.json
    },
    {
      label: 'Search Sort',
      field: 'searchSort',
      type: 'json',
      placeholder: '{"direction": "descending", "timestamp": "last_edited_time"}',
      description: 'Sort for search results',
      validation: validators.json
    },
    {
      label: 'Icon Type',
      field: 'iconType',
      type: 'select',
      defaultValue: 'emoji',
      options: [
        { value: 'emoji', label: 'Emoji' },
        { value: 'external', label: 'External URL' },
        { value: 'file', label: 'Uploaded File' }
      ]
    },
    {
      label: 'Icon Value',
      field: 'iconValue',
      type: 'text',
      placeholder: '📄 or https://example.com/icon.png',
      description: 'Emoji or URL for page/database icon'
    },
    {
      label: 'Cover Type',
      field: 'coverType',
      type: 'select',
      defaultValue: 'external',
      options: [
        { value: 'external', label: 'External URL' },
        { value: 'file', label: 'Uploaded File' }
      ]
    },
    {
      label: 'Cover URL',
      field: 'coverUrl',
      type: 'text',
      placeholder: 'https://example.com/cover.jpg',
      description: 'Cover image URL',
      validation: validators.url
    },
    {
      label: 'Archived',
      field: 'archived',
      type: 'checkbox',
      defaultValue: false,
      description: 'Archive/unarchive page'
    }
  ],

  validate: (config) => {
    const errors: Record<string, string> = {};

    // Integration token is always required
    if (!config.integrationToken) {
      errors.integrationToken = 'Integration token is required';
    }

    // Operation-specific validation
    switch (config.operation) {
      case 'createPage':
        if (!config.pageTitle) errors.pageTitle = 'Page title is required';
        if (config.parentType !== 'workspace' && !config.parentId) {
          errors.parentId = 'Parent ID is required';
        }
        break;
      
      case 'queryDatabase':
        if (!config.databaseId) errors.databaseId = 'Database ID is required';
        break;
      
      case 'createDatabase':
        if (!config.databaseTitle) errors.databaseTitle = 'Database title is required';
        if (!config.databaseProperties) errors.databaseProperties = 'Database properties are required';
        break;
      
      case 'createComment':
        if (!config.commentText) errors.commentText = 'Comment text is required';
        if (!config.pageId) errors.pageId = 'Page ID is required for comments';
        break;
      
      case 'search':
        if (!config.searchQuery) errors.searchQuery = 'Search query is required';
        break;
      
      case 'appendBlocks':
        if (!config.pageId) errors.pageId = 'Page ID is required';
        if (!config.blocksToAppend) errors.blocksToAppend = 'Blocks to append are required';
        break;
    }

    return errors;
  },

  transform: (config) => {
    // Parse JSON fields
    const jsonFields = [
      'pageProperties', 'pageContent', 'databaseProperties', 'queryFilter',
      'querySorts', 'blocksToAppend', 'blockContent', 'searchFilter', 'searchSort'
    ];
    
    jsonFields.forEach(field => {
      if (config[field] && typeof config[field] === 'string') {
        try {
          config[field] = JSON.parse(config[field]);
        } catch (e) {
          // Keep as string
        }
      }
    });

    // Set API URL and headers
    config.apiUrl = 'https://api.notion.com/v1';
    config.headers = {
      'Authorization': `Bearer ${config.integrationToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': config.notionVersion
    };

    // Build parent object for page creation
    if (config.operation === 'createPage') {
      if (config.parentType === 'workspace') {
        config.parent = { type: 'workspace', workspace: true };
      } else if (config.parentType === 'database_id') {
        config.parent = { type: 'database_id', database_id: config.parentId };
      } else if (config.parentType === 'page_id') {
        config.parent = { type: 'page_id', page_id: config.parentId };
      }
    }

    // Build icon object
    if (config.iconValue) {
      if (config.iconType === 'emoji') {
        config.icon = { type: 'emoji', emoji: config.iconValue };
      } else if (config.iconType === 'external') {
        config.icon = { type: 'external', external: { url: config.iconValue } };
      }
    }

    // Build cover object
    if (config.coverUrl) {
      config.cover = { type: 'external', external: { url: config.coverUrl } };
    }

    return config;
  },

  examples: [
    {
      label: 'Create Project Page',
      config: {
        integrationToken: 'secret_YOUR_TOKEN',
        operation: 'createPage',
        parentType: 'database_id',
        parentId: '123e4567-e89b-12d3-a456-426614174000',
        pageTitle: '{{$json.projectName}}',
        pageProperties: JSON.stringify({
          Name: { title: [{ text: { content: '{{$json.projectName}}' } }] },
          Status: { select: { name: 'In Progress' } },
          Priority: { select: { name: '{{$json.priority}}' } },
          'Due Date': { date: { start: '{{$json.dueDate}}' } },
          Assignee: { people: [{ id: '{{$json.assigneeId}}' }] }
        }, null, 2),
        iconType: 'emoji',
        iconValue: '📋'
      }
    },
    {
      label: 'Query Tasks Database',
      config: {
        integrationToken: 'secret_YOUR_TOKEN',
        operation: 'queryDatabase',
        databaseId: '123e4567-e89b-12d3-a456-426614174000',
        queryFilter: JSON.stringify({
          and: [
            { property: 'Status', select: { equals: 'In Progress' } },
            { property: 'Assignee', people: { contains: '{{$json.userId}}' } }
          ]
        }, null, 2),
        querySorts: JSON.stringify([
          { property: 'Priority', direction: 'descending' },
          { property: 'Due Date', direction: 'ascending' }
        ], null, 2),
        pageSize: 50
      }
    },
    {
      label: 'Create Meeting Notes',
      config: {
        integrationToken: 'secret_YOUR_TOKEN',
        operation: 'createPage',
        parentType: 'page_id',
        parentId: '123e4567-e89b-12d3-a456-426614174000',
        pageTitle: 'Meeting Notes - {{$json.meetingDate}}',
        pageContent: JSON.stringify([
          {
            object: 'block',
            type: 'heading_1',
            heading_1: { rich_text: [{ type: 'text', text: { content: '{{$json.meetingTitle}}' } }] }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: [{ type: 'text', text: { content: 'Date: {{$json.meetingDate}}' } }] }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: [{ type: 'text', text: { content: 'Attendees: {{$json.attendees}}' } }] }
          },
          {
            object: 'block',
            type: 'heading_2',
            heading_2: { rich_text: [{ type: 'text', text: { content: 'Agenda' } }] }
          },
          {
            object: 'block',
            type: 'bulleted_list_item',
            bulleted_list_item: { rich_text: [{ type: 'text', text: { content: '{{$json.agendaItem1}}' } }] }
          }
        ], null, 2),
        iconType: 'emoji',
        iconValue: '📝'
      }
    },
    {
      label: 'Update Page Status',
      config: {
        integrationToken: 'secret_YOUR_TOKEN',
        operation: 'updatePageProperties',
        pageId: '{{$json.pageId}}',
        pageProperties: JSON.stringify({
          Status: { select: { name: '{{$json.newStatus}}' } },
          'Last Updated': { date: { start: '{{$now}}' } },
          Notes: { rich_text: [{ type: 'text', text: { content: '{{$json.updateNotes}}' } }] }
        }, null, 2)
      }
    },
    {
      label: 'Add Comment to Page',
      config: {
        integrationToken: 'secret_YOUR_TOKEN',
        operation: 'createComment',
        pageId: '{{$json.pageId}}',
        commentText: '{{$json.commentText}}\n\nAdded via workflow at {{$now}}'
      }
    },
    {
      label: 'Search for Pages',
      config: {
        integrationToken: 'secret_YOUR_TOKEN',
        operation: 'search',
        searchQuery: '{{$json.searchTerm}}',
        searchFilter: JSON.stringify({
          property: 'object',
          value: 'page'
        }, null, 2),
        searchSort: JSON.stringify({
          direction: 'descending',
          timestamp: 'last_edited_time'
        }, null, 2),
        pageSize: 20
      }
    }
  ]
};