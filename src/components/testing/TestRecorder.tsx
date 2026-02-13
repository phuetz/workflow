/**
 * Test Recorder UI Component
 * Provides UI for recording and playing back tests
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  VisualTestRecorder,
  type RecordedTest,
  type RecordedAction,
} from '../../testing/VisualTestRecorder';
import { TestPlayback, type PlaybackResult } from '../../testing/TestPlayback';
import { logger } from '../../services/SimpleLogger';
import { useToast } from '../ui/Toast';

interface TestRecorderProps {
  onTestRecorded?: (test: RecordedTest) => void;
  onCodeGenerated?: (code: string) => void;
}

const TestRecorder: React.FC<TestRecorderProps> = ({ onTestRecorded, onCodeGenerated }) => {
  const toast = useToast();
  const [recorder] = useState(() => new VisualTestRecorder());
  const [playback] = useState(() => new TestPlayback());

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [actionCount, setActionCount] = useState(0);
  const [recordedTests, setRecordedTests] = useState<RecordedTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<RecordedTest | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [playbackResult, setPlaybackResult] = useState<PlaybackResult | null>(null);

  // Test recording form
  const [testName, setTestName] = useState('');
  const [testDescription, setTestDescription] = useState('');

  // Update action count during recording
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setActionCount(recorder.getActionCount());
    }, 500);

    return () => clearInterval(interval);
  }, [isRecording, recorder]);

  const handleStartRecording = useCallback(() => {
    if (!testName.trim()) {
      toast.warning('Please enter a test name');
      return;
    }

    try {
      recorder.startRecording(testName, testDescription);
      setIsRecording(true);
      setIsPaused(false);
      setActionCount(0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start recording');
    }
  }, [recorder, testName, testDescription]);

  const handleStopRecording = useCallback(() => {
    const test = recorder.stopRecording();
    if (test) {
      setRecordedTests((prev) => [...prev, test]);
      setSelectedTest(test);
      onTestRecorded?.(test);
    }
    setIsRecording(false);
    setIsPaused(false);
    setTestName('');
    setTestDescription('');
  }, [recorder, onTestRecorded]);

  const handlePauseRecording = useCallback(() => {
    if (isPaused) {
      recorder.resumeRecording();
      setIsPaused(false);
    } else {
      recorder.pauseRecording();
      setIsPaused(true);
    }
  }, [recorder, isPaused]);

  const handlePlayback = useCallback(async (test: RecordedTest) => {
    setIsPlaying(true);
    setPlaybackResult(null);

    try {
      const result = await playback.playback(test, {
        speed: 1.0,
        pauseBetweenActions: 300,
        highlightElements: true,
        showProgress: true,
      });
      setPlaybackResult(result);
    } catch (error) {
      logger.error('Playback error:', error);
      toast.error(error instanceof Error ? error.message : 'Playback failed');
    } finally {
      setIsPlaying(false);
    }
  }, [playback]);

  const handleGenerateCode = useCallback((test: RecordedTest) => {
    const code = playback.generatePlaywrightCode(test);
    setGeneratedCode(code);
    setShowCode(true);
    onCodeGenerated?.(code);
  }, [playback, onCodeGenerated]);

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(generatedCode);
    toast.success('Code copied to clipboard!');
  }, [generatedCode, toast]);

  const handleDownloadCode = useCallback((test: RecordedTest) => {
    const code = playback.generatePlaywrightCode(test);
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${test.name.replace(/\s+/g, '-').toLowerCase()}.spec.ts`;
    a.click();
    URL.revokeObjectURL(url);
  }, [playback]);

  const handleDeleteTest = useCallback((testId: string) => {
    setRecordedTests((prev) => prev.filter((t) => t.id !== testId));
    if (selectedTest?.id === testId) {
      setSelectedTest(null);
    }
  }, [selectedTest]);

  return (
    <div className="test-recorder" data-test-recorder>
      <div className="test-recorder-container">
        {/* Header */}
        <div className="test-recorder-header">
          <h2>Visual Test Recorder</h2>
          <p className="subtitle">Record user interactions and generate Playwright tests</p>
        </div>

        {/* Recording Controls */}
        <div className="recording-controls">
          {!isRecording ? (
            <div className="start-recording">
              <div className="form-group">
                <label htmlFor="test-name">Test Name *</label>
                <input
                  id="test-name"
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="e.g., Create workflow test"
                  disabled={isRecording}
                />
              </div>
              <div className="form-group">
                <label htmlFor="test-description">Description</label>
                <textarea
                  id="test-description"
                  value={testDescription}
                  onChange={(e) => setTestDescription(e.target.value)}
                  placeholder="Optional description of what this test does"
                  rows={3}
                  disabled={isRecording}
                />
              </div>
              <button
                className="btn btn-primary btn-record"
                onClick={handleStartRecording}
                disabled={!testName.trim()}
              >
                <span className="icon">⏺</span>
                Start Recording
              </button>
            </div>
          ) : (
            <div className="recording-active">
              <div className="recording-status">
                <span className="recording-indicator">
                  <span className="pulse"></span>
                  Recording
                </span>
                <span className="action-count">{actionCount} actions recorded</span>
              </div>
              <div className="recording-buttons">
                <button
                  className="btn btn-secondary"
                  onClick={handlePauseRecording}
                >
                  <span className="icon">{isPaused ? '▶' : '⏸'}</span>
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleStopRecording}
                >
                  <span className="icon">⏹</span>
                  Stop Recording
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recorded Tests List */}
        <div className="recorded-tests">
          <h3>Recorded Tests ({recordedTests.length})</h3>
          {recordedTests.length === 0 ? (
            <div className="empty-state">
              <p>No tests recorded yet. Start recording to create your first test.</p>
            </div>
          ) : (
            <div className="tests-list">
              {recordedTests.map((test) => (
                <div
                  key={test.id}
                  className={`test-item ${selectedTest?.id === test.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTest(test)}
                >
                  <div className="test-info">
                    <h4>{test.name}</h4>
                    {test.description && <p className="description">{test.description}</p>}
                    <div className="test-meta">
                      <span>{test.actions.length} actions</span>
                      <span>
                        {test.endTime
                          ? `${((test.endTime - test.startTime) / 1000).toFixed(1)}s`
                          : 'In progress'}
                      </span>
                    </div>
                  </div>
                  <div className="test-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayback(test);
                      }}
                      disabled={isPlaying || isRecording}
                      title="Playback test"
                    >
                      ▶
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateCode(test);
                      }}
                      disabled={isRecording}
                      title="Generate code"
                    >
                      &lt;/&gt;
                    </button>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadCode(test);
                      }}
                      disabled={isRecording}
                      title="Download test"
                    >
                      ↓
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTest(test.id);
                      }}
                      disabled={isRecording}
                      title="Delete test"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Playback Result */}
        {playbackResult && (
          <div className={`playback-result ${playbackResult.success ? 'success' : 'error'}`}>
            <h4>Playback Result</h4>
            <div className="result-details">
              <p>
                <strong>Status:</strong>{' '}
                {playbackResult.success ? '✓ Success' : '✗ Failed'}
              </p>
              <p>
                <strong>Actions:</strong> {playbackResult.actionsExecuted} /{' '}
                {playbackResult.totalActions}
              </p>
              <p>
                <strong>Duration:</strong> {(playbackResult.duration / 1000).toFixed(2)}s
              </p>
              {playbackResult.errors.length > 0 && (
                <div className="errors">
                  <strong>Errors:</strong>
                  <ul>
                    {playbackResult.errors.map((error, i) => (
                      <li key={i}>
                        {error.actionId}: {error.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Generated Code Modal */}
        {showCode && (
          <div className="code-modal">
            <div className="code-modal-content">
              <div className="code-modal-header">
                <h3>Generated Playwright Test</h3>
                <button
                  className="btn-close"
                  onClick={() => setShowCode(false)}
                >
                  ×
                </button>
              </div>
              <div className="code-modal-body">
                <pre>
                  <code>{generatedCode}</code>
                </pre>
              </div>
              <div className="code-modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowCode(false)}
                >
                  Close
                </button>
                <button className="btn btn-primary" onClick={handleCopyCode}>
                  Copy to Clipboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .test-recorder {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 450px;
          max-height: 80vh;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          z-index: 10000;
          display: flex;
          flex-direction: column;
        }

        .test-recorder-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: auto;
        }

        .test-recorder-header {
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .test-recorder-header h2 {
          margin: 0 0 5px 0;
          font-size: 20px;
        }

        .test-recorder-header .subtitle {
          margin: 0;
          opacity: 0.9;
          font-size: 13px;
        }

        .recording-controls {
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          font-size: 13px;
          color: #374151;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .recording-active {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .recording-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #fef3c7;
          border-radius: 6px;
        }

        .recording-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #92400e;
        }

        .pulse {
          width: 12px;
          height: 12px;
          background: #dc2626;
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .action-count {
          font-size: 13px;
          color: #78350f;
        }

        .recording-buttons {
          display: flex;
          gap: 10px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #667eea;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #5568d3;
        }

        .btn-secondary {
          background: #6b7280;
          color: white;
          flex: 1;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #4b5563;
        }

        .btn-danger {
          background: #dc2626;
          color: white;
          flex: 1;
        }

        .btn-danger:hover:not(:disabled) {
          background: #b91c1c;
        }

        .btn-success {
          background: #10b981;
          color: white;
        }

        .btn-record {
          width: 100%;
          margin-top: 10px;
        }

        .btn-sm {
          padding: 6px 10px;
          font-size: 12px;
        }

        .recorded-tests {
          padding: 20px;
          flex: 1;
          overflow: auto;
        }

        .recorded-tests h3 {
          margin: 0 0 15px 0;
          font-size: 16px;
          color: #111827;
        }

        .empty-state {
          padding: 40px 20px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
        }

        .tests-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .test-item {
          padding: 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .test-item:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        .test-item.selected {
          background: #ede9fe;
          border-color: #a78bfa;
        }

        .test-info h4 {
          margin: 0 0 5px 0;
          font-size: 14px;
          color: #111827;
        }

        .test-info .description {
          margin: 0 0 8px 0;
          font-size: 12px;
          color: #6b7280;
        }

        .test-meta {
          display: flex;
          gap: 15px;
          font-size: 12px;
          color: #9ca3af;
        }

        .test-actions {
          display: flex;
          gap: 5px;
          margin-top: 10px;
        }

        .playback-result {
          margin: 0 20px 20px 20px;
          padding: 15px;
          border-radius: 8px;
        }

        .playback-result.success {
          background: #d1fae5;
          border: 1px solid #6ee7b7;
        }

        .playback-result.error {
          background: #fee2e2;
          border: 1px solid #fca5a5;
        }

        .playback-result h4 {
          margin: 0 0 10px 0;
          font-size: 14px;
        }

        .result-details p {
          margin: 5px 0;
          font-size: 13px;
        }

        .result-details .errors {
          margin-top: 10px;
        }

        .result-details ul {
          margin: 5px 0;
          padding-left: 20px;
          font-size: 12px;
        }

        .code-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10001;
        }

        .code-modal-content {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }

        .code-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .code-modal-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .btn-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-close:hover {
          color: #111827;
        }

        .code-modal-body {
          flex: 1;
          overflow: auto;
          padding: 20px;
        }

        .code-modal-body pre {
          margin: 0;
          background: #1f2937;
          color: #f3f4f6;
          padding: 20px;
          border-radius: 8px;
          overflow-x: auto;
        }

        .code-modal-body code {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 13px;
          line-height: 1.6;
        }

        .code-modal-footer {
          padding: 20px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .icon {
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default TestRecorder;
