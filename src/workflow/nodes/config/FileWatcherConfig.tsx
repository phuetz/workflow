/**
 * File Watcher Trigger Node Configuration
 * Monitor file system changes
 * AGENT 9: Node Library Expansion - Phase 1
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface FileWatcherConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const FileWatcherConfig: React.FC<FileWatcherConfigProps> = ({ config, onChange }) => {
  const [watchPath, setWatchPath] = useState((config.watchPath as string) || '/path/to/watch');
  const [watchEvents, setWatchEvents] = useState<string[]>((config.watchEvents as string[]) || ['create', 'modify']);
  const [filePattern, setFilePattern] = useState((config.filePattern as string) || '*.*');
  const [recursive, setRecursive] = useState((config.recursive as boolean) !== false);

  const toggleEvent = (event: string) => {
    const newEvents = watchEvents.includes(event)
      ? watchEvents.filter(e => e !== event)
      : [...watchEvents, event];
    setWatchEvents(newEvents);
    onChange({ ...config, watchEvents: newEvents });
  };

  return (
    <div className="file-watcher-config space-y-4">
      <div className="font-semibold text-lg mb-4">File Watcher Trigger</div>

      <div>
        <label className="block text-sm font-medium mb-2">Watch Path</label>
        <input
          type="text"
          value={watchPath}
          onChange={(e) => {
            setWatchPath(e.target.value);
            onChange({ ...config, watchPath: e.target.value });
          }}
          placeholder="/path/to/watch"
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">Absolute path to directory or file to watch</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">File Pattern (glob)</label>
        <input
          type="text"
          value={filePattern}
          onChange={(e) => {
            setFilePattern(e.target.value);
            onChange({ ...config, filePattern: e.target.value });
          }}
          placeholder="*.txt, *.csv, *.json"
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">Glob pattern to match files (* = all files)</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Watch Events</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'create', label: 'File Created' },
            { value: 'modify', label: 'File Modified' },
            { value: 'delete', label: 'File Deleted' },
            { value: 'rename', label: 'File Renamed' }
          ].map(({ value, label }) => (
            <label key={value} className="flex items-center p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={watchEvents.includes(value)}
                onChange={() => toggleEvent(value)}
                className="mr-2"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="recursive"
          checked={recursive}
          onChange={(e) => {
            setRecursive(e.target.checked);
            onChange({ ...config, recursive: e.target.checked });
          }}
          className="mr-2"
        />
        <label htmlFor="recursive" className="text-sm">
          Watch subdirectories recursively
        </label>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>📁 Output Data:</strong></div>
        <div className="bg-white p-2 rounded font-mono text-xs">
          <pre>{`{
  "event": "create|modify|delete|rename",
  "path": "/full/path/to/file.txt",
  "filename": "file.txt",
  "directory": "/full/path/to",
  "size": 1024,
  "modified": "2024-01-01T00:00:00Z",
  "content": "..." // if file is readable
}`}</pre>
        </div>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm">
        <strong>⚠️ Note:</strong> File watcher requires appropriate file system permissions. Not available in all deployment environments (e.g., serverless).
      </div>
    </div>
  );
};
