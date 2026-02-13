/**
 * Semantic Query Builder - UI for natural language queries
 *
 * Provides an intuitive interface for building and executing semantic queries
 * with natural language input, visual query builder, and results display.
 *
 * @module components/SemanticQueryBuilder
 */

import React, { useState, useEffect } from 'react';
import { getSemanticQueryParser } from '../../semantic/SemanticQueryParser';
import { getFederatedQueryEngine } from '../../semantic/FederatedQueryEngine';
import { getSemanticLayer } from '../../semantic/SemanticLayer';
import { SemanticQuery, QueryResult, QueryIntent } from '../../semantic/types/semantic';

/**
 * SemanticQueryBuilder component
 */
export const SemanticQueryBuilder: React.FC = () => {
  const [query, setQuery] = useState('');
  const [parsedQuery, setParsedQuery] = useState<SemanticQuery | null>(null);
  const [results, setResults] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SemanticQuery[]>([]);
  const [favorites, setFavorites] = useState<SemanticQuery[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const parser = getSemanticQueryParser();
  const engine = getFederatedQueryEngine();
  const semanticLayer = getSemanticLayer();

  // Load history and favorites
  useEffect(() => {
    const savedHistory = localStorage.getItem('semantic_query_history');
    const savedFavorites = localStorage.getItem('semantic_query_favorites');

    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  /**
   * Handle query submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Parse natural language query
      const parsed = parser.parse(query);
      setParsedQuery(parsed);

      // Execute query
      const result = await semanticLayer.query(parsed);
      setResults(result);

      // Add to history
      const newHistory = [parsed, ...history.slice(0, 99)];
      setHistory(newHistory);
      localStorage.setItem('semantic_query_history', JSON.stringify(newHistory));
    } catch (err: any) {
      setError(err.message || 'Failed to execute query');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add query to favorites
   */
  const addToFavorites = () => {
    if (!parsedQuery) return;

    const newFavorites = [parsedQuery, ...favorites];
    setFavorites(newFavorites);
    localStorage.setItem('semantic_query_favorites', JSON.stringify(newFavorites));
  };

  /**
   * Load query from history or favorites
   */
  const loadQuery = (savedQuery: SemanticQuery) => {
    setQuery(savedQuery.naturalLanguageQuery);
    setParsedQuery(savedQuery);
  };

  /**
   * Export results
   */
  const exportResults = (format: 'csv' | 'json' | 'excel') => {
    if (!results) return;

    switch (format) {
      case 'csv':
        exportCSV(results);
        break;
      case 'json':
        exportJSON(results);
        break;
      case 'excel':
        exportExcel(results);
        break;
    }
  };

  /**
   * Export results as CSV
   */
  const exportCSV = (results: QueryResult) => {
    const headers = results.columns.map(c => c.name).join(',');
    const rows = results.rows.map(row => row.join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query_results.csv';
    a.click();
  };

  /**
   * Export results as JSON
   */
  const exportJSON = (results: QueryResult) => {
    const json = JSON.stringify(results, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query_results.json';
    a.click();
  };

  /**
   * Export results as Excel (simplified)
   */
  const exportExcel = (results: QueryResult) => {
    // Would use a library like xlsx in production
    exportCSV(results);
  };

  /**
   * Get query suggestions
   */
  const getSuggestions = (): string[] => {
    return [
      'Show me total sales by region last month',
      'What are the top 10 products by revenue',
      'Compare revenue between last year and this year',
      'Find all orders where amount > 1000',
      'Show me user growth over time'
    ];
  };

  /**
   * Get intent badge color
   */
  const getIntentColor = (intent: QueryIntent): string => {
    const colors: Record<QueryIntent, string> = {
      [QueryIntent.RETRIEVE]: 'bg-blue-100 text-blue-800',
      [QueryIntent.AGGREGATE]: 'bg-green-100 text-green-800',
      [QueryIntent.COMPARE]: 'bg-purple-100 text-purple-800',
      [QueryIntent.TREND]: 'bg-orange-100 text-orange-800',
      [QueryIntent.RANK]: 'bg-red-100 text-red-800',
      [QueryIntent.SEARCH]: 'bg-gray-100 text-gray-800'
    };

    return colors[intent] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Semantic Query Builder</h1>
        <p className="text-sm text-gray-600 mt-1">
          Ask questions about your data in natural language
        </p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - History & Favorites */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          {/* Favorites */}
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Favorites</h3>
            {favorites.length === 0 ? (
              <p className="text-sm text-gray-500">No favorites yet</p>
            ) : (
              <div className="space-y-2">
                {favorites.slice(0, 10).map((fav, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadQuery(fav)}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border border-gray-200"
                  >
                    {fav.naturalLanguageQuery.substring(0, 50)}
                    {fav.naturalLanguageQuery.length > 50 ? '...' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* History */}
          <div className="p-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">History</h3>
            {history.length === 0 ? (
              <p className="text-sm text-gray-500">No history yet</p>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 20).map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadQuery(item)}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border border-gray-200"
                  >
                    {item.naturalLanguageQuery.substring(0, 50)}
                    {item.naturalLanguageQuery.length > 50 ? '...' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Query Input */}
          <div className="bg-white border-b border-gray-200 p-6">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Ask a question about your data... (e.g., Show me total sales by region)"
                  className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                />

                <div className="absolute right-2 top-2 flex gap-2">
                  {parsedQuery && (
                    <button
                      type="button"
                      onClick={addToFavorites}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-yellow-600"
                      title="Add to favorites"
                    >
                      ★
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Running...' : 'Run'}
                  </button>
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && !query && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
                    <div className="p-2">
                      <p className="text-xs font-semibold text-gray-700 mb-2">
                        Try these examples:
                      </p>
                      {getSuggestions().map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => setQuery(suggestion)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </form>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                {error}
              </div>
            )}
          </div>

          {/* Parsed Query Info */}
          {parsedQuery && (
            <div className="bg-gray-50 border-b border-gray-200 p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Intent:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getIntentColor(parsedQuery.parsedQuery.intent)}`}>
                    {parsedQuery.parsedQuery.intent}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Confidence:</span>
                  <span className="text-sm font-medium">
                    {(parsedQuery.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                {parsedQuery.parsedQuery.entities.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Entities:</span>
                    <div className="flex gap-1">
                      {parsedQuery.parsedQuery.entities.map((entity, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {entity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {parsedQuery.parsedQuery.metrics.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Metrics:</span>
                    <div className="flex gap-1">
                      {parsedQuery.parsedQuery.metrics.map((metric, idx) => (
                        <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          {metric}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          <div className="flex-1 overflow-auto p-6">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Executing query...</p>
                </div>
              </div>
            )}

            {!loading && results && (
              <div>
                {/* Results Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Results ({results.rowCount} rows)
                    </h2>
                    <p className="text-sm text-gray-600">
                      Executed in {results.executionTime}ms
                      {results.cached && ' (cached)'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => exportResults('csv')}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => exportResults('json')}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Export JSON
                    </button>
                    <button
                      onClick={() => exportResults('excel')}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Export Excel
                    </button>
                  </div>
                </div>

                {/* Results Table */}
                {results.rowCount > 0 ? (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {results.columns.map((col, idx) => (
                              <th
                                key={idx}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {col.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {results.rows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-gray-50">
                              {row.map((cell, cellIdx) => (
                                <td
                                  key={cellIdx}
                                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                                >
                                  {cell !== null && cell !== undefined ? String(cell) : '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No results found</p>
                  </div>
                )}
              </div>
            )}

            {!loading && !results && !error && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl mb-4">💭</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Ask a question about your data
                  </h3>
                  <p className="text-gray-600">
                    Use natural language to query your data across all sources
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SemanticQueryBuilder;
