/** Confluence Config */
import React from 'react';

export function ConfluenceConfig(): React.ReactElement {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Operation</label>
        <select className="w-full border rounded px-3 py-2">
          <option value="createPage">Create Page</option>
          <option value="updatePage">Update Page</option>
          <option value="getPage">Get Page</option>
          <option value="deletePage">Delete Page</option>
          <option value="searchContent">Search Content (CQL)</option>
          <option value="createBlogPost">Create Blog Post</option>
          <option value="addComment">Add Comment</option>
          <option value="getComments">Get Comments</option>
          <option value="getSpaces">Get Spaces</option>
          <option value="createSpace">Create Space</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Space ID</label>
        <input
          type="text"
          placeholder="123456789"
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">
          Space ID (required for creating pages and blog posts)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          type="text"
          placeholder="Page title"
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Body Format</label>
        <select className="w-full border rounded px-3 py-2">
          <option value="storage">Storage (HTML-based)</option>
          <option value="atlas_doc_format">Atlas Document Format (ADF)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Content</label>
        <textarea
          placeholder="<p>Page content in storage format or ADF JSON...</p>"
          className="w-full border rounded px-3 py-2 font-mono text-sm"
          rows={6}
        />
        <p className="text-xs text-gray-500 mt-1">
          Content in selected format (Storage HTML or ADF JSON)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Status</label>
        <select className="w-full border rounded px-3 py-2">
          <option value="current">Current (Published)</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Parent Page ID (Optional)</label>
        <input
          type="text"
          placeholder="987654321"
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">
          Parent page ID to create a child page
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">CQL Query (for search)</label>
        <input
          type="text"
          placeholder='type=page and space=DEV and title~"API"'
          className="w-full border rounded px-3 py-2 font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Confluence Query Language for searching content
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-3">
        <p className="text-sm font-medium mb-1">Quick Examples:</p>
        <div className="text-xs space-y-1">
          <p><strong>Create Page:</strong> spaceId + title + body required</p>
          <p><strong>Storage Format:</strong> <code>&lt;p&gt;Hello &lt;strong&gt;world&lt;/strong&gt;&lt;/p&gt;</code></p>
          <p><strong>CQL Search:</strong> <code>type=page and lastModified &gt;= now("-7d")</code></p>
          <p><strong>Update:</strong> Requires current version number (get page first)</p>
        </div>
      </div>

      <div className="text-xs text-gray-600">
        <a
          href="https://developer.atlassian.com/cloud/confluence/rest/v2/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Confluence Cloud REST API v2
        </a>
        {' • '}
        <a
          href="https://developer.atlassian.com/cloud/confluence/cql/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          CQL Reference
        </a>
        {' • '}
        <a
          href="https://developer.atlassian.com/cloud/confluence/rest/v2/intro/#about"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Storage Format
        </a>
      </div>
    </div>
  );
}
