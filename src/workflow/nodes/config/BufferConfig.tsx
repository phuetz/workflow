/**
 * Buffer Node Configuration
 * Social media scheduling and analytics
 */

import React, { useState } from 'react';

interface BufferConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type BufferOperation =
  | 'createPost'
  | 'updatePost'
  | 'deletePost'
  | 'getPosts'
  | 'getProfiles'
  | 'getProfile'
  | 'getAnalytics'
  | 'shuffleQueue';

export const BufferConfig: React.FC<BufferConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<BufferOperation>(
    (config.operation as BufferOperation) || 'createPost'
  );
  const [accessToken, setAccessToken] = useState((config.accessToken as string) || '');
  const [profileId, setProfileId] = useState((config.profileId as string) || '');
  const [text, setText] = useState((config.text as string) || '');
  const [scheduledAt, setScheduledAt] = useState((config.scheduledAt as string) || '');
  const [now, setNow] = useState((config.now as boolean) || false);
  const [top, setTop] = useState((config.top as boolean) || false);
  const [mediaPhoto, setMediaPhoto] = useState((config.mediaPhoto as string) || '');
  const [mediaLink, setMediaLink] = useState((config.mediaLink as string) || '');
  const [postId, setPostId] = useState((config.postId as string) || '');
  const [shorten, setShorten] = useState<boolean>((config.shorten as boolean) ?? true);

  const handleOperationChange = (newOperation: BufferOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleAccessTokenChange = (value: string) => {
    setAccessToken(value);
    onChange({ ...config, accessToken: value });
  };

  const handleProfileIdChange = (value: string) => {
    setProfileId(value);
    onChange({ ...config, profileId: value });
  };

  const handleTextChange = (value: string) => {
    setText(value);
    onChange({ ...config, text: value });
  };

  const handleScheduledAtChange = (value: string) => {
    setScheduledAt(value);
    onChange({ ...config, scheduledAt: value });
  };

  const handleNowChange = (checked: boolean) => {
    setNow(checked);
    onChange({ ...config, now: checked });
  };

  const handleTopChange = (checked: boolean) => {
    setTop(checked);
    onChange({ ...config, top: checked });
  };

  const handleMediaPhotoChange = (value: string) => {
    setMediaPhoto(value);
    onChange({ ...config, mediaPhoto: value });
  };

  const handleMediaLinkChange = (value: string) => {
    setMediaLink(value);
    onChange({ ...config, mediaLink: value });
  };

  const handlePostIdChange = (value: string) => {
    setPostId(value);
    onChange({ ...config, postId: value });
  };

  const handleShortenChange = (checked: boolean) => {
    setShorten(checked);
    onChange({ ...config, shorten: checked });
  };

  const loadExample = (example: 'immediate' | 'scheduled' | 'withImage') => {
    if (example === 'immediate') {
      handleOperationChange('createPost');
      handleTextChange('Breaking news! Our new feature is live. Check it out: https://example.com/feature 🎉');
      handleNowChange(true);
      handleTopChange(false);
    } else if (example === 'scheduled') {
      handleOperationChange('createPost');
      handleTextChange('Weekly insight: Automation saves teams an average of 10 hours per week. #Productivity');
      handleNowChange(false);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);
      handleScheduledAtChange(Math.floor(tomorrow.getTime() / 1000).toString());
    } else if (example === 'withImage') {
      handleOperationChange('createPost');
      handleTextChange('Excited to share our latest product update! 🚀 #ProductLaunch');
      handleMediaPhotoChange('https://example.com/product-image.jpg');
      handleTopChange(true);
    }
  };

  return (
    <div className="space-y-4 bg-gray-900 text-gray-100 p-4 rounded-lg">
      <div className="font-semibold text-lg mb-4 text-white">Buffer Configuration</div>

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
          OAuth 2.0 access token from Buffer
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as BufferOperation)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="createPost">Create Post</option>
          <option value="updatePost">Update Post</option>
          <option value="deletePost">Delete Post</option>
          <option value="getPosts">Get Posts</option>
          <option value="getProfiles">Get All Profiles</option>
          <option value="getProfile">Get Profile Details</option>
          <option value="getAnalytics">Get Analytics</option>
          <option value="shuffleQueue">Shuffle Queue</option>
        </select>
      </div>

      {(operation === 'createPost' || operation === 'updatePost' || operation === 'getPosts' ||
        operation === 'getProfile' || operation === 'getAnalytics' || operation === 'shuffleQueue') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Profile ID
          </label>
          <input
            type="text"
            value={profileId}
            onChange={(e) => handleProfileIdChange(e.target.value)}
            placeholder="5a1b2c3d4e5f or {{ $json.profileId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Buffer profile ID (get from "Get All Profiles" operation)
          </p>
        </div>
      )}

      {(operation === 'createPost' || operation === 'updatePost') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Post Text
            </label>
            <textarea
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Your post content... Use {{ expressions }}"
              rows={4}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Post text (character limits vary by network)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Media Photo URL (Optional)
              </label>
              <input
                type="text"
                value={mediaPhoto}
                onChange={(e) => handleMediaPhotoChange(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Media Link (Optional)
              </label>
              <input
                type="text"
                value={mediaLink}
                onChange={(e) => handleMediaLinkChange(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="now"
                checked={now}
                onChange={(e) => handleNowChange(e.target.checked)}
                className="mr-2 bg-gray-800 border-gray-700"
              />
              <label htmlFor="now" className="text-sm text-gray-300">
                Post immediately (ignores scheduled time)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="top"
                checked={top}
                onChange={(e) => handleTopChange(e.target.checked)}
                className="mr-2 bg-gray-800 border-gray-700"
              />
              <label htmlFor="top" className="text-sm text-gray-300">
                Add to top of queue (post next)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="shorten"
                checked={shorten}
                onChange={(e) => handleShortenChange(e.target.checked)}
                className="mr-2 bg-gray-800 border-gray-700"
              />
              <label htmlFor="shorten" className="text-sm text-gray-300">
                Shorten URLs automatically
              </label>
            </div>
          </div>

          {!now && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Scheduled At (Unix Timestamp - Optional)
              </label>
              <input
                type="text"
                value={scheduledAt}
                onChange={(e) => handleScheduledAtChange(e.target.value)}
                placeholder="1640000000 or leave empty for next available slot"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Unix timestamp or leave empty to use next available slot in queue
              </p>
            </div>
          )}
        </>
      )}

      {(operation === 'updatePost' || operation === 'deletePost') && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Post/Update ID
          </label>
          <input
            type="text"
            value={postId}
            onChange={(e) => handlePostIdChange(e.target.value)}
            placeholder="5f1a2b3c4d5e or {{ $json.postId }}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Buffer post ID or update ID
          </p>
        </div>
      )}

      <div className="border-t border-gray-700 pt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Quick Examples
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadExample('immediate')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Post Now
          </button>
          <button
            onClick={() => loadExample('scheduled')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Schedule Post
          </button>
          <button
            onClick={() => loadExample('withImage')}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
          >
            Post with Image
          </button>
        </div>
      </div>

      <div className="bg-blue-900 border border-blue-700 rounded-md p-3">
        <p className="text-sm text-blue-200 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-300">
          Requires OAuth 2.0 access token. Create app at buffer.com/developers
        </p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-md p-3">
        <p className="text-xs text-gray-400 space-y-1">
          <div><strong className="text-gray-300">API Version:</strong> v1</div>
          <div><strong className="text-gray-300">Supported Networks:</strong> Twitter, Facebook, LinkedIn, Instagram</div>
          <div><strong className="text-gray-300">Documentation:</strong> buffer.com/developers/api</div>
        </p>
      </div>
    </div>
  );
};

export default BufferConfig;
