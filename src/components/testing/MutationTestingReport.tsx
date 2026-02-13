/**
 * Mutation Testing Report Component
 * Displays mutation testing results and analysis
 */

import React, { useState, useMemo } from 'react';
import type { MutationTestReport, MutationTestResult } from '../../testing/MutationTester';
import type { MutationType } from '../../testing/MutationOperators';
import { MutationTester } from '../../testing/MutationTester';

interface MutationTestingReportProps {
  report: MutationTestReport;
  onRetestMutation?: (mutationId: string) => void;
}

const MutationTestingReport: React.FC<MutationTestingReportProps> = ({
  report,
  onRetestMutation,
}) => {
  const [selectedType, setSelectedType] = useState<MutationType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'killed' | 'survived' | 'timeout' | 'error'>('all');
  const [expandedMutations, setExpandedMutations] = useState<Set<string>>(new Set());

  // Filter results
  const filteredResults = useMemo(() => {
    return report.results.filter((result) => {
      if (selectedType !== 'all' && result.mutation.type !== selectedType) {
        return false;
      }
      if (selectedStatus !== 'all' && result.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [report.results, selectedType, selectedStatus]);

  // Get score quality
  const scoreQuality = MutationTester.getMutationScoreQuality(report.mutationScore);

  // Toggle mutation expansion
  const toggleMutation = (id: string) => {
    const newExpanded = new Set(expandedMutations);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedMutations(newExpanded);
  };

  return (
    <div className="mutation-testing-report">
      {/* Header */}
      <div className="report-header">
        <h2>Mutation Testing Report</h2>
        <div className="score-badge" style={{ backgroundColor: scoreQuality.color }}>
          <span className="score">{report.mutationScore}%</span>
          <span className="label">Mutation Score</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="summary-stats">
        <div className="stat-card">
          <div className="stat-value">{report.totalMutations}</div>
          <div className="stat-label">Total Mutations</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">{report.killedMutations}</div>
          <div className="stat-label">Killed</div>
          <div className="stat-percentage">
            {Math.round((report.killedMutations / report.totalMutations) * 100)}%
          </div>
        </div>
        <div className="stat-card danger">
          <div className="stat-value">{report.survivedMutations}</div>
          <div className="stat-label">Survived</div>
          <div className="stat-percentage">
            {Math.round((report.survivedMutations / report.totalMutations) * 100)}%
          </div>
        </div>
        {report.timeoutMutations > 0 && (
          <div className="stat-card warning">
            <div className="stat-value">{report.timeoutMutations}</div>
            <div className="stat-label">Timeout</div>
          </div>
        )}
        {report.errorMutations > 0 && (
          <div className="stat-card error">
            <div className="stat-value">{report.errorMutations}</div>
            <div className="stat-label">Errors</div>
          </div>
        )}
      </div>

      {/* Score Quality */}
      <div className="score-quality">
        <div className="quality-badge" style={{ borderColor: scoreQuality.color }}>
          <span className="rating">{scoreQuality.rating.toUpperCase()}</span>
          <span className="description">{scoreQuality.description}</span>
        </div>
      </div>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="recommendations">
          <h3>Recommendations</h3>
          <ul>
            {report.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* By Type Chart */}
      <div className="by-type-section">
        <h3>Mutations by Type</h3>
        <div className="type-chart">
          {Object.entries(report.byType).map(([type, stats]) => {
            if (stats.total === 0) return null;

            return (
              <div
                key={type}
                className={`type-bar ${selectedType === type ? 'selected' : ''}`}
                onClick={() => setSelectedType(type as MutationType)}
              >
                <div className="type-label">{type}</div>
                <div className="type-progress">
                  <div
                    className="type-killed"
                    style={{ width: `${(stats.killed / stats.total) * 100}%` }}
                  />
                  <div
                    className="type-survived"
                    style={{ width: `${(stats.survived / stats.total) * 100}%` }}
                  />
                </div>
                <div className="type-stats">
                  <span className="killed">{stats.killed}</span>
                  <span className="divider">/</span>
                  <span className="total">{stats.total}</span>
                  <span className="score">({Math.round(stats.score)}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label>Type:</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
          >
            <option value="all">All Types</option>
            {Object.keys(report.byType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value="killed">Killed</option>
            <option value="survived">Survived</option>
            <option value="timeout">Timeout</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {/* Mutations List */}
      <div className="mutations-list">
        <h3>
          Mutations ({filteredResults.length} of {report.results.length})
        </h3>
        {filteredResults.length === 0 ? (
          <div className="empty-state">No mutations match the selected filters</div>
        ) : (
          <div className="mutations">
            {filteredResults.map((result) => (
              <div
                key={result.mutation.id}
                className={`mutation-item ${result.status} ${
                  expandedMutations.has(result.mutation.id) ? 'expanded' : ''
                }`}
              >
                <div
                  className="mutation-header"
                  onClick={() => toggleMutation(result.mutation.id)}
                >
                  <div className="mutation-status">
                    <span className={`status-badge ${result.status}`}>
                      {result.status}
                    </span>
                    <span className="mutation-type">{result.mutation.type}</span>
                  </div>
                  <div className="mutation-info">
                    <div className="mutation-description">
                      {result.mutation.description}
                    </div>
                    <div className="mutation-location">
                      {result.mutation.location.file}:
                      {result.mutation.location.line}
                    </div>
                  </div>
                  <div className="mutation-actions">
                    <span className="execution-time">
                      {result.executionTime}ms
                    </span>
                    <button
                      className="expand-btn"
                      aria-label={expandedMutations.has(result.mutation.id) ? 'Collapse' : 'Expand'}
                    >
                      {expandedMutations.has(result.mutation.id) ? '−' : '+'}
                    </button>
                  </div>
                </div>

                {expandedMutations.has(result.mutation.id) && (
                  <div className="mutation-details">
                    <div className="code-diff">
                      <div className="diff-line original">
                        <span className="diff-marker">−</span>
                        <code>{result.mutation.original}</code>
                      </div>
                      <div className="diff-line mutated">
                        <span className="diff-marker">+</span>
                        <code>{result.mutation.mutated}</code>
                      </div>
                    </div>

                    {result.killedBy && result.killedBy.length > 0 && (
                      <div className="killed-by">
                        <strong>Killed by:</strong>
                        <ul>
                          {result.killedBy.map((test, i) => (
                            <li key={i}>{test}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.error && (
                      <div className="mutation-error">
                        <strong>Error:</strong> {result.error}
                      </div>
                    )}

                    {onRetestMutation && (
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => onRetestMutation(result.mutation.id)}
                      >
                        Retest Mutation
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .mutation-testing-report {
          padding: 20px;
          background: #f9fafb;
          border-radius: 12px;
        }

        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }

        .report-header h2 {
          margin: 0;
          font-size: 24px;
          color: #111827;
        }

        .score-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 15px 30px;
          background: #10b981;
          color: white;
          border-radius: 8px;
        }

        .score-badge .score {
          font-size: 32px;
          font-weight: 700;
        }

        .score-badge .label {
          font-size: 12px;
          opacity: 0.9;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          border: 2px solid #e5e7eb;
          text-align: center;
        }

        .stat-card.success {
          border-color: #10b981;
        }

        .stat-card.danger {
          border-color: #ef4444;
        }

        .stat-card.warning {
          border-color: #f59e0b;
        }

        .stat-card.error {
          border-color: #dc2626;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 5px;
        }

        .stat-label {
          font-size: 14px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-percentage {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 5px;
        }

        .score-quality {
          margin-bottom: 30px;
        }

        .quality-badge {
          display: inline-flex;
          flex-direction: column;
          padding: 15px 25px;
          background: white;
          border: 2px solid;
          border-radius: 8px;
        }

        .quality-badge .rating {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .quality-badge .description {
          font-size: 14px;
          color: #6b7280;
        }

        .recommendations {
          background: white;
          padding: 20px;
          border-radius: 8px;
          border: 2px solid #3b82f6;
          margin-bottom: 30px;
        }

        .recommendations h3 {
          margin: 0 0 15px 0;
          font-size: 16px;
          color: #111827;
        }

        .recommendations ul {
          margin: 0;
          padding-left: 20px;
        }

        .recommendations li {
          margin-bottom: 8px;
          color: #374151;
          line-height: 1.6;
        }

        .by-type-section {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }

        .by-type-section h3 {
          margin: 0 0 20px 0;
          font-size: 16px;
          color: #111827;
        }

        .type-chart {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .type-bar {
          cursor: pointer;
          padding: 12px;
          background: #f9fafb;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .type-bar:hover {
          background: #f3f4f6;
        }

        .type-bar.selected {
          background: #ede9fe;
          border: 2px solid #a78bfa;
        }

        .type-label {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 8px;
          text-transform: capitalize;
        }

        .type-progress {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
          display: flex;
        }

        .type-killed {
          background: #10b981;
          transition: width 0.3s;
        }

        .type-survived {
          background: #ef4444;
          transition: width 0.3s;
        }

        .type-stats {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
        }

        .type-stats .killed {
          color: #10b981;
          font-weight: 600;
        }

        .type-stats .total {
          color: #6b7280;
        }

        .type-stats .score {
          color: #9ca3af;
          margin-left: 5px;
        }

        .filters {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .filter-group label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .filter-group select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          background: white;
          cursor: pointer;
        }

        .mutations-list {
          background: white;
          padding: 20px;
          border-radius: 8px;
        }

        .mutations-list h3 {
          margin: 0 0 20px 0;
          font-size: 16px;
          color: #111827;
        }

        .empty-state {
          padding: 40px;
          text-align: center;
          color: #6b7280;
        }

        .mutations {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .mutation-item {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: #f9fafb;
          transition: all 0.2s;
        }

        .mutation-item.killed {
          border-left: 4px solid #10b981;
        }

        .mutation-item.survived {
          border-left: 4px solid #ef4444;
        }

        .mutation-item.timeout {
          border-left: 4px solid #f59e0b;
        }

        .mutation-item.error {
          border-left: 4px solid #dc2626;
        }

        .mutation-header {
          display: flex;
          align-items: center;
          padding: 12px;
          cursor: pointer;
        }

        .mutation-header:hover {
          background: #f3f4f6;
        }

        .mutation-status {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 100px;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          text-align: center;
        }

        .status-badge.killed {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.survived {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-badge.timeout {
          background: #fef3c7;
          color: #92400e;
        }

        .status-badge.error {
          background: #fecaca;
          color: #7f1d1d;
        }

        .mutation-type {
          font-size: 11px;
          color: #6b7280;
          text-transform: capitalize;
        }

        .mutation-info {
          flex: 1;
          margin: 0 15px;
        }

        .mutation-description {
          font-size: 14px;
          color: #111827;
          margin-bottom: 4px;
        }

        .mutation-location {
          font-size: 12px;
          color: #6b7280;
          font-family: monospace;
        }

        .mutation-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .execution-time {
          font-size: 12px;
          color: #6b7280;
        }

        .expand-btn {
          width: 24px;
          height: 24px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 16px;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .expand-btn:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .mutation-details {
          padding: 15px;
          border-top: 1px solid #e5e7eb;
          background: white;
        }

        .code-diff {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 13px;
          margin-bottom: 15px;
        }

        .diff-line {
          display: flex;
          align-items: center;
          padding: 6px 10px;
          margin: 2px 0;
        }

        .diff-line.original {
          background: #fee2e2;
          color: #991b1b;
        }

        .diff-line.mutated {
          background: #d1fae5;
          color: #065f46;
        }

        .diff-marker {
          margin-right: 10px;
          font-weight: 700;
        }

        .killed-by {
          margin-bottom: 15px;
          padding: 10px;
          background: #f3f4f6;
          border-radius: 4px;
          font-size: 13px;
        }

        .killed-by strong {
          color: #111827;
        }

        .killed-by ul {
          margin: 5px 0 0 0;
          padding-left: 20px;
        }

        .mutation-error {
          padding: 10px;
          background: #fee2e2;
          border: 1px solid #fca5a5;
          border-radius: 4px;
          color: #991b1b;
          font-size: 13px;
          margin-bottom: 15px;
        }

        .btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-sm {
          padding: 4px 8px;
          font-size: 12px;
        }

        .btn-secondary {
          background: #6b7280;
          color: white;
        }

        .btn-secondary:hover {
          background: #4b5563;
        }
      `}</style>
    </div>
  );
};

export default MutationTestingReport;
