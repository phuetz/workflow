import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, Play, Pause, Settings, AlertCircle, Plus, Edit, Trash2, RefreshCw, ChevronDown, ChevronRight, History, BarChart3, Calendar as CalendarIcon, Globe, Copy, Check } from 'lucide-react';
import { SchedulingService } from '../../services/SchedulingService';
import { analyticsService } from '../../backend/services/analyticsService';
import type { ScheduledWorkflow, ScheduleGroup, ScheduleWindow, ScheduleAnalytics, ScheduleTemplate, ScheduleConflict, ScheduleStatus, TimeUnit } from '../../types/scheduling';
import { format, formatDistance /*, parseISO*/ } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const schedulingService = new SchedulingService();


interface SchedulingDashboardProps {
  workflowId?: string;
  onScheduleEdit?: (scheduleId: string) => void;
  onScheduleRun?: (scheduleId: string) => void;
}

const SchedulingDashboard: React.FC<SchedulingDashboardProps> = ({
  workflowId,
  onScheduleEdit,
  onScheduleRun
}) => {
  const [schedules, setSchedules] = useState<ScheduledWorkflow[]>([]);
  const [groups, setGroups] = useState<ScheduleGroup[]>([]);
  const [windows, setWindows] = useState<ScheduleWindow[]>([]);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduledWorkflow | null>(null);
  const [analytics, setAnalytics] = useState<ScheduleAnalytics | null>(null);
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [activeTab, setActiveTab] = useState<'schedules' | 'groups' | 'windows' | 'templates' | 'analytics'>('schedules');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState('UTC');
  const [expandedSchedules, setExpandedSchedules] = useState<Set<string>>(new Set());
  const [nextRuns, setNextRuns] = useState<Map<string, Date[]>>(new Map());

  useEffect(() => {
    loadSchedules();
    loadGroups();
    loadWindows();
    loadTemplates();
    setSelectedTimezone(schedulingService.detectTimezone());
  }, [workflowId]);

  useEffect(() => {
    if (selectedSchedule) {
      loadAnalytics(selectedSchedule.id);
      loadConflicts(selectedSchedule.id);
      calculateNextRuns(selectedSchedule.id);
    }
  }, [selectedSchedule]);

  const loadSchedules = async () => {
    const data = await schedulingService.listSchedules(workflowId ? { workflowId } : undefined);
    setSchedules(data);
  };

  const loadGroups = async () => {
    // Get all groups by listing all schedules and extracting unique groups
    const allSchedules = await schedulingService.listSchedules();
    const groupIds = new Set<string>();
    allSchedules.forEach(s => {
      if (s.metadata.category) groupIds.add(s.metadata.category);
    });
    // For now, return empty array - full group management would need backend support
    setGroups([]);
  };

  const loadWindows = async () => {
    const activeWindows = await schedulingService.getActiveWindows();
    setWindows(activeWindows);
  };

  const loadTemplates = async () => {
    const allTemplates = await schedulingService.getScheduleTemplates();
    setTemplates(allTemplates);
  };

  const loadAnalytics = async (scheduleId: string) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();

    const data = await analyticsService.getScheduleAnalytics({
      scheduleId,
      startDate,
      endDate
    });

    // Convert ScheduleAnalyticsData to ScheduleAnalytics by adding missing fields
    const successfulExecutions = Math.round(data.metrics.totalExecutions * (data.metrics.reliability / 100));
    const failedExecutions = data.metrics.totalExecutions - successfulExecutions;

    const analyticsData: ScheduleAnalytics = {
      scheduleId,
      timeRange: { start: startDate, end: endDate },
      metrics: {
        totalExecutions: data.metrics.totalExecutions,
        successfulExecutions,
        failedExecutions,
        skippedExecutions: 0,
        averageDuration: data.metrics.averageDuration,
        onTimePercentage: data.metrics.onTimePercentage,
        reliability: data.metrics.reliability
      },
      patterns: {
        peakHours: data.patterns.peakHours,
        peakDays: [],
        failurePatterns: data.patterns.failurePatterns.map(fp => ({
          type: 'time_based' as const,
          description: fp.description,
          occurrences: fp.occurrences,
          lastOccurrence: fp.lastOccurrence,
          recommendations: fp.recommendations
        }))
      },
      predictions: data.predictions
    };
    setAnalytics(analyticsData);
  };

  const loadConflicts = async (scheduleId: string) => {
    const data = await schedulingService.checkConflicts(scheduleId);
    setConflicts(data);
  };

  const calculateNextRuns = async (scheduleId: string) => {
    const runs = await schedulingService.predictNextRuns(scheduleId, 5);
    setNextRuns(prev => new Map(prev).set(scheduleId, runs));
  };

  const toggleSchedule = async (schedule: any) => {
    if (schedule.enabled) {
      await schedulingService.disableSchedule(schedule.id);
    } else {
      await schedulingService.enableSchedule(schedule.id);
    }
    loadSchedules();
  };

  const deleteSchedule = async (scheduleId: string) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      await schedulingService.deleteSchedule(scheduleId);
      loadSchedules();
      if (selectedSchedule?.id === scheduleId) {
        setSelectedSchedule(null);
      }
    }
  };

  const triggerSchedule = async (scheduleId: string) => {
    await schedulingService.triggerSchedule(scheduleId, { force: true });
    if (onScheduleRun) {
      onScheduleRun(scheduleId);
    }
  };

  const applyTemplate = async (templateId: string, targetWorkflowId: string) => {
    await schedulingService.applyTemplate(templateId, targetWorkflowId);
    loadSchedules();
  };

  const toggleScheduleExpansion = (scheduleId: string) => {
    setExpandedSchedules(prev => {
      const next = new Set(prev);
      if (next.has(scheduleId)) {
        next.delete(scheduleId);
      } else {
        next.add(scheduleId);
      }
      return next;
    });
  };

  const getStatusColor = (status: ScheduleStatus) => {
    switch (status) {
      case 'active': return 'text-green-500';
      case 'paused': return 'text-yellow-500';
      case 'failed': return 'text-red-500';
      case 'completed': return 'text-blue-500';
      case 'disabled': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getScheduleDescription = (schedule: any) => {
    const pattern = schedule.schedule.pattern;
    if (pattern.cron) {
      return schedulingService.describeCronExpression(pattern.cron.expression);
    }
    if (pattern.interval) {
      return `Every ${pattern.interval.interval} ${pattern.interval.unit}`;
    }
    if (pattern.oneTime) {
      return `Once at ${format(pattern.oneTime, 'PPpp')}`;
    }
    return 'Custom schedule';
  };

  const renderSchedules = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Scheduled Workflows</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Schedule
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No scheduled workflows yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map(schedule => (
            <div key={schedule.id} className="border rounded-lg overflow-hidden">
              <div 
                className="p-4 bg-white hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedSchedule(schedule)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleScheduleExpansion(schedule.id);
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {expandedSchedules.has(schedule.id) ? 
                        <ChevronDown className="w-4 h-4" /> : 
                        <ChevronRight className="w-4 h-4" />
                      }
                    </button>
                    <div>
                      <h4 className="font-medium">{schedule.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getScheduleDescription(schedule)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {schedule.timezone}
                        </span>
                        <span className={`flex items-center gap-1 ${getStatusColor(schedule.status)}`}>
                          {schedule.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSchedule(schedule);
                      }}
                      className={`p-2 rounded ${schedule.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'} hover:opacity-80`}
                    >
                      {schedule.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerSchedule(schedule.id);
                      }}
                      className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onScheduleEdit) onScheduleEdit(schedule.id);
                      }}
                      className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSchedule(schedule.id);
                      }}
                      className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {schedule.nextRun && (
                  <div className="mt-2 text-sm text-gray-600">
                    Next run: {formatInTimeZone(schedule.nextRun, selectedTimezone, 'PPpp')} 
                    <span className="text-gray-500"> ({formatDistance(schedule.nextRun, new Date(), { addSuffix: true })})</span>
                  </div>
                )}
              </div>

              {expandedSchedules.has(schedule.id) && (
                <div className="border-t p-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <h5 className="font-medium mb-2">Execution History</h5>
                      <div className="space-y-2">
                        {schedule.executions.slice(0, 5).map(exec => (
                          <div key={exec.id} className="flex items-center justify-between text-sm">
                            <span>{format(exec.scheduledTime, 'PPp')}</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              exec.status === 'success' ? 'bg-green-100 text-green-700' :
                              exec.status === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {exec.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">Next 5 Runs</h5>
                      <div className="space-y-2">
                        {nextRuns.get(schedule.id)?.slice(0, 5).map((date, idx) => (
                          <div key={idx} className="text-sm">
                            {formatInTimeZone(date, selectedTimezone, 'PPp')}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {conflicts.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-700">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">Conflicts detected</span>
                      </div>
                      <div className="mt-2 text-sm text-yellow-600">
                        {conflicts.map(conflict => (
                          <div key={conflict.id}>
                            {conflict.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderGroups = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Schedule Groups</h3>
        <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Group
        </button>
      </div>

      {groups.map(group => (
        <div key={group.id} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">{group.name}</h4>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs ${
                group.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {group.enabled ? 'Active' : 'Inactive'}
              </span>
              <span className="text-sm text-gray-600">
                {group.schedules.length} schedules
              </span>
            </div>
          </div>
          {group.description && (
            <p className="text-sm text-gray-600 mb-2">{group.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm">
            <span>Orchestration: {group.orchestration.type}</span>
            {group.maxConcurrent && (
              <span>Max concurrent: {group.maxConcurrent}</span>
            )}
            <span>Priority: {group.priority}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderWindows = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Maintenance Windows</h3>
        <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Window
        </button>
      </div>

      {windows.map(window => (
        <div key={window.id} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">{window.name}</h4>
            <span className={`px-2 py-1 rounded text-xs ${
              window.type === 'maintenance' ? 'bg-orange-100 text-orange-700' :
              window.type === 'blackout' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {window.type}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              {format(window.startTime, 'PPp')} - {format(window.endTime, 'PPp')}
            </div>
            {window.recurring && (
              <div className="mt-1">
                Recurring: {window.recurring.frequency}
              </div>
            )}
            <div className="mt-2">
              Affects {window.affectedSchedules.length} schedules · Action: {window.action}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTemplates = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Schedule Templates</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {templates.map(template => (
          <div key={template.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{template.name}</h4>
              <span className="text-sm text-gray-500">
                Used {template.popularity} times
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{template.description}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {template.tags.map((tag, idx) => (
                <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
            {workflowId && (
              <button
                onClick={() => applyTemplate(template.id, workflowId)}
                className="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 flex items-center justify-center gap-2"
              >
                <Copy className="w-3 h-3" />
                Apply Template
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnalytics = () => {
    if (!selectedSchedule || !analytics) {
      return (
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select a schedule to view analytics</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Schedule Analytics: {selectedSchedule.name}</h3>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Total Executions</div>
            <div className="text-2xl font-bold">{analytics.metrics.totalExecutions}</div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Success Rate</div>
            <div className="text-2xl font-bold text-green-600">
              {analytics.metrics.reliability.toFixed(1)}%
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">Average Duration</div>
            <div className="text-2xl font-bold">
              {(analytics.metrics.averageDuration / 1000).toFixed(1)}s
            </div>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <div className="text-sm text-gray-600">On-Time Rate</div>
            <div className="text-2xl font-bold">
              {analytics.metrics.onTimePercentage.toFixed(1)}%
            </div>
          </div>
        </div>

        {analytics.patterns.failurePatterns.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-700 mb-2">Failure Patterns Detected</h4>
            {analytics.patterns.failurePatterns.map((pattern, idx) => (
              <div key={idx} className="mb-3">
                <div className="font-medium text-sm">{pattern.description}</div>
                <div className="text-sm text-red-600">
                  {pattern.occurrences} occurrences · Last: {format(pattern.lastOccurrence, 'PPp')}
                </div>
                <div className="mt-1">
                  {pattern.recommendations.map((rec, recIdx) => (
                    <div key={recIdx} className="text-sm text-gray-700">
                      • {rec}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <h4 className="font-medium mb-2">Performance Predictions</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">Next Failure Risk</div>
              <div className={`text-lg font-medium ${
                analytics.predictions.nextFailureRisk > 50 ? 'text-red-600' : 'text-green-600'
              }`}>
                {analytics.predictions.nextFailureRisk}%
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">Est. Next Duration</div>
              <div className="text-lg font-medium">
                {(analytics.predictions.estimatedNextDuration / 1000).toFixed(1)}s
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">Resource Requirements</div>
              <div className="text-sm">
                CPU: {analytics.predictions.resourceRequirements.cpu}%<br/>
                Memory: {(analytics.predictions.resourceRequirements.memory / 1024 / 1024).toFixed(0)}MB
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Workflow Scheduling</h2>
          <p className="text-gray-600">Manage scheduled executions, maintenance windows, and automation</p>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <select
                value={selectedTimezone}
                onChange={(e) => setSelectedTimezone(e.target.value)}
                className="border rounded px-3 py-1 text-sm"
              >
                {schedulingService.getSupportedTimezones().map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <div className="flex-1" />
            <div className="flex gap-2">
              {['schedules', 'groups', 'windows', 'templates', 'analytics'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as 'schedules' | 'groups' | 'windows' | 'templates' | 'analytics')}
                  className={`px-4 py-2 rounded ${
                    activeTab === tab
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'schedules' && renderSchedules()}
          {activeTab === 'groups' && renderGroups()}
          {activeTab === 'windows' && renderWindows()}
          {activeTab === 'templates' && renderTemplates()}
          {activeTab === 'analytics' && renderAnalytics()}
        </div>
      </div>
    </div>
  );
};

export default SchedulingDashboard;