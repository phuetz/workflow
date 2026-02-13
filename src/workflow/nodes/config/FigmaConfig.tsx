/** Figma Config */
import React from 'react';

export function FigmaConfig(): React.ReactElement {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Operation</label>
        <select className="w-full border rounded px-3 py-2">
          <option value="getFile">Get File</option>
          <option value="getFileNodes">Get File Nodes</option>
          <option value="getImages">Export Images</option>
          <option value="getComments">Get Comments</option>
          <option value="postComment">Post Comment</option>
          <option value="getVersions">Get Versions</option>
          <option value="getTeamProjects">Get Team Projects</option>
          <option value="getProjectFiles">Get Project Files</option>
          <option value="getTeamComponents">Get Team Components</option>
          <option value="getTeamStyles">Get Team Styles</option>
          <option value="getUser">Get Current User</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">File Key</label>
        <input
          type="text"
          placeholder="abc123def456"
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">
          File key from Figma URL: figma.com/file/<strong>FILE_KEY</strong>/...
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Node IDs (comma-separated)</label>
        <input
          type="text"
          placeholder="1:5,1:6,1:7"
          className="w-full border rounded px-3 py-2 font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Node IDs for getFileNodes or getImages operations
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Image Format</label>
        <select className="w-full border rounded px-3 py-2">
          <option value="png">PNG</option>
          <option value="jpg">JPG</option>
          <option value="svg">SVG</option>
          <option value="pdf">PDF</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Scale</label>
        <select className="w-full border rounded px-3 py-2">
          <option value="1">1x</option>
          <option value="2">2x</option>
          <option value="3">3x</option>
          <option value="4">4x</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Image export scale (PNG/JPG only)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Comment Message</label>
        <textarea
          placeholder="Great design! Let's discuss this further."
          className="w-full border rounded px-3 py-2"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Comment Position (Optional)</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="X coordinate"
            className="border rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Y coordinate"
            className="border rounded px-3 py-2"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Canvas coordinates for positioning comment
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Team ID</label>
        <input
          type="text"
          placeholder="123456789"
          className="w-full border rounded px-3 py-2"
        />
        <p className="text-xs text-gray-500 mt-1">
          Required for team-level operations (projects, components, styles)
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-3">
        <p className="text-sm font-medium mb-1">Quick Tips:</p>
        <div className="text-xs space-y-1">
          <p><strong>File Key:</strong> Found in Figma URL after /file/</p>
          <p><strong>Node IDs:</strong> Right-click node → Copy/Paste as → Copy link (ID in URL)</p>
          <p><strong>Export Images:</strong> Returns URLs to download images</p>
          <p><strong>Comments:</strong> Can be positioned on canvas or attached to nodes</p>
          <p><strong>Versions:</strong> Get file version history with labels</p>
        </div>
      </div>

      <div className="text-xs text-gray-600">
        <a
          href="https://www.figma.com/developers/api"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Figma API Documentation
        </a>
        {' • '}
        <a
          href="https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Access Tokens
        </a>
        {' • '}
        <a
          href="https://www.figma.com/developers/api#get-file-endpoint"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          File Structure
        </a>
      </div>
    </div>
  );
}
