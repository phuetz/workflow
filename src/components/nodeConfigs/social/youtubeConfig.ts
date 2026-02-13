import { NodeConfigDefinition } from '../types';

export const youtubeConfig: NodeConfigDefinition = {
  fields: [
    // Authentication Configuration
    {
      label: 'Authentication Method',
      field: 'authMethod',
      type: 'select',
      options: [
        { value: 'oauth2', label: 'OAuth 2.0 (User Context)' },
        { value: 'api_key', label: 'API Key (Public Data Only)' }
      ],
      required: true,
      defaultValue: 'oauth2'
    },
    {
      label: 'Access Token',
      field: 'accessToken',
      type: 'password',
      placeholder: 'your-access-token',
      required: (config) => { return config?.authMethod === 'oauth2'; },
      validation: (value, config) => {
        if (config?.authMethod === 'oauth2' && !value) {
          return 'Access token is required for OAuth authentication';
        }
        return null;
      }
    },
    {
      label: 'API Key',
      field: 'apiKey',
      type: 'password',
      placeholder: 'your-api-key',
      required: (config) => { return config?.authMethod === 'api_key'; },
      validation: (value, config) => {
        if (config?.authMethod === 'api_key' && !value) {
          return 'API key is required';
        }
        return null;
      }
    },
    {
      label: 'Client ID',
      field: 'clientId',
      type: 'text',
      placeholder: 'your-client-id',
      required: false
    },
    {
      label: 'Client Secret',
      field: 'clientSecret',
      type: 'password',
      placeholder: 'your-client-secret',
      required: false
    },

    // Operation Configuration
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      options: [
        // Video Operations
        { value: 'upload_video', label: 'Upload Video' },
        { value: 'update_video', label: 'Update Video' },
        { value: 'delete_video', label: 'Delete Video' },
        { value: 'get_video', label: 'Get Video Details' },
        { value: 'list_videos', label: 'List Videos' },
        { value: 'search_videos', label: 'Search Videos' },
        { value: 'rate_video', label: 'Like/Dislike Video' },
        { value: 'report_video', label: 'Report Video' },
        
        // Channel Operations
        { value: 'get_channel', label: 'Get Channel Details' },
        { value: 'update_channel', label: 'Update Channel' },
        { value: 'list_channels', label: 'List Channels' },
        { value: 'get_channel_sections', label: 'Get Channel Sections' },
        { value: 'create_channel_section', label: 'Create Channel Section' },
        { value: 'subscribe_channel', label: 'Subscribe to Channel' },
        { value: 'unsubscribe_channel', label: 'Unsubscribe from Channel' },
        
        // Playlist Operations
        { value: 'create_playlist', label: 'Create Playlist' },
        { value: 'update_playlist', label: 'Update Playlist' },
        { value: 'delete_playlist', label: 'Delete Playlist' },
        { value: 'get_playlist', label: 'Get Playlist' },
        { value: 'list_playlists', label: 'List Playlists' },
        { value: 'add_to_playlist', label: 'Add Video to Playlist' },
        { value: 'remove_from_playlist', label: 'Remove from Playlist' },
        { value: 'reorder_playlist', label: 'Reorder Playlist Items' },
        
        // Comment Operations
        { value: 'get_comments', label: 'Get Comments' },
        { value: 'create_comment', label: 'Create Comment' },
        { value: 'update_comment', label: 'Update Comment' },
        { value: 'delete_comment', label: 'Delete Comment' },
        { value: 'reply_to_comment', label: 'Reply to Comment' },
        { value: 'moderate_comments', label: 'Moderate Comments' },
        
        // Live Streaming Operations
        { value: 'create_broadcast', label: 'Create Live Broadcast' },
        { value: 'update_broadcast', label: 'Update Broadcast' },
        { value: 'start_broadcast', label: 'Start Broadcast' },
        { value: 'end_broadcast', label: 'End Broadcast' },
        { value: 'get_broadcast', label: 'Get Broadcast Details' },
        { value: 'list_broadcasts', label: 'List Broadcasts' },
        
        // Analytics Operations
        { value: 'get_video_analytics', label: 'Get Video Analytics' },
        { value: 'get_channel_analytics', label: 'Get Channel Analytics' },
        { value: 'get_playlist_analytics', label: 'Get Playlist Analytics' },
        
        // Subscription Operations
        { value: 'list_subscriptions', label: 'List Subscriptions' },
        { value: 'get_subscribers', label: 'Get Subscribers' },
        
        // Caption Operations
        { value: 'upload_caption', label: 'Upload Caption' },
        { value: 'update_caption', label: 'Update Caption' },
        { value: 'delete_caption', label: 'Delete Caption' },
        { value: 'list_captions', label: 'List Captions' },
        
        // Thumbnail Operations
        { value: 'upload_thumbnail', label: 'Upload Thumbnail' }
      ],
      required: true
    },

    // Video Content
    {
      label: 'Video Title',
      field: 'title',
      type: 'text',
      placeholder: 'My Amazing Video',
      required: (config) => {
        return ['upload_video', 'update_video'].includes(config?.operation as string);
      },
      validation: (value, config) => {
        if (['upload_video', 'update_video'].includes(config?.operation as string) && value && typeof value === 'string' && value.length > 100) {
          return 'Title must be 100 characters or less';
        }
        return null;
      }
    },
    {
      label: 'Description',
      field: 'description',
      type: 'textarea',
      placeholder: 'In this video, I show you how to...\n\nTimestamps:\n00:00 Introduction\n02:30 Main content',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string' && value.length > 5000) {
          return 'Description must be 5000 characters or less';
        }
        return null;
      }
    },
    {
      label: 'Tags',
      field: 'tags',
      type: 'text',
      placeholder: 'tutorial, how-to, technology',
      required: false,
      description: 'Comma-separated tags (max 500 chars total)'
    },
    {
      label: 'Category ID',
      field: 'categoryId',
      type: 'select',
      options: [
        { value: '1', label: 'Film & Animation' },
        { value: '2', label: 'Autos & Vehicles' },
        { value: '10', label: 'Music' },
        { value: '15', label: 'Pets & Animals' },
        { value: '17', label: 'Sports' },
        { value: '19', label: 'Travel & Events' },
        { value: '20', label: 'Gaming' },
        { value: '22', label: 'People & Blogs' },
        { value: '23', label: 'Comedy' },
        { value: '24', label: 'Entertainment' },
        { value: '25', label: 'News & Politics' },
        { value: '26', label: 'Howto & Style' },
        { value: '27', label: 'Education' },
        { value: '28', label: 'Science & Technology' },
        { value: '29', label: 'Nonprofits & Activism' }
      ],
      required: false
    },
    {
      label: 'Privacy Status',
      field: 'privacyStatus',
      type: 'select',
      options: [
        { value: 'private', label: 'Private' },
        { value: 'unlisted', label: 'Unlisted' },
        { value: 'public', label: 'Public' }
      ],
      defaultValue: 'private',
      required: false
    },
    {
      label: 'Video ID',
      field: 'videoId',
      type: 'text',
      placeholder: 'dQw4w9WgXcQ',
      required: (config) => {
        return ['update_video', 'delete_video', 'get_video', 'rate_video',
                'report_video', 'get_video_analytics', 'add_to_playlist'].includes(config?.operation as string);
      }
    },

    // Video Upload
    {
      label: 'Video File URL',
      field: 'videoUrl',
      type: 'text',
      placeholder: 'https://example.com/video.mp4',
      required: (config) => {
        return config?.operation === 'upload_video';
      }
    },
    {
      label: 'Video File Path',
      field: 'videoFile',
      type: 'text',
      placeholder: '/path/to/video.mp4 or base64 content',
      required: false,
      description: 'Local file path or base64 encoded video'
    },
    {
      label: 'Notify Subscribers',
      field: 'notifySubscribers',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },
    {
      label: 'Auto Levels',
      field: 'autoLevels',
      type: 'checkbox',
      defaultValue: true,
      required: false,
      description: 'Automatically enhance video/audio'
    },
    {
      label: 'Stabilize',
      field: 'stabilize',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },

    // Channel Configuration
    {
      label: 'Channel ID',
      field: 'channelId',
      type: 'text',
      placeholder: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
      required: (config) => {
        return ['get_channel', 'update_channel', 'get_channel_sections', 'subscribe_channel',
                'unsubscribe_channel', 'get_channel_analytics', 'get_subscribers'].includes(config?.operation as string);
      }
    },
    {
      label: 'Channel Username',
      field: 'channelUsername',
      type: 'text',
      placeholder: '@YouTube',
      required: false,
      description: 'Channel handle (with @)'
    },
    {
      label: 'Channel Description',
      field: 'channelDescription',
      type: 'textarea',
      placeholder: 'Welcome to my channel where I...',
      required: false
    },
    {
      label: 'Channel Keywords',
      field: 'channelKeywords',
      type: 'text',
      placeholder: 'technology, tutorials, reviews',
      required: false
    },

    // Playlist Configuration
    {
      label: 'Playlist Title',
      field: 'playlistTitle',
      type: 'text',
      placeholder: 'My Awesome Playlist',
      required: (config) => {
        return ['create_playlist', 'update_playlist'].includes(config?.operation as string);
      }
    },
    {
      label: 'Playlist ID',
      field: 'playlistId',
      type: 'text',
      placeholder: 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
      required: (config) => {
        return ['update_playlist', 'delete_playlist', 'get_playlist', 'add_to_playlist',
                'remove_from_playlist', 'reorder_playlist', 'get_playlist_analytics'].includes(config?.operation as string);
      }
    },
    {
      label: 'Playlist Item ID',
      field: 'playlistItemId',
      type: 'text',
      placeholder: 'UExyQVh0bUVyWmdPZWlLbTRzZ05PS25HdmQ2',
      required: (config) => {
        return ['remove_from_playlist', 'reorder_playlist'].includes(config?.operation as string);
      }
    },
    {
      label: 'Position',
      field: 'position',
      type: 'number',
      placeholder: '0',
      required: false,
      description: 'Position in playlist (0-based)'
    },

    // Comment Configuration
    {
      label: 'Comment Text',
      field: 'commentText',
      type: 'textarea',
      placeholder: 'Great video! Thanks for sharing.',
      required: (config) => {
        return ['create_comment', 'update_comment', 'reply_to_comment'].includes(config?.operation as string);
      },
      validation: (value, config) => {
        if (['create_comment', 'update_comment', 'reply_to_comment'].includes(config?.operation as string) && value && typeof value === 'string' && value.length > 10000) {
          return 'Comment must be 10,000 characters or less';
        }
        return null;
      }
    },
    {
      label: 'Comment ID',
      field: 'commentId',
      type: 'text',
      placeholder: 'UgzDE4AUUDQ6UvLpW194AaABAg',
      required: (config) => {
        return ['update_comment', 'delete_comment', 'reply_to_comment'].includes(config?.operation as string);
      }
    },
    {
      label: 'Moderation Status',
      field: 'moderationStatus',
      type: 'select',
      options: [
        { value: 'published', label: 'Published' },
        { value: 'heldForReview', label: 'Held for Review' },
        { value: 'rejected', label: 'Rejected' }
      ],
      required: (config) => {
        return config?.operation === 'moderate_comments';
      }
    },

    // Live Streaming Configuration
    {
      label: 'Broadcast Title',
      field: 'broadcastTitle',
      type: 'text',
      placeholder: 'Live Stream: Q&A Session',
      required: (config) => {
        return ['create_broadcast', 'update_broadcast'].includes(config?.operation as string);
      }
    },
    {
      label: 'Broadcast ID',
      field: 'broadcastId',
      type: 'text',
      placeholder: 'broadcast-id',
      required: (config) => {
        return ['update_broadcast', 'start_broadcast', 'end_broadcast', 'get_broadcast'].includes(config?.operation as string);
      }
    },
    {
      label: 'Scheduled Start Time',
      field: 'scheduledStartTime',
      type: 'datetime-local',
      required: (config) => {
        return config?.operation === 'create_broadcast';
      }
    },
    {
      label: 'Enable DVR',
      field: 'enableDvr',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },
    {
      label: 'Enable Content Encryption',
      field: 'enableContentEncryption',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Enable Embed',
      field: 'enableEmbed',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },
    {
      label: 'Record from Start',
      field: 'recordFromStart',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },

    // Search Configuration
    {
      label: 'Search Query',
      field: 'query',
      type: 'text',
      placeholder: 'workflow automation tutorial',
      required: (config) => {
        return config?.operation === 'search_videos';
      }
    },
    {
      label: 'Search Type',
      field: 'searchType',
      type: 'select',
      options: [
        { value: 'video', label: 'Videos' },
        { value: 'channel', label: 'Channels' },
        { value: 'playlist', label: 'Playlists' }
      ],
      defaultValue: 'video',
      required: false
    },
    {
      label: 'Order By',
      field: 'order',
      type: 'select',
      options: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'date', label: 'Upload Date' },
        { value: 'rating', label: 'Rating' },
        { value: 'viewCount', label: 'View Count' },
        { value: 'title', label: 'Title' }
      ],
      defaultValue: 'relevance',
      required: false
    },
    {
      label: 'Safe Search',
      field: 'safeSearch',
      type: 'select',
      options: [
        { value: 'none', label: 'None' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'strict', label: 'Strict' }
      ],
      defaultValue: 'moderate',
      required: false
    },
    {
      label: 'Video Duration',
      field: 'videoDuration',
      type: 'select',
      options: [
        { value: 'any', label: 'Any' },
        { value: 'short', label: 'Short (< 4 minutes)' },
        { value: 'medium', label: 'Medium (4-20 minutes)' },
        { value: 'long', label: 'Long (> 20 minutes)' }
      ],
      defaultValue: 'any',
      required: false
    },
    {
      label: 'Video Definition',
      field: 'videoDefinition',
      type: 'select',
      options: [
        { value: 'any', label: 'Any' },
        { value: 'standard', label: 'Standard' },
        { value: 'high', label: 'HD' }
      ],
      defaultValue: 'any',
      required: false
    },

    // Analytics Configuration
    {
      label: 'Metrics',
      field: 'metrics',
      type: 'text',
      placeholder: 'views,likes,shares,estimatedMinutesWatched',
      required: (config) => {
        return ['get_video_analytics', 'get_channel_analytics', 'get_playlist_analytics'].includes(config?.operation as string);
      },
      description: 'Comma-separated metrics'
    },
    {
      label: 'Dimensions',
      field: 'dimensions',
      type: 'text',
      placeholder: 'day,country',
      required: false,
      description: 'Comma-separated dimensions'
    },
    {
      label: 'Start Date',
      field: 'startDate',
      type: 'text',
      placeholder: 'YYYY-MM-DD',
      required: (config) => {
        return ['get_video_analytics', 'get_channel_analytics', 'get_playlist_analytics'].includes(config?.operation as string);
      }
    },
    {
      label: 'End Date',
      field: 'endDate',
      type: 'text',
      placeholder: 'YYYY-MM-DD',
      required: (config) => {
        return ['get_video_analytics', 'get_channel_analytics', 'get_playlist_analytics'].includes(config?.operation as string);
      }
    },

    // Caption Configuration
    {
      label: 'Caption File',
      field: 'captionFile',
      type: 'text',
      placeholder: 'Base64 encoded caption or file path',
      required: (config) => {
        return config?.operation === 'upload_caption';
      }
    },
    {
      label: 'Caption Language',
      field: 'captionLanguage',
      type: 'text',
      placeholder: 'en',
      required: (config) => {
        return ['upload_caption', 'update_caption'].includes(config?.operation as string);
      }
    },
    {
      label: 'Caption Name',
      field: 'captionName',
      type: 'text',
      placeholder: 'English (auto-generated)',
      required: false
    },
    {
      label: 'Caption ID',
      field: 'captionId',
      type: 'text',
      placeholder: 'caption-id',
      required: (config) => {
        return ['update_caption', 'delete_caption'].includes(config?.operation as string);
      }
    },

    // Thumbnail Configuration
    {
      label: 'Thumbnail URL',
      field: 'thumbnailUrl',
      type: 'text',
      placeholder: 'https://example.com/thumbnail.jpg',
      required: (config) => {
        return config?.operation === 'upload_thumbnail';
      }
    },
    {
      label: 'Thumbnail File',
      field: 'thumbnailFile',
      type: 'text',
      placeholder: 'Base64 encoded image or file path',
      required: false
    },

    // Additional Options
    {
      label: 'Max Results',
      field: 'maxResults',
      type: 'number',
      placeholder: '25',
      defaultValue: 25,
      required: false,
      validation: (value) => {
        const numValue = typeof value === 'string' ? parseInt(value, 10) : value as number;
        if (numValue && (numValue < 0 || numValue > 50)) {
          return 'Max results must be between 0 and 50';
        }
        return null;
      }
    },
    {
      label: 'Page Token',
      field: 'pageToken',
      type: 'text',
      placeholder: 'CAUQAA',
      required: false,
      description: 'Token for pagination'
    },
    {
      label: 'Part',
      field: 'part',
      type: 'text',
      placeholder: 'snippet,contentDetails,statistics',
      required: false,
      description: 'Comma-separated resource parts'
    },
    {
      label: 'Rating',
      field: 'rating',
      type: 'select',
      options: [
        { value: 'like', label: 'Like' },
        { value: 'dislike', label: 'Dislike' },
        { value: 'none', label: 'Remove Rating' }
      ],
      required: (config) => {
        return config?.operation === 'rate_video';
      }
    },
    {
      label: 'Report Reason ID',
      field: 'reportReasonId',
      type: 'text',
      placeholder: 'S',
      required: (config) => {
        return config?.operation === 'report_video';
      },
      description: 'Reason code for reporting'
    }
  ],
  examples: [
    {
      name: 'Upload a Video',
      description: 'Upload a video with metadata',
      config: {
        authMethod: 'oauth2',
        accessToken: 'your-access-token',
        operation: 'upload_video',
        title: 'My Tutorial: How to Automate Workflows',
        description: 'In this video, I demonstrate how to create automated workflows that save time and increase productivity.\n\nTimestamps:\n00:00 Introduction\n02:30 Setting up the workflow\n05:45 Adding automation steps\n10:00 Testing and deployment\n\n🔗 Links:\nWorkflow tool: https://example.com\nCode examples: https://github.com/example',
        tags: 'automation, workflow, tutorial, productivity, efficiency',
        categoryId: '28',
        privacyStatus: 'public',
        videoUrl: 'https://example.com/my-video.mp4',
        notifySubscribers: true
      }
    },
    {
      name: 'Search Videos',
      description: 'Search for specific content',
      config: {
        authMethod: 'api_key',
        apiKey: 'your-api-key',
        operation: 'search_videos',
        query: 'workflow automation n8n zapier',
        searchType: 'video',
        order: 'viewCount',
        videoDuration: 'medium',
        videoDefinition: 'high',
        safeSearch: 'moderate',
        maxResults: 25
      }
    },
    {
      name: 'Create Playlist',
      description: 'Create a new playlist',
      config: {
        authMethod: 'oauth2',
        accessToken: 'your-access-token',
        operation: 'create_playlist',
        playlistTitle: 'Automation Tutorials 2024',
        description: 'A collection of the best automation tutorials for beginners and advanced users.',
        privacyStatus: 'public',
        tags: 'automation, tutorials, 2024'
      }
    },
    {
      name: 'Start Live Stream',
      description: 'Create and start a live broadcast',
      config: {
        authMethod: 'oauth2',
        accessToken: 'your-access-token',
        operation: 'create_broadcast',
        broadcastTitle: 'Live Q&A: Workflow Automation',
        description: 'Join me for a live Q&A session where I answer your questions about workflow automation!',
        scheduledStartTime: '2024-01-15T18:00:00',
        privacyStatus: 'public',
        enableDvr: true,
        enableEmbed: true,
        recordFromStart: true
      }
    },
    {
      name: 'Get Video Analytics',
      description: 'Analyze video performance',
      config: {
        authMethod: 'oauth2',
        accessToken: 'your-access-token',
        operation: 'get_video_analytics',
        videoId: 'dQw4w9WgXcQ',
        metrics: 'views,likes,shares,comments,estimatedMinutesWatched,averageViewDuration',
        dimensions: 'day',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }
    },
    {
      name: 'Post Comment',
      description: 'Comment on a video',
      config: {
        authMethod: 'oauth2',
        accessToken: 'your-access-token',
        operation: 'create_comment',
        videoId: 'dQw4w9WgXcQ',
        commentText: 'Great tutorial! This really helped me understand workflow automation better. Thanks for sharing! 👍'
      }
    }
  ]
};