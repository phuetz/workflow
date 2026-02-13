import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  Suggestion,
  UserPattern,
  WorkflowPattern,
  PersonalizationConfig,
} from '../../types/memory';
import { UserProfileManager } from '../../memory/UserProfileManager';
import { logger } from '../../services/SimpleLogger';

interface AgentPersonalityProps {
  profileManager: UserProfileManager;
  userId: string;
  agentId: string;
}

export const AgentPersonality: React.FC<AgentPersonalityProps> = ({
  profileManager,
  userId,
  agentId,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [patterns, setPatterns] = useState<UserPattern[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowPattern[]>([]);
  const [selectedTab, setSelectedTab] = useState<'suggestions' | 'patterns' | 'workflows'>(
    'suggestions'
  );

  useEffect(() => {
    loadProfile();
    loadSuggestions();
    loadPatterns();
    loadWorkflows();
  }, [userId, agentId]);

  const loadProfile = async () => {
    try {
      const userProfile = await profileManager.getProfile(userId, agentId);
      setProfile(userProfile);
    } catch (error) {
      logger.error('Failed to load profile:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const suggestionsData = await profileManager.getSuggestions(userId, agentId);
      setSuggestions(suggestionsData);
    } catch (error) {
      logger.error('Failed to load suggestions:', error);
    }
  };

  const loadPatterns = async () => {
    try {
      const patternsData = await profileManager.getPatterns(userId, agentId);
      setPatterns(patternsData);
    } catch (error) {
      logger.error('Failed to load patterns:', error);
    }
  };

  const loadWorkflows = async () => {
    try {
      const workflowsData = await profileManager.getCommonWorkflows(userId, agentId);
      setWorkflows(workflowsData);
    } catch (error) {
      logger.error('Failed to load workflows:', error);
    }
  };

  const handleFeedback = async (suggestionId: string, type: 'positive' | 'negative') => {
    try {
      await profileManager.recordFeedback(userId, agentId, {
        suggestionId,
        type,
        comment: '',
      });

      // Reload suggestions after feedback
      await loadSuggestions();
    } catch (error) {
      logger.error('Failed to record feedback:', error);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getPatternTypeColor = (type: string) => {
    switch (type) {
      case 'temporal':
        return 'bg-purple-100 text-purple-800';
      case 'workflow':
        return 'bg-blue-100 text-blue-800';
      case 'interaction':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="agent-personality p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Agent Personalization
        </h1>
        <p className="text-gray-600">
          See how your agent learns and adapts to your preferences
        </p>
      </div>

      {/* Learning Progress */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Learning Progress
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Learning Rate</p>
            <p className="text-2xl font-bold text-gray-900">
              {(profile.statistics.learningRate * 100).toFixed(0)}%
            </p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${profile.statistics.learningRate * 100}%`,
                }}
              />
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500">Patterns Recognized</p>
            <p className="text-2xl font-bold text-gray-900">
              {patterns.length}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Common Workflows</p>
            <p className="text-2xl font-bold text-gray-900">
              {workflows.length}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Learning Events</p>
            <p className="text-2xl font-bold text-gray-900">
              {profile.learningHistory.length}
            </p>
          </div>
        </div>

        {/* Most Used Nodes */}
        {Object.keys(profile.statistics.mostUsedNodes).length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Your Favorite Nodes
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(profile.statistics.mostUsedNodes)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([node, count]) => (
                  <span
                    key={node}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {node} ({count})
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {(['suggestions', 'patterns', 'workflows'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  selectedTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'suggestions' && suggestions.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                    {suggestions.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Suggestions Tab */}
          {selectedTab === 'suggestions' && (
            <div className="space-y-4">
              {suggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No suggestions available yet.</p>
                  <p className="text-sm mt-2">
                    Keep using the platform and the agent will learn your preferences!
                  </p>
                </div>
              ) : (
                suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            {suggestion.type}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${getImpactColor(
                              suggestion.impact
                            )}`}
                          >
                            {suggestion.impact} impact
                          </span>
                          <span className="text-xs text-gray-500">
                            {(suggestion.confidence * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 mb-1">
                          {suggestion.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {suggestion.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFeedback(suggestion.id, 'positive')}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                      >
                        👍 Helpful
                      </button>
                      <button
                        onClick={() => handleFeedback(suggestion.id, 'negative')}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        👎 Not Helpful
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Patterns Tab */}
          {selectedTab === 'patterns' && (
            <div className="space-y-3">
              {patterns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No patterns detected yet.
                </div>
              ) : (
                patterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${getPatternTypeColor(
                              pattern.type
                            )}`}
                          >
                            {pattern.type}
                          </span>
                          <span className="text-xs text-gray-500">
                            Seen {pattern.frequency} times
                          </span>
                          <span className="text-xs text-gray-500">
                            {(pattern.confidence * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 font-mono">
                          {pattern.pattern}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Last seen: {new Date(pattern.lastSeen).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Workflows Tab */}
          {selectedTab === 'workflows' && (
            <div className="space-y-3">
              {workflows.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No workflow patterns yet.
                </div>
              ) : (
                workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-900 mb-2">
                          {workflow.name}
                        </h3>
                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-500">Usage</p>
                            <p className="text-sm font-medium text-gray-900">
                              {workflow.frequency} times
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Success Rate</p>
                            <p className="text-sm font-medium text-gray-900">
                              {(workflow.successRate * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Avg Duration</p>
                            <p className="text-sm font-medium text-gray-900">
                              {(workflow.avgExecutionTime / 1000).toFixed(1)}s
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {workflow.nodes.slice(0, 5).map((node, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {node}
                            </span>
                          ))}
                          {workflow.nodes.length > 5 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                              +{workflow.nodes.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Last used: {new Date(workflow.lastUsed).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Learning Events */}
      {profile.learningHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Recent Learning Events
          </h2>
          <div className="space-y-2">
            {profile.learningHistory.slice(-10).reverse().map((event) => (
              <div
                key={event.id}
                className="flex items-start p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      {event.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      Impact: {(event.impact * 100).toFixed(0)}%
                    </span>
                    {event.applied && (
                      <span className="text-xs text-green-600">✓ Applied</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{event.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
