/**
 * Event Timeline View Component
 * Real-time event stream visualization with filtering and search
 *
 * Features:
 * - Real-time event stream
 * - Event filtering by type and severity
 * - Search functionality
 * - Pattern highlighting
 * - Event correlation display
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  Download,
  Clock,
  Tag
} from 'lucide-react';
import {
  globalEventTimeline,
  TimelineEvent,
  EventType,
  EventSeverity,
  EventPattern
} from '../../observability/EventTimeline';

export const EventTimelineView: React.FC = () => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<TimelineEvent[]>([]);
  const [patterns, setPatterns] = useState<EventPattern[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<EventSeverity | 'all'>('all');
  const [stats, setStats] = useState<ReturnType<typeof globalEventTimeline.getStatistics>>();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  /**
   * Load events
   */
  const loadEvents = useCallback(() => {
    const allEvents = globalEventTimeline.getEvents(undefined, 500);
    setEvents(allEvents);

    const allPatterns = globalEventTimeline.getPatterns(70);
    setPatterns(allPatterns);

    const statistics = globalEventTimeline.getStatistics();
    setStats(statistics);
  }, []);

  /**
   * Auto-refresh
   */
  useEffect(() => {
    loadEvents();
    intervalRef.current = setInterval(loadEvents, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadEvents]);

  /**
   * Listen to event updates
   */
  useEffect(() => {
    const handleNewEvent = () => {
      loadEvents();
      if (autoScroll) {
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    globalEventTimeline.on('event:added', handleNewEvent);

    return () => {
      globalEventTimeline.off('event:added', handleNewEvent);
    };
  }, [loadEvents, autoScroll]);

  /**
   * Filter events
   */
  useEffect(() => {
    let filtered = [...events];

    if (typeFilter !== 'all') {
      filtered = filtered.filter(e => e.type === typeFilter);
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(e => e.severity === severityFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        e =>
          e.title.toLowerCase().includes(query) ||
          e.description?.toLowerCase().includes(query) ||
          e.source.toLowerCase().includes(query)
      );
    }

    setFilteredEvents(filtered);
  }, [events, typeFilter, severityFilter, searchQuery]);

  /**
   * Get severity icon
   */
  const getSeverityIcon = (severity: EventSeverity) => {
    switch (severity) {
      case 'debug':
        return <Info className="w-4 h-4 text-gray-400" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-700" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  /**
   * Get severity color
   */
  const getSeverityColor = (severity: EventSeverity): string => {
    switch (severity) {
      case 'debug':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'info':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'warning':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'critical':
        return 'bg-red-100 text-red-900 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * Export events
   */
  const handleExport = () => {
    const json = globalEventTimeline.exportEvents(
      {
        types: typeFilter !== 'all' ? [typeFilter] : undefined,
        severities: severityFilter !== 'all' ? [severityFilter] : undefined,
        search: searchQuery || undefined
      },
      'json'
    );

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `events-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Event Timeline</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <Activity className="w-3 h-3 animate-pulse" />
              Live
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-6 gap-3 mb-4">
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="text-lg font-bold text-gray-900">{stats.totalEvents}</p>
              <p className="text-xs text-gray-600">Total</p>
            </div>

            <div className="text-center p-2 bg-blue-50 rounded">
              <p className="text-lg font-bold text-blue-900">
                {stats.eventsBySeverity.info || 0}
              </p>
              <p className="text-xs text-blue-600">Info</p>
            </div>

            <div className="text-center p-2 bg-yellow-50 rounded">
              <p className="text-lg font-bold text-yellow-900">
                {stats.eventsBySeverity.warning || 0}
              </p>
              <p className="text-xs text-yellow-600">Warning</p>
            </div>

            <div className="text-center p-2 bg-red-50 rounded">
              <p className="text-lg font-bold text-red-900">
                {stats.eventsBySeverity.error || 0}
              </p>
              <p className="text-xs text-red-600">Error</p>
            </div>

            <div className="text-center p-2 bg-red-100 rounded">
              <p className="text-lg font-bold text-red-900">
                {stats.eventsBySeverity.critical || 0}
              </p>
              <p className="text-xs text-red-700">Critical</p>
            </div>

            <div className="text-center p-2 bg-purple-50 rounded">
              <p className="text-lg font-bold text-purple-900">
                {stats.eventsPerHour.toFixed(0)}
              </p>
              <p className="text-xs text-purple-600">/hour</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as EventType | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="execution">Execution</option>
            <option value="node">Node</option>
            <option value="agent">Agent</option>
            <option value="device">Device</option>
            <option value="deployment">Deployment</option>
            <option value="alert">Alert</option>
            <option value="error">Error</option>
            <option value="user">User</option>
            <option value="system">System</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as EventSeverity | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Severities</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            Auto-scroll
          </label>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Event Stream */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredEvents.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No events found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className={`p-4 rounded-lg border ${getSeverityColor(event.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getSeverityIcon(event.severity)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-white rounded text-xs font-medium">
                          {event.type}
                        </span>
                        <span className="text-xs text-gray-600">{event.source}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <h3 className="font-medium text-gray-900 text-sm mb-1">
                        {event.title}
                      </h3>

                      {event.description && (
                        <p className="text-sm text-gray-700 mb-2">
                          {event.description}
                        </p>
                      )}

                      {event.tags && event.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {event.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded text-xs"
                            >
                              <Tag className="w-3 h-3" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {event.correlationId && (
                        <div className="mt-2 text-xs text-gray-500">
                          Correlation ID: {event.correlationId}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Patterns Sidebar */}
        {patterns.length > 0 && (
          <div className="w-80 border-l border-gray-200 overflow-y-auto p-4 bg-purple-50">
            <h3 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Detected Patterns
            </h3>

            <div className="space-y-3">
              {patterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="p-3 bg-white rounded-lg border border-purple-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      {pattern.name}
                    </h4>
                    <span className="text-xs font-medium text-purple-700">
                      {pattern.confidence.toFixed(0)}% confidence
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 mb-2">
                    {pattern.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Frequency:</span>
                      <span className="ml-1 font-medium text-gray-900">
                        {pattern.frequency.toFixed(1)}/h
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500">Events:</span>
                      <span className="ml-1 font-medium text-gray-900">
                        {pattern.events.length}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventTimelineView;
