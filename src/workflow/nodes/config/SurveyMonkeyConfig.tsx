import React, { useCallback } from 'react';

interface SurveyMonkeyConfigProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const SurveyMonkeyConfig: React.FC<SurveyMonkeyConfigProps> = ({ config, onChange }) => {
  const handleChange = useCallback((updates: Record<string, any>) => {
    onChange({ ...config, ...updates });
  }, [config, onChange]);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700 mb-2">
        SurveyMonkey Configuration
      </div>

      {/* Authentication */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-md">
        <div className="text-sm font-medium text-gray-700">OAuth 2.0 Authentication</div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Access Token
          </label>
          <input
            type="password"
            value={config.accessToken || ''}
            onChange={(e) => handleChange({ accessToken: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Your SurveyMonkey Access Token"
          />
        </div>
      </div>

      {/* Operation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={config.operation || 'getSurveyResponses'}
          onChange={(e) => handleChange({ operation: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <optgroup label="Surveys">
            <option value="listSurveys">List Surveys</option>
            <option value="getSurvey">Get Survey</option>
            <option value="getSurveyDetails">Get Survey Details</option>
          </optgroup>
          <optgroup label="Responses">
            <option value="getSurveyResponses">Get Survey Responses</option>
            <option value="getResponseDetails">Get Response Details</option>
            <option value="getBulkResponses">Get Bulk Responses</option>
          </optgroup>
          <optgroup label="Collectors">
            <option value="listCollectors">List Collectors</option>
            <option value="getCollector">Get Collector</option>
            <option value="createCollector">Create Collector</option>
          </optgroup>
          <optgroup label="Questions">
            <option value="getSurveyPages">Get Survey Pages</option>
            <option value="getPageQuestions">Get Page Questions</option>
          </optgroup>
        </select>
      </div>

      {/* Survey ID */}
      {(config.operation !== 'listSurveys') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Survey ID
          </label>
          <input
            type="text"
            value={config.surveyId || ''}
            onChange={(e) => handleChange({ surveyId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Survey ID"
          />
        </div>
      )}

      {/* Get Survey Responses */}
      {(config.operation === 'getSurveyResponses' || config.operation === 'getBulkResponses') && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Response Filters</div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Per Page
              </label>
              <input
                type="number"
                value={config.perPage || 100}
                onChange={(e) => handleChange({ perPage: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Page
              </label>
              <input
                type="number"
                value={config.page || 1}
                onChange={(e) => handleChange({ page: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="datetime-local"
                value={config.startDate || ''}
                onChange={(e) => handleChange({ startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="datetime-local"
                value={config.endDate || ''}
                onChange={(e) => handleChange({ endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status Filter
            </label>
            <select
              value={config.status || 'all'}
              onChange={(e) => handleChange({ status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Responses</option>
              <option value="completed">Completed Only</option>
              <option value="partial">Partial Only</option>
              <option value="overquota">Over Quota</option>
              <option value="disqualified">Disqualified</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={config.sortBy || 'date_modified'}
              onChange={(e) => handleChange({ sortBy: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="date_modified">Date Modified</option>
              <option value="date_created">Date Created</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort Order
            </label>
            <select
              value={config.sortOrder || 'DESC'}
              onChange={(e) => handleChange({ sortOrder: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="DESC">Descending</option>
              <option value="ASC">Ascending</option>
            </select>
          </div>
        </div>
      )}

      {/* Get Response Details */}
      {config.operation === 'getResponseDetails' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Response ID
          </label>
          <input
            type="text"
            value={config.responseId || ''}
            onChange={(e) => handleChange({ responseId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Response ID"
          />
        </div>
      )}

      {/* Collector Operations */}
      {(config.operation === 'getCollector' || config.operation === 'createCollector') && (
        <div className="space-y-3">
          {config.operation === 'getCollector' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Collector ID
              </label>
              <input
                type="text"
                value={config.collectorId || ''}
                onChange={(e) => handleChange({ collectorId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Collector ID"
              />
            </div>
          )}

          {config.operation === 'createCollector' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collector Type
                </label>
                <select
                  value={config.collectorType || 'weblink'}
                  onChange={(e) => handleChange({ collectorType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="weblink">Web Link</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={config.collectorName || ''}
                  onChange={(e) => handleChange({ collectorName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="My Collector"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Page Questions */}
      {config.operation === 'getPageQuestions' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Page ID
          </label>
          <input
            type="text"
            value={config.pageId || ''}
            onChange={(e) => handleChange({ pageId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Page ID"
          />
        </div>
      )}

      {/* List Options */}
      {(config.operation === 'listSurveys' || config.operation === 'listCollectors') && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Per Page
              </label>
              <input
                type="number"
                value={config.perPage || 50}
                onChange={(e) => handleChange({ perPage: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Page
              </label>
              <input
                type="number"
                value={config.page || 1}
                onChange={(e) => handleChange({ page: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1"
              />
            </div>
          </div>

          {config.operation === 'listSurveys' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Folder ID (optional)
              </label>
              <input
                type="text"
                value={config.folderId || ''}
                onChange={(e) => handleChange({ folderId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Filter by folder"
              />
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <div className="text-sm text-blue-800">
          <strong>SurveyMonkey Integration</strong>
          <p className="mt-1 text-xs">
            SurveyMonkey is a leading survey platform for creating and analyzing surveys.
            Requires OAuth 2.0 access token from SurveyMonkey Developer Portal.
          </p>
          <p className="mt-2 text-xs">
            <strong>Common workflows:</strong> Collect survey responses, analyze results, create collectors, and automate follow-ups.
          </p>
        </div>
      </div>
    </div>
  );
};
