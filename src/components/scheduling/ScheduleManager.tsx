import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { scheduleService, ScheduledJob } from '../../services/ScheduleService';
import { notificationService } from '../../services/NotificationService';
import { Clock, Play, Pause, Edit, Trash2, Plus, Calendar } from 'lucide-react';
import { logger } from '../../services/SimpleLogger';

export default function ScheduleManager() {
  const { darkMode } = useWorkflowStore();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [cronExpression, setCronExpression] = useState('0 9 * * 1-5');
  const [timezone, setTimezone] = useState('UTC');
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Validate cron expression
  const validateCron = (cron: string): { isValid: boolean; error?: string } => {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) {
      return { isValid: false, error: 'Cron expression must have 5 parts' };
    }
    return { isValid: true };
  };

  const validation = validateCron(cronExpression);

  const loadJobs = () => {
    setJobs(scheduleService.getAllJobs());
  };

  const handleJobUpdate = () => {
    loadJobs();
  };

  const toggleJob = async (jobId: string) => {
    try {
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        if (job.enabled) {
          await scheduleService.disableJob(jobId);
        } else {
          await scheduleService.enableJob(jobId);
        }
        loadJobs();
      }
    } catch (error) {
      logger.error('Error toggling job:', error);
      notificationService.show('error', 'Toggle Failed',
        error instanceof Error ? error.message : 'Failed to toggle job');
    }
  };

  // Load jobs on component mount
  useEffect(() => {
    loadJobs();

    // Listen for job updates
    scheduleService.on('job-created', handleJobUpdate);
    scheduleService.on('job-updated', handleJobUpdate);
    scheduleService.on('job-deleted', handleJobUpdate);
    scheduleService.on('job-enabled', handleJobUpdate);
    scheduleService.on('job-disabled', handleJobUpdate);

    // Listen for execution events
    scheduleService.on('job-executed', (job: ScheduledJob) => {
      notificationService.show('success', 'Scheduled Job Executed',
        `Workflow "${job.workflowId}" executed successfully`);
      loadJobs();
    });

    scheduleService.on('job-execution-failed', ({ job, error }: { job: ScheduledJob, error: unknown }) => {
      notificationService.show('error', 'Scheduled Job Failed',
        `Workflow "${job.workflowId}" execution failed: ${(error as unknown as Record<string, unknown>)?.message || error}`);
    });

    return () => {
      scheduleService.off('job-created', handleJobUpdate);
      scheduleService.off('job-updated', handleJobUpdate);
      scheduleService.off('job-deleted', handleJobUpdate);
      scheduleService.off('job-enabled', handleJobUpdate);
      scheduleService.off('job-disabled', handleJobUpdate);
    };
  }, []);

  const cronPresets = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Every 5 minutes', value: '*/5 * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every day at 9 AM', value: '0 9 * * *' },
    { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
    { label: 'Weekdays at 9 AM', value: '0 9 * * 1-5' },
    { label: 'Every month on 1st', value: '0 0 1 * *' },
  ];

  const timeZones = [
    'UTC', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
    'America/New_York', 'America/Chicago', 'America/Los_Angeles',
    'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Australia/Sydney'
  ];

  const handleSubmit = () => {
    try {
      // Validate cron expression
      if (!validation.isValid) {
        notificationService.show('error', 'Invalid Cron Expression', validation.error || 'Please check your cron expression');
        return;
      }

      // Create the scheduled job
      const job = scheduleService.createJob({
        workflowId: 'current-workflow', // In a real app, this would be selected
        cronExpression,
        timezone,
        enabled: true,
        lastRun: null,
        description: `Scheduled execution: ${parseCronExpression(cronExpression)}`
      });

      notificationService.show('success', 'Schedule Created', 
        `Job "${job.id.slice(-6)}" created successfully`);

      setIsCreating(false);
      setCronExpression('0 9 * * 1-5');
      setTimezone('UTC');
    } catch (error) {
      logger.error('Error creating schedule:', error);
      notificationService.show('error', 'Schedule Creation Failed', 
        error instanceof Error ? error.message : 'Failed to create schedule');
    }
  };

  const parseCronExpression = (cron: string) => {
    const parts = cron.split(' ');

    if (parts.length === 5) {
      const [_minute, _hour, _day, _month, _dayOfWeek] = parts;  

      if (cron === '* * * * *') return 'Every minute';
      if (cron === '*/5 * * * *') return 'Every 5 minutes';
      if (cron === '0 * * * *') return 'Every hour';
      if (cron === '0 9 * * *') return 'Daily at 9:00 AM';
      if (cron === '0 9 * * 1-5') return 'Weekdays at 9:00 AM';
      if (cron === '0 0 1 * *') return 'Monthly on 1st';

      return `Custom: ${cron}`;
    }
    return 'Invalid cron expression';
  };

  const getNextRunTime = (job: unknown) => {
    const jobData = job as { nextRun?: number };
    if (!jobData.nextRun) return 'Not scheduled';
    return new Date(jobData.nextRun).toLocaleString();
  };

  const getLastRunTime = (job: unknown) => {
    const jobData = job as { lastRun?: number };
    if (!jobData.lastRun) return 'Never';
    return new Date(jobData.lastRun).toLocaleString();
  };

  const executeJob = async (jobId: string) => {
    try {
      notificationService.show('info', 'Executing Job', 'Running scheduled workflow...');
      const success = await scheduleService.executeJob(jobId);
      if (!success) {
        notificationService.show('error', 'Execution Failed', 'Failed to execute job');
      }
    } catch (error) {
      logger.error('Error executing job:', error);
      notificationService.show('error', 'Execution Error', 
        error instanceof Error ? error.message : 'Failed to execute job');
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      const success = await scheduleService.deleteJob(jobId);
      if (success) {
        notificationService.show('success', 'Job Deleted', 'Schedule removed successfully');
      } else {
        notificationService.show('error', 'Delete Failed', 'Job not found');
      }
    } catch (error) {
      logger.error('Error deleting job:', error);
      notificationService.show('error', 'Delete Failed',
        error instanceof Error ? error.message : 'Failed to delete job');
    }
  };

  const editJob = async (jobId: string) => {
    const job = await scheduleService.getJob(jobId);
    if (job) {
      setSelectedJob(jobId);
      setCronExpression(job.cronExpression);
      setTimezone(job.timezone);
      setIsEditing(true);
    }
  };

  const updateJob = async () => {
    if (!selectedJob) return;

    try {
      // Validate cron expression
      if (!validation.isValid) {
        notificationService.show('error', 'Invalid Cron Expression', validation.error || 'Please check your cron expression');
        return;
      }

      // Update the job
      const updatedJob = await scheduleService.updateJob(selectedJob, {
        cronExpression,
        timezone,
        description: `Scheduled execution: ${parseCronExpression(cronExpression)}`
      });

      if (updatedJob) {
        notificationService.show('success', 'Job Updated', 'Schedule updated successfully');
        setIsEditing(false);
        setSelectedJob(null);
        setCronExpression('0 9 * * 1-5');
        setTimezone('UTC');
      } else {
        notificationService.show('error', 'Update Failed', 'Job not found');
      }
    } catch (error) {
      logger.error('Error updating job:', error);
      notificationService.show('error', 'Update Failed',
        error instanceof Error ? error.message : 'Failed to update job');
    }
  };

  return (
    <div className={`p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Clock className="text-blue-500" size={24} />
            <h1 className="text-2xl font-bold">Schedule Manager</h1>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Create Schedule</span>
          </button>
        </div>

        {/* Jobs List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {jobs.map((job) => (
            <div
              key={job.id}
              className={`p-4 rounded-lg border ${
                darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    job.enabled ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                  <span className="font-semibold">Schedule #{job.id.slice(-6)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => executeJob(job.id)}
                    className="p-2 hover:bg-gray-100 rounded text-blue-500"
                    title="Run Now"
                  >
                    <Play size={16} />
                  </button>
                  <button
                    onClick={() => toggleJob(job.id)}
                    className="p-2 hover:bg-gray-100 rounded"
                    title={job.enabled ? 'Disable' : 'Enable'}
                  >
                    {job.enabled ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button
                    onClick={() => editJob(job.id)}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => deleteJob(job.id)}
                    className="p-2 hover:bg-gray-100 rounded text-red-500"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Expression</label>
                  <div className={`p-2 rounded font-mono text-sm ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    {job.cronExpression}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {parseCronExpression(job.cronExpression)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium">Next Run</label>
                    <div className="text-blue-500">
                      {getNextRunTime(job)}
                    </div>
                  </div>
                  <div>
                    <label className="font-medium">Last Run</label>
                    <div className="text-gray-500">
                      {getLastRunTime(job)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className={`px-2 py-1 rounded ${
                    job.enabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {job.enabled ? 'Active' : 'Paused'}
                  </span>
                  <span className="text-gray-500">
                    Workflow: {job.workflowId}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create/Edit Schedule Modal */}
        {(isCreating || isEditing) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-md w-full mx-4`}>
              <h2 className="text-xl font-bold mb-4">
                {isEditing ? 'Edit Schedule' : 'Create Schedule'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Cron Expression</label>
                  <input
                    type="text"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md font-mono ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                    placeholder="0 9 * * 1-5"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {parseCronExpression(cronExpression)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Presets</label>
                  <div className="grid grid-cols-2 gap-2">
                    {cronPresets.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => setCronExpression(preset.value)}
                        className={`p-2 text-sm rounded border text-left ${
                          cronExpression === preset.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : darkMode 
                              ? 'border-gray-600 hover:border-gray-500' 
                              : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    {timeZones.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={isEditing ? updateJob : handleSubmit}
                    className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
                  >
                    {isEditing ? 'Update Schedule' : 'Create Schedule'}
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(false);
                      setSelectedJob(null);
                      setCronExpression('0 9 * * 1-5');
                      setTimezone('UTC');
                    }}
                    className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {jobs.length === 0 && (
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled jobs</h3>
            <p className="text-gray-500 mb-4">Create your first schedule to automate workflow execution</p>
            <button
              onClick={() => setIsCreating(true)}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
            >
              Create First Schedule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}