/**
 * Copilot Studio Component
 *
 * Main AI Copilot Studio UI featuring:
 * - Split view (chat + workflow canvas)
 * - Template gallery
 * - Real-time workflow updates
 * - Agent customization
 * - Performance analytics
 */

import React, { useState, useEffect } from 'react';
import {
  Bot, Eye, FileText, LayoutDashboard, Lightbulb, MessageSquare,
  MoreVertical, Plus, Shield, Sparkles, Star, Users,
  Workflow as WorkflowIcon, X, Zap
} from 'lucide-react';
import { conversationalWorkflowBuilder } from '../../copilot/ConversationalWorkflowBuilder';
import { agentCustomizer } from '../../copilot/AgentCustomizer';
import { workflowOptimizer } from '../../copilot/WorkflowOptimizer';
import { copilotMemory } from '../../copilot/CopilotMemory';
import { templateSelector } from '../../copilot/TemplateSelector';
import { CopilotSession, AgentConfiguration } from '../../copilot/types/copilot';
import type { Workflow } from '../../types/workflowTypes';
import VisualCopilotAssistant from './VisualCopilotAssistant';
import CopilotSuggestionCard from './CopilotSuggestionCard';
import { logger } from '../../services/SimpleLogger';

interface CopilotStudioProps {
  userId: string;
  darkMode?: boolean;
  onClose?: () => void;
}

type ViewMode = 'chat' | 'split' | 'canvas' | 'templates' | 'agents';

export const CopilotStudio: React.FC<CopilotStudioProps> = ({
  userId,
  darkMode = false,
  onClose
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [session, setSession] = useState<CopilotSession | null>(null);
  const [workflow, setWorkflow] = useState<Partial<Workflow> | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [agents, setAgents] = useState<AgentConfiguration[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<{
    totalConversations: number;
    completedWorkflows: number;
    averageSatisfaction: number;
    totalPatterns: number;
    favoriteTemplatesCount: number;
    customShortcutsCount: number;
  } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, [userId]);

  const loadInitialData = async () => {
    try {
      // Load templates
      const popularTemplates = templateSelector.getPopularTemplates(10);
      setTemplates(popularTemplates);

      // Load agents
      const agentList = agentCustomizer.listAgents();
      setAgents(agentList);

      // Load statistics
      const stats = await copilotMemory.getStatistics(userId);
      setStatistics(stats);
    } catch (error) {
      logger.error('Failed to load initial data:', error);
    }
  };

  const handleWorkflowCreated = async (newWorkflow: Workflow) => {
    setWorkflow(newWorkflow);

    // Generate optimizations
    const optimizations = await workflowOptimizer.optimize(newWorkflow);
    setSuggestions(optimizations.slice(0, 5));
  };

  const themeClasses = darkMode
    ? 'bg-gray-900 text-white'
    : 'bg-white text-gray-900';

  const renderChatView = () => (
    <div className="flex-1 flex flex-col">
      <VisualCopilotAssistant
        userId={userId}
        onWorkflowCreated={handleWorkflowCreated}
        position="bottom-right"
        darkMode={darkMode}
      />
    </div>
  );

  const renderSplitView = () => (
    <div className="flex-1 grid grid-cols-2 gap-4 p-4">
      {/* Chat Panel */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-4 overflow-auto`}>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <MessageSquare size={24} />
          Conversation
        </h2>
        <VisualCopilotAssistant
          userId={userId}
          onWorkflowCreated={handleWorkflowCreated}
          position="bottom-right"
          darkMode={darkMode}
        />
      </div>

      {/* Workflow Canvas + Suggestions */}
      <div className="space-y-4">
        {/* Workflow Preview */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-4`}>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <WorkflowIcon size={24} />
            Workflow Canvas
          </h2>
          {workflow ? (
            <div className="space-y-2">
              <div className="font-semibold">{workflow.name}</div>
              <div className="text-sm opacity-70">{workflow.description}</div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                  <div className="text-xs opacity-70">Nodes</div>
                  <div className="text-2xl font-bold">{workflow.nodes?.length || 0}</div>
                </div>
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                  <div className="text-xs opacity-70">Connections</div>
                  <div className="text-2xl font-bold">{workflow.edges?.length || 0}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 opacity-50">
              <WorkflowIcon size={48} className="mx-auto mb-2" />
              <div>No workflow yet</div>
              <div className="text-sm">Create one using the chat</div>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-4 max-h-[400px] overflow-auto`}>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Lightbulb size={20} />
              Suggestions
            </h3>
            <div className="space-y-2">
              {suggestions.map((suggestion, idx) => (
                <CopilotSuggestionCard
                  key={idx}
                  suggestion={suggestion}
                  darkMode={darkMode}
                  compact
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderTemplatesView = () => (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <FileText size={28} />
          Template Gallery
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template, idx) => (
            <div
              key={idx}
              className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold">{template.name}</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                  {template.complexity}
                </span>
              </div>
              <p className="text-sm opacity-70 mb-4">{template.description}</p>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-500" />
                  <span>{template.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={14} />
                  <span>{template.usageCount} uses</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                  Use Template
                </button>
                <button className={`px-3 py-2 rounded-lg border ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'} transition-colors`}>
                  <Eye size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAgentsView = () => (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot size={28} />
            AI Agents
          </h2>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
            <Plus size={18} />
            New Agent
          </button>
        </div>

        {agents.length === 0 ? (
          <div className="text-center py-12">
            <Bot size={64} className="mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
            <p className="text-sm opacity-70 mb-4">Create your first AI agent to automate tasks</p>
            <button className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              Create Agent
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-4 hover:shadow-lg transition-shadow`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold">{agent.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    agent.deploymentStatus === 'deployed'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                      : agent.deploymentStatus === 'testing'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {agent.deploymentStatus}
                  </span>
                </div>
                <p className="text-sm opacity-70 mb-4">{agent.description}</p>
                <div className="text-xs mb-4">
                  <div className="flex items-center gap-1 mb-1">
                    <Zap size={12} />
                    <span>{agent.skills.length} skills</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield size={12} />
                    <span>{agent.permissions.length} permissions</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                    Configure
                  </button>
                  <button className={`px-3 py-2 rounded-lg border ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'} transition-colors`}>
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`fixed inset-0 z-50 ${themeClasses} flex flex-col`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'} flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">AI Copilot Studio</h1>
            <p className="text-sm opacity-70">Democratizing workflow automation</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Selector */}
          <div className={`flex items-center gap-1 p-1 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-2 rounded-lg transition-colors ${viewMode === 'split' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              <LayoutDashboard size={18} />
            </button>
            <button
              onClick={() => setViewMode('templates')}
              className={`px-3 py-2 rounded-lg transition-colors ${viewMode === 'templates' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              <FileText size={18} />
            </button>
            <button
              onClick={() => setViewMode('agents')}
              className={`px-3 py-2 rounded-lg transition-colors ${viewMode === 'agents' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              <Bot size={18} />
            </button>
          </div>

          {/* Statistics */}
          {statistics && (
            <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} text-sm`}>
              <div className="flex items-center gap-4">
                <div>
                  <div className="opacity-70">Workflows</div>
                  <div className="font-bold">{statistics.completedWorkflows}</div>
                </div>
                <div>
                  <div className="opacity-70">Satisfaction</div>
                  <div className="font-bold">{statistics.averageSatisfaction.toFixed(1)}/5</div>
                </div>
              </div>
            </div>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {viewMode === 'split' && renderSplitView()}
      {viewMode === 'templates' && renderTemplatesView()}
      {viewMode === 'agents' && renderAgentsView()}
    </div>
  );
};

export default CopilotStudio;
