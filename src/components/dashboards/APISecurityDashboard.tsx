/**
 * API Security Dashboard
 *
 * Real-time monitoring dashboard for API security including:
 * - Rate limit violations
 * - DDoS attack detection
 * - Blocked requests
 * - Top consumers
 * - Blacklisted IPs
 * - API key usage
 * - Security metrics
 *
 * @module APISecurityDashboard
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  Ban,
  TrendingUp,
  Activity,
  Key,
  Globe,
  Lock,
  Zap,
} from 'lucide-react';

/**
 * Props
 */
interface APISecurityDashboardProps {
  refreshInterval?: number; // milliseconds
}

/**
 * Security stats
 */
interface SecurityStats {
  rateLimiting: {
    totalRequests: number;
    blockedRequests: number;
    uniqueIPs: number;
    uniqueUsers: number;
    violations: Array<{
      id: string;
      timestamp: Date;
      ip: string;
      userId?: string;
      endpoint: string;
      requestCount: number;
      limit: number;
    }>;
  };
  ddos: {
    totalRequests: number;
    blockedRequests: number;
    uniqueIPs: number;
    suspiciousIPs: number;
    blacklistedIPs: number;
    activeConnections: number;
    detectedAttacks: Array<{
      type: string;
      confidence: number;
      ips: string[];
      requestCount: number;
      startTime: Date;
      mitigated: boolean;
    }>;
  };
  apiKeys: {
    total: number;
    active: number;
    expired: number;
    revoked: number;
  };
}

/**
 * API Security Dashboard Component
 */
export function APISecurityDashboard({ refreshInterval = 5000 }: APISecurityDashboardProps) {
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'rate-limiting' | 'ddos' | 'api-keys'>('overview');

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const fetchStats = async () => {
    try {
      // In production, fetch from actual API endpoints
      // For now, mock data
      const mockStats: SecurityStats = {
        rateLimiting: {
          totalRequests: 125847,
          blockedRequests: 1234,
          uniqueIPs: 3421,
          uniqueUsers: 856,
          violations: [
            {
              id: '1',
              timestamp: new Date(Date.now() - 120000),
              ip: '192.168.1.100',
              endpoint: '/api/v1/workflows',
              requestCount: 150,
              limit: 100,
            },
            {
              id: '2',
              timestamp: new Date(Date.now() - 60000),
              ip: '10.0.0.50',
              userId: 'user-123',
              endpoint: '/api/v1/executions',
              requestCount: 75,
              limit: 50,
            },
          ],
        },
        ddos: {
          totalRequests: 125847,
          blockedRequests: 456,
          uniqueIPs: 3421,
          suspiciousIPs: 12,
          blacklistedIPs: 5,
          activeConnections: 234,
          detectedAttacks: [
            {
              type: 'burst',
              confidence: 0.85,
              ips: ['192.168.1.100', '192.168.1.101'],
              requestCount: 5000,
              startTime: new Date(Date.now() - 300000),
              mitigated: true,
            },
          ],
        },
        apiKeys: {
          total: 45,
          active: 38,
          expired: 5,
          revoked: 2,
        },
      };

      setStats(mockStats);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch security stats');
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading security dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-red-500" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-500" />
            API Security Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Real-time monitoring and protection status</p>
        </div>

        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-500 animate-pulse" />
          <span className="text-sm text-gray-600">Live</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setSelectedTab('overview')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            selectedTab === 'overview'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setSelectedTab('rate-limiting')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            selectedTab === 'rate-limiting'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Rate Limiting
        </button>
        <button
          onClick={() => setSelectedTab('ddos')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            selectedTab === 'ddos'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          DDoS Protection
        </button>
        <button
          onClick={() => setSelectedTab('api-keys')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            selectedTab === 'api-keys'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          API Keys
        </button>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Requests"
            value={stats.rateLimiting.totalRequests.toLocaleString()}
            icon={<TrendingUp className="w-5 h-5" />}
            trend="+12.5%"
            trendUp={true}
          />

          <MetricCard
            title="Blocked Requests"
            value={stats.rateLimiting.blockedRequests.toLocaleString()}
            icon={<Ban className="w-5 h-5" />}
            trend="-5.2%"
            trendUp={false}
            valueColor="text-red-600"
          />

          <MetricCard
            title="Active Connections"
            value={stats.ddos.activeConnections.toLocaleString()}
            icon={<Globe className="w-5 h-5" />}
            valueColor="text-blue-600"
          />

          <MetricCard
            title="Unique IPs"
            value={stats.rateLimiting.uniqueIPs.toLocaleString()}
            icon={<Activity className="w-5 h-5" />}
            trend="+8.1%"
            trendUp={true}
          />

          <MetricCard
            title="Rate Limit Violations"
            value={stats.rateLimiting.violations.length.toLocaleString()}
            icon={<AlertTriangle className="w-5 h-5" />}
            valueColor="text-orange-600"
          />

          <MetricCard
            title="Blacklisted IPs"
            value={stats.ddos.blacklistedIPs.toLocaleString()}
            icon={<Lock className="w-5 h-5" />}
            valueColor="text-red-600"
          />

          <MetricCard
            title="Detected Attacks"
            value={stats.ddos.detectedAttacks.length.toLocaleString()}
            icon={<Shield className="w-5 h-5" />}
            valueColor="text-purple-600"
          />

          <MetricCard
            title="Active API Keys"
            value={stats.apiKeys.active.toLocaleString()}
            icon={<Key className="w-5 h-5" />}
            valueColor="text-green-600"
          />
        </div>
      )}

      {/* Rate Limiting Tab */}
      {selectedTab === 'rate-limiting' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Total Requests"
              value={stats.rateLimiting.totalRequests.toLocaleString()}
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <MetricCard
              title="Blocked Requests"
              value={stats.rateLimiting.blockedRequests.toLocaleString()}
              icon={<Ban className="w-5 h-5" />}
              valueColor="text-red-600"
            />
            <MetricCard
              title="Block Rate"
              value={`${((stats.rateLimiting.blockedRequests / stats.rateLimiting.totalRequests) * 100).toFixed(2)}%`}
              icon={<Activity className="w-5 h-5" />}
            />
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Recent Rate Limit Violations</h3>
              <p className="text-sm text-gray-600">IPs or users exceeding their rate limits</p>
            </div>
            <div>
              <div className="space-y-2">
                {stats.rateLimiting.violations.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No violations detected</p>
                ) : (
                  stats.rateLimiting.violations.map((violation) => (
                    <div
                      key={violation.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{violation.ip}</p>
                        <p className="text-sm text-gray-600">{violation.endpoint}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-600">
                          {violation.requestCount}/{violation.limit}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(violation.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DDoS Protection Tab */}
      {selectedTab === 'ddos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Suspicious IPs"
              value={stats.ddos.suspiciousIPs.toLocaleString()}
              icon={<AlertTriangle className="w-5 h-5" />}
              valueColor="text-orange-600"
            />
            <MetricCard
              title="Blacklisted IPs"
              value={stats.ddos.blacklistedIPs.toLocaleString()}
              icon={<Ban className="w-5 h-5" />}
              valueColor="text-red-600"
            />
            <MetricCard
              title="Active Connections"
              value={stats.ddos.activeConnections.toLocaleString()}
              icon={<Globe className="w-5 h-5" />}
              valueColor="text-blue-600"
            />
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Detected DDoS Attacks</h3>
              <p className="text-sm text-gray-600">Automatically detected and mitigated attack patterns</p>
            </div>
            <div>
              <div className="space-y-2">
                {stats.ddos.detectedAttacks.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No attacks detected</p>
                ) : (
                  stats.ddos.detectedAttacks.map((attack, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200"
                    >
                      <div>
                        <p className="font-medium text-red-900 flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          {attack.type.toUpperCase()} Attack
                        </p>
                        <p className="text-sm text-red-700 mt-1">
                          {attack.requestCount.toLocaleString()} requests from {attack.ips.length} IPs
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          Started: {new Date(attack.startTime).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          {attack.mitigated ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                              Mitigated
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          Confidence: {(attack.confidence * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {selectedTab === 'api-keys' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Total Keys"
              value={stats.apiKeys.total.toLocaleString()}
              icon={<Key className="w-5 h-5" />}
            />
            <MetricCard
              title="Active"
              value={stats.apiKeys.active.toLocaleString()}
              icon={<Activity className="w-5 h-5" />}
              valueColor="text-green-600"
            />
            <MetricCard
              title="Expired"
              value={stats.apiKeys.expired.toLocaleString()}
              icon={<AlertTriangle className="w-5 h-5" />}
              valueColor="text-orange-600"
            />
            <MetricCard
              title="Revoked"
              value={stats.apiKeys.revoked.toLocaleString()}
              icon={<Ban className="w-5 h-5" />}
              valueColor="text-red-600"
            />
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">API Key Management</h3>
              <p className="text-sm text-gray-600">Manage and monitor API keys</p>
            </div>
            <div>
              <p className="text-gray-600">
                API key management interface would go here, including creation, rotation, and
                revocation functionality.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Metric Card Component
 */
interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  valueColor?: string;
}

function MetricCard({ title, value, icon, trend, trendUp, valueColor = 'text-gray-900' }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-600">{title}</p>
          <div className="text-gray-400">{icon}</div>
        </div>
        <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
        {trend && (
          <p className={`text-sm mt-2 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trend} from last hour
          </p>
        )}
      </div>
    </div>
  );
}

export default APISecurityDashboard;
