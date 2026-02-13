/**
 * Evaluation Builder
 * UI for creating and configuring evaluations
 */

import React, { useState } from 'react';
import type { Evaluation, EvaluationInput, MetricConfig, MetricType } from '../../types/evaluation';

interface EvaluationBuilderProps {
  workflowId: string;
  existingEvaluation?: Evaluation;
  onSave?: (evaluation: Evaluation) => void;
  onCancel?: () => void;
}

const METRIC_TYPES: Array<{ type: MetricType; name: string; description: string }> = [
  { type: 'correctness', name: 'Correctness', description: 'LLM-based correctness evaluation' },
  { type: 'toxicity', name: 'Toxicity', description: 'Detect harmful content' },
  { type: 'bias', name: 'Bias', description: 'Detect demographic bias' },
  { type: 'toolCalling', name: 'Tool Calling', description: 'Validate tool/function calls' },
  { type: 'latency', name: 'Latency', description: 'Measure response time' },
  { type: 'cost', name: 'Cost', description: 'Track LLM costs' },
];

export const EvaluationBuilder: React.FC<EvaluationBuilderProps> = ({
  workflowId,
  existingEvaluation,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(existingEvaluation?.name || '');
  const [description, setDescription] = useState(existingEvaluation?.description || '');
  const [selectedMetrics, setSelectedMetrics] = useState<MetricType[]>(
    existingEvaluation?.metrics.map((m) => m.type) || []
  );
  const [inputs, setInputs] = useState<EvaluationInput[]>(existingEvaluation?.inputs || []);
  const [currentStep, setCurrentStep] = useState(1);

  const handleAddMetric = (metricType: MetricType) => {
    if (!selectedMetrics.includes(metricType)) {
      setSelectedMetrics([...selectedMetrics, metricType]);
    }
  };

  const handleRemoveMetric = (metricType: MetricType) => {
    setSelectedMetrics(selectedMetrics.filter((m) => m !== metricType));
  };

  const handleAddInput = () => {
    const newInput: EvaluationInput = {
      id: `input-${Date.now()}`,
      name: `Test Input ${inputs.length + 1}`,
      data: {},
    };
    setInputs([...inputs, newInput]);
  };

  const handleRemoveInput = (id: string) => {
    setInputs(inputs.filter((i) => i.id !== id));
  };

  const handleSave = () => {
    const evaluation: Evaluation = {
      id: existingEvaluation?.id || `eval-${Date.now()}`,
      name,
      description,
      workflowId,
      metrics: selectedMetrics.map((type) => ({
        id: `metric-${type}-${Date.now()}`,
        type,
        name: METRIC_TYPES.find((m) => m.type === type)?.name || type,
        description: METRIC_TYPES.find((m) => m.type === type)?.description || '',
        enabled: true,
        weight: 1,
        threshold: 0.7,
      })),
      inputs,
      createdAt: existingEvaluation?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    if (onSave) {
      onSave(evaluation);
    }
  };

  return (
    <div className="evaluation-builder bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold text-gray-800">
          {existingEvaluation ? 'Edit Evaluation' : 'Create New Evaluation'}
        </h2>
        <p className="text-gray-600 mt-1">Step {currentStep} of 3</p>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Evaluation Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Customer Support Bot Evaluation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe what this evaluation tests..."
              />
            </div>
          </div>
        )}

        {/* Step 2: Select Metrics */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Select Evaluation Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              {METRIC_TYPES.map((metric) => (
                <div
                  key={metric.type}
                  onClick={() =>
                    selectedMetrics.includes(metric.type)
                      ? handleRemoveMetric(metric.type)
                      : handleAddMetric(metric.type)
                  }
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedMetrics.includes(metric.type)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-800">{metric.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{metric.description}</p>
                    </div>
                    {selectedMetrics.includes(metric.type) && (
                      <span className="text-blue-600 text-xl">✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {selectedMetrics.length === 0 && (
              <p className="text-sm text-gray-500">Select at least one metric to continue</p>
            )}
          </div>
        )}

        {/* Step 3: Add Test Inputs */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Test Inputs</h3>
              <button
                onClick={handleAddInput}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Add Input
              </button>
            </div>
            <div className="space-y-3">
              {inputs.map((input, index) => (
                <div key={input.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={input.name}
                        onChange={(e) => {
                          const updated = [...inputs];
                          updated[index].name = e.target.value;
                          setInputs(updated);
                        }}
                        className="w-full font-semibold px-2 py-1 border-b focus:border-blue-500"
                        placeholder="Input name"
                      />
                      <textarea
                        value={JSON.stringify(input.data, null, 2)}
                        onChange={(e) => {
                          try {
                            const updated = [...inputs];
                            updated[index].data = JSON.parse(e.target.value);
                            setInputs(updated);
                          } catch {
                            // Invalid JSON, ignore
                          }
                        }}
                        className="w-full mt-2 px-2 py-1 border rounded text-sm font-mono"
                        rows={4}
                        placeholder='{"key": "value"}'
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveInput(input.id)}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {inputs.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">Add at least one test input to continue</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t flex items-center justify-between">
        <button onClick={onCancel} className="px-6 py-2 text-gray-600 hover:text-gray-800">
          Cancel
        </button>
        <div className="flex gap-2">
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
          )}
          {currentStep < 3 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={currentStep === 1 ? !name : currentStep === 2 ? selectedMetrics.length === 0 : false}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!name || selectedMetrics.length === 0 || inputs.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Evaluation
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvaluationBuilder;
