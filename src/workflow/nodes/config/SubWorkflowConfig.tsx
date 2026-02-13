import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';
import { WorkflowNode } from '../../../types/workflow';
import { SubWorkflowService } from '../../../services/SubWorkflowService';
import type { SubWorkflow } from '../../../types/subworkflows';
import { ArrowRight, Plus, X, Settings, Info } from 'lucide-react';

interface Props {
  node: WorkflowNode;
}

interface InputMapping {
  name: string;
  source: string;
  defaultValue?: unknown;
}

interface OutputMapping {
  name: string;
  target: string;
}

export default function SubWorkflowConfig({ node }: Props) {
  const { updateNode, workflows, darkMode, nodes } = useWorkflowStore();
  const [subWorkflows, setSubWorkflows] = useState<SubWorkflow[]>([]);
  const [selectedSubWorkflow, setSelectedSubWorkflow] = useState<SubWorkflow | null>(null);
  const [inputMappings, setInputMappings] = useState<InputMapping[]>([]);
  const [outputMappings, setOutputMappings] = useState<OutputMapping[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const config = node.data.config || {};
  const subWorkflowService = SubWorkflowService.getInstance();

  // Load available sub-workflows
  useEffect(() => {
    const loadSubWorkflows = async () => {
      const workflows = await subWorkflowService.listSubWorkflows({
        isPublished: true
      });
      setSubWorkflows(workflows);
    };
    loadSubWorkflows();
  }, []);

  // Load selected sub-workflow details
  useEffect(() => {
    const loadSubWorkflow = async () => {
      if (config.workflowId) {
        const workflow = await subWorkflowService.getSubWorkflow(config.workflowId as string);
        setSelectedSubWorkflow(workflow);

        // Initialize mappings if not present
        if (!config.inputMappings && workflow) {
          const defaultInputMappings = workflow.inputs.map(input => ({
            name: input.name,
            source: '',
            defaultValue: input.defaultValue
          }));
          setInputMappings(defaultInputMappings);
        } else {
          setInputMappings((config.inputMappings as InputMapping[]) || []);
        }

        if (!config.outputMappings && workflow) {
          const defaultOutputMappings = workflow.outputs.map(output => ({
            name: output.name,
            target: ''
          }));
          setOutputMappings(defaultOutputMappings);
        } else {
          setOutputMappings((config.outputMappings as OutputMapping[]) || []);
        }
      }
    };
    loadSubWorkflow();
  }, [config.workflowId]);

  const update = (field: string, value: unknown) => {
    updateNode(node.id, { config: { ...config, [field]: value } });
  };

  const handleWorkflowChange = (workflowId: string) => {
    update('workflowId', workflowId);

    // Find and set the selected workflow
    const workflow = subWorkflows.find(w => w.id === workflowId);
    if (workflow) {
      setSelectedSubWorkflow(workflow);
    }
  };

  const updateInputMapping = (index: number, field: keyof InputMapping, value: string) => {
    const newMappings = [...inputMappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setInputMappings(newMappings);
    update('inputMappings', newMappings);
  };

  const updateOutputMapping = (index: number, field: keyof OutputMapping, value: string) => {
    const newMappings = [...outputMappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setOutputMappings(newMappings);
    update('outputMappings', newMappings);
  };

  const getAvailableDataSources = (): string[] => {
    // Get all preceding nodes in the workflow
    const precedingNodeIds = new Set<string>();
    const edges = useWorkflowStore.getState().edges;

    const findPrecedingNodes = (nodeId: string) => {
      edges.forEach(edge => {
        if (edge.target === nodeId && !precedingNodeIds.has(edge.source)) {
          precedingNodeIds.add(edge.source);
          findPrecedingNodes(edge.source);
        }
      });
    };

    findPrecedingNodes(node.id);

    // Generate data source strings
    const sources: string[] = ['{{trigger.data}}'];
    precedingNodeIds.forEach(nodeId => {
      const sourceNode = nodes.find(n => n.id === nodeId);
      if (sourceNode) {
        sources.push(`{{${sourceNode.data.label}.output}}`);
        sources.push(`{{${sourceNode.data.label}.data}}`);
      }
    });

    return sources;
  };

  const inputStyle = darkMode
    ? 'bg-gray-700 border-gray-600 text-white'
    : 'bg-white border-gray-300 text-gray-900';

  const labelStyle = darkMode ? 'text-gray-200' : 'text-gray-700';
  const secondaryTextStyle = darkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className={`w-[480px] p-4 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
      <h3 className="text-lg font-semibold mb-4">Sub-workflow Configuration</h3>

      {/* Workflow Selection */}
      <div className="mb-4">
        <label className={`block text-sm font-medium mb-2 ${labelStyle}`}>
          Select Sub-workflow
        </label>
        <select
          value={config.workflowId as string || ''}
          onChange={(e) => handleWorkflowChange(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg ${inputStyle}`}
        >
          <option value="">-- Select a workflow --</option>
          <optgroup label="Sub-workflows">
            {subWorkflows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name} (v{workflow.version})
              </option>
            ))}
          </optgroup>
          <optgroup label="Main Workflows">
            {Object.entries(workflows).map(([id, wf]: [string, { name?: string; version?: string }]) => (
              <option key={id} value={id}>
                {wf.name || id} {wf.version && `(v${wf.version})`}
              </option>
            ))}
          </optgroup>
        </select>

        {selectedSubWorkflow && (
          <div className={`mt-2 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'} flex items-start gap-2`}>
            <Info className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
            <div className="text-sm">
              <p className={secondaryTextStyle}>{selectedSubWorkflow.description}</p>
              <p className={`mt-1 text-xs ${secondaryTextStyle}`}>
                {selectedSubWorkflow.inputs.length} inputs • {selectedSubWorkflow.outputs.length} outputs
              </p>
            </div>
          </div>
        )}
      </div>

      {selectedSubWorkflow && (
        <>
          {/* Input Mappings */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${labelStyle}`}>
              Input Mapping
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedSubWorkflow.inputs.map((input, index) => (
                <div
                  key={input.name}
                  className={`p-3 rounded-lg border ${darkMode ? 'border-gray-600 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${labelStyle}`}>
                        {input.name}
                      </span>
                      {input.required && (
                        <span className="text-red-500 text-xs">*</span>
                      )}
                      <span className={`text-xs ${secondaryTextStyle}`}>
                        ({input.type})
                      </span>
                    </div>
                  </div>

                  {input.description && (
                    <p className={`text-xs mb-2 ${secondaryTextStyle}`}>
                      {input.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <select
                      value={inputMappings[index]?.source || ''}
                      onChange={(e) => updateInputMapping(index, 'source', e.target.value)}
                      className={`flex-1 px-2 py-1 border rounded text-sm ${inputStyle}`}
                    >
                      <option value="">-- Select data source --</option>
                      {getAvailableDataSources().map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                      <option value="custom">Custom expression...</option>
                    </select>
                    <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-mono">{input.name}</span>
                  </div>

                  {inputMappings[index]?.source === 'custom' && (
                    <input
                      type="text"
                      placeholder="Enter custom expression (e.g., {{node.field}})"
                      value={inputMappings[index]?.defaultValue as string || ''}
                      onChange={(e) => updateInputMapping(index, 'defaultValue', e.target.value)}
                      className={`w-full mt-2 px-2 py-1 border rounded text-sm ${inputStyle}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Output Mappings */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${labelStyle}`}>
              Output Mapping
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedSubWorkflow.outputs.map((output, index) => (
                <div
                  key={output.name}
                  className={`p-3 rounded-lg border ${darkMode ? 'border-gray-600 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${labelStyle}`}>
                        {output.name}
                      </span>
                      <span className={`text-xs ${secondaryTextStyle}`}>
                        ({output.type})
                      </span>
                    </div>
                  </div>

                  {output.description && (
                    <p className={`text-xs mb-2 ${secondaryTextStyle}`}>
                      {output.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">{output.name}</span>
                    <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Target field name"
                      value={outputMappings[index]?.target || ''}
                      onChange={(e) => updateOutputMapping(index, 'target', e.target.value)}
                      className={`flex-1 px-2 py-1 border rounded text-sm ${inputStyle}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="mb-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`flex items-center gap-2 text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
            >
              <Settings className="w-4 h-4" />
              Advanced Settings
            </button>

            {showAdvanced && (
              <div className={`mt-3 p-3 rounded-lg border ${darkMode ? 'border-gray-600 bg-gray-750' : 'border-gray-200 bg-gray-50'} space-y-3`}>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${labelStyle}`}>
                    Timeout (ms)
                  </label>
                  <input
                    type="number"
                    value={(config.timeout as number) || 300000}
                    onChange={(e) => update('timeout', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-lg ${inputStyle}`}
                    min="1000"
                    step="1000"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${labelStyle}`}>
                    Execution Mode
                  </label>
                  <select
                    value={(config.executeInline as string) || 'true'}
                    onChange={(e) => update('executeInline', e.target.value === 'true')}
                    className={`w-full px-3 py-2 border rounded-lg ${inputStyle}`}
                  >
                    <option value="true">Inline (Sequential)</option>
                    <option value="false">Async (Parallel)</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${labelStyle}`}>
                    Isolation Level
                  </label>
                  <select
                    value={(config.isolationLevel as string) || 'isolated'}
                    onChange={(e) => update('isolationLevel', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${inputStyle}`}
                  >
                    <option value="shared">Shared (Same context)</option>
                    <option value="isolated">Isolated (Separate context)</option>
                    <option value="sandboxed">Sandboxed (Fully isolated)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="inheritVariables"
                    checked={(config.inheritVariables as boolean) || false}
                    onChange={(e) => update('inheritVariables', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="inheritVariables" className={`text-sm ${labelStyle}`}>
                    Inherit parent variables
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="waitForCompletion"
                    checked={(config.waitForCompletion as boolean) !== false}
                    onChange={(e) => update('waitForCompletion', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="waitForCompletion" className={`text-sm ${labelStyle}`}>
                    Wait for completion
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enableCaching"
                    checked={(config.enableCaching as boolean) || false}
                    onChange={(e) => update('enableCaching', e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="enableCaching" className={`text-sm ${labelStyle}`}>
                    Enable result caching
                  </label>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Help Text */}
      <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <p className={`text-xs ${secondaryTextStyle}`}>
          <strong>Tip:</strong> Use {"{{nodeName.fieldName}}"} syntax to reference data from previous nodes.
          Input mappings connect parent workflow data to sub-workflow inputs.
        </p>
      </div>
    </div>
  );
}
