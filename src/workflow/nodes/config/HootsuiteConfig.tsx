/**
 * Hootsuite Node Configuration
 * Social media management and scheduling
 */

import React, { useState } from 'react';

interface HootsuiteConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type HootsuiteOperation =
  | 'createPost'
  | 'schedulePost'
  | 'getPosts'
  | 'updatePost'
  | 'deletePost'
  | 'getSocialProfiles'
  | 'getAnalytics'
  | 'uploadMedia';

export const HootsuiteConfig: React.FC<HootsuiteConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<HootsuiteOperation>(
    (config.operation as HootsuiteOperation) || 'createPost'
  );
  const [accessToken, setAccessToken] = useState((config.accessToken as string) || '');
  const [socialProfileId, setSocialProfileId] = useState((config.socialProfileId as string) || '');
  const [text, setText] = useState((config.text as string) || '');
  const [scheduledTime, setScheduledTime] = useState((config.scheduledTime as string) || '');
  const [mediaUrls, setMediaUrls] = useState((config.mediaUrls as string) || '');
  const [postId, setPostId] = useState((config.postId as string) || '');
  const [startDate, setStartDate] = useState((config.startDate as string) || '');
  const [endDate, setEndDate] = useState((config.endDate as string) || '');

  const handleOperationChange = (newOperation: HootsuiteOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleAccessTokenChange = (value: string) => {
    setAccessToken(value);
    onChange({ ...config, accessToken: value });
  };

  const handleSocialProfileIdChange = (value: string) => {
    setSocialProfileId(value);
    onChange({ ...config, socialProfileId: value });
  };

  const handleTextChange = (value: string) => {
    setText(value);
    onChange({ ...config, text: value });
  };

  const handleScheduledTimeChange = (value: string) => {
    setScheduledTime(value);
    onChange({ ...config, scheduledTime: value });
  };

  const handleMediaUrlsChange = (value: string) => {
    setMediaUrls(value);
    onChange({ ...config, mediaUrls: value });
  };

  const handlePostIdChange = (value: string) => {
    setPostId(value);
    onChange({ ...config, postId: value });
  };

  const loadExample = (example: 'createPost' | 'schedulePost' | 'analytics') => {
    if (example === 'createPost') {
      handleOperationChange('createPost');
      handleTextChange('Check out our latest product launch! 🚀 #ProductLaunch #Innovation');
      handleMediaUrlsChange('["https://example.com/image1.jpg"]');
    } else if (example === 'schedulePost') {
      handleOperationChange('schedulePost');
      handleTextChange('Weekly tip: Automate your social media posting to save time! ⏰ #SocialMediaTips');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      handleScheduledTimeChange(tomorrow.toISOString());
    } else if (example === 'analytics') {
      handleOperationChange('getAnalytics');
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      setStartDate(last30Days.toISOString().split('T')[0]);
      setEndDate(new Date().toISOString().split('T')[0]);
    }
  };

  return (
    <div className="space-y-4 bg-gray-900 text-gray-100 p-4 rounded-lg">
      <div className="font-semibold text-lg mb-4 text-white">Hootsuite Configuration</div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Access Token
        </label>
        <input
          type="password"
          value={accessToken}
          onChange={(e) => handleAccessTokenChange(e.target.value)}
          placeholder="OAuth2 Access Token or {{ $credentials.accessToken }}"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">
          OAuth 2.0 access token from Hootsuite Developer Portal
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as HootsuiteOperation)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="createPost">Create Post (Immediate)</option>
          <option value="schedulePost">Schedule Post</option>
          <option value="getPosts">Get Posts</option>
          <option value="updatePost">Update Post</option>
          <option value="deletePost">Delete Post</option>
          <option value="getSocialProfiles">Get Social Profiles</option>
          <option value="getAnalytics">Get Analytics</option>
          <option value="uploadMedia">Upload Media</option>
        </select>
      </div>

      {(operation === 'createPost' || operation === 'schedulePost' || operation === 'updatePost') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Social Profile ID
            </label>
            <input
              type="text"
              value={socialProfileId}
              onChange={(e) => handleSocialProfileIdChange(e.target.value)}
              placeholder="123456 or {{ $json.profileId }}"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              ID of the social media profile to post to (Twitter, Facebook, LinkedIn, etc.)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Post Text
            </label>
            <textarea
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Your social media post content... Use {{ expressions }}"
              rows={4}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Post content (character limits vary by platform)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Media URLs (JSON Array - Optional)
            </label>
            <input
              type="text"
              value={mediaUrls}
              onChange={(e) => handleMediaUrlsChange(e.target.value)}
              placeholder='["https://example.com/image.jpg"] or {{ $json.images }}'
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Array of media URLs to attach to the post
            </p>
          </div>
        </>
      )}

      {operation === 'schedulePost' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Scheduled Time (ISO 8601)
          </label>
          <input
            type="datetime-local"
            value={scheduledTime ? new Date(scheduledTime).toISOString().slice(0, 16) : ''}
            onChange={(e) => handleScheduledTimeChange(new Date(e.target.value).toISOString())}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            When to publish the post (use expressions for dynamic scheduling)
          </p>
        </div>
      )}

      {(operation === 'updatePost' || operation === 'deletePost') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Post ID
          </label>
          <input
            type="text"
            value={postId}
            onChange={(e) => handlePostIdChange(e.target.value)}
            placeholder="post_123456 or {{ $json.postId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Hootsuite post ID to update or delete
          </p>
        </div>
      )}

      {operation === 'getAnalytics' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Social Profile ID
            </label>
            <input
              type="text"
              value={socialProfileId}
              onChange={(e) => handleSocialProfileIdChange(e.target.value)}
              placeholder="123456"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-gray-700 pt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Quick Examples
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadExample('createPost')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Create Post
          </button>
          <button
            onClick={() => loadExample('schedulePost')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Schedule Post
          </button>
          <button
            onClick={() => loadExample('analytics')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Get Analytics
          </button>
        </div>
      </div>

      <div className="bg-blue-900 border border-blue-700 rounded-md p-3">
        <p className="text-sm text-blue-200 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-300">
          Requires OAuth 2.0. Get credentials from Hootsuite Developer Portal.
        </p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-md p-3">
        <p className="text-xs text-gray-400 space-y-1">
          <div><strong className="text-gray-300">API Version:</strong> v1</div>
          <div><strong className="text-gray-300">Supported Networks:</strong> Twitter, Facebook, Instagram, LinkedIn, YouTube</div>
          <div><strong className="text-gray-300">Documentation:</strong> developer.hootsuite.com/docs</div>
        </p>
      </div>
    </div>
  );
};

export default HootsuiteConfig;
