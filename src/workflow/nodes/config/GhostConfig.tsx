/**
 * Ghost CMS Node Configuration
 * Professional publishing platform
 */

import React, { useState } from 'react';

interface GhostConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type GhostOperation = 'createPost' | 'updatePost' | 'getPost' | 'listPosts' | 'deletePost' |
                      'createPage' | 'updatePage' | 'getPage' | 'listPages' | 'deletePage' |
                      'getTags' | 'getAuthors' | 'getSettings';

export const GhostConfig: React.FC<GhostConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<GhostOperation>(
    (config.operation as GhostOperation) || 'createPost'
  );
  const [resourceId, setResourceId] = useState(config.resourceId as string || '');
  const [title, setTitle] = useState(config.title as string || '');
  const [content, setContent] = useState(config.content as string || '');
  const [status, setStatus] = useState(config.status as string || 'draft');
  const [tags, setTags] = useState(config.tags as string || '');
  const [featured, setFeatured] = useState(config.featured as boolean || false);

  const handleOperationChange = (newOperation: GhostOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleResourceIdChange = (value: string) => {
    setResourceId(value);
    onChange({ ...config, resourceId: value });
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    onChange({ ...config, title: value });
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    onChange({ ...config, content: value });
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    onChange({ ...config, status: value });
  };

  const handleTagsChange = (value: string) => {
    setTags(value);
    onChange({ ...config, tags: value });
  };

  const handleFeaturedChange = (value: boolean) => {
    setFeatured(value);
    onChange({ ...config, featured: value });
  };

  const isWriteOperation = ['createPost', 'updatePost', 'createPage', 'updatePage'].includes(operation);
  const isUpdateOperation = ['updatePost', 'getPost', 'deletePost', 'updatePage', 'getPage', 'deletePage'].includes(operation);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as GhostOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500"
        >
          <optgroup label="Posts">
            <option value="createPost">Create Post</option>
            <option value="updatePost">Update Post</option>
            <option value="getPost">Get Post</option>
            <option value="listPosts">List Posts</option>
            <option value="deletePost">Delete Post</option>
          </optgroup>
          <optgroup label="Pages">
            <option value="createPage">Create Page</option>
            <option value="updatePage">Update Page</option>
            <option value="getPage">Get Page</option>
            <option value="listPages">List Pages</option>
            <option value="deletePage">Delete Page</option>
          </optgroup>
          <optgroup label="Metadata">
            <option value="getTags">Get Tags</option>
            <option value="getAuthors">Get Authors</option>
            <option value="getSettings">Get Settings</option>
          </optgroup>
        </select>
      </div>

      {isUpdateOperation && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {operation.includes('Post') ? 'Post ID' : 'Page ID'}
          </label>
          <input
            type="text"
            value={resourceId}
            onChange={(e) => handleResourceIdChange(e.target.value)}
            placeholder="e.g., 5ddc9141c35e7700383b27e0 or {{ $json.id }}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Ghost resource ID (supports expressions)
          </p>
        </div>
      )}

      {isWriteOperation && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Your post or page title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Content in HTML or Mobiledoc format..."
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              HTML or Mobiledoc format. Ghost will convert to its internal format.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="technology, tutorial, getting-started"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Separate multiple tags with commas
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="featured"
              checked={featured}
              onChange={(e) => handleFeaturedChange(e.target.checked)}
              className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
            />
            <label htmlFor="featured" className="ml-2 block text-sm text-gray-700">
              Featured post/page
            </label>
          </div>
        </>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-sm font-medium text-gray-900 mb-2">💡 Quick Tips:</p>
        <div className="text-xs text-gray-700 space-y-1">
          {operation === 'createPost' && (
            <>
              <p>• Use HTML or Mobiledoc format for content</p>
              <p>• Set status to "published" to make live immediately</p>
              <p>• Tags help organize and categorize your content</p>
              <p>• Featured posts appear prominently on your site</p>
            </>
          )}
          {operation === 'listPosts' && (
            <>
              <p>• Returns all posts with metadata</p>
              <p>• Use filters to narrow down results</p>
              <p>• Supports pagination for large datasets</p>
            </>
          )}
          {operation === 'updatePost' && (
            <>
              <p>• Requires the post ID to update</p>
              <p>• Only include fields you want to change</p>
              <p>• Use expressions to update dynamically</p>
            </>
          )}
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-sm text-gray-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-gray-600">
          Requires Ghost Admin API Key. Get it from your Ghost admin panel under{' '}
          <strong>Settings → Integrations → Custom Integrations</strong>.
        </p>
        <p className="text-xs text-gray-600 mt-2">
          <strong>API URL:</strong> https://your-site.ghost.io (your Ghost site URL)
        </p>
      </div>

      <div className="text-xs text-gray-500">
        📚 <a
          href="https://ghost.org/docs/admin-api/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Ghost Admin API Documentation
        </a>
        {' • '}
        <a
          href="https://ghost.org/docs/content-api/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Content API
        </a>
      </div>
    </div>
  );
};
