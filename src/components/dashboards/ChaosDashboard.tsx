/**
 * Chaos Engineering Dashboard
 *
 * Visual interface for browsing experiments, scheduling GameDays,
 * viewing results, tracking resilience scores, and monitoring MTBF/MTTR trends.
 */

import React, { useState, useEffect } from 'react';
import type {
  ChaosExperiment,
  ExperimentCategory,
  ExperimentSeverity,
  ExperimentResult,
  GameDay,
  ChaosDashboardStats,
  ResilienceMetrics,
} from '../../chaos/types/chaos';

interface ChaosDashboardProps {
  className?: string;
}

export const ChaosDashboard: React.FC<ChaosDashboardProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'experiments' | 'gamedays' | 'results' | 'metrics'>('experiments');
  const [selectedCategory, setSelectedCategory] = useState<ExperimentCategory | 'all'>('all');
  const [stats, setStats] = useState<ChaosDashboardStats | null>(null);
  const [experiments, setExperiments] = useState<ChaosExperiment[]>([]);
  const [gameDays, setGameDays] = useState<GameDay[]>([]);
  const [recentResults, setRecentResults] = useState<ExperimentResult[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // Load dashboard statistics
    const mockStats: ChaosDashboardStats = {
      totalExperiments: 75,
      activeExperiments: 3,
      totalGameDays: 12,
      upcomingGameDays: 2,
      resilience: {
        current: {
          mtbf: 7200000,
          mttr: 15000,
          errorBudget: 95,
          resilienceScore: 82,
          availability: 98.5,
          recoveryRate: 90,
        },
        trend: 'improving',
        historicalData: [
          {
            timestamp: new Date(Date.now() - 7 * 86400000),
            metrics: { mtbf: 5400000, mttr: 20000, errorBudget: 92, resilienceScore: 75, availability: 97, recoveryRate: 85 },
          },
          {
            timestamp: new Date(),
            metrics: { mtbf: 7200000, mttr: 15000, errorBudget: 95, resilienceScore: 82, availability: 98.5, recoveryRate: 90 },
          },
        ],
      },
      experiments: {
        byCategory: {
          network: 20,
          compute: 15,
          state: 15,
          application: 25,
        },
        bySeverity: {
          low: 15,
          medium: 25,
          high: 25,
          critical: 10,
        },
        byStatus: {
          pending: 5,
          running: 3,
          completed: 60,
          failed: 5,
          rolled_back: 2,
          aborted: 0,
        },
      },
      insights: {
        unknownFailuresDiscovered: 45,
        improvementPercentage: 67.2,
        mttrReduction: 31.4,
      },
    };

    setStats(mockStats);
  };

  const renderExperimentsTab = () => (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'network', 'compute', 'state', 'application'] as const).map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
            {category !== 'all' && stats && (
              <span className="ml-2 text-sm">({stats.experiments.byCategory[category]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Experiments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats && Object.entries(stats.experiments.byCategory).map(([category, count]) => (
          <ExperimentCategoryCard
            key={category}
            category={category as ExperimentCategory}
            count={count}
            onClick={() => setSelectedCategory(category as ExperimentCategory)}
          />
        ))}
      </div>

      {/* Experiment Library */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Experiment Library</h3>
        <div className="space-y-2">
          <ExperimentListItem
            name="Network Latency Injection"
            category="network"
            severity="medium"
            description="Test timeout handling with 1000ms latency"
          />
          <ExperimentListItem
            name="Database Unavailable"
            category="state"
            severity="critical"
            description="Validate failover to read replica"
          />
          <ExperimentListItem
            name="CPU Spike"
            category="compute"
            severity="high"
            description="Test auto-scaling with 80% CPU load"
          />
          <ExperimentListItem
            name="HTTP 500 Errors"
            category="application"
            severity="high"
            description="Validate retry logic with server errors"
          />
        </div>
      </div>
    </div>
  );

  const renderGameDaysTab = () => (
    <div className="space-y-6">
      {/* Upcoming GameDays */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Upcoming GameDays</h3>
        <div className="space-y-4">
          <GameDayCard
            name="Q1 Resilience GameDay"
            scheduledAt={new Date(Date.now() + 7 * 86400000)}
            objectives={['Test failover', 'Validate monitoring']}
            teamSize={8}
          />
          <GameDayCard
            name="Production Readiness"
            scheduledAt={new Date(Date.now() + 14 * 86400000)}
            objectives={['Pre-production validation', 'Runbook accuracy']}
            teamSize={12}
          />
        </div>
      </div>

      {/* Past GameDays */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Past GameDays</h3>
        <div className="space-y-4">
          <GameDayResultCard
            name="Disaster Recovery Test"
            completedAt={new Date(Date.now() - 7 * 86400000)}
            score={85}
            experimentsRun={12}
            incidentCount={3}
          />
        </div>
      </div>
    </div>
  );

  const renderMetricsTab = () => (
    <div className="space-y-6">
      {/* Resilience Score */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Resilience Score"
          value={stats?.resilience.current.resilienceScore || 0}
          unit="/100"
          trend={stats?.resilience.trend}
          color="blue"
        />
        <MetricCard
          title="MTBF"
          value={Math.round((stats?.resilience.current.mtbf || 0) / 3600000)}
          unit="hours"
          trend="improving"
          color="green"
        />
        <MetricCard
          title="MTTR"
          value={Math.round((stats?.resilience.current.mttr || 0) / 1000)}
          unit="seconds"
          trend="improving"
          color="yellow"
        />
        <MetricCard
          title="Availability"
          value={stats?.resilience.current.availability || 0}
          unit="%"
          trend="stable"
          color="purple"
        />
      </div>

      {/* Insights */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Key Insights</h3>
        <div className="space-y-4">
          <InsightCard
            icon="🔍"
            title="Unknown Failures Discovered"
            value={stats?.insights.unknownFailuresDiscovered || 0}
            improvement="+143%"
            description="vs. traditional testing"
          />
          <InsightCard
            icon="📈"
            title="Resilience Improvement"
            value={`${stats?.insights.improvementPercentage || 0}%`}
            improvement="Since starting chaos engineering"
            description="Overall system resilience"
          />
          <InsightCard
            icon="⏱️"
            title="MTTR Reduction"
            value={`${stats?.insights.mttrReduction || 0}%`}
            improvement="Faster recovery"
            description="Mean time to recovery"
          />
        </div>
      </div>
    </div>
  );

  const renderResultsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Experiment Results</h3>
        <div className="space-y-4">
          <ExperimentResultCard
            experimentName="Network Latency Test"
            status="completed"
            resilienceScore={85}
            recoveryTime={8500}
            slaViolations={0}
          />
          <ExperimentResultCard
            experimentName="Database Failover"
            status="completed"
            resilienceScore={76}
            recoveryTime={25000}
            slaViolations={1}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className={`chaos-dashboard ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Chaos Engineering Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Monitor resilience, run experiments, and improve system reliability
        </p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Experiments" value={stats.totalExperiments} icon="🧪" />
          <StatCard title="Active Experiments" value={stats.activeExperiments} icon="▶️" color="blue" />
          <StatCard title="Total GameDays" value={stats.totalGameDays} icon="🎮" />
          <StatCard title="Upcoming GameDays" value={stats.upcomingGameDays} icon="📅" color="purple" />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          {(['experiments', 'gamedays', 'results', 'metrics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'experiments' && renderExperimentsTab()}
        {activeTab === 'gamedays' && renderGameDaysTab()}
        {activeTab === 'results' && renderResultsTab()}
        {activeTab === 'metrics' && renderMetricsTab()}
      </div>
    </div>
  );
};

// Helper Components

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: string;
  color?: string;
}> = ({ title, value, icon, color = 'gray' }) => (
  <div className={`bg-white rounded-lg shadow p-6 border-l-4 border-${color}-500`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className="text-4xl">{icon}</div>
    </div>
  </div>
);

const MetricCard: React.FC<{
  title: string;
  value: number;
  unit: string;
  trend?: 'improving' | 'stable' | 'degrading';
  color: string;
}> = ({ title, value, unit, trend, color }) => (
  <div className={`bg-white rounded-lg shadow p-6 border-t-4 border-${color}-500`}>
    <p className="text-sm font-medium text-gray-600">{title}</p>
    <p className="text-3xl font-bold text-gray-900 mt-2">
      {value}
      <span className="text-lg text-gray-500 ml-1">{unit}</span>
    </p>
    {trend && (
      <p className={`text-sm mt-2 ${trend === 'improving' ? 'text-green-600' : trend === 'degrading' ? 'text-red-600' : 'text-gray-600'}`}>
        {trend === 'improving' ? '↗' : trend === 'degrading' ? '↘' : '→'} {trend}
      </p>
    )}
  </div>
);

const ExperimentCategoryCard: React.FC<{
  category: ExperimentCategory;
  count: number;
  onClick: () => void;
}> = ({ category, count, onClick }) => (
  <button
    onClick={onClick}
    className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow text-left"
  >
    <h3 className="text-lg font-semibold capitalize mb-2">{category}</h3>
    <p className="text-3xl font-bold text-blue-600">{count}</p>
    <p className="text-sm text-gray-600 mt-2">experiments</p>
  </button>
);

const ExperimentListItem: React.FC<{
  name: string;
  category: string;
  severity: string;
  description: string;
}> = ({ name, category, severity, description }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
    <div className="flex-1">
      <h4 className="font-medium text-gray-900">{name}</h4>
      <p className="text-sm text-gray-600">{description}</p>
      <div className="flex gap-2 mt-2">
        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">{category}</span>
        <span className={`text-xs px-2 py-1 rounded ${severity === 'critical' ? 'bg-red-100 text-red-800' : severity === 'high' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {severity}
        </span>
      </div>
    </div>
    <button className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
      Run
    </button>
  </div>
);

const GameDayCard: React.FC<{
  name: string;
  scheduledAt: Date;
  objectives: string[];
  teamSize: number;
}> = ({ name, scheduledAt, objectives, teamSize }) => (
  <div className="bg-gray-50 rounded-lg p-4">
    <h4 className="font-semibold text-gray-900">{name}</h4>
    <p className="text-sm text-gray-600 mt-1">
      📅 {scheduledAt.toLocaleDateString()} • 👥 {teamSize} participants
    </p>
    <div className="mt-2">
      <p className="text-sm font-medium text-gray-700">Objectives:</p>
      <ul className="list-disc list-inside text-sm text-gray-600">
        {objectives.map((obj, i) => (
          <li key={i}>{obj}</li>
        ))}
      </ul>
    </div>
  </div>
);

const GameDayResultCard: React.FC<{
  name: string;
  completedAt: Date;
  score: number;
  experimentsRun: number;
  incidentCount: number;
}> = ({ name, completedAt, score, experimentsRun, incidentCount }) => (
  <div className="bg-gray-50 rounded-lg p-4">
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-semibold text-gray-900">{name}</h4>
        <p className="text-sm text-gray-600 mt-1">{completedAt.toLocaleDateString()}</p>
      </div>
      <div className={`text-2xl font-bold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
        {score}/100
      </div>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
      <div>
        <p className="text-gray-600">Experiments</p>
        <p className="font-semibold">{experimentsRun}</p>
      </div>
      <div>
        <p className="text-gray-600">Incidents</p>
        <p className="font-semibold">{incidentCount}</p>
      </div>
    </div>
  </div>
);

const ExperimentResultCard: React.FC<{
  experimentName: string;
  status: string;
  resilienceScore: number;
  recoveryTime: number;
  slaViolations: number;
}> = ({ experimentName, status, resilienceScore, recoveryTime, slaViolations }) => (
  <div className="bg-gray-50 rounded-lg p-4">
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-semibold text-gray-900">{experimentName}</h4>
        <span className={`inline-block mt-1 text-xs px-2 py-1 rounded ${status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {status}
        </span>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-600">Resilience Score</p>
        <p className="text-2xl font-bold text-blue-600">{resilienceScore}</p>
      </div>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
      <div>
        <p className="text-gray-600">Recovery Time</p>
        <p className="font-semibold">{recoveryTime}ms</p>
      </div>
      <div>
        <p className="text-gray-600">SLA Violations</p>
        <p className={`font-semibold ${slaViolations === 0 ? 'text-green-600' : 'text-red-600'}`}>
          {slaViolations}
        </p>
      </div>
    </div>
  </div>
);

const InsightCard: React.FC<{
  icon: string;
  title: string;
  value: number | string;
  improvement: string;
  description: string;
}> = ({ icon, title, value, improvement, description }) => (
  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
    <div className="text-4xl">{icon}</div>
    <div className="flex-1">
      <h4 className="font-semibold text-gray-900">{title}</h4>
      <p className="text-2xl font-bold text-blue-600 mt-1">{value}</p>
      <p className="text-sm text-green-600 font-medium">{improvement}</p>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  </div>
);

export default ChaosDashboard;
