import { NodeConfigDefinition } from '../types';

export const linkedinConfig: NodeConfigDefinition = {
  fields: [
    // Authentication Configuration
    {
      label: 'Authentication Method',
      field: 'authMethod',
      type: 'select',
      options: [
        { value: 'oauth2', label: 'OAuth 2.0 (3-legged)' },
        { value: 'client_credentials', label: 'Client Credentials (2-legged)' }
      ],
      required: true,
      defaultValue: 'oauth2'
    },
    {
      label: 'Access Token',
      field: 'accessToken',
      type: 'password',
      placeholder: 'your-access-token',
      required: true,
      validation: (value) => {
        if (!value) return 'Access token is required';
        return null;
      }
    },
    {
      label: 'Client ID',
      field: 'clientId',
      type: 'text',
      placeholder: 'your-client-id',
      required: function() { return this.authMethod === 'client_credentials'; }
    },
    {
      label: 'Client Secret',
      field: 'clientSecret',
      type: 'password',
      placeholder: 'your-client-secret',
      required: function() { return this.authMethod === 'client_credentials'; }
    },

    // Operation Configuration
    {
      label: 'Operation',
      field: 'operation',
      type: 'select',
      options: [
        // Profile Operations
        { value: 'get_profile', label: 'Get My Profile' },
        { value: 'get_profile_by_id', label: 'Get Profile by ID' },
        { value: 'update_profile', label: 'Update Profile' },
        { value: 'get_connections', label: 'Get Connections' },
        
        // Post Operations
        { value: 'create_post', label: 'Create Post' },
        { value: 'create_article', label: 'Create Article' },
        { value: 'share_post', label: 'Share Post' },
        { value: 'delete_post', label: 'Delete Post' },
        { value: 'get_post', label: 'Get Post' },
        { value: 'get_feed', label: 'Get Feed' },
        { value: 'like_post', label: 'Like Post' },
        { value: 'unlike_post', label: 'Unlike Post' },
        { value: 'comment_on_post', label: 'Comment on Post' },
        
        // Media Operations
        { value: 'upload_image', label: 'Upload Image' },
        { value: 'upload_video', label: 'Upload Video' },
        { value: 'upload_document', label: 'Upload Document' },
        
        // Company Operations
        { value: 'get_company', label: 'Get Company' },
        { value: 'get_company_updates', label: 'Get Company Updates' },
        { value: 'create_company_update', label: 'Create Company Update' },
        { value: 'get_company_followers', label: 'Get Company Followers' },
        { value: 'get_company_statistics', label: 'Get Company Statistics' },
        
        // Messaging Operations
        { value: 'send_message', label: 'Send Message' },
        { value: 'get_messages', label: 'Get Messages' },
        { value: 'get_conversation', label: 'Get Conversation' },
        
        // Job Operations
        { value: 'post_job', label: 'Post Job' },
        { value: 'get_job_postings', label: 'Get Job Postings' },
        { value: 'search_jobs', label: 'Search Jobs' },
        
        // Analytics Operations
        { value: 'get_post_analytics', label: 'Get Post Analytics' },
        { value: 'get_page_analytics', label: 'Get Page Analytics' },
        { value: 'get_follower_statistics', label: 'Get Follower Statistics' },
        
        // Search Operations
        { value: 'search_people', label: 'Search People' },
        { value: 'search_companies', label: 'Search Companies' }
      ],
      required: true
    },

    // Post Content
    {
      label: 'Post Text',
      field: 'text',
      type: 'textarea',
      placeholder: 'Share your professional insights...',
      required: function() { 
        return ['create_post', 'create_article', 'share_post', 'create_company_update'].includes(this.operation);
      },
      validation: function(value: any) {
        const operation = (this as any).operation;
        if (['create_post', 'create_article', 'share_post', 'create_company_update'].includes(operation)) {
          if (!value) return 'Post text is required';
          if (value.length > 3000) return 'Post text must be 3000 characters or less';
        }
        return null;
      }
    },
    {
      label: 'Post Visibility',
      field: 'visibility',
      type: 'select',
      options: [
        { value: 'PUBLIC', label: 'Public' },
        { value: 'CONNECTIONS', label: 'Connections Only' }
      ],
      defaultValue: 'PUBLIC',
      required: false
    },
    {
      label: 'Post ID',
      field: 'postId',
      type: 'text',
      placeholder: 'urn:li:share:123456789',
      required: function() { 
        return ['share_post', 'delete_post', 'get_post', 'like_post', 
                'unlike_post', 'comment_on_post', 'get_post_analytics'].includes(this.operation);
      }
    },
    {
      label: 'Comment Text',
      field: 'commentText',
      type: 'textarea',
      placeholder: 'Add your comment...',
      required: function() { 
        return this.operation === 'comment_on_post';
      },
      validation: function(value: any) {
        const operation = (this as any).operation;
        if (operation === 'comment_on_post' && value && value.length > 1250) {
          return 'Comment must be 1250 characters or less';
        }
        return null;
      }
    },

    // Article Configuration
    {
      label: 'Article Title',
      field: 'articleTitle',
      type: 'text',
      placeholder: 'My Professional Insights',
      required: function() { 
        return this.operation === 'create_article';
      },
      validation: function(value: any) {
        const operation = (this as any).operation;
        if (operation === 'create_article' && value && value.length > 150) {
          return 'Article title must be 150 characters or less';
        }
        return null;
      }
    },
    {
      label: 'Article Content',
      field: 'articleContent',
      type: 'textarea',
      placeholder: 'Full article content...',
      required: function() { 
        return this.operation === 'create_article';
      },
      validation: function(value: any) {
        const operation = (this as any).operation;
        if (operation === 'create_article') {
          if (!value) return 'Article content is required';
          if (value.length > 110000) return 'Article content must be 110,000 characters or less';
        }
        return null;
      }
    },
    {
      label: 'Article Thumbnail URL',
      field: 'articleThumbnail',
      type: 'text',
      placeholder: 'https://example.com/thumbnail.jpg',
      required: false
    },

    // Media Configuration
    {
      label: 'Media URLs',
      field: 'mediaUrls',
      type: 'textarea',
      placeholder: '[\n  "https://example.com/image1.jpg",\n  "https://example.com/image2.png"\n]',
      required: false,
      validation: (value: unknown) => {
        if (value) {
          try {
            const urls = JSON.parse(value as string);
            if (!Array.isArray(urls)) {
              return 'Media URLs must be a JSON array';
            }
            if (urls.length > 20) {
              return 'Maximum 20 media items per post';
            }
          } catch {
            return 'Invalid JSON format';
          }
        }
        return null;
      }
    },
    {
      label: 'Media Asset URN',
      field: 'mediaAssetUrn',
      type: 'text',
      placeholder: 'urn:li:digitalmediaAsset:123456789',
      required: false,
      description: 'URN of uploaded media asset'
    },
    {
      label: 'Media File',
      field: 'mediaFile',
      type: 'text',
      placeholder: 'Base64 encoded media or file path',
      required: function() { 
        return ['upload_image', 'upload_video', 'upload_document'].includes(this.operation);
      }
    },
    {
      label: 'Media Title',
      field: 'mediaTitle',
      type: 'text',
      placeholder: 'My Image',
      required: false
    },
    {
      label: 'Media Description',
      field: 'mediaDescription',
      type: 'text',
      placeholder: 'Description of the media',
      required: false
    },

    // Profile Configuration
    {
      label: 'Profile ID',
      field: 'profileId',
      type: 'text',
      placeholder: 'urn:li:person:ABC123 or member ID',
      required: function() { 
        return this.operation === 'get_profile_by_id';
      }
    },
    {
      label: 'Profile Fields',
      field: 'profileFields',
      type: 'text',
      placeholder: 'id,firstName,lastName,headline,profilePicture',
      required: false,
      description: 'Comma-separated list of fields to return'
    },
    {
      label: 'First Name',
      field: 'firstName',
      type: 'text',
      placeholder: 'John',
      required: false
    },
    {
      label: 'Last Name',
      field: 'lastName',
      type: 'text',
      placeholder: 'Doe',
      required: false
    },
    {
      label: 'Headline',
      field: 'headline',
      type: 'text',
      placeholder: 'Senior Software Engineer at Example Corp',
      required: false,
      validation: (value: unknown) => {
        if (value && typeof value === 'string' && value.length > 220) {
          return 'Headline must be 220 characters or less';
        }
        return null;
      }
    },
    {
      label: 'Summary',
      field: 'summary',
      type: 'textarea',
      placeholder: 'Professional summary...',
      required: false,
      validation: (value: unknown) => {
        if (value && typeof value === 'string' && value.length > 2000) {
          return 'Summary must be 2000 characters or less';
        }
        return null;
      }
    },

    // Company Configuration
    {
      label: 'Company ID',
      field: 'companyId',
      type: 'text',
      placeholder: 'urn:li:organization:123456 or company ID',
      required: function() { 
        return ['get_company', 'get_company_updates', 'create_company_update', 
                'get_company_followers', 'get_company_statistics'].includes(this.operation);
      }
    },
    {
      label: 'Company Fields',
      field: 'companyFields',
      type: 'text',
      placeholder: 'id,name,description,website,followersCount',
      required: false,
      description: 'Comma-separated list of company fields'
    },

    // Message Configuration
    {
      label: 'Recipient Profile URN',
      field: 'recipientUrn',
      type: 'text',
      placeholder: 'urn:li:person:ABC123',
      required: function() { 
        return this.operation === 'send_message';
      }
    },
    {
      label: 'Message Subject',
      field: 'messageSubject',
      type: 'text',
      placeholder: 'Regarding our conversation',
      required: false,
      validation: (value: unknown) => {
        if (value && typeof value === 'string' && value.length > 200) {
          return 'Message subject must be 200 characters or less';
        }
        return null;
      }
    },
    {
      label: 'Message Body',
      field: 'messageBody',
      type: 'textarea',
      placeholder: 'Hello, I wanted to reach out...',
      required: function() { 
        return this.operation === 'send_message';
      },
      validation: function(value: any) {
        const operation = (this as any).operation;
        if (operation === 'send_message' && value && value.length > 4000) {
          return 'Message must be 4000 characters or less';
        }
        return null;
      }
    },
    {
      label: 'Conversation ID',
      field: 'conversationId',
      type: 'text',
      placeholder: 'conversation-id',
      required: function() { 
        return this.operation === 'get_conversation';
      }
    },

    // Job Configuration
    {
      label: 'Job Title',
      field: 'jobTitle',
      type: 'text',
      placeholder: 'Senior Software Engineer',
      required: function() { 
        return this.operation === 'post_job';
      }
    },
    {
      label: 'Job Description',
      field: 'jobDescription',
      type: 'textarea',
      placeholder: 'We are looking for...',
      required: function() { 
        return this.operation === 'post_job';
      }
    },
    {
      label: 'Job Location',
      field: 'jobLocation',
      type: 'text',
      placeholder: 'San Francisco, CA',
      required: function() { 
        return this.operation === 'post_job';
      }
    },
    {
      label: 'Employment Type',
      field: 'employmentType',
      type: 'select',
      options: [
        { value: 'FULL_TIME', label: 'Full Time' },
        { value: 'PART_TIME', label: 'Part Time' },
        { value: 'CONTRACT', label: 'Contract' },
        { value: 'TEMPORARY', label: 'Temporary' },
        { value: 'INTERNSHIP', label: 'Internship' },
        { value: 'VOLUNTEER', label: 'Volunteer' }
      ],
      required: false
    },
    {
      label: 'Experience Level',
      field: 'experienceLevel',
      type: 'select',
      options: [
        { value: 'INTERNSHIP', label: 'Internship' },
        { value: 'ENTRY_LEVEL', label: 'Entry Level' },
        { value: 'ASSOCIATE', label: 'Associate' },
        { value: 'MID_SENIOR_LEVEL', label: 'Mid-Senior Level' },
        { value: 'DIRECTOR', label: 'Director' },
        { value: 'EXECUTIVE', label: 'Executive' }
      ],
      required: false
    },

    // Search Configuration
    {
      label: 'Search Query',
      field: 'searchQuery',
      type: 'text',
      placeholder: 'software engineer python',
      required: function() { 
        return ['search_people', 'search_companies', 'search_jobs'].includes(this.operation);
      }
    },
    {
      label: 'Search Filters',
      field: 'searchFilters',
      type: 'textarea',
      placeholder: '{\n  "location": "San Francisco",\n  "industry": "Technology",\n  "currentCompany": "Example Corp"\n}',
      required: false,
      validation: (value: unknown) => {
        if (value) {
          try {
            JSON.parse(value as string);
          } catch {
            return 'Search filters must be valid JSON';
          }
        }
        return null;
      }
    },

    // Pagination
    {
      label: 'Start Index',
      field: 'start',
      type: 'number',
      placeholder: '0',
      defaultValue: 0,
      required: false,
      validation: (value: unknown) => {
        if (value !== null && value !== undefined && typeof value === 'number' && value < 0) {
          return 'Start index must be non-negative';
        }
        return null;
      }
    },
    {
      label: 'Count',
      field: 'count',
      type: 'number',
      placeholder: '10',
      defaultValue: 10,
      required: false,
      validation: (value: unknown) => {
        if (value !== null && value !== undefined && typeof value === 'number') {
          if (value < 1 || value > 100) {
            return 'Count must be between 1 and 100';
          }
        }
        return null;
      }
    },

    // Analytics Date Range
    {
      label: 'Start Date',
      field: 'startDate',
      type: 'text',
      placeholder: 'YYYY-MM-DD',
      required: function() {
        return ['get_post_analytics', 'get_page_analytics', 'get_follower_statistics'].includes(this.operation);
      }
    },
    {
      label: 'End Date',
      field: 'endDate',
      type: 'text',
      placeholder: 'YYYY-MM-DD',
      required: function() {
        return ['get_post_analytics', 'get_page_analytics', 'get_follower_statistics'].includes(this.operation);
      }
    },
    {
      label: 'Time Granularity',
      field: 'timeGranularity',
      type: 'select',
      options: [
        { value: 'DAY', label: 'Daily' },
        { value: 'WEEK', label: 'Weekly' },
        { value: 'MONTH', label: 'Monthly' }
      ],
      defaultValue: 'DAY',
      required: false
    },

    // Additional Options
    {
      label: 'Include Sponsored Content',
      field: 'includeSponsored',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Include Recommendations',
      field: 'includeRecommendations',
      type: 'checkbox',
      defaultValue: false,
      required: false
    },
    {
      label: 'Sort By',
      field: 'sortBy',
      type: 'select',
      options: [
        { value: 'RELEVANCE', label: 'Relevance' },
        { value: 'RECENCY', label: 'Most Recent' },
        { value: 'POPULARITY', label: 'Most Popular' }
      ],
      defaultValue: 'RELEVANCE',
      required: false
    }
  ],
  examples: [
    {
      name: 'Create a Post',
      description: 'Share content on LinkedIn',
      config: {
        authMethod: 'oauth2',
        accessToken: 'your-access-token',
        operation: 'create_post',
        text: 'Excited to share that our team just launched a new feature that improves workflow automation by 10x! 🚀\n\nCheck out how we did it: [link]\n\n#automation #productivity #engineering',
        visibility: 'PUBLIC',
        mediaUrls: JSON.stringify([
          'https://example.com/feature-screenshot.png'
        ], null, 2)
      }
    },
    {
      name: 'Share an Article',
      description: 'Publish a long-form article',
      config: {
        authMethod: 'oauth2',
        accessToken: 'your-access-token',
        operation: 'create_article',
        articleTitle: '10 Ways Workflow Automation Can Transform Your Business',
        articleContent: 'In today\'s fast-paced business environment, workflow automation has become essential...\n\n[Full article content here]',
        text: 'Just published a new article on workflow automation best practices. Would love to hear your thoughts!',
        articleThumbnail: 'https://example.com/article-thumbnail.jpg'
      }
    },
    {
      name: 'Search for Connections',
      description: 'Find people in your network',
      config: {
        authMethod: 'oauth2',
        accessToken: 'your-access-token',
        operation: 'search_people',
        searchQuery: 'software engineer',
        searchFilters: JSON.stringify({
          location: 'San Francisco Bay Area',
          currentCompany: ['Google', 'Meta', 'Apple'],
          industry: 'Computer Software'
        }, null, 2),
        count: 25,
        sortBy: 'RELEVANCE'
      }
    },
    {
      name: 'Post a Job',
      description: 'Create a job posting',
      config: {
        authMethod: 'oauth2',
        accessToken: 'your-access-token',
        operation: 'post_job',
        companyId: 'urn:li:organization:12345',
        jobTitle: 'Senior Backend Engineer',
        jobDescription: 'We are looking for an experienced backend engineer to join our team...',
        jobLocation: 'San Francisco, CA',
        employmentType: 'FULL_TIME',
        experienceLevel: 'MID_SENIOR_LEVEL'
      }
    },
    {
      name: 'Get Post Analytics',
      description: 'Analyze post performance',
      config: {
        authMethod: 'oauth2',
        accessToken: 'your-access-token',
        operation: 'get_post_analytics',
        postId: 'urn:li:share:123456789',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        timeGranularity: 'MONTH'
      }
    },
    {
      name: 'Send a Message',
      description: 'Send a professional message',
      config: {
        authMethod: 'oauth2',
        accessToken: 'your-access-token',
        operation: 'send_message',
        recipientUrn: 'urn:li:person:ABC123',
        messageSubject: 'Following up on our conversation',
        messageBody: 'Hi [Name],\n\nIt was great connecting with you at the conference last week. I wanted to follow up on our discussion about workflow automation...\n\nBest regards,\n[Your name]'
      }
    }
  ]
};