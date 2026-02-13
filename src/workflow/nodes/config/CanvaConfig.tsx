/**
 * Canva Node Configuration
 * Graphic design and visual content creation
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface CanvaConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

type CanvaOperation =
  | 'listDesigns'
  | 'getDesign'
  | 'createDesign'
  | 'duplicateDesign'
  | 'updateDesign'
  | 'deleteDesign'
  | 'exportDesign'
  | 'listFolders'
  | 'createFolder'
  | 'moveToFolder'
  | 'listTemplates'
  | 'createFromTemplate'
  | 'listBrandKits'
  | 'uploadAsset'
  | 'listAssets'
  | 'shareDesign';

export const CanvaConfig: React.FC<CanvaConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<CanvaOperation>(
    (config.operation as CanvaOperation) || 'listDesigns'
  );
  const [designId, setDesignId] = useState((config.designId as string) || '');
  const [designType, setDesignType] = useState((config.designType as string) || 'presentation');
  const [title, setTitle] = useState((config.title as string) || '');
  const [folderId, setFolderId] = useState((config.folderId as string) || '');
  const [folderName, setFolderName] = useState((config.folderName as string) || '');
  const [templateId, setTemplateId] = useState((config.templateId as string) || '');
  const [exportFormat, setExportFormat] = useState((config.exportFormat as string) || 'pdf');
  const [quality, setQuality] = useState((config.quality as string) || 'standard');
  const [pages, setPages] = useState((config.pages as string) || 'all');
  const [assetFile, setAssetFile] = useState((config.assetFile as string) || '');
  const [shareEmail, setShareEmail] = useState((config.shareEmail as string) || '');
  const [sharePermission, setSharePermission] = useState((config.sharePermission as string) || 'view');

  const handleOperationChange = (newOperation: CanvaOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleFieldChange = (field: string, value: string | number | boolean) => {
    onChange({ ...config, [field]: value });
  };

  const operationDescriptions: Record<CanvaOperation, string> = {
    listDesigns: 'List all designs in your account',
    getDesign: 'Get detailed information about a design',
    createDesign: 'Create a new blank design',
    duplicateDesign: 'Duplicate an existing design',
    updateDesign: 'Update design properties (title, folder)',
    deleteDesign: 'Delete a design',
    exportDesign: 'Export design to PDF, PNG, JPG, or other formats',
    listFolders: 'List all folders',
    createFolder: 'Create a new folder',
    moveToFolder: 'Move design to a folder',
    listTemplates: 'List available templates',
    createFromTemplate: 'Create design from template',
    listBrandKits: 'Get brand kit assets and colors',
    uploadAsset: 'Upload image or video asset',
    listAssets: 'List uploaded assets',
    shareDesign: 'Share design with team members',
  };

  const loadExample = (type: 'create' | 'export' | 'template') => {
    switch (type) {
      case 'create':
        setOperation('createDesign');
        setDesignType('presentation');
        setTitle('My Presentation');
        onChange({
          ...config,
          operation: 'createDesign',
          designType: 'presentation',
          title: 'My Presentation',
        });
        break;
      case 'export':
        setOperation('exportDesign');
        setDesignId('{{ $json.designId }}');
        setExportFormat('pdf');
        setQuality('high');
        onChange({
          ...config,
          operation: 'exportDesign',
          designId: '{{ $json.designId }}',
          exportFormat: 'pdf',
          quality: 'high',
        });
        break;
      case 'template':
        setOperation('createFromTemplate');
        setTemplateId('{{ $json.templateId }}');
        setTitle('Design from Template');
        onChange({
          ...config,
          operation: 'createFromTemplate',
          templateId: '{{ $json.templateId }}',
          title: 'Design from Template',
        });
        break;
    }
  };

  return (
    <div className="canva-config space-y-4">
      <div className="font-semibold text-lg mb-4">Canva Configuration</div>

      <div>
        <label className="block text-sm font-medium mb-2">Operation</label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as CanvaOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <optgroup label="Design Management">
            <option value="listDesigns">List Designs</option>
            <option value="getDesign">Get Design</option>
            <option value="createDesign">Create Design</option>
            <option value="duplicateDesign">Duplicate Design</option>
            <option value="updateDesign">Update Design</option>
            <option value="deleteDesign">Delete Design</option>
            <option value="exportDesign">Export Design</option>
          </optgroup>
          <optgroup label="Folder Management">
            <option value="listFolders">List Folders</option>
            <option value="createFolder">Create Folder</option>
            <option value="moveToFolder">Move to Folder</option>
          </optgroup>
          <optgroup label="Templates & Assets">
            <option value="listTemplates">List Templates</option>
            <option value="createFromTemplate">Create from Template</option>
            <option value="listBrandKits">List Brand Kits</option>
            <option value="uploadAsset">Upload Asset</option>
            <option value="listAssets">List Assets</option>
          </optgroup>
          <optgroup label="Collaboration">
            <option value="shareDesign">Share Design</option>
          </optgroup>
        </select>
        <p className="text-xs text-gray-600 mt-1">
          {operationDescriptions[operation]}
        </p>
      </div>

      {/* Get Design / Duplicate / Update / Delete / Export */}
      {(operation === 'getDesign' || operation === 'duplicateDesign' || operation === 'updateDesign' ||
        operation === 'deleteDesign' || operation === 'exportDesign' || operation === 'shareDesign') && (
        <div className="p-3 bg-gray-50 rounded space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Design ID</label>
            <input
              type="text"
              value={designId}
              onChange={(e) => {
                setDesignId(e.target.value);
                handleFieldChange('designId', e.target.value);
              }}
              placeholder="DAFxxx..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
            <p className="text-xs text-gray-600 mt-1">
              Canva design ID (from URL or API)
            </p>
          </div>
          {operation === 'updateDesign' && (
            <div>
              <label className="block text-sm font-medium mb-1">New Title (Optional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  handleFieldChange('title', e.target.value);
                }}
                placeholder="Updated Design Title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          )}
        </div>
      )}

      {/* Create Design */}
      {operation === 'createDesign' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Design Type</label>
            <select
              value={designType}
              onChange={(e) => {
                setDesignType(e.target.value);
                handleFieldChange('designType', e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="presentation">Presentation</option>
              <option value="document">Document</option>
              <option value="social-media-post">Social Media Post</option>
              <option value="instagram-post">Instagram Post</option>
              <option value="facebook-post">Facebook Post</option>
              <option value="linkedin-post">LinkedIn Post</option>
              <option value="instagram-story">Instagram Story</option>
              <option value="facebook-cover">Facebook Cover</option>
              <option value="poster">Poster</option>
              <option value="flyer">Flyer</option>
              <option value="brochure">Brochure</option>
              <option value="business-card">Business Card</option>
              <option value="resume">Resume</option>
              <option value="logo">Logo</option>
              <option value="infographic">Infographic</option>
              <option value="youtube-thumbnail">YouTube Thumbnail</option>
              <option value="video">Video</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                handleFieldChange('title', e.target.value);
              }}
              placeholder="My Design"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      )}

      {/* Export Design */}
      {operation === 'exportDesign' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Export Format</label>
            <select
              value={exportFormat}
              onChange={(e) => {
                setExportFormat(e.target.value);
                handleFieldChange('exportFormat', e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="pdf">PDF</option>
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
              <option value="svg">SVG</option>
              <option value="gif">GIF (animated)</option>
              <option value="mp4">MP4 (video)</option>
              <option value="pptx">PowerPoint</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quality</label>
            <select
              value={quality}
              onChange={(e) => {
                setQuality(e.target.value);
                handleFieldChange('quality', e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="standard">Standard</option>
              <option value="high">High (Pro)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Pages</label>
            <input
              type="text"
              value={pages}
              onChange={(e) => {
                setPages(e.target.value);
                handleFieldChange('pages', e.target.value);
              }}
              placeholder="all or 1,2,3 or 1-5"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-600 mt-1">
              Specify "all", page numbers (1,2,3), or range (1-5)
            </p>
          </div>
        </div>
      )}

      {/* Create Folder */}
      {operation === 'createFolder' && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">Folder Name</label>
          <input
            type="text"
            value={folderName}
            onChange={(e) => {
              setFolderName(e.target.value);
              handleFieldChange('folderName', e.target.value);
            }}
            placeholder="My Folder"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      )}

      {/* Move to Folder */}
      {operation === 'moveToFolder' && (
        <div className="p-3 bg-gray-50 rounded space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Folder ID</label>
            <input
              type="text"
              value={folderId}
              onChange={(e) => {
                setFolderId(e.target.value);
                handleFieldChange('folderId', e.target.value);
              }}
              placeholder="FAFxxx..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
        </div>
      )}

      {/* Create from Template */}
      {operation === 'createFromTemplate' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Template ID</label>
            <input
              type="text"
              value={templateId}
              onChange={(e) => {
                setTemplateId(e.target.value);
                handleFieldChange('templateId', e.target.value);
              }}
              placeholder="DAFxxx..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Design Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                handleFieldChange('title', e.target.value);
              }}
              placeholder="My Design from Template"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      )}

      {/* Upload Asset */}
      {operation === 'uploadAsset' && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">Asset File (Expression)</label>
          <input
            type="text"
            value={assetFile}
            onChange={(e) => {
              setAssetFile(e.target.value);
              handleFieldChange('assetFile', e.target.value);
            }}
            placeholder="{{ $json.imageData }}"
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
          <p className="text-xs text-gray-600 mt-1">
            Binary file data, URL, or base64 encoded image
          </p>
        </div>
      )}

      {/* Share Design */}
      {operation === 'shareDesign' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Email Address</label>
            <input
              type="email"
              value={shareEmail}
              onChange={(e) => {
                setShareEmail(e.target.value);
                handleFieldChange('shareEmail', e.target.value);
              }}
              placeholder="user@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Permission</label>
            <select
              value={sharePermission}
              onChange={(e) => {
                setSharePermission(e.target.value);
                handleFieldChange('sharePermission', e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="view">View Only</option>
              <option value="comment">Can Comment</option>
              <option value="edit">Can Edit</option>
            </select>
          </div>
        </div>
      )}

      {/* Example Templates */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Quick Examples</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => loadExample('create')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            ➕ Create
          </button>
          <button
            onClick={() => loadExample('export')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            📥 Export
          </button>
          <button
            onClick={() => loadExample('template')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            📋 Template
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 Canva Tips:</strong></div>
        <div>• Design IDs start with "DAF" prefix</div>
        <div>• Folder IDs start with "FAF" prefix</div>
        <div>• High quality exports require Canva Pro</div>
        <div>• API has rate limits - max 1000 requests/hour</div>
        <div>• Video exports limited to 5 minutes duration</div>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm">
        <strong>🔐 Authentication:</strong> OAuth 2.0 with scopes: design:read, design:write,
        folder:read, folder:write, asset:read, asset:write. Configure in Credentials Manager.
      </div>
    </div>
  );
};

export default CanvaConfig;
