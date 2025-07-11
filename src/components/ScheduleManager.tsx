import React, { useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Clock, Play, Pause, Edit, Trash2, Plus, Calendar } from 'lucide-react';

export default function ScheduleManager() {
  const { darkMode, scheduledJobs, scheduleWorkflow } = useWorkflowStore();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [cronExpression, setCronExpression] = useState('0 9 * * 1-5');
  const [timezone, setTimezone] = useState('UTC');

  const jobs = Object.entries(scheduledJobs).map(([id, job]) => ({
    id,
    ...job
  }));

  const cronPresets = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Every 5 minutes', value: '*/5 * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every day at 9 AM', value: '0 9 * * *' },
    { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
    { label: 'Weekdays at 9 AM', value: '0 9 * * 1-5' },
    { label: 'Every month on 1st', value: '0 0 1 * *' },
  ];

  const timezones = [
    'UTC', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
    'America/New_York', 'America/Chicago', 'America/Los_Angeles',
    'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Australia/Sydney'
  ];

  const createSchedule = () => {
    const jobId = scheduleWorkflow('current-workflow', cronExpression);
    setIsCreating(false);
    setCronExpression('0 9 * * 1-5');
  };

  const parseCronExpression = (cron: string) => {
    const parts = cron.split(' ');
    if (parts.length === 5) {
      const [minute, hour, day, month, dayOfWeek] = parts;
      
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

  const getNextRunTime = (cron: string) => {
    // Simulation du prochain déclenchement
    const now = new Date();
    const nextRun = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
    return nextRun.toLocaleString();
  };

  const toggleJob = (jobId: string) => {
    // Toggle enabled state
    const job = scheduledJobs[jobId];
    if (job) {
      // Update job status
      console.log(`Toggling job ${jobId}:`, !job.enabled);
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
                  <span className="font-semibold">Schedule #{job.id.slice(-4)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleJob(job.id)}
                    className="p-2 hover:bg-gray-100 rounded"
                    title={job.enabled ? 'Pause' : 'Resume'}
                  >
                    {job.enabled ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button
                    onClick={() => setSelectedJob(job.id)}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
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
                      {job.nextRun || getNextRunTime(job.cronExpression)}
                    </div>
                  </div>
                  <div>
                    <label className="font-medium">Last Run</label>
                    <div className="text-gray-500">
                      {job.lastRun || 'Never'}
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

        {/* Create Schedule Modal */}
        {isCreating && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-md w-full mx-4`}>
              <h2 className="text-xl font-bold mb-4">Create Schedule</h2>
              
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
                    {timezones.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={createSchedule}
                    className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
                  >
                    Create Schedule
                  </button>
                  <button
                    onClick={() => setIsCreating(false)}
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