import React, { useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Sparkles, Wand2, Send, Loader2, CheckCircle2 } from 'lucide-react';

interface AIGenerationRequest {
  prompt: string;
  complexity: 'simple' | 'medium' | 'complex';
  includeErrorHandling: boolean;
  preferredServices: string[];
}

interface GeneratedWorkflow {
  nodes: any[];
  edges: any[];
  description: string;
  estimatedCost: number;
  reliability: number;
}

export default function AIWorkflowGenerator() {
  const { darkMode, setNodes, setEdges, addLog } = useWorkflowStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [complexity, setComplexity] = useState<'simple' | 'medium' | 'complex'>('medium');
  const [includeErrorHandling, setIncludeErrorHandling] = useState(true);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<GeneratedWorkflow | null>(null);

  const popularServices = [
    'Gmail', 'Slack', 'Discord', 'Notion', 'Airtable', 'Google Sheets',
    'OpenAI', 'Twitter', 'GitHub', 'Stripe', 'MySQL', 'PostgreSQL',
    'AWS S3', 'Webhook', 'Schedule', 'Transform'
  ];

  const promptExamples = [
    "Créer un workflow de veille Twitter → résumé IA → Slack",
    "Automatiser l'onboarding client : email → CRM → tâches",
    "Synchroniser données Stripe → comptabilité → reporting",
    "Bot Discord pour modération + analytics",
    "Pipeline CI/CD : GitHub → tests → déploiement → Slack",
    "Workflow e-commerce : commande → stock → expédition → notification"
  ];

  const generateWorkflow = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    
    try {
      // Simulation de l'API Gemini/GPT
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const workflow = await simulateAIGeneration(prompt, complexity, includeErrorHandling, selectedServices);
      setGeneratedWorkflow(workflow);
      
      addLog({
        level: 'info',
        message: 'Workflow généré par IA avec succès',
        data: { prompt, complexity, nodes: workflow.nodes.length }
      });
      
    } catch (error) {
      addLog({
        level: 'error',
        message: 'Erreur lors de la génération IA',
        data: { error: error.message }
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const applyWorkflow = () => {
    if (generatedWorkflow) {
      setNodes(generatedWorkflow.nodes);
      setEdges(generatedWorkflow.edges);
      setIsOpen(false);
      setGeneratedWorkflow(null);
      
      addLog({
        level: 'info',
        message: 'Workflow IA appliqué au canvas',
        data: { nodes: generatedWorkflow.nodes.length, edges: generatedWorkflow.edges.length }
      });
    }
  };

  const simulateAIGeneration = async (
    prompt: string, 
    complexity: string, 
    errorHandling: boolean, 
    services: string[]
  ): Promise<GeneratedWorkflow> => {
    
    // Analyse du prompt pour déterminer les nœuds nécessaires
    const promptLower = prompt.toLowerCase();
    const nodes: any[] = [];
    const edges: any[] = [];
    let nodeId = 1;

    // Position helper
    const getPosition = (index: number) => ({
      x: 100 + (index * 250),
      y: 100 + Math.sin(index * 0.5) * 50
    });

    // 1. Déterminer le trigger
    let triggerType = 'manualTrigger';
    if (promptLower.includes('schedule') || promptLower.includes('cron')) triggerType = 'schedule';
    if (promptLower.includes('webhook') || promptLower.includes('api')) triggerType = 'webhook';
    if (promptLower.includes('email')) triggerType = 'emailTrigger';
    if (promptLower.includes('rss') || promptLower.includes('feed')) triggerType = 'rssFeed';

    nodes.push({
      id: `node_${nodeId}`,
      type: 'custom',
      position: getPosition(0),
      data: {
        type: triggerType,
        label: getTriggerLabel(triggerType),
        config: getTriggerConfig(triggerType, prompt)
      }
    });

    const lastNodeId = `node_${nodeId}`;
    nodeId++;

    // 2. Ajouter les nœuds de traitement selon le prompt
    const processingNodes = determineProcessingNodes(prompt, services);
    processingNodes.forEach((nodeConfig, index) => {
      const currentNodeId = `node_${nodeId}`;
      
      nodes.push({
        id: currentNodeId,
        type: 'custom',
        position: getPosition(index + 1),
        data: nodeConfig
      });

      // Connecter au nœud précédent
      const sourceId = index === 0 ? lastNodeId : `node_${nodeId - 1}`;
      edges.push({
        id: `edge_${edges.length + 1}`,
        source: sourceId,
        target: currentNodeId,
        type: 'default',
        animated: true
      });

      nodeId++;
    });

    // 3. Ajouter gestion d'erreur si demandée
    if (errorHandling && complexity !== 'simple') {
      const errorNodeId = `node_${nodeId}`;
      nodes.push({
        id: errorNodeId,
        type: 'custom',
        position: { x: 100, y: 300 },
        data: {
          type: 'slack',
          label: 'Error Notification',
          config: {
            channel: '#alerts',
            message: 'Workflow error: {{$json.error}}'
          }
        }
      });
    }

    // 4. Calculer métriques
    const estimatedCost = nodes.length * 0.02; // $0.02 per node execution
    const reliability = Math.max(0.85, 1 - (nodes.length * 0.02));

    return {
      nodes,
      edges,
      description: generateDescription(prompt, nodes.length),
      estimatedCost,
      reliability
    };
  };

  const getTriggerLabel = (type: string) => {
    const labels = {
      manualTrigger: 'Manual Start',
      schedule: 'Scheduled Trigger',
      webhook: 'Webhook Trigger',
      emailTrigger: 'Email Trigger',
      rssFeed: 'RSS Feed'
    };
    return labels[type] || 'Trigger';
  };

  const getTriggerConfig = (type: string, prompt: string) => {
    switch (type) {
      case 'schedule':
        return { cron: '0 9 * * *', timezone: 'UTC' };
      case 'webhook':
        return { method: 'POST', path: '/webhook/ai-generated' };
      case 'emailTrigger':
        return { folder: 'INBOX', markAsRead: true };
      case 'rssFeed':
        return { feedUrl: 'https://example.com/feed.xml' };
      default:
        return {};
    }
  };

  const determineProcessingNodes = (prompt: string, preferredServices: string[]) => {
    const promptLower = prompt.toLowerCase();
    const nodes: any[] = [];

    // Détection de services mentionnés
    if (promptLower.includes('openai') || promptLower.includes('gpt') || promptLower.includes('ia') || promptLower.includes('résumé')) {
      nodes.push({
        type: 'openai',
        label: 'AI Processing',
        config: {
          model: 'gpt-3.5-turbo',
          prompt: 'Analyze and summarize: {{$json.content}}'
        }
      });
    }

    if (promptLower.includes('transform') || promptLower.includes('format') || promptLower.includes('parse')) {
      nodes.push({
        type: 'transform',
        label: 'Data Transform',
        config: {
          code: 'return { processed: true, data: $json };'
        }
      });
    }

    if (promptLower.includes('slack')) {
      nodes.push({
        type: 'slack',
        label: 'Send to Slack',
        config: {
          channel: '#general',
          message: 'Automated message: {{$json.result}}'
        }
      });
    }

    if (promptLower.includes('email') || promptLower.includes('gmail')) {
      nodes.push({
        type: 'email',
        label: 'Send Email',
        config: {
          to: '{{$json.email}}',
          subject: 'Automated workflow notification',
          body: 'Content: {{$json.content}}'
        }
      });
    }

    if (promptLower.includes('database') || promptLower.includes('mysql') || promptLower.includes('postgres')) {
      nodes.push({
        type: 'mysql',
        label: 'Save to Database',
        config: {
          operation: 'insert',
          table: 'workflow_data',
          data: '{{$json}}'
        }
      });
    }

    if (promptLower.includes('github')) {
      nodes.push({
        type: 'github',
        label: 'GitHub Action',
        config: {
          action: 'create_issue',
          repository: 'owner/repo'
        }
      });
    }

    // Si aucun service détecté, ajouter des nœuds génériques
    if (nodes.length === 0) {
      nodes.push({
        type: 'httpRequest',
        label: 'HTTP Request',
        config: {
          method: 'POST',
          url: 'https://api.example.com/process'
        }
      });
    }

    return nodes;
  };

  const generateDescription = (prompt: string, nodeCount: number) => {
    return `Workflow généré automatiquement à partir de: "${prompt}". ` +
           `Contient ${nodeCount} nœuds avec gestion d'erreurs intégrée.`;
  };

  return (
    <>
      {/* AI Generator Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed top-32 left-4 z-40 px-4 py-2 rounded-lg ${
          darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-500 hover:bg-purple-600'
        } text-white shadow-lg flex items-center space-x-2 transition-all hover:scale-105`}
      >
        <Sparkles size={16} />
        <span>Generate with AI</span>
      </button>

      {/* AI Generation Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Wand2 className="text-purple-500" size={24} />
                <h2 className="text-xl font-bold">AI Workflow Generator</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {!generatedWorkflow ? (
              <div className="space-y-6">
                {/* Prompt Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Décrivez votre workflow en quelques mots
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ex: Créer un workflow de veille Twitter → résumé IA → Slack"
                    className={`w-full px-3 py-2 border rounded-md h-20 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                  />
                </div>

                {/* Quick Examples */}
                <div>
                  <label className="block text-sm font-medium mb-2">Exemples rapides</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {promptExamples.map((example, index) => (
                      <button
                        key={index}
                        onClick={() => setPrompt(example)}
                        className={`p-2 text-left text-sm rounded border ${
                          darkMode 
                            ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-700' 
                            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                        } transition-colors`}
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Complexité</label>
                    <select
                      value={complexity}
                      onChange={(e) => setComplexity(e.target.value as any)}
                      className={`w-full px-3 py-2 border rounded-md ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <option value="simple">Simple (3-5 nœuds)</option>
                      <option value="medium">Moyen (5-10 nœuds)</option>
                      <option value="complex">Complexe (10+ nœuds)</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 mt-7">
                      <input
                        type="checkbox"
                        checked={includeErrorHandling}
                        onChange={(e) => setIncludeErrorHandling(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Gestion d'erreurs</span>
                    </label>
                  </div>
                </div>

                {/* Preferred Services */}
                <div>
                  <label className="block text-sm font-medium mb-2">Services préférés (optionnel)</label>
                  <div className="flex flex-wrap gap-2">
                    {popularServices.map(service => (
                      <button
                        key={service}
                        onClick={() => {
                          setSelectedServices(prev => 
                            prev.includes(service) 
                              ? prev.filter(s => s !== service)
                              : [...prev, service]
                          );
                        }}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                          selectedServices.includes(service)
                            ? 'bg-purple-500 text-white border-purple-500'
                            : darkMode 
                              ? 'border-gray-600 hover:border-gray-500'
                              : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {service}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={generateWorkflow}
                  disabled={!prompt.trim() || isGenerating}
                  className="w-full bg-purple-500 text-white py-3 rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Génération en cours...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Générer le workflow</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Generated Workflow Preview */
              <div className="space-y-6">
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle2 size={20} />
                  <span className="font-medium">Workflow généré avec succès !</span>
                </div>

                {/* Description */}
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-sm">{generatedWorkflow.description}</p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">{generatedWorkflow.nodes.length}</div>
                    <div className="text-sm text-gray-500">Nœuds</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">${generatedWorkflow.estimatedCost.toFixed(3)}</div>
                    <div className="text-sm text-gray-500">Coût/exécution</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-500">{(generatedWorkflow.reliability * 100).toFixed(1)}%</div>
                    <div className="text-sm text-gray-500">Fiabilité</div>
                  </div>
                </div>

                {/* Node List */}
                <div>
                  <h3 className="font-medium mb-3">Nœuds générés</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {generatedWorkflow.nodes.map((node, index) => (
                      <div key={node.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{node.data.label}</div>
                          <div className="text-xs text-gray-500">{node.data.type}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    onClick={applyWorkflow}
                    className="flex-1 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 font-medium"
                  >
                    Appliquer au canvas
                  </button>
                  <button
                    onClick={() => setGeneratedWorkflow(null)}
                    className={`flex-1 py-3 rounded-lg font-medium ${
                      darkMode 
                        ? 'bg-gray-700 hover:bg-gray-600' 
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    Régénérer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}