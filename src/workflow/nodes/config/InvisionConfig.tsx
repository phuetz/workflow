/**
 * InVision Node Configuration
 * Digital product design and prototyping platform
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface InvisionConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

type InvisionOperation =
  | 'listProjects'
  | 'getProject'
  | 'createProject'
  | 'updateProject'
  | 'deleteProject'
  | 'listScreens'
  | 'getScreen'
  | 'uploadScreen'
  | 'updateScreen'
  | 'deleteScreen'
  | 'listComments'
  | 'getComment'
  | 'addComment'
  | 'updateComment'
  | 'deleteComment'
  | 'listPrototypes'
  | 'getPrototype'
  | 'createPrototype'
  | 'sharePrototype'
  | 'listInspects'
  | 'getInspect';

export const InvisionConfig: React.FC<InvisionConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<InvisionOperation>(
    (config.operation as InvisionOperation) || 'listProjects'
  );
  const [projectId, setProjectId] = useState((config.projectId as string) || '');
  const [screenId, setScreenId] = useState((config.screenId as string) || '');
  const [commentId, setCommentId] = useState((config.commentId as string) || '');
  const [prototypeId, setPrototypeId] = useState((config.prototypeId as string) || '');
  const [projectName, setProjectName] = useState((config.projectName as string) || '');
  const [projectType, setProjectType] = useState((config.projectType as string) || 'prototype');
  const [screenName, setScreenName] = useState((config.screenName as string) || '');
  const [screenFile, setScreenFile] = useState((config.screenFile as string) || '');
  const [commentText, setCommentText] = useState((config.commentText as string) || '');
  const [commentPosition, setCommentPosition] = useState((config.commentPosition as string) || '');
  const [shareEmail, setShareEmail] = useState((config.shareEmail as string) || '');
  const [shareMessage, setShareMessage] = useState((config.shareMessage as string) || '');

  const handleOperationChange = (newOperation: InvisionOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleFieldChange = (field: string, value: string | number | boolean) => {
    onChange({ ...config, [field]: value });
  };

  const operationDescriptions: Record<InvisionOperation, string> = {
    listProjects: 'List all projects in workspace',
    getProject: 'Get project details',
    createProject: 'Create a new project',
    updateProject: 'Update project properties',
    deleteProject: 'Delete a project',
    listScreens: 'List all screens in a project',
    getScreen: 'Get screen details',
    uploadScreen: 'Upload a new screen to project',
    updateScreen: 'Update screen properties',
    deleteScreen: 'Delete a screen',
    listComments: 'List all comments on a screen',
    getComment: 'Get comment details',
    addComment: 'Add a comment to a screen',
    updateComment: 'Update an existing comment',
    deleteComment: 'Delete a comment',
    listPrototypes: 'List all prototypes in workspace',
    getPrototype: 'Get prototype details',
    createPrototype: 'Create a new prototype',
    sharePrototype: 'Share prototype with team or clients',
    listInspects: 'List all Inspect documents',
    getInspect: 'Get Inspect document details',
  };

  const loadExample = (type: 'project' | 'screen' | 'comment') => {
    switch (type) {
      case 'project':
        setOperation('createProject');
        setProjectName('Mobile App Design');
        setProjectType('prototype');
        onChange({
          ...config,
          operation: 'createProject',
          projectName: 'Mobile App Design',
          projectType: 'prototype',
        });
        break;
      case 'screen':
        setOperation('uploadScreen');
        setProjectId('{{ $json.projectId }}');
        setScreenName('Home Screen');
        setScreenFile('{{ $json.imageData }}');
        onChange({
          ...config,
          operation: 'uploadScreen',
          projectId: '{{ $json.projectId }}',
          screenName: 'Home Screen',
          screenFile: '{{ $json.imageData }}',
        });
        break;
      case 'comment':
        setOperation('addComment');
        setScreenId('{{ $json.screenId }}');
        setCommentText('Please update the CTA button color');
        onChange({
          ...config,
          operation: 'addComment',
          screenId: '{{ $json.screenId }}',
          commentText: 'Please update the CTA button color',
        });
        break;
    }
  };

  return (
    <div className="invision-config space-y-4">
      <div className="font-semibold text-lg mb-4">InVision Configuration</div>

      <div>
        <label className="block text-sm font-medium mb-2">Operation</label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as InvisionOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <optgroup label="Project Management">
            <option value="listProjects">List Projects</option>
            <option value="getProject">Get Project</option>
            <option value="createProject">Create Project</option>
            <option value="updateProject">Update Project</option>
            <option value="deleteProject">Delete Project</option>
          </optgroup>
          <optgroup label="Screen Management">
            <option value="listScreens">List Screens</option>
            <option value="getScreen">Get Screen</option>
            <option value="uploadScreen">Upload Screen</option>
            <option value="updateScreen">Update Screen</option>
            <option value="deleteScreen">Delete Screen</option>
          </optgroup>
          <optgroup label="Comments">
            <option value="listComments">List Comments</option>
            <option value="getComment">Get Comment</option>
            <option value="addComment">Add Comment</option>
            <option value="updateComment">Update Comment</option>
            <option value="deleteComment">Delete Comment</option>
          </optgroup>
          <optgroup label="Prototypes">
            <option value="listPrototypes">List Prototypes</option>
            <option value="getPrototype">Get Prototype</option>
            <option value="createPrototype">Create Prototype</option>
            <option value="sharePrototype">Share Prototype</option>
          </optgroup>
          <optgroup label="Inspect">
            <option value="listInspects">List Inspects</option>
            <option value="getInspect">Get Inspect</option>
          </optgroup>
        </select>
        <p className="text-xs text-gray-600 mt-1">
          {operationDescriptions[operation]}
        </p>
      </div>

      {/* Project Operations */}
      {(operation === 'getProject' || operation === 'updateProject' || operation === 'deleteProject' ||
        operation === 'listScreens') && (
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
              placeholder="12345"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
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
              placeholder="My Design Project"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Project Type</label>
            <select
              value={projectType}
              onChange={(e) => {
                setProjectType(e.target.value);
                handleFieldChange('projectType', e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="prototype">Prototype</option>
              <option value="freehand">Freehand</option>
              <option value="studio">Studio</option>
            </select>
          </div>
        </div>
      )}

      {/* Screen Operations */}
      {(operation === 'getScreen' || operation === 'updateScreen' || operation === 'deleteScreen' ||
        operation === 'listComments') && (
        <div className="p-3 bg-gray-50 rounded space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Screen ID</label>
            <input
              type="text"
              value={screenId}
              onChange={(e) => {
                setScreenId(e.target.value);
                handleFieldChange('screenId', e.target.value);
              }}
              placeholder="67890"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          {operation === 'updateScreen' && (
            <div>
              <label className="block text-sm font-medium mb-1">New Screen Name</label>
              <input
                type="text"
                value={screenName}
                onChange={(e) => {
                  setScreenName(e.target.value);
                  handleFieldChange('screenName', e.target.value);
                }}
                placeholder="Updated Screen Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          )}
        </div>
      )}

      {/* Upload Screen */}
      {operation === 'uploadScreen' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Screen Name</label>
            <input
              type="text"
              value={screenName}
              onChange={(e) => {
                setScreenName(e.target.value);
                handleFieldChange('screenName', e.target.value);
              }}
              placeholder="Home Screen"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Screen File (Expression)</label>
            <input
              type="text"
              value={screenFile}
              onChange={(e) => {
                setScreenFile(e.target.value);
                handleFieldChange('screenFile', e.target.value);
              }}
              placeholder="{{ $json.imageData }}"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
            <p className="text-xs text-gray-600 mt-1">
              PNG, JPG, or GIF image file (binary data or URL)
            </p>
          </div>
        </div>
      )}

      {/* Comment Operations */}
      {(operation === 'getComment' || operation === 'updateComment' || operation === 'deleteComment') && (
        <div className="p-3 bg-gray-50 rounded space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Comment ID</label>
            <input
              type="text"
              value={commentId}
              onChange={(e) => {
                setCommentId(e.target.value);
                handleFieldChange('commentId', e.target.value);
              }}
              placeholder="comment-123"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          {operation === 'updateComment' && (
            <div>
              <label className="block text-sm font-medium mb-1">Comment Text</label>
              <textarea
                value={commentText}
                onChange={(e) => {
                  setCommentText(e.target.value);
                  handleFieldChange('commentText', e.target.value);
                }}
                placeholder="Updated comment text..."
                className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          )}
        </div>
      )}

      {/* Add Comment */}
      {operation === 'addComment' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Comment Text</label>
            <textarea
              value={commentText}
              onChange={(e) => {
                setCommentText(e.target.value);
                handleFieldChange('commentText', e.target.value);
              }}
              placeholder="Your comment..."
              className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Position (Optional, x,y coordinates)</label>
            <input
              type="text"
              value={commentPosition}
              onChange={(e) => {
                setCommentPosition(e.target.value);
                handleFieldChange('commentPosition', e.target.value);
              }}
              placeholder="350,120"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-600 mt-1">
              Leave empty for general comment, or specify x,y position on screen
            </p>
          </div>
        </div>
      )}

      {/* Prototype Operations */}
      {(operation === 'getPrototype' || operation === 'sharePrototype') && (
        <div className="p-3 bg-gray-50 rounded space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Prototype ID</label>
            <input
              type="text"
              value={prototypeId}
              onChange={(e) => {
                setPrototypeId(e.target.value);
                handleFieldChange('prototypeId', e.target.value);
              }}
              placeholder="proto-123"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          {operation === 'sharePrototype' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Email Address(es)</label>
                <input
                  type="text"
                  value={shareEmail}
                  onChange={(e) => {
                    setShareEmail(e.target.value);
                    handleFieldChange('shareEmail', e.target.value);
                  }}
                  placeholder="user@example.com, another@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Comma-separated email addresses
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message (Optional)</label>
                <textarea
                  value={shareMessage}
                  onChange={(e) => {
                    setShareMessage(e.target.value);
                    handleFieldChange('shareMessage', e.target.value);
                  }}
                  placeholder="Check out this prototype..."
                  className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </>
          )}
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
            onClick={() => loadExample('screen')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            🖼️ Screen
          </button>
          <button
            onClick={() => loadExample('comment')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            💬 Comment
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 InVision Tips:</strong></div>
        <div>• Upload screens as PNG, JPG, or GIF files</div>
        <div>• Comments can be positioned at specific coordinates</div>
        <div>• Prototypes support hotspot linking between screens</div>
        <div>• Inspect mode provides design specs for developers</div>
        <div>• Freehand for collaborative whiteboarding</div>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm">
        <strong>🔐 Authentication:</strong> API token required from InVision account settings.
        Configure in Credentials Manager.
      </div>
    </div>
  );
};

export default InvisionConfig;
