import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity, AlertTriangle, BookOpen, Plus, Server, Store,
  TrendingDown, TrendingUp, Upload, User, Workflow, Zap
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { nodeTypes } from '../../data/nodeTypes';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/NotificationService';
import { metricsService } from '../../services/metrics';
import { activityService } from '../../services/ActivityService';
import { workflowImportService } from '../../services/WorkflowImportService';
import { logger } from '../../services/SimpleLogger';

interface DashboardMetrics {
  totalWorkflows: number;
  activeNodes: number;
  executionRate: number;
  errorRate: number;
  recentExecutions: Array<{
    id: string;
    workflowName: string;
    status: 'success' | 'error';
    timestamp: string;
    duration: number;
  }>;
  popularNodes: Array<{
    type: string;
    name: string;
    count: number;
    category: string;
  }>;
}

const ModernDashboard: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const {
    workflows,
    nodes,
    darkMode,
    executionHistory: _executionHistory,
    currentEnvironment,
    environments
  } = useWorkflowStore();

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalWorkflows: 0,
    activeNodes: 0,
    executionRate: 0,
    errorRate: 0,
    recentExecutions: [],
    popularNodes: []
  });
  const [systemMetrics, setSystemMetrics] = useState(metricsService.getSystemMetrics());
  const [recentActivities, setRecentActivities] = useState(activityService.getRecentActivities(5));

  const [selectedTimeRange, setSelectedTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  // Memoize workflow count
  const totalWorkflows = useMemo(() => Object.keys(workflows).length, [workflows]);

  // Memoize node count
  const activeNodes = useMemo(() => nodes.length, [nodes.length]);

  // Memoize current environment
  const currentEnv = useMemo(
    () => {
      // Handle both array and object forms of environments
      if (Array.isArray(environments)) {
        return environments.find(e => e.id === currentEnvironment);
      }
      // If environments is an object, access by key
      return environments?.[currentEnvironment] || null;
    },
    [environments, currentEnvironment]
  );

  useEffect(() => {
    // Calculate real metrics from actual data
    const nodeTypeCounts = nodes.reduce((acc, node) => {
      const type = node.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const popularNodes = Object.entries(nodeTypeCounts)
      .map(([type, count]) => ({
        type,
        name: nodeTypes[type]?.label || type,
        count,
        category: nodeTypes[type]?.category || 'other'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get real execution data from metrics service
    const stats = metricsService.getExecutionStats(selectedTimeRange);
    const executions = metricsService.getRecentExecutions(10);
    const recentExecutions = executions.map(exec => ({
      id: exec.id,
      workflowName: exec.workflowName,
      status: exec.status as 'success' | 'error',
      timestamp: exec.startTime,
      duration: exec.duration || 0
    }));

    setMetrics({
      totalWorkflows: Object.keys(workflows).length,
      activeNodes: nodes.length,
      executionRate: stats.successRate,
      errorRate: stats.errorRate,
      recentExecutions,
      popularNodes
    });
  }, [workflows, nodes, selectedTimeRange]);

  useEffect(() => {
    // Subscribe to system metrics updates
    const handleMetricsUpdate = (metrics: any) => {
      setSystemMetrics(metrics);
    };

    metricsService.on('systemMetricsUpdated', handleMetricsUpdate);
    
    // Subscribe to activity updates
    const handleActivityUpdate = () => {
      setRecentActivities(activityService.getRecentActivities(5));
    };
    
    activityService.on('activityLogged', handleActivityUpdate);
    
    // Add some initial activities if none exist
    if (activityService.getRecentActivities(1).length === 0) {
      // Log some sample activities
      activityService.logSystemBackup();
      activityService.logWorkflowCreated('Welcome Email Campaign');
      activityService.logNodeAdded('httpRequest', 'API Call');
      activityService.logWorkflowExecuted('Data Sync', 'success');
      setRecentActivities(activityService.getRecentActivities(5));
    }
    
    return () => {
      metricsService.off('systemMetricsUpdated', handleMetricsUpdate);
      activityService.off('activityLogged', handleActivityUpdate);
    };
  }, []);

  // Memoize sub-components to prevent unnecessary re-renders
  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    trend?: { value: number; direction: 'up' | 'down' };
  }> = React.memo(({ title, value, icon: Icon, color, trend }) => (
    <div 
      className={`card ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6`}
      role="article"
      aria-labelledby={`stat-${title.replace(/\s+/g, '-').toLowerCase()}-title`}
      aria-describedby={`stat-${title.replace(/\s+/g, '-').toLowerCase()}-value`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p 
            className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
            id={`stat-${title.replace(/\s+/g, '-').toLowerCase()}-title`}
          >
            {title}
          </p>
          <p 
            className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}
            id={`stat-${title.replace(/\s+/g, '-').toLowerCase()}-value`}
            aria-label={`Valeur: ${value}`}
          >
            {value}
          </p>
          {trend && (
            <div 
              className={`flex items-center mt-2 text-sm ${
                trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
              }`}
              aria-label={`Tendance: ${trend.direction === 'up' ? 'hausse' : 'baisse'} de ${Math.abs(trend.value)}%`}
            >
              {trend.direction === 'up' ? 
                <TrendingUp 
                  size={16} 
                  className="mr-1" 
                  aria-hidden="true"
                /> : 
                <TrendingDown 
                  size={16} 
                  className="mr-1" 
                  aria-hidden="true"
                />
              }
              <span aria-hidden="true">{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`} aria-hidden="true">
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  ));

  const QuickActionButton: React.FC<{
    title: string;
    description: string;
    icon: React.ElementType;
    onClick: () => void;
    color: string;
  }> = React.memo(({ title, description, icon: Icon, onClick, color }) => (
    <button
      onClick={onClick}
      className={`card ${darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'} p-6 text-left transition-all duration-200 hover:scale-105`}
      aria-label={`${title}: ${description}`}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center mb-4">
        <div className={`p-2 rounded-lg ${color} mr-3`} aria-hidden="true">
          <Icon size={20} className="text-white" />
        </div>
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {title}
        </h3>
      </div>
      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {description}
      </p>
    </button>
  ));

  // useCallback for navigation handlers
  const handleCreateWorkflow = useCallback(() => {
    navigate('/editor');
  }, [navigate]);

  const handleViewDocs = useCallback(() => {
    navigate('/docs');
  }, [navigate]);

  const handleOpenMarketplace = useCallback(() => {
    navigate('/marketplace');
  }, [navigate]);

  const handleImportWorkflow = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const workflow = JSON.parse(text);
          await workflowImportService.importFromJSON(workflow);
          notificationService.success('Import réussi', 'Workflow importé avec succès');
        } catch (error) {
          logger.error('Error importing workflow', error);
          notificationService.error('Erreur d\'importation', 'Erreur lors de l\'importation du workflow');
        }
      }
    };
    input.click();
  }, []);

  const handleTimeRangeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTimeRange(e.target.value as '24h' | '7d' | '30d');
  }, []);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} pt-16`}>
      <div className="container mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 
                className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}
                aria-label="Dashboard principal - Vue d'ensemble des workflows"
              >
                Dashboard
              </h1>
              <p 
                className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}
                aria-describedby="dashboard-description"
                id="dashboard-description"
              >
                Vue d'ensemble de vos workflows et automatisations
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedTimeRange}
                onChange={handleTimeRangeChange}
                className={`px-4 py-2 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
                aria-label="Sélectionner la période d'analyse des métriques"
                aria-describedby="time-range-description"
              >
                <option value="24h">Dernières 24h</option>
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
              </select>
              <div className={`flex items-center px-3 py-2 rounded-lg ${
                currentEnvironment === 'prod' 
                  ? 'bg-red-100 text-red-800' 
                  : currentEnvironment === 'staging'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                <Server size={16} className="mr-2" />
                {currentEnv?.name || currentEnvironment}
              </div>
            </div>
          </div>
        </div>

        {/* Métriques principales */}
        <section aria-labelledby="main-metrics-heading">
          <h2 id="main-metrics-heading" className="sr-only">Métriques principales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Workflows totaux"
            value={metrics.totalWorkflows}
            icon={Workflow}
            color="bg-blue-500"
            trend={{ value: 12, direction: 'up' }}
          />
          <StatCard
            title="Nœuds actifs"
            value={metrics.activeNodes}
            icon={Activity}
            color="bg-green-500"
            trend={{ value: 8, direction: 'up' }}
          />
          <StatCard
            title="Taux d'exécution"
            value={`${metrics.executionRate}/h`}
            icon={Zap}
            color="bg-purple-500"
            trend={{ value: 15, direction: 'up' }}
          />
          <StatCard
            title="Taux d'erreur"
            value={`${metrics.errorRate}%`}
            icon={AlertTriangle}
            color="bg-red-500"
            trend={{ value: 3, direction: 'down' }}
          />
          </div>
        </section>

        {/* Contenu principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Actions rapides */}
          <section className="lg:col-span-1" aria-labelledby="quick-actions-heading">
            <h2 
              id="quick-actions-heading"
              className={`text-xl font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Actions rapides
            </h2>
            <nav aria-label="Actions rapides de workflow" className="space-y-4">
              <QuickActionButton
                title="Nouveau workflow"
                description="Créer un nouveau workflow à partir d'un template"
                icon={Plus}
                color="bg-blue-500"
                onClick={handleCreateWorkflow}
              />
              <QuickActionButton
                title="Importer workflow"
                description="Importer un workflow existant depuis un fichier"
                icon={Upload}
                color="bg-green-500"
                onClick={handleImportWorkflow}
              />
              <QuickActionButton
                title="Marketplace"
                description="Explorer les templates et plugins de la communauté"
                icon={Store}
                color="bg-purple-500"
                onClick={handleOpenMarketplace}
              />
              <QuickActionButton
                title="Documentation"
                description="Apprendre à utiliser tous les nœuds disponibles"
                icon={BookOpen}
                color="bg-indigo-500"
                onClick={handleViewDocs}
              />
            </nav>
          </section>

          {/* Activités récentes */}
          <section className="lg:col-span-2" aria-labelledby="recent-activities-heading">
            <h2
              id="recent-activities-heading"
              className={`text-xl font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Activités récentes
            </h2>
            <div className={`card ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6`}>
              {recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between py-3 ${
                        index < recentActivities.length - 1
                          ? `border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`
                          : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.category === 'execution' ? 'bg-green-500' :
                          activity.category === 'system' ? 'bg-red-500' : 'bg-blue-500'
                        }`} />
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                          {activity.action}
                        </span>
                      </div>
                      <span className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {activity.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-center py-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Aucune activité récente
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
});

ModernDashboard.displayName = 'ModernDashboard';

export default ModernDashboard;
