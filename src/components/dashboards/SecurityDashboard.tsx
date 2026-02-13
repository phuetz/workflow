/**
 * Security Dashboard Component
 * Monitor encryption status, key rotation, and security metrics
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Lock,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Database,
  FileText,
  RefreshCw,
  Bell
} from 'lucide-react';
import { encryptionService } from '../../services/EncryptionService';
import { logger } from '../../services/SimpleLogger';

interface SecurityMetrics {
  encryptionStatus: {
    initialized: boolean;
    keyCount: number;
    rotationDue: number;
    algorithm: string;
    keyRotationEnabled: boolean;
  };
  dataEncryption: {
    credentialsEncrypted: number;
    workflowDataEncrypted: number;
    logsEncrypted: number;
    totalEncryptedItems: number;
  };
  securityEvents: SecurityEvent[];
  threats: SecurityThreat[];
  compliance: ComplianceStatus;
}

interface SecurityEvent {
  id: string;
  type: 'key_rotation' | 'encryption_failure' | 'unauthorized_access' | 'compliance_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: Record<string, unknown>;
}

interface SecurityThreat {
  id: string;
  type: 'brute_force' | 'suspicious_activity' | 'key_compromise' | 'data_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedResources: string[];
  mitigationSteps: string[];
  timestamp: Date;
  status: 'active' | 'investigating' | 'mitigated' | 'resolved';
}

interface ComplianceStatus {
  gdpr: { compliant: boolean; issues: string[] };
  hipaa: { compliant: boolean; issues: string[] };
  sox: { compliant: boolean; issues: string[] };
  pci: { compliant: boolean; issues: string[] };
  iso27001: { compliant: boolean; issues: string[] };
}

const SecurityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotatingKeys, setRotatingKeys] = useState(false);

  useEffect(() => {
    loadSecurityMetrics();
  }, []);

  const loadSecurityMetrics = async () => {
    try {
      setLoading(true);
      
      // Mock security metrics - in production, fetch from security service
      const mockMetrics: SecurityMetrics = {
        encryptionStatus: {
          initialized: true, // encryptionService initialized status
          keyCount: 3,
          rotationDue: 14,
          algorithm: 'AES-256-GCM',
          keyRotationEnabled: true
        },
        dataEncryption: {
          credentialsEncrypted: 245,
          workflowDataEncrypted: 1892,
          logsEncrypted: 5234,
          totalEncryptedItems: 7371
        },
        securityEvents: [
          {
            id: 'evt-1',
            type: 'key_rotation',
            severity: 'low',
            message: 'Successful key rotation completed',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            resolved: true
          },
          {
            id: 'evt-2',
            type: 'encryption_failure',
            severity: 'high',
            message: 'Encryption failed for workflow data - key not found',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
            resolved: false
          }
        ],
        threats: [
          {
            id: 'threat-1',
            type: 'suspicious_activity',
            severity: 'medium',
            description: 'Multiple failed authentication attempts detected',
            affectedResources: ['API Gateway', 'User Service'],
            mitigationSteps: ['Enable rate limiting', 'Review access logs'],
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            status: 'investigating'
          }
        ],
        compliance: {
          gdpr: { compliant: true, issues: [] },
          hipaa: { compliant: false, issues: ['Data retention policy not configured'] },
          sox: { compliant: true, issues: [] },
          pci: { compliant: false, issues: ['Encryption key rotation not automated'] },
          iso27001: { compliant: true, issues: [] }
        }
      };

      setMetrics(mockMetrics);
    } catch (error) {
      logger.error('Failed to load security metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const rotateEncryptionKeys = async () => {
    try {
      setRotatingKeys(true);
      await encryptionService.forceKeyRotation();
      await loadSecurityMetrics();
    } catch (error) {
      logger.error('Key rotation failed:', error);
    } finally {
      setRotatingKeys(false);
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-800 bg-red-100 border-red-200';
      case 'high': return 'text-orange-800 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-800 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-800 bg-green-100 border-green-200';
      default: return 'text-gray-800 bg-gray-100 border-gray-200';
    }
  };

  const getComplianceClass = (compliant: boolean) => {
    return compliant ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100';
  };

  if (!metrics) return null;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600">Loading security metrics...</p>
        </div>
      </div>
    );
  }

  const criticalEvents = metrics.securityEvents.filter(e => 
    e.severity === 'critical' || e.severity === 'high'
  ).length;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="w-6 h-6 text-gray-700 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Security Dashboard</h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={rotateEncryptionKeys}
              disabled={rotatingKeys}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${rotatingKeys ? 'animate-spin' : ''}`} />
              <span>Rotate Keys</span>
            </button>
            <button
              onClick={loadSecurityMetrics}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Encryption Status</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.encryptionStatus.initialized ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Key className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Keys</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.encryptionStatus.keyCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Lock className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Encrypted Items</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.dataEncryption.totalEncryptedItems}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className={`p-3 ${criticalEvents > 0 ? 'bg-red-100' : 'bg-blue-100'} rounded-lg`}>
                  <Bell className={`w-6 h-6 ${criticalEvents > 0 ? 'text-red-600' : 'text-blue-600'}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Security Events</p>
                  <p className="text-2xl font-bold text-gray-900">{criticalEvents}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Encryption Stats */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Encryption Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Credentials</p>
                  <p className="text-xl font-semibold text-gray-900">{metrics.dataEncryption.credentialsEncrypted}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Database className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Workflow Data</p>
                  <p className="text-xl font-semibold text-gray-900">{metrics.dataEncryption.workflowDataEncrypted}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Audit Logs</p>
                  <p className="text-xl font-semibold text-gray-900">{metrics.dataEncryption.logsEncrypted}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Events */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Security Events</h3>
            <div className="space-y-3">
              {metrics.securityEvents.map(event => (
                <div key={event.id} className={`p-3 border rounded-lg ${getSeverityClass(event.severity)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {event.resolved ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                      <div>
                        <p className="font-medium">{event.message}</p>
                        <p className="text-sm opacity-75">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full uppercase ${
                      event.resolved ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                    }`}>
                      {event.resolved ? 'Resolved' : 'Active'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance Status */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(metrics.compliance).map(([standard, status]) => (
                <div key={standard} className="text-center">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${getComplianceClass(status.compliant)}`}>
                    {status.compliant ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <AlertTriangle className="w-6 h-6" />
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-900">{standard.toUpperCase()}</p>
                  {status.issues.length > 0 && (
                    <p className="text-xs text-red-600 mt-1">{status.issues.length} issues</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;