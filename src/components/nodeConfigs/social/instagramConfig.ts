import { NodeConfigDefinition } from '../types';

export const instagramConfig: NodeConfigDefinition = {
  fields: [
    // Authentication Configuration
    {
      label: 'Access Token',
      field: 'accessToken',
      type: 'password',
      placeholder: 'your-instagram-access-token',
      required: true,
      validation: (value: unknown) => {
        if (!value) return 'Access token is required';
        return null;
      }
    },
    {
      label: 'Instagram Business Account ID',
      field: 'businessAccountId',
      type: 'text',
      placeholder: '17841400000000000',
      required: true,
      validation: (value: unknown) => {
        if (!value) return 'Business Account ID is required';
        if (typeof value === 'string' && !value.match(/^\d+$/)) {
          return 'Invalid Business Account ID format';
        }
        return null;
      }
    },
    {
      label: 'API Version',
      field: 'apiVersion',
      type: 'select',
      options: [
        { value: 'v18.0', label: 'v18.0 (Latest)' },
        { value: 'v17.0', label: 'v17.0' },
        { value: 'v16.0', label: 'v16.0' }
      ],
      defaultValue: 'v18.0',
      required: true
    },

    // Operation Configuration
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      options: [
        // Content Operations
        { value: 'create_photo_post', label: 'Create Photo Post' },
        { value: 'create_video_post', label: 'Create Video Post' },
        { value: 'create_carousel_post', label: 'Create Carousel Post' },
        { value: 'create_reel', label: 'Create Reel' },
        { value: 'create_story', label: 'Create Story' },
        { value: 'delete_media', label: 'Delete Media' },
        { value: 'get_media', label: 'Get Media Details' },
        { value: 'update_media_comment', label: 'Update Media Comment' },
        
        // Feed Operations
        { value: 'get_user_media', label: 'Get User Media' },
        { value: 'get_media_insights', label: 'Get Media Insights' },
        { value: 'get_user_insights', label: 'Get User Insights' },
        { value: 'get_user_stories', label: 'Get User Stories' },
        
        // Comment Operations
        { value: 'get_comments', label: 'Get Comments' },
        { value: 'create_comment', label: 'Create Comment' },
        { value: 'delete_comment', label: 'Delete Comment' },
        { value: 'hide_comment', label: 'Hide Comment' },
        { value: 'reply_to_comment', label: 'Reply to Comment' },
        
        // Hashtag Operations
        { value: 'search_hashtags', label: 'Search Hashtags' },
        { value: 'get_hashtag_media', label: 'Get Hashtag Media' },
        { value: 'get_hashtag_info', label: 'Get Hashtag Info' },
        
        // User Operations
        { value: 'get_profile', label: 'Get Profile Info' },
        { value: 'get_followers', label: 'Get Followers Count' },
        { value: 'get_following', label: 'Get Following Count' },
        { value: 'search_users', label: 'Search Users' },
        
        // Mention Operations
        { value: 'get_mentions', label: 'Get Media Mentions' },
        { value: 'get_comment_mentions', label: 'Get Comment Mentions' },
        
        // Business Operations
        { value: 'get_business_discovery', label: 'Business Discovery' },
        { value: 'get_audience_insights', label: 'Get Audience Insights' },
        { value: 'get_content_publishing_limit', label: 'Get Publishing Limit' }
      ],
      required: true
    },

    // Media Content
    {
      label: 'Caption',
      field: 'caption',
      type: 'textarea',
      placeholder: 'Write your caption... #hashtag @mention',
      required: function() { 
        return ['create_photo_post', 'create_video_post', 'create_carousel_post', 
                'create_reel', 'create_story'].includes(this.operation);
      },
      validation: (value: unknown, config?: any) => {
        const operation = config?.operation;
        if (operation && ['create_photo_post', 'create_video_post', 'create_carousel_post',
             'create_reel', 'create_story'].includes(operation)) {
          if (typeof value === 'string' && value.length > 2200) {
            return 'Caption must be 2200 characters or less';
          }
        }
        return null;
      }
    },
    {
      label: 'Media URL',
      field: 'mediaUrl',
      type: 'text',
      placeholder: 'https://example.com/image.jpg',
      required: function() { 
        return ['create_photo_post', 'create_video_post', 'create_story'].includes(this.operation);
      },
      validation: (value: unknown, config?: any) => {
        const operation = config?.operation;
        if (operation && ['create_photo_post', 'create_video_post', 'create_story'].includes(operation) && value) {
          if (typeof value === 'string' && !value.match(/^https?:\/\/.+/)) {
            return 'Media URL must be a valid HTTP/HTTPS URL';
          }
        }
        return null;
      }
    },
    {
      label: 'Media Type',
      field: 'mediaType',
      type: 'select',
      options: [
        { value: 'IMAGE', label: 'Image' },
        { value: 'VIDEO', label: 'Video' },
        { value: 'REELS', label: 'Reels' }
      ],
      required: function() { 
        return ['create_photo_post', 'create_video_post', 'create_reel'].includes(this.operation);
      }
    },
    {
      label: 'Media ID',
      field: 'mediaId',
      type: 'text',
      placeholder: '17895695668004550',
      required: function() { 
        return ['delete_media', 'get_media', 'get_media_insights', 'get_comments',
                'update_media_comment'].includes(this.operation);
      }
    },

    // Carousel Configuration
    {
      label: 'Carousel Items',
      field: 'carouselItems',
      type: 'textarea',
      placeholder: '[\n  {"media_url": "https://example.com/image1.jpg", "media_type": "IMAGE"},\n  {"media_url": "https://example.com/image2.jpg", "media_type": "IMAGE"}\n]',
      required: function() { 
        return this.operation === 'create_carousel_post';
      },
      validation: (value: unknown, config?: any) => {
        const operation = config?.operation;
        if (operation === 'create_carousel_post' && value) {
          try {
            const items = JSON.parse(value as string);
            if (!Array.isArray(items)) {
              return 'Carousel items must be a JSON array';
            }
            if (items.length < 2 || items.length > 10) {
              return 'Carousel must have between 2 and 10 items';
            }
            for (const item of items) {
              if (!item.media_url || !item.media_type) {
                return 'Each item must have media_url and media_type';
              }
            }
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },

    // Video Configuration
    {
      label: 'Video Thumbnail URL',
      field: 'thumbnailUrl',
      type: 'text',
      placeholder: 'https://example.com/thumbnail.jpg',
      required: false,
      description: 'Thumbnail for video posts'
    },
    {
      label: 'Product Tags',
      field: 'productTags',
      type: 'textarea',
      placeholder: '[{"product_id": "1234567890", "x": 0.5, "y": 0.5}]',
      required: false,
      validation: (value: unknown) => {
        if (value) {
          try {
            const tags = JSON.parse(value as string);
            if (!Array.isArray(tags)) {
              return 'Product tags must be a JSON array';
            }
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },
    {
      label: 'User Tags',
      field: 'userTags',
      type: 'text',
      placeholder: 'username1,username2',
      required: false,
      description: 'Comma-separated usernames to tag'
    },
    {
      label: 'Location ID',
      field: 'locationId',
      type: 'text',
      placeholder: '106186214412526',
      required: false,
      description: 'Facebook place ID for location tag'
    },

    // Comment Configuration
    {
      label: 'Comment Text',
      field: 'commentText',
      type: 'text',
      placeholder: 'Great post! 💖',
      required: function() { 
        return ['create_comment', 'reply_to_comment'].includes(this.operation);
      },
      validation: (value: unknown, config?: any) => {
        const operation = config?.operation;
        if (operation && ['create_comment', 'reply_to_comment'].includes(operation) && typeof value === 'string' && value.length > 300) {
          return 'Comment must be 300 characters or less';
        }
        return null;
      }
    },
    {
      label: 'Comment ID',
      field: 'commentId',
      type: 'text',
      placeholder: '17870694726885362',
      required: function() { 
        return ['delete_comment', 'hide_comment', 'reply_to_comment'].includes(this.operation);
      }
    },
    {
      label: 'Hide Comment',
      field: 'hideComment',
      type: 'checkbox',
      defaultValue: false,
      required: false,
      description: 'Hide the comment instead of deleting'
    },

    // Hashtag Configuration
    {
      label: 'Hashtag Name',
      field: 'hashtagName',
      type: 'text',
      placeholder: 'nature (without #)',
      required: function() { 
        return ['search_hashtags', 'get_hashtag_media', 'get_hashtag_info'].includes(this.operation);
      },
      validation: (value: unknown, config?: any) => {
        const operation = config?.operation;
        if (operation && ['search_hashtags', 'get_hashtag_media', 'get_hashtag_info'].includes(operation) && value) {
          if (typeof value === 'string' && value.includes('#')) {
            return 'Enter hashtag without # symbol';
          }
        }
        return null;
      }
    },
    {
      label: 'Hashtag ID',
      field: 'hashtagId',
      type: 'text',
      placeholder: '17843677603040508',
      required: function() { 
        return ['get_hashtag_media', 'get_hashtag_info'].includes(this.operation) && !this.hashtagName;
      }
    },

    // User/Search Configuration
    {
      label: 'Username',
      field: 'username',
      type: 'text',
      placeholder: 'instagram',
      required: function() { 
        return ['search_users', 'get_business_discovery'].includes(this.operation);
      },
      validation: (value: unknown) => {
        if (typeof value === 'string' && value && !value.match(/^[a-zA-Z0-9._]+$/)) {
          return 'Invalid username format';
        }
        return null;
      }
    },
    {
      label: 'User ID',
      field: 'userId',
      type: 'text',
      placeholder: '17841400000000000',
      required: function() { 
        return ['get_followers', 'get_following'].includes(this.operation) && !this.username;
      }
    },

    // Insights Configuration
    {
      label: 'Metrics',
      field: 'metrics',
      type: 'text',
      placeholder: 'impressions,reach,engagement',
      required: function() { 
        return ['get_media_insights', 'get_user_insights', 'get_audience_insights'].includes(this.operation);
      },
      description: 'Comma-separated list of metrics'
    },
    {
      label: 'Period',
      field: 'period',
      type: 'select',
      options: [
        { value: 'day', label: 'Daily' },
        { value: 'week', label: 'Weekly' },
        { value: 'days_28', label: '28 Days' },
        { value: 'lifetime', label: 'Lifetime' }
      ],
      defaultValue: 'lifetime',
      required: false
    },
    {
      label: 'Since Date',
      field: 'since',
      type: 'datetime',
      required: false,
      description: 'Start date for insights'
    },
    {
      label: 'Until Date',
      field: 'until',
      type: 'datetime',
      required: false,
      description: 'End date for insights'
    },

    // Pagination
    {
      label: 'Limit',
      field: 'limit',
      type: 'number',
      placeholder: '25',
      defaultValue: 25,
      required: false,
      validation: (value: unknown) => {
        if (typeof value === 'number' && (value < 1 || value > 100)) {
          return 'Limit must be between 1 and 100';
        }
        return null;
      }
    },
    {
      label: 'After Cursor',
      field: 'after',
      type: 'text',
      placeholder: 'cursor_string',
      required: false,
      description: 'Pagination cursor for next page'
    },
    {
      label: 'Before Cursor',
      field: 'before',
      type: 'text',
      placeholder: 'cursor_string',
      required: false,
      description: 'Pagination cursor for previous page'
    },

    // Additional Options
    {
      label: 'Fields',
      field: 'fields',
      type: 'text',
      placeholder: 'id,caption,media_type,media_url,timestamp',
      required: false,
      description: 'Comma-separated fields to return'
    },
    {
      label: 'Publish',
      field: 'publish',
      type: 'checkbox',
      defaultValue: true,
      required: false,
      description: 'Publish immediately or save as draft'
    },
    {
      label: 'Comments Enabled',
      field: 'commentsEnabled',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },
    {
      label: 'Like Enabled',
      field: 'likeEnabled',
      type: 'checkbox',
      defaultValue: true,
      required: false
    },
    {
      label: 'Share to Feed',
      field: 'shareToFeed',
      type: 'checkbox',
      defaultValue: false,
      required: false,
      description: 'Share Reel to main feed'
    },
    {
      label: 'Cover URL',
      field: 'coverUrl',
      type: 'text',
      placeholder: 'https://example.com/cover.jpg',
      required: false,
      description: 'Cover image for Reels'
    },
    {
      label: 'Audio Name',
      field: 'audioName',
      type: 'text',
      placeholder: 'Original Audio',
      required: false,
      description: 'Name of audio track for Reels'
    }
  ],
  examples: [
    {
      name: 'Post a Photo',
      description: 'Create a simple photo post',
      config: {
        accessToken: 'your-access-token',
        businessAccountId: '17841400000000000',
        apiVersion: 'v18.0',
        operation: 'create_photo_post',
        mediaUrl: 'https://example.com/beautiful-sunset.jpg',
        caption: 'Beautiful sunset today! 🌅\n\n#sunset #nature #photography #beautiful',
        mediaType: 'IMAGE',
        locationId: '106186214412526',
        commentsEnabled: true,
        likeEnabled: true
      }
    },
    {
      name: 'Create a Carousel',
      description: 'Post multiple images in a carousel',
      config: {
        accessToken: 'your-access-token',
        businessAccountId: '17841400000000000',
        apiVersion: 'v18.0',
        operation: 'create_carousel_post',
        caption: 'Check out our new product line! Swipe to see more →\n\n#newproducts #fashion #style',
        carouselItems: JSON.stringify([
          { media_url: 'https://example.com/product1.jpg', media_type: 'IMAGE' },
          { media_url: 'https://example.com/product2.jpg', media_type: 'IMAGE' },
          { media_url: 'https://example.com/product3.jpg', media_type: 'IMAGE' }
        ], null, 2),
        productTags: JSON.stringify([
          { product_id: '1234567890', x: 0.5, y: 0.7 }
        ], null, 2)
      }
    },
    {
      name: 'Create a Reel',
      description: 'Post a Reel video',
      config: {
        accessToken: 'your-access-token',
        businessAccountId: '17841400000000000',
        apiVersion: 'v18.0',
        operation: 'create_reel',
        mediaUrl: 'https://example.com/my-reel.mp4',
        caption: 'Behind the scenes of our photoshoot! 🎬\n\n#bts #behindthescenes #reels',
        mediaType: 'REELS',
        coverUrl: 'https://example.com/reel-cover.jpg',
        audioName: 'Trending Song',
        shareToFeed: true
      }
    },
    {
      name: 'Get Media Insights',
      description: 'Analyze post performance',
      config: {
        accessToken: 'your-access-token',
        businessAccountId: '17841400000000000',
        apiVersion: 'v18.0',
        operation: 'get_media_insights',
        mediaId: '17895695668004550',
        metrics: 'impressions,reach,engagement,saved',
        period: 'lifetime'
      }
    },
    {
      name: 'Search Hashtags',
      description: 'Find popular hashtags',
      config: {
        accessToken: 'your-access-token',
        businessAccountId: '17841400000000000',
        apiVersion: 'v18.0',
        operation: 'search_hashtags',
        hashtagName: 'travel',
        limit: 10
      }
    },
    {
      name: 'Business Discovery',
      description: 'Get competitor insights',
      config: {
        accessToken: 'your-access-token',
        businessAccountId: '17841400000000000',
        apiVersion: 'v18.0',
        operation: 'get_business_discovery',
        username: 'natgeo',
        fields: 'business_discovery.username(natgeo){followers_count,media_count,media{comments_count,like_count}}'
      }
    }
  ]
};