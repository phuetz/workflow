/**
 * Data Flow Preview - Visual Data Transformation Display
 * Shows how data flows and transforms through the workflow
 */

import React, { useState } from 'react';
import { ChevronRight, Database, ArrowRight, Filter, ZapOff, AlertTriangle } from 'lucide-react';
import { DataFlowStep } from '../../types/simulation';

interface DataFlowPreviewProps {
  dataFlow: DataFlowStep[];
  onNodeClick?: (nodeId: string) => void;
}

export const DataFlowPreview: React.FC<DataFlowPreviewProps> = ({ dataFlow, onNodeClick }) => {
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [showData, setShowData] = useState(false);

  const formatDataSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const step = selectedStep !== null ? dataFlow[selectedStep] : null;

  return (
    <div className="h-full flex bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Flow List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Data Flow</h2>
          <p className="text-sm text-gray-600 mt-1">{dataFlow.length} steps</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {dataFlow.map((flowStep, index) => (
            <div
              key={index}
              onClick={() => setSelectedStep(index)}
              className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                selectedStep === index ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{flowStep.nodeLabel}</div>
                  <div className="text-xs text-gray-500">{flowStep.nodeType}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex gap-4 text-xs text-gray-600">
                <span>{formatTime(flowStep.estimatedTime)}</span>
                <span>${flowStep.estimatedCost.toFixed(4)}</span>
                <span>{formatDataSize(flowStep.dataSize.output)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details Panel */}
      <div className="flex-1 flex flex-col">
        {!step ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Filter className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a step to view details</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{step.nodeLabel}</h3>
                  <p className="text-sm text-gray-600">{step.nodeType}</p>
                </div>
                <button
                  onClick={() => setShowData(!showData)}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    showData ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {showData ? 'Hide' : 'Show'} Data
                </button>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">Time</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatTime(step.estimatedTime)}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">Cost</div>
                  <div className="text-lg font-bold text-gray-900">
                    ${step.estimatedCost.toFixed(4)}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 mb-1">Data Size</div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatDataSize(step.dataSize.output)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Transformations */}
              {step.transformations.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Transformations
                  </h4>
                  <div className="space-y-2">
                    {step.transformations.map((transform, idx) => (
                      <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="font-medium text-blue-900">{transform.type}</div>
                        <p className="text-sm text-blue-700 mt-1">{transform.description}</p>
                        {transform.requiredFields && transform.requiredFields.length > 0 && (
                          <div className="text-xs text-blue-600 mt-2">
                            Required: {transform.requiredFields.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Preview */}
              {showData && (
                <>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Input Data</h4>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                      <pre className="text-xs">
                        {JSON.stringify(step.inputData, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="flex items-center justify-center text-gray-400">
                    <ArrowRight className="w-6 h-6" />
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Output Data</h4>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                      <pre className="text-xs">
                        {JSON.stringify(step.outputData, null, 2)}
                      </pre>
                    </div>
                  </div>
                </>
              )}

              {/* Data Size Change */}
              {step.dataSize.input !== step.dataSize.output && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="font-medium text-yellow-900">Data Size Changed</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    {formatDataSize(step.dataSize.input)} →{' '}
                    {formatDataSize(step.dataSize.output)}
                    {step.dataSize.output > step.dataSize.input ? (
                      <span className="ml-2 text-red-700">
                        (+
                        {formatDataSize(step.dataSize.output - step.dataSize.input)})
                      </span>
                    ) : (
                      <span className="ml-2 text-green-700">
                        (-
                        {formatDataSize(step.dataSize.input - step.dataSize.output)})
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-2">
                {selectedStep !== null && selectedStep > 0 && (
                  <button
                    onClick={() => setSelectedStep(selectedStep - 1)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Previous Step
                  </button>
                )}
                {selectedStep !== null && selectedStep < dataFlow.length - 1 && (
                  <button
                    onClick={() => setSelectedStep(selectedStep + 1)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Next Step
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
