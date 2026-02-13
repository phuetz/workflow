import { NodeConfigDefinition } from '../types';

export const twitterConfig: NodeConfigDefinition = {
  fields: [
    // Authentication Configuration
    {
      label: 'Authentication Method',
      field: 'authMethod',
      type: 'select',
      options: [
        { value: 'oauth2_bearer', label: 'OAuth 2.0 Bearer Token (App-only)' },
        { value: 'oauth1_user', label: 'OAuth 1.0a (User context)' },
        { value: 'oauth2_pkce', label: 'OAuth 2.0 with PKCE (User context)' }
      ],
      required: true,
      defaultValue: 'oauth2_bearer'
    },
    {
      label: 'Bearer Token',
      field: 'bearerToken',
      type: 'password',
      placeholder: 'AAAAAAAAAAAAAAAAAAAAAA...',
      required: function() { return this.authMethod === 'oauth2_bearer'; },
      validation: (value, config) => {
        if (config?.authMethod === 'oauth2_bearer' && !value) {
          return 'Bearer token is required for app-only authentication';
        }
        return null;
      }
    },
    {
      label: 'API Key (Consumer Key)',
      field: 'apiKey',
      type: 'password',
      placeholder: 'your-api-key',
      required: function() { return this.authMethod === 'oauth1_user'; },
      validation: (value, config) => {
        if (config?.authMethod === 'oauth1_user' && !value) {
          return 'API key is required for OAuth 1.0a';
        }
        return null;
      }
    },
    {
      label: 'API Secret Key',
      field: 'apiSecretKey',
      type: 'password',
      placeholder: 'your-api-secret-key',
      required: function() { return this.authMethod === 'oauth1_user'; }
    },
    {
      label: 'Access Token',
      field: 'accessToken',
      type: 'password',
      placeholder: 'your-access-token',
      required: function() { return this.authMethod === 'oauth1_user'; }
    },
    {
      label: 'Access Token Secret',
      field: 'accessTokenSecret',
      type: 'password',
      placeholder: 'your-access-token-secret',
      required: function() { return this.authMethod === 'oauth1_user'; }
    },
    {
      label: 'Client ID',
      field: 'clientId',
      type: 'text',
      placeholder: 'your-client-id',
      required: function() { return this.authMethod === 'oauth2_pkce'; }
    },
    {
      label: 'API Version',
      field: 'apiVersion',
      type: 'select',
      options: [
        { value: 'v2', label: 'API v2 (Recommended)' },
        { value: 'v1.1', label: 'API v1.1 (Legacy)' }
      ],
      defaultValue: 'v2',
      required: true
    },

    // Operation Configuration
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      options: [
        // Tweet Operations
        { value: 'create_tweet', label: 'Create Tweet' },
        { value: 'delete_tweet', label: 'Delete Tweet' },
        { value: 'get_tweet', label: 'Get Tweet' },
        { value: 'search_tweets', label: 'Search Tweets' },
        { value: 'get_timeline', label: 'Get Timeline' },
        { value: 'get_mentions', label: 'Get Mentions' },
        { value: 'retweet', label: 'Retweet' },
        { value: 'unretweet', label: 'Unretweet' },
        { value: 'like_tweet', label: 'Like Tweet' },
        { value: 'unlike_tweet', label: 'Unlike Tweet' },
        { value: 'reply_to_tweet', label: 'Reply to Tweet' },
        { value: 'quote_tweet', label: 'Quote Tweet' },
        
        // Thread Operations
        { value: 'create_thread', label: 'Create Thread' },
        
        // User Operations
        { value: 'get_user', label: 'Get User' },
        { value: 'get_users', label: 'Get Multiple Users' },
        { value: 'follow_user', label: 'Follow User' },
        { value: 'unfollow_user', label: 'Unfollow User' },
        { value: 'mute_user', label: 'Mute User' },
        { value: 'unmute_user', label: 'Unmute User' },
        { value: 'block_user', label: 'Block User' },
        { value: 'unblock_user', label: 'Unblock User' },
        { value: 'get_followers', label: 'Get Followers' },
        { value: 'get_following', label: 'Get Following' },
        
        // List Operations
        { value: 'create_list', label: 'Create List' },
        { value: 'update_list', label: 'Update List' },
        { value: 'delete_list', label: 'Delete List' },
        { value: 'get_list', label: 'Get List' },
        { value: 'get_lists', label: 'Get User Lists' },
        { value: 'add_list_member', label: 'Add List Member' },
        { value: 'remove_list_member', label: 'Remove List Member' },
        { value: 'get_list_tweets', label: 'Get List Tweets' },
        
        // Media Operations
        { value: 'upload_media', label: 'Upload Media' },
        
        // Direct Message Operations
        { value: 'send_dm', label: 'Send Direct Message' },
        { value: 'get_dms', label: 'Get Direct Messages' },
        
        // Stream Operations
        { value: 'stream_tweets', label: 'Stream Tweets (Real-time)' },
        { value: 'stream_rules', label: 'Manage Stream Rules' },
        
        // Analytics Operations
        { value: 'get_tweet_metrics', label: 'Get Tweet Metrics' }
      ],
      required: true
    },

    // Tweet Content
    {
      label: 'Tweet Text',
      field: 'text',
      type: 'textarea',
      placeholder: 'What\'s happening?',
      required: function() { 
        return ['create_tweet', 'reply_to_tweet', 'quote_tweet'].includes(this.operation);
      },
      validation: (value, config) => {
        if (['create_tweet', 'reply_to_tweet', 'quote_tweet'].includes(config?.operation as string)) {
          if (!value) return 'Tweet text is required';
          if (typeof value === 'string' && value.length > 280) return 'Tweet must be 280 characters or less';
        }
        return null;
      }
    },
    {
      label: 'Tweet ID',
      field: 'tweetId',
      type: 'text',
      placeholder: '1234567890123456789',
      required: function() { 
        return ['get_tweet', 'delete_tweet', 'retweet', 'unretweet', 'like_tweet', 
                'unlike_tweet', 'reply_to_tweet', 'quote_tweet', 'get_tweet_metrics'].includes(this.operation);
      }
    },
    {
      label: 'Reply Settings',
      field: 'replySettings',
      type: 'select',
      options: [
        { value: 'everyone', label: 'Everyone can reply' },
        { value: 'following', label: 'People you follow can reply' },
        { value: 'mentionedUsers', label: 'Only mentioned users can reply' }
      ],
      defaultValue: 'everyone',
      required: false
    },

    // Thread Creation
    {
      label: 'Thread Tweets',
      field: 'threadTweets',
      type: 'textarea',
      placeholder: '[\n  "First tweet in thread",\n  "Second tweet in thread",\n  "Third tweet in thread"\n]',
      required: function() { 
        return this.operation === 'create_thread';
      },
      validation: (value, config) => {
        if (config?.operation === 'create_thread' && value && typeof value === 'string') {
          try {
            const tweets = JSON.parse(value);
            if (!Array.isArray(tweets)) {
              return 'Thread tweets must be a JSON array';
            }
            for (const tweet of tweets) {
              if (typeof tweet !== 'string') {
                return 'Each tweet must be a string';
              }
              if (tweet.length > 280) {
                return 'Each tweet must be 280 characters or less';
              }
            }
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },

    // Search Configuration
    {
      label: 'Search Query',
      field: 'query',
      type: 'text',
      placeholder: '#nodejs OR @username -is:retweet',
      required: function() { 
        return ['search_tweets', 'stream_tweets'].includes(this.operation);
      },
      validation: (value, config) => {
        if (['search_tweets', 'stream_tweets'].includes(config?.operation as string) && !value) {
          return 'Search query is required';
        }
        if (value && typeof value === 'string' && value.length > 512) {
          return 'Query must be 512 characters or less';
        }
        return null;
      }
    },
    {
      label: 'Max Results',
      field: 'maxResults',
      type: 'number',
      placeholder: '10',
      defaultValue: 10,
      required: false,
      validation: (value, config) => {
        if (value && typeof value === 'number') {
          if (config?.apiVersion === 'v2' && (value < 10 || value > 100)) {
            return 'Max results must be between 10 and 100 for API v2';
          }
          if (config?.apiVersion === 'v1.1' && (value < 1 || value > 200)) {
            return 'Max results must be between 1 and 200 for API v1.1';
          }
        }
        return null;
      }
    },
    {
      label: 'Sort Order',
      field: 'sortOrder',
      type: 'select',
      options: [
        { value: 'recency', label: 'Most Recent' },
        { value: 'relevancy', label: 'Most Relevant' }
      ],
      defaultValue: 'recency',
      required: false
    },

    // User Configuration
    {
      label: 'Username',
      field: 'username',
      type: 'text',
      placeholder: 'jack',
      required: function() { 
        return ['get_user', 'follow_user', 'unfollow_user', 'mute_user', 
                'unmute_user', 'block_user', 'unblock_user'].includes(this.operation) && !this.userId;
      },
      validation: (value) => {
        if (value && typeof value === 'string' && !value.match(/^[A-Za-z0-9_]{1,15}$/)) {
          return 'Invalid username format';
        }
        return null;
      }
    },
    {
      label: 'User ID',
      field: 'userId',
      type: 'text',
      placeholder: '12345',
      required: function() { 
        return ['get_user', 'follow_user', 'unfollow_user', 'mute_user', 
                'unmute_user', 'block_user', 'unblock_user'].includes(this.operation) && !this.username;
      }
    },
    {
      label: 'Usernames (comma-separated)',
      field: 'usernames',
      type: 'text',
      placeholder: 'jack,elonmusk,nasa',
      required: function() { 
        return this.operation === 'get_users' && !this.userIds;
      }
    },
    {
      label: 'User IDs (comma-separated)',
      field: 'userIds',
      type: 'text',
      placeholder: '12345,67890,11111',
      required: function() { 
        return this.operation === 'get_users' && !this.usernames;
      }
    },

    // Media Configuration
    {
      label: 'Media URLs',
      field: 'mediaUrls',
      type: 'textarea',
      placeholder: '[\n  "https://example.com/image1.jpg",\n  "https://example.com/image2.png"\n]',
      required: false,
      validation: (value, config) => {
        if (value && typeof value === 'string') {
          try {
            const urls = JSON.parse(value);
            if (!Array.isArray(urls)) {
              return 'Media URLs must be a JSON array';
            }
            if (urls.length > 4) {
              return 'Maximum 4 media items per tweet';
            }
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },
    {
      label: 'Media IDs',
      field: 'mediaIds',
      type: 'text',
      placeholder: '1234567890,0987654321',
      required: false,
      description: 'Comma-separated media IDs from upload'
    },
    {
      label: 'Media File',
      field: 'mediaFile',
      type: 'text',
      placeholder: 'Base64 encoded media or file path',
      required: function() { 
        return this.operation === 'upload_media';
      }
    },
    {
      label: 'Media Type',
      field: 'mediaType',
      type: 'select',
      options: [
        { value: 'image/jpeg', label: 'JPEG Image' },
        { value: 'image/png', label: 'PNG Image' },
        { value: 'image/gif', label: 'GIF Image' },
        { value: 'video/mp4', label: 'MP4 Video' }
      ],
      required: function() { 
        return this.operation === 'upload_media';
      }
    },

    // List Configuration
    {
      label: 'List Name',
      field: 'listName',
      type: 'text',
      placeholder: 'My Awesome List',
      required: function() { 
        return ['create_list', 'update_list'].includes(this.operation);
      },
      validation: (value, config) => {
        if (['create_list', 'update_list'].includes(config?.operation as string) && value && typeof value === 'string' && value.length > 25) {
          return 'List name must be 25 characters or less';
        }
        return null;
      }
    },
    {
      label: 'List Description',
      field: 'listDescription',
      type: 'text',
      placeholder: 'A list of awesome people',
      required: false,
      validation: (value) => {
        if (value && typeof value === 'string' && value.length > 100) {
          return 'List description must be 100 characters or less';
        }
        return null;
      }
    },
    {
      label: 'List ID',
      field: 'listId',
      type: 'text',
      placeholder: '1234567890',
      required: function() { 
        return ['update_list', 'delete_list', 'get_list', 'add_list_member', 
                'remove_list_member', 'get_list_tweets'].includes(this.operation);
      }
    },
    {
      label: 'List Mode',
      field: 'listMode',
      type: 'select',
      options: [
        { value: 'public', label: 'Public' },
        { value: 'private', label: 'Private' }
      ],
      defaultValue: 'public',
      required: false
    },

    // Direct Message Configuration
    {
      label: 'Recipient ID',
      field: 'recipientId',
      type: 'text',
      placeholder: '1234567890',
      required: function() { 
        return this.operation === 'send_dm';
      }
    },
    {
      label: 'Message Text',
      field: 'messageText',
      type: 'textarea',
      placeholder: 'Hello! How are you?',
      required: function() { 
        return this.operation === 'send_dm';
      },
      validation: (value, config) => {
        if (config?.operation === 'send_dm' && value && typeof value === 'string' && value.length > 10000) {
          return 'Direct message must be 10,000 characters or less';
        }
        return null;
      }
    },

    // Stream Configuration
    {
      label: 'Stream Rules',
      field: 'streamRules',
      type: 'textarea',
      placeholder: '[\n  {"value": "cat has:media", "tag": "cats with media"},\n  {"value": "from:NASA", "tag": "NASA tweets"}\n]',
      required: function() { 
        return this.operation === 'stream_rules';
      },
      validation: (value, config) => {
        if (config?.operation === 'stream_rules' && value && typeof value === 'string') {
          try {
            const rules = JSON.parse(value);
            if (!Array.isArray(rules)) {
              return 'Stream rules must be a JSON array';
            }
            for (const rule of rules) {
              if (!rule.value) {
                return 'Each rule must have a value';
              }
              if (rule.value.length > 512) {
                return 'Rule value must be 512 characters or less';
              }
            }
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },

    // Tweet Fields Selection
    {
      label: 'Tweet Fields',
      field: 'tweetFields',
      type: 'text',
      placeholder: 'created_at,author_id,public_metrics,entities',
      required: false,
      description: 'Comma-separated list of tweet fields to return'
    },
    {
      label: 'User Fields',
      field: 'userFields',
      type: 'text',
      placeholder: 'created_at,description,public_metrics,verified',
      required: false,
      description: 'Comma-separated list of user fields to return'
    },
    {
      label: 'Media Fields',
      field: 'mediaFields',
      type: 'text',
      placeholder: 'url,preview_image_url,duration_ms',
      required: false,
      description: 'Comma-separated list of media fields to return'
    },
    {
      label: 'Expansions',
      field: 'expansions',
      type: 'text',
      placeholder: 'author_id,attachments.media_keys',
      required: false,
      description: 'Comma-separated list of expansions'
    },

    // Additional Options
    {
      label: 'Exclude Retweets',
      field: 'excludeRetweets',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Exclude Replies',
      field: 'excludeReplies',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Only Media',
      field: 'onlyMedia',
      type: 'checkbox',
      defaultValue: false,
      required: false,
      description: 'Only return tweets with media'
    },
    {
      label: 'Pagination Token',
      field: 'paginationToken',
      type: 'text',
      placeholder: 'next_token_value',
      required: false
    },
    {
      label: 'Since ID',
      field: 'sinceId',
      type: 'text',
      placeholder: '1234567890123456789',
      required: false,
      description: 'Returns results with ID greater than this'
    },
    {
      label: 'Until ID',
      field: 'untilId',
      type: 'text',
      placeholder: '1234567890123456789',
      required: false,
      description: 'Returns results with ID less than this'
    },
    {
      label: 'Start Time',
      field: 'startTime',
      type: 'datetime-local',
      required: false,
      description: 'ISO 8601 date for oldest results'
    },
    {
      label: 'End Time',
      field: 'endTime',
      type: 'datetime-local',
      required: false,
      description: 'ISO 8601 date for newest results'
    }
  ],
  examples: [
    {
      name: 'Post a Tweet',
      description: 'Create a simple tweet',
      config: {
        authMethod: 'oauth1_user',
        apiKey: 'your-api-key',
        apiSecretKey: 'your-secret-key',
        accessToken: 'your-access-token',
        accessTokenSecret: 'your-access-token-secret',
        apiVersion: 'v2',
        operation: 'create_tweet',
        text: 'Hello Twitter! This is my automated tweet from my workflow! 🚀 #automation #workflow'
      }
    },
    {
      name: 'Tweet with Media',
      description: 'Post a tweet with images',
      config: {
        authMethod: 'oauth1_user',
        apiKey: 'your-api-key',
        apiSecretKey: 'your-secret-key',
        accessToken: 'your-access-token',
        accessTokenSecret: 'your-access-token-secret',
        apiVersion: 'v2',
        operation: 'create_tweet',
        text: 'Check out this amazing visualization! 📊',
        mediaIds: '1234567890,0987654321'
      }
    },
    {
      name: 'Search Recent Tweets',
      description: 'Search for tweets with specific criteria',
      config: {
        authMethod: 'oauth2_bearer',
        bearerToken: 'your-bearer-token',
        apiVersion: 'v2',
        operation: 'search_tweets',
        query: '(#AI OR #MachineLearning) -is:retweet -is:reply has:media lang:en',
        maxResults: 50,
        sortOrder: 'recency',
        tweetFields: 'created_at,author_id,public_metrics,entities',
        userFields: 'name,username,verified',
        mediaFields: 'url,preview_image_url',
        expansions: 'author_id,attachments.media_keys'
      }
    },
    {
      name: 'Create a Thread',
      description: 'Post a multi-tweet thread',
      config: {
        authMethod: 'oauth1_user',
        apiKey: 'your-api-key',
        apiSecretKey: 'your-secret-key',
        accessToken: 'your-access-token',
        accessTokenSecret: 'your-access-token-secret',
        apiVersion: 'v2',
        operation: 'create_thread',
        threadTweets: JSON.stringify([
          "1/ Let's talk about workflow automation and how it can transform your business 🧵",
          "2/ Workflow automation helps you save time by connecting different apps and services",
          "3/ You can automate repetitive tasks like data entry, notifications, and reporting",
          "4/ The ROI is incredible - most businesses see 10x productivity gains!",
          "5/ Ready to get started? Check out our platform and automate your workflows today! 🚀"
        ], null, 2)
      }
    },
    {
      name: 'Monitor Mentions',
      description: 'Get recent mentions of your account',
      config: {
        authMethod: 'oauth1_user',
        apiKey: 'your-api-key',
        apiSecretKey: 'your-secret-key',
        accessToken: 'your-access-token',
        accessTokenSecret: 'your-access-token-secret',
        apiVersion: 'v2',
        operation: 'get_mentions',
        maxResults: 20,
        tweetFields: 'created_at,author_id,conversation_id,in_reply_to_user_id',
        userFields: 'name,username,profile_image_url',
        expansions: 'author_id'
      }
    },
    {
      name: 'Real-time Stream',
      description: 'Stream tweets matching rules in real-time',
      config: {
        authMethod: 'oauth2_bearer',
        bearerToken: 'your-bearer-token',
        apiVersion: 'v2',
        operation: 'stream_tweets',
        query: 'workflow automation',
        tweetFields: 'created_at,author_id,text,public_metrics',
        userFields: 'name,username,verified',
        expansions: 'author_id'
      }
    }
  ]
};