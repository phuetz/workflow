/**
 * RSS Feed Trigger Node Configuration
 * Monitor RSS/Atom feeds for new items
 * AGENT 9: Node Library Expansion - Phase 1
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface RSSFeedConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const RSSFeedConfig: React.FC<RSSFeedConfigProps> = ({ config, onChange }) => {
  const [feedUrl, setFeedUrl] = useState((config.feedUrl as string) || '');
  const [pollInterval, setPollInterval] = useState((config.pollInterval as number) || 15);
  const [triggerOn, setTriggerOn] = useState((config.triggerOn as string) || 'new');
  const [maxItems, setMaxItems] = useState((config.maxItems as number) || 10);

  return (
    <div className="rss-feed-config space-y-4">
      <div className="font-semibold text-lg mb-4">RSS Feed Trigger</div>

      <div>
        <label className="block text-sm font-medium mb-2">Feed URL</label>
        <input
          type="url"
          value={feedUrl}
          onChange={(e) => {
            setFeedUrl(e.target.value);
            onChange({ ...config, feedUrl: e.target.value });
          }}
          placeholder="https://example.com/feed.xml"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">RSS or Atom feed URL</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Poll Interval (minutes)</label>
        <input
          type="number"
          value={pollInterval}
          onChange={(e) => {
            setPollInterval(Number(e.target.value));
            onChange({ ...config, pollInterval: Number(e.target.value) });
          }}
          min={1}
          max={1440}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">How often to check the feed (1-1440 minutes)</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Trigger On</label>
        <select
          value={triggerOn}
          onChange={(e) => {
            setTriggerOn(e.target.value);
            onChange({ ...config, triggerOn: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="new">New Items Only</option>
          <option value="all">All Items (every poll)</option>
          <option value="updated">Updated Items</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Max Items Per Poll</label>
        <input
          type="number"
          value={maxItems}
          onChange={(e) => {
            setMaxItems(Number(e.target.value));
            onChange({ ...config, maxItems: Number(e.target.value) });
          }}
          min={1}
          max={100}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">Maximum number of items to process per poll</p>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>📰 Output Data:</strong></div>
        <div className="bg-white p-2 rounded font-mono text-xs">
          <pre>{`{
  "title": "Item Title",
  "link": "https://...",
  "description": "...",
  "pubDate": "2024-01-01T00:00:00Z",
  "author": "...",
  "categories": ["..."],
  "guid": "unique-id"
}`}</pre>
        </div>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm space-y-2">
        <div><strong>💡 Use Cases:</strong></div>
        <ul className="list-disc list-inside space-y-1">
          <li>Monitor blog posts and auto-share</li>
          <li>Track news from multiple sources</li>
          <li>Aggregate content from competitors</li>
          <li>Monitor product updates</li>
          <li>Create automated newsletters</li>
        </ul>
      </div>
    </div>
  );
};
