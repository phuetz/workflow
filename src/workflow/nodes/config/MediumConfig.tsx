/**
 * Medium Node Configuration
 * Publishing platform for writers
 */

import React, { useState } from 'react';

interface MediumConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type MediumOperation = 'createPost' | 'getUser' | 'getPublications' | 'getPublicationContributors';

export const MediumConfig: React.FC<MediumConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<MediumOperation>(
    (config.operation as MediumOperation) || 'createPost'
  );
  const [title, setTitle] = useState(config.title as string || '');
  const [content, setContent] = useState(config.content as string || '');
  const [contentFormat, setContentFormat] = useState(config.contentFormat as string || 'html');
  const [tags, setTags] = useState(config.tags as string || '');
  const [canonicalUrl, setCanonicalUrl] = useState(config.canonicalUrl as string || '');
  const [publishStatus, setPublishStatus] = useState(config.publishStatus as string || 'draft');
  const [license, setLicense] = useState(config.license as string || 'all-rights-reserved');
  const [notifyFollowers, setNotifyFollowers] = useState(config.notifyFollowers as boolean || false);
  const [publicationId, setPublicationId] = useState(config.publicationId as string || '');

  const handleOperationChange = (newOperation: MediumOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    onChange({ ...config, title: value });
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    onChange({ ...config, content: value });
  };

  const handleContentFormatChange = (value: string) => {
    setContentFormat(value);
    onChange({ ...config, contentFormat: value });
  };

  const handleTagsChange = (value: string) => {
    setTags(value);
    onChange({ ...config, tags: value });
  };

  const handleCanonicalUrlChange = (value: string) => {
    setCanonicalUrl(value);
    onChange({ ...config, canonicalUrl: value });
  };

  const handlePublishStatusChange = (value: string) => {
    setPublishStatus(value);
    onChange({ ...config, publishStatus: value });
  };

  const handleLicenseChange = (value: string) => {
    setLicense(value);
    onChange({ ...config, license: value });
  };

  const handleNotifyFollowersChange = (value: boolean) => {
    setNotifyFollowers(value);
    onChange({ ...config, notifyFollowers: value });
  };

  const handlePublicationIdChange = (value: string) => {
    setPublicationId(value);
    onChange({ ...config, publicationId: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as MediumOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
        >
          <option value="createPost">Create Post</option>
          <option value="getUser">Get User Info</option>
          <option value="getPublications">Get Publications</option>
          <option value="getPublicationContributors">Get Publication Contributors</option>
        </select>
      </div>

      {operation === 'createPost' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Your post title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content Format
            </label>
            <select
              value={contentFormat}
              onChange={(e) => handleContentFormatChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
            >
              <option value="html">HTML</option>
              <option value="markdown">Markdown</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder={contentFormat === 'html' ? '<p>Your content in HTML...</p>' : '# Your content in Markdown...'}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              {contentFormat === 'html' ? 'Use valid HTML markup' : 'Use standard Markdown syntax'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated, max 3)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="javascript, tutorial, web-development"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Medium allows up to 3 tags per post
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Publish Status
            </label>
            <select
              value={publishStatus}
              onChange={(e) => handlePublishStatusChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
            >
              <option value="draft">Draft</option>
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License
            </label>
            <select
              value={license}
              onChange={(e) => handleLicenseChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
            >
              <option value="all-rights-reserved">All Rights Reserved</option>
              <option value="cc-40-by">CC BY 4.0</option>
              <option value="cc-40-by-sa">CC BY-SA 4.0</option>
              <option value="cc-40-by-nd">CC BY-ND 4.0</option>
              <option value="cc-40-by-nc">CC BY-NC 4.0</option>
              <option value="cc-40-by-nc-nd">CC BY-NC-ND 4.0</option>
              <option value="cc-40-by-nc-sa">CC BY-NC-SA 4.0</option>
              <option value="cc-40-zero">CC0 1.0</option>
              <option value="public-domain">Public Domain</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Canonical URL (Optional)
            </label>
            <input
              type="text"
              value={canonicalUrl}
              onChange={(e) => handleCanonicalUrlChange(e.target.value)}
              placeholder="https://yourblog.com/original-post"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Original URL if republishing content from another site
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Publication ID (Optional)
            </label>
            <input
              type="text"
              value={publicationId}
              onChange={(e) => handlePublicationIdChange(e.target.value)}
              placeholder="b45573563f5a"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Publish to a publication instead of your personal profile
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="notifyFollowers"
              checked={notifyFollowers}
              onChange={(e) => handleNotifyFollowersChange(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label htmlFor="notifyFollowers" className="ml-2 block text-sm text-gray-700">
              Notify followers when published
            </label>
          </div>
        </>
      )}

      {operation === 'getPublicationContributors' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Publication ID
          </label>
          <input
            type="text"
            value={publicationId}
            onChange={(e) => handlePublicationIdChange(e.target.value)}
            placeholder="b45573563f5a"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Get all contributors for a specific publication
          </p>
        </div>
      )}

      <div className="bg-green-50 border border-green-200 rounded-md p-3">
        <p className="text-sm font-medium text-green-900 mb-2">💡 Quick Tips:</p>
        <div className="text-xs text-green-700 space-y-1">
          {operation === 'createPost' && (
            <>
              <p>• Maximum 3 tags per post on Medium</p>
              <p>• Use canonical URL when republishing content</p>
              <p>• Draft posts can be edited before publishing</p>
              <p>• Unlisted posts are not shown in your profile but accessible via link</p>
            </>
          )}
          {operation === 'getUser' && (
            <p>• Returns authenticated user's profile information including ID, username, and name</p>
          )}
          {operation === 'getPublications' && (
            <p>• Returns all publications you have contributor access to</p>
          )}
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-sm text-gray-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-gray-600">
          Requires Medium Integration Token. Get it from{' '}
          <a
            href="https://medium.com/me/settings/security"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:underline"
          >
            Settings → Security and apps → Integration tokens
          </a>
        </p>
      </div>

      <div className="text-xs text-gray-500">
        📚 <a
          href="https://github.com/Medium/medium-api-docs"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Medium API Documentation
        </a>
      </div>
    </div>
  );
};
