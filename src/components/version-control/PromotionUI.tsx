/**
 * Promotion UI Component
 * Visual workflow promotion interface with diff viewer and approval workflow
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Check,
  X,
  AlertTriangle,
  Clock,
  GitBranch,
  RefreshCw,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Info,
} from 'lucide-react';
import { getPromotionManager, PromotionRequest, PromotionExecution } from '../../environments/PromotionManager';
import { getPromotionValidator, PromotionValidationReport, ValidationSeverity } from '../../environments/PromotionValidator';
import { getEnvironmentManager, EnhancedEnvironment, EnvironmentStatus } from '../../environments/EnvironmentManager';
import { logger } from '../../services/SimpleLogger';

interface PromotionUIProps {
  workflowId: string;
  onClose: () => void;
}

export const PromotionUI: React.FC<PromotionUIProps> = ({ workflowId, onClose }) => {
  const [environments, setEnvironments] = useState<EnhancedEnvironment[]>([]);
  const [sourceEnvId, setSourceEnvId] = useState<string>('');
  const [targetEnvId, setTargetEnvId] = useState<string>('');
  const [validation, setValidation] = useState<PromotionValidationReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [promotion, setPromotion] = useState<PromotionExecution | null>(null);
  const [requireApproval, setRequireApproval] = useState(true);
  const [runTests, setRunTests] = useState(true);
  const [showDiff, setShowDiff] = useState(false);

  const promotionManager = getPromotionManager();
  const validator = getPromotionValidator();
  const envManager = getEnvironmentManager();

  useEffect(() => {
    loadEnvironments();
  }, []);

  const loadEnvironments = async () => {
    const envs = await envManager.listEnvironments({ status: EnvironmentStatus.ACTIVE });
    setEnvironments(envs);
    if (envs.length > 0) {
      setSourceEnvId(envs[0].id);
      if (envs.length > 1) {
        setTargetEnvId(envs[1].id);
      }
    }
  };

  const handleValidate = async () => {
    if (!sourceEnvId || !targetEnvId) {
      return;
    }

    setIsValidating(true);
    try {
      const result = await validator.validatePromotion({
        workflowId,
        sourceEnvId,
        targetEnvId,
      });
      setValidation(result);
    } catch (error: any) {
      logger.error('Validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handlePromote = async () => {
    if (!validation || !validation.canPromote) {
      return;
    }

    try {
      const request: PromotionRequest = {
        workflowId,
        sourceEnvId,
        targetEnvId,
        requireApproval,
        runTests,
        requestedBy: 'current-user', // In real app, get from auth context
      };

      const result = await promotionManager.requestPromotion(request);
      setPromotion(result);
    } catch (error: any) {
      logger.error('Promotion failed:', error);
    }
  };

  const handleApprove = async () => {
    if (!promotion) return;

    try {
      const updated = await promotionManager.approvePromotion(
        promotion.id,
        'current-user',
        'Current User',
        'Approved via UI'
      );
      setPromotion(updated);
    } catch (error: any) {
      logger.error('Approval failed:', error);
    }
  };

  const handleReject = async () => {
    if (!promotion) return;

    try {
      const updated = await promotionManager.rejectPromotion(
        promotion.id,
        'current-user',
        'Current User',
        'Rejected via UI'
      );
      setPromotion(updated);
    } catch (error: any) {
      logger.error('Rejection failed:', error);
    }
  };

  const handleRollback = async () => {
    if (!promotion) return;

    try {
      await promotionManager.rollback({
        promotionId: promotion.id,
        reason: 'Manual rollback via UI',
        requestedBy: 'current-user',
      });
      // Reload promotion
      const updated = await promotionManager.getPromotion(promotion.id);
      if (updated) {
        setPromotion(updated);
      }
    } catch (error: any) {
      logger.error('Rollback failed:', error);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'failed':
      case 'rolled_back':
        return 'text-red-500';
      case 'in_progress':
        return 'text-blue-500';
      case 'pending':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const getRiskLevelColor = (level: string): string => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Promote Workflow
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Workflow ID: {workflowId}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Environment Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source Environment
              </label>
              <select
                value={sourceEnvId}
                onChange={(e) => setSourceEnvId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name} ({env.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Environment
              </label>
              <select
                value={targetEnvId}
                onChange={(e) => setTargetEnvId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {environments
                  .filter((env) => env.id !== sourceEnvId)
                  .map((env) => (
                    <option key={env.id} value={env.id}>
                      {env.name} ({env.type})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Require approval before promotion
              </span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={runTests}
                onChange={(e) => setRunTests(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Run tests before promotion
              </span>
            </label>
          </div>

          {/* Validation Button */}
          {!validation && (
            <button
              onClick={handleValidate}
              disabled={isValidating || !sourceEnvId || !targetEnvId}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isValidating ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Validating...</span>
                </>
              ) : (
                <>
                  <Eye size={16} />
                  <span>Validate Promotion</span>
                </>
              )}
            </button>
          )}

          {/* Validation Results */}
          {validation && (
            <div className="space-y-4">
              {/* Risk Level */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Risk Level</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Estimated duration: {validation.estimatedDuration}s
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskLevelColor(
                    validation.riskLevel
                  )}`}
                >
                  {validation.riskLevel.toUpperCase()}
                </span>
              </div>

              {/* Errors */}
              {validation.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-red-600 flex items-center space-x-2">
                    <X size={16} />
                    <span>Errors ({validation.errors.length})</span>
                  </h4>
                  <div className="space-y-1">
                    {validation.errors.map((error, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800"
                      >
                        <p className="font-medium">{error.code}</p>
                        <p>{error.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-yellow-600 flex items-center space-x-2">
                    <AlertTriangle size={16} />
                    <span>Warnings ({validation.warnings.length})</span>
                  </h4>
                  <div className="space-y-1">
                    {validation.warnings.map((warning, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800"
                      >
                        <p className="font-medium">{warning.code}</p>
                        <p>{warning.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info */}
              {validation.info.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-blue-600 flex items-center space-x-2">
                    <Info size={16} />
                    <span>Information ({validation.info.length})</span>
                  </h4>
                  <div className="space-y-1">
                    {validation.info.map((info, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800"
                      >
                        <p className="font-medium">{info.code}</p>
                        <p>{info.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {validation.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Recommendations
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    {validation.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Promote Button */}
              {validation.canPromote && !promotion && (
                <button
                  onClick={handlePromote}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center space-x-2"
                >
                  <ArrowRight size={16} />
                  <span>Start Promotion</span>
                </button>
              )}
            </div>
          )}

          {/* Promotion Status */}
          {promotion && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">
                    Promotion Status
                  </h4>
                  <span className={`text-sm font-medium ${getStatusColor(promotion.status)}`}>
                    {promotion.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Promotion ID:</span>
                    <span className="font-mono text-gray-900">{promotion.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="text-gray-900">
                      {new Date(promotion.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {promotion.startedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Started:</span>
                      <span className="text-gray-900">
                        {new Date(promotion.startedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {promotion.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span className="text-gray-900">
                        {new Date(promotion.completedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {promotion.error && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    {promotion.error}
                  </div>
                )}
              </div>

              {/* Approval Actions */}
              {promotion.status === 'pending' && (
                <div className="flex space-x-3">
                  <button
                    onClick={handleApprove}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center space-x-2"
                  >
                    <ThumbsUp size={16} />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center space-x-2"
                  >
                    <ThumbsDown size={16} />
                    <span>Reject</span>
                  </button>
                </div>
              )}

              {/* Rollback Button */}
              {promotion.status === 'completed' && promotion.rollbackAvailable && (
                <button
                  onClick={handleRollback}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center justify-center space-x-2"
                >
                  <RefreshCw size={16} />
                  <span>Rollback</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            {validation && (
              <button
                onClick={() => {
                  setValidation(null);
                  setPromotion(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
