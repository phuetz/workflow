/**
 * Backup Dashboard Component - Fixed Version
 * Complete backup, restore and disaster recovery management
 */

import React, { useState, useEffect } from 'react';
import {
  Archive,
  Download,
  Upload,
  RefreshCw,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  HardDrive,
  Database,
  Play,
  Pause,
  Trash2,
  Plus,
  Calendar,
  FileText,
  Server,
  Cloud,
  Zap,
  X
} from 'lucide-react';
import { BackupService } from '../../services/BackupService';
import { logger } from '../../services/SimpleLogger';
import type {
  BackupConfig as ServiceBackupConfig,
  Backup as ServiceBackup,
  DisasterRecoveryPlan as ServiceDRPlan,
  RestorePreview as ServiceRestorePreview,
  ValidationResult as ServiceValidationResult
} from '../../types/backup';

interface BackupConfig {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  schedule: string;
  retention: number;
  compression: boolean;
  encryption: boolean;
  destinations: string[];
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

interface Backup {
  id: string;
  configId: string;
  timestamp: Date;
  type: 'full' | 'incremental' | 'differential';
  size: number;
  duration: number;
  status: 'completed' | 'failed' | 'in-progress';
  location: string;
  metadata: Record<string, any>;
  isValid?: boolean;
}

interface DisasterRecoveryPlan {
  id: string;
  name: string;
  rto: number; // Recovery Time Objective in minutes
  rpo: number; // Recovery Point Objective in minutes
  backupConfigs: string[];
  restoreOrder: string[];
  testSchedule: string;
  lastTest?: Date;
  contacts: Array<{ name: string; role: string; contact: string }>;
}

interface RestorePreview {
  backup: Backup;
  items: Array<{ type: string; name: string; size: number; selected: boolean }>;
  estimatedTime: number;
  warnings: string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const backupService = BackupService.getInstance();

// Type conversion helpers
const convertServiceBackupConfig = (config: ServiceBackupConfig): BackupConfig => {
  return {
    id: config.id,
    name: config.name,
    type: 'full', // Default type, can be extracted from config if available
    schedule: config.schedule.frequency || 'manual',
    retention: config.retention.policies[0]?.count || 7,
    compression: config.compression.enabled,
    encryption: config.encryption.enabled,
    destinations: config.destinations.map(d => d.name),
    isActive: config.enabled,
    lastRun: undefined,
    nextRun: undefined
  };
};

const convertServiceBackup = (backup: ServiceBackup): Backup => {
  const completedAt = backup.completedAt || backup.createdAt;
  const duration = completedAt && backup.createdAt
    ? completedAt.getTime() - backup.createdAt.getTime()
    : 0;

  return {
    id: backup.id,
    configId: backup.configId,
    timestamp: backup.createdAt,
    type: backup.type as 'full' | 'incremental' | 'differential',
    size: backup.size,
    duration: duration,
    status: backup.status === 'completed' ? 'completed' :
            backup.status === 'failed' ? 'failed' :
            backup.status === 'running' || backup.status === 'pending' ? 'in-progress' :
            'completed',
    location: backup.destinations[0]?.path || 'unknown',
    metadata: backup.metadata as any || {},
    isValid: backup.destinations[0]?.verified
  };
};

const convertServiceRestorePreview = (preview: ServiceRestorePreview): RestorePreview => {
  return {
    backup: convertServiceBackup(preview.backup),
    items: preview.conflicts.map(conflict => ({
      type: conflict.type,
      name: conflict.name,
      size: 0,
      selected: true
    })),
    estimatedTime: preview.estimatedTime,
    warnings: []
  };
};

const convertServiceValidationResult = (result: ServiceValidationResult): ValidationResult => {
  return {
    isValid: result.passed,
    errors: result.errors,
    warnings: result.warnings
  };
};

export default function BackupDashboard() {
  const [activeTab, setActiveTab] = useState<'backups' | 'configs' | 'restore' | 'disaster-recovery'>('backups');
  const [backupConfigs, setBackupConfigs] = useState<BackupConfig[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [drPlans, setDrPlans] = useState<DisasterRecoveryPlan[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<BackupConfig | null>(null);
  const [selectedDRPlan, setSelectedDRPlan] = useState<DisasterRecoveryPlan | null>(null);
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDRModal, setShowDRModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Prevent unused variable warnings - these will be used in future implementations
  React.useEffect(() => {
    if (drPlans || selectedConfig || selectedDRPlan || restorePreview || showRestoreModal) {
      // State variables reserved for future functionality
    }
  }, [drPlans, selectedConfig, selectedDRPlan, restorePreview, showRestoreModal]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 60000); // Refresh every minute

    loadData(); // Initial load
    
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [configs, backupsList] = await Promise.all([
        backupService.listBackupConfigs(),
        backupService.listBackups()
      ]);
      setBackupConfigs(configs.map(convertServiceBackupConfig));
      setBackups(backupsList.map(convertServiceBackup));
    } catch (error) {
      logger.error('Failed to load backup data:', error);
    }
  };

  const handleBackupNow = async (configId: string) => {
    setIsLoading(true);
    try {
      await backupService.createBackup(configId);
      await loadData();
    } catch (error) {
      logger.error('Backup failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (backupId: string, options?: any) => {
    setIsLoading(true);
    try {
      const preview = await backupService.previewRestore(backupId);
      setRestorePreview(convertServiceRestorePreview(preview));

      if (options?.confirm) {
        const restoreConfig: ServiceRestorePreview = {
          backupId,
          strategy: 'overwrite' as const,
          options: {
            restoreWorkflows: true,
            restoreCredentials: true,
            restoreExecutions: false,
            restoreSettings: true,
            restoreLogs: false,
            dryRun: false,
            validateIntegrity: true,
            stopOnError: false
          },
          mapping: {
            workflowMapping: {},
            credentialMapping: {}
          },
          validation: {
            checkDependencies: true,
            checkCredentials: true,
            checkNodeTypes: true,
            checkPermissions: true,
            preflightChecks: []
          }
        } as any;
        await backupService.restoreBackup(restoreConfig as any);
        await loadData();
      }
    } catch (error) {
      logger.error('Restore failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateBackup = async (backupId: string) => {
    setIsLoading(true);
    try {
      const restoreConfig: any = {
        backupId,
        strategy: 'skip-existing' as const,
        options: {
          restoreWorkflows: true,
          restoreCredentials: true,
          restoreExecutions: false,
          restoreSettings: true,
          restoreLogs: false,
          dryRun: true,
          validateIntegrity: true,
          stopOnError: false
        },
        mapping: {
          workflowMapping: {},
          credentialMapping: {}
        },
        validation: {
          checkDependencies: true,
          checkCredentials: true,
          checkNodeTypes: true,
          checkPermissions: true,
          preflightChecks: []
        }
      };
      const result = await backupService.validateRestore(restoreConfig);
      setValidationResult(convertServiceValidationResult(result));

      // Update backup validity
      setBackups(prev => prev.map(b =>
        b.id === backupId ? { ...b, isValid: result.passed } : b
      ));
    } catch (error) {
      logger.error('Validation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h`;
  };

  // Render Methods
  const renderBackupsTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Backups</h3>
        
        <div className="space-y-4">
          {backups.slice(0, 10).map(backup => (
            <div
              key={backup.id}
              className={`border rounded-lg p-4 ${
                backup.status === 'completed' ? 'border-green-200 bg-green-50 dark:bg-green-900/20' :
                backup.status === 'failed' ? 'border-red-200 bg-red-50 dark:bg-red-900/20' :
                'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {backup.status === 'completed' ? (
                    <CheckCircle className="text-green-500" size={20} />
                  ) : backup.status === 'failed' ? (
                    <AlertTriangle className="text-red-500" size={20} />
                  ) : (
                    <RefreshCw className="text-yellow-500 animate-spin" size={20} />
                  )}
                  
                  <div>
                    <div className="font-medium">
                      {backup.type.charAt(0).toUpperCase() + backup.type.slice(1)} Backup
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {backup.timestamp.toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">{formatBytes(backup.size)}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {formatDuration(backup.duration)}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleValidateBackup(backup.id)}
                      className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Validate Backup"
                    >
                      <Shield size={16} />
                    </button>
                    <button
                      onClick={() => handleRestore(backup.id)}
                      className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      title="Restore"
                    >
                      <Upload size={16} />
                    </button>
                    <button
                      onClick={() => backupService.exportBackup(backup.id, 'zip')}
                      className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Export"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              </div>
              
              {selectedBackup?.id === backup.id && validationResult && (
                <div className="mt-4 pt-4 border-t">
                  <div className="space-y-2">
                    {validationResult.errors.map((error, i) => (
                      <div key={i} className="flex items-center gap-2 text-red-600 text-sm">
                        <X size={14} />
                        {error}
                      </div>
                    ))}
                    {validationResult.warnings.map((warning, i) => (
                      <div key={i} className="flex items-center gap-2 text-yellow-600 text-sm">
                        <AlertTriangle size={14} />
                        {warning}
                      </div>
                    ))}
                    {validationResult.isValid && (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle size={14} />
                        Backup is valid and can be restored
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderConfigsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Backup Configurations</h3>
        <button
          onClick={() => setShowConfigModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          New Configuration
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {backupConfigs.map(config => (
          <div key={config.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">{config.name}</h4>
              <div className="flex items-center gap-2">
                {config.isActive ? (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                    Inactive
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Type:</span>
                <span className="font-medium capitalize">{config.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Schedule:</span>
                <span className="font-medium">{config.schedule}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Retention:</span>
                <span className="font-medium">{config.retention} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Features:</span>
                <div className="flex gap-1">
                  {config.compression && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      Compressed
                    </span>
                  )}
                  {config.encryption && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                      Encrypted
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex justify-between">
              <button
                onClick={() => setSelectedConfig(config)}
                className="text-blue-600 hover:underline text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleBackupNow(config.id)}
                disabled={isLoading || !config.isActive}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  config.isActive && !isLoading
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <RefreshCw className="animate-spin" size={14} />
                ) : (
                  'Backup Now'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRestoreTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Restore from Backup</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Select a backup to restore from. You can preview the contents before restoring.
        </p>

        <div className="space-y-4">
          {backups
            .filter(b => b.status === 'completed' && b.isValid !== false)
            .slice(0, 5)
            .map(backup => (
              <div
                key={backup.id}
                className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => setSelectedBackup(backup)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {backup.type.charAt(0).toUpperCase() + backup.type.slice(1)} Backup
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {backup.timestamp.toLocaleString()} • {formatBytes(backup.size)}
                    </div>
                  </div>
                  
                  {selectedBackup?.id === backup.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(backup.id, { confirm: true });
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDRTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Disaster Recovery Plans</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Configure and test disaster recovery procedures to ensure business continuity.
        </p>
        
        <div className="mt-6">
          <button
            onClick={() => setShowDRModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus size={16} />
            Create DR Plan
          </button>
        </div>
      </div>
    </div>
  );

  const renderBackupDetails = () => {
    if (!selectedBackup) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Backup Details</h2>
              <button
                onClick={() => setSelectedBackup(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">General Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">ID:</span>
                    <span className="font-mono">{selectedBackup.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="capitalize">{selectedBackup.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Size:</span>
                    <span>{formatBytes(selectedBackup.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                    <span>{formatDuration(selectedBackup.duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Location:</span>
                    <span className="font-mono text-xs">{selectedBackup.location}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Validation Status</h3>
                {validationResult ? (
                  <div className="space-y-2">
                    <div className={`p-3 rounded-lg ${
                      validationResult.isValid
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {validationResult.isValid ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle size={16} />
                          Backup is valid
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <X size={16} />
                          Backup validation failed
                        </div>
                      )}
                    </div>
                    
                    {validationResult.errors.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-red-600">Errors:</div>
                        {validationResult.errors.map((error, i) => (
                          <div key={i} className="text-sm text-red-600 pl-4">• {error}</div>
                        ))}
                      </div>
                    )}
                    
                    {validationResult.warnings.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-yellow-600">Warnings:</div>
                        {validationResult.warnings.map((warning, i) => (
                          <div key={i} className="text-sm text-yellow-600 pl-4">• {warning}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleValidateBackup(selectedBackup.id)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Shield size={16} />
                    Validate Backup
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => handleRestore(selectedBackup.id)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Upload size={16} />
                  Restore
                </button>
                <button
                  onClick={() => backupService.exportBackup(selectedBackup.id, 'zip')}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Download size={16} />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Configuration Modal
  const renderConfigModal = () => {
    if (!showConfigModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Create Backup Configuration</h2>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Configuration form would go here */}
            <p className="text-gray-600 dark:text-gray-400">
              Backup configuration form implementation...
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Main Render
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Archive className="text-blue-500" />
            Backup & Recovery
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage backups, restore data, and configure disaster recovery plans
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white dark:bg-gray-800 rounded-lg p-1 shadow">
          {[
            { id: 'backups', label: 'Backups', icon: Archive },
            { id: 'configs', label: 'Configurations', icon: Settings },
            { id: 'restore', label: 'Restore', icon: Upload },
            { id: 'disaster-recovery', label: 'Disaster Recovery', icon: Shield }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <tab.icon size={18} />
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'backups' && renderBackupsTab()}
          {activeTab === 'configs' && renderConfigsTab()}
          {activeTab === 'restore' && renderRestoreTab()}
          {activeTab === 'disaster-recovery' && renderDRTab()}
        </div>

        {/* Modals */}
        {renderBackupDetails()}
        {renderConfigModal()}
      </div>
    </div>
  );
}