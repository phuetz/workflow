/**
 * Text Splitter Node Configuration
 * Split documents into chunks for embedding and processing
 * LangChain Integration
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface TextSplitterConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const TextSplitterConfig: React.FC<TextSplitterConfigProps> = ({ config, onChange }) => {
  const [splitterType, setSplitterType] = useState((config.splitterType as string) || 'recursive');
  const [chunkSize, setChunkSize] = useState((config.chunkSize as number) || 1000);
  const [chunkOverlap, setChunkOverlap] = useState((config.chunkOverlap as number) || 200);
  const [separator, setSeparator] = useState((config.separator as string) || '\n\n');
  const [keepSeparator, setKeepSeparator] = useState((config.keepSeparator as boolean) ?? true);
  const [stripWhitespace, setStripWhitespace] = useState((config.stripWhitespace as boolean) ?? true);
  const [lengthFunction, setLengthFunction] = useState((config.lengthFunction as string) || 'characters');

  const renderSplitterSpecificFields = () => {
    switch (splitterType) {
      case 'recursive':
        return (
          <div className="p-3 bg-gray-50 rounded text-xs">
            <strong>Recursive Character Splitter:</strong>
            <p className="mt-1">
              Splits text recursively using a hierarchy of separators (paragraphs → sentences → words).
              Best for general text where you want semantic coherence.
            </p>
          </div>
        );

      case 'character':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Separator</label>
              <input
                type="text"
                value={separator}
                onChange={(e) => {
                  setSeparator(e.target.value);
                  onChange({ ...config, separator: e.target.value });
                }}
                placeholder="\n\n"
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">Character(s) to split on (e.g., \n, \n\n, |)</p>
            </div>
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={keepSeparator}
                  onChange={(e) => {
                    setKeepSeparator(e.target.checked);
                    onChange({ ...config, keepSeparator: e.target.checked });
                  }}
                  className="rounded"
                />
                <span className="text-sm">Keep Separator in Chunks</span>
              </label>
            </div>
          </>
        );

      case 'token':
        return (
          <div className="p-3 bg-gray-50 rounded text-xs">
            <strong>Token Splitter:</strong>
            <p className="mt-1">
              Splits by token count (useful for LLM context windows). Chunk size represents tokens, not characters.
              Uses tiktoken encoding for accurate token counting.
            </p>
          </div>
        );

      case 'markdown':
        return (
          <div className="p-3 bg-gray-50 rounded text-xs">
            <strong>Markdown Splitter:</strong>
            <p className="mt-1">
              Preserves markdown structure by splitting on headers while respecting chunk size.
              Maintains document hierarchy and formatting.
            </p>
          </div>
        );

      case 'html':
        return (
          <div className="p-3 bg-gray-50 rounded text-xs">
            <strong>HTML Splitter:</strong>
            <p className="mt-1">
              Splits HTML while preserving tags and structure. Useful for web content where you need to maintain formatting.
            </p>
          </div>
        );

      case 'code':
        return (
          <div className="p-3 bg-gray-50 rounded text-xs">
            <strong>Code Splitter:</strong>
            <p className="mt-1">
              Language-aware code splitting that respects function/class boundaries.
              Supports Python, JavaScript, TypeScript, Java, C++, and more.
            </p>
          </div>
        );

      case 'semantic':
        return (
          <div className="p-3 bg-gray-50 rounded text-xs">
            <strong>Semantic Splitter:</strong>
            <p className="mt-1">
              Uses embeddings to create chunks based on semantic similarity.
              More intelligent but slower. Requires embedding model configuration.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="text-splitter-config space-y-4">
      <div className="font-semibold text-lg mb-4">Text Splitter</div>

      <div className="p-3 bg-purple-50 rounded text-sm mb-4">
        <strong>✂️ Splitter Type</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Splitting Strategy</label>
        <select
          value={splitterType}
          onChange={(e) => {
            setSplitterType(e.target.value);
            onChange({ ...config, splitterType: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="recursive">Recursive Character (Recommended)</option>
          <option value="character">Character</option>
          <option value="token">Token (for LLMs)</option>
          <option value="markdown">Markdown (Preserves Structure)</option>
          <option value="html">HTML (Preserves Tags)</option>
          <option value="code">Code (Language-Aware)</option>
          <option value="semantic">Semantic (AI-Powered)</option>
        </select>
      </div>

      <div className="p-3 bg-green-50 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Configuration</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Chunk Size ({lengthFunction === 'tokens' ? 'tokens' : 'characters'})
        </label>
        <input
          type="number"
          min="100"
          max="10000"
          step="100"
          value={chunkSize}
          onChange={(e) => {
            const value = parseInt(e.target.value);
            setChunkSize(value);
            onChange({ ...config, chunkSize: value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">
          Target size for each chunk. Typical: 500-2000 for embeddings, 4000-8000 for LLM context.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Chunk Overlap ({lengthFunction === 'tokens' ? 'tokens' : 'characters'})
        </label>
        <input
          type="number"
          min="0"
          max={Math.floor(chunkSize * 0.5)}
          step="50"
          value={chunkOverlap}
          onChange={(e) => {
            const value = parseInt(e.target.value);
            setChunkOverlap(value);
            onChange({ ...config, chunkOverlap: value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">
          Overlap between chunks to preserve context. Typical: 10-20% of chunk size.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Length Function</label>
        <select
          value={lengthFunction}
          onChange={(e) => {
            setLengthFunction(e.target.value);
            onChange({ ...config, lengthFunction: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="characters">Count Characters</option>
          <option value="tokens">Count Tokens (tiktoken)</option>
        </select>
      </div>

      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={stripWhitespace}
            onChange={(e) => {
              setStripWhitespace(e.target.checked);
              onChange({ ...config, stripWhitespace: e.target.checked });
            }}
            className="rounded"
          />
          <span className="text-sm">Strip Whitespace</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">Remove leading/trailing whitespace from chunks</p>
      </div>

      {renderSplitterSpecificFields()}

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> Text splitting is crucial for RAG (Retrieval-Augmented Generation).
        Proper chunking ensures relevant context while staying within model limits.
      </div>

      <div className="mt-2 p-3 bg-blue-50 rounded text-xs">
        <strong>Best Practices:</strong>
        <ul className="mt-2 space-y-1 ml-4">
          <li>• Embedding models: Use 500-1000 character chunks</li>
          <li>• LLM context: Use up to 4000-8000 character chunks</li>
          <li>• Add 10-20% overlap to preserve context across boundaries</li>
          <li>• Use recursive splitter for general text (best default)</li>
          <li>• Use token splitter when working with LLM context windows</li>
          <li>• Use semantic splitter for highest quality (slower)</li>
        </ul>
      </div>
    </div>
  );
};
