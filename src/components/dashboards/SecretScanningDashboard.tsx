/**
 * Secret Scanning Dashboard
 *
 * Comprehensive dashboard for viewing and managing secret scanning results
 * Features:
 * - Real-time scan results display
 * - Statistics and trends
 * - Secret detection history
 * - Remediation tracking
 * - Export capabilities
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingDown,
  TrendingUp,
  Download,
  RefreshCw,
  Search,
  Filter,
  Shield,
  FileText,
  Activity
} from 'lucide-react';
import { useToast } from '../ui/Toast';
import { logger } from '../../services/SimpleLogger';

interface SecretMatch {
  id: string;
  file: string;
  line: number;
  column?: number;
  patternName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  category: string;
  match: string;
  detectedAt: string;
  status: 'open' | 'resolved' | 'false-positive' | 'accepted-risk';
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
}

interface ScanResult {
  id: string;
  timestamp: string;
  scannedFiles: number;
  matchesFound: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  duration: number;
  trigger: 'manual' | 'commit' | 'pr' | 'scheduled' | 'ci';
  passed: boolean;
}

interface DashboardStats {
  totalScans: number;
  totalSecretsFound: number;
  activeSecrets: number;
  resolvedSecrets: number;
  falsePositives: number;
  averageScanTime: number;
  lastScanTime: string;
  scanPassRate: number;
}

export const SecretScanningDashboard: React.FC = () => {
  const toast = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [activeSecrets, setActiveSecrets] = useState<SecretMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSecret, setSelectedSecret] = useState<SecretMatch | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load dashboard data from API
      const [statsRes, scansRes, secretsRes] = await Promise.all([
        fetch('/api/security/secret-scanning/stats'),
        fetch('/api/security/secret-scanning/recent-scans'),
        fetch('/api/security/secret-scanning/active-secrets')
      ]);

      setStats(await statsRes.json());
      setRecentScans(await scansRes.json());
      setActiveSecrets(await secretsRes.json());
    } catch (error) {
      logger.error('Failed to load dashboard data', { error });
    } finally {
      setLoading(false);
    }
  };

  const runManualScan = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/security/secret-scanning/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'manual' })
      });
      const result = await response.json();
      await loadDashboardData();
      toast.success(`Scan completed: ${result.matchesFound} secrets found`);
    } catch (error) {
      logger.error('Failed to run scan', { error });
      toast.error('Scan failed. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const updateSecretStatus = async (secretId: string, status: string, notes?: string) => {
    try {
      await fetch(`/api/security/secret-scanning/secrets/${secretId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      });
      await loadDashboardData();
    } catch (error) {
      logger.error('Failed to update secret status', { error });
    }
  };

  const exportReport = async (format: 'json' | 'csv' | 'pdf') => {
    try {
      const response = await fetch(`/api/security/secret-scanning/export?format=${format}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `secret-scan-report-${Date.now()}.${format}`;
      a.click();
    } catch (error) {
      logger.error('Failed to export report', { error });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <XCircle className="w-5 h-5" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const filteredSecrets = activeSecrets.filter(secret => {
    if (filterSeverity !== 'all' && secret.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && secret.status !== filterStatus) return false;
    if (searchQuery && !secret.file.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !secret.patternName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            Secret Scanning Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Monitor and manage exposed secrets in your codebase</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => exportReport('json')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={runManualScan}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Run Scan
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-gray-600">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">Total Scans</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats?.totalScans || 0}</div>
          <div className="text-sm text-gray-500 mt-1">
            {stats?.scanPassRate?.toFixed(1)}% pass rate
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Active Secrets</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-red-600">{stats?.activeSecrets || 0}</div>
          <div className="text-sm text-gray-500 mt-1">
            Require immediate action
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Resolved</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-green-600">{stats?.resolvedSecrets || 0}</div>
          <div className="text-sm text-gray-500 mt-1">
            {stats?.falsePositives || 0} false positives
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Last Scan</span>
            </div>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {stats?.lastScanTime ? new Date(stats.lastScanTime).toLocaleString() : 'Never'}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Avg: {stats?.averageScanTime?.toFixed(1)}s
          </div>
        </div>
      </div>

      {/* Recent Scans */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Recent Scans
        </h2>
        <div className="space-y-3">
          {recentScans.slice(0, 5).map(scan => (
            <div key={scan.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                {scan.passed ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
                <div>
                  <div className="font-medium text-gray-900">
                    {new Date(scan.timestamp).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    {scan.scannedFiles} files • {scan.duration}s • {scan.trigger}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {scan.criticalIssues > 0 && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                    {scan.criticalIssues} critical
                  </span>
                )}
                {scan.highIssues > 0 && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                    {scan.highIssues} high
                  </span>
                )}
                {scan.matchesFound === 0 && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    No secrets found
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Secrets */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Active Secrets ({filteredSecrets.length})
          </h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="false-positive">False Positive</option>
              <option value="accepted-risk">Accepted Risk</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredSecrets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">No active secrets found</p>
              <p className="text-sm">Your codebase is clean!</p>
            </div>
          ) : (
            filteredSecrets.map(secret => (
              <div
                key={secret.id}
                className={`p-4 rounded-lg border-2 ${getSeverityColor(secret.severity)} cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => setSelectedSecret(secret)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={getSeverityColor(secret.severity)}>
                      {getSeverityIcon(secret.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-1">
                        {secret.patternName}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {secret.file}:{secret.line}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className={`px-2 py-1 rounded-full ${getSeverityColor(secret.severity)}`}>
                          {secret.severity}
                        </span>
                        <span className="text-gray-500">{secret.category}</span>
                        <span className="text-gray-500">{secret.confidence} confidence</span>
                        <span className="text-gray-500">
                          {new Date(secret.detectedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateSecretStatus(secret.id, 'resolved');
                      }}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateSecretStatus(secret.id, 'false-positive');
                      }}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                    >
                      False Positive
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Secret Details Modal */}
      {selectedSecret && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedSecret(null)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4">Secret Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Pattern</label>
                <div className="text-gray-900">{selectedSecret.patternName}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Location</label>
                <div className="text-gray-900">{selectedSecret.file}:{selectedSecret.line}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Severity</label>
                <div className={`inline-block px-3 py-1 rounded ${getSeverityColor(selectedSecret.severity)}`}>
                  {selectedSecret.severity.toUpperCase()}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Category</label>
                <div className="text-gray-900">{selectedSecret.category}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Match Preview</label>
                <div className="bg-gray-100 p-3 rounded font-mono text-sm break-all">
                  {selectedSecret.match}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedSecret(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecretScanningDashboard;
