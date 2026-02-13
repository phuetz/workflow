/**
 * Sketch Node Configuration
 * Design tool integration for macOS
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface SketchConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

type SketchOperation =
  | 'listDocuments'
  | 'getDocument'
  | 'createDocument'
  | 'updateDocument'
  | 'deleteDocument'
  | 'listArtboards'
  | 'getArtboard'
  | 'exportArtboard'
  | 'listPages'
  | 'getPage'
  | 'listLayers'
  | 'getLayer'
  | 'listSharedStyles'
  | 'getSharedStyle'
  | 'listSymbols'
  | 'getSymbol'
  | 'listLibraries'
  | 'shareDocument'
  | 'getVersion'
  | 'createBranch';

export const SketchConfig: React.FC<SketchConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<SketchOperation>(
    (config.operation as SketchOperation) || 'listDocuments'
  );
  const [documentId, setDocumentId] = useState((config.documentId as string) || '');
  const [artboardId, setArtboardId] = useState((config.artboardId as string) || '');
  const [pageId, setPageId] = useState((config.pageId as string) || '');
  const [layerId, setLayerId] = useState((config.layerId as string) || '');
  const [documentName, setDocumentName] = useState((config.documentName as string) || '');
  const [exportFormat, setExportFormat] = useState((config.exportFormat as string) || 'png');
  const [scale, setScale] = useState((config.scale as number) || 1);
  const [shareEmail, setShareEmail] = useState((config.shareEmail as string) || '');
  const [sharePermission, setSharePermission] = useState((config.sharePermission as string) || 'view');
  const [branchName, setBranchName] = useState((config.branchName as string) || '');

  const handleOperationChange = (newOperation: SketchOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleFieldChange = (field: string, value: string | number | boolean) => {
    onChange({ ...config, [field]: value });
  };

  const operationDescriptions: Record<SketchOperation, string> = {
    listDocuments: 'List all Sketch documents in workspace',
    getDocument: 'Get document details and metadata',
    createDocument: 'Create a new Sketch document',
    updateDocument: 'Update document properties',
    deleteDocument: 'Delete a document',
    listArtboards: 'List all artboards in a document',
    getArtboard: 'Get artboard details',
    exportArtboard: 'Export artboard as PNG, JPG, SVG, or PDF',
    listPages: 'List all pages in a document',
    getPage: 'Get page details',
    listLayers: 'List all layers in an artboard or page',
    getLayer: 'Get layer details',
    listSharedStyles: 'List shared text and layer styles',
    getSharedStyle: 'Get shared style details',
    listSymbols: 'List all symbols in document',
    getSymbol: 'Get symbol details',
    listLibraries: 'List available Sketch libraries',
    shareDocument: 'Share document with team members',
    getVersion: 'Get document version history',
    createBranch: 'Create a version branch',
  };

  const loadExample = (type: 'export' | 'document' | 'share') => {
    switch (type) {
      case 'export':
        setOperation('exportArtboard');
        setDocumentId('{{ $json.documentId }}');
        setArtboardId('{{ $json.artboardId }}');
        setExportFormat('png');
        setScale(2);
        onChange({
          ...config,
          operation: 'exportArtboard',
          documentId: '{{ $json.documentId }}',
          artboardId: '{{ $json.artboardId }}',
          exportFormat: 'png',
          scale: 2,
        });
        break;
      case 'document':
        setOperation('createDocument');
        setDocumentName('New Design Document');
        onChange({
          ...config,
          operation: 'createDocument',
          documentName: 'New Design Document',
        });
        break;
      case 'share':
        setOperation('shareDocument');
        setDocumentId('{{ $json.documentId }}');
        setShareEmail('designer@example.com');
        setSharePermission('edit');
        onChange({
          ...config,
          operation: 'shareDocument',
          documentId: '{{ $json.documentId }}',
          shareEmail: 'designer@example.com',
          sharePermission: 'edit',
        });
        break;
    }
  };

  return (
    <div className="sketch-config space-y-4">
      <div className="font-semibold text-lg mb-4">Sketch Configuration</div>

      <div>
        <label className="block text-sm font-medium mb-2">Operation</label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as SketchOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <optgroup label="Document Management">
            <option value="listDocuments">List Documents</option>
            <option value="getDocument">Get Document</option>
            <option value="createDocument">Create Document</option>
            <option value="updateDocument">Update Document</option>
            <option value="deleteDocument">Delete Document</option>
          </optgroup>
          <optgroup label="Artboards">
            <option value="listArtboards">List Artboards</option>
            <option value="getArtboard">Get Artboard</option>
            <option value="exportArtboard">Export Artboard</option>
          </optgroup>
          <optgroup label="Pages & Layers">
            <option value="listPages">List Pages</option>
            <option value="getPage">Get Page</option>
            <option value="listLayers">List Layers</option>
            <option value="getLayer">Get Layer</option>
          </optgroup>
          <optgroup label="Styles & Symbols">
            <option value="listSharedStyles">List Shared Styles</option>
            <option value="getSharedStyle">Get Shared Style</option>
            <option value="listSymbols">List Symbols</option>
            <option value="getSymbol">Get Symbol</option>
            <option value="listLibraries">List Libraries</option>
          </optgroup>
          <optgroup label="Collaboration">
            <option value="shareDocument">Share Document</option>
            <option value="getVersion">Get Version History</option>
            <option value="createBranch">Create Branch</option>
          </optgroup>
        </select>
        <p className="text-xs text-gray-600 mt-1">
          {operationDescriptions[operation]}
        </p>
      </div>

      {/* Document Operations */}
      {(operation === 'getDocument' || operation === 'updateDocument' || operation === 'deleteDocument' ||
        operation === 'listArtboards' || operation === 'listPages' || operation === 'shareDocument' ||
        operation === 'getVersion') && (
        <div className="p-3 bg-gray-50 rounded space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Document ID</label>
            <input
              type="text"
              value={documentId}
              onChange={(e) => {
                setDocumentId(e.target.value);
                handleFieldChange('documentId', e.target.value);
              }}
              placeholder="abc123..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
            <p className="text-xs text-gray-600 mt-1">
              Sketch Cloud document ID or share link
            </p>
          </div>
          {operation === 'updateDocument' && (
            <div>
              <label className="block text-sm font-medium mb-1">New Name</label>
              <input
                type="text"
                value={documentName}
                onChange={(e) => {
                  setDocumentName(e.target.value);
                  handleFieldChange('documentName', e.target.value);
                }}
                placeholder="Updated Document Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          )}
        </div>
      )}

      {/* Create Document */}
      {operation === 'createDocument' && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">Document Name</label>
          <input
            type="text"
            value={documentName}
            onChange={(e) => {
              setDocumentName(e.target.value);
              handleFieldChange('documentName', e.target.value);
            }}
            placeholder="My Design Document"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      )}

      {/* Artboard Operations */}
      {(operation === 'getArtboard' || operation === 'exportArtboard') && (
        <div className="p-3 bg-gray-50 rounded space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Artboard ID</label>
            <input
              type="text"
              value={artboardId}
              onChange={(e) => {
                setArtboardId(e.target.value);
                handleFieldChange('artboardId', e.target.value);
              }}
              placeholder="artboard-123"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          {operation === 'exportArtboard' && (
            <>
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
                  <option value="png">PNG</option>
                  <option value="jpg">JPG</option>
                  <option value="svg">SVG</option>
                  <option value="pdf">PDF</option>
                  <option value="webp">WebP</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Scale (@{scale}x)</label>
                <input
                  type="number"
                  min="0.5"
                  max="4"
                  step="0.5"
                  value={scale}
                  onChange={(e) => {
                    setScale(Number(e.target.value));
                    handleFieldChange('scale', Number(e.target.value));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <input
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.5"
                  value={scale}
                  onChange={(e) => {
                    setScale(Number(e.target.value));
                    handleFieldChange('scale', Number(e.target.value));
                  }}
                  className="w-full mt-2"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Export scale: @1x, @2x (Retina), @3x, @4x
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Page Operations */}
      {(operation === 'getPage' || operation === 'listLayers') && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">Page ID</label>
          <input
            type="text"
            value={pageId}
            onChange={(e) => {
              setPageId(e.target.value);
              handleFieldChange('pageId', e.target.value);
            }}
            placeholder="page-123"
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
        </div>
      )}

      {/* Layer Operations */}
      {operation === 'getLayer' && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">Layer ID</label>
          <input
            type="text"
            value={layerId}
            onChange={(e) => {
              setLayerId(e.target.value);
              handleFieldChange('layerId', e.target.value);
            }}
            placeholder="layer-123"
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
        </div>
      )}

      {/* Share Document */}
      {operation === 'shareDocument' && (
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
              placeholder="designer@example.com"
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

      {/* Create Branch */}
      {operation === 'createBranch' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Branch Name</label>
            <input
              type="text"
              value={branchName}
              onChange={(e) => {
                setBranchName(e.target.value);
                handleFieldChange('branchName', e.target.value);
              }}
              placeholder="feature-redesign"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-600 mt-1">
              Create a version branch for experimental changes
            </p>
          </div>
        </div>
      )}

      {/* Example Templates */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Quick Examples</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => loadExample('export')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            📥 Export
          </button>
          <button
            onClick={() => loadExample('document')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            📄 Document
          </button>
          <button
            onClick={() => loadExample('share')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            🤝 Share
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 Sketch Tips:</strong></div>
        <div>• Requires Sketch Cloud workspace or Enterprise account</div>
        <div>• Export formats: PNG, JPG, SVG, PDF, WebP</div>
        <div>• Supports @1x, @2x, @3x, @4x scaling for exports</div>
        <div>• Libraries allow sharing styles and symbols across documents</div>
        <div>• Version branching for design iteration workflows</div>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm">
        <strong>🔐 Authentication:</strong> API token required from Sketch Cloud settings.
        Configure in Credentials Manager.
      </div>
    </div>
  );
};

export default SketchConfig;
