/**
 * Zeplin Node Configuration
 * Design collaboration and handoff platform
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface ZeplinConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

type ZeplinOperation =
  | 'listProjects'
  | 'getProject'
  | 'createProject'
  | 'updateProject'
  | 'listScreens'
  | 'getScreen'
  | 'listColors'
  | 'getColor'
  | 'listTextStyles'
  | 'getTextStyle'
  | 'listComponents'
  | 'getComponent'
  | 'listAssets'
  | 'getAsset'
  | 'exportAsset'
  | 'listSpacingSections'
  | 'getSpacingSection'
  | 'listMembers'
  | 'addMember'
  | 'removeMember'
  | 'listNotes'
  | 'addNote';

export const ZeplinConfig: React.FC<ZeplinConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<ZeplinOperation>(
    (config.operation as ZeplinOperation) || 'listProjects'
  );
  const [projectId, setProjectId] = useState((config.projectId as string) || '');
  const [screenId, setScreenId] = useState((config.screenId as string) || '');
  const [colorId, setColorId] = useState((config.colorId as string) || '');
  const [textStyleId, setTextStyleId] = useState((config.textStyleId as string) || '');
  const [componentId, setComponentId] = useState((config.componentId as string) || '');
  const [assetId, setAssetId] = useState((config.assetId as string) || '');
  const [projectName, setProjectName] = useState((config.projectName as string) || '');
  const [platform, setPlatform] = useState((config.platform as string) || 'web');
  const [exportFormat, setExportFormat] = useState((config.exportFormat as string) || 'png');
  const [density, setDensity] = useState((config.density as string) || '1x');
  const [memberEmail, setMemberEmail] = useState((config.memberEmail as string) || '');
  const [noteContent, setNoteContent] = useState((config.noteContent as string) || '');
  const [notePosition, setNotePosition] = useState((config.notePosition as string) || '');

  const handleOperationChange = (newOperation: ZeplinOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleFieldChange = (field: string, value: string | number | boolean) => {
    onChange({ ...config, [field]: value });
  };

  const operationDescriptions: Record<ZeplinOperation, string> = {
    listProjects: 'List all projects in workspace',
    getProject: 'Get project details and metadata',
    createProject: 'Create a new project',
    updateProject: 'Update project properties',
    listScreens: 'List all screens in a project',
    getScreen: 'Get screen details with layers',
    listColors: 'Get all colors used in project',
    getColor: 'Get color details',
    listTextStyles: 'Get all text styles in project',
    getTextStyle: 'Get text style details',
    listComponents: 'List all components in project',
    getComponent: 'Get component details',
    listAssets: 'List all exportable assets',
    getAsset: 'Get asset details',
    exportAsset: 'Export asset in various formats and densities',
    listSpacingSections: 'Get spacing tokens and guidelines',
    getSpacingSection: 'Get spacing section details',
    listMembers: 'List project members',
    addMember: 'Add member to project',
    removeMember: 'Remove member from project',
    listNotes: 'List all notes on a screen',
    addNote: 'Add a note to a screen',
  };

  const loadExample = (type: 'project' | 'styleguide' | 'export') => {
    switch (type) {
      case 'project':
        setOperation('createProject');
        setProjectName('Mobile App Design System');
        setPlatform('ios');
        onChange({
          ...config,
          operation: 'createProject',
          projectName: 'Mobile App Design System',
          platform: 'ios',
        });
        break;
      case 'styleguide':
        setOperation('listColors');
        setProjectId('{{ $json.projectId }}');
        onChange({
          ...config,
          operation: 'listColors',
          projectId: '{{ $json.projectId }}',
        });
        break;
      case 'export':
        setOperation('exportAsset');
        setAssetId('{{ $json.assetId }}');
        setExportFormat('svg');
        setDensity('1x');
        onChange({
          ...config,
          operation: 'exportAsset',
          assetId: '{{ $json.assetId }}',
          exportFormat: 'svg',
          density: '1x',
        });
        break;
    }
  };

  return (
    <div className="zeplin-config space-y-4">
      <div className="font-semibold text-lg mb-4">Zeplin Configuration</div>

      <div>
        <label className="block text-sm font-medium mb-2">Operation</label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as ZeplinOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <optgroup label="Project Management">
            <option value="listProjects">List Projects</option>
            <option value="getProject">Get Project</option>
            <option value="createProject">Create Project</option>
            <option value="updateProject">Update Project</option>
          </optgroup>
          <optgroup label="Screens">
            <option value="listScreens">List Screens</option>
            <option value="getScreen">Get Screen</option>
          </optgroup>
          <optgroup label="Style Guide - Colors">
            <option value="listColors">List Colors</option>
            <option value="getColor">Get Color</option>
          </optgroup>
          <optgroup label="Style Guide - Typography">
            <option value="listTextStyles">List Text Styles</option>
            <option value="getTextStyle">Get Text Style</option>
          </optgroup>
          <optgroup label="Components">
            <option value="listComponents">List Components</option>
            <option value="getComponent">Get Component</option>
          </optgroup>
          <optgroup label="Assets">
            <option value="listAssets">List Assets</option>
            <option value="getAsset">Get Asset</option>
            <option value="exportAsset">Export Asset</option>
          </optgroup>
          <optgroup label="Spacing">
            <option value="listSpacingSections">List Spacing Sections</option>
            <option value="getSpacingSection">Get Spacing Section</option>
          </optgroup>
          <optgroup label="Collaboration">
            <option value="listMembers">List Members</option>
            <option value="addMember">Add Member</option>
            <option value="removeMember">Remove Member</option>
            <option value="listNotes">List Notes</option>
            <option value="addNote">Add Note</option>
          </optgroup>
        </select>
        <p className="text-xs text-gray-600 mt-1">
          {operationDescriptions[operation]}
        </p>
      </div>

      {/* Project Operations */}
      {(operation === 'getProject' || operation === 'updateProject' || operation === 'listScreens' ||
        operation === 'listColors' || operation === 'listTextStyles' || operation === 'listComponents' ||
        operation === 'listAssets' || operation === 'listSpacingSections' || operation === 'listMembers') && (
        <div className="p-3 bg-gray-50 rounded space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Project ID</label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                handleFieldChange('projectId', e.target.value);
              }}
              placeholder="5a7e9d0e2e29e0115e23e535"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
            <p className="text-xs text-gray-600 mt-1">
              24-character hexadecimal project ID
            </p>
          </div>
          {operation === 'updateProject' && (
            <div>
              <label className="block text-sm font-medium mb-1">New Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  handleFieldChange('projectName', e.target.value);
                }}
                placeholder="Updated Project Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          )}
        </div>
      )}

      {/* Create Project */}
      {operation === 'createProject' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                handleFieldChange('projectName', e.target.value);
              }}
              placeholder="My Design System"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Platform</label>
            <select
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value);
                handleFieldChange('platform', e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="web">Web</option>
              <option value="ios">iOS</option>
              <option value="android">Android</option>
              <option value="macos">macOS</option>
            </select>
          </div>
        </div>
      )}

      {/* Screen Operations */}
      {(operation === 'getScreen' || operation === 'listNotes') && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">Screen ID</label>
          <input
            type="text"
            value={screenId}
            onChange={(e) => {
              setScreenId(e.target.value);
              handleFieldChange('screenId', e.target.value);
            }}
            placeholder="5a7e9d0e2e29e0115e23e536"
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
        </div>
      )}

      {/* Get Color */}
      {operation === 'getColor' && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">Color ID</label>
          <input
            type="text"
            value={colorId}
            onChange={(e) => {
              setColorId(e.target.value);
              handleFieldChange('colorId', e.target.value);
            }}
            placeholder="5a7e9d0e2e29e0115e23e537"
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
        </div>
      )}

      {/* Get Text Style */}
      {operation === 'getTextStyle' && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">Text Style ID</label>
          <input
            type="text"
            value={textStyleId}
            onChange={(e) => {
              setTextStyleId(e.target.value);
              handleFieldChange('textStyleId', e.target.value);
            }}
            placeholder="5a7e9d0e2e29e0115e23e538"
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
        </div>
      )}

      {/* Get Component */}
      {operation === 'getComponent' && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">Component ID</label>
          <input
            type="text"
            value={componentId}
            onChange={(e) => {
              setComponentId(e.target.value);
              handleFieldChange('componentId', e.target.value);
            }}
            placeholder="5a7e9d0e2e29e0115e23e539"
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
        </div>
      )}

      {/* Asset Operations */}
      {(operation === 'getAsset' || operation === 'exportAsset') && (
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
              placeholder="5a7e9d0e2e29e0115e23e540"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          {operation === 'exportAsset' && (
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
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Density</label>
                <select
                  value={density}
                  onChange={(e) => {
                    setDensity(e.target.value);
                    handleFieldChange('density', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="1x">1x (mdpi, 100%)</option>
                  <option value="1.5x">1.5x (hdpi, 150%)</option>
                  <option value="2x">2x (xhdpi, 200%, @2x)</option>
                  <option value="3x">3x (xxhdpi, 300%, @3x)</option>
                  <option value="4x">4x (xxxhdpi, 400%, @4x)</option>
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  Pixel density for bitmap exports (SVG ignores this)
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Add Member */}
      {(operation === 'addMember' || operation === 'removeMember') && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">Member Email</label>
          <input
            type="email"
            value={memberEmail}
            onChange={(e) => {
              setMemberEmail(e.target.value);
              handleFieldChange('memberEmail', e.target.value);
            }}
            placeholder="designer@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      )}

      {/* Add Note */}
      {operation === 'addNote' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Note Content</label>
            <textarea
              value={noteContent}
              onChange={(e) => {
                setNoteContent(e.target.value);
                handleFieldChange('noteContent', e.target.value);
              }}
              placeholder="Your note..."
              className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Position (Optional, x,y)</label>
            <input
              type="text"
              value={notePosition}
              onChange={(e) => {
                setNotePosition(e.target.value);
                handleFieldChange('notePosition', e.target.value);
              }}
              placeholder="250,100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-600 mt-1">
              Position on screen where note appears (x,y coordinates)
            </p>
          </div>
        </div>
      )}

      {/* Example Templates */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Quick Examples</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => loadExample('project')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            📁 Project
          </button>
          <button
            onClick={() => loadExample('styleguide')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            🎨 Style Guide
          </button>
          <button
            onClick={() => loadExample('export')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            📥 Export
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 Zeplin Tips:</strong></div>
        <div>• All IDs are 24-character hexadecimal strings</div>
        <div>• Supports Web, iOS, Android, and macOS platforms</div>
        <div>• Export assets in 1x, 1.5x, 2x, 3x, 4x densities</div>
        <div>• Style guide extracts colors, text styles, and spacing</div>
        <div>• Components are reusable design elements</div>
        <div>• Notes for developer handoff and collaboration</div>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm">
        <strong>🔐 Authentication:</strong> Personal Access Token (PAT) or JWT required.
        Get from Zeplin Developer settings. Configure in Credentials Manager.
      </div>
    </div>
  );
};

export default ZeplinConfig;
