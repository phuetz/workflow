import React, { useState, useEffect } from 'react';
import { PrivacySettings, UserPreferences, UserProfile } from '../../types/memory';
import { UserProfileManager } from '../../memory/UserProfileManager';
import { MemoryStore } from '../../memory/MemoryStore';
import { logger } from '../../services/SimpleLogger';
import { useToast } from '../ui/Toast';

interface MemorySettingsProps {
  profileManager: UserProfileManager;
  memoryStore: MemoryStore;
  userId: string;
  agentId: string;
}

export const MemorySettings: React.FC<MemorySettingsProps> = ({
  profileManager,
  memoryStore,
  userId,
  agentId,
}) => {
  const toast = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    dataCollection: true,
    analytics: true,
    memoryEnabled: true,
    retentionDays: 90,
    shareData: false,
    gdprConsent: false,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exportData, setExportData] = useState<{
    profile: UserProfile;
    memories: unknown[];
    analytics: Record<string, unknown>;
  } | null>(null);

  useEffect(() => {
    loadProfile();
  }, [userId, agentId]);

  const loadProfile = async () => {
    try {
      const userProfile = await profileManager.getProfile(userId, agentId);
      setProfile(userProfile);

      if (userProfile.preferences.privacySettings) {
        setPrivacySettings(userProfile.preferences.privacySettings);
      }
    } catch (error) {
      logger.error('Failed to load profile:', error);
    }
  };

  const handlePrivacyChange = async (
    setting: keyof PrivacySettings,
    value: boolean | number
  ) => {
    const updated = { ...privacySettings, [setting]: value };
    setPrivacySettings(updated);

    try {
      await profileManager.updatePrivacySettings(userId, agentId, updated);
    } catch (error) {
      logger.error('Failed to update privacy settings:', error);
      // Revert on error
      await loadProfile();
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await profileManager.exportUserData(userId, agentId);
      setExportData(data);

      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memory-export-${userId}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Failed to export data:', error);
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllData = async () => {
    setIsDeleting(true);
    try {
      await profileManager.deleteUserData(userId, agentId);
      setShowDeleteConfirm(false);
      toast.success('All your data has been deleted successfully.');
      await loadProfile();
    } catch (error) {
      logger.error('Failed to delete data:', error);
      toast.error('Delete failed. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="memory-settings p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Memory Settings</h1>
        <p className="text-gray-600">
          Control how your agent remembers and uses your data
        </p>
      </div>

      {/* Privacy Controls */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Privacy Controls
        </h2>

        <div className="space-y-4">
          {/* Memory Enabled */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                Enable Memory
              </h3>
              <p className="text-sm text-gray-600">
                Allow the agent to remember conversations and learn from your
                interactions
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={privacySettings.memoryEnabled}
                onChange={(e) =>
                  handlePrivacyChange('memoryEnabled', e.target.checked)
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Data Collection */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                Data Collection
              </h3>
              <p className="text-sm text-gray-600">
                Collect data to improve agent performance and personalization
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={privacySettings.dataCollection}
                onChange={(e) =>
                  handlePrivacyChange('dataCollection', e.target.checked)
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Analytics */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                Analytics
              </h3>
              <p className="text-sm text-gray-600">
                Enable analytics to track usage patterns and performance
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={privacySettings.analytics}
                onChange={(e) =>
                  handlePrivacyChange('analytics', e.target.checked)
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Share Data */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                Share Data
              </h3>
              <p className="text-sm text-gray-600">
                Share anonymized data to help improve the platform
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={privacySettings.shareData}
                onChange={(e) =>
                  handlePrivacyChange('shareData', e.target.checked)
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Retention Days */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Data Retention Period
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Automatically delete memories older than this period
            </p>
            <select
              value={privacySettings.retentionDays}
              onChange={(e) =>
                handlePrivacyChange('retentionDays', parseInt(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>1 year</option>
              <option value={-1}>Never (keep forever)</option>
            </select>
          </div>
        </div>
      </div>

      {/* GDPR Compliance */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          GDPR & Data Rights
        </h2>

        <div className="space-y-4">
          {/* GDPR Consent */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <input
                type="checkbox"
                checked={privacySettings.gdprConsent}
                onChange={(e) =>
                  handlePrivacyChange('gdprConsent', e.target.checked)
                }
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  GDPR Consent
                </h3>
                <p className="text-sm text-gray-600">
                  I consent to the processing of my personal data in accordance with
                  GDPR regulations. You have the right to access, rectify, erase,
                  restrict processing, and port your data.
                </p>
                {privacySettings.consentDate && (
                  <p className="text-xs text-gray-500 mt-2">
                    Consent given on:{' '}
                    {new Date(privacySettings.consentDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Export Data */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Export Your Data
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Download all your memories, preferences, and analytics data in JSON
              format
            </p>
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExporting ? 'Exporting...' : 'Export Data'}
            </button>
          </div>

          {/* Delete All Data */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-sm font-medium text-red-900 mb-2">
              Delete All Data
            </h3>
            <p className="text-sm text-red-700 mb-3">
              Permanently delete all your memories, preferences, and profile data.
              This action cannot be undone.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete All Data
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-red-900">
                  Are you absolutely sure? This will:
                </p>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                  <li>Delete all {profile?.statistics.totalWorkflows || 0} memories</li>
                  <li>Remove all learned preferences and patterns</li>
                  <li>Clear your profile and statistics</li>
                  <li>Cannot be recovered</li>
                </ul>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAllData}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete Everything'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      {profile && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Your Memory Statistics
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Memories</p>
              <p className="text-2xl font-bold text-gray-900">
                {exportData?.memories?.length || 0}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Workflows</p>
              <p className="text-2xl font-bold text-gray-900">
                {profile.statistics.totalWorkflows}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Patterns Learned</p>
              <p className="text-2xl font-bold text-gray-900">
                {profile.patterns.length}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {(profile.statistics.successRate * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Profile created:</strong>{' '}
              {new Date(profile.createdAt).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              <strong>Last updated:</strong>{' '}
              {new Date(profile.updatedAt).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              <strong>Version:</strong> {profile.version}
            </p>
          </div>
        </div>
      )}

      {/* Info Notice */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          About Memory & Privacy
        </h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• All data is encrypted at rest and in transit</li>
          <li>• You can export or delete your data at any time</li>
          <li>• Memory is used only to personalize your experience</li>
          <li>• We never sell or share your personal data with third parties</li>
          <li>• You can disable memory without losing access to other features</li>
        </ul>
      </div>
    </div>
  );
};
