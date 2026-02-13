import React, { useState } from 'react';
import {
  AlertCircle, AlertTriangle, Database, Lightbulb, ShoppingCart, Sparkles,
  Twitter, Users, X, Zap
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { aiWorkflowBuilder, GeneratedWorkflow } from '../../services/AIWorkflowBuilderService';

interface AIWorkflowBuilderProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIWorkflowBuilder({ isOpen, onClose }: AIWorkflowBuilderProps) {
  const { setNodes, setEdges, darkMode, addLog } = useWorkflowStore();
  const currentNodes = useWorkflowStore(state => state.nodes);
  const currentEdges = useWorkflowStore(state => state.edges);

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<GeneratedWorkflow | null>(null);
  const [activeTab, setActiveTab] = useState<'generate' | 'optimize' | 'predict'>('generate');

  const aiService = {
    predictIssues: async (data: any) => [],
    analyzeWorkflow: async (data: any) => []
  }; // Placeholder

  // Exemples de prompts
  const examplePrompts = [
    {
      title: "CRM Integration",
      prompt: "When a new contact is added to my CRM, send a welcome email and add them to my newsletter list",
      icon: Users
    },
    {
      title: "Data Processing",
      prompt: "Every day at 9am, fetch data from MySQL database, transform it, and upload to Google Sheets",
      icon: Database
    },
    {
      title: "Social Media Automation",
      prompt: "Monitor Twitter for mentions, analyze sentiment, and notify Slack if negative",
      icon: Twitter
    },
    {
      title: "E-commerce Workflow",
      prompt: "When an order is placed, update inventory, send confirmation email, and create shipping label",
      icon: ShoppingCart
    }
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const result = await aiWorkflowBuilder.generateFromPrompt({
        description: prompt,
        context: {
          complexity: 'medium',
          industry: 'general'
        }
      });

      setGenerationResult(result);

      addLog({
        level: 'success',
        message: `AI Workflow generated with ${(result.nodes as any[])?.length || 0} nodes`,
        data: { confidence: (result.metadata as any)?.confidence }
      });
    } catch (error) {
      addLog({
        level: 'error',
        message: 'Failed to generate workflow',
        data: error
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const applyWorkflow = () => {
    if (!generationResult) return;

    setNodes(generationResult.nodes as any);
    setEdges(generationResult.edges as any);

    addLog({
      level: 'info',
      message: 'AI-generated workflow applied',
      data: generationResult.metadata
    });

    onClose();
  };

  const handleOptimizeWorkflow = async () => {
    if (currentNodes.length === 0) {
      addLog({
        level: 'warning',
        message: 'No workflow to optimize'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const suggestions = await aiService.analyzeWorkflow({
        nodes: currentNodes,
        edges: currentEdges
      });

      setGenerationResult({
        optimizations: suggestions,
        nodes: undefined,
        edges: undefined,
        metadata: undefined,
        predictions: undefined
      } as GeneratedWorkflow);

      addLog({
        level: 'success',
        message: `Found ${suggestions.length} optimization opportunities`
      });
    } catch (error) {
      addLog({
        level: 'error',
        message: 'Failed to optimize workflow',
        data: error
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyzeWorkflow = async () => {
    if (currentNodes.length === 0) {
      addLog({
        level: 'warning',
        message: 'No workflow to analyze'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const issues = await aiService.predictIssues({
        nodes: currentNodes,
        edges: currentEdges
      });

      setGenerationResult({
        predictions: issues,
        nodes: undefined,
        edges: undefined,
        metadata: undefined,
        optimizations: undefined
      } as GeneratedWorkflow);

      addLog({
        level: 'success',
        message: `Identified ${issues.length} potential issues`
      });
    } catch (error) {
      addLog({
        level: 'error',
        message: 'Failed to predict issues',
        data: error
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePredict = handleAnalyzeWorkflow; // Alias for predict functionality
  const handleOptimize = handleOptimizeWorkflow; // Alias for optimize functionality

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`w-full max-w-4xl max-h-[90vh] ${
        darkMode ? 'bg-gray-900' : 'bg-white'
      } rounded-xl shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Sparkles className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold">AI Workflow Builder</h2>
                <p className="text-sm text-gray-500">Generate workflows with natural language</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {[
            { id: 'generate', label: 'Generate', icon: Sparkles },
            { id: 'optimize', label: 'Optimize', icon: Zap },
            { id: 'predict', label: 'Predict Issues', icon: AlertTriangle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'generate' | 'optimize' | 'predict')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 transition-colors ${
                activeTab === tab.id
                  ? darkMode
                    ? 'bg-gray-800 text-purple-400 border-b-2 border-purple-400'
                    : 'bg-gray-50 text-purple-600 border-b-2 border-purple-600'
                  : darkMode
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {activeTab === 'generate' && (
            <div className="space-y-6">
              {/* Prompt Input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Describe your workflow in natural language
                </label>
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Example: When someone fills out my contact form, save their info to Google Sheets and send them a thank you email"
                    className={`w-full h-32 px-4 py-3 rounded-lg resize-none ${
                      darkMode
                        ? 'bg-gray-800 border-gray-700 text-white'
                        : 'bg-gray-50 border-gray-200 text-gray-900'
                    } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                  <button
                    onClick={() => setPrompt('')}
                    className={`absolute top-3 right-3 p-1 rounded ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                    }`}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Example Prompts */}
              <div>
                <h3 className="text-sm font-medium mb-3">Try these examples:</h3>
                <div className="grid grid-cols-2 gap-3">
                  {examplePrompts.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setPrompt(example.prompt)}
                      className={`p-4 rounded-lg text-left transition-all ${
                        darkMode
                          ? 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                          : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                      } border hover:scale-[1.02]`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          darkMode ? 'bg-gray-700' : 'bg-gray-200'
                        }`}>
                          <example.icon size={16} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{example.title}</h4>
                          <p className="text-xs text-gray-500 mt-1">{example.prompt}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generation Result */}
              {generationResult && generationResult.nodes && (
                <div className={`p-4 rounded-lg ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                } border`}>
                  <h3 className="font-medium mb-3">Generated Workflow</h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>Nodes:</span>
                      <span className="font-mono">{(generationResult.nodes as any[])?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Connections:</span>
                      <span className="font-mono">{(generationResult.edges as any[])?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Confidence:</span>
                      <span className="font-mono">{Math.round(((generationResult.metadata as any)?.confidence || 0) * 100)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Est. Execution Time:</span>
                      <span className="font-mono">{(generationResult.metadata as any)?.estimatedExecutionTime || 0}ms</span>
                    </div>
                  </div>
                  <button
                    onClick={applyWorkflow}
                    className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    Apply Workflow
                  </button>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className={`w-full px-6 py-3 rounded-lg font-medium transition-all ${
                  !prompt.trim() || isGenerating
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transform hover:scale-[1.02]'
                }`}
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Generating...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Sparkles size={20} />
                    <span>Generate Workflow</span>
                  </div>
                )}
              </button>
            </div>
          )}

          {activeTab === 'optimize' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <Zap size={48} className="mx-auto mb-4 text-yellow-500" />
                <h3 className="text-lg font-medium mb-2">Optimize Current Workflow</h3>
                <p className="text-gray-500 mb-6">AI will analyze your workflow and suggest improvements</p>
                <button
                  onClick={handleOptimize}
                  disabled={isGenerating}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    isGenerating
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-yellow-500 text-white hover:bg-yellow-600'
                  }`}
                >
                  {isGenerating ? 'Analyzing...' : 'Analyze Workflow'}
                </button>
              </div>

              {/* Optimization Results */}
              {generationResult?.optimizations && Array.isArray(generationResult.optimizations) && (
                <div className="space-y-4">
                  <h3 className="font-medium">Optimization Suggestions</h3>
                  {(generationResult.optimizations as any[]).map((opt: any, index: number) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          opt.severity === 'high' ? 'bg-red-500' :
                          opt.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                        } text-white`}>
                          <Lightbulb size={16} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{opt.description as string}</h4>
                          <p className="text-sm text-gray-500 mt-1">{opt.impact as string}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'predict' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <AlertTriangle size={48} className="mx-auto mb-4 text-orange-500" />
                <h3 className="text-lg font-medium mb-2">Predict Potential Issues</h3>
                <p className="text-gray-500 mb-6">AI will identify potential problems before they occur</p>
                <button
                  onClick={handlePredict}
                  disabled={isGenerating}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    isGenerating
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  {isGenerating ? 'Analyzing...' : 'Predict Issues'}
                </button>
              </div>

              {/* Prediction Results */}
              {generationResult?.predictions && (
                <div className="space-y-4">
                  <h3 className="font-medium">Potential Issues</h3>
                  {(generationResult.predictions as any[]).map((issue: any, index: number) => (
                    <div key={index} className={`p-4 rounded-lg border ${
                      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          (issue.probability as number) > 0.8 ? 'bg-red-500' :
                          (issue.probability as number) > 0.5 ? 'bg-yellow-500' : 'bg-blue-500'
                        } text-white`}>
                          <AlertCircle size={16} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{issue.description as string}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Probability: {Math.round((issue.probability as number) * 100)}%
                          </p>
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-500">Preventive measures:</p>
                            <ul className="text-xs text-gray-500 mt-1">
                              {(issue.preventiveMeasures as string[]).map((measure: string, i: number) => (
                                <li key={i}>• {measure}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}