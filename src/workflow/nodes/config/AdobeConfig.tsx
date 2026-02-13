/**
 * Adobe Creative Cloud Node Configuration
 * Adobe Creative Cloud API integration
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface AdobeConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

type AdobeOperation =
  | 'listAssets'
  | 'getAsset'
  | 'uploadAsset'
  | 'updateAsset'
  | 'deleteAsset'
  | 'listLibraries'
  | 'getLibrary'
  | 'createLibrary'
  | 'listElements'
  | 'getElement'
  | 'addElement'
  | 'updateElement'
  | 'deleteElement'
  | 'listFonts'
  | 'getFont'
  | 'listColors'
  | 'getColor'
  | 'addColor'
  | 'generateRendition'
  | 'photoshopAction'
  | 'lightroomEdit'
  | 'illustratorExport';

export const AdobeConfig: React.FC<AdobeConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<AdobeOperation>(
    (config.operation as AdobeOperation) || 'listAssets'
  );
  const [assetId, setAssetId] = useState((config.assetId as string) || '');
  const [libraryId, setLibraryId] = useState((config.libraryId as string) || '');
  const [elementId, setElementId] = useState((config.elementId as string) || '');
  const [libraryName, setLibraryName] = useState((config.libraryName as string) || '');
  const [assetFile, setAssetFile] = useState((config.assetFile as string) || '');
  const [assetName, setAssetName] = useState((config.assetName as string) || '');
  const [elementType, setElementType] = useState((config.elementType as string) || 'graphic');
  const [colorValue, setColorValue] = useState((config.colorValue as string) || '#000000');
  const [colorMode, setColorMode] = useState((config.colorMode as string) || 'RGB');
  const [renditionType, setRenditionType] = useState((config.renditionType as string) || 'image/png');
  const [renditionWidth, setRenditionWidth] = useState((config.renditionWidth as number) || 1024);
  const [renditionHeight, setRenditionHeight] = useState((config.renditionHeight as number) || 768);
  const [psAction, setPsAction] = useState((config.psAction as string) || '');
  const [lrPreset, setLrPreset] = useState((config.lrPreset as string) || '');

  const handleOperationChange = (newOperation: AdobeOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleFieldChange = (field: string, value: string | number | boolean) => {
    onChange({ ...config, [field]: value });
  };

  const operationDescriptions: Record<AdobeOperation, string> = {
    listAssets: 'List all assets in Creative Cloud',
    getAsset: 'Get asset details and metadata',
    uploadAsset: 'Upload new asset to Creative Cloud',
    updateAsset: 'Update asset metadata',
    deleteAsset: 'Delete an asset',
    listLibraries: 'List all Creative Cloud Libraries',
    getLibrary: 'Get library details',
    createLibrary: 'Create a new library',
    listElements: 'List all elements in a library',
    getElement: 'Get element details',
    addElement: 'Add element to library (color, graphic, text style)',
    updateElement: 'Update library element',
    deleteElement: 'Delete library element',
    listFonts: 'List available Adobe Fonts',
    getFont: 'Get font details',
    listColors: 'List colors in library',
    getColor: 'Get color details',
    addColor: 'Add color to library',
    generateRendition: 'Generate rendition (thumbnail, preview)',
    photoshopAction: 'Execute Photoshop action',
    lightroomEdit: 'Apply Lightroom preset',
    illustratorExport: 'Export Illustrator document',
  };

  const loadExample = (type: 'library' | 'asset' | 'rendition') => {
    switch (type) {
      case 'library':
        setOperation('createLibrary');
        setLibraryName('My Design Library');
        onChange({
          ...config,
          operation: 'createLibrary',
          libraryName: 'My Design Library',
        });
        break;
      case 'asset':
        setOperation('uploadAsset');
        setAssetName('Logo Design');
        setAssetFile('{{ $json.imageData }}');
        onChange({
          ...config,
          operation: 'uploadAsset',
          assetName: 'Logo Design',
          assetFile: '{{ $json.imageData }}',
        });
        break;
      case 'rendition':
        setOperation('generateRendition');
        setAssetId('{{ $json.assetId }}');
        setRenditionType('image/png');
        setRenditionWidth(2048);
        setRenditionHeight(1536);
        onChange({
          ...config,
          operation: 'generateRendition',
          assetId: '{{ $json.assetId }}',
          renditionType: 'image/png',
          renditionWidth: 2048,
          renditionHeight: 1536,
        });
        break;
    }
  };

  return (
    <div className="adobe-config space-y-4">
      <div className="font-semibold text-lg mb-4">Adobe Creative Cloud Configuration</div>

      <div>
        <label className="block text-sm font-medium mb-2">Operation</label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as AdobeOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <optgroup label="Asset Management">
            <option value="listAssets">List Assets</option>
            <option value="getAsset">Get Asset</option>
            <option value="uploadAsset">Upload Asset</option>
            <option value="updateAsset">Update Asset</option>
            <option value="deleteAsset">Delete Asset</option>
          </optgroup>
          <optgroup label="Libraries">
            <option value="listLibraries">List Libraries</option>
            <option value="getLibrary">Get Library</option>
            <option value="createLibrary">Create Library</option>
          </optgroup>
          <optgroup label="Library Elements">
            <option value="listElements">List Elements</option>
            <option value="getElement">Get Element</option>
            <option value="addElement">Add Element</option>
            <option value="updateElement">Update Element</option>
            <option value="deleteElement">Delete Element</option>
          </optgroup>
          <optgroup label="Fonts & Colors">
            <option value="listFonts">List Fonts</option>
            <option value="getFont">Get Font</option>
            <option value="listColors">List Colors</option>
            <option value="getColor">Get Color</option>
            <option value="addColor">Add Color</option>
          </optgroup>
          <optgroup label="Renditions & Processing">
            <option value="generateRendition">Generate Rendition</option>
            <option value="photoshopAction">Photoshop Action</option>
            <option value="lightroomEdit">Lightroom Edit</option>
            <option value="illustratorExport">Illustrator Export</option>
          </optgroup>
        </select>
        <p className="text-xs text-gray-600 mt-1">
          {operationDescriptions[operation]}
        </p>
      </div>

      {/* Asset Operations */}
      {(operation === 'getAsset' || operation === 'updateAsset' || operation === 'deleteAsset' ||
        operation === 'generateRendition') && (
        <div className="p-3 bg-gray-50 rounded space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Asset ID</label>
            <input
              type="text"
              value={assetId}
              onChange={(e) => {
                setAssetId(e.target.value);
                handleFieldChange('assetId', e.target.value);
              }}
              placeholder="urn:aaid:sc:..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
            <p className="text-xs text-gray-600 mt-1">
              Adobe URN format (urn:aaid:sc:...)
            </p>
          </div>
          {operation === 'updateAsset' && (
            <div>
              <label className="block text-sm font-medium mb-1">New Asset Name</label>
              <input
                type="text"
                value={assetName}
                onChange={(e) => {
                  setAssetName(e.target.value);
                  handleFieldChange('assetName', e.target.value);
                }}
                placeholder="Updated Asset Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          )}
        </div>
      )}

      {/* Upload Asset */}
      {operation === 'uploadAsset' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Asset Name</label>
            <input
              type="text"
              value={assetName}
              onChange={(e) => {
                setAssetName(e.target.value);
                handleFieldChange('assetName', e.target.value);
              }}
              placeholder="My Design Asset"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Asset File (Expression)</label>
            <input
              type="text"
              value={assetFile}
              onChange={(e) => {
                setAssetFile(e.target.value);
                handleFieldChange('assetFile', e.target.value);
              }}
              placeholder="{{ $json.fileData }}"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
            <p className="text-xs text-gray-600 mt-1">
              Binary file data, URL, or base64 encoded
            </p>
          </div>
        </div>
      )}

      {/* Library Operations */}
      {(operation === 'getLibrary' || operation === 'listElements') && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">Library ID</label>
          <input
            type="text"
            value={libraryId}
            onChange={(e) => {
              setLibraryId(e.target.value);
              handleFieldChange('libraryId', e.target.value);
            }}
            placeholder="urn:aaid:sc:..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
        </div>
      )}

      {/* Create Library */}
      {operation === 'createLibrary' && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">Library Name</label>
          <input
            type="text"
            value={libraryName}
            onChange={(e) => {
              setLibraryName(e.target.value);
              handleFieldChange('libraryName', e.target.value);
            }}
            placeholder="My Creative Library"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      )}

      {/* Element Operations */}
      {(operation === 'getElement' || operation === 'updateElement' || operation === 'deleteElement') && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">Element ID</label>
          <input
            type="text"
            value={elementId}
            onChange={(e) => {
              setElementId(e.target.value);
              handleFieldChange('elementId', e.target.value);
            }}
            placeholder="element-123"
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
        </div>
      )}

      {/* Add Element */}
      {operation === 'addElement' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Element Type</label>
            <select
              value={elementType}
              onChange={(e) => {
                setElementType(e.target.value);
                handleFieldChange('elementType', e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="graphic">Graphic</option>
              <option value="color">Color</option>
              <option value="characterStyle">Character Style</option>
              <option value="layerStyle">Layer Style</option>
            </select>
          </div>
        </div>
      )}

      {/* Add Color */}
      {operation === 'addColor' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Color Value</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={colorValue}
                onChange={(e) => {
                  setColorValue(e.target.value);
                  handleFieldChange('colorValue', e.target.value);
                }}
                className="w-16 h-10 border border-gray-300 rounded"
              />
              <input
                type="text"
                value={colorValue}
                onChange={(e) => {
                  setColorValue(e.target.value);
                  handleFieldChange('colorValue', e.target.value);
                }}
                placeholder="#000000"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Color Mode</label>
            <select
              value={colorMode}
              onChange={(e) => {
                setColorMode(e.target.value);
                handleFieldChange('colorMode', e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="RGB">RGB</option>
              <option value="CMYK">CMYK</option>
              <option value="HSB">HSB</option>
              <option value="LAB">LAB</option>
            </select>
          </div>
        </div>
      )}

      {/* Generate Rendition */}
      {operation === 'generateRendition' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Rendition Type</label>
            <select
              value={renditionType}
              onChange={(e) => {
                setRenditionType(e.target.value);
                handleFieldChange('renditionType', e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="image/png">PNG</option>
              <option value="image/jpeg">JPEG</option>
              <option value="image/webp">WebP</option>
              <option value="application/pdf">PDF</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Width (px)</label>
              <input
                type="number"
                min="1"
                value={renditionWidth}
                onChange={(e) => {
                  setRenditionWidth(Number(e.target.value));
                  handleFieldChange('renditionWidth', Number(e.target.value));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Height (px)</label>
              <input
                type="number"
                min="1"
                value={renditionHeight}
                onChange={(e) => {
                  setRenditionHeight(Number(e.target.value));
                  handleFieldChange('renditionHeight', Number(e.target.value));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Photoshop Action */}
      {operation === 'photoshopAction' && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">Action Name</label>
          <input
            type="text"
            value={psAction}
            onChange={(e) => {
              setPsAction(e.target.value);
              handleFieldChange('psAction', e.target.value);
            }}
            placeholder="Sharpen Image"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <p className="text-xs text-gray-600 mt-1">
            Name of Photoshop action to execute
          </p>
        </div>
      )}

      {/* Lightroom Edit */}
      {operation === 'lightroomEdit' && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">Preset Name</label>
          <input
            type="text"
            value={lrPreset}
            onChange={(e) => {
              setLrPreset(e.target.value);
              handleFieldChange('lrPreset', e.target.value);
            }}
            placeholder="Vintage Film"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <p className="text-xs text-gray-600 mt-1">
            Lightroom preset to apply
          </p>
        </div>
      )}

      {/* Example Templates */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Quick Examples</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => loadExample('library')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            📚 Library
          </button>
          <button
            onClick={() => loadExample('asset')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            📤 Upload
          </button>
          <button
            onClick={() => loadExample('rendition')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            🖼️ Rendition
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 Adobe Creative Cloud Tips:</strong></div>
        <div>• Assets use URN format: urn:aaid:sc:...</div>
        <div>• Libraries sync across all Adobe apps</div>
        <div>• Supports Photoshop, Illustrator, InDesign, XD</div>
        <div>• Renditions for thumbnails and previews</div>
        <div>• Color modes: RGB, CMYK, HSB, LAB</div>
        <div>• Adobe Fonts integration for typography</div>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm">
        <strong>🔐 Authentication:</strong> OAuth 2.0 with Adobe IMS. Requires Creative Cloud
        subscription. Configure in Credentials Manager with Client ID and Client Secret.
      </div>
    </div>
  );
};

export default AdobeConfig;
