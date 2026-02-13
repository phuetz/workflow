/**
 * Document Loader Node Configuration
 * Load and parse documents from various sources
 * LangChain Integration
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface DocumentLoaderConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const DocumentLoaderConfig: React.FC<DocumentLoaderConfigProps> = ({ config, onChange }) => {
  const [sourceType, setSourceType] = useState((config.sourceType as string) || 'pdf');
  const [source, setSource] = useState((config.source as string) || '');
  const [encoding, setEncoding] = useState((config.encoding as string) || 'utf-8');
  const [pdfStrategy, setPdfStrategy] = useState((config.pdfStrategy as string) || 'auto');
  const [includeMetadata, setIncludeMetadata] = useState((config.includeMetadata as boolean) ?? true);
  const [splitPages, setSplitPages] = useState((config.splitPages as boolean) ?? true);

  const renderSourceFields = () => {
    switch (sourceType) {
      case 'pdf':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">PDF Path or URL</label>
              <input
                type="text"
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  onChange({ ...config, source: e.target.value });
                }}
                placeholder="/path/to/document.pdf or https://..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Parsing Strategy</label>
              <select
                value={pdfStrategy}
                onChange={(e) => {
                  setPdfStrategy(e.target.value);
                  onChange({ ...config, pdfStrategy: e.target.value });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="auto">Auto (Recommended)</option>
                <option value="fast">Fast (PyPDF)</option>
                <option value="ocr">OCR (Tesseract)</option>
                <option value="hi_res">High Resolution (Unstructured)</option>
              </select>
            </div>
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={splitPages}
                  onChange={(e) => {
                    setSplitPages(e.target.checked);
                    onChange({ ...config, splitPages: e.target.checked });
                  }}
                  className="rounded"
                />
                <span className="text-sm">Split into Pages</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">Create one document per page</p>
            </div>
          </>
        );

      case 'web':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">URL(s)</label>
              <textarea
                rows={3}
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  onChange({ ...config, source: e.target.value });
                }}
                placeholder="https://example.com&#10;https://example.com/page2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">One URL per line</p>
            </div>
          </>
        );

      case 'text':
      case 'markdown':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">File Path or URL</label>
              <input
                type="text"
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  onChange({ ...config, source: e.target.value });
                }}
                placeholder={`/path/to/file.${sourceType === 'markdown' ? 'md' : 'txt'}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Encoding</label>
              <select
                value={encoding}
                onChange={(e) => {
                  setEncoding(e.target.value);
                  onChange({ ...config, encoding: e.target.value });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="utf-8">UTF-8</option>
                <option value="ascii">ASCII</option>
                <option value="latin1">Latin-1</option>
                <option value="utf-16">UTF-16</option>
              </select>
            </div>
          </>
        );

      case 'csv':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">CSV File Path</label>
              <input
                type="text"
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  onChange({ ...config, source: e.target.value });
                }}
                placeholder="/path/to/data.csv"
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
              />
            </div>
          </>
        );

      case 'docx':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Word Document Path</label>
              <input
                type="text"
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  onChange({ ...config, source: e.target.value });
                }}
                placeholder="/path/to/document.docx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
              />
            </div>
          </>
        );

      case 'notion':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Notion Page ID</label>
              <input
                type="text"
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  onChange({ ...config, source: e.target.value });
                }}
                placeholder="page-id-from-notion"
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
              />
            </div>
          </>
        );

      case 'confluence':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Confluence Space Key</label>
              <input
                type="text"
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  onChange({ ...config, source: e.target.value });
                }}
                placeholder="SPACE_KEY"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </>
        );

      case 'github':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">GitHub Repository</label>
              <input
                type="text"
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  onChange({ ...config, source: e.target.value });
                }}
                placeholder="owner/repo"
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="document-loader-config space-y-4">
      <div className="font-semibold text-lg mb-4">Document Loader</div>

      <div className="p-3 bg-purple-50 rounded text-sm mb-4">
        <strong>📄 Source Type</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Document Type</label>
        <select
          value={sourceType}
          onChange={(e) => {
            setSourceType(e.target.value);
            onChange({ ...config, sourceType: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <optgroup label="Documents">
            <option value="pdf">PDF</option>
            <option value="docx">Word (DOCX)</option>
            <option value="text">Plain Text</option>
            <option value="markdown">Markdown</option>
            <option value="csv">CSV</option>
          </optgroup>
          <optgroup label="Web">
            <option value="web">Web Page (URL)</option>
            <option value="sitemap">Sitemap</option>
          </optgroup>
          <optgroup label="Platforms">
            <option value="notion">Notion</option>
            <option value="confluence">Confluence</option>
            <option value="github">GitHub</option>
            <option value="gdrive">Google Drive</option>
          </optgroup>
        </select>
      </div>

      <div className="p-3 bg-blue-50 rounded text-sm mb-4 mt-6">
        <strong>🔗 Source Configuration</strong>
      </div>

      {renderSourceFields()}

      <div className="p-3 bg-green-50 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Options</strong>
      </div>

      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={includeMetadata}
            onChange={(e) => {
              setIncludeMetadata(e.target.checked);
              onChange({ ...config, includeMetadata: e.target.checked });
            }}
            className="rounded"
          />
          <span className="text-sm">Include Metadata</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">Include source, page numbers, timestamps, etc.</p>
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> Document loaders extract text content from various sources for processing.
        Choose the appropriate loader for your document type.
      </div>

      <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
        <strong>Supported Formats:</strong>
        <ul className="mt-2 space-y-1 ml-4">
          <li>• PDF: Extract text, handle scanned docs with OCR</li>
          <li>• Web: Crawl websites, follow links, extract clean text</li>
          <li>• Documents: Word, Excel, PowerPoint, Google Docs</li>
          <li>• Code: GitHub repos, GitLab, Bitbucket</li>
          <li>• Knowledge Bases: Notion, Confluence, SharePoint</li>
        </ul>
      </div>
    </div>
  );
};
