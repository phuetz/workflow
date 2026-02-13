/**
 * WordPress Node Configuration
 * Popular CMS via REST API
 */

import React, { useState } from 'react';

interface WordPressConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

type WordPressOperation =
  | 'createPost' | 'getPost' | 'updatePost' | 'deletePost' | 'listPosts'
  | 'createPage' | 'getPage' | 'updatePage' | 'deletePage' | 'listPages'
  | 'getCategories' | 'getTags' | 'getMedia' | 'uploadMedia'
  | 'createComment' | 'getComments';

export const WordPressConfig: React.FC<WordPressConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<WordPressOperation>(
    (config.operation as WordPressOperation) || 'createPost'
  );
  const [siteUrl, setSiteUrl] = useState(config.siteUrl as string || '');
  const [resourceId, setResourceId] = useState(config.resourceId as string || '');
  const [title, setTitle] = useState(config.title as string || '');
  const [content, setContent] = useState(config.content as string || '');
  const [status, setStatus] = useState(config.status as string || 'draft');
  const [categories, setCategories] = useState(config.categories as string || '');
  const [tags, setTags] = useState(config.tags as string || '');
  const [excerpt, setExcerpt] = useState(config.excerpt as string || '');
  const [featuredMedia, setFeaturedMedia] = useState(config.featuredMedia as string || '');
  const [queryParams, setQueryParams] = useState(config.queryParams as string || '');

  const handleOperationChange = (newOperation: WordPressOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleSiteUrlChange = (value: string) => {
    setSiteUrl(value);
    onChange({ ...config, siteUrl: value });
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

  const handleCategoriesChange = (value: string) => {
    setCategories(value);
    onChange({ ...config, categories: value });
  };

  const handleTagsChange = (value: string) => {
    setTags(value);
    onChange({ ...config, tags: value });
  };

  const handleExcerptChange = (value: string) => {
    setExcerpt(value);
    onChange({ ...config, excerpt: value });
  };

  const handleFeaturedMediaChange = (value: string) => {
    setFeaturedMedia(value);
    onChange({ ...config, featuredMedia: value });
  };

  const handleQueryParamsChange = (value: string) => {
    setQueryParams(value);
    onChange({ ...config, queryParams: value });
  };

  const isWriteOperation = ['createPost', 'updatePost', 'createPage', 'updatePage'].includes(operation);
  const needsResourceId = ['getPost', 'updatePost', 'deletePost', 'getPage', 'updatePage', 'deletePage'].includes(operation);
  const isPostOperation = operation.toLowerCase().includes('post');
  const isListOperation = ['listPosts', 'listPages', 'getCategories', 'getTags', 'getMedia', 'getComments'].includes(operation);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as WordPressOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <optgroup label="Posts">
            <option value="createPost">Create Post</option>
            <option value="getPost">Get Post</option>
            <option value="updatePost">Update Post</option>
            <option value="deletePost">Delete Post</option>
            <option value="listPosts">List Posts</option>
          </optgroup>
          <optgroup label="Pages">
            <option value="createPage">Create Page</option>
            <option value="getPage">Get Page</option>
            <option value="updatePage">Update Page</option>
            <option value="deletePage">Delete Page</option>
            <option value="listPages">List Pages</option>
          </optgroup>
          <optgroup label="Media">
            <option value="getMedia">Get Media</option>
            <option value="uploadMedia">Upload Media</option>
          </optgroup>
          <optgroup label="Taxonomy">
            <option value="getCategories">Get Categories</option>
            <option value="getTags">Get Tags</option>
          </optgroup>
          <optgroup label="Comments">
            <option value="createComment">Create Comment</option>
            <option value="getComments">Get Comments</option>
          </optgroup>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Site URL
        </label>
        <input
          type="text"
          value={siteUrl}
          onChange={(e) => handleSiteUrlChange(e.target.value)}
          placeholder="https://yourblog.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Your WordPress site URL (REST API will be at /wp-json/wp/v2/)
        </p>
      </div>

      {needsResourceId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {isPostOperation ? 'Post ID' : 'Page ID'}
          </label>
          <input
            type="text"
            value={resourceId}
            onChange={(e) => handleResourceIdChange(e.target.value)}
            placeholder="e.g., 123 or {{ $json.id }}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            WordPress post/page ID (supports expressions)
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Your content in HTML format..."
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Content in HTML format. WordPress Gutenberg blocks are supported.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Excerpt (Optional)
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => handleExcerptChange(e.target.value)}
              placeholder="Brief summary of your post..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="publish">Publish</option>
              <option value="pending">Pending Review</option>
              <option value="private">Private</option>
              <option value="future">Scheduled (Future)</option>
            </select>
          </div>

          {isPostOperation && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categories (comma-separated IDs)
                </label>
                <input
                  type="text"
                  value={categories}
                  onChange={(e) => handleCategoriesChange(e.target.value)}
                  placeholder="1, 5, 8"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Category IDs (get from Get Categories operation)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated IDs)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  placeholder="2, 7, 12"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tag IDs (get from Get Tags operation)
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Featured Media ID (Optional)
            </label>
            <input
              type="text"
              value={featuredMedia}
              onChange={(e) => handleFeaturedMediaChange(e.target.value)}
              placeholder="e.g., 456"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Media library ID for featured image
            </p>
          </div>
        </>
      )}

      {isListOperation && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Query Parameters (Optional)
          </label>
          <textarea
            value={queryParams}
            onChange={(e) => handleQueryParamsChange(e.target.value)}
            placeholder='per_page=10&order=desc&orderby=date&status=publish'
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            URL query parameters for filtering and pagination
          </p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm font-medium text-blue-900 mb-2">💡 Quick Tips:</p>
        <div className="text-xs text-blue-800 space-y-1">
          {operation === 'createPost' && (
            <>
              <p>• Status "publish" makes the post live immediately</p>
              <p>• Use HTML for content or Gutenberg block JSON</p>
              <p>• Categories and tags use numeric IDs, not names</p>
              <p>• Upload featured image first, then use its ID</p>
            </>
          )}
          {operation === 'listPosts' && (
            <>
              <p>• Query params: per_page, page, order, orderby, status, categories, tags</p>
              <p>• Default per_page is 10, max is 100</p>
              <p>• Use status=publish to get only published posts</p>
            </>
          )}
          {operation === 'uploadMedia' && (
            <>
              <p>• Upload returns media ID for use as featured image</p>
              <p>• Supported formats: jpg, png, gif, pdf, etc.</p>
            </>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-sm font-medium text-yellow-900 mb-1">⚠️ Important Notes:</p>
        <div className="text-xs text-yellow-700 space-y-1">
          <p>• REST API must be enabled (default in WordPress 4.7+)</p>
          <p>• Write operations require authentication (Application Password or OAuth)</p>
          <p>• Some operations may require specific user capabilities</p>
          <p>• Custom post types use same endpoints with different paths</p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-sm text-gray-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-gray-600">
          <strong>Application Passwords:</strong> User → Profile → Application Passwords<br />
          <strong>OAuth:</strong> Use OAuth plugin for token-based auth<br />
          <strong>Basic Auth:</strong> Only for development (not recommended for production)
        </p>
        <p className="text-xs text-gray-600 mt-2">
          REST API endpoint: <code className="bg-white px-1">{siteUrl || 'https://yoursite.com'}/wp-json/wp/v2/</code>
        </p>
      </div>

      <div className="text-xs text-gray-500">
        📚 <a
          href="https://developer.wordpress.org/rest-api/reference/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          WordPress REST API Reference
        </a>
        {' • '}
        <a
          href="https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Authentication Guide
        </a>
      </div>
    </div>
  );
};
